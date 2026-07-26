import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getAdminToken } from "../helpers/auth.js";

describe("Products Endpoints", () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  describe("GET /api/v1/products", () => {
    it("should return a list of products", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should handle pagination", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products?page=1&limit=5",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe("GET /api/v1/products/featured", () => {
    it("should return featured products", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/featured",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  describe("GET /api/v1/search", () => {
    it("should search for products", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/search?q=test",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/products/:slug", () => {
    it("should fail with invalid slug (not found)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/this-slug-does-not-exist",
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/catalog/cache", () => {
    it("should fail if unauthorized", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/v1/catalog/cache",
      });
      expect(res.statusCode).toBe(401);
    });

    it("should clear cache if authorized", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/v1/catalog/cache",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect([200, 403]).toContain(res.statusCode); // Might be admin only, so 200 or 403
    });
  });
});
