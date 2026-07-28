import env from "./env.js";
import {
  sendViaGmailApi,
  oauth2Client,
  gmailApiConfigured,
  tokenFetchFailedUntil,
} from "../providers/gmailProvider.js";
import {
  sendViaSmtp,
  nodemailerTransporter,
  smtpConfigured,
  type MailAttachment,
} from "../providers/nodemailerProvider.js";

export type EmailTransportType = "gmail" | "smtp" | "auto";
export type { MailAttachment };

export { sendViaGmailApi, oauth2Client, gmailApiConfigured };
export { sendViaSmtp, nodemailerTransporter, smtpConfigured };


export async function send(
  to: string,
  subject: string,
  html: string,
  transport?: EmailTransportType,
  attachments?: MailAttachment[],
) {
  if (env.NODE_ENV === "test") {
    console.log(`[Email test no-op] [Transport: ${transport || "auto"}] To: ${to} | Subject: ${subject}`);
    return;
  }

  const selectedTransport = transport || env.EMAIL_TRANSPORT || "auto";

  // Choice 1: Force Gmail REST API Transport
  if (selectedTransport === "gmail") {
    try {
      await sendViaGmailApi(to, subject, html, attachments);
      console.log(`[Email sent via Gmail API] To: ${to} | Subject: ${subject}`);
      return;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gmail API send error] To: ${to} | ${errMsg}`);
      if (smtpConfigured && nodemailerTransporter) {
        console.log(`[Email] Falling back to SMTP...`);
        await sendViaSmtp(to, subject, html, attachments);
        console.log(`[Email sent via SMTP (fallback)] To: ${to} | Subject: ${subject}`);
        return;
      }
      throw err;
    }
  }

  // Choice 2: Force Standard Nodemailer SMTP Transport
  if (selectedTransport === "smtp") {
    try {
      await sendViaSmtp(to, subject, html, attachments);
      console.log(`[Email sent via SMTP] To: ${to} | Subject: ${subject}`);
      return;
    } catch (err) {
      console.error(`[SMTP send error] To: ${to} | Subject: ${subject} |`, err);
      throw err;
    }
  }

  // Choice 3: Auto Mode — Try Gmail REST API first (if available and operational), then fallback to SMTP
  if (gmailApiConfigured && tokenFetchFailedUntil <= Date.now()) {
    try {
      await sendViaGmailApi(to, subject, html, attachments);
      console.log(`[Email sent via Gmail API (auto)] To: ${to} | Subject: ${subject}`);
      return;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gmail API auto send error] To: ${to} | ${errMsg}`);
      if (!smtpConfigured) return;
      console.log(`[Email] Falling back to SMTP...`);
    }
  }

  if (smtpConfigured && nodemailerTransporter) {
    try {
      await sendViaSmtp(to, subject, html, attachments);
      console.log(`[Email sent via SMTP (auto)] To: ${to} | Subject: ${subject}`);
      return;
    } catch (err) {
      console.error(`[SMTP auto send error] To: ${to} | Subject: ${subject} |`, err);
      return;
    }
  }

  console.log(`[Email no-op (unconfigured)] To: ${to} | Subject: ${subject}`);
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
export async function sendWelcomeEmail(to: string, name: string, transport?: EmailTransportType) {
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

  await send(to, title, renderBaseEmailTemplate(title, body, `Welcome to ${env.BUSINESS_NAME}, ${name}!`), transport);
}

// 2. Order Confirmation Email
export async function sendOrderConfirmation(
  to: string,
  name: string,
  orderId: string,
  total: number,
  transport?: EmailTransportType,
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

  await send(to, title, renderBaseEmailTemplate(title, body, `Order #${shortOrderId} confirmed!`), transport);
}

// 3. Invoice Email — sent after payment is confirmed
export type InvoiceItem = {
  name: string;
  variant?: string;
  quantity: number;
  unitPrice: number; // in paise
  total: number;     // in paise
};

export type InvoiceData = {
  orderId: string;
  createdAt: Date | string;
  items: InvoiceItem[];
  subtotal: number;       // paise
  shippingFee: number;    // paise
  discountAmount: number; // paise
  total: number;          // paise
  paymentMethod: string;
  paymentStatus?: "PAID" | "COD" | "PENDING";
  address: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  couponCode?: string;
};

