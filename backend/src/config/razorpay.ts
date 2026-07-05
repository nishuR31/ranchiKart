import crypto from "node:crypto";
import Razorpay from "razorpay";
import env from "./env.js";

export function razorpayConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  if (!env.RAZORPAY_KEY_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
}
