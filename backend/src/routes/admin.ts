import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import { requireAdmin, requireManager } from "../middleware/requireRole.js";

export async function adminRoutes(app: FastifyInstance) {
  const adminGuard = { preHandler: [authenticate, requireAdmin] };
  const managerGuard = { preHandler: [authenticate, requireManager] };

  // Dashboard
  app.get("/admin/dashboard", managerGuard, adminController.getDashboardStats);
  app.get("/admin/stats/revenue-chart", managerGuard, adminController.getRevenueChart);

  // Orders
  app.get("/admin/orders", managerGuard, adminController.getOrders);
  app.put("/admin/orders/:id/status", managerGuard, adminController.updateOrderStatus);

  // Products
  app.get("/admin/products", managerGuard, adminController.getProducts);
  app.post("/admin/products", adminGuard, adminController.createProduct);
  app.put("/admin/products/:id", adminGuard, adminController.updateProduct);
  app.patch("/admin/products/:id/toggle", managerGuard, adminController.toggleProduct);
  app.patch("/admin/products/:id/featured", managerGuard, adminController.featureProduct);

  // Users
  app.get("/admin/users", managerGuard, adminController.getUsers);
  app.patch("/admin/users/:id/ban", adminGuard, adminController.banUser);
  app.patch("/admin/users/:id/role", adminGuard, adminController.updateUserRole);

  // Coupons
  app.get("/admin/coupons", managerGuard, adminController.getCoupons);
  app.post("/admin/coupons", adminGuard, adminController.createCoupon);
  app.put("/admin/coupons/:id", adminGuard, adminController.updateCoupon);
  app.delete("/admin/coupons/:id", adminGuard, adminController.deleteCoupon);

  // Logs
  app.get("/admin/logs", managerGuard, adminController.getLogs);
}
