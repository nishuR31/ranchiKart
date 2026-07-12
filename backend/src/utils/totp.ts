import { generateSecret, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import env from "../config/env.js";

/**
 * Generate a new TOTP secret string.
 */
export function generateTotpSecret(): string {
  return generateSecret();
}

/**
 * Generate a QR code data URI for the given email and secret.
 */
export async function generateTotpQrCode(email: string, secret: string): Promise<string> {
  const issuer = env.BUSINESS_NAME || "Ranchi Kart";
  const otpauthUrl = generateURI({
    issuer,
    label: email,
    secret,
    strategy: "totp",
  });
  return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify a user's submitted token against their stored secret.
 */
export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}
