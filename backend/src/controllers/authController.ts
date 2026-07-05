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
      password: z.string().min(8).max(120).optional(),
    })
    .parse(req.body);

  try {
    const result = await authService.register(body);
    res.cookie("refreshToken", result.tokens.refreshToken!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return sendSuccess(res, "User registered successfully", code("created") as number, result);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const login = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().optional(),
      totpToken: z.string().optional(),
    })
    .parse(req.body);

  try {
    const result = await authService.login(body.email, body.password, body.totpToken);
    if (result.requireTotp) {
      return sendSuccess(res, "TOTP required", code("ok") as number, {
        requireTotp: true,
        userId: result.user.id,
      });
    }
    res.cookie("refreshToken", result.tokens!.refreshToken!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return sendSuccess(res, "Login successful", code("ok") as number, result);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const logout = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : "";
  await authService.logout(req.user!.id, token);
  res.clearCookie("refreshToken");
  return sendSuccess(res, "Logout successful", code("ok") as number, null);
});

export const refreshToken = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const token = (req.body as any)?.refreshToken || req.cookies?.refreshToken;
  if (!token) return unauthorizedError(res, "No refresh token provided.");

  try {
    const tokens = await authService.refreshTokens(token);
    res.cookie("refreshToken", tokens.refreshToken!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
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

export const getGoogleAuthUrl = asyncHandler(async (_req: FastifyRequest, res: FastifyReply) => {
  try {
    const state = authService.generateOAuthState();
    const url = authService.getGoogleAuthUrl(state);
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000,
    });
    return sendSuccess(res, "OAuth URL generated", code("ok") as number, { url });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const googleCallback = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { code: oauthCode, state, error } = req.query as any;
  if (error) return unauthorizedError(res, `Google OAuth was denied. Error: ${error}`);
  if (!oauthCode || !state)
    return unauthorizedError(res, "Missing Google OAuth callback parameters.");

  const cookieState = req.cookies?.oauth_state;
  if (!cookieState || cookieState !== state) return unauthorizedError(res, "Invalid OAuth state.");
  res.clearCookie("oauth_state");

  try {
    const result = await authService.loginWithGoogleCode(oauthCode);
    res.cookie("refreshToken", result.tokens.refreshToken!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return sendSuccess(res, "Google login successful", code("ok") as number, result);
  } catch (err: any) {
    return handleError(err, res);
  }
});

// === Magic Links ===

export const requestMagicLink = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  try {
    const { user, token } = await authService.generateMagicLinkToken(email);
    const link = `${req.protocol}://${req.hostname}/api/v1/auth/magic-link/verify?token=${token}`;
    await sendPasswordlessLoginEmail(user.email, user.name ?? "User", link, 5); // Assumes email service supports this signature
    return sendSuccess(res, "Magic link sent to email", code("ok") as number, { link }); // Provide link in response for testing
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const verifyMagicLink = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { token } = z.object({ token: z.string() }).parse(req.query);
  try {
    const result = await authService.verifyMagicLink(token);
    res.cookie("refreshToken", result.tokens.refreshToken!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return sendSuccess(res, "Magic link login successful", code("ok") as number, result);
  } catch (err: any) {
    return handleError(err, res);
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
        secure: true,
        sameSite: "lax",
        maxAge: 5 * 60 * 1000,
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
      res.cookie("refreshToken", result.tokens.refreshToken!, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      return sendSuccess(res, "Passkey login successful", code("ok") as number, result);
    } catch (err: any) {
      return handleError(err, res);
    }
  },
);
