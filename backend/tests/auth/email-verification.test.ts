import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import app from "../../src/config/server.js";
import { prisma } from "../../src/config/prisma.js";
import * as emailConfig from "../../src/config/email.js";

describe("Email Verification Functionality", () => {
  let accessToken = "";
  let userId = "";
  let capturedOtp = "";
  const testEmail = `dreamgf691+test${Math.floor(Math.random() * 1000000)}@gmail.com`;

  beforeAll(async () => {
    await app.ready();
    vi.spyOn(emailConfig, "sendVerificationEmailOTP").mockImplementation(async (to, name, otp) => {
      capturedOtp = otp;
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await app.close();
  });

  it("should register a new user with unverified email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        name: "Test Email Verifier",
        password: "Password123!",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    accessToken = body.data.tokens.accessToken;
    userId = body.data.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user).toBeDefined();
    expect(user?.isEmailVerified).toBe(false);
  });

  it("should send verification email OTP and store hashed OTP in DB", async () => {
    expect(userId).not.toBe("");

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/email/send-verification",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    expect(capturedOtp).toHaveLength(6);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.emailOtpHash).not.toBeNull();
    expect(user?.emailOtpExpiry).not.toBeNull();
  });

  it("should reject an invalid OTP", async () => {
    expect(userId).not.toBe("");

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/email/verify",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        otp: "000000",
      },
    });

    expect(res.statusCode).toBe(409); // ConflictError for invalid OTP
  });

  it("should verify email successfully with valid OTP", async () => {
    expect(userId).not.toBe("");
    expect(capturedOtp).not.toBe("");

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/email/verify",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        otp: capturedOtp,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    // Verify DB state updated
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(updatedUser?.isEmailVerified).toBe(true);
    expect(updatedUser?.emailOtpHash).toBeNull();
    expect(updatedUser?.emailOtpExpiry).toBeNull();
  });

  it("should prevent sending verification mail if email is already verified", async () => {
    expect(userId).not.toBe("");

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/email/send-verification",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(409); // ConflictError: Email already verified.
  });
});
