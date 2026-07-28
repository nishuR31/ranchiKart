/**
 * scripts/sendTestInvoice.ts
 *
 * Sends a real invoice email WITH a PDF attachment for visual testing.
 * Also saves the PDF locally as invoice-test.pdf for inspection.
 *
 * Usage:
 *   bun run scripts/sendTestInvoice.ts
 *   EMAIL_TO=you@example.com bun run scripts/sendTestInvoice.ts
 */

import "../src/config/env.js";
import { writeFileSync } from "node:fs";
import { sendInvoiceEmail, type InvoiceData } from "../src/config/email.js";
import { generateInvoicePdf } from "../src/utils/invoicePdf.js";

const TO   = process.env.EMAIL_TO   ?? "dreamgf691+invoicetest@gmail.com";
const NAME = process.env.EMAIL_NAME ?? "Nishu Kumar";

const mockInvoice: InvoiceData = {
  orderId: "cly8xk2ab0000abc12345mock",
  createdAt: new Date(),
  items: [
    {
      name: "Ranchi Premium Pen Set",
      variant: "Blue Ink — Pack of 10",
      quantity: 2,
      unitPrice: 24900,
      total: 49800,
    },
    {
      name: "A4 Ruled Notebook",
      quantity: 3,
      unitPrice: 8900,
      total: 26700,
    },
    {
      name: "Stamp Pad — Red",
      quantity: 1,
      unitPrice: 15900,
      total: 15900,
    },
  ],
  subtotal: 92400,
  shippingFee: 6900,
  discountAmount: 5000,
  total: 94300,
  paymentMethod: "UPI",
  address: {
    fullName: "Nishu Kumar",
    phone: "9876543210",
    line1: "12 Main Road, Lalpur",
    line2: "Near Gandhi Chowk",
    city: "Ranchi",
    state: "Jharkhand",
    pincode: "834001",
  },
  couponCode: "RANCHI50",
};

console.log("\n📋 Generating PDF invoice...");
const pdfBuffer = await generateInvoicePdf(mockInvoice);

// Save PDF locally for visual inspection
const pdfPath = "./invoice-test.pdf";
writeFileSync(pdfPath, pdfBuffer);
console.log(`✅ PDF saved locally: ${pdfPath}  (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

console.log(`\n📧 Sending invoice email with PDF attachment to: ${TO}`);
console.log(`   Order: #${mockInvoice.orderId.slice(-8).toUpperCase()}`);
console.log(`   Total: ₹${(mockInvoice.total / 100).toFixed(2)}\n`);

try {
  await sendInvoiceEmail(TO, NAME, mockInvoice, undefined, pdfBuffer);
  console.log(`✅ Invoice email sent successfully to ${TO}`);
  console.log("   Check your inbox for the RanchiKart invoice with attached PDF.\n");
} catch (err) {
  console.error("❌ Failed to send invoice email:", err);
  process.exit(1);
}
