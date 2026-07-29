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
      expect(body.data.user.email).toBeDefined();
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
      expect(body.data.user.name).toBe("Updated Name");
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.user.totpSecret).toBeUndefined();
      expect(body.data.user.refreshToken).toBeUndefined();
      expect(body.data.user.emailOtpHash).toBeUndefined();
      expect(body.data.user.emailOtpExpiry).toBeUndefined();
    });
  });

  describe("POST /api/v1/users/me/addresses", () => {
    it("should add a new address", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/users/me/addresses",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          fullName: "Nishu Kumar",
          phone: "9876543210",
          line1: "123 Main St",
          city: "Ranchi",
          state: "Jharkhand",
          pincode: "834001",
          isDefault: true,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      addressId = body.data.address.id;
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
      expect(Array.isArray(body.data.addresses)).toBe(true);
      expect(body.data.addresses.length).toBeGreaterThan(0);
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
      expect(res.statusCode).toBe(404);
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

  describe("DELETE /api/v1/users/me (Soft Delete & 90-Day Hard Delete)", () => {
    it("should soft delete user account and schedule 90-day hard delete purge", async () => {
      // Create a temporary user to test soft delete & hard delete purge
      const tempUser = await prisma.user.create({
        data: {
          email: `tempdelete_${Date.now()}@example.com`,
          name: "Temp Delete User",
          passwordHash: "dummyhash",
        },
      });

      const { generateAccessToken } = await import("../../src/utils/jwt.js");
      const tempToken = await generateAccessToken({ id: tempUser.id, email: tempUser.email, role: tempUser.role });

      const res = await app.inject({
        method: "DELETE",
        url: "/api/v1/users/me",
        headers: { authorization: `Bearer ${tempToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.deletedAt).toBeDefined();
      expect(body.data.scheduledHardDeleteAt).toBeDefined();

      const dbUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(dbUser?.isDeleted).toBe(true);
      expect(dbUser?.scheduledHardDeleteAt).toBeDefined();

      // Test Hard Delete Purge function for expired accounts
      // Artificially set scheduledHardDeleteAt to 91 days ago
      await prisma.user.update({
        where: { id: tempUser.id },
        data: {
          scheduledHardDeleteAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
        },
      });

      const UserService = (await import("../../src/services/userService.js")).default;
      const purgedCount = await UserService.purgeExpiredSoftDeletedUsers();
      expect(purgedCount).toBeGreaterThanOrEqual(1);

      const purgedUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(purgedUser).toBeNull();
    });
  });
});

