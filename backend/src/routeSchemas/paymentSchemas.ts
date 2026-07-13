import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const opts = { $refStrategy: "none" } as const;

const _createRazorpayOrderZod = z.object({
  orderId: z.string(),
});

const _verifyRazorpayPaymentZod = z.object({
  orderId: z.string(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const createRazorpayOrderSchema   = zodToJsonSchema(_createRazorpayOrderZod,   opts);
export const verifyRazorpayPaymentSchema = zodToJsonSchema(_verifyRazorpayPaymentZod, opts);
