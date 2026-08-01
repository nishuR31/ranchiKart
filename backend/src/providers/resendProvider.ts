import env from "../config/env.js";
import type { MailAttachment } from "./nodemailerProvider.js";

export const resendConfigured = Boolean(
  env.RESEND_API_KEY && env.RESEND_API_KEY.trim().length > 0
);

/**
 * Send transactional email via Resend HTTPS REST API.
 * Uses sender email "onboarding@resend.dev" by default.
 */
export async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[],
): Promise<{ id: string }> {
  if (!resendConfigured) {
    throw new Error("Resend API key is missing. Please set RESEND_API_KEY in environment variables.");
  }

  const from = env.RESEND_FROM || "onboarding@resend.dev";

  // Format attachments for Resend if present
  const formattedAttachments = attachments?.map((att) => ({
    filename: att.filename,
    content: Buffer.isBuffer(att.content) ? att.content.toString("base64") : String(att.content),
  }));

  const payload: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
  };

  if (formattedAttachments && formattedAttachments.length > 0) {
    payload.attachments = formattedAttachments;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as any;

  if (!response.ok) {
    const errorMsg = data?.message || data?.name || JSON.stringify(data);
    throw new Error(`Resend API error (${response.status}): ${errorMsg}`);
  }

  return { id: data.id };
}
