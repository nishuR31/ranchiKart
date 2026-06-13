import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),

  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),

  // Redis (optional)
  REDIS_URL: z.string().url().optional().or(z.literal("")),

  // Razorpay (optional — mock mode without keys)
  RAZORPAY_KEY_ID: z.string().optional().or(z.literal("")),
  RAZORPAY_KEY_SECRET: z.string().optional().or(z.literal("")),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().or(z.literal("")),

  // Email/SMTP (optional — silent no-op without keys)
  SMTP_HOST: z.string().optional().or(z.literal("")),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().or(z.literal("")),
  SMTP_PASS: z.string().optional().or(z.literal("")),
  SMTP_FROM: z.string().default("exKArt <noreply@exkart.in>"),

  // Admin
  ADMIN_EMAIL: z.string().email().optional()
});

export const env = envSchema.parse(process.env);
