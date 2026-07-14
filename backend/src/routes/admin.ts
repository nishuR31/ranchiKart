import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import { requireAdmin, requireManager } from "../middleware/requireRole.js";
import {
  productImageMiddleware,
  categoryImageMiddleware,
} from "../middleware/imageUploadMiddleware.js";
import {
  createCouponSchema,
  updateCouponSchema,
  banUserSchema,
  updateUserRoleSchema,
  updateOrderStatusSchema,
  getLogsSchema,
  getOrdersSchema,
  getProductsSchema,
  getUsersSchema,
  getCouponsSchema,
  idParamSchema,
  deleteCouponSchema,
} from "../routeSchemas/adminSchemas.js";

export async function adminRoutes(app: FastifyInstance) {
  // ── Guards ──────────────────────────────────────────────────────────────────
  const adminGuard = [authenticate, requireAdmin];
  const managerGuard = [authenticate, requireManager];

  // ── Dashboard ───────────────────────────────────────────────────────────────
  app.get("/admin/dashboard", { preHandler: managerGuard }, adminController.getDashboardStats);
  app.get("/admin/stats/revenue-chart", { preHandler: managerGuard }, adminController.getRevenueChart);

  // ── Orders ──────────────────────────────────────────────────────────────────
  app.get("/admin/orders", {
    preHandler: managerGuard,
    schema: { querystring: getOrdersSchema },
  }, adminController.getOrders);

  app.put("/admin/orders/:id/status", {
    preHandler: managerGuard,
    schema: { params: idParamSchema, body: updateOrderStatusSchema },
  }, adminController.updateOrderStatus);

  // ── Products ─────────────────────────────────────────────────────────────────
  // NOTE: createProduct and updateProduct accept multipart/form-data when the
  // caller wants to upload an image, OR plain JSON when imageUrl is supplied as
  // a URL string.  The productImageMiddleware is a no-op for plain JSON requests.
  // Body schema validation is handled by Zod inside the controller itself.

  app.get("/admin/products", {
    preHandler: managerGuard,
    schema: { querystring: getProductsSchema },
  }, adminController.getProducts);

  app.post("/admin/products", {
    preHandler: [...adminGuard, productImageMiddleware],
  }, adminController.createProduct);

  app.put("/admin/products/:id", {
    preHandler: [...adminGuard, productImageMiddleware],
    schema: { params: idParamSchema },
  }, adminController.updateProduct);

  app.patch("/admin/products/:id/toggle", {
    preHandler: managerGuard,
    schema: { params: idParamSchema },
  }, adminController.toggleProduct);

  app.patch("/admin/products/:id/featured", {
    preHandler: managerGuard,
    schema: { params: idParamSchema },
  }, adminController.featureProduct);

  // ── Categories ───────────────────────────────────────────────────────────────
  // Same dual-mode as products: multipart (with file) or JSON (with imageUrl string).

  app.post("/admin/categories", {
    preHandler: [...adminGuard, categoryImageMiddleware],
  }, adminController.createCategory);

  app.put("/admin/categories/:id", {
    preHandler: [...adminGuard, categoryImageMiddleware],
    schema: { params: idParamSchema },
  }, adminController.updateCategory);

  app.delete("/admin/categories/:id", {
    preHandler: adminGuard,
    schema: { params: idParamSchema },
  }, adminController.deleteCategory);

  // ── Users ────────────────────────────────────────────────────────────────────
  app.get("/admin/users", {
    preHandler: managerGuard,
    schema: { querystring: getUsersSchema },
  }, adminController.getUsers);

  app.patch("/admin/users/:id/ban", {
    preHandler: adminGuard,
    schema: { params: idParamSchema, body: banUserSchema },
  }, adminController.banUser);

  app.patch("/admin/users/:id/role", {
    preHandler: adminGuard,
    schema: { params: idParamSchema, body: updateUserRoleSchema },
  }, adminController.updateUserRole);

  // ── Coupons ──────────────────────────────────────────────────────────────────
  app.get("/admin/coupons", {
    preHandler: managerGuard,
    schema: { querystring: getCouponsSchema },
  }, adminController.getCoupons);

  app.post("/admin/coupons", {
    preHandler: adminGuard,
    schema: { body: createCouponSchema },
  }, adminController.createCoupon);

  app.put("/admin/coupons/:id", {
    preHandler: adminGuard,
    schema: { params: idParamSchema, body: updateCouponSchema },
  }, adminController.updateCoupon);

  app.delete("/admin/coupons/:id", {
    preHandler: adminGuard,
    schema: { params: idParamSchema },
  }, adminController.deleteCoupon);

  // ── Logs ─────────────────────────────────────────────────────────────────────
  app.get("/admin/logs", {
    preHandler: managerGuard,
    schema: { querystring: getLogsSchema },
  }, adminController.getLogs);
}
