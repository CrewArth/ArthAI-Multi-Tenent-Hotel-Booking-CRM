import { createPdfStream } from '../pdfGenerator.js';
import { drawImageFromSource } from '../imageSource.js';

const fmtDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(val); }
};

const fmtDateTime = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return String(val); }
};

const fmtCurrency = (val) =>
  `Rs. ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Generates the Payment Method Wise Report PDF.
 *
 * @param {Object} data     - { rows, totals } from getPaymentMethodReportData
 * @param {Object} filters  - { paymentMethods, fromDate, toDate }
 * @param {Object} meta     - { createdBy, logoUrl, eSignatureUrl }
 * @returns {Promise<Buffer>}
 */
export const generatePaymentMethodReportPdf = async (data, filters, meta) => {
  const { doc, getBuffer } = createPdfStream({ size: 'A4', margin: 40 });
  const { rows = [], totals = [] } = data;
  const { paymentMethods = [], fromDate, toDate } = filters;
  const createdBy    = meta?.createdBy    || 'Admin';
  const logoUrl      = meta?.logoUrl      || null;
  const eSignatureUrl= meta?.eSignatureUrl|| null;

  const L = 40;           // left margin
  const R = 555;          // right margin
  const W = R - L;        // usable width = 515
  const PAGE_BOTTOM = 735; // stop adding rows before the footer zone
  let y = 40;

  // ── Header ────────────────────────────────────────────────────────────────
  const LOGO_SIZE = 40;
  await drawImageFromSource(doc, logoUrl, L, y - 10, { width: LOGO_SIZE, height: LOGO_SIZE, fit: [LOGO_SIZE, LOGO_SIZE] });

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a')
    .text('Payment Method Wise Report', L, y, { align: 'center', width: W });
  y += 20;

  // doc.fontSize(9).font('Helvetica').fillColor('#475569')
  //   .text(``, L, y, { align: 'center', width: W });
  // y += 14;

  const dateLabel = fromDate || toDate
    ? `${fromDate ? fmtDate(fromDate) : 'Start'} – ${toDate ? fmtDate(toDate) : 'Today'}`
    : 'All Dates';
  doc.fontSize(9).fillColor('#475569')
    .text(`Period: ${dateLabel}`, L, y, { align: 'center', width: W });
  y += 18;

  // divider
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  y += 10;

  // ── Summary totals box ────────────────────────────────────────────────────
  const grandTotal = totals.reduce((s, t) => s + (t.totalPaid || 0), 0);
  const grandCount = totals.reduce((s, t) => s + (t.count || 0), 0);

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
    .text('Summary', L, y);
  y += 14;

  const TCOL = [L, L + 150, L + 320, L + 430];
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
  ['Payment Method', 'Transactions', 'Total Collected', ''].forEach((h, i) => {
    doc.text(h, TCOL[i], y, { width: 140, align: i === 2 ? 'right' : 'left' });
  });
  y += 12;
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  y += 6;

  for (const t of totals) {
    doc.fontSize(8).font('Helvetica').fillColor('#334155');
    doc.text(t._id || '—',                   TCOL[0], y, { width: 140 });
    doc.text(String(t.count),                 TCOL[1], y, { width: 140 });
    doc.text(fmtCurrency(t.totalPaid),        TCOL[2], y, { width: 140, align: 'right' });
    y += 14;
  }

  doc.moveTo(L, y).lineTo(R, y).strokeColor('#94a3b8').lineWidth(0.5).stroke();
  y += 6;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Grand Total',            TCOL[0], y, { width: 140 });
  doc.text(String(grandCount),       TCOL[1], y, { width: 140 });
  doc.text(fmtCurrency(grandTotal),  TCOL[2], y, { width: 140, align: 'right' });
  y += 20;

  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  y += 12;

  // ── Transactions table ────────────────────────────────────────────────────
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
    .text('Transaction Details', L, y);
  y += 14;

  // Column config — total width = 515 (W = R - L)
  // Date(65) + Guest(85) + Phone(75) + Room(42) + GuestHouse(105) + Method(60) + AmountPaid(83) = 515
  const COLS = [
    { x: L,       w: 65,  align: 'left',  label: 'Date'        },
    { x: L + 65,  w: 85,  align: 'left',  label: 'Guest'       },
    { x: L + 150, w: 75,  align: 'left',  label: 'Phone'       },
    { x: L + 225, w: 42,  align: 'left',  label: 'Room'        },
    { x: L + 267, w: 105, align: 'left',  label: 'Guest House' },
    { x: L + 372, w: 60,  align: 'center',label: 'Method'      },
    { x: L + 432, w: 83,  align: 'right', label: 'Amount Paid' },
  ];

  // Table header
  doc.rect(L, y, W, 14).fill('#f1f5f9');
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#374151');
  COLS.forEach((c) => doc.text(c.label, c.x + 2, y + 3, { width: c.w - 4, align: c.align }));
  y += 14;
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  y += 2;

  // Rows — paginate automatically
  let lastMethod = null;

  for (const row of rows) {
    // Method group header when method changes (rows sorted by method)
    if (row.paymentMethod !== lastMethod) {
      if (lastMethod !== null) y += 4;
      if (y > PAGE_BOTTOM - 30) {
        doc.addPage();
        y = 40;
      }
      doc.rect(L, y, W, 13).fill('#e0f2fe');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0369a1')
        .text(row.paymentMethod || '—', L + 4, y + 3, { width: W - 8 });
      y += 13 + 4; // 4px gap between header and first data row
      lastMethod = row.paymentMethod;
    }

    if (y > PAGE_BOTTOM - 16) {
      doc.addPage();
      y = 40;
      // Redraw column headers on new page
      doc.rect(L, y, W, 14).fill('#f1f5f9');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#374151');
      COLS.forEach((c) => doc.text(c.label, c.x + 2, y + 3, { width: c.w - 4, align: c.align }));
      y += 16;
    }

    doc.fontSize(7).font('Helvetica').fillColor('#1e293b');
    doc.text(fmtDate(row.createdAt),      COLS[0].x + 2, y, { width: COLS[0].w - 4 });
    doc.text(row.guestName || '—',        COLS[1].x + 2, y, { width: COLS[1].w - 4, ellipsis: true });
    doc.text(String(row.guestPhone || '—'),COLS[2].x + 2, y, { width: COLS[2].w - 4 });
    const roomStr = row.roomNumber != null && String(row.roomNumber).trim() !== ''
      ? String(row.roomNumber).toLowerCase().startsWith('room') ? String(row.roomNumber) : `Room ${row.roomNumber}`
      : '—';
    doc.text(roomStr, COLS[3].x + 2, y, { width: COLS[3].w - 4, ellipsis: true });
    doc.text(row.guestHouseName || '—',   COLS[4].x + 2, y, { width: COLS[4].w - 4, ellipsis: true });
    doc.text(row.paymentMethod || '—',    COLS[5].x + 2, y, { width: COLS[5].w - 4, align: 'center' });
    doc.text(fmtCurrency(row.amountPaid), COLS[6].x + 2, y, { width: COLS[6].w - 4, align: 'right' });

    y += 13;
    doc.moveTo(L, y - 1).lineTo(R, y - 1).strokeColor('#f1f5f9').lineWidth(0.3).stroke();
  }

  // ── Footer on each page ───────────────────────────────────────────────────
  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
    doc.switchToPage(i);

    const sigW = 100;
    const sigH = 32;
    const sigX = L;
    const sigY = 745;
    const sigDrawn = await drawImageFromSource(doc, eSignatureUrl, sigX, sigY, { fit: [sigW, sigH] });
    if (sigDrawn) {
      doc.fontSize(7).font('Helvetica').fillColor('#64748b')
        .text('Authorized Signature', sigX, sigY + sigH + 2, { width: sigW, align: 'left' });
    }

    doc.moveTo(L, 790).lineTo(R, 790).strokeColor('#e2e8f0').lineWidth(0.4).stroke();
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
      .text(`Generated: ${fmtDateTime(new Date())}  |  By: ${createdBy}`, L, 793, { width: W - 80 });
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
      .text(`Page ${i - pageRange.start + 1} of ${pageRange.count}`, L, 793, { width: W, align: 'right' });
  }

  doc.end();
  return getBuffer();
};
