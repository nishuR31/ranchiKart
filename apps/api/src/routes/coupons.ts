import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export async function couponRoutes(app: FastifyInstance) {
  // ─── Apply / validate a coupon ────────────────────────────────────────
  app.post("/coupons/apply", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({
      code: z.string().min(1).max(30).toUpperCase(),
      orderAmount: z.number().int().positive(), // in paisa
      categoryId: z.string().optional()         // category of items in cart
    }).parse(request.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code: body.code },
      include: { category: { select: { id: true, name: true, slug: true } } }
    });

    if (!coupon || !coupon.isActive) {
      return reply.badRequest("Invalid or expired coupon code");
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return reply.badRequest("This coupon has expired");
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return reply.badRequest("This coupon has reached its usage limit");
    }

    // Category restriction
    if (coupon.categoryId && coupon.categoryId !== body.categoryId) {
      const catName = coupon.category?.name ?? "a specific category";
      return reply.badRequest(`This coupon is only valid for ${catName} products`);
    }

    if (body.orderAmount < coupon.minOrderAmount) {
      const minAmount = (coupon.minOrderAmount / 100).toFixed(0);
      return reply.badRequest(`Minimum order amount of ₹${minAmount} required for this coupon`);
    }

    let discountAmount = 0;
    if (coupon.type === "PERCENT") {
      discountAmount = Math.round((body.orderAmount * coupon.value) / 100);
    } else {
      discountAmount = Math.min(coupon.value, body.orderAmount);
    }

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        category: coupon.category
      },
      discountAmount,
      finalAmount: body.orderAmount - discountAmount
    };
  });


  // ─── List all coupons (admin) ─────────────────────────────────────────
  app.get("/coupons", { preHandler: app.authenticate }, async (request, reply) => {
    if (request.authUser!.role !== "ADMIN") return reply.forbidden();

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });
    return { coupons };
  });

  // ─── Create coupon (admin) ────────────────────────────────────────────
  app.post("/coupons", { preHandler: app.authenticate }, async (request, reply) => {
    if (request.authUser!.role !== "ADMIN") return reply.forbidden();

    const body = z.object({
      code: z.string().min(3).max(30).toUpperCase(),
      description: z.string().optional(),
      type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
      value: z.number().int().positive(),
      minOrderAmount: z.number().int().nonnegative().default(0),
      maxUses: z.number().int().positive().optional(),
      expiresAt: z.string().datetime().optional()
    }).parse(request.body);

    const coupon = await prisma.coupon.create({
      data: {
        ...body,
        code: body.code,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
      }
    });
    return reply.code(201).send({ coupon });
  });

  // ─── Toggle coupon active (admin) ─────────────────────────────────────
  app.patch("/coupons/:id/toggle", { preHandler: app.authenticate }, async (request, reply) => {
    if (request.authUser!.role !== "ADMIN") return reply.forbidden();
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return reply.notFound();
    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive }
    });
    return { coupon: updated };
  });
}
