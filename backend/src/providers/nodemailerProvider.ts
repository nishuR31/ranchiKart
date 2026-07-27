import nodemailer from "nodemailer";
import env from "../config/env.js";

export const smtpConfigured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

export const nodemailerTransporter = smtpConfigured
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

export async function sendViaSmtp(to: string, subject: string, html: string): Promise<void> {
  if (!smtpConfigured || !nodemailerTransporter) {
    throw new Error("SMTP transporter is not configured. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS.");
  }
  await nodemailerTransporter.sendMail({
    from: env.SMTP_FROM || (env.SMTP_USER ? `${env.BUSINESS_NAME} <${env.SMTP_USER}>` : undefined),
    to,
    subject,
    html,
  });
}