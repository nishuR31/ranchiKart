import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";

describe("Reviews Endpoints", () => {
  let userToken: string;

  beforeAll(async () => {
    userToken = await getUserToken();
  });

  describe("GET /api/v1/products/:slug/reviews", () => {
    it("should return reviews for a product", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/some-product-slug/reviews",
      });
      expect([200, 404]).toContain(res.statusCode); 
      // 200 if product exists, 404 if product not found.
    });
  });

  describe("POST /api/v1/products/:slug/reviews", () => {
    it("should fail validation with invalid data", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/products/some-product-slug/reviews",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          rating: 6, // Invalid rating
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("should fail to create review for non-existent product", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/products/does-not-exist/reviews",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          rating: 5,
          title: "Great",
          comment: "Loved it!",
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/reviews/:id/helpful", () => {
    it("should fail for invalid review ID", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/reviews/invalid-id/helpful",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("DELETE /api/v1/reviews/:id", () => {
    it("should fail for invalid review ID", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/v1/reviews/invalid-id",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
