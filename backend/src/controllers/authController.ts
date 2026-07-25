import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import AuthService from "../services/authService.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendSuccess,
  conflictError,
  unauthorizedError,
  forbiddenError,
  internalServerError,
  badRequestError,
  notFoundError,
} from "../utils/response.js";
import { code } from "status-map";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import { sendPasswordlessLoginEmail } from "../config/email.js";
import cookieOption from "../utils/cookieOptions.js";
import env from "../config/env.js";
const domain = env.NODE_ENV === "development" ? "http://localhost:5173" : env.WEB_ORIGIN


const authService = new AuthService();

function handleError(err: any, res: FastifyReply) {
  if (err instanceof ConflictError) return conflictError(res, err.message);
  if (err instanceof UnauthorizedError) return unauthorizedError(res, err.message);
  if (err instanceof ForbiddenError) return forbiddenError(res, err.message);
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  if (err instanceof ValidationError) return badRequestError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

// === Standard Auth ===

export const register = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      email: z.string().email(),
      name: z.string().min(2).max(80),
      password: z.string().min(8).max(120),
    })
    .parse(req.body);

  try {
    const result = await authService.register({
      email: body.email,
      name: body.name,
      password: body.password,
    });
    res.cookie("accessToken", result.tokens?.accessToken!, cookieOption("access"));
    return sendSuccess(res, "User registered successfully", code("created") as number, {
      user: result.user,
      token: result.tokens?.accessToken!,
    });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const login = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      emailOrUsername: z.string(),
      password: z.string(),
      totpToken: z.string().optional(),
    })
    .parse(req.body);

  try {
    const result = await authService.login(body.emailOrUsername, body.password, body.totpToken);
    if (result.requireTotp) {
      return sendSuccess(res, "TOTP required", code("ok") as number, {
        requireTotp: true,
        userId: result.user.id,
      });
    }
    res.cookie("accessToken", result.tokens?.accessToken!, cookieOption("refresh"));
    return sendSuccess(res, "Login successful", code("ok") as number, {
      user: result.user,
      token: result.tokens?.accessToken!,
    });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const logout = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : "";
  try {
    await authService.logout(req.user!.id, token);
    res.clearCookie("refreshToken");
    return sendSuccess(res, "Logout successful", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const refreshToken = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const token = (req.body as any)?.refreshToken;
  if (!token) return unauthorizedError(res, "No refresh token provided.");

  try {
    const tokens = await authService.refreshTokens(token);
    res.cookie("refreshToken", tokens.refreshToken!, cookieOption("refresh"));
    return sendSuccess(res, "Token refreshed", code("ok") as number, {
      accessToken: tokens.accessToken,
    });
  } catch (err: any) {
    return handleError(err, res);
  }
});

// === Profile & Password ===

export const me = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const user = await authService.getProfile(req.user!.id);
  return sendSuccess(res, "Profile fetched", code("ok") as number, { user });
});

export const changePassword = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).max(120),
    })
    .parse(req.body);

  try {
    await authService.changePassword(req.user!.id, body.currentPassword, body.newPassword);
    return sendSuccess(res, "Password changed successfully", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

// === Google OAuth ===

export const getGoogleAuthUrl = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const state = authService.generateOAuthState();
    const url = authService.getGoogleAuthUrl(state);
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: env.NODE_ENV === "production", // Secure only over HTTPS; plain HTTP (localhost) rejects Secure cookies
      sameSite: "lax",
      maxAge: 5 * 60, // seconds — @fastify/cookie uses seconds, NOT milliseconds
    });
    return res.redirect(url);
  } catch (err: any) {
    console.log("getGoogleAuthUrl", err)
    return res.redirect(`${domain}/auth?error=Google OAuth was denied`);
  }
});

export const googleCallback = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { code: oauthCode, state, error } = req.query as any;
  if (error) return res.redirect(`${domain}/auth?error=Google OAuth was denied`);
  if (!oauthCode || !state)
    return res.redirect(`${domain}/auth?error=Missing Google OAuth callback parameters`);

  const cookieState = req.cookies?.oauth_state;
  if (!cookieState || cookieState !== state) return res.redirect(`${domain}/auth?error=Invalid OAuth state`);
  res.clearCookie("oauth_state");

  try {
    const result = await authService.loginWithGoogleCode(oauthCode);
    res.cookie("accessToken", result.tokens.accessToken!, cookieOption("access"));
    // Use URL fragment (#) instead of query param (?) to avoid token leaking in server logs/referrers
    return res.redirect(`${domain}/auth#token=${result.tokens.accessToken}`);
  } catch (err: any) {
    return res.redirect(`${domain}/auth?error=${encodeURIComponent(err?.message || "Google login failed")}`);
  }
});

