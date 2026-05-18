const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and decode basic HTML entities for plain-text rendering.
 */
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    invoice: "INVOICE",
    issuedDate: "Issued",
    dueDate: "Due date",
    noDue: "No due date",
    billTo: "Bill to",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    total: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    totalDue: "Total due",
    notes: "Notes",
    page: "Page",
    of: "of",
  },
  es: {
    invoice: "FACTURA",
    issuedDate: "Emitida",
    dueDate: "Vencimiento",
    noDue: "Sin vencimiento",
    billTo: "Facturar a",
    description: "Descripción",
    qty: "Cant.",
    unitPrice: "Precio unitario",
    total: "Total",
    subtotal: "Subtotal",
    discount: "Descuento",
    tax: "Impuesto",
    totalDue: "Total a pagar",
    notes: "Notas",
    page: "Página",
    of: "de",
  },
  it: {
    invoice: "FATTURA",
    issuedDate: "Emessa il",
    dueDate: "Scadenza",
    noDue: "Nessuna scadenza",
    billTo: "Intestata a",
    description: "Descrizione",
    qty: "Qtà",
    unitPrice: "Prezzo unitario",
    total: "Totale",
    subtotal: "Subtotale",
    discount: "Sconto",
    tax: "Tassa",
    totalDue: "Totale da pagare",
    notes: "Note",
    page: "Pagina",
    of: "di",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function formatDate(date, lang) {
  if (!date) return "—";
  const localeMap = { en: "en-US", es: "es-ES", it: "it-IT" };
  return new Date(date).toLocaleDateString(localeMap[lang] || "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_PRIMARY = "#00C9AA";
const COLOR_DARK = "#1A1A1A";
const COLOR_GRAY = "#6B6B6B";
const COLOR_LIGHT_BG = "#F7F6F2";
const COLOR_BORDER = "#E5E3DF";
const COLOR_WHITE = "#FFFFFF";

// ─── Layout constants ─────────────────────────────────────────────────────────

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ─── Main generator ───────────────────────────────────────────────────────────

// ─── Shared document factory ──────────────────────────────────────────────────

function _createDoc(invoice, lang) {
  const t = copy[lang] || copy.en;
  return new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `${t.invoice} ${invoice.invoiceNumber}`,
      Author: "Brillo",
    },
  });
}

// ─── Shared drawing logic ─────────────────────────────────────────────────────

