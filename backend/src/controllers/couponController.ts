import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import CouponService from "../services/couponService.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendSuccess,
  badRequestError,
  forbiddenError,
  notFoundError,
  internalServerError,
} from "../utils/response.js";
import { code } from "status-map";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors.js";

const couponService = new CouponService();

function handleError(err: any, res: FastifyReply) {
  if (err instanceof BadRequestError) return badRequestError(res, err.message);
  if (err instanceof ForbiddenError) return forbiddenError(res, err.message);
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

export const applyCoupon = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      code: z.string().min(1).max(30).toUpperCase(),
      orderAmount: z.number().int().positive(),
      categoryId: z.string().optional(),
    })
    .parse(req.body);

  try {
    const result = await couponService.applyCoupon(body);
    return sendSuccess(res, "Coupon applied", code("ok") as number, result);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getAllCoupons = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const coupons = await couponService.getAllCoupons(req.user!.role);
    return sendSuccess(res, "Coupons fetched", code("ok") as number, { coupons });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const createCoupon = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      code: z.string().min(3).max(30).toUpperCase(),
      description: z.string().optional(),
      type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
      value: z.number().int().positive(),
      minOrderAmount: z.number().int().nonnegative().default(0),
      maxUses: z.number().int().positive().optional(),
      expiresAt: z.string().datetime().optional(),
    })
    .parse(req.body);

  try {
    const coupon = await couponService.createCoupon(req.user!.role, body);
    return sendSuccess(res, "Coupon created", code("created") as number, { coupon });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const toggleCoupon = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    const coupon = await couponService.toggleCoupon(req.user!.role, id);
    return sendSuccess(res, "Coupon toggled", code("ok") as number, { coupon });
  } catch (err: any) {
    return handleError(err, res);
  }
});
