import nodemailer from "nodemailer";
import { env } from "../env.js";

const smtpConfigured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
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
    "Welcome to exKArt! 🎉",
    `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h1 style="color:#0f766e">Welcome, ${name}!</h1>
      <p>Thanks for joining exKArt — your one-stop shop for custom stamps, stationery, and boards.</p>
      <p>Start browsing our catalog and place your first order today.</p>
      <a href="${env.WEB_ORIGIN}" style="background:#f97316;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;margin-top:12px">Shop Now</a>
    </div>`
  );
}

export async function sendOrderConfirmation(
  to: string,
  name: string,
  orderId: string,
  total: number
) {
  await send(
    to,
    `Your exKArt Order #${orderId.slice(-8).toUpperCase()} is Confirmed!`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h1 style="color:#0f766e">Order Confirmed ✅</h1>
      <p>Hi ${name}, your order has been placed successfully.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#666">Order ID</td><td style="padding:8px;font-weight:bold">#${orderId.slice(-8).toUpperCase()}</td></tr>
        <tr style="background:#f4f6f2"><td style="padding:8px;color:#666">Total Paid</td><td style="padding:8px;font-weight:bold">₹${(total / 100).toFixed(2)}</td></tr>
      </table>
      <p>We'll notify you when your order is shipped. Typical dispatch time is 3–5 business days.</p>
      <a href="${env.WEB_ORIGIN}/orders" style="background:#f97316;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;margin-top:12px">Track Your Order</a>
    </div>`
  );
}

export async function sendOrderStatusUpdate(
  to: string,
  name: string,
  orderId: string,
  status: string,
  trackingId?: string
) {
  const statusLabels: Record<string, string> = {
    PROCESSING: "Your order is being processed 🔧",
    SHIPPED: "Your order has been shipped 🚚",
    DELIVERED: "Your order has been delivered 📦",
    CANCELLED: "Your order has been cancelled ❌"
  };
  const subject = statusLabels[status] ?? `Order status update: ${status}`;
  await send(
    to,
    subject,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h1 style="color:#0f766e">${subject}</h1>
      <p>Hi ${name}, your order <strong>#${orderId.slice(-8).toUpperCase()}</strong> status has been updated to <strong>${status}</strong>.</p>
      ${trackingId ? `<p>Tracking ID: <strong>${trackingId}</strong></p>` : ""}
      <a href="${env.WEB_ORIGIN}/orders" style="background:#f97316;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;margin-top:12px">View Order</a>
    </div>`
  );
}
