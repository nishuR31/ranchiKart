import { FastifyReply, FastifyRequest } from "fastify";
import { ProductKind } from "@prisma/client";
import { z } from "zod";
import CatalogService from "../services/catalogService.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendSuccess,
  notFoundError,
  forbiddenError,
  internalServerError,
} from "../utils/response.js";
import { code } from "status-map";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

const catalogService = new CatalogService();

const productQuerySchema = z.object({
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

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  if (err instanceof ForbiddenError) return forbiddenError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

export const getCategories = asyncHandler(async (_req: FastifyRequest, res: FastifyReply) => {
  const data = await catalogService.getCategories();
  return sendSuccess(res, "Categories fetched", code("ok") as number, data);
});

export const getFeaturedProducts = asyncHandler(async (_req: FastifyRequest, res: FastifyReply) => {
  const data = await catalogService.getFeaturedProducts();
  return sendSuccess(res, "Featured products fetched", code("ok") as number, data);
});

export const getProducts = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = productQuerySchema.parse(req.query);
  const data = await catalogService.getProducts(query);
  return sendSuccess(res, "Products fetched", code("ok") as number, data);
});

export const searchProducts = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = z
    .object({
      q: z.string().optional(),
      limit: z.coerce.number().int().positive().max(60).optional(),
    })
    .parse(req.query);
  const data = await catalogService.searchProducts(query);
  return sendSuccess(res, "Search results", code("ok") as number, data);
});

export const getProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { slug } = z.object({ slug: z.string() }).parse(req.params);
  try {
    const data = await catalogService.getProduct(slug);
    return sendSuccess(res, "Product fetched", code("ok") as number, data);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const invalidateCache = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  if (req.user?.role !== "ADMIN") return forbiddenError(res, "Admin access required");
  await catalogService.invalidateCache();
  return sendSuccess(res, "Cache invalidated", code("ok") as number, null);
});
