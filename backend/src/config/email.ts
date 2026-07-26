import nodemailer from "nodemailer";
import env from "./env.js";

const smtpConfigured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  })
  : null;

async function send(to: string, subject: string, html: string) {
  if (env.NODE_ENV === "test" || !transporter) {
    console.log(`[Email no-op] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
  } catch (err) {
    console.error(`[Email error] To: ${to} | Subject: ${subject} |`, err);
  }
}

/**
 * Base Responsive HTML Email Template Wrapper
 */
function renderBaseEmailTemplate(title: string, bodyHtml: string, preheader?: string): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; mso-hide: all;">
    ${preheader || title}
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center; border-bottom: 4px solid #ea580c;">
              <a href="${env.WEB_ORIGIN}" style="text-decoration: none; display: inline-block;">
                <span style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Ranchi<span style="color: #f97316;">Kart</span></span>
              </a>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">RANCHI'S OWN ONLINE STORE</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Horizontal Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f8fafc; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b;">
                Need help? <a href="${env.WEB_ORIGIN}/support" style="color: #ea580c; text-decoration: none; font-weight: 600;">Contact Support</a> &nbsp;•&nbsp; <a href="${env.WEB_ORIGIN}/orders" style="color: #ea580c; text-decoration: none; font-weight: 600;">Track Orders</a>
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                © ${currentYear} ${env.BUSINESS_NAME}. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                Ranchi, Jharkhand, India • Delivered fast across every locality in Ranchi
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 1. Welcome Email
export async function sendWelcomeEmail(to: string, name: string) {
  const title = `Welcome to ${env.BUSINESS_NAME}!`;
  const body = `
    <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;text-align:center;">
      Welcome to RanchiKart
    </h1>
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;text-align:center;">${name}!
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Thank you for joining <strong>${env.BUSINESS_NAME}</strong>—your trusted online destination for electronics, fashion, groceries, custom stationery, and home essentials.
    </p>
    <p style="margin: 0 0 28px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Explore thousands of products delivered directly to your doorstep anywhere in Ranchi with fast local delivery.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${env.WEB_ORIGIN}" style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
        Explore Store Now
      </a>
    </div>
  `;

  await send(to, title, renderBaseEmailTemplate(title, body, `Welcome to ${env.BUSINESS_NAME}, ${name}!`));
}

// 2. Order Confirmation Email
export async function sendOrderConfirmation(
  to: string,
  name: string,
  orderId: string,
  total: number,
) {
  const shortOrderId = orderId.slice(-8).toUpperCase();
  const title = `Order Confirmed: #${shortOrderId}`;
  const body = `
    <h1 style="margin: 0 0 12px 0; color: #0f172a; font-size: 24px; font-weight: 700;">
      Order Confirmed! 
    </h1>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${name}</strong>, we've received your order and our fulfillment team is preparing it for dispatch.
    </p>

    <!-- Order Details Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding-bottom: 12px; color: #64748b; font-size: 14px;">Order Reference:</td>
          <td align="right" style="padding-bottom: 12px; color: #0f172a; font-size: 14px; font-weight: 700; font-family: monospace;">#${shortOrderId}</td>
        </tr>
        <tr>
          <td style="padding-top: 12px; border-top: 1px dashed #cbd5e1; color: #0f172a; font-size: 16px; font-weight: 700;">Total Amount Paid:</td>
          <td align="right" style="padding-top: 12px; border-top: 1px dashed #cbd5e1; color: #ea580c; font-size: 18px; font-weight: 800;">₹${(total / 100).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 28px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Estimated delivery timeline: <strong>3–5 business days</strong>. We will notify you as soon as your items are handed over to our courier partner.
    </p>

    <div style="text-align: center; margin: 28px 0 12px 0;">
      <a href="${env.WEB_ORIGIN}/orders" style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
        Track Your Order
      </a>
    </div>
  `;

  await send(to, title, renderBaseEmailTemplate(title, body, `Order #${shortOrderId} confirmed!`));
}

// 3. Order Status Update Email
export async function sendOrderStatusUpdate(
  to: string,
  name: string,
  orderId: string,
  status: string,
  trackingId?: string,
) {
  const shortOrderId = orderId.slice(-8).toUpperCase();
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    PROCESSING: { bg: "#fff7ed", text: "#c2410c", label: "Processing" },
    SHIPPED: { bg: "#eff6ff", text: "#1d4ed8", label: "Out for Delivery" },
    DELIVERED: { bg: "#f0fdf4", text: "#15803d", label: "Delivered" },
    CANCELLED: { bg: "#fef2f2", text: "#b91c1c", label: "Cancelled" },
  };

  const statusConfig = statusColors[status] || { bg: "#f1f5f9", text: "#334155", label: status };
  const title = `Update on Order #${shortOrderId}`;

  const body = `
    <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700;">
      Order Status Update 
    </h1>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${name}</strong>, your order <strong>#${shortOrderId}</strong> has been updated.
    </p>

    <!-- Status Badge Card -->
    <div style="background-color: ${statusConfig.bg}; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1px; display: block; margin-bottom: 6px;">Current Status</span>
      <span style="font-size: 20px; font-weight: 800; color: ${statusConfig.text};">${statusConfig.label}</span>
    </div>

    ${trackingId ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
        <span style="color: #64748b; font-size: 13px; display: block; margin-bottom: 4px;">Tracking Number:</span>
        <span style="color: #0f172a; font-size: 15px; font-weight: 700; font-family: monospace;">${trackingId}</span>
      </div>
    ` : ""}

    <div style="text-align: center; margin: 28px 0 12px 0;">
      <a href="${env.WEB_ORIGIN}/orders" style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
        View Order Status
      </a>
    </div>
  `;

  await send(to, title, renderBaseEmailTemplate(title, body, `Status update for Order #${shortOrderId}`));
}

