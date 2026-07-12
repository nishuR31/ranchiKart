import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

import type {
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import env from "../config/env.js";

// RP (Relying Party) settings
const rpName = env.BUSINESS_NAME || "RanchiKart";
// In production, this should be your actual domain (e.g., 'mudrakart.in')
// Since WEB_ORIGIN could be 'http://localhost:5173', we extract the hostname.
const rpID = new URL(env.WEB_ORIGIN).hostname;
const origin = env.WEB_ORIGIN;

export async function createPasskeyRegistrationOptions(
  user: { id: string; email: string; name: string },
  userPasskeys: any[],
) {
  return generateRegistrationOptions({
    rpName,
    rpID,
    userID: Uint8Array.from(Buffer.from(user.id, "utf-8")),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credentialID,
      transports: passkey.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function verifyPasskeyRegistration(response: any, expectedChallenge: string) {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
}

export async function createPasskeyAuthenticationOptions(userPasskeys: any[]) {
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credentialID,
      transports: passkey.transports,
    })),
    userVerification: "preferred",
  });
}

export async function verifyPasskeyAuthentication(
  response: any,
  expectedChallenge: string,
  authenticator: {
    credentialID: string;
    credentialPublicKey: Uint8Array;
    counter: number;
  },
) {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: authenticator.credentialID,
      publicKey: authenticator.credentialPublicKey as any,
      counter: authenticator.counter,
    },
  });
}
