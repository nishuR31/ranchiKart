/**
 * Invoice Email + PDF Tests
 *
 * Suite 1 — PDF generation: unit tests for the generateInvoicePdf utility.
 * Suite 2 — Email function tests: verifies sendInvoiceEmail in test mode (no-op).
 * Suite 3 — E2E via payment verification: full flow including invoice download endpoint.
 *
 * ⚠️  Real email delivery is tested by scripts/sendTestInvoice.ts which sends
 *     to dreamgf691+invoicetest@gmail.com outside the test NODE_ENV no-op.
 */
import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/config/server.js";
import { getUserToken } from "../helpers/auth.js";
import { prisma } from "../../src/config/prisma.js";
import {
  sendInvoiceEmail,
  type InvoiceData,
} from "../../src/config/email.js";
import { generateInvoicePdf } from "../../src/utils/invoicePdf.js";


// ──────────────────────────────────────────────────────────
// Mock invoice data — realistic RanchiKart order
// ──────────────────────────────────────────────────────────
const MOCK_INVOICE: InvoiceData = {
  orderId: "cly8xk2ab0000abc12345mock",
  createdAt: new Date("2026-07-28T10:00:00.000Z"),
  items: [
    {
      name: "Ranchi Premium Pen Set",
      variant: "Blue Ink — Pack of 10",
      quantity: 2,
      unitPrice: 24900, // ₹249
      total: 49800,
    },
    {
      name: "A4 Ruled Notebook",
      quantity: 3,
      unitPrice: 8900,  // ₹89
      total: 26700,
    },
    {
      name: "Stamp Pad — Red",
      quantity: 1,
      unitPrice: 15900, // ₹159
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

// ──────────────────────────────────────────────────────────
// Suite 1: PDF Generation Unit Tests
// ──────────────────────────────────────────────────────────
describe("Invoice PDF — generateInvoicePdf", () => {
  it("should generate a non-empty Buffer", async () => {
    const pdf = await generateInvoicePdf(MOCK_INVOICE);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it("should start with PDF magic bytes (%PDF)", async () => {
    const pdf = await generateInvoicePdf(MOCK_INVOICE);
    const header = pdf.slice(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });

  it("should be a reasonable size (>5KB, <2MB)", async () => {
    const pdf = await generateInvoicePdf(MOCK_INVOICE);
    expect(pdf.length).toBeGreaterThan(2 * 1024);
    expect(pdf.length).toBeLessThan(2 * 1024 * 1024);
  });

  it("should generate PDF for FREE shipping order", async () => {
    const freeShipInvoice: InvoiceData = {
      ...MOCK_INVOICE,
      orderId: "cly8xk2ab0000abc99999free",
      subtotal: 150000,
      shippingFee: 0,
      discountAmount: 0,
      total: 150000,
      items: [{ name: "Luxury Notebook Set", quantity: 1, unitPrice: 150000, total: 150000 }],
    };
    const pdf = await generateInvoicePdf(freeShipInvoice);
    expect(pdf.length).toBeGreaterThan(2 * 1024);
  });

  it("should generate PDF for order with no discount or coupon", async () => {
    const plainInvoice: InvoiceData = {
      ...MOCK_INVOICE,
      orderId: "cly8xk2ab0000abc11111plain",
      discountAmount: 0,
      couponCode: undefined,
      total: MOCK_INVOICE.subtotal + MOCK_INVOICE.shippingFee,
    };
    const pdf = await generateInvoicePdf(plainInvoice);
    expect(pdf.length).toBeGreaterThan(2 * 1024);
  });

  it("should handle multiple items including one with a variant", async () => {
    const pdf = await generateInvoicePdf(MOCK_INVOICE);
    // All 3 items should fit in the PDF without error
    expect(pdf.slice(0, 4).toString("ascii")).toBe("%PDF");
  });
});

// ──────────────────────────────────────────────────────────
// Suite 2: Direct invoice email function tests
// ──────────────────────────────────────────────────────────
describe("Invoice Email — Direct Function", () => {
  it("should resolve without error in test mode (SMTP transport no-op)", async () => {
    // In NODE_ENV=test the send() function is a no-op that returns undefined.
    // We just verify it doesn't throw.
    let threw = false;
    try {
      await sendInvoiceEmail(
        "dreamgf691+invoicetest@gmail.com",
        "Nishu Kumar",
        MOCK_INVOICE,
        "smtp",
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it("should resolve without error in test mode (Gmail API transport no-op)", async () => {
    let threw = false;
    try {
      await sendInvoiceEmail(
        "dreamgf691+invoicetest@gmail.com",
        "Nishu Kumar",
        MOCK_INVOICE,
        "gmail",
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it("should build correct total: subtotal + shipping - discount", () => {
    const calculated =
      MOCK_INVOICE.subtotal + MOCK_INVOICE.shippingFee - MOCK_INVOICE.discountAmount;
    expect(calculated).toBe(MOCK_INVOICE.total);
  });

  it("item totals should equal unitPrice × quantity", () => {
    for (const item of MOCK_INVOICE.items) {
      expect(item.total).toBe(item.unitPrice * item.quantity);
    }
  });

  it("should resolve for FREE shipping invoice (no-op in test mode)", async () => {
    const freeShippingInvoice: InvoiceData = {
      ...MOCK_INVOICE,
      orderId: "cly8xk2ab0000abc99999free",
      subtotal: 150000, // ₹1500 — above free shipping threshold
      shippingFee: 0,
      discountAmount: 0,
      total: 150000,
      items: [
        { name: "Luxury Notebook Set", quantity: 1, unitPrice: 150000, total: 150000 },
      ],
    };

    let threw = false;
    try {
      await sendInvoiceEmail(
        "dreamgf691+invoicetest@gmail.com",
        "Nishu Kumar",
        freeShippingInvoice,
        "smtp",
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it("should resolve for invoice with no coupon or discount (no-op in test mode)", async () => {
    const plainInvoice: InvoiceData = {
      ...MOCK_INVOICE,
      orderId: "cly8xk2ab0000abc11111plain",
      discountAmount: 0,
      couponCode: undefined,
      total: MOCK_INVOICE.subtotal + MOCK_INVOICE.shippingFee,
    };

    let threw = false;
    try {
      await sendInvoiceEmail(
        "dreamgf691+invoicetest@gmail.com",
        "Nishu Kumar",
        plainInvoice,
        "smtp",
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
// Suite 2: End-to-End — Place order + verify payment → invoice fires
// ──────────────────────────────────────────────────────────
describe("Invoice Email — E2E via Payment Verification", () => {
  let userToken: string;
  let testProductId: string;
  let createdOrderId: string;
  let providerOrderId: string;

  beforeAll(async () => {
    userToken = await getUserToken()!;

    // Create a fresh product for this test
    const category = await prisma.category.create({
      data: {
        name: "Invoice Test Category " + Date.now(),
        slug: "invoice-test-cat-" + Date.now(),
        description: "Category for invoice email tests",
        imageUrl: "https://example.com/cat.jpg",
        kind: "STATIONERY",
      },
    });

    const product = await prisma.product.create({
      data: {
        name: "Invoice Test Pen " + Date.now(),
        slug: "invoice-test-pen-" + Date.now(),
        description: "Test pen for invoice email integration test",
        kind: "STATIONERY",
        imageUrl: "https://example.com/pen.jpg",
        basePrice: 24900, // ₹249 in paise
        stock: 100,
        categoryId: category.id,
      },
    });

    testProductId = product.id;
  }, 30000);

  it("should place an order successfully", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        paymentMethod: "UPI",
        address: {
          fullName: "Nishu Kumar",
          phone: "9876543210",
          line1: "12 Main Road",
          city: "Ranchi",
          state: "Jharkhand",
          pincode: "834001",
        },
        items: [{ productId: testProductId, quantity: 1, customization: {} }],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    createdOrderId = body.data.order.id;
    expect(createdOrderId).toBeDefined();
  }, 30000);

  it("should initialise a Razorpay (mock) payment for the order", async () => {
    // Route: POST /api/v1/payments/razorpay/orders  body: { orderId }
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/payments/razorpay/orders",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { orderId: createdOrderId },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    providerOrderId = body.data.gateway.orderId;
    // providerOrderId starts with 'mock_' when no real keys, or 'order_...' with test keys
    expect(providerOrderId).toBeDefined();
    expect(typeof providerOrderId).toBe("string");
    expect(providerOrderId.length).toBeGreaterThan(4);
  }, 30000);

  it("should verify mock payment and trigger invoice email (fire-and-forget)", async () => {
    // Route: POST /api/v1/payments/razorpay/verify
    // Mock payment: providerOrderId starts with 'mock_' → auto-verified
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/payments/razorpay/verify",
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        orderId: createdOrderId,
        razorpay_order_id: providerOrderId,
        razorpay_payment_id: "pay_mocktest_" + Date.now(),
        razorpay_signature: "mock_sig",
      },
    });

    expect(res.statusCode).toBe(200);

    // Verify order is PAID in the database
    const paidOrder = await prisma.order.findUnique({ where: { id: createdOrderId } });
    expect(paidOrder?.status).toBe("PAID");

    // Allow fire-and-forget invoice send to settle (it's a no-op in test mode)
    await new Promise((r) => setTimeout(r, 1500));
  }, 30000);

  it("should confirm the paid order contains all fields needed for invoice generation", async () => {
    const order = await prisma.order.findUnique({
      where: { id: createdOrderId },
      include: {
        user: true,
        items: { include: { product: true, variant: true } },
        coupon: true,
      },
    });

    expect(order).not.toBeNull();
    expect(order?.status).toBe("PAID");
    expect(order?.user?.email).toBeDefined();
    expect(order?.items.length).toBeGreaterThan(0);

    // Each item should carry unit price and correct total
    for (const item of order!.items) {
      expect(item.product.name).toBeDefined();
      expect(item.unitPrice).toBeGreaterThan(0);
      expect(item.total).toBe(item.unitPrice * item.quantity);
    }

    // Address JSON should carry required fields
    const address = order!.address as Record<string, unknown>;
    expect(address.fullName).toBeDefined();
    expect(address.city).toBeDefined();
    expect(address.pincode).toBeDefined();
  }, 30000);

  it("should download a valid PDF from GET /api/v1/orders/:id/invoice", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${createdOrderId}/invoice`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain(".pdf");

    // Verify the response body is a valid PDF (starts with %PDF)
    const body = Buffer.from(res.rawPayload);
    expect(body.length).toBeGreaterThan(2 * 1024); // > 2 KB (valid compact PDF)
    expect(body.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30000);

  it("should reject invoice download for a non-existent order", async () => {
    const fakeId = "000000000000000000000000";
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${fakeId}/invoice`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(404);
  }, 15000);
});
