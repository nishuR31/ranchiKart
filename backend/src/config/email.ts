import nodemailer from "nodemailer";
import env from "./env.js";

const smtpConfigured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

async function send(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[Email no-op] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
}

export async function sendWelcomeEmail(to: string, name: string) {
  await send(
    to,
    `Welcome to ${env.BUSINESS_NAME}!`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1f2937">
      <h1 style="color:#0f766e">Welcome, ${name}!</h1>
      <p>Thanks for joining ${env.BUSINESS_NAME}—your destination for custom stamps and stationery.</p>
      <p>Start exploring our collection and make it uniquely yours.</p>
      <a href="${env.WEB_ORIGIN}" style="background:#f97316;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;margin-top:16px">Visit Store</a>
    </div>`,
  );
}

export async function sendOrderConfirmation(
  to: string,
  name: string,
  orderId: string,
  total: number,
) {
  await send(
    to,
    `Order Confirmed: #${orderId.slice(-8).toUpperCase()}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1f2937">
      <h1 style="color:#0f766e">Order Confirmed</h1>
      <p>Hi ${name}, we've received your order and are getting it ready.</p>
      <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:20px 0">
        <p style="margin:4px 0"><strong>Order ID:</strong> <code>#${orderId.slice(-8).toUpperCase()}</code></p>
        <p style="margin:4px 0"><strong>Total Paid:</strong> <code>₹${(total / 100).toFixed(2)}</code></p>
      </div>
      <p>We'll notify you as soon as your items are on the way. Typical dispatch takes <strong>3–5 business days</strong>.</p>
      <a href="${env.WEB_ORIGIN}/orders" style="background:#f97316;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;margin-top:16px">View Order Details</a>
    </div>`,
  );
}

export async function sendOrderStatusUpdate(
  to: string,
  name: string,
  orderId: string,
  status: string,
  trackingId?: string,
) {
  const statusLabels: Record<string, string> = {
    PROCESSING: "Order Status: Processing",
    SHIPPED: "Order Status: On the Way",
    DELIVERED: "Order Status: Delivered",
    CANCELLED: "Order Status: Cancelled",
  };
  const subject = statusLabels[status] ?? `Update on Order #${orderId.slice(-8).toUpperCase()}`;
  await send(
    to,
    subject,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1f2937">
      <h1 style="color:#0f766e">${subject}</h1>
      <p>Hi ${name}, the status of order <strong>#${orderId.slice(-8).toUpperCase()}</strong> has been updated to <strong>${status}</strong>.</p>
      ${trackingId ? `<div style="background:#f1f5f9;padding:12px;border-radius:6px;margin:16px 0">Tracking Number: <strong>${trackingId}</strong></div>` : ""}
      <a href="${env.WEB_ORIGIN}/orders" style="background:#f97316;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;margin-top:16px">View Order</a>
    </div>`,
  );
}

export async function sendPasswordlessLoginEmail(
  to: string,
  name: string,
  link: string,
  expiresInMinutes: number = 5,
) {
  await send(
    to,
    `Your Login Link for ${env.BUSINESS_NAME}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1f2937">
      <h1 style="color:#0f766e">Log in to ${env.BUSINESS_NAME}</h1>
      <p>Hi ${name},</p>
      <p>Click the button below to securely log into your account. This link will expire in ${expiresInMinutes} minutes.</p>
      <a href="${link}" style="background:#f97316;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;margin-top:16px">Login Now</a>
      <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">If you didn't request this link, please ignore this email.</p>
    </div>`,
  );
}
