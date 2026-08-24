import { createPdfStream } from '../pdfGenerator.js';
import { drawImageFromSource } from '../imageSource.js';

const formatDateStr = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
};

const formatDateTimeStr = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(val);
  }
};

/**
 * Attempts to embed a base64 logo into the PDF doc.
 * Returns true if successful, false if the logo is missing or invalid.
 */
const drawLogo = (doc, logoUrl, x, y, size) => {
  if (!logoUrl || typeof logoUrl !== 'string') return false;
  try {
    // logoUrl is a data URL: "data:<mime>;base64,<data>"
    const matches = logoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return false;
    const imageData = Buffer.from(matches[2], 'base64');
    doc.image(imageData, x, y, { width: size, height: size, fit: [size, size] });
    return true;
  } catch {
    return false;
  }
};

/**
 * Generates PDF for "Booking by Guest House" report.
 *
 * @param {Object} data - { guestHouse, bookings }
 * @param {Object} filters - { fromDate, toDate }
 * @param {Object} meta - { createdBy, logoUrl }
 * @returns {Promise<Buffer>}
 */
export const generateBookingByGuestHousePdf = async (data, filters, meta) => {
  const { doc, getBuffer } = createPdfStream();
  const { guestHouse, bookings = [] } = data;
  const performerName = meta?.createdBy || 'Admin';
  const logoUrl = meta?.logoUrl || null;
  const eSignatureUrl = meta?.eSignatureUrl || null;
  const generatedOn = formatDateTimeStr(new Date());

  // Layout constants
  const LEFT = 25;
  const RIGHT = 575;
  const TABLE_WIDTH = RIGHT - LEFT; // 550

  let y = 40;

  // 1. Header — logo top-left, title centred
  const LOGO_SIZE = 40;
  const logoDrawn = drawLogo(doc, logoUrl, LEFT, y, LOGO_SIZE);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a')
    .text(guestHouse?.guestHouseName || 'Guest House', LEFT, y, { align: 'center', width: TABLE_WIDTH });
  y = doc.y + 4;

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#334155')
    .text('Booking by Guest House Report', LEFT, y, { align: 'center', width: TABLE_WIDTH });
  y = doc.y + 12;

  // Divider line
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
  y += 14;

  // 2. Filters Section
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('Filters', LEFT, y);
  y += 14;

  const drawFilterRow = (label, value) => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569').text(`${label}:`, LEFT, y, { width: 90 });
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a').text(value || 'All', LEFT + 90, y);
    y += 14;
  };

  drawFilterRow('From Date', filters.fromDate ? formatDateStr(filters.fromDate) : 'All Time');
  drawFilterRow('To Date', filters.toDate ? formatDateStr(filters.toDate) : 'All Time');
  drawFilterRow('Guest House', `${guestHouse.guestHouseName} (${guestHouse.guestHouseId})`);

  y += 8;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  y += 14;

  // 3. Table Column Layout
  // Total width = 550 (LEFT=25 to RIGHT=575)
  const cols = [
    { label: 'Booking No', x: LEFT,       w: 55,  align: 'left'   },
    { label: 'Guest Name', x: LEFT + 55,  w: 100, align: 'left'   },
    { label: 'Phone',      x: LEFT + 155, w: 75,  align: 'left'   },
    { label: 'Room / Bed', x: LEFT + 230, w: 70,  align: 'left'   },
    { label: 'Check In',   x: LEFT + 300, w: 65,  align: 'center' },
    { label: 'Check Out',  x: LEFT + 365, w: 65,  align: 'center' },
    { label: 'Status',     x: LEFT + 430, w: 55,  align: 'center' },
    { label: 'Applied',    x: LEFT + 485, w: 65,  align: 'center' },
  ];

  const drawTableHeader = (currentY) => {
    doc.rect(LEFT, currentY, TABLE_WIDTH, 20).fill('#f1f5f9');

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b');
    cols.forEach((c) => {
      doc.text(c.label, c.x + 3, currentY + 5, { width: c.w - 6, align: c.align });
    });

    doc.rect(LEFT, currentY, TABLE_WIDTH, 20).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    return currentY + 20;
  };

  y = drawTableHeader(y);

  // 4. Render Rows
  if (bookings.length === 0) {
    doc.rect(LEFT, y, TABLE_WIDTH, 25).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b')
      .text('No bookings found matching the selected filters.', LEFT + 5, y + 8, { align: 'center', width: TABLE_WIDTH - 10 });
    y += 25;
  } else {
    bookings.forEach((b, index) => {
      if (y > 730) {
        doc.addPage();
        y = 40;
        y = drawTableHeader(y);
      }

      const rowHeight = 22;

      if (index % 2 === 1) {
        doc.rect(LEFT, y, TABLE_WIDTH, rowHeight).fill('#f8fafc');
      }

      doc.font('Helvetica').fontSize(8).fillColor('#0f172a');

      // Booking No
      const bNo = String(b.bookingNo || b._id?.toString().substring(18) || '—').toUpperCase();
      doc.text(bNo, cols[0].x + 3, y + 6, { width: cols[0].w - 6, align: cols[0].align });

      // Guest Name
      const gName = b.guestName?.trim() || b.fullName || '—';
      doc.text(gName, cols[1].x + 3, y + 6, { width: cols[1].w - 6, align: cols[1].align, ellipsis: true });

      // Phone
      const gPhone = b.guestPhone?.trim() || '—';
      doc.text(gPhone, cols[2].x + 3, y + 6, { width: cols[2].w - 6, align: cols[2].align, ellipsis: true });

      // Room / Bed
      let roomBedStr = '—';
      if (b.roomNumber != null && String(b.roomNumber).trim() !== '') {
        const roomsArr = String(b.roomNumber).split(',').map((r) => r.trim()).filter(Boolean);
        roomBedStr = roomsArr.map((r) => `R-${r}`).join(', ');
      }
      if (b.bedNumber) roomBedStr += ` / B-${b.bedNumber}`;
      doc.text(roomBedStr, cols[3].x + 3, y + 6, { width: cols[3].w - 6, align: cols[3].align, ellipsis: true });

      // Check In
      doc.text(formatDateStr(b.checkIn), cols[4].x + 3, y + 6, { width: cols[4].w - 6, align: cols[4].align });

      // Check Out
      doc.text(formatDateStr(b.checkOut), cols[5].x + 3, y + 6, { width: cols[5].w - 6, align: cols[5].align });

      // Status
      const statusText = String(b.status || 'pending').toUpperCase();
      doc.text(statusText, cols[6].x + 3, y + 6, { width: cols[6].w - 6, align: cols[6].align });

      // Applied Date
      doc.text(formatDateStr(b.createdAt), cols[7].x + 3, y + 6, { width: cols[7].w - 6, align: cols[7].align });

      doc.rect(LEFT, y, TABLE_WIDTH, rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += rowHeight;
    });
  }

  // 5. Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const footerY = 785;

    doc.moveTo(LEFT, footerY - 8).lineTo(RIGHT, footerY - 8).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

    const signatureWidth = 100;
    const signatureHeight = 32;
    const signatureX = LEFT;
    const signatureY = footerY - 44;

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

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b')
      .text(`Created By: ${performerName}`, LEFT, footerY, { lineBreak: false });

    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(`Generated On: ${generatedOn}   |   Page ${i + 1} of ${range.count}`, LEFT + 150, footerY, { align: 'right', width: TABLE_WIDTH - 150, lineBreak: false });
  }

  doc.end();
  return getBuffer();
};
