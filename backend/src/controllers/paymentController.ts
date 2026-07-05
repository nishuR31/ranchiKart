import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import PaymentService from "../services/paymentService.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendSuccess,
  notFoundError,
  badRequestError,
  internalServerError,
} from "../utils/response.js";
import { code } from "status-map";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils/errors.js";

const paymentService = new PaymentService();

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  if (err instanceof BadRequestError) return badRequestError(res, err.message);
  if (err instanceof InternalServerError) return internalServerError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

export const createRazorpayOrder = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { orderId } = z.object({ orderId: z.string() }).parse(req.body);
  try {
    const result = await paymentService.createRazorpayOrder(orderId, req.user!.id);
    return sendSuccess(res, "Payment order created", code("created") as number, result);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const verifyRazorpayPayment = asyncHandler(
  async (req: FastifyRequest, res: FastifyReply) => {
    const body = z
      .object({
        orderId: z.string(),
        razorpay_order_id: z.string(),
        razorpay_payment_id: z.string(),
        razorpay_signature: z.string(),
      })
      .parse(req.body);

    try {
      const payment = await paymentService.verifyRazorpayPayment(req.user!.id, body);
      return sendSuccess(res, "Payment verified", code("ok") as number, { payment });
    } catch (err: any) {
      return handleError(err, res);
    }
  },
);
