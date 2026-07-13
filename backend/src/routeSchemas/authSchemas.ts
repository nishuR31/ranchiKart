import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const opts = { $refStrategy: "none" } as const;

// ─── Zod definitions ────────────────────────────────────────────────────────

const _registerZod = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8).max(120).optional(),
});

const _loginZod = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  totpToken: z.string().optional(),
});

const _refreshTokenZod = z.object({
  refreshToken: z.string().optional(),
});

const _changePasswordZod = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(120),
});

const _requestMagicLinkZod = z.object({
  email: z.string().email(),
});

const _verifyTotpZod = z.object({
  token: z.string().length(6),
});

const _generatePasskeyAuthenticationZod = z.object({
  email: z.string().email(),
});

const _verifyMagicLinkZod = z.object({ token: z.string() });

// ─── JSON Schema exports ─────────────────────────────────────────────────────

export const registerSchema                   = zodToJsonSchema(_registerZod,                   opts);
export const loginSchema                      = zodToJsonSchema(_loginZod,                      opts);
export const refreshTokenSchema               = zodToJsonSchema(_refreshTokenZod,               opts);
export const changePasswordSchema             = zodToJsonSchema(_changePasswordZod,             opts);
export const requestMagicLinkSchema           = zodToJsonSchema(_requestMagicLinkZod,           opts);
export const verifyTotpSchema                 = zodToJsonSchema(_verifyTotpZod,                 opts);
export const disableTotpSchema                = zodToJsonSchema(_verifyTotpZod,                 opts);
export const generatePasskeyAuthenticationSchema = zodToJsonSchema(_generatePasskeyAuthenticationZod, opts);
export const verifyMagicLinkSchema            = zodToJsonSchema(_verifyMagicLinkZod,            opts);