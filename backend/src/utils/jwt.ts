import jwt, { Secret } from "jsonwebtoken";
import redis from "../config/redis.js";
import env from "../config/env.js";

// Types
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken?: string;
  refreshToken?: string;
}

// Constants (using env values)
const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET as Secret;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET as Secret; // using same secret for simplicity
const JWT_ACCESS_EXPIRY = env.JWT_EXPIRES_IN_ACCESS as jwt.SignOptions;
const JWT_REFRESH_EXPIRY = env.JWT_EXPIRES_IN_REFRESH as jwt.SignOptions; // could be different, but reuse

// Token generation
export function generateTokenPair(payload: JwtPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(
    payload,
    JWT_ACCESS_SECRET as Secret,
    { expiresIn: JWT_ACCESS_EXPIRY } as jwt.SignOptions,
  );
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(
    payload,
    JWT_REFRESH_SECRET as Secret,
    { expiresIn: JWT_REFRESH_EXPIRY } as jwt.SignOptions,
  );
}

// Storage helpers (TTL in seconds)
export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  ttlSeconds: number = 7 * 24 * 60 * 60,
) {
  await redis?.setex(`refresh:${userId}`, ttlSeconds, refreshToken);
}

export async function storeToken(
  userId: string,
  token: string,
  ttlSeconds: number = 7 * 24 * 60 * 60,
  options: { mode: "access" | "refresh" },
) {
  const prefix = options.mode === "access" ? "access" : "refresh";
  await redis?.setex(`${prefix}:${userId}`, ttlSeconds, token);
}

// Blacklist handling
export async function blacklistToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as jwt.JwtPayload | null;
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis?.setex(`blacklist:${token}`, ttl, "1");
  } catch { }
}

export async function blacklistTokens(token: string, opts: { mode: "access" | "refresh" }) {
  try {
    const secret = opts.mode === "access" ? JWT_ACCESS_SECRET : JWT_REFRESH_SECRET;
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload | null;
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis?.setex(`blacklist:${token}`, ttl, "1");
  } catch { }
}

export async function removeRefreshToken(userId: string) {
  await redis?.del(`refresh:${userId}`);
}

export async function removeAccessToken(userId: string) {
  await redis?.del(`access:${userId}`);
}

// Verification
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const isBlacklisted = await redis?.get(`blacklist:${token}`);
  if (isBlacklisted) throw new Error("Token has been revoked");
  return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  const isBlacklisted = await redis?.get(`blacklist:${token}`);
  if (isBlacklisted) throw new Error("Token has been revoked");
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}

export async function getStoredRefreshToken(userId: string): Promise<string | null> {
  return redis?.get(`refresh:${userId}`) ?? null;
}
