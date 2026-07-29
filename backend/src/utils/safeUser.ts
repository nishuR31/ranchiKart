import type { User } from "../../prisma/generated/client/index.js";

export type SafeUser = Omit<
  User,
  "passwordHash" | "totpSecret" | "refreshToken" | "emailOtpHash" | "emailOtpExpiry"
>;

export function safeUser<T extends Record<string, any>>(user: T): Omit<T, "passwordHash" | "totpSecret" | "refreshToken" | "emailOtpHash" | "emailOtpExpiry">;
export function safeUser(user: null | undefined): null;
export function safeUser(user: any): any {
  if (!user) return null;
  const {
    passwordHash: _1,
    totpSecret: _2,
    refreshToken: _3,
    emailOtpHash: _4,
    emailOtpExpiry: _5,
    ...safe
  } = user;
  return safe;
}