// 4. Magic Link Login Email
export async function sendPasswordlessLoginEmail(
  to: string,
  name: string,
  link: string,
  expiresInMinutes: number = 15,
) {
  const title = `Your Magic Login Link`;
  const body = `
    <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700;">
      Log in to ${env.BUSINESS_NAME} 
    </h1>
    <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 28px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Click the link below to securely sign into your account. This magic link will automatically expire in <strong>${expiresInMinutes} minutes</strong>.
    </p>

    <h3>
      <code>
        <a href='${link}'>${link}</a>
        </code>
    </h3>

    <br />
    <hr
      style="
        border: 0;
        border-top: 1px solid #e2e8f0;
        width: 75%;
        margin: 24px auto;
        "/>
    <br />

    <div style="text-align: center; margin: 32px 0;">
      <a href="${link}" style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
        Log In Instantly
      </a>
    </div>

    <p style="margin: 28px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
      If you didn't request this login link, you can safely ignore this email.
    </p>
  `;

  await send(to, title, renderBaseEmailTemplate(title, body, `Log in to ${env.BUSINESS_NAME}`));
}

// 5. Verification OTP Email
export async function sendVerificationEmailOTP(
  to: string,
  name: string,
  otp: string,
) {
  const title = `Verify Your Email`;
  const body = `
    <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700; text-align: center;">
      Email Verification 
    </h1>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">
      Hi <strong>${name}</strong>, please use the 6-digit verification code below to verify your email address.
    </p>

    <!-- OTP Code Display Card -->
    <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;">
      <span style="font-size: 36px; font-weight: 800; color: #ea580c; letter-spacing: 12px; font-family: monospace; display: inline-block; padding-left: 12px;">
        ${otp}
      </span>
      <span style="display: block; margin-top: 10px; font-size: 12px; color: #64748b; font-weight: 600;">
        Valid for 10 minutes
      </span>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
      If you did not request this email verification code, no further action is required.
    </p>
  `;

  await send(to, title, renderBaseEmailTemplate(title, body, `Your verification code is ${otp}`));
}
