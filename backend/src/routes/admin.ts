import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import { requireAdmin, requireManager } from "../middleware/requireRole.js";
import { createProductSchema, updateProductSchema, createCouponSchema, updateCouponSchema, banUserSchema, updateUserRoleSchema, updateOrderStatusSchema, getLogsSchema, getOrdersSchema, getProductsSchema, getUsersSchema, getCouponsSchema, idParamSchema, deleteCouponSchema } from "../routeSchemas/adminSchemas.js";

export async function adminRoutes(app: FastifyInstance) {
  const adminGuard = { preHandler: [authenticate, requireAdmin] };
  const managerGuard = { preHandler: [authenticate, requireManager] };

  // Dashboard
  app.get("/admin/dashboard", managerGuard, adminController.getDashboardStats);
  app.get("/admin/stats/revenue-chart", managerGuard, adminController.getRevenueChart);

  // Orders
  app.get("/admin/orders", { ...managerGuard, schema: { querystring: getOrdersSchema } }, adminController.getOrders);
  app.put("/admin/orders/:id/status", { ...managerGuard, schema: { params: idParamSchema, body: updateOrderStatusSchema } }, adminController.updateOrderStatus);

  // Products
  app.get("/admin/products", { ...managerGuard, schema: { querystring: getProductsSchema } }, adminController.getProducts);
  app.post("/admin/products", { ...adminGuard, schema: { body: createProductSchema } }, adminController.createProduct);
  app.put("/admin/products/:id", { ...adminGuard, schema: { params: idParamSchema, body: updateProductSchema } }, adminController.updateProduct);
  app.patch("/admin/products/:id/toggle", { ...managerGuard, schema: { params: idParamSchema } }, adminController.toggleProduct);
  app.patch("/admin/products/:id/featured", { ...managerGuard, schema: { params: idParamSchema } }, adminController.featureProduct);

  // Users
  app.get("/admin/users", { ...managerGuard, schema: { querystring: getUsersSchema } }, adminController.getUsers);
  app.patch("/admin/users/:id/ban", { ...adminGuard, schema: { params: idParamSchema, body: banUserSchema } }, adminController.banUser);
  app.patch("/admin/users/:id/role", { ...adminGuard, schema: { params: idParamSchema, body: updateUserRoleSchema } }, adminController.updateUserRole);

  // Coupons
  app.get("/admin/coupons", { ...managerGuard, schema: { querystring: getCouponsSchema } }, adminController.getCoupons);
  app.post("/admin/coupons", { ...adminGuard, schema: { body: createCouponSchema } }, adminController.createCoupon);
  app.put("/admin/coupons/:id", { ...adminGuard, schema: { params: idParamSchema, body: updateCouponSchema } }, adminController.updateCoupon);
  app.delete("/admin/coupons/:id", { ...adminGuard, schema: { params: idParamSchema } }, adminController.deleteCoupon);

  // Logs
  app.get("/admin/logs", { ...managerGuard, schema: { querystring: getLogsSchema } }, adminController.getLogs);
}
