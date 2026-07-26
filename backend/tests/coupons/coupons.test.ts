import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getAdminToken, getUserToken } from "../helpers/auth.js";
import { faker } from "@faker-js/faker";

describe("Coupons Endpoints", () => {
  let adminToken: string;
  let userToken: string;
  let couponCode = faker.string.alphanumeric(8).toUpperCase();
  let couponId: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
    userToken = await getUserToken();
  });

  describe("POST /api/v1/coupons", () => {
    it("should fail to create coupon if not admin", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/coupons",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          code: couponCode,
          type: "PERCENT",
          value: 10,
          minOrderAmount: 100,
        },
      });
      expect([401, 403]).toContain(res.statusCode);
    });

    it("should create coupon as admin", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/coupons",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          code: couponCode,
          type: "PERCENT",
          value: 10,
          minOrderAmount: 100,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      couponId = body.data.coupon.id;
    });
  });

  describe("GET /api/v1/coupons", () => {
    it("should list coupons as admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/coupons",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.data.coupons)).toBe(true);
    });
  });

  describe("POST /api/v1/coupons/apply", () => {
    it("should apply coupon", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/coupons/apply",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          code: couponCode,
          orderAmount: 200,
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it("should fail if order value is below minOrderValue", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/coupons/apply",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          code: couponCode,
          orderAmount: 50,
        },
      });
      expect(res.statusCode).toBe(400); // Bad request due to low order value
    });
  });

  describe("PATCH /api/v1/coupons/:id/toggle", () => {
    it("should toggle coupon status as admin", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/coupons/${couponId}/toggle`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("DELETE /api/v1/admin/coupons/:id", () => {
    it("should delete coupon as admin", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/admin/coupons/${couponId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
