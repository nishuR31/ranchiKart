import { OrderStatus, PaymentProvider, PaymentStatus, type Prisma } from "../../prisma/generated/client/index.js";
import { prisma } from "../config/prisma.js";
import env from "../config/env.js";
import {
  getRazorpayClient,
  razorpayConfigured,
  verifyRazorpaySignature,
} from "../config/razorpay.js";
import { sendInvoiceEmail, type InvoiceItem } from "../config/email.js";
import { generateInvoicePdf } from "../utils/invoicePdf.js";
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
          keyId: env.RAZORPAY_KEY_ID ?? "",
          orderId: existing.providerOrderId,
          amount: existing.amount,
          currency: existing.currency,
          mock: existing.providerOrderId.startsWith("mock_"),
        },
      };
    }

    const client = getRazorpayClient();
    const receipt = `ranchikart_${order.id.slice(0, 15)}`;

    if (!client && env.NODE_ENV === "production") {
      throw new InternalServerError("Razorpay keys are not configured");
    }

    // Razorpay expects amount in paise (smallest currency unit).
    // order.total MUST already be in paise (e.g., 99900 = ₹999).
    if (!Number.isInteger(order.total) || order.total <= 0) {
      throw new BadRequestError("Invalid order total for payment processing");
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
        keyId: env.RAZORPAY_KEY_ID ?? "",
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

    // Send invoice email (fire-and-forget — non-critical)
    prisma.order
      .findUnique({
        where: { id: data.orderId },
        include: {
          user: true,
          items: { include: { product: true, variant: true } },
          coupon: true,
        },
      })
      .then(async (paidOrder) => {
        if (!paidOrder?.user?.email) return;

        const invoiceItems: InvoiceItem[] = paidOrder.items.map((item: any) => ({
          name: item.product.name,
          variant: item.variant?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        }));

        const address = paidOrder.address as {
          fullName: string;
          phone: string;
          line1: string;
          line2?: string;
          city: string;
          state: string;
          pincode: string;
        };

        const invoiceData = {
          orderId: paidOrder.id,
          createdAt: paidOrder.createdAt,
          items: invoiceItems,
          subtotal: paidOrder.subtotal,
          shippingFee: paidOrder.shippingFee,
          discountAmount: paidOrder.discountAmount,
          total: paidOrder.total,
          paymentMethod: paidOrder.paymentMethod,
          address,
          couponCode: paidOrder.coupon?.code,
        };

        // Generate PDF invoice (soft-fail — email still sends without attachment)
        const pdfBuf = await generateInvoicePdf(invoiceData).catch((err) => {
          console.error("[Invoice PDF generation error]", err);
          return undefined;
        });

        return sendInvoiceEmail(
          paidOrder.user.email,
          paidOrder.user.name ?? "Customer",
          invoiceData,
          undefined,  // transport (auto)
          pdfBuf,     // attach PDF
        );

      })
      .catch((err) => console.error("[Invoice email error]", err));

    return updated;
  }
}
