import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const opts = { $refStrategy: "none" } as const;

const _applyCouponZod = z.object({
  code: z.string().min(1).max(30),
  orderAmount: z.number().int().positive(),
  categoryId: z.string().optional(),
});

const _createCouponZod = z.object({
  code: z.string().min(3).max(30),
  description: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  value: z.number().int().positive(),
  minOrderAmount: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

const _toggleCouponZod = z.object({ id: z.string() });

export const applyCouponSchema   = zodToJsonSchema(_applyCouponZod,   opts);
export const createCouponSchema  = zodToJsonSchema(_createCouponZod,  opts);
export const toggleCouponSchema  = zodToJsonSchema(_toggleCouponZod,  opts);