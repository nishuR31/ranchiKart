import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/config/server.js";
import prisma from "../src/config/prisma.js";

// Dummy email for our tests
const testUser = {
  email: "dreamgf691@gmail.com",
  password: "Password123!",
  name: "Test User",
  phone: "1234567890",
};

describe("Authentication Routes", () => {
  beforeAll(async () => {
    // Wait for the app to be fully ready
    await app.ready();
    // Clean up any previous test user
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  it("POST /api/v1/auth/register - Should register a new user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(testUser),
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe("User registered successfully");
  });

  it("POST /api/v1/auth/register - Should fail if user already exists", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(testUser),
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe("A user with this email already exists.");
  });

  let accessToken = "";

  it("POST /api/v1/auth/login - Should login and return tokens", async () => {
    // Manually verify email first so login succeeds
    await prisma.user.updateMany({
      where: { email: testUser.email },
      data: { isEmailVerified: true },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ emailOrUsername: testUser.email, password: testUser.password }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.tokens.accessToken).toBeDefined();
    
    accessToken = body.data.tokens.accessToken;

    // Check that cookies are set
    const cookies = res.cookies;
    const accessCookie = cookies.find((c) => c.name === "accessToken");

    expect(accessCookie).toBeDefined();
  });

  it("POST /api/v1/auth/logout - Should clear cookies", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        authorization: `Bearer ${accessToken}`
      },
    });

    const body = JSON.parse(res.payload);
    if (res.statusCode !== 200) {
      console.log("Logout failed with:", body);
    }
    expect(res.statusCode).toBe(200);
    expect(body.message).toBe("Logged out successfully");

    const accessCookie = res.cookies.find((c) => c.name === "accessToken");
    
    // The cookies should be cleared (max-age=0 or empty value)
    expect(accessCookie?.value).toBe("");
  });

  it("POST /api/v1/auth/magic-link - Should request a magic link", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ email: testUser.email }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe("If an account with that email exists, a magic link has been sent.");
  }, 10000);

  it("GET /api/v1/auth/magic-link/verify - Should fail with invalid token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/magic-link/verify",
      query: { token: "invalid_jwt_token_123" },
    });

    // We changed the backend to redirect to the frontend with an error
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("error=");
  });

  it("GET /api/v1/auth/google/login - Should redirect to Google", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/login",
    });

    // Should issue a 302 redirect to accounts.google.com
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("accounts.google.com/o/oauth2/v2/auth");
  });

  it("GET /api/v1/auth/google/callback - Should handle missing state/code gracefully", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback",
    });

    // Should redirect to frontend with error since params are missing
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("error=Missing");
  });
});
