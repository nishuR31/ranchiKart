import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { OrderStatus, ProductKind } from "../../prisma/generated/client/index.js";

// ─── Zod definitions ────────────────────────────────────────────────────────

const _createProductZod = z.object({
  categoryId: z.string(),
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().min(10),
  kind: z.nativeEnum(ProductKind),
  imageUrl: z.string().url(),
  basePrice: z.number().int().positive(),
  stock: z.number().int().nonnegative().default(100),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  specifications: z.record(z.string()).default({}),
  dispatchDays: z.number().int().positive().default(3),
  minWidthMm: z.number().int().positive().optional(),
  maxWidthMm: z.number().int().positive().optional(),
  minHeightMm: z.number().int().positive().optional(),
  maxHeightMm: z.number().int().positive().optional(),
});

const _updateProductZod = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  basePrice: z.number().int().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  dispatchDays: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
  specifications: z.record(z.string()).optional(),
});

const _createCouponZod = z.object({
  code: z.string().min(3).max(30),
  description: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  value: z.number().int().positive(),
  minOrderAmount: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
  categoryId: z.string().optional(),
});

const _updateCouponZod = z.object({
  description: z.string().optional(),
  value: z.number().int().positive().optional(),
  minOrderAmount: z.number().int().nonnegative().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

const _banUserZod = z.object({
  isBanned: z.boolean(),
  banReason: z.string().max(300).optional(),
});

const _updateUserRoleZod = z.object({
  role: z.enum(["USER", "MANAGER", "ADMIN"]),
});

const _idParamZod = z.object({ id: z.string() });

const _getLogsZod = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  entity: z.string().optional(),
  action: z.string().optional(),
});

const _getOrdersZod = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
});

const _getProductsZod = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  kind: z.nativeEnum(ProductKind).optional(),
});

const _getUsersZod = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["USER", "MANAGER", "ADMIN"]).optional(),
});

const _getCouponsZod = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  isActive: z.coerce.boolean().optional(),
});

const _updateOrderStatusZod = z.object({
  status: z.nativeEnum(OrderStatus),
  trackingId: z.string().optional(),
  notes: z.string().optional(),
});

// ─── JSON Schema exports (used in Fastify route definitions) ────────────────

const opts = { $refStrategy: "none" } as const;

export const createProductSchema    = zodToJsonSchema(_createProductZod,    opts);
export const updateProductSchema    = zodToJsonSchema(_updateProductZod,    opts);
export const createCouponSchema     = zodToJsonSchema(_createCouponZod,     opts);
export const updateCouponSchema     = zodToJsonSchema(_updateCouponZod,     opts);
export const banUserSchema          = zodToJsonSchema(_banUserZod,          opts);
export const updateUserRoleSchema   = zodToJsonSchema(_updateUserRoleZod,   opts);
export const idParamSchema          = zodToJsonSchema(_idParamZod,          opts);
export const deleteCouponSchema     = zodToJsonSchema(_idParamZod,          opts);
export const getLogsSchema          = zodToJsonSchema(_getLogsZod,          opts);
export const getOrdersSchema        = zodToJsonSchema(_getOrdersZod,        opts);
export const getProductsSchema      = zodToJsonSchema(_getProductsZod,      opts);
export const getUsersSchema         = zodToJsonSchema(_getUsersZod,         opts);
export const getCouponsSchema       = zodToJsonSchema(_getCouponsZod,       opts);
export const updateOrderStatusSchema = zodToJsonSchema(_updateOrderStatusZod, opts);
