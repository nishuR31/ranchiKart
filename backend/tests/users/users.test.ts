import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";
import { prisma } from "../../src/config/prisma.js";

describe("Users Endpoints", () => {
  let token: string;
  let addressId: string;

  beforeAll(async () => {
    token = await getUserToken();
  });

  describe("GET /api/v1/users/me", () => {
    it("should get current user profile", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/me",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.email).toBeDefined();
    });

    it("should fail without token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/me",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("PUT /api/v1/users/me/profile", () => {
    it("should update profile via JSON", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/v1/users/me/profile",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "Updated Name",
          phone: "9876543210",
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.name).toBe("Updated Name");
    });
  });

  describe("POST /api/v1/users/me/addresses", () => {
    it("should add a new address", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/users/me/addresses",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          street: "123 Main St",
          city: "Ranchi",
          state: "Jharkhand",
          postalCode: "834001",
          country: "India",
          isDefault: true,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      addressId = body.data.id;
    });

    it("should fail validation if fields are missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/users/me/addresses",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          city: "Ranchi",
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/users/me/addresses", () => {
    it("should list addresses", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/me/addresses",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe("DELETE /api/v1/users/me/addresses/:id", () => {
    it("should delete an address", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/users/me/addresses/${addressId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it("should fail with invalid id", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/users/me/addresses/invalid-id`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(400); // Invalid UUID
    });
  });

  describe("PUT /api/v1/users/me/password", () => {
    it("should change password", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/v1/users/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          currentPassword: "UserPassword123!",
          newPassword: "NewUserPassword123!",
        },
      });
      expect(res.statusCode).toBe(200);

      // Revert password so token helper works next time
      await app.inject({
        method: "PUT",
        url: "/api/v1/users/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          currentPassword: "NewUserPassword123!",
          newPassword: "UserPassword123!",
        },
      });
    });
  });
});
