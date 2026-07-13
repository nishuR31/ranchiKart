import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ProductKind } from "../../prisma/generated/client/client.js";

const opts = { $refStrategy: "none" } as const;

const _productQueryZod = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  kind: z.nativeEnum(ProductKind).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).optional(),
  limit: z.coerce.number().int().positive().max(60).optional(),
  page: z.coerce.number().int().positive().optional(),
});

const _getProductsZod = z.object({ slug: z.string() });

const _searchProductsQueryZod = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(60).optional(),
});

export const productQuerySchema        = zodToJsonSchema(_productQueryZod,        opts);
export const getProductsSchema         = zodToJsonSchema(_getProductsZod,         opts);
export const searchProductsQuerySchema = zodToJsonSchema(_searchProductsQueryZod, opts);