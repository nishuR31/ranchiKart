import { google } from "googleapis";
import nodemailer from "nodemailer";
import env from "../config/env.js";

// ── Credentials & Keys Verification ──
const gmailClientId = env.GMAIL_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const gmailClientSecret = env.GMAIL_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const gmailRefreshToken = env.GMAIL_REFRESH_TOKEN;
const gmailUser = env.GMAIL_USER || env.SMTP_USER;

export const gmailApiConfigured = !!(
  gmailClientId &&
  gmailClientSecret &&
  gmailRefreshToken &&
  gmailRefreshToken.trim().length > 0
);

// ── Google OAuth2 Transporter Client ──
export const oauth2Client = new google.auth.OAuth2(
  gmailClientId,
  gmailClientSecret
);

if (gmailRefreshToken) {
  oauth2Client.setCredentials({
    refresh_token: gmailRefreshToken,
  });
}

// Access Token Caching & Failure Tracking
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;
export let tokenFetchFailedUntil = 0;

export async function getGmailAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && tokenExpiresAt > now + 60000) {
    oauth2Client.setCredentials({
      access_token: cachedAccessToken,
      refresh_token: gmailRefreshToken,
    });
    return cachedAccessToken;
  }

  if (tokenFetchFailedUntil > now) {
    throw new Error("Gmail API OAuth token refresh previously failed (suppressing retries).");
  }

  if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken) {
    throw new Error("Gmail API OAuth2 credentials missing");
  }

  oauth2Client.setCredentials({
    refresh_token: gmailRefreshToken,
  });

  try {
    const res = await oauth2Client.getAccessToken();
    const token = typeof res === "string" ? res : res?.token;
    if (!token) {
      throw new Error("No access token returned from Google OAuth2 client.");
    }

    cachedAccessToken = token;
    tokenExpiresAt = now + 3500 * 1000;
    tokenFetchFailedUntil = 0;

    oauth2Client.setCredentials({
      access_token: token,
      refresh_token: gmailRefreshToken,
    });

    return cachedAccessToken;
  } catch (err) {
    tokenFetchFailedUntil = now + 5 * 60 * 1000; // Suppress retries for 5 minutes
    const errorDetail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to refresh Gmail API access token (${errorDetail}). GMAIL_REFRESH_TOKEN may be expired or invalid.`
    );
  }
}

// Nodemailer Stream Transporter to generate standard RFC 2822 MIME raw emails
const streamTransporter = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: "windows",
});

/**
 * Send email via Gmail REST API (HTTPS Port 443)
 */
export async function sendViaGmailApi(
  to: string,
  subject: string,
  html: string,
  attachments?: import("./nodemailerProvider.js").MailAttachment[],
): Promise<void> {
  await getGmailAccessToken();

  const fromSender =
    env.SMTP_FROM && env.SMTP_FROM.length > 0
      ? env.SMTP_FROM
      : gmailUser
        ? `${env.BUSINESS_NAME} <${gmailUser}>`
        : undefined;

  const info = await streamTransporter.sendMail({
    from: fromSender,
    to,
    subject,
    html,
    attachments,
  });

  const rawMessageBuffer = Buffer.isBuffer(info.message)
    ? info.message
    : Buffer.from(String(info.message));

  const rawBase64 = rawMessageBuffer.toString("base64url");

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawBase64,
    },
  });
}
