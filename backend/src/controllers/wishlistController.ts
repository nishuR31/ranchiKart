import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import WishlistService from "../services/wishlistService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, notFoundError, internalServerError } from "../utils/response.js";
import { code } from "status-map";
import { NotFoundError } from "../utils/errors.js";

const wishlistService = new WishlistService();

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

export const getItems = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const items = await wishlistService.getItems(req.user!.id);
  return sendSuccess(res, "Wishlist fetched", code("ok") as number, { items });
});

export const toggle = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { productId } = z.object({ productId: z.string() }).parse(req.body);
  try {
    const result = await wishlistService.toggle(req.user!.id, productId);
    return sendSuccess(
      res,
      result.wishlisted ? "Added to wishlist" : "Removed from wishlist",
      code("ok") as number,
      result,
    );
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const addItem = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { productId } = z.object({ productId: z.string() }).parse(req.body);
  try {
    const item = await wishlistService.add(req.user!.id, productId);
    return sendSuccess(res, "Added to wishlist", code("created") as number, { item });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const removeItem = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { productId } = z.object({ productId: z.string() }).parse(req.params);
  try {
    await wishlistService.remove(req.user!.id, productId);
    return sendSuccess(res, "Removed from wishlist", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const checkItem = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { productId } = z.object({ productId: z.string() }).parse(req.params);
  const result = await wishlistService.check(req.user!.id, productId);
  return sendSuccess(res, "Wishlist status checked", code("ok") as number, result);
});
