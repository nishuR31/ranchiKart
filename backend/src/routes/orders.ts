import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as orderController from "../controllers/orderController.js";

export async function orderRoutes(app: FastifyInstance) {
  app.post("/orders", { preHandler: authenticate }, orderController.createOrder);
  app.get("/orders/:id", { preHandler: authenticate }, orderController.getOrder);
  app.get("/orders", { preHandler: authenticate }, orderController.getOrders);
}
