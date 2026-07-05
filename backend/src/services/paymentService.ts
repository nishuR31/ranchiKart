import { OrderStatus, PaymentProvider, PaymentStatus, type Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import {
  getRazorpayClient,
  razorpayConfigured,
  verifyRazorpaySignature,
} from "../config/razorpay.js";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils/errors.js";

export default class PaymentService {
  async createRazorpayOrder(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== "PENDING_PAYMENT")
      throw new BadRequestError("Order is not pending payment");

    const existing = order.payments.find((p: any) => p.status === "CREATED");
    if (existing) {
      return {
        payment: existing,
        gateway: {
          keyId: process.env.RAZORPAY_KEY_ID ?? "",
          orderId: existing.providerOrderId,
          amount: existing.amount,
          currency: existing.currency,
          mock: existing.providerOrderId.startsWith("mock_"),
        },
      };
    }

    const client = getRazorpayClient();
    const receipt = `exkart_${order.id.slice(0, 18)}`;

    if (!client && process.env.NODE_ENV === "production") {
      throw new InternalServerError("Razorpay keys are not configured");
    }

    const gatewayOrder = client
      ? await client.orders.create({
          amount: order.total,
          currency: "INR",
          receipt,
          notes: { orderId: order.id },
        })
      : {
          id: `mock_${order.id}`,
          amount: order.total,
          currency: "INR",
          receipt,
          status: "created",
          mock: true,
        };

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.RAZORPAY,
        status: PaymentStatus.CREATED,
        amount: order.total,
        currency: "INR",
        providerOrderId: gatewayOrder.id,
        rawResponse: gatewayOrder as Prisma.InputJsonObject,
      },
    });

    return {
      payment,
      gateway: {
        keyId: process.env.RAZORPAY_KEY_ID ?? "",
        orderId: payment.providerOrderId,
        amount: payment.amount,
        currency: payment.currency,
        mock: !razorpayConfigured(),
      },
    };
  }

  async verifyRazorpayPayment(
    userId: string,
    data: {
      orderId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    const payment = await prisma.payment.findFirst({
      where: {
        orderId: data.orderId,
        providerOrderId: data.razorpay_order_id,
        order: { userId },
      },
    });

    if (!payment) throw new NotFoundError("Payment not found");

    const isMock = payment.providerOrderId.startsWith("mock_");
    const verified =
      isMock ||
      verifyRazorpaySignature({
        orderId: data.razorpay_order_id,
        paymentId: data.razorpay_payment_id,
        signature: data.razorpay_signature,
      });

    if (!verified) throw new BadRequestError("Payment signature verification failed");

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CAPTURED,
        providerPaymentId: data.razorpay_payment_id,
        providerSignature: data.razorpay_signature,
      },
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: OrderStatus.PAID },
    });

    return updated;
  }
}
