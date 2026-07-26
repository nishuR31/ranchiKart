import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";
import { prisma } from "../../src/config/prisma.js";

describe("Payments Endpoints", () => {
  let userToken: string;
  let testOrderId: string;

  beforeAll(async () => {
    userToken = await getUserToken();

    // Create a product & category if missing
    const category = await prisma.category.create({
      data: {
        name: "Payment Category " + Date.now(),
        slug: "payment-category-" + Date.now(),
        description: "Payment testing category",
        imageUrl: "https://example.com/cat.jpg",
        kind: "STATIONERY",
      },
    });
    const product = await prisma.product.create({
      data: {
        name: "Payment Test Product " + Date.now(),
        slug: "payment-test-product-" + Date.now(),
        description: "Product for payment tests",
        kind: "STATIONERY",
        imageUrl: "https://example.com/prod.jpg",
        basePrice: 29900,
        stock: 20,
        categoryId: category.id,
      },
    });

    // Create an order for testing Razorpay flows
    const orderRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        paymentMethod: "UPI",
        address: {
          fullName: "Payment Tester",
          phone: "9998887776",
          line1: "789 Payment Rd",
          city: "Ranchi",
          state: "Jharkhand",
          pincode: "834002",
        },
        items: [
          {
            productId: product.id,
            quantity: 1,
            customization: {},
          },
        ],
      },
    });

    const orderBody = JSON.parse(orderRes.payload);
    testOrderId = orderBody.data.order.id;
  }, 30000);

  describe("POST /api/v1/payments/razorpay/orders", () => {
    it("should fail validation with invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/payments/razorpay/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("should fail with non-existent order ID", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/payments/razorpay/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          orderId: "123e4567-e89b-12d3-a456-426614174000",
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it("should successfully create a Razorpay gateway order for a pending order", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/payments/razorpay/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          orderId: testOrderId,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(body.data.gateway).toBeDefined();
      expect(body.data.gateway.orderId).toBeDefined();
      expect(body.data.payment).toBeDefined();
      expect(body.data.payment.status).toBe("CREATED");
    }, 30000);
  });

  describe("POST /api/v1/payments/razorpay/verify", () => {
    it("should fail with invalid signature or non-existent order", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/payments/razorpay/verify",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          orderId: "123e4567-e89b-12d3-a456-426614174000",
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_123",
          razorpay_signature: "invalid_signature",
        },
      });
      expect(res.statusCode).toBe(404);
    }, 30000);

    it("should verify payment and update order status to PAID", async () => {
      // First get or create the payment provider order ID
      const orderPayment = await prisma.payment.findFirst({
        where: { orderId: testOrderId },
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/payments/razorpay/verify",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          orderId: testOrderId,
          razorpay_order_id: orderPayment?.providerOrderId || `mock_${testOrderId}`,
          razorpay_payment_id: "pay_mock_success_123",
          razorpay_signature: "mock_signature_valid",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.payment.status).toBe("CAPTURED");

      // Verify order status in DB was updated to PAID
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(updatedOrder?.status).toBe("PAID");
    }, 30000);

    it("should fail to create another payment order for an already PAID order", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/payments/razorpay/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          orderId: testOrderId,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toMatch(/not pending payment/i);
    }, 30000);
  });
});