export async function sendInvoiceEmail(
  to: string,
  name: string,
  invoice: InvoiceData,
  transport?: EmailTransportType,
  pdfBuffer?: Buffer,
) {
  const shortOrderId = invoice.orderId.slice(-8).toUpperCase();
  const title = `Invoice for Order #${shortOrderId} — ${env.BUSINESS_NAME}`;
  const orderDate = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

  const computedStatus =
    invoice.paymentStatus ||
    (invoice.paymentMethod === "COD" ? "COD" : "PAID");

  const badgeConfig =
    computedStatus === "COD"
      ? { label: "COD (PAY ON DELIVERY)", bg: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" }
      : computedStatus === "PENDING"
        ? { label: "PAYMENT PENDING", bg: "#fefce8", border: "#fde047", color: "#a16207" }
        : { label: "PAID", bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" };

  const itemsHtml = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">
          <strong>${item.name}</strong>
          ${item.variant ? `<br /><span style="color: #64748b; font-size: 12px;">${item.variant}</span>` : ""}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 14px; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 14px; text-align: right;">
          ${fmt(item.unitPrice)}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">
          ${fmt(item.total)}
        </td>
      </tr>`,
    )
    .join("");

  const body = `
    <!-- Invoice Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;">
      <div>
        <h1 style="margin: 0 0 6px 0; color: #0f172a; font-size: 22px; font-weight: 800;">Invoice</h1>
        <p style="margin: 0; color: #64748b; font-size: 13px;">Thank you for your purchase, <strong>${name}</strong>!</p>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; background: ${badgeConfig.bg}; border: 1px solid ${badgeConfig.border}; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 700; color: ${badgeConfig.color}; letter-spacing: 0.5px;">${badgeConfig.label}</span>
      </div>
    </div>

    <!-- Order Meta -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Order Reference</p>
        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; font-family: monospace;">#${shortOrderId}</p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">${orderDate}</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Payment Method</p>
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">${invoice.paymentMethod.replace("_", " ")}</p>
        ${invoice.couponCode ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #15803d;">Coupon: <strong>${invoice.couponCode}</strong></p>` : ""}
      </div>
    </div>

    <!-- Shipping Address -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 28px;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Ship To</p>
      <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${invoice.address.fullName}</p>
      <p style="margin: 2px 0; font-size: 13px; color: #475569;">${invoice.address.line1}${invoice.address.line2 ? ", " + invoice.address.line2 : ""}</p>
      <p style="margin: 2px 0; font-size: 13px; color: #475569;">${invoice.address.city}, ${invoice.address.state} — ${invoice.address.pincode}</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">📞 ${invoice.address.phone}</p>
    </div>

    <!-- Items Table -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #0f172a;">
          <th style="padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Item</th>
          <th style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Qty</th>
          <th style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Unit Price</th>
          <th style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="margin-left: auto; max-width: 280px;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Subtotal</td>
          <td align="right" style="padding: 6px 0; color: #1e293b; font-size: 13px; font-weight: 600;">${fmt(invoice.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Shipping</td>
          <td align="right" style="padding: 6px 0; color: #1e293b; font-size: 13px; font-weight: 600;">${invoice.shippingFee === 0 ? '<span style="color: #15803d; font-weight: 700;">FREE</span>' : fmt(invoice.shippingFee)}</td>
        </tr>
        ${invoice.discountAmount > 0 ? `
        <tr>
          <td style="padding: 6px 0; color: #15803d; font-size: 13px;">Discount${invoice.couponCode ? ` (${invoice.couponCode})` : ""}</td>
          <td align="right" style="padding: 6px 0; color: #15803d; font-size: 13px; font-weight: 600;">−${fmt(invoice.discountAmount)}</td>
        </tr>` : ""}
        <tr>
          <td colspan="2" style="padding: 8px 0;"><hr style="border: 0; border-top: 2px solid #e2e8f0; margin: 0;" /></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #0f172a; font-size: 16px; font-weight: 800;">Total Paid</td>
          <td align="right" style="padding: 8px 0; color: #ea580c; font-size: 18px; font-weight: 800;">${fmt(invoice.total)}</td>
        </tr>
      </table>
    </div>

    <!-- PDF Download notice -->
    ${pdfBuffer ? `
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 14px 18px; margin: 28px 0 4px 0; display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">&#x1F4CE;</span>
      <div>
        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #15803d;">PDF Invoice Attached</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #166534;">Your invoice is attached to this email as <strong>invoice-${shortOrderId}.pdf</strong>. You can download and keep it for your records.</p>
      </div>
    </div>` : ""}

    <!-- CTA -->
    <div style="text-align: center; margin: 28px 0 8px 0;">
      <a href="${env.WEB_ORIGIN}/orders" style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
        Track Your Order
      </a>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
      This is an automatically generated invoice. Please keep it for your records.
    </p>
  `;

  const attachments: MailAttachment[] = pdfBuffer
    ? [{
      filename: `invoice-${shortOrderId}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    }]
    : [];

  await send(
    to,
    title,
    renderBaseEmailTemplate(title, body, `Your invoice for Order #${shortOrderId} — ${fmt(invoice.total)} paid`),
    transport,
    attachments.length > 0 ? attachments : undefined,
  );
}


// 4. Order Status Update Email
export async function sendOrderStatusUpdate(
  to: string,
  name: string,
  orderId: string,
  status: string,
  trackingId?: string,
  transport?: EmailTransportType,
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

  await send(to, title, renderBaseEmailTemplate(title, body, `Status update for Order #${shortOrderId}`), transport);
}

// 4. Magic Link Login Email
export async function sendPasswordlessLoginEmail(
  to: string,
  name: string,
  link: string,
  expiresInMinutes: number = 15,
  transport?: EmailTransportType,
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

  await send(to, title, renderBaseEmailTemplate(title, body, `Log in to ${env.BUSINESS_NAME}`), transport);
}

// 5. Verification OTP Email
export async function sendVerificationEmailOTP(
  to: string,
  name: string,
  otp: string,
  transport?: EmailTransportType,
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

  await send(to, title, renderBaseEmailTemplate(title, body, `Your verification code is ${otp}`), transport);
}
