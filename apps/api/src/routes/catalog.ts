import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getOrSet, invalidate } from "../lib/cache.js";

const productQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  kind: z.enum(["STAMP", "STATIONERY", "BOARD"]).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).optional(),
  limit: z.coerce.number().int().positive().max(60).optional(),
  page: z.coerce.number().int().positive().optional()
});

export async function catalogRoutes(app: FastifyInstance) {
  // ─── Categories ───────────────────────────────────────────────────────
  app.get("/categories", async () => {
    return getOrSet("catalog:categories", 120, async () => {
      const categories = await prisma.category.findMany({
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
        include: { children: { orderBy: { name: "asc" } } }
      });
      return { categories };
    });
  });

  // ─── Featured Products — MUST come before /products/:slug ────────────
  app.get("/products/featured", async () => {
    return getOrSet("catalog:featured", 60, async () => {
      const products = await prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        take: 8,
        orderBy: { rating: "desc" },
        include: { category: true, variants: { orderBy: { priceDelta: "asc" } } }
      });
      return { products };
    });
  });

  // ─── Products (with filtering, sorting, pagination) ───────────────────
  app.get("/products", async (request) => {
    const query = productQuerySchema.parse(request.query);
    const limit = query.limit ?? 24;
    const page = query.page ?? 1;

    const category = query.category
      ? await prisma.category.findUnique({
          where: { slug: query.category },
          include: { children: true }
        })
      : null;
    const categoryIds = category
      ? [category.id, ...category.children.map((c) => c.id)]
      : undefined;

    type OrderByClause =
      | { basePrice: "asc" | "desc" }
      | { rating: "asc" | "desc" }
      | { createdAt: "asc" | "desc" };

    const orderBy: OrderByClause =
      query.sort === "price_asc"
        ? { basePrice: "asc" as const }
        : query.sort === "price_desc"
        ? { basePrice: "desc" as const }
        : query.sort === "rating"
        ? { rating: "desc" as const }
        : { createdAt: "desc" as const };

    const where = {
      isActive: true,
      categoryId: categoryIds ? { in: categoryIds } : undefined,
      kind: query.kind,
      isFeatured: query.featured,
      basePrice:
        query.minPrice !== undefined || query.maxPrice !== undefined
          ? { gte: query.minPrice, lte: query.maxPrice }
          : undefined,
      rating: query.minRating !== undefined ? { gte: query.minRating } : undefined,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const cacheKey = `catalog:products:${JSON.stringify({ ...query, page, limit })}`.slice(0, 200);
    return getOrSet(cacheKey, 60, async () => {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.product.count({ where })
      ]);
      return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
    });
  });

  // ─── Search ──────────────────────────────────────────────────────────
  app.get("/search", async (request) => {
    const query = productQuerySchema.parse(request.query);
    const limit = query.limit ?? 60;
    const where = {
      isActive: true,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
      take: limit
    });
    return { products, total: products.length };
  });

  // ─── Single Product (/products/:slug — MUST come after /products/featured)
  app.get("/products/:slug", async (request, reply) => {
    const params = z.object({ slug: z.string() }).parse(request.params);
    const result = await getOrSet(`catalog:product:${params.slug}`, 120, async () => {
      const product = await prisma.product.findUnique({
        where: { slug: params.slug },
        include: {
          category: true,
          variants: { orderBy: { priceDelta: "asc" } },
          reviews: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" },
            take: 5
          }
        }
      });
      if (!product || !product.isActive) return null;
      const related = await prisma.product.findMany({
        where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
        take: 6,
        include: { category: true, variants: { orderBy: { priceDelta: "asc" } } }
      });
      return { product, related };
    });

    if (!result) return reply.notFound("Product not found");
    return result;
  });

  // ─── Cache invalidation (admin only) ─────────────────────────────────
  app.delete("/catalog/cache", { preHandler: app.authenticate }, async (request, reply) => {
    if (request.authUser?.role !== "ADMIN") return reply.forbidden();
    await invalidate("catalog:*");
    return { success: true };
  });
}
