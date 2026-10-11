const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

// The 14 standard PDF fonts carry no rupee glyph, so amounts are labelled INR
// in the headings and printed as plain numbers in the rows.
const INK = "#1a1f36";
const MUTED = "#6b7089";
const LINE = "#e2e6f0";
const BRAND = "#5b3df5";
const CREDIT = "#047857";
const DEBIT = "#b91c1c";

const PAGE_MARGIN = 44;
const ROW_HEIGHT = 25;
const HEADER_HEIGHT = 23;

const LOGO_PATH = path.join(__dirname, "..", "assets", "logo-mark.png");

const TABLE_PAD = 10;

// Relative widths. They are scaled to the page below, so the table can never
// run past the margin however these numbers are edited.
const COLUMNS = [
  { key: "date", label: "Date", width: 66 },
  { key: "description", label: "Description", width: 135 },
  { key: "reference", label: "Reference", width: 102 },
  { key: "type", label: "Type", width: 40 },
  { key: "amount", label: "Amount (INR)", width: 72, align: "right" },
  { key: "balance", label: "Balance (INR)", width: 72, align: "right" },
];

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateTime(value) {
  return `${shortDate(value)}, ${new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// Keeps a long note inside its column rather than pushing the row out of shape.
function clip(doc, text, width) {
  const value = String(text ?? "");

  if (doc.widthOfString(value) <= width) {
    return value;
  }

  let cut = value;

  while (cut.length > 1 && doc.widthOfString(`${cut}...`) > width) {
    cut = cut.slice(0, -1);
  }

  return `${cut}...`;
}

function contentWidth(doc) {
  return doc.page.width - PAGE_MARGIN * 2;
}

// Fits the columns to the page and hands back where each one actually starts.
function columnLayout(doc) {
  const usable = contentWidth(doc) - TABLE_PAD * 2;
  const total = COLUMNS.reduce((sum, column) => sum + column.width, 0);
  const scale = usable / total;

  let x = PAGE_MARGIN + TABLE_PAD;

  return COLUMNS.map((column) => {
    const width = column.width * scale;
    const cell = { ...column, x, width };

    x += width;

    return cell;
  });
}

function drawHeader(doc) {
  const top = PAGE_MARGIN - 8;

  // The mark reads on white; the wordmark files are drawn for dark backgrounds.
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, PAGE_MARGIN, top, { height: 40 });
  }

  const textX = PAGE_MARGIN + 54;

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(INK)
    .text("NEURON BANK", textX, top + 6, { characterSpacing: 1.6 });

  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(MUTED)
    .text("Better money habits, a brighter tomorrow", textX, top + 27, {
      characterSpacing: 0.4,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(BRAND)
    .text("ACCOUNT STATEMENT", PAGE_MARGIN, top + 6, {
      width: contentWidth(doc),
      align: "right",
      characterSpacing: 0.8,
    });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(`Generated ${dateTime(new Date())}`, PAGE_MARGIN, top + 27, {
      width: contentWidth(doc),
      align: "right",
    });

  const ruleY = top + 48;

  doc
    .moveTo(PAGE_MARGIN, ruleY)
    .lineTo(PAGE_MARGIN + contentWidth(doc), ruleY)
    .strokeColor(BRAND)
    .lineWidth(1.6)
    .stroke();

  doc.fillColor(INK);

  return ruleY + 18;
}

function drawPanel(doc, { title, rows, x, y, width }) {
  const height = 30 + rows.length * 17;

  doc.roundedRect(x, y, width, height, 6).fillAndStroke("#fafbff", LINE);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(BRAND)
    .text(title.toUpperCase(), x + 12, y + 11, {
      width: width - 24,
      characterSpacing: 0.7,
    });

  // The value column takes the larger share: an email or an id needs the room.
  const labelWidth = width * 0.34;
  const valueX = x + 12 + labelWidth;
  const valueWidth = width - labelWidth - 24;

  rows.forEach(([label, value], index) => {
    const rowY = y + 28 + index * 17;

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(label, x + 12, rowY, { width: labelWidth, lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(8).fillColor(INK);

    doc.text(clip(doc, value, valueWidth), valueX, rowY + 0.5, {
      width: valueWidth,
      lineBreak: false,
    });
  });

  return y + height;
}

function drawParties(doc, { user, account }, y) {
  const gap = 14;
  const width = (contentWidth(doc) - gap) / 2;

  const holderRows = [
    ["Name", user.name],
    ["Email", user.email],
    ["Phone", user.phoneNumber || "-"],
    ["Customer ID", String(user._id)],
    ["Customer since", shortDate(user.createdAt)],
  ];

  const accountRows = [
    ["Account number", account.accountNumber],
    ["Account type", "Savings Account"],
    ["Currency", account.currency],
    ["Status", account.status],
    ["Opened on", shortDate(account.createdAt)],
  ];

  const left = drawPanel(doc, {
    title: "Account holder",
    rows: holderRows,
    x: PAGE_MARGIN,
    y,
    width,
  });

  const right = drawPanel(doc, {
    title: "Account details",
    rows: accountRows,
    x: PAGE_MARGIN + width + gap,
    y,
    width,
  });

  return Math.max(left, right) + 16;
}

function drawPeriodAndSummary(doc, { summary, range }, y) {
  const width = contentWidth(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(INK)
    .text(`Statement period: ${range.label}`, PAGE_MARGIN, y);

  const boxY = y + 16;
  const boxHeight = 56;

  doc.roundedRect(PAGE_MARGIN, boxY, width, boxHeight, 6).fillAndStroke("#f4f2ff", "#ddd6fe");

  const tiles = [
    { label: "Opening balance", value: money(summary.openingBalance), tone: INK },
    { label: "Money in", value: money(summary.totalCredits), tone: CREDIT },
    { label: "Money out", value: money(summary.totalDebits), tone: DEBIT },
    { label: "Closing balance", value: money(summary.closingBalance), tone: INK },
  ];

  const tileWidth = width / tiles.length;

  tiles.forEach((tile, index) => {
    const x = PAGE_MARGIN + tileWidth * index + 14;

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(tile.label.toUpperCase(), x, boxY + 12, {
        width: tileWidth - 28,
        characterSpacing: 0.5,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(12.5)
      .fillColor(tile.tone)
      .text(tile.value, x, boxY + 27, { width: tileWidth - 28 });
  });

  doc.fillColor(INK);

  return boxY + boxHeight + 18;
}

function drawTableHeader(doc, y) {
  doc.rect(PAGE_MARGIN, y, contentWidth(doc), HEADER_HEIGHT).fill("#eceaff");

  columnLayout(doc).forEach((cell) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor("#4c3ad6")
      .text(cell.label.toUpperCase(), cell.x, y + 8, {
        width: cell.width,
        align: cell.align || "left",
        characterSpacing: 0.4,
        lineBreak: false,
      });
  });

  doc.fillColor(INK);

  return y + HEADER_HEIGHT;
}

function drawRow(doc, transaction, y, striped) {
  if (striped) {
    doc.rect(PAGE_MARGIN, y, contentWidth(doc), ROW_HEIGHT).fill("#fbfbfe");
  }

  doc
    .moveTo(PAGE_MARGIN, y + ROW_HEIGHT)
    .lineTo(PAGE_MARGIN + contentWidth(doc), y + ROW_HEIGHT)
    .strokeColor(LINE)
    .lineWidth(0.5)
    .stroke();

  const isCredit = transaction.type === "credit";

  const cells = {
    date: shortDate(transaction.dateTime),
    description: transaction.description || "-",
    reference: transaction.reference,
    type: isCredit ? "Credit" : "Debit",
    amount: `${isCredit ? "+" : "-"}${money(transaction.amount)}`,
    balance: money(transaction.balanceAfter),
  };

  columnLayout(doc).forEach((cell) => {
    const isAmount = cell.key === "amount";

    doc
      .font(isAmount ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8.5)
      .fillColor(isAmount ? (isCredit ? CREDIT : DEBIT) : INK);

    doc.text(clip(doc, cells[cell.key], cell.width - 6), cell.x, y + 8, {
      width: cell.width,
      align: cell.align || "left",
      lineBreak: false,
    });
  });

  doc.fillColor(INK);

  return y + ROW_HEIGHT;
}

function drawFooters(doc) {
  const range = doc.bufferedPageRange();

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);

    // Text below the bottom margin makes pdfkit start a fresh page, which is
    // exactly where a footer belongs, so the margin is lifted for these lines.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - 32;

    doc
      .moveTo(PAGE_MARGIN, y - 8)
      .lineTo(PAGE_MARGIN + contentWidth(doc), y - 8)
      .strokeColor(LINE)
      .lineWidth(0.5)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(MUTED)
      .text(
        "This is a computer generated statement and does not require a signature.",
        PAGE_MARGIN,
        y,
        { width: contentWidth(doc), lineBreak: false },
      )
      .text(`Page ${index + 1} of ${range.count}`, PAGE_MARGIN, y, {
        width: contentWidth(doc),
        align: "right",
        lineBreak: false,
      });

    doc.page.margins.bottom = bottomMargin;
  }
}

function buildStatementPdf({ user, account, transactions, summary, range }) {
  return new Promise((resolve, reject) => {
    // Buffered pages let the footer print "page x of y" once the total is known.
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: `Neuron Bank statement ${range.label}`,
        Author: "Neuron Bank",
      },
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = drawHeader(doc);
    y = drawParties(doc, { user, account }, y);
    y = drawPeriodAndSummary(doc, { summary, range }, y);

    if (transactions.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(MUTED)
        .text("No transactions for this period.", PAGE_MARGIN, y + 12, {
          width: contentWidth(doc),
          align: "center",
        });

      drawFooters(doc);
      doc.end();
      return;
    }

    y = drawTableHeader(doc, y);

    const bottom = doc.page.height - 54;

    transactions.forEach((transaction, index) => {
      if (y + ROW_HEIGHT > bottom) {
        doc.addPage();
        y = drawTableHeader(doc, PAGE_MARGIN);
      }

      y = drawRow(doc, transaction, y, index % 2 === 1);
    });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} shown.`,
        PAGE_MARGIN,
        y + 10,
      );

    drawFooters(doc);
    doc.end();
  });
}

module.exports = buildStatementPdf;
