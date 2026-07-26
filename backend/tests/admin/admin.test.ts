import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getAdminToken, getUserToken } from "../helpers/auth.js";

describe("Admin Endpoints", () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    adminToken = (await getAdminToken())!;
    userToken = (await getUserToken())!;
  });

  describe("GET /api/v1/admin/dashboard", () => {
    it("should get dashboard stats as admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/dashboard",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it("should fail as regular user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/dashboard",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/v1/admin/stats/revenue-chart", () => {
    it("should get revenue chart as admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/stats/revenue-chart",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/admin/orders", () => {
    it("should list orders as admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/orders",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/admin/products", () => {
    it("should list products as admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/products",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("POST /api/v1/admin/categories", () => {
    it("should fail with invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/categories",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          // Missing name
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/admin/users", () => {
    it("should list users as admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/admin/logs", () => {
    it("should list logs as admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/logs",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
