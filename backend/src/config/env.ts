import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  BUSINESS_NAME: z.string().default("RanchiKart"),
  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN_ACCESS: z.string().default("15m"),
  JWT_EXPIRES_IN_REFRESH: z.string().default("7d"),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),

  // Redis (optional)
  REDIS_URL: z.string().url().optional().or(z.literal("")),

  // Razorpay (optional — mock mode without keys)
  RAZORPAY_KEY_ID: z.string().optional().or(z.literal("")),
  RAZORPAY_KEY_SECRET: z.string().optional().or(z.literal("")),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().or(z.literal("")),
  RAZORPAY_KEY_ID_TEST: z.string().optional().or(z.literal("")),
  RAZORPAY_KEY_SECRET_TEST: z.string().optional().or(z.literal("")),

  // Email/SMTP (optional — silent no-op without keys)
  SMTP_HOST: z.string().optional().or(z.literal("")),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().or(z.literal("")),
  SMTP_PASS: z.string().optional().or(z.literal("")),
  SMTP_FROM: z
    .string()
    .default(`${process.env.BUSINESS_NAME || "RanchiKart"} <${process.env.SMTP_USER}>`),

  //Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal("")),
  GOOGLE_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  GOOGLE_CALLBACK_URL: z.string().url().optional().or(z.literal("")),

  // Admin
  ADMIN_EMAIL: z.string().email().optional(),
});

const env = envSchema.parse(process.env);

export default env;
