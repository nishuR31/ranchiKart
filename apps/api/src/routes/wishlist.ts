import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export async function wishlistRoutes(app: FastifyInstance) {
  // ─── Get user wishlist ────────────────────────────────────────────────
  app.get("/wishlist", { preHandler: app.authenticate }, async (request) => {
    const items = await prisma.wishlist.findMany({
      where: { userId: request.authUser!.id },
      include: {
        product: {
          include: { category: true, variants: { orderBy: { priceDelta: "asc" } } }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return { items };
  });

  // ─── Toggle wishlist item ─────────────────────────────────────────────
  app.post("/wishlist/toggle", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({ productId: z.string() }).parse(request.body);
    const userId = request.authUser!.id;

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId: body.productId } }
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return { wishlisted: false };
    } else {
      // Verify product exists
      const product = await prisma.product.findUnique({ where: { id: body.productId } });
      if (!product) return reply.notFound("Product not found");

      await prisma.wishlist.create({ data: { userId, productId: body.productId } });
      return { wishlisted: true };
    }
  });

  // ─── Add to wishlist ──────────────────────────────────────────────────
  app.post("/wishlist", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({ productId: z.string() }).parse(request.body);
    const userId = request.authUser!.id;

    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return reply.notFound("Product not found");

    const item = await prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId: body.productId } },
      create: { userId, productId: body.productId },
      update: {},
      include: { product: true }
    });
    return reply.code(201).send({ item });
  });

  // ─── Remove from wishlist ─────────────────────────────────────────────
  app.delete("/wishlist/:productId", { preHandler: app.authenticate }, async (request, reply) => {
    const { productId } = z.object({ productId: z.string() }).parse(request.params);
    const userId = request.authUser!.id;

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } }
    });
    if (!existing) return reply.notFound("Item not in wishlist");

    await prisma.wishlist.delete({ where: { id: existing.id } });
    return { success: true };
  });

  // ─── Check if product is wishlisted ──────────────────────────────────
  app.get("/wishlist/check/:productId", { preHandler: app.authenticate }, async (request) => {
    const { productId } = z.object({ productId: z.string() }).parse(request.params);
    const userId = request.authUser!.id;
    const item = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } }
    });
    return { wishlisted: !!item };
  });
}
