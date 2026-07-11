import crypto from "node:crypto";
import Razorpay from "razorpay";
import env from "./env.js";

interface Keys {
  key_id?: string | null;
  key_secret?: string | null;
};

export function razorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayKeys(): Keys {
  return razorpayConfigured()
    ? {
      key_id: env.RAZORPAY_KEY_ID!,
      key_secret: env.RAZORPAY_KEY_SECRET!,
    }
    : {
      key_id: env.RAZORPAY_KEY_ID_TEST!,
      key_secret: env.RAZORPAY_KEY_SECRET_TEST!,
    };
}

export function getRazorpayClient(): Razorpay | null {
  const keys: Keys = getRazorpayKeys();
  if (!keys) return null;

  return new Razorpay({
    key_id: keys.key_id!,
    key_secret: keys.key_secret!,
  });

}


export function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {


  const expected = crypto
    .createHmac("sha256", getRazorpayKeys().key_secret!)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
}
