import { createPdfStream } from '../pdfGenerator.js';
import { drawImageFromSource } from '../imageSource.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthName = (num) => MONTH_NAMES[Number(num)] ?? String(num);

const formatDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(val); }
};

const formatDateTime = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(val); }
};

const formatCurrency = (val) =>
  Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatNights = (val) => {
  const n = Number(val || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

const drawLogo = (doc, logoUrl, x, y, size) => {
  if (!logoUrl || typeof logoUrl !== 'string') return false;
  try {
    const matches = logoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return false;
    const imageData = Buffer.from(matches[2], 'base64');
    doc.image(imageData, x, y, { width: size, height: size, fit: [size, size] });
    return true;
  } catch { return false; }
};

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Generates PDF for "Monthly Revenue by Guest House" report.
 * Layout: A4 Landscape (841 × 595 pt)
 *
 * @param {Object} data    - { guestHouse, month, year, rows, totalRevenue, totalNights, totalBookings }
 * @param {Object} filters - { month, year, guestHouseId }
 * @param {Object} meta    - { createdBy, logoUrl }
 * @returns {Promise<Buffer>}
 */
export const generateMonthlyRevenueByGuestHousePdf = async (data, filters, meta) => {
  const { doc, getBuffer } = createPdfStream({ layout: 'landscape' });

  const { guestHouse, month, year, rows = [], totalRevenue, totalNights, totalBookings } = data;
  const performerName = meta?.createdBy || 'Admin';
  const logoUrl       = meta?.logoUrl   || null;
  const eSignatureUrl = meta?.eSignatureUrl || null;
  const generatedOn   = formatDateTime(new Date());

  // ── Layout constants (A4 landscape = 841 × 595 pt) ──────────────────────
  const LEFT        = 25;
  const RIGHT       = 816;           // 841 − 25
  const TABLE_WIDTH = RIGHT - LEFT;  // 791

  const FOOTER_H    = 28;            // footer zone height (line + text)
  const KPI_H       = 48;            // summary box height
  const TOT_H       = 22;            // totals row height
  const RESERVED    = FOOTER_H + KPI_H + TOT_H + 40; // space to keep free at bottom = 138
  const PAGE_BOTTOM = 595 - RESERVED;                 // ≈ 457 — row drawing stops here

  // ── Column definitions — widths sum exactly to TABLE_WIDTH (791) ─────────
  const cols = [
    { label: 'Booking No',  w: 58,  align: 'left'   },
    { label: 'Guest Name',  w: 118, align: 'left'   },
    { label: 'Phone',       w: 98,  align: 'left'   },
    { label: 'Room / Bed',  w: 70,  align: 'left'   },
    { label: 'Room Type',   w: 65,  align: 'left'   },
    { label: 'Check In',    w: 77,  align: 'center' },
    { label: 'Check Out',   w: 77,  align: 'center' },
    { label: 'Nights',      w: 36,  align: 'center' },
    { label: 'Rate/Night',  w: 96,  align: 'right'  },
    { label: 'Revenue',     w: 96,  align: 'right'  },
  ]; // 58+118+98+70+65+77+77+36+96+96 = 791 ✓

  // Pre-compute x positions from widths
  let _x = LEFT;
  cols.forEach((c) => { c.x = _x; _x += c.w; });

  const ROW_H    = 24;
  const HEADER_H = 22;

  const drawTableHeader = (currentY) => {
    doc.rect(LEFT, currentY, TABLE_WIDTH, HEADER_H).fill('#f1f5f9');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b');
    cols.forEach((c) => {
      doc.text(c.label, c.x + 3, currentY + 6, { width: c.w - 6, align: c.align });
    });
    doc.rect(LEFT, currentY, TABLE_WIDTH, HEADER_H).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    return currentY + HEADER_H;
  };

  let y = 30;

  // ── 1. Header — logo + titles ─────────────────────────────────────────────
  const LOGO_SIZE = 36;
  drawLogo(doc, logoUrl, LEFT, y, LOGO_SIZE);

  doc.fontSize(17).font('Helvetica-Bold').fillColor('#0f172a')
    .text(guestHouse?.guestHouseName || 'Guest House', LEFT, y, { align: 'center', width: TABLE_WIDTH });
  y = doc.y + 3;

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#334155')
    .text('Monthly Revenue Report', LEFT, y, { align: 'center', width: TABLE_WIDTH });
  y = doc.y + 10;

  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
  y += 12;

  // ── 2. Filters row (compact single line) ─────────────────────────────────
  const isRange = data.mode === 'range' && data.fromDate && data.toDate;
  const periodLabel = isRange
    ? `${formatDate(data.fromDate)} – ${formatDate(data.toDate)}`
    : `${monthName(month)} ${year}`;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569')
    .text('Period:', LEFT, y, { continued: true })
    .font('Helvetica').fillColor('#0f172a')
    .text(`  ${periodLabel}`, { continued: true })
    .font('Helvetica-Bold').fillColor('#475569')
    .text('     Guest House:', { continued: true })
    .font('Helvetica').fillColor('#0f172a')
    .text(`  ${guestHouse.guestHouseName} (${guestHouse.guestHouseId})`);
  y = doc.y + 10;

  doc.moveTo(LEFT, y - 4).lineTo(RIGHT, y - 4).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

  // ── 3. Table rows ─────────────────────────────────────────────────────────
  y = drawTableHeader(y);

  if (rows.length === 0) {
    doc.rect(LEFT, y, TABLE_WIDTH, 25).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b')
      .text('No approved bookings found for the selected month.', LEFT + 5, y + 8, { align: 'center', width: TABLE_WIDTH - 10 });
    y += 25;
  } else {
    rows.forEach((r, index) => {
      // Page break — leave room for totals + KPI + footer on the last page
      if (y + ROW_H > PAGE_BOTTOM) {
        doc.addPage();
        y = 30;
        y = drawTableHeader(y);
      }

      if (index % 2 === 1) {
        doc.rect(LEFT, y, TABLE_WIDTH, ROW_H).fill('#f8fafc');
      }

      const hasDiscount = (r.discountPercentage || 0) > 0;
      const cy = y + (ROW_H / 2) - 4;

      doc.font('Helvetica').fontSize(8).fillColor('#0f172a');

      const bNo = String(r.bookingNo || r._id?.toString().substring(18) || '—').toUpperCase();
      doc.text(bNo, cols[0].x + 3, cy, { width: cols[0].w - 6, align: cols[0].align, lineBreak: false });

      const gName = r.guestName?.trim() || '—';
      doc.text(gName, cols[1].x + 3, cy, { width: cols[1].w - 6, align: cols[1].align, ellipsis: true, lineBreak: false });

      const gPhone = r.guestPhone?.trim() || '—';
      doc.text(gPhone, cols[2].x + 3, cy, { width: cols[2].w - 6, align: cols[2].align, ellipsis: true, lineBreak: false });

      let roomBed = '—';
      if (r.roomNumber != null && String(r.roomNumber).trim() !== '') {
        const roomsArr = String(r.roomNumber).split(',').map((nr) => nr.trim()).filter(Boolean);
        roomBed = roomsArr.map((nr) => `R-${nr}`).join(', ');
      }
      if (r.bedNumber) roomBed += ` / B-${r.bedNumber}`;
      doc.text(roomBed, cols[3].x + 3, cy, { width: cols[3].w - 6, align: cols[3].align, ellipsis: true, lineBreak: false });

      const rType = r.roomType ? r.roomType.charAt(0).toUpperCase() + r.roomType.slice(1) : '—';
      doc.text(rType, cols[4].x + 3, cy, { width: cols[4].w - 6, align: cols[4].align, lineBreak: false });

      doc.text(formatDate(r.effectiveCheckIn),  cols[5].x + 3, cy, { width: cols[5].w - 6, align: cols[5].align, lineBreak: false });
      doc.text(formatDate(r.effectiveCheckOut), cols[6].x + 3, cy, { width: cols[6].w - 6, align: cols[6].align, lineBreak: false });

      doc.text(formatNights(r.nights), cols[7].x + 3, cy, { width: cols[7].w - 6, align: cols[7].align, lineBreak: false });

      if (hasDiscount) {
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
          .text(formatCurrency(r.originalPrice), cols[8].x + 3, y + 4, { width: cols[8].w - 6, align: cols[8].align, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#16a34a')
          .text(`${formatCurrency(r.pricePerNight)} (-${r.discountPercentage}%)`, cols[8].x + 3, y + 13, { width: cols[8].w - 6, align: cols[8].align, lineBreak: false });
      } else {
        doc.font('Helvetica').fontSize(8).fillColor('#0f172a')
          .text(formatCurrency(r.pricePerNight), cols[8].x + 3, cy, { width: cols[8].w - 6, align: cols[8].align, lineBreak: false });
      }

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
        .text(formatCurrency(r.revenue), cols[9].x + 3, cy, { width: cols[9].w - 6, align: cols[9].align, lineBreak: false });

      doc.rect(LEFT, y, TABLE_WIDTH, ROW_H).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += ROW_H;
    });
  }

  // ── 4. Totals row — immediately after last data row ───────────────────────
  doc.rect(LEFT, y, TABLE_WIDTH, TOT_H).fill('#f1f5f9');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b');
  doc.text('TOTAL', cols[0].x + 3, y + 6, { width: 300, align: 'left', lineBreak: false });
  doc.text(formatNights(totalNights), cols[7].x + 3, y + 6, { width: cols[7].w - 6, align: cols[7].align, lineBreak: false });
  doc.text(formatCurrency(totalRevenue), cols[9].x + 3, y + 6, { width: cols[9].w - 6, align: cols[9].align, lineBreak: false });
  doc.rect(LEFT, y, TABLE_WIDTH, TOT_H).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
  y += TOT_H + 10;

  // ── 5. KPI summary box — anchored right after totals row ─────────────────
  const kpis = [
    { label: 'Total Bookings', value: String(totalBookings) },
    { label: 'Total Nights',   value: formatNights(totalNights) },
    { label: 'Total Revenue',  value: formatCurrency(totalRevenue) },
  ];
  const KPI_BOX_W = 520; // centred box, not full width
  const KPI_BOX_X = LEFT + (TABLE_WIDTH - KPI_BOX_W) / 2;
  const kpiW      = KPI_BOX_W / kpis.length;

  kpis.forEach((k, i) => {
    const kx = KPI_BOX_X + i * kpiW;
    doc.rect(kx, y, kpiW, KPI_H).fill(i % 2 === 0 ? '#f0f9ff' : '#f8fafc');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569')
      .text(k.label, kx + 4, y + 8, { width: kpiW - 8, align: 'center' });
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a')
      .text(k.value, kx + 4, y + 22, { width: kpiW - 8, align: 'center' });
  });
  doc.rect(KPI_BOX_X, y, KPI_BOX_W, KPI_H).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i += 1) {
    doc.switchToPage(i);

    const signatureWidth = 100;
    const signatureHeight = 32;
    const signatureX = LEFT;
    const signatureY = doc.page.height - doc.page.margins.bottom - 58;

    const signatureDrawn = await drawImageFromSource(doc, eSignatureUrl, signatureX, signatureY, {
      fit: [signatureWidth, signatureHeight],
    });

    if (signatureDrawn) {
      doc.font('Helvetica').fontSize(7).fillColor('#64748b')
        .text('Authorized Signature', signatureX, signatureY + signatureHeight + 2, {
          width: signatureWidth,
          align: 'left',
        });
    }
  }

  doc.end();
  return getBuffer();
};
