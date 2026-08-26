import { OrderStatus, PaymentMethod, type Prisma } from "../../prisma/generated/client/index.js";
import { prisma } from "../config/prisma.js";
import { assertSize, unitPrice } from "../config/pricing.js";
import { sendOrderConfirmation, sendInvoiceEmail, type InvoiceItem } from "../config/email.js";
import { generateInvoicePdf } from "../utils/invoicePdf.js";
import OrderRepository from "../repositories/orderRepository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

const orderRepo = new OrderRepository();

export async function sendOrderInvoiceEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: { include: { product: true, variant: true } },
      coupon: true,
    },
  });
  if (!order?.user?.email) return;

  const invoiceItems: InvoiceItem[] = order.items.map((item: any) => ({
    name: item.product?.name ?? "Product",
    variant: item.variant?.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
  }));

  const address = order.address as {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };

  const paymentStatus =
    order.status === "PAID"
      ? "PAID"
      : order.paymentMethod === "COD"
        ? "COD"
        : "PENDING";

  const invoiceData = {
    orderId: order.id,
    createdAt: order.createdAt,
    items: invoiceItems,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: paymentStatus as "PAID" | "COD" | "PENDING",
    address,
    couponCode: order.coupon?.code,
  };

  const pdfBuf = await generateInvoicePdf(invoiceData).catch((err) => {
    console.error("[Invoice PDF generation error]", err);
    return undefined;
  });

  return sendInvoiceEmail(
    order.user.email,
    order.user.name ?? "Customer",
    invoiceData,
    undefined,
    pdfBuf,
  );
}

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

// Per-store line items (before orderId/storeOrderId are known)
type PendingOrderItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  customWidthMm?: number;
  customHeightMm?: number;
  customText?: string;
  customization: Prisma.InputJsonObject;
};

export default class OrderService {
  async createOrder(userId: string, data: CheckoutData) {
    // ── Step 1: Resolve products, prices, and group items by store ──────────
    const orderItemsByStore = new Map<string, PendingOrderItem[]>();
    const itemCategoryIds = new Set<string>();

    for (const item of data.items) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
        include: { variants: true },
      });

      if (!product.isActive) throw new BadRequestError(`${product.name} is not available`);
      assertSize(product, item.customWidthMm, item.customHeightMm);
      itemCategoryIds.add(product.categoryId);

      const variant = item.variantId
        ? product.variants.find((v: any) => v.id === item.variantId)
        : null;
      if (item.variantId && !variant)
        throw new BadRequestError(`Invalid variant for ${product.name}`);

      const price = unitPrice(product, variant, item.customWidthMm, item.customHeightMm);
      const storeId = product.storeId;

      if (!orderItemsByStore.has(storeId)) {
        orderItemsByStore.set(storeId, []);
      }

      const pendingItem: PendingOrderItem = {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: price,
        total: price * item.quantity,
        customization: (item.customization ?? {}) as Prisma.InputJsonObject,
      };
      if (variant?.id) pendingItem.variantId = variant.id;
      if (item.customWidthMm) pendingItem.customWidthMm = item.customWidthMm;
      if (item.customHeightMm) pendingItem.customHeightMm = item.customHeightMm;
      if (item.customText) pendingItem.customText = item.customText;

      orderItemsByStore.get(storeId)!.push(pendingItem);
    }

    // ── Step 2: Compute totals ───────────────────────────────────────────────
    const flatOrderItems = Array.from(orderItemsByStore.values()).flat();
    const subtotal = flatOrderItems.reduce((sum, item) => sum + item.total, 0);
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
        if (coupon.categoryId && (itemCategoryIds.size > 1 || !itemCategoryIds.has(coupon.categoryId))) {
          throw new BadRequestError("This coupon is only valid for a specific category of products");
        }
        discountAmount =
          coupon.type === "PERCENT"
            ? Math.min(subtotal, Math.round((subtotal * coupon.value) / 100))
            : Math.min(coupon.value, subtotal);
        couponId = coupon.id;
      }
    }

    const total = subtotal + shippingFee - discountAmount;
    const isCod = data.paymentMethod === "COD";
    const initialStatus = isCod ? OrderStatus.PROCESSING : OrderStatus.PENDING_PAYMENT;

    // ── Step 3: Transactional create (two-phase to satisfy Prisma constraints)
    const order = await prisma.$transaction(
      async (tx) => {
        // Re-check coupon availability inside the transaction
        if (couponId) {
          const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
          if (!coupon || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)) {
            throw new BadRequestError("Coupon is no longer available");
          }
        }

        // Reduce stock (validate + decrement)
        for (const item of data.items) {
          if (item.variantId) {
            const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
            if (!variant || variant.stock < item.quantity) {
              throw new BadRequestError("Insufficient stock for requested item variant");
            }
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          } else {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product || product.stock < item.quantity) {
              throw new BadRequestError(`Insufficient stock for ${product?.name ?? "product"}`);
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }

        // ── Phase 1: Create Order + StoreOrders (no items yet) ──────────────
        const createdOrder = await tx.order.create({
          data: {
            userId,
            paymentMethod: data.paymentMethod,
            status: initialStatus,
            subtotal,
            shippingFee,
            discountAmount,
            total,
            address: data.address as Prisma.InputJsonObject,
            ...(data.notes ? { notes: data.notes } : {}),
            ...(couponId ? { couponId } : {}),
            storeOrders: {
              create: Array.from(orderItemsByStore.entries()).map(([storeId, items]) => {
                const storeSubtotal = items.reduce((sum, i) => sum + i.total, 0);
                const storeShippingFee = storeSubtotal > 99900 ? 0 : 6900;
                return {
                  storeId,
                  status: initialStatus,
                  subtotal: storeSubtotal,
                  shippingFee: storeShippingFee,
                  total: storeSubtotal + storeShippingFee,
                };
              }),
            },
          },
          include: { storeOrders: true },
        });

        // ── Phase 2: Create OrderItems with both orderId + storeOrderId ──────
        // OrderItem requires orderId (non-nullable) AND storeOrderId.
        // Prisma cannot resolve orderId when nesting items → storeOrders → order,
        // so we use createMany after both IDs are known.
        const orderItemsToCreate: Prisma.OrderItemCreateManyInput[] = [];

        for (const storeOrder of createdOrder.storeOrders) {
          const items = orderItemsByStore.get(storeOrder.storeId) ?? [];
          for (const item of items) {
            orderItemsToCreate.push({
              orderId: createdOrder.id,
              storeOrderId: storeOrder.id,
              productId: item.productId,
              ...(item.variantId ? { variantId: item.variantId } : {}),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              customization: item.customization,
              ...(item.customWidthMm ? { customWidthMm: item.customWidthMm } : {}),
              ...(item.customHeightMm ? { customHeightMm: item.customHeightMm } : {}),
              ...(item.customText ? { customText: item.customText } : {}),
            });
          }
        }

        await tx.orderItem.createMany({ data: orderItemsToCreate });

        // Increment coupon usage
        if (couponId) {
          await tx.coupon.update({
            where: { id: couponId },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Return the fully-hydrated order
        return tx.order.findUniqueOrThrow({
          where: { id: createdOrder.id },
          include: {
            storeOrders: {
              include: {
                items: { include: { product: true, variant: true } },
              },
            },
            coupon: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );

    // ── Step 4: Fire-and-forget confirmation email ───────────────────────────
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      sendOrderConfirmation(user.email, user.name ?? "User", order.id, order.total).catch(console.error);
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
