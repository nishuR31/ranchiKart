import { describe, it, expect } from "vitest";
import app from "../../src/config/server.js";

describe("Categories Endpoints", () => {
  describe("GET /api/v1/categories", () => {
    it("should return a list of categories", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/categories",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.categories)).toBe(true);
    });
  });
});
