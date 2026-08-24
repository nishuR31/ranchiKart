import { prisma } from "../config/prisma.js";
import { getOrSet, invalidate } from "../config/cache.js";
import { NotFoundError } from "../utils/errors.js";
import { ProductKind, type Prisma } from "../../prisma/generated/client/index.js";
import { withRetry } from "../utils/retry.js";

const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "rating"] as const;

export type ProductQuery = {
  category?: string;
  q?: string;
  kind?: ProductKind;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  featured?: boolean;
  sort?: (typeof SORT_OPTIONS)[number];
  limit?: number;
  page?: number;
};

export default class CatalogService {
  async getCategories() {
    return getOrSet("catalog:categories", 120, async () => {
      const categories = await withRetry(() =>
        prisma.category.findMany({
          orderBy: [{ parentId: "asc" }, { name: "asc" }],
          include: { children: { orderBy: { name: "asc" } } },
        })
      );
      return { categories };
    });
  }

  async getFeaturedProducts() {
    return getOrSet("catalog:featured", 60, async () => {
      const products = await withRetry(() =>
        prisma.product.findMany({
          where: { isActive: true, isFeatured: true },
          take: 8,
          orderBy: { rating: "desc" },
          include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
        })
      );
      return { products };
    });
  }

  async getProducts(query: ProductQuery) {
    const limit = query.limit ?? 24;
    const page = query.page ?? 1;

    const cacheKey = `catalog:products:${JSON.stringify({ ...query, page, limit })}`.slice(0, 200);
    return getOrSet(cacheKey, 60, async () => {
      const category = query.category
        ? await withRetry(() =>
          prisma.category.findUnique({
            where: { slug: query.category },
            include: { children: true },
          })
        )
        : null;
      const categoryIds = category
        ? [category.id, ...category.children.map((c: any) => c.id)]
        : undefined;

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
              { description: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
          : {}),
      };

      type OrderByClause =
        { basePrice: "asc" | "desc" } | { rating: "asc" | "desc" } | { createdAt: "asc" | "desc" };

      const orderBy: OrderByClause =
        query.sort === "price_asc"
          ? { basePrice: "asc" }
          : query.sort === "price_desc"
            ? { basePrice: "desc" }
            : query.sort === "rating"
              ? { rating: "desc" }
              : { createdAt: "desc" };

      const [products, total] = await withRetry(() =>
        Promise.all([
          prisma.product.findMany({
            where,
            orderBy,
            include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.product.count({ where }),
        ])
      );
      return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
    });
  }

  async searchProducts(query: { q?: string; limit?: number }) {
    const limit = query.limit ?? 60;
    const where = {
      isActive: true,
      ...(query.q
        ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { description: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
        : {}),
    };
    const products = await withRetry(() =>
      prisma.product.findMany({
        where,
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
        include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
        take: limit,
      })
    );
    return { products, total: products.length };
  }

  async getProduct(slug: string) {
    const result = await getOrSet(`catalog:product:${slug}`, 120, async () => {
      const product = await withRetry(() =>
        prisma.product.findUnique({
          where: { slug },
          include: {
            category: true,
            store: { select: { name: true, slug: true } },
            variants: { orderBy: { priceDelta: "asc" } },
            reviews: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        })
      );
      if (!product || !product.isActive) return null;
      const related = await withRetry(() =>
        prisma.product.findMany({
          where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
          take: 6,
          include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
        })
      );
      return { product, related };
    });
    if (!result) throw new NotFoundError("Product not found");
    return result;
  }

  async invalidateCache(): Promise<void> {
    await invalidate("catalog:*");
  }

  async getStore(slug: string) {
    const result = await getOrSet(`catalog:store:${slug}`, 120, async () => {
      const store = await withRetry(() =>
        prisma.store.findUnique({
          where: { slug },
          include: {
            products: {
              where: { isActive: true },
              include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
              orderBy: { createdAt: "desc" },
            },
          },
        })
      );
      if (!store || !store.isActive) return null;
      return { store };
    });
    if (!result) throw new NotFoundError("Store not found");
    return result;
  }
}
