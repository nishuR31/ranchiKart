import type { FastifyInstance } from "fastify";
import { OrderStatus, PaymentProvider, PaymentStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getRazorpayClient, razorpayConfigured, verifyRazorpaySignature } from "../lib/razorpay.js";

const createPaymentSchema = z.object({
  orderId: z.string()
});

const verifyPaymentSchema = z.object({
  orderId: z.string(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string()
});

export async function paymentRoutes(app: FastifyInstance) {
  app.post("/payments/razorpay/orders", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createPaymentSchema.parse(request.body);
    const order = await prisma.order.findFirst({
      where: { id: body.orderId, userId: request.authUser!.id },
      include: { payments: true }
    });

    if (!order) return reply.notFound("Order not found");
    if (order.status !== "PENDING_PAYMENT") return reply.badRequest("Order is not pending payment");

    const existing = order.payments.find((payment) => payment.status === "CREATED");
    if (existing) {
      return {
        payment: existing,
        gateway: {
          keyId: process.env.RAZORPAY_KEY_ID ?? "",
          orderId: existing.providerOrderId,
          amount: existing.amount,
          currency: existing.currency,
          mock: existing.providerOrderId.startsWith("mock_")
        }
      };
    }

    const client = getRazorpayClient();
    const receipt = `exkart_${order.id.slice(0, 18)}`;
    const gatewayOrder = client
      ? await client.orders.create({
          amount: order.total,
          currency: "INR",
          receipt,
          notes: { orderId: order.id }
        })
      : {
          id: `mock_${order.id}`,
          amount: order.total,
          currency: "INR",
          receipt,
          status: "created",
          mock: true
        };

    if (!client && process.env.NODE_ENV === "production") {
      return reply.internalServerError("Razorpay keys are not configured");
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.RAZORPAY,
        status: PaymentStatus.CREATED,
        amount: order.total,
        currency: "INR",
        providerOrderId: gatewayOrder.id,
        rawResponse: gatewayOrder as Prisma.InputJsonObject
      }
    });

    return reply.code(201).send({
      payment,
      gateway: {
        keyId: process.env.RAZORPAY_KEY_ID ?? "",
        orderId: payment.providerOrderId,
        amount: payment.amount,
        currency: payment.currency,
        mock: !razorpayConfigured()
      }
    });
  });

  app.post("/payments/razorpay/verify", { preHandler: app.authenticate }, async (request, reply) => {
    const body = verifyPaymentSchema.parse(request.body);
    const payment = await prisma.payment.findFirst({
      where: {
        orderId: body.orderId,
        providerOrderId: body.razorpay_order_id,
        order: { userId: request.authUser!.id }
      }
    });

    if (!payment) return reply.notFound("Payment not found");

    const isMock = payment.providerOrderId.startsWith("mock_");
    const verified = isMock || verifyRazorpaySignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature
    });

    if (!verified) return reply.badRequest("Payment signature verification failed");

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CAPTURED,
        providerPaymentId: body.razorpay_payment_id,
        providerSignature: body.razorpay_signature
      }
    });

    await prisma.order.update({
      where: { id: body.orderId },
      data: { status: OrderStatus.PAID }
    });

    return { payment: updated };
  });
}
