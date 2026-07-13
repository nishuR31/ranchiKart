import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as couponController from "../controllers/couponController.js";
import { createCouponSchema, applyCouponSchema, toggleCouponSchema } from "../routeSchemas/couponSchemas.js";

export async function couponRoutes(app: FastifyInstance) {
  app.post("/coupons/apply", { preHandler: authenticate, schema: { body: applyCouponSchema } }, couponController.applyCoupon);
  app.get("/coupons", { preHandler: authenticate }, couponController.getAllCoupons);
  app.post("/coupons", { preHandler: authenticate, schema: { body: createCouponSchema } }, couponController.createCoupon);
  app.patch("/coupons/:id/toggle", { preHandler: authenticate, schema: { body: toggleCouponSchema } }, couponController.toggleCoupon);
}
