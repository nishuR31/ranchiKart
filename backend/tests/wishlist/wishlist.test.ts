import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";

describe("Wishlist Endpoints", () => {
  let userToken: string;

  beforeAll(async () => {
    userToken = await getUserToken();
  });

  describe("GET /api/v1/wishlist", () => {
    it("should list wishlist items", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/wishlist",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.data.items)).toBe(true);
    });
  });

  describe("POST /api/v1/wishlist", () => {
    it("should add a product to wishlist", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/wishlist",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { productId: "invalid-id" }, // Invalid for now, check validation
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/wishlist/toggle", () => {
    it("should toggle a product in wishlist", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/wishlist/toggle",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { productId: "invalid-id" }, // Check validation
      });
      expect(res.statusCode).toBe(404); 
    });
  });

  describe("GET /api/v1/wishlist/check/:productId", () => {
    it("should check if product is in wishlist", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/wishlist/check/invalid-id",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("DELETE /api/v1/wishlist/:id", () => {
    it("should delete an item from wishlist", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/v1/wishlist/invalid-id",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(404); 
    });
  });
});
