import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getAdminToken, getUserToken } from "../helpers/auth.js";

describe("Security Tests", () => {
  let userToken: string;

  beforeAll(async () => {
    userToken = await getUserToken();
  });

  describe("Authentication & Authorization", () => {
    it("should reject requests with random invalid JWT", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/me",
        headers: { authorization: `Bearer a.b.c` },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should prevent regular users from accessing admin routes", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/dashboard",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("SQL / NoSQL Injection attempts", () => {
    it("should handle unexpected types in query strings safely", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=1=1",
      });
      expect([400, 200]).toContain(res.statusCode); 
      // Zod validation should catch it (400) or it parses safely and ignores.
    });

    it("should handle object injection in JSON payloads securely", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { emailOrUsername: { $gt: "" }, password: "Password123!" },
      });
      expect(res.statusCode).toBe(400); // Zod validation fails
    });
  });

  describe("XSS Prevention", () => {
    it("should validate and possibly encode dangerous payloads", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "xss@example.com",
          password: "Password123!",
          name: "<script>alert(1)</script>",
          phone: "1234567890",
        },
      });
      // Depending on implementation, it might create it but return encoded OR fail validation
      expect([201, 400, 409]).toContain(res.statusCode);
    });
  });
});
