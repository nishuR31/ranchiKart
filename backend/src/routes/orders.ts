import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as orderController from "../controllers/orderController.js";
import { checkoutSchema, getOrdersQuerySchema, getOrderParamsSchema } from "../routeSchemas/orderSchemas.js";

export async function orderRoutes(app: FastifyInstance) {
  app.post("/orders", { preHandler: authenticate, schema: { body: checkoutSchema } }, orderController.createOrder);
  app.get("/orders/:id", { preHandler: authenticate, schema: { params: getOrderParamsSchema } }, orderController.getOrder);
  app.get("/orders", { preHandler: authenticate, schema: { querystring: getOrdersQuerySchema } }, orderController.getOrders);
}