// === Magic Links ===

export const requestMagicLink = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  try {
    const token = await authService.generateMagicLinkToken(email);
    const link = `${env.NODE_ENV === "production" ? env.WEB_ORIGIN : "http://localhost:5173/api"}/v1/auth/magic-link/verify?token=${token}`;
    // const link = `${env.WEB_ORIGIN}/magic-link/verify?token=${token}&time=${Date.now().toString()}&`;
    // Look up the user for the email greeting — but don't leak whether the user exists
    await sendPasswordlessLoginEmail(email, "User", link, 15);
    // Never return the link/token in the response — it must only be accessible via email
    return sendSuccess(res, "If an account with that email exists, a magic link has been sent.", code("ok") as number, null);
  } catch (err: any) {
    // Return generic success even on error to prevent email enumeration
    return sendSuccess(res, "If an account with that email exists, a magic link has been sent.", code("ok") as number, null);
  }
});

export const verifyMagicLink = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { token } = z.object({ token: z.string() }).parse(req.query);

  try {

    const result = await authService.verifyMagicLink(token);
    res.cookie("accessToken", result.tokens.accessToken!, cookieOption("access"));
    return res.redirect(`${domain}/auth#token=${result.tokens.accessToken}`);
  } catch (err: any) {
    return res.redirect(`${domain}/auth?error=${encodeURIComponent(err?.message || "Magic link login failed")}`);
  }
});

// === TOTP ===

export const enableTotp = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await authService.enableTotp(req.user!.id);
    return sendSuccess(res, "TOTP setup initiated", code("ok") as number, result);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const verifyTotp = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { token } = z.object({ token: z.string().length(6) }).parse(req.body);
  try {
    await authService.verifyAndActivateTotp(req.user!.id, token);
    return sendSuccess(res, "TOTP enabled successfully", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const disableTotp = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { token } = z.object({ token: z.string().length(6) }).parse(req.body);
  try {
    await authService.disableTotp(req.user!.id, token);
    return sendSuccess(res, "TOTP disabled successfully", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});

// === Passkeys ===

export const generatePasskeyRegistration = asyncHandler(
  async (req: FastifyRequest, res: FastifyReply) => {
    try {

      const options = await authService.generatePasskeyRegistrationOptions(req.user!.id);
      return sendSuccess(
        res,
        "Passkey registration options generated",
        code("ok") as number,
        options,
      );
    } catch (err: any) {
      return handleError(err, res);
    }
  },
);

export const verifyPasskeyRegistration = asyncHandler(
  async (req: FastifyRequest, res: FastifyReply) => {
    try {
      await authService.verifyPasskeyRegistrationResponse(req.user!.id, req.body);
      return sendSuccess(res, "Passkey registered successfully", code("ok") as number, null);
    } catch (err: any) {
      return handleError(err, res);
    }
  },
);

export const generatePasskeyAuthentication = asyncHandler(
  async (req: FastifyRequest, res: FastifyReply) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    try {
      const { options, userId } = await authService.generatePasskeyAuthenticationOptions(email);
      res.cookie("passkey_auth_user", userId, {
        httpOnly: true,
        secure: env.NODE_ENV === "production", // Secure only over HTTPS
        sameSite: "lax",
        maxAge: 5 * 60, // seconds — NOT milliseconds
      });
      return sendSuccess(
        res,
        "Passkey authentication options generated",
        code("ok") as number,
        options,
      );
    } catch (err: any) {
      return handleError(err, res);
    }
  },
);

export const verifyPasskeyAuthentication = asyncHandler(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = req.cookies?.passkey_auth_user;
    if (!userId) return unauthorizedError(res, "Passkey authentication session expired.");

    try {
      const result = await authService.verifyPasskeyAuthenticationResponse(userId, req.body);
      res.clearCookie("passkey_auth_user");
      res.cookie("refreshToken", result.tokens!.refreshToken!, cookieOption("refresh"));
      return sendSuccess(res, "Passkey login successful", code("ok") as number, {
        user: result.user,
        token: result.tokens!.accessToken,
      });
    } catch (err: any) {
      return handleError(err, res);
    }
  },
);
