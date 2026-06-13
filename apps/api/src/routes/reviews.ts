import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(2000)
});

export async function reviewRoutes(app: FastifyInstance) {
  // ─── Get reviews for a product ────────────────────────────────────────
  app.get("/products/:slug/reviews", async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const query = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(20).default(10)
    }).parse(request.query);

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return reply.notFound("Product not found");

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.review.count({ where: { productId: product.id } })
    ]);

    // Rating breakdown
    const breakdown = await prisma.review.groupBy({
      by: ["rating"],
      where: { productId: product.id },
      _count: { rating: true }
    });

    const ratingBreakdown = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: breakdown.find((b) => b.rating === r)?._count.rating ?? 0
    }));

    return { reviews, total, page: query.page, limit: query.limit, ratingBreakdown };
  });

  // ─── Create a review ──────────────────────────────────────────────────
  app.post("/products/:slug/reviews", { preHandler: app.authenticate }, async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const body = createReviewSchema.parse(request.body);
    const userId = request.authUser!.id;

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return reply.notFound("Product not found");

    // Check if user has already reviewed
    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId: product.id, userId } }
    });
    if (existing) return reply.conflict("You have already reviewed this product");

    // Check if user has ordered this product (verified purchase)
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: product.id,
        order: { userId, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } }
      }
    });

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId,
        rating: body.rating,
        title: body.title,
        body: body.body,
        isVerified: !!hasPurchased
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } }
    });

    // Recalculate product rating
    const agg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { rating: true }
    });
    await prisma.product.update({
      where: { id: product.id },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count.rating
      }
    });

    return reply.code(201).send({ review });
  });

  // ─── Mark review as helpful ──────────────────────────────────────────
  app.post("/reviews/:id/helpful", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return reply.notFound();

    const updated = await prisma.review.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } }
    });
    return { review: updated };
  });

  // ─── Delete own review ────────────────────────────────────────────────
  app.delete("/reviews/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return reply.notFound();
    if (review.userId !== request.authUser!.id && request.authUser!.role !== "ADMIN") {
      return reply.forbidden();
    }

    await prisma.review.delete({ where: { id } });

    // Recalculate rating
    const agg = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    await prisma.product.update({
      where: { id: review.productId },
      data: {
        rating: Math.round((agg._avg.rating ?? 4.3) * 10) / 10,
        reviewCount: agg._count.rating
      }
    });

    return { success: true };
  });
}
