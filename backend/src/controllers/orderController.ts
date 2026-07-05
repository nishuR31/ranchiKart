import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import OrderService from "../services/orderService.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendSuccess,
  notFoundError,
  badRequestError,
  internalServerError,
} from "../utils/response.js";
import { code } from "status-map";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

const orderService = new OrderService();

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  line1: z.string().min(4),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4),
});

const checkoutSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  address: addressSchema,
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1).max(50),
        customWidthMm: z.number().int().positive().optional(),
        customHeightMm: z.number().int().positive().optional(),
        customText: z.string().max(300).optional(),
        customization: z.record(z.unknown()).default({}),
      }),
    )
    .min(1),
});

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  if (err instanceof BadRequestError) return badRequestError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

export const createOrder = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = checkoutSchema.parse(req.body);
  try {
    const order = await orderService.createOrder(req.user!.id, body);
    return sendSuccess(res, "Order created", code("created") as number, { order });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getOrder = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    const order = await orderService.getOrder(id, req.user!.id);
    return sendSuccess(res, "Order fetched", code("ok") as number, { order });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getOrders = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = z
    .object({
      status: z.nativeEnum(OrderStatus).optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(20).default(10),
    })
    .parse(req.query);

  const result = await orderService.getOrders(req.user!.id, query);
  return sendSuccess(res, "Orders fetched", code("ok") as number, result);
});
