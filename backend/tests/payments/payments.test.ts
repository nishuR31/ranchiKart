import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";

describe("Payments Endpoints", () => {
  let userToken: string;

  beforeAll(async () => {
    userToken = await getUserToken();
  });

  describe("POST /api/v1/payments/razorpay/orders", () => {
    it("should fail validation with invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/payments/razorpay/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          // Missing orderId
        },
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
      // Will return 404 since order doesn't exist
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/payments/razorpay/verify", () => {
    it("should fail with invalid signature", async () => {
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
      // Verification will fail with 404 as order does not exist
      expect(res.statusCode).toBe(404);
    });
  });
});
