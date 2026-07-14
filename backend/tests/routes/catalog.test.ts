import { describe, it, expect, beforeEach } from "bun:test";
import { app, prismaMock, resetMocks } from "../setup.js";
import { ProductKind } from "../../prisma/generated/client/index.js";

describe("Catalog Routes", () => {
  beforeEach(() => {
    resetMocks();
  });

  describe("GET /api/v1/categories", () => {
    it("should return a list of categories successfully", async () => {
      // Setup mock data
      const mockCategories = [
        { id: "1", name: "Electronics", slug: "electronics", kind: ProductKind.PHYSICAL, description: "Tech", imageUrl: "http://example.com/e.jpg" },
      ];
      
      (prismaMock.category.findMany as any).mockResolvedValue(mockCategories);

      // Execute request
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/categories",
      });

      // Verify
      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.categories).toEqual(mockCategories);
      expect(prismaMock.category.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/v1/products", () => {
    it("should return paginated products successfully", async () => {
      const mockProducts = [
        { id: "1", name: "Phone", slug: "phone", basePrice: 999 },
      ];
      
      (prismaMock.product.findMany as any).mockResolvedValue(mockProducts);
      (prismaMock.product.count as any).mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?page=1&limit=10",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.products).toEqual(mockProducts);
      expect(json.data.total).toBe(1);
    });

    it("should fail validation if page is negative", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?page=-1",
      });

      // Expecting a Bad Request (400) because Zod validation should fail
      expect(response.statusCode).toBe(400);
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    });
  });
});
