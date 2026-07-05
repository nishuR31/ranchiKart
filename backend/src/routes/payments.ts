import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as paymentController from "../controllers/paymentController.js";

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    "/payments/razorpay/orders",
    { preHandler: authenticate },
    paymentController.createRazorpayOrder,
  );
  app.post(
    "/payments/razorpay/verify",
    { preHandler: authenticate },
    paymentController.verifyRazorpayPayment,
  );
}
