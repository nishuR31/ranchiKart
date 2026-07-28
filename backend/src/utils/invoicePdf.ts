import PDFDocument from "pdfkit";
import type { InvoiceData } from "../config/email.js";

// ── Brand Colors ─────────────────────────────────────────────────────────────
const BRAND_DARK   = "#0f172a"; // navy
const BRAND_ORANGE = "#ea580c"; // orange
const BRAND_GRAY   = "#64748b"; // slate
const BRAND_LIGHT  = "#f8fafc"; // near-white
const BRAND_BORDER = "#e2e8f0"; // light border

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (paise: number) => `Rs. ${(paise / 100).toFixed(2)}`;

function drawHRule(doc: PDFKit.PDFDocument, y: number, color = BRAND_BORDER) {
  doc
    .save()
    .moveTo(40, y)
    .lineTo(555, y)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke()
    .restore();
}


/**
 * Generates a professional A4 PDF invoice and returns it as a Buffer.
 */
export async function generateInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: `Invoice #${invoice.orderId.slice(-8).toUpperCase()}`,
        Author: "RanchiKart",
        Subject: "Purchase Invoice",
        Keywords: "invoice, receipt, ranchikart",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = 515; // usable width (595 - 2×40)
    const shortId = invoice.orderId.slice(-8).toUpperCase();
    const orderDate = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // ── HEADER BANNER ─────────────────────────────────────────────────────────
    doc
      .rect(0, 0, 595, 90)
      .fill(BRAND_LIGHT);

    // Orange accent bar at very top
    doc.rect(0, 0, 595, 5).fill(BRAND_ORANGE);

    // Brand name
    doc
      .fillColor(BRAND_DARK)
      .font("Helvetica-Bold")
      .fontSize(26)
      .text("Ranchi", 40, 25, { continued: true })
      .fillColor(BRAND_ORANGE)
      .text("Kart");

    doc
      .fillColor(BRAND_GRAY)
      .font("Helvetica")
      .fontSize(8)
      .text("RANCHI'S OWN ONLINE STORE", 40, 56);

    // Invoice label on right
    doc
      .fillColor(BRAND_DARK)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("INVOICE", 0, 30, { align: "right", width: 555 });

    doc
      .fillColor(BRAND_GRAY)
      .font("Helvetica")
      .fontSize(9)
      .text(`#${shortId}`, 0, 55, { align: "right", width: 555 });

    // ── META ROW ──────────────────────────────────────────────────────────────
    let y = 110;

    // Left column: Order info
    doc.fillColor(BRAND_GRAY).font("Helvetica").fontSize(8).text("ORDER DATE", 40, y);
    doc.fillColor(BRAND_DARK).font("Helvetica-Bold").fontSize(10).text(orderDate, 40, y + 12);

    doc.fillColor(BRAND_GRAY).font("Helvetica").fontSize(8).text("PAYMENT METHOD", 200, y);
    doc.fillColor(BRAND_DARK).font("Helvetica-Bold").fontSize(10).text(
      invoice.paymentMethod.replace("_", " "),
      200,
      y + 12,
    );

    if (invoice.couponCode) {
      doc.fillColor(BRAND_GRAY).font("Helvetica").fontSize(8).text("COUPON APPLIED", 360, y);
      doc
        .fillColor("#15803d")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(invoice.couponCode, 360, y + 12);
    }

    y += 44;
    drawHRule(doc, y);
    y += 16;

    // ── PAID STAMP ────────────────────────────────────────────────────────────
    doc
      .save()
      .roundedRect(440, y - 6, 76, 22, 4)
      .lineWidth(1)
      .stroke(BRAND_ORANGE)
      .restore();
    doc
      .fillColor(BRAND_ORANGE)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("✓ PAID", 441, y - 1, { width: 74, align: "center" });

    // ── SHIP TO ───────────────────────────────────────────────────────────────
    doc.fillColor(BRAND_GRAY).font("Helvetica").fontSize(8).text("SHIP TO", 40, y);
    y += 14;

    const addr = invoice.address;
    const addrLines = [
      addr.fullName,
      addr.line1 + (addr.line2 ? `, ${addr.line2}` : ""),
      `${addr.city}, ${addr.state} – ${addr.pincode}`,
      `Phone: ${addr.phone}`,
    ];
    for (const line of addrLines) {
      doc
        .fillColor(BRAND_DARK)
        .font(line === addr.fullName ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .text(line, 40, y);
      y += 14;
    }

    y += 8;
    drawHRule(doc, y);
    y += 16;

    // ── ITEMS TABLE ───────────────────────────────────────────────────────────
    // Column positions & widths
    const COL = {
      item:  { x: 40,  w: 240 },
      qty:   { x: 290, w: 60  },
      unit:  { x: 360, w: 90  },
      total: { x: 460, w: 95  },
    };

    // Table header row
    doc.rect(40, y, pageWidth, 20).fill(BRAND_LIGHT);
    const headerY = y + 6;
    doc.fillColor(BRAND_GRAY).font("Helvetica-Bold").fontSize(8);
    doc.text("ITEM",       COL.item.x,  headerY);
    doc.text("QTY",        COL.qty.x,   headerY, { width: COL.qty.w,   align: "center" });
    doc.text("UNIT PRICE", COL.unit.x,  headerY, { width: COL.unit.w,  align: "right"  });
    doc.text("AMOUNT",     COL.total.x, headerY, { width: COL.total.w, align: "right"  });

    y += 22;

    // Item rows
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      const rowBg = i % 2 === 0 ? "#ffffff" : "#fafafa";

      // Estimate row height
      const rowH = item.variant ? 34 : 22;
      doc.rect(40, y, pageWidth, rowH).fill(rowBg);

      doc
        .fillColor(BRAND_DARK)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(item.name, COL.item.x + 4, y + 7, { width: COL.item.w - 8 });

      if (item.variant) {
        doc
          .fillColor(BRAND_GRAY)
          .font("Helvetica")
          .fontSize(7.5)
          .text(item.variant, COL.item.x + 4, y + 19, { width: COL.item.w - 8 });
      }

      doc
        .fillColor(BRAND_GRAY)
        .font("Helvetica")
        .fontSize(9)
        .text(String(item.quantity), COL.qty.x, y + (rowH - 10) / 2, {
          width: COL.qty.w,
          align: "center",
        });

      doc
        .fillColor(BRAND_GRAY)
        .font("Helvetica")
        .fontSize(9)
        .text(fmt(item.unitPrice), COL.unit.x, y + (rowH - 10) / 2, {
          width: COL.unit.w,
          align: "right",
        });

      doc
        .fillColor(BRAND_DARK)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(fmt(item.total), COL.total.x, y + (rowH - 10) / 2, {
          width: COL.total.w,
          align: "right",
        });

      y += rowH;
      drawHRule(doc, y, "#f1f5f9");
    }

    y += 16;

    // ── TOTALS ────────────────────────────────────────────────────────────────
    const totalsX = 350;
    const totalsLabelW = 120;
    const totalsValueX = totalsX + totalsLabelW;
    const totalsValueW = 95;

    function totalsRow(
      label: string,
      value: string,
      bold = false,
      color = BRAND_DARK,
      labelColor = BRAND_GRAY,
    ) {
      doc.fillColor(labelColor).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9)
        .text(label, totalsX, y, { width: totalsLabelW });
      doc.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9)
        .text(value, totalsValueX, y, { width: totalsValueW, align: "right" });
      y += 16;
    }

    totalsRow("Subtotal", fmt(invoice.subtotal));
    totalsRow(
      "Shipping",
      invoice.shippingFee === 0 ? "FREE" : fmt(invoice.shippingFee),
      false,
      invoice.shippingFee === 0 ? "#15803d" : BRAND_DARK,
    );

    if (invoice.discountAmount > 0) {
      totalsRow(
        `Discount${invoice.couponCode ? ` (${invoice.couponCode})` : ""}`,
        `- ${fmt(invoice.discountAmount)}`,
        false,
        "#15803d",
        "#15803d",
      );
    }

    drawHRule(doc, y, BRAND_BORDER);
    y += 8;

    // Grand total row
    doc
      .save()
      .rect(350, y - 2, 205, 26)
      .lineWidth(1)
      .stroke(BRAND_ORANGE)
      .restore();

    doc
      .fillColor(BRAND_DARK)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("TOTAL PAID", 355, y + 6, { width: totalsLabelW + 5 });
    doc
      .fillColor(BRAND_ORANGE)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(fmt(invoice.total), totalsValueX - 5, y + 5, {
        width: totalsValueW + 5,
        align: "right",
      });

    y += 40;

    // ── THANK YOU NOTE ────────────────────────────────────────────────────────
    drawHRule(doc, y);
    y += 16;

    doc
      .fillColor(BRAND_GRAY)
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Thank you for shopping with RanchiKart! This is a computer-generated invoice and does not require a signature.",
        40,
        y,
        { width: pageWidth, align: "center" },
      );

    y += 22;

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY - 5, 595, 55).fill(BRAND_LIGHT);
    doc.rect(0, footerY - 5, 595, 4).fill(BRAND_ORANGE);

    doc
      .fillColor(BRAND_GRAY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "RanchiKart  •  Ranchi, Jharkhand, India  •  ranchikart.vercel.app",
        40,
        footerY + 8,
        { width: pageWidth, align: "center" },
      );

    doc.end();
  });
}
