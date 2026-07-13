import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as paymentController from "../controllers/paymentController.js";
import { verifyRazorpayPaymentSchema, createRazorpayOrderSchema } from "../routeSchemas/paymentSchemas.js";

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    "/payments/razorpay/orders",
    { preHandler: authenticate, schema: { body: createRazorpayOrderSchema } },
    paymentController.createRazorpayOrder,
  );
  app.post(
    "/payments/razorpay/verify",
    { preHandler: authenticate, schema: { body: verifyRazorpayPaymentSchema } },
    paymentController.verifyRazorpayPayment,
  );
}
