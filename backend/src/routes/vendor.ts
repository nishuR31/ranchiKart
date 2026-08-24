import type { FastifyInstance } from "fastify";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import * as vendorController from "../controllers/vendorController.js";

export async function vendorRoutes(app: FastifyInstance) {
  // Vendor onboarding
  app.post("/register", { preHandler: [authenticate] }, vendorController.registerStore);

  // Vendor specific routes (must be SELLER, ADMIN, or MANAGER)
  app.get("/store", { preHandler: [authenticate, authorize("SELLER", "ADMIN", "MANAGER")] }, vendorController.getMyStore);
  app.put("/store", { preHandler: [authenticate, authorize("SELLER", "ADMIN", "MANAGER")] }, vendorController.updateMyStore);

  // Vendor product management
  app.post("/products", { preHandler: [authenticate, authorize("SELLER", "ADMIN", "MANAGER")] }, vendorController.createProduct);
  app.put("/products/:id", { preHandler: [authenticate, authorize("SELLER", "ADMIN", "MANAGER")] }, vendorController.updateProduct);
  app.delete("/products/:id", { preHandler: [authenticate, authorize("SELLER", "ADMIN", "MANAGER")] }, vendorController.deleteProduct);

  // Vendor order management
  app.get("/orders", { preHandler: [authenticate, authorize("SELLER", "ADMIN", "MANAGER")] }, vendorController.getStoreOrders);
  app.put("/orders/:id/status", { preHandler: [authenticate, authorize("SELLER", "ADMIN", "MANAGER")] }, vendorController.updateStoreOrderStatus);
}