function _drawInvoice(doc, invoice, customerName, lang) {
  const t = copy[lang] || copy.en;
  const cur = invoice.currency || "USD";
  doc.rect(0, 0, PAGE_WIDTH, 90).fill(COLOR_PRIMARY);

  // Logo / brand
  doc
    .fillColor(COLOR_WHITE)
    .fontSize(26)
    .font("Helvetica-Bold")
    .text("Brillo", MARGIN, 28);

  // Invoice label + number (right-aligned)
  doc
    .fillColor(COLOR_WHITE)
    .fontSize(10)
    .font("Helvetica")
    .text(t.invoice, PAGE_WIDTH - MARGIN - 180, 24, { width: 180, align: "right" });

  doc
    .fillColor(COLOR_WHITE)
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(invoice.invoiceNumber, PAGE_WIDTH - MARGIN - 180, 38, {
      width: 180,
      align: "right",
    });

  let y = 110;

  // ── Meta: dates ─────────────────────────────────────────────────────────────
  doc
    .fillColor(COLOR_GRAY)
    .fontSize(9)
    .font("Helvetica")
    .text(`${t.issuedDate}: `, MARGIN, y, { continued: true })
    .fillColor(COLOR_DARK)
    .font("Helvetica-Bold")
    .text(formatDate(invoice.issuedDate, lang));

  doc
    .fillColor(COLOR_GRAY)
    .font("Helvetica")
    .text(`${t.dueDate}: `, MARGIN, y + 16, { continued: true })
    .fillColor(COLOR_DARK)
    .font("Helvetica-Bold")
    .text(invoice.dueDate ? formatDate(invoice.dueDate, lang) : t.noDue);

  // Status badge (right side)
  const statusText = (invoice.status || "draft").toUpperCase();
  const badgeW = 80;
  const badgeX = PAGE_WIDTH - MARGIN - badgeW;
  doc.roundedRect(badgeX, y - 2, badgeW, 22, 4).fill(COLOR_LIGHT_BG);
  doc
    .fillColor(COLOR_PRIMARY)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(statusText, badgeX, y + 5, { width: badgeW, align: "center" });

  y += 50;

  // ── Bill to ─────────────────────────────────────────────────────────────────
  doc
    .fillColor(COLOR_GRAY)
    .fontSize(9)
    .font("Helvetica")
    .text(t.billTo.toUpperCase(), MARGIN, y);

  y += 14;

  doc
    .fillColor(COLOR_DARK)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(customerName || invoice.customerSnapshot?.name || "—", MARGIN, y);

  y += 16;

  const snapEmail = invoice.customerSnapshot?.email;
  const rawAddress = invoice.customerSnapshot?.address;
  const snapAddress = rawAddress
    ? [
        rawAddress.street,
        rawAddress.city,
        rawAddress.state,
        rawAddress.zipCode,
        rawAddress.country,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  if (snapEmail) {
    doc
      .fillColor(COLOR_GRAY)
      .fontSize(10)
      .font("Helvetica")
      .text(snapEmail, MARGIN, y);
    y += 14;
  }
  if (snapAddress) {
    doc.fillColor(COLOR_GRAY).fontSize(10).font("Helvetica").text(snapAddress, MARGIN, y);
    y += 14;
  }

  y += 24;

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.rect(MARGIN, y, CONTENT_WIDTH, 1).fill(COLOR_BORDER);
  y += 12;

  // ── Items table header ──────────────────────────────────────────────────────
  const COL = {
    desc: { x: MARGIN, w: CONTENT_WIDTH * 0.45 },
    qty: { x: MARGIN + CONTENT_WIDTH * 0.45, w: CONTENT_WIDTH * 0.1 },
    unit: { x: MARGIN + CONTENT_WIDTH * 0.55, w: CONTENT_WIDTH * 0.22 },
    total: { x: MARGIN + CONTENT_WIDTH * 0.77, w: CONTENT_WIDTH * 0.23 },
  };

  doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(COLOR_LIGHT_BG);

  doc.fillColor(COLOR_GRAY).fontSize(8).font("Helvetica-Bold");
  doc.text(t.description.toUpperCase(), COL.desc.x + 4, y + 6, { width: COL.desc.w });
  doc.text(t.qty.toUpperCase(), COL.qty.x, y + 6, { width: COL.qty.w, align: "center" });
  doc.text(t.unitPrice.toUpperCase(), COL.unit.x, y + 6, { width: COL.unit.w, align: "right" });
  doc.text(t.total.toUpperCase(), COL.total.x, y + 6, { width: COL.total.w - 4, align: "right" });

  y += 22;

  // ── Items rows ───────────────────────────────────────────────────────────────
  const items = invoice.items || [];
  items.forEach((item, i) => {
    const isNoPrice = item.priceUnit === "no_price";
    const rowH = 22;

    if (i % 2 === 1) {
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowH).fill("#FAFAF9");
    }

    doc.fillColor(COLOR_DARK).fontSize(9).font("Helvetica");
    doc.text(item.description || "", COL.desc.x + 4, y + 7, {
      width: COL.desc.w - 8,
      lineBreak: false,
      ellipsis: true,
    });
    doc.text(isNoPrice ? "—" : String(item.quantity ?? ""), COL.qty.x, y + 7, {
      width: COL.qty.w,
      align: "center",
    });
    doc.text(
      isNoPrice ? "—" : formatCurrency(item.unitPrice, cur),
      COL.unit.x,
      y + 7,
      { width: COL.unit.w, align: "right" },
    );
    doc
      .font("Helvetica-Bold")
      .text(
        isNoPrice ? "—" : formatCurrency(item.total, cur),
        COL.total.x,
        y + 7,
        { width: COL.total.w - 4, align: "right" },
      );

    doc.rect(MARGIN, y + rowH, CONTENT_WIDTH, 0.5).fill(COLOR_BORDER);
    y += rowH;
  });

  y += 16;

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalsX = MARGIN + CONTENT_WIDTH * 0.55;
  const totalsW = CONTENT_WIDTH * 0.45;

  function totalRow(label, value, bold = false, color = COLOR_DARK) {
    doc
      .fillColor(COLOR_GRAY)
      .fontSize(9)
      .font("Helvetica")
      .text(label, totalsX, y, { width: totalsW * 0.6 });
    doc
      .fillColor(color)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .text(value, totalsX, y, { width: totalsW, align: "right" });
    y += 16;
  }

  totalRow(t.subtotal, formatCurrency(invoice.subtotal, cur));

  if (invoice.discount && invoice.discount.amount > 0) {
    totalRow(
      t.discount,
      `-${formatCurrency(invoice.discount.amount, cur)}`,
      false,
      "#E8602C",
    );
  }

  if (invoice.taxRate > 0) {
    totalRow(`${t.tax} (${invoice.taxRate}%)`, formatCurrency(invoice.tax, cur));
  }

  // Total divider
  doc.rect(totalsX, y, totalsW, 1).fill(COLOR_DARK);
  y += 8;

  totalRow(t.totalDue, formatCurrency(invoice.total, cur), true, COLOR_PRIMARY);

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    y += 16;
    doc.rect(MARGIN, y, CONTENT_WIDTH, 0.5).fill(COLOR_BORDER);
    y += 12;

    doc
      .fillColor(COLOR_GRAY)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(t.notes.toUpperCase(), MARGIN, y);
    y += 14;

    doc
      .fillColor(COLOR_DARK)
      .fontSize(10)
      .font("Helvetica")
      .text(stripHtml(invoice.notes), MARGIN, y, { width: CONTENT_WIDTH });
  }

  // ── Footer with page numbers ─────────────────────────────────────────────────
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(COLOR_GRAY)
      .fontSize(8)
      .font("Helvetica")
      .text(
        `${t.page} ${i - pages.start + 1} ${t.of} ${pages.count}`,
        MARGIN,
        doc.page.height - 40,
        { width: CONTENT_WIDTH, align: "center" },
      );

    // Bottom brand line
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Brillo", MARGIN, doc.page.height - 25, {
        width: CONTENT_WIDTH,
        align: "center",
      });
  }
}

// ─── Public: stream to HTTP response ─────────────────────────────────────────

/**
 * Generate an invoice PDF and pipe it directly to a writable stream (e.g. res).
 */
function generateInvoicePdf(invoice, customerName, lang = "en", outputStream) {
  const doc = _createDoc(invoice, lang);
  doc.pipe(outputStream);
  _drawInvoice(doc, invoice, customerName, lang);
  doc.end();
}

// ─── Public: generate as Buffer (for email attachments) ──────────────────────

/**
 * Generate an invoice PDF and return it as a Buffer.
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdfBuffer(invoice, customerName, lang = "en") {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pass = new PassThrough();
    pass.on("data", (chunk) => chunks.push(chunk));
    pass.on("end", () => resolve(Buffer.concat(chunks)));
    pass.on("error", reject);

    const doc = _createDoc(invoice, lang);
    doc.pipe(pass);
    _drawInvoice(doc, invoice, customerName, lang);
    doc.end();
  });
}

module.exports = { generateInvoicePdf, generateInvoicePdfBuffer };
