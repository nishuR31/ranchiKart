import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { prisma } from "../../src/config/prisma.js";
import { faker } from "@faker-js/faker";
import { userFactory } from "../factories/user.factory.js";

describe("Auth Endpoints", () => {
  const testUser = {
    email: "dreamgf691@gmail.com",
    password: "Password123!",
    name: faker.person.fullName(),
    phone: "1234567890",
  };

  let accessToken = "";
  let refreshToken = "";

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: testUser,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.message).toBe("User registered successfully");
    });

    it("should fail if user already exists", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: testUser,
      });

      expect(res.statusCode).toBe(409);
    });

    it("should fail validation with malformed data", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { email: "notanemail", password: "123" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeAll(async () => {
      await prisma.user.updateMany({
        where: { email: testUser.email },
        data: { isEmailVerified: true },
      });
    });

    it("should fail with incorrect password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { emailOrUsername: testUser.email, password: "wrongpassword" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("should login successfully and return tokens", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { emailOrUsername: testUser.email, password: testUser.password },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      accessToken = body.data.tokens.accessToken;
      
      const cookies = res.cookies;
      const refreshCookie = cookies.find((c) => c.name === "refreshToken");
      if (refreshCookie) {
        refreshToken = refreshCookie.value;
      }
      expect(accessToken).toBeDefined();
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should refresh the access token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: {
          refreshToken,
        }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.accessToken).toBeDefined();
    });

    it("should fail without a refresh token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: {}

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should get current user profile", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.user.email).toBe(testUser.email);
    });

    it("should fail with invalid token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer invalidtoken` },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("PUT /api/v1/auth/change-password", () => {
    it("should change password successfully", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/v1/auth/change-password",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { currentPassword: testUser.password, newPassword: "NewPassword123!" },
      });

      expect(res.statusCode).toBe(200);
      testUser.password = "NewPassword123!"; // update for future tests
    });

    it("should fail with wrong current password", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/v1/auth/change-password",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { currentPassword: "wrongpassword", newPassword: "NewPassword1234!" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("Magic Link & Google OAuth", () => {
    it("should request a magic link", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/magic-link",
        payload: { email: testUser.email },
      });
      expect(res.statusCode).toBe(200);
    });

    it("should fail verify magic link with invalid token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/magic-link/verify?token=invalid_jwt",
      });
      expect(res.statusCode).toBe(302); // Redirects with error
    });

    it("should redirect to Google auth url", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/google/login",
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain("accounts.google.com");
    });

    it("should handle missing google callback params", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/google/callback",
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain("error=");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout successfully", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
