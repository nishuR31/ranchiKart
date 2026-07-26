import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";

describe("Orders Endpoints", () => {
  let userToken: string;

  beforeAll(async () => {
    userToken = await getUserToken();
  });

  describe("POST /api/v1/orders", () => {
    it("should fail validation with invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          items: [], // Validation might fail if empty or no address
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/orders", () => {
    it("should list user orders", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should fail if unauthorized", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/orders",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/orders/:id", () => {
    it("should fail with invalid order ID", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/orders/invalid-id",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(400); // Bad Request (invalid UUID)
    });
    
    it("should fail to get a non-existent order (valid UUID)", async () => {
      const fakeUuid = "123e4567-e89b-12d3-a456-426614174000";
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/orders/${fakeUuid}`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
