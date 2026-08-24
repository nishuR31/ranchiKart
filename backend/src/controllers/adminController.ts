import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { OrderStatus, ProductKind } from "../../prisma/generated/client/index.js";
import { code } from "status-map";
import AdminService from "../services/adminService.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendSuccess,
  notFoundError,
  badRequestError,
  conflictError,
  internalServerError,
} from "../utils/response.js";
import { NotFoundError, BadRequestError, ConflictError } from "../utils/errors.js";

const adminService = new AdminService();
const DEFAULT_PRODUCT_IMAGE = "/assets/source.png";
const DEFAULT_CATEGORY_IMAGE = "/assets/source.png";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional(),
);

const couponBodySchema = z
  .object({
    code: z.string().min(3).max(30).toUpperCase(),
    description: z.string().optional(),
    type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
    value: z.number().int().positive(),
    minOrderAmount: z.number().int().nonnegative().default(0),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z
      .string()
      .optional()
      .transform((v) => {
        if (!v) return undefined;
        const d = new Date(v);
        if (isNaN(d.getTime())) throw new Error("Invalid expiry date");
        return d.toISOString();
    }),
    categoryId: z.string().optional(),
  });

const couponUpdateSchema = z
  .object({
    description: z.string().optional(),
    type: z.enum(["PERCENT", "FIXED"]).optional(),
    value: z.number().int().positive().optional(),
    minOrderAmount: z.number().int().nonnegative().optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
    expiresAt: z
      .string()
      .nullable()
      .optional()
      .transform((v) => {
        if (v === null) return null;
        if (!v) return undefined;
        const d = new Date(v);
        if (isNaN(d.getTime())) throw new Error("Invalid expiry date");
        return d.toISOString();
      }),
  });

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  if (err instanceof BadRequestError) return badRequestError(res, err.message);
  if (err instanceof ConflictError) return conflictError(res, err.message);
  return internalServerError(res, "Something went wrong. Please try again.");
}

export const getDashboardStats = asyncHandler(async (_req: FastifyRequest, res: FastifyReply) => {
  const data = await adminService.getDashboardStats();
  return sendSuccess(res, "Dashboard stats fetched", code("ok") as number, data);
});

export const getOrders = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = z
    .object({
      status: z.nativeEnum(OrderStatus).optional(),
      search: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(50).default(20),
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .parse(req.query);

  try {
    const data = await adminService.getOrders(query);
    return sendSuccess(res, "Orders fetched", code("ok") as number, data);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateOrderStatus = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z
    .object({
      status: z.nativeEnum(OrderStatus),
      trackingId: z.string().optional(),
      notes: z.string().optional(),
    })
    .parse(req.body);

  try {
    const data = await adminService.updateOrderStatus(req.user!.id, id, body);
    return sendSuccess(res, "Order status updated", code("ok") as number, data);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getProducts = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(50).default(20),
      search: z.string().optional(),
      isActive: z.coerce.boolean().optional(),
      kind: z.nativeEnum(ProductKind).optional(),
    })
    .parse(req.query);

  const data = await adminService.getProducts(query);
  return sendSuccess(res, "Products fetched", code("ok") as number, data);
});

export const createProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      categoryId: z.string(),
      slug: z.string().min(2),
      name: z.string().min(2),
      description: z.string().trim().optional(),
      kind: z.nativeEnum(ProductKind),
      imageUrl: optionalUrl,
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
    })
    .transform((data) => ({
      ...data,
      description: data.description && data.description.length >= 10
        ? data.description
        : `${data.name} available on UrbanRanchi.`,
      imageUrl: data.imageUrl ?? DEFAULT_PRODUCT_IMAGE,
    }))
    .parse(req.body);

  try {
    const product = await adminService.createProduct(req.user!.id, body);
    return sendSuccess(res, "Product created", code("created") as number, { product });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const toggleProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    const product = await adminService.toggleProduct(req.user!.id, id);
    return sendSuccess(res, "Product status toggled", code("ok") as number, { product });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const featureProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    const product = await adminService.featureProduct(req.user!.id, id);
    return sendSuccess(res, "Product featured status toggled", code("ok") as number, { product });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z
    .object({
      name: z.string().min(2).optional(),
      description: z.string().min(10).optional(),
      basePrice: z.number().int().positive().optional(),
      stock: z.number().int().nonnegative().optional(),
      dispatchDays: z.number().int().positive().optional(),
      imageUrl: optionalUrl,
      tags: z.array(z.string()).optional(),
      highlights: z.array(z.string()).optional(),
      specifications: z.record(z.string()).optional(),
    })
    .parse(req.body);

  try {
    const product = await adminService.updateProduct(req.user!.id, id, body);
    return sendSuccess(res, "Product updated", code("ok") as number, { product });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const deleteProduct = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    await adminService.deleteProduct(req.user!.id, id);
    return sendSuccess(res, "Product deleted", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getUsers = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().optional(),
      role: z.enum(["USER", "MANAGER", "ADMIN"]).optional(),
    })
    .parse(req.query);

  const data = await adminService.getUsers(query);
  return sendSuccess(res, "Users fetched", code("ok") as number, data);
});

