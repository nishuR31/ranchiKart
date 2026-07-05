import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as couponController from "../controllers/couponController.js";

export async function couponRoutes(app: FastifyInstance) {
  app.post("/coupons/apply", { preHandler: authenticate }, couponController.applyCoupon);
  app.get("/coupons", { preHandler: authenticate }, couponController.getAllCoupons);
  app.post("/coupons", { preHandler: authenticate }, couponController.createCoupon);
  app.patch("/coupons/:id/toggle", { preHandler: authenticate }, couponController.toggleCoupon);
}
