import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  generateTokenPair,
  generateAccessToken,
  storeRefreshToken,
  verifyRefreshToken,
  getStoredRefreshToken,
  removeRefreshToken,
  blacklistToken,
  removeAccessToken,
} from "../utils/jwt.js";
import { sendWelcomeEmail, sendPasswordlessLoginEmail } from "../config/email.js";
import UserRepository from "../repositories/userRepository.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  InternalServerError,
} from "../utils/errors.js";
import { User, PasskeyCredential } from "../../prisma/generated/client/index.js";
import { prisma } from "../config/prisma.js";
import env from "../config/env.js";
import { generateTotpSecret, generateTotpQrCode, verifyTotpToken } from "../utils/totp.js";
import {
  createPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  createPasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "../utils/passkey.js";

const userRepo = new UserRepository();

type PublicUser = Omit<User, "passwordHash" | "totpSecret" | "refreshToken">;

function publicUser(user: User): PublicUser {
  const { passwordHash: _, totpSecret: __, refreshToken: ___, ...safe } = user;
  return safe;
}

export default class AuthService {
  // === Standard Email/Password Auth ===

  async register(data: { email: string; name: string; password: string }): Promise<{
    user: PublicUser;
    tokens: { accessToken?: string; refreshToken?: string };
  }> {
    const existing = await userRepo.findByEmail(data.email.toLowerCase());
    if (existing) throw new ConflictError("A user with this email already exists.");

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await userRepo.create({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
    });

    sendWelcomeEmail(user.email, user.name ?? "User").catch(() => { });

    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    await storeRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken!);

    console.log(tokens, user)

    return { user: publicUser(user), tokens };
  }

  async login(
    email: string,
    password?: string,
    totpToken?: string,
  ): Promise<{
    user: PublicUser;
    tokens?: { accessToken?: string; refreshToken?: string };
    requireTotp?: boolean;
  }> {
    const user = await userRepo.findByEmail(email.toLowerCase());
    if (!user) throw new UnauthorizedError("Invalid email or password.");
    if (user.isBanned) {
      throw new ForbiddenError(
        JSON.stringify({
          banned: true,
          banReason: user.banReason ?? "Your account has been suspended.",
        }),
      );
    }

    if (password) {
      if (!user.passwordHash)
        throw new UnauthorizedError(
          "This account uses OAuth or Magic Link. Please log in without a password.",
        );
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) throw new UnauthorizedError("Invalid email or password.");
    }

    if (user.isTotpEnabled) {
      if (!totpToken) {
        return { user: publicUser(user), requireTotp: true };
      }
      if (!user.totpSecret || !(await verifyTotpToken(totpToken, user.totpSecret))) {
        throw new UnauthorizedError("Invalid TOTP token.");
      }
    }

    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    await storeRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateLastLogin(user.id);

    return { user: publicUser(user), tokens };
  }

  async logout(userId: string, accessToken: string) {
    await blacklistToken(accessToken);
    await removeRefreshToken(userId);
    await userRepo.updateRefreshToken(userId, null);
    await removeAccessToken(userId);
  }

  async refreshTokens(refreshToken: string) {
    const decoded = await verifyRefreshToken(refreshToken);
    const storedToken = await getStoredRefreshToken(decoded.id);

    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedError("Refresh token is invalid or has been revoked.");
    }

    const user = await userRepo.findById(decoded.id);
    if (user.isBanned) throw new ForbiddenError("Account is banned.");

    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    await storeRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken!);
    return tokens;
  }

  // === Google OAuth ===

  private assertGoogleConfig() {
    console.log(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
      throw new InternalServerError("Google OAuth is not configured.");
    }
  }

  generateOAuthState() {
    return crypto.randomBytes(16).toString("hex");
  }

  getGoogleAuthUrl(state: string) {
    this.assertGoogleConfig();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", env.GOOGLE_CALLBACK_URL!);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async loginWithGoogleCode(code: string) {
    this.assertGoogleConfig();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_CALLBACK_URL!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) throw new UnauthorizedError("Google token exchange failed.");
    const { access_token } = (await tokenRes.json()) as any;

    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileRes.ok) throw new UnauthorizedError("Failed to fetch Google profile.");
    const profile = (await profileRes.json()) as any;

    if (!profile.email || !profile.email_verified) {
      throw new UnauthorizedError("Google email is missing or unverified.");
    }

    let user = await userRepo.findByEmail(profile.email);
    if (!user) {
      user = await userRepo.create({
        email: profile.email,
        name: profile.name || profile.email.split("@")[0],
        avatarUrl: profile.picture,
        isEmailVerified: true,
      });
    } else {
      user = await userRepo.updateProfile(user.id, {
        name: profile.name || user.name,
        avatarUrl: profile.picture || user.avatarUrl,
      });
      await userRepo.updateLastLogin(user.id);
    }

    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    await storeRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken!);

    return { user: publicUser(user), tokens };
  }

  // === Magic Links / Passwordless ===

  async generateMagicLinkToken(email: string) {
    const user = await userRepo.findByEmail(email.toLowerCase());
    if (!user) throw new NotFoundError("User not found.");

    const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    return { user, token };
  }

  async verifyMagicLink(token: string) {
    // Magic link tokens are essentially short-lived access tokens.
    // If valid, issue full access + refresh pair.
    const decoded = await verifyRefreshToken(token).catch(async () => {
      // fallback if we used access token generator
      const { verifyAccessToken } = await import("../utils/jwt.js");
      return verifyAccessToken(token);
    });

    const user = await userRepo.findById(decoded.id);
    if (user.isBanned) throw new ForbiddenError("Account is banned.");

    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    await storeRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateLastLogin(user.id);

    return { user: publicUser(user), tokens };
  }

  // === TOTP ===

  async enableTotp(userId: string) {
    const user = await userRepo.findById(userId);
    if (user.isTotpEnabled) throw new ConflictError("TOTP is already enabled.");

    const secret = generateTotpSecret();
    const qrCode = await generateTotpQrCode(user.email, secret);
    await userRepo.updateTotpSecret(userId, secret, false);

    return { secret, qrCode };
  }

  async verifyAndActivateTotp(userId: string, token: string) {
    const user = await userRepo.findById(userId);
    if (!user.totpSecret) throw new NotFoundError("No TOTP secret found.");
    if (user.isTotpEnabled) throw new ConflictError("TOTP is already active.");

    if (!(await verifyTotpToken(token, user.totpSecret))) {
      throw new ValidationError("Invalid TOTP token.");
    }

    await userRepo.updateTotpSecret(userId, user.totpSecret, true);
  }

  async disableTotp(userId: string, token: string) {
    const user = await userRepo.findById(userId);
    if (!user.isTotpEnabled || !user.totpSecret) throw new ConflictError("TOTP is not active.");

    if (!(await verifyTotpToken(token, user.totpSecret))) {
      throw new ValidationError("Invalid TOTP token.");
    }
    await userRepo.updateTotpSecret(userId, null, false);
  }

  // === Passkeys (WebAuthn) ===

  async generatePasskeyRegistrationOptions(userId: string) {
    const user = await userRepo.findById(userId);
    const passkeys = await prisma.passkeyCredential.findMany({ where: { userId } });

    const options = await createPasskeyRegistrationOptions(
      { id: user.id, email: user.email, name: user.name || "User" },
      passkeys
    );

    // Save challenge temporarily (in production, use Redis or similar with expiry)
    // await prisma.user.update({
    //   where: { id: userId },
    //   data: { banReason: options.challenge }, // HACK: reusing field temporarily or use Redis. Better to use Redis.
    // });
    // Wait, let's use Redis properly instead of hijacking `banReason`.
    const redis = (await import("../config/redis.js")).default;
    await redis?.setex(`passkey_reg_challenge:${userId}`, 300, options.challenge);

    return options;
  }

  async verifyPasskeyRegistrationResponse(userId: string, response: any) {
    const redis = (await import("../config/redis.js")).default;
    const expectedChallenge = await redis?.get(`passkey_reg_challenge:${userId}`);
    if (!expectedChallenge) throw new ValidationError("Passkey challenge expired or not found.");

    const verification = await verifyPasskeyRegistration(response, expectedChallenge);
    if (!verification.verified || !verification.registrationInfo) {
      throw new ValidationError("Passkey registration failed.");
    }

    const { credential } = verification.registrationInfo;

    await prisma.passkeyCredential.create({
      data: {
        userId,
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports || [],
      },
    });

    await redis?.del(`passkey_reg_challenge:${userId}`);
    return true;
  }

  async generatePasskeyAuthenticationOptions(email: string) {
    const user = await userRepo.findByEmail(email.toLowerCase());
    if (!user) throw new NotFoundError("User not found.");

    const passkeys = await prisma.passkeyCredential.findMany({ where: { userId: user.id } });
    if (!passkeys.length) throw new NotFoundError("No passkeys registered for this user.");

    const options = await createPasskeyAuthenticationOptions(passkeys);

    const redis = (await import("../config/redis.js")).default;
    await redis?.setex(`passkey_auth_challenge:${user.id}`, 300, options.challenge);

    return { options, userId: user.id };
  }

  async verifyPasskeyAuthenticationResponse(userId: string, response: any) {
    const redis = (await import("../config/redis.js")).default;
    const expectedChallenge = await redis?.get(`passkey_auth_challenge:${userId}`);
    if (!expectedChallenge) throw new ValidationError("Passkey challenge expired or not found.");

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credentialID: response.id },
    });
    if (!passkey || passkey.userId !== userId) throw new NotFoundError("Passkey not found.");

    const verification = await verifyPasskeyAuthentication(response, expectedChallenge, {
      credentialID: passkey.credentialID,
      credentialPublicKey: new Uint8Array(passkey.credentialPublicKey),
      counter: Number(passkey.counter),
      transports: passkey.transports as AuthenticatorTransport[],
    });

    if (!verification.verified || !verification.authenticationInfo) {
      throw new ValidationError("Passkey verification failed.");
    }

    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    await redis?.del(`passkey_auth_challenge:${userId}`);

    const user = await userRepo.findById(userId);
    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    await storeRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken!);
    await userRepo.updateLastLogin(user.id);

    return { user: publicUser(user), tokens };
  }

  // === Utilities ===

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await userRepo.findById(userId);
    return publicUser(user);
  }

  async changePassword(userId: string, currentPassword?: string, newPassword?: string) {
    const user = await userRepo.findById(userId);
    if (user.passwordHash && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) throw new UnauthorizedError("Current password is incorrect.");
    }

    const hash = newPassword ? await bcrypt.hash(newPassword, 10) : "";
    await userRepo.updatePassword(userId, hash);
  }
}
