import { describe, it, expect, beforeEach, mock } from "bun:test";
import { app, prismaMock, resetMocks } from "../setup.js";
import { Role } from "../../prisma/generated/client/index.js";

describe("Auth Routes", () => {
  beforeEach(() => {
    resetMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should successfully register a new user", async () => {
      // Mock findFirst to return null (meaning user doesn't exist)
      (prismaMock.user.findFirst as any).mockResolvedValue(null);
      // Mock create to return a new user object
      const createdUser = {
        id: "usr_123",
        email: "test@example.com",
        name: "Test User",
        role: Role.USER,
        passwordHash: "hashed_password",
      };
      (prismaMock.user.create as any).mockResolvedValue(createdUser);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "test@example.com",
          password: "Password123!",
          name: "Test User"
        }
      });

      expect(response.statusCode).toBe(201);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe("test@example.com");
      expect(prismaMock.user.findFirst).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });

    it("should fail if email already exists (409 Conflict)", async () => {
      // Mock findFirst to return an existing user
      (prismaMock.user.findFirst as any).mockResolvedValue({ id: "usr_999", email: "test@example.com" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "test@example.com",
          password: "Password123!",
          name: "Test User"
        }
      });

      expect(response.statusCode).toBe(409);
      const json = response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("A user with this email already exists.");
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("should fail validation if password is too weak (400 Bad Request)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "test@example.com",
          password: "123", // Weak password
          name: "Test User"
        }
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    });
  });
});
