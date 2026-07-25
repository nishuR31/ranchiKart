import crypto from "node:crypto";
import Razorpay from "razorpay";
import env from "./env.js";

export function razorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function testKeysConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID_TEST && env.RAZORPAY_KEY_SECRET_TEST);
}

export function getRazorpayKeys(): { key_id: string; key_secret: string } | null {
  if (razorpayConfigured()) {
    return { key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! };
  }
  if (testKeysConfigured()) {
    return { key_id: env.RAZORPAY_KEY_ID_TEST!, key_secret: env.RAZORPAY_KEY_SECRET_TEST! };
  }
  return null;
}

export function getRazorpayClient(): Razorpay | null {
  const keys = getRazorpayKeys();
  if (!keys) return null;

  return new Razorpay({
    key_id: keys.key_id,
    key_secret: keys.key_secret,
  });
}

export function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keys = getRazorpayKeys();
  if (!keys) return false;

  const expected = crypto
    .createHmac("sha256", keys.key_secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  // timingSafeEqual throws RangeError if buffers differ in length
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(input.signature);
  if (expectedBuf.length !== signatureBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
