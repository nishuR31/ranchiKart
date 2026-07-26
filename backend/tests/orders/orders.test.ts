import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";
import { prisma } from "../../src/config/prisma.js";

describe("Orders Endpoints", () => {
  let userToken: string;
  let testProductId: string;
  let initialStock: number;

  beforeAll(async () => {
    userToken = await getUserToken()!;

    // Ensure at least one active product exists for testing
    const category = await prisma.category.create({
      data: {
        name: "Order Test Category " + Date.now(),
        slug: "order-test-cat-" + Date.now(),
        description: "Testing category",
        imageUrl: "https://example.com/cat.jpg",
        kind: "STATIONERY",
      },
    });
    const product = await prisma.product.create({
      data: {
        name: "Order Test Product " + Date.now(),
        slug: "order-test-product-" + Date.now(),
        description: "Product description for order tests",
        kind: "STATIONERY",
        imageUrl: "https://example.com/prod.jpg",
        basePrice: 49900,
        stock: 50,
        categoryId: category.id,
      },
    });
    testProductId = product.id;
    initialStock = product.stock;
  }, 30000);

  describe("POST /api/v1/orders", () => {
    it("should fail validation with invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          items: [],
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("should successfully place an order and reduce product stock", async () => {
      const purchaseQuantity = 2;
      const orderPayload = {
        paymentMethod: "UPI",
        address: {
          fullName: "John Doe",
          phone: "9876543210",
          line1: "123 Main Street",
          city: "Ranchi",
          state: "Jharkhand",
          pincode: "834001",
        },
        items: [
          {
            productId: testProductId,
            quantity: purchaseQuantity,
            customization: {},
          },
        ],
      };

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: orderPayload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.order).toBeDefined();
      expect(body.data.order.id).toBeDefined();

      // Verify stock was reduced in the database
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(updatedProduct?.stock).toBe(initialStock - purchaseQuantity);
    }, 30000);

    it("should reject order if requested quantity exceeds available stock", async () => {
      // Set stock to a small number
      await prisma.product.update({
        where: { id: testProductId },
        data: { stock: 2 },
      });

      const orderPayload = {
        paymentMethod: "UPI",
        address: {
          fullName: "Jane Doe",
          phone: "9876543210",
          line1: "456 Market St",
          city: "Ranchi",
          state: "Jharkhand",
          pincode: "834001",
        },
        items: [
          {
            productId: testProductId,
            quantity: 10, // 10 is > 2 available stock, but <= 50 schema limit
            customization: {},
          },
        ],
      };

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${userToken}` },
        payload: orderPayload,
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toMatch(/insufficient stock/i);
    }, 30000);
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
      expect(Array.isArray(body.data.orders)).toBe(true);
      expect(body.data.orders.length).toBeGreaterThan(0);
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
      expect(res.statusCode).toBe(404);
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
