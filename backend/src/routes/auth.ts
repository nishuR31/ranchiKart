import type { FastifyInstance } from "fastify";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

export async function authRoutes(app: FastifyInstance) {
  // Standard Auth
  app.post("/auth/register", authController.register);
  app.post("/auth/login", authController.login);
  app.post("/auth/logout", { preHandler: authenticate }, authController.logout);
  app.post("/auth/refresh", authController.refreshToken);

  // Profile & Password
  app.get("/auth/me", { preHandler: authenticate }, authController.me);
  app.put("/auth/change-password", { preHandler: authenticate }, authController.changePassword);

  // Google OAuth
  app.get("/auth/google/login", authController.getGoogleAuthUrl);
  app.get("/auth/google/callback", authController.googleCallback);

  // Magic Links
  app.post("/auth/magic-link", authController.requestMagicLink);
  app.get("/auth/magic-link/verify", authController.verifyMagicLink);

  // TOTP
  app.post("/auth/totp/enable", { preHandler: authenticate }, authController.enableTotp);
  app.post("/auth/totp/verify", { preHandler: authenticate }, authController.verifyTotp);
  app.post("/auth/totp/disable", { preHandler: authenticate }, authController.disableTotp);

  // Passkeys (WebAuthn)
  app.get(
    "/auth/passkey/register",
    { preHandler: authenticate },
    authController.generatePasskeyRegistration,
  );
  app.post(
    "/auth/passkey/register/verify",
    { preHandler: authenticate },
    authController.verifyPasskeyRegistration,
  );
  app.post("/auth/passkey/login", authController.generatePasskeyAuthentication);
  app.post("/auth/passkey/login/verify", authController.verifyPasskeyAuthentication);
}
