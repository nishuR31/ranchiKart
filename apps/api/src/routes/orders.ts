import type { FastifyInstance } from "fastify";
import { OrderStatus, PaymentMethod, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { assertSize, unitPrice } from "../lib/pricing.js";
import { sendOrderConfirmation } from "../lib/email.js";

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  line1: z.string().min(4),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4)
});

const checkoutSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  address: addressSchema,
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1).max(50),
        customWidthMm: z.number().int().positive().optional(),
        customHeightMm: z.number().int().positive().optional(),
        customText: z.string().max(300).optional(),
        customization: z.record(z.unknown()).default({})
      })
    )
    .min(1)
});

export async function orderRoutes(app: FastifyInstance) {
  // ─── Create order ──────────────────────────────────────────────────────
  app.post("/orders", { preHandler: app.authenticate }, async (request, reply) => {
    const body = checkoutSchema.parse(request.body);
    const userId = request.authUser!.id;

    const orderItems: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

    for (const item of body.items) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
        include: { variants: true }
      });

      if (!product.isActive) return reply.badRequest(`${product.name} is not available`);
      assertSize(product, item.customWidthMm, item.customHeightMm);

      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : null;
      if (item.variantId && !variant) {
        return reply.badRequest(`Invalid variant for ${product.name}`);
      }

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
        customization: item.customization as Prisma.InputJsonObject
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const shippingFee = subtotal > 99900 ? 0 : 6900; // Free shipping over ₹999

    // Apply coupon
    let discountAmount = 0;
    let couponId: string | undefined;

    if (body.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: body.couponCode.toUpperCase() }
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
        paymentMethod: body.paymentMethod,
        subtotal,
        shippingFee,
        discountAmount,
        total,
        address: body.address,
        notes: body.notes,
        ...(couponId ? { couponId } : {}),
        items: { create: orderItems }
      },
      include: {
        items: { include: { product: true, variant: true } },
        coupon: true
      }
    });

    // Increment coupon usage
    if (couponId) {
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } }
      });
    }

    // Fire-and-forget order confirmation email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      sendOrderConfirmation(user.email, user.name, order.id, order.total).catch(console.error);
    }

    return reply.code(201).send({ order });
  });

  // ─── Get single order ─────────────────────────────────────────────────
  app.get("/orders/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const order = await prisma.order.findFirst({
      where: { id, userId: request.authUser!.id },
      include: {
        items: { include: { product: true, variant: true } },
        payments: true,
        coupon: true
      }
    });

    if (!order) return reply.notFound("Order not found");
    return { order };
  });

  // ─── Get all orders for user ──────────────────────────────────────────
  app.get("/orders", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({
      status: z.nativeEnum(OrderStatus).optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(20).default(10)
    }).parse(request.query);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: request.authUser!.id, status: query.status },
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { product: true, variant: true } },
          coupon: true
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.order.count({
        where: { userId: request.authUser!.id, status: query.status }
      })
    ]);

    return { orders, total, page: query.page, limit: query.limit };
  });
}
