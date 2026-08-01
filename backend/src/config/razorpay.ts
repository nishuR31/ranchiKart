import crypto from "node:crypto";
import Razorpay from "razorpay";
import env from "./env.js";

type RazorpayMode = "live" | "test";

type RazorpayKeyPair = {
  key_id: string;
  key_secret: string;
  mode: RazorpayMode;
};

function isUsableSecret(value?: string): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return !/(x{4,}|\*{3,}|your_|dummy|placeholder|replace_me)/i.test(normalized);
}

function isUsableKeyId(value: string | undefined, mode: RazorpayMode): value is string {
  if (!isUsableSecret(value)) return false;
  return value.startsWith(`rzp_${mode}_`);
}

function configuredKeyPairs(): RazorpayKeyPair[] {
  const pairs: RazorpayKeyPair[] = [];

  if (
    isUsableKeyId(env.RAZORPAY_KEY_ID, "live") &&
    isUsableSecret(env.RAZORPAY_KEY_SECRET)
  ) {
    pairs.push({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
      mode: "live",
    });
  }

  if (
    isUsableKeyId(env.RAZORPAY_KEY_ID_TEST, "test") &&
    isUsableSecret(env.RAZORPAY_KEY_SECRET_TEST)
  ) {
    pairs.push({
      key_id: env.RAZORPAY_KEY_ID_TEST,
      key_secret: env.RAZORPAY_KEY_SECRET_TEST,
      mode: "test",
    });
  }

  return pairs;
}

export function razorpayConfigured(): boolean {
  return configuredKeyPairs().length > 0;
}

export function razorpayLiveConfigured(): boolean {
  return configuredKeyPairs().some((pair) => pair.mode === "live");
}

export function getRazorpayKeys(): RazorpayKeyPair | null {
  return configuredKeyPairs()[0] ?? null;
}

export function getRazorpayClient(): Razorpay | null {
  if (process.env.NODE_ENV === "test" || env.NODE_ENV === "test") return null;
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
  const pairs = configuredKeyPairs();
  if (pairs.length === 0) return false;

  return pairs.some((keys) => {
    const expected = crypto
      .createHmac("sha256", keys.key_secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");

    // timingSafeEqual throws RangeError if buffers differ in length
    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(input.signature);
    if (expectedBuf.length !== signatureBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  });
}
