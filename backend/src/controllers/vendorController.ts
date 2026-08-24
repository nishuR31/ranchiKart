import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import VendorService from "../services/vendorService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, notFoundError, badRequestError, internalServerError } from "../utils/response.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import { ProductKind } from "../../prisma/generated/client/index.js";

const vendorService = new VendorService();

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  if (err instanceof BadRequestError) return badRequestError(res, err.message);
  return internalServerError(res, "Something went wrong. Please try again.");
}

export const registerStore = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z.object({
    name: z.string().min(2).max(50),
    description: z.string().optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
  }).parse(req.body);

  try {
    const store = await vendorService.registerStore(req.user!.id, body);
    return sendSuccess(res, "Store registered successfully", 201, { store });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getMyStore = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const store = await vendorService.getStoreByUserId(req.user!.id);
    return sendSuccess(res, "Store fetched successfully", 200, { store });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateMyStore = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z.object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
  }).parse(req.body);

  try {
    const store = await vendorService.updateStore(req.user!.id, body);
    return sendSuccess(res, "Store updated successfully", 200, { store });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const createProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const store = await vendorService.getStoreByUserId(req.user!.id);
  const body = z.object({
    categoryId: z.string(),
    slug: z.string().min(2),
    name: z.string().min(2),
    description: z.string().trim().optional(),
    kind: z.nativeEnum(ProductKind),
    basePrice: z.number().int().positive(),
    stock: z.number().int().nonnegative().default(100),
    imageUrl: z.string().url(),
  }).parse(req.body);

  try {
    const product = await vendorService.createProduct(store.id, body);
    return sendSuccess(res, "Product created", 201, { product });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const store = await vendorService.getStoreByUserId(req.user!.id);
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    basePrice: z.number().int().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
    imageUrl: z.string().url().optional(),
  }).parse(req.body);

  try {
    const product = await vendorService.updateProduct(store.id, id, body);
    return sendSuccess(res, "Product updated", 200, { product });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const deleteProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const store = await vendorService.getStoreByUserId(req.user!.id);
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    await vendorService.deleteProduct(store.id, id);
    return sendSuccess(res, "Product deleted", 200, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getStoreOrders = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const store = await vendorService.getStoreByUserId(req.user!.id);
  const query = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    status: z.string().optional(),
  }).parse(req.query);

  try {
    const data = await vendorService.getStoreOrders(store.id, query);
    return sendSuccess(res, "Store orders fetched", 200, data);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateStoreOrderStatus = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const store = await vendorService.getStoreByUserId(req.user!.id);
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z.object({
    status: z.string(),
    trackingId: z.string().optional(),
  }).parse(req.body);

  try {
    const order = await vendorService.updateStoreOrderStatus(store.id, id, body.status, body.trackingId);
    return sendSuccess(res, "Store order status updated", 200, { order });
  } catch (err: any) {
    return handleError(err, res);
  }
});