export const banUser = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z
    .object({
      isBanned: z.boolean(),
      banReason: z.string().max(300).optional(),
    })
    .parse(req.body);

  try {
    const user = await adminService.banUser(req.user!.id, id, body);
    return sendSuccess(res, "User ban status updated", code("ok") as number, { user });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateUserRole = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z.object({ role: z.enum(["USER", "MANAGER", "ADMIN"]) }).parse(req.body);

  try {
    const user = await adminService.updateUserRole(req.user!.id, id, body);
    return sendSuccess(res, "User role updated", code("ok") as number, { user });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getCoupons = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(50).default(20),
      isActive: z.coerce.boolean().optional(),
    })
    .parse(req.query);

  const data = await adminService.getCoupons(query);
  return sendSuccess(res, "Coupons fetched", code("ok") as number, data);
});

export const createCoupon = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = couponBodySchema.parse(req.body);

  try {
    const coupon = await adminService.createCoupon(req.user!.id, body);
    return sendSuccess(res, "Coupon created", code("created") as number, { coupon });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateCoupon = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = couponUpdateSchema.parse(req.body);

  try {
    const coupon = await adminService.updateCoupon(id, body);
    return sendSuccess(res, "Coupon updated", code("ok") as number, { coupon });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const deleteCoupon = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    await adminService.deleteCoupon(req.user!.id, id);
    return sendSuccess(res, "Coupon deleted", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getLogs = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
      entity: z.string().optional(),
      action: z.string().optional(),
    })
    .parse(req.query);

  const data = await adminService.getLogs(query);
  return sendSuccess(res, "Logs fetched", code("ok") as number, data);
});

export const getRevenueChart = asyncHandler(async (_req: FastifyRequest, res: FastifyReply) => {
  const data = await adminService.getRevenueChart();
  return sendSuccess(res, "Revenue chart fetched", code("ok") as number, data);
});

export const createCategory = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      slug: z.string().min(2).max(50),
      name: z.string().min(2).max(50),
      description: z.string().trim().max(500).optional(),
      kind: z.nativeEnum(ProductKind),
      imageUrl: optionalUrl,
      parentId: z.string().optional(),
    })
    .transform((data) => ({
      ...data,
      description: data.description && data.description.length >= 10
        ? data.description
        : `${data.name} products on UrbanRanchi.`,
      imageUrl: data.imageUrl ?? DEFAULT_CATEGORY_IMAGE,
    }))
    .parse(req.body);

  try {
    const category = await adminService.createCategory(req.user!.id, body);
    return sendSuccess(res, "Category created", code("created") as number, { category });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const updateCategory = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z
    .object({
      name: z.string().min(2).max(50).optional(),
      description: z.string().min(10).max(500).optional(),
      kind: z.nativeEnum(ProductKind).optional(),
      imageUrl: optionalUrl,
      parentId: z.string().nullable().optional(),
    })
    .parse(req.body);

  try {
    const category = await adminService.updateCategory(req.user!.id, id, body);
    return sendSuccess(res, "Category updated", code("ok") as number, { category });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const deleteCategory = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    await adminService.deleteCategory(req.user!.id, id);
    return sendSuccess(res, "Category deleted", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const restoreUserAccount = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    const user = await adminService.restoreUserAccount(req.user!.id, id);
    return sendSuccess(
      res,
      "User account restored successfully by admin. Activation takes up to 7 business days.",
      code("ok") as number,
      { user },
    );
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const forceDeleteUser = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    const result = await adminService.forceDeleteUser(req.user!.id, id);
    return sendSuccess(res, "User permanently deleted", code("ok") as number, result);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const getStores = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const data = await adminService.getStores();
  return sendSuccess(res, "Stores fetched", code("ok") as number, data);
});

export const verifyStore = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  const body = z.object({ isVerified: z.boolean() }).parse(req.body);

  try {
    const store = await adminService.verifyStore(id, body.isVerified);
    return sendSuccess(res, "Store verification toggled", code("ok") as number, { store });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const deleteStore = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    await adminService.deleteStore(req.user!.id, id);
    return sendSuccess(res, "Store deleted", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});
