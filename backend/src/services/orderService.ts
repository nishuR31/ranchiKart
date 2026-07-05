import { OrderStatus, PaymentMethod, type Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { assertSize, unitPrice } from "../config/pricing.js";
import { sendOrderConfirmation } from "../config/email.js";
import OrderRepository from "../repositories/orderRepository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

const orderRepo = new OrderRepository();

type CheckoutItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  customWidthMm?: number;
  customHeightMm?: number;
  customText?: string;
  customization: Record<string, unknown>;
};

type CheckoutData = {
  paymentMethod: PaymentMethod;
  address: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  couponCode?: string;
  notes?: string;
  items: CheckoutItem[];
};

export default class OrderService {
  async createOrder(userId: string, data: CheckoutData) {
    const orderItems: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

    for (const item of data.items) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
        include: { variants: true },
      });

      if (!product.isActive) throw new BadRequestError(`${product.name} is not available`);
      assertSize(product, item.customWidthMm, item.customHeightMm);

      const variant = item.variantId
        ? product.variants.find((v: any) => v.id === item.variantId)
        : null;
      if (item.variantId && !variant)
        throw new BadRequestError(`Invalid variant for ${product.name}`);

      const price = unitPrice(product, variant, item.customWidthMm, item.customHeightMm);

      orderItems.push({
        productId: product.id,
        ...(variant?.id ? { variantId: variant.id } : {}),
        quantity: item.quantity,
        unitPrice: price,
        total: price * item.quantity,
        ...(item.customWidthMm ? { customWidthMm: item.customWidthMm } : {}),
        ...(item.customHeightMm ? { customHeightMm: item.customHeightMm } : {}),
        ...(item.customText ? { customText: item.customText } : {}),
        customization: item.customization as Prisma.InputJsonObject,
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const shippingFee = subtotal > 99900 ? 0 : 6900;

    let discountAmount = 0;
    let couponId: string | undefined;

    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode.toUpperCase() },
      });
      if (
        coupon &&
        coupon.isActive &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
        subtotal >= coupon.minOrderAmount
      ) {
        discountAmount =
          coupon.type === "PERCENT"
            ? Math.round((subtotal * coupon.value) / 100)
            : Math.min(coupon.value, subtotal);
        couponId = coupon.id;
      }
    }

    const total = subtotal + shippingFee - discountAmount;

    const order = await prisma.order.create({
      data: {
        userId,
        paymentMethod: data.paymentMethod,
        subtotal,
        shippingFee,
        discountAmount,
        total,
        address: data.address,
        notes: data.notes,
        ...(couponId ? { couponId } : {}),
        items: { create: orderItems },
      },
      include: { items: { include: { product: true, variant: true } }, coupon: true },
    });

    if (couponId) {
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      sendOrderConfirmation(user.email, user.name ?? "User", order.id, order.total).catch(
        console.error,
      );
    }

    return order;
  }

  async getOrder(id: string, userId: string) {
    const order = await orderRepo.findByIdAndUser(id, userId);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }

  async getOrders(userId: string, options: { status?: OrderStatus; page: number; limit: number }) {
    return orderRepo.findAllForUser(userId, options);
  }
}
