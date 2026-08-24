import { createPdfStream } from '../pdfGenerator.js';
import { drawImageFromSource } from '../imageSource.js';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const drawLogo = (doc, logoUrl, x, y, width, height) => {
  if (!logoUrl || typeof logoUrl !== 'string') return false;
  try {
    const matches = logoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return false;
    const imageData = Buffer.from(matches[2], 'base64');
    const innerW = Math.max(0, width - 16);
    const innerH = Math.max(0, height - 16);
    doc.image(imageData, x + 8, y + 8, { fit: [innerW, innerH] });
    return true;
  } catch {
    return false;
  }
};

export const generateInvoicePdf = async (invoice, meta = {}) => {
  const { doc, getBuffer } = createPdfStream();
  const createdOn = formatDate(invoice.createdAt || new Date());
  const guestName = invoice.guestName || 'Guest';
  const bookingId = invoice.bookingId || '—';
  const paymentMethod = invoice.paymentMethod || '—';
  const amountPaid = Number(invoice.amountPaid || 0);
  const extrasTotal = Number(invoice.extrasTotal || 0);
  const bookingTotal = Number(invoice.bookingTotal || 0);
  const outstandingBalance = Number(invoice.outstandingBalance || 0);
  const bookingDate = formatDate(invoice.bookingDate);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const headerX = doc.page.margins.left;
  const logoWidth = 80;
  const logoHeight = 80;
  const extraRight = 12; // small extra right margin
  const logoX = doc.page.width - doc.page.margins.right - extraRight - logoWidth;
  const logoY = Math.max(0, doc.page.margins.top - 8); // nudge logo slightly up

  const companyName = invoice.bookingDetails?.guestHouseId?.guestHouseName || 'Guest house name';
  const locationValue = invoice.bookingDetails?.guestHouseId?.location;
  const companyLocation = typeof locationValue === 'string'
    ? locationValue
    : locationValue && typeof locationValue === 'object'
      ? [locationValue.city, locationValue.state].filter(Boolean).join(', ')
      : 'city, state';
  const logoUrl = meta.logoUrl || null;
  const eSignatureUrl = meta.eSignatureUrl || null;

  doc.font('Helvetica-Bold').fontSize(26).fillColor('#111827')
    .text('INVOICE', headerX, 40);

  if (!drawLogo(doc, logoUrl, logoX, logoY, logoWidth, logoHeight)) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827')
      .text(companyName, logoX + 8, logoY + 12, { width: logoWidth - 16, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
      .text(companyLocation, logoX + 8, logoY + 28, { width: logoWidth - 16, align: 'center' });
  }
  const payablePhone = invoice.bookingDetails?.guestHouseId?.phone || '';
  const billPhone = invoice.bookingDetails?.phone || invoice.bookingDetails?.userId?.phone || invoice.phone || '—';
  const billEmail = invoice.bookingDetails?.userId?.email || invoice.bookingDetails?.email || invoice.email || '—';
  const invoiceCreator = meta.createdBy || invoice.createdBy || invoice.bookingDetails?.createdBy || 'Admin';

  const invoiceDetailY = logoY + logoHeight + 20;
  const detailLabelWidth = 70;
  const dueDate = formatDate(invoice.dueDate || invoice.bookingDate || invoice.createdAt);

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569')
    .text('INVOICE ID:', headerX, invoiceDetailY)
    .text('DATE:', headerX, invoiceDetailY + 18)
    .text('DUE DATE:', headerX, invoiceDetailY + 36);

  doc.font('Helvetica').fontSize(10).fillColor('#111827')
    .text(invoice.id || '—', headerX + detailLabelWidth, invoiceDetailY)
    .text(createdOn, headerX + detailLabelWidth, invoiceDetailY + 18)
    .text(dueDate, headerX + detailLabelWidth, invoiceDetailY + 36);

  const sectionY = invoiceDetailY + 66;
  const sectionWidth = (pageWidth - 20) / 2;

  doc.roundedRect(headerX, sectionY, sectionWidth, 90, 6).stroke('#e5e7eb');
  doc.roundedRect(headerX + sectionWidth + 20, sectionY, sectionWidth, 90, 6).stroke('#e5e7eb');

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
    .text('BILL TO', headerX + 12, sectionY + 12)
    .text('PAYABLE TO', headerX + sectionWidth + 32, sectionY + 12);

  doc.font('Helvetica').fontSize(10).fillColor('#475569')
    .text(guestName, headerX + 12, sectionY + 30)
    .text(`Booking ID: ${bookingId}`, headerX + 12, sectionY + 46)
    .text(`Phone: ${billPhone}`, headerX + 12, sectionY + 62)
    .text(`Email: ${billEmail}`, headerX + 12, sectionY + 78);

  doc.font('Helvetica').fontSize(10).fillColor('#475569')
    .text(companyName, headerX + sectionWidth + 32, sectionY + 30)
    .text(companyLocation, headerX + sectionWidth + 32, sectionY + 46)
    .text(payablePhone, headerX + sectionWidth + 32, sectionY + 62);

  const tableY = sectionY + 120;
  const tableX = headerX;
  const tableWidth = pageWidth;
  const noWidth = 40;
  const amountWidth = 100;
  const descWidth = tableWidth - noWidth - amountWidth - 32;

  

  // Prepare rows: booking charges, extras, then individual tax lines (if provided) and payment
  const providedTaxItems = Array.isArray(invoice.taxBreakdown) ? invoice.taxBreakdown : [];
  const invoiceTaxesTotal = Number(invoice.taxesTotal) || providedTaxItems.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const bookingChargesValue = bookingTotal - extrasTotal - invoiceTaxesTotal;

  const rows = [];
  rows.push({ label: 'Booking Charges', value: bookingChargesValue });
  rows.push({ label: 'Extras / Add-ons', value: extrasTotal });

  if (providedTaxItems.length > 0) {
    providedTaxItems.forEach((t) => {
      const pct = t.percentage != null ? ` (${t.percentage}%)` : '';
      rows.push({ label: `${t.name || 'Tax'}${pct}`, value: Number(t.amount) || 0 });
    });
  } else if (invoiceTaxesTotal) {
    rows.push({ label: 'Taxes', value: invoiceTaxesTotal });
  }

  rows.push({ label: 'Amount Paid', value: amountPaid });

  let currentY = tableY + 36;
  const rowHeight = 28;
  const minTableHeight = 150;
  const neededHeight = rows.length * rowHeight + 36; // header + rows
  const tableHeight = Math.max(minTableHeight, neededHeight);

  // Draw table with dynamic height
  doc.roundedRect(tableX, tableY, tableWidth, tableHeight, 6).stroke('#e5e7eb');
  doc.moveTo(tableX, tableY + 28).lineTo(tableX + tableWidth, tableY + 28).stroke('#e5e7eb');
  doc.moveTo(tableX + noWidth + 12, tableY).lineTo(tableX + noWidth + 12, tableY + tableHeight).stroke('#e5e7eb');
  doc.moveTo(tableX + noWidth + descWidth + 24, tableY).lineTo(tableX + noWidth + descWidth + 24, tableY + tableHeight).stroke('#e5e7eb');

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827')
    .text('NO.', tableX + 12, tableY + 10)
    .text('DESCRIPTION', tableX + noWidth + 12, tableY + 10)
    .text('AMOUNT', tableX + noWidth + descWidth + 24, tableY + 10, { width: amountWidth, align: 'right' });

  rows.forEach((row, index) => {
    doc.font('Helvetica').fontSize(10).fillColor('#475569')
      .text(`${index + 1}.`, tableX + 12, currentY)
      .text(row.label, tableX + noWidth + 20, currentY, { width: descWidth - 8, align: 'left' })
      .text(formatCurrency(row.value), tableX + noWidth + descWidth + 24, currentY, { width: amountWidth, align: 'right' });
    currentY += rowHeight;
    doc.moveTo(tableX, currentY - 6).lineTo(tableX + tableWidth, currentY - 6).stroke('#f3f4f6');
  });

  const summaryX = tableX + tableWidth - amountWidth - 12;
  const summaryY = tableY + tableHeight + 20;

  doc.font('Helvetica').fontSize(9).fillColor('#475569')
    .text('Subtotal', summaryX - 80, summaryY)
    .text('Total Paid', summaryX - 80, summaryY + 16)
    .text('Balance Due', summaryX - 80, summaryY + 32);

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
    .text(formatCurrency(bookingTotal), summaryX, summaryY, { width: amountWidth, align: 'right' })
    .text(formatCurrency(amountPaid), summaryX, summaryY + 16, { width: amountWidth, align: 'right' })
    .text(formatCurrency(outstandingBalance), summaryX, summaryY + 32, { width: amountWidth, align: 'right' });

  doc.font('Helvetica').fontSize(9).fillColor('#9ca3af')
    .text('Generated On:', headerX, doc.page.height - doc.page.margins.bottom - 40)
    .text(createdOn, headerX + 70, doc.page.height - doc.page.margins.bottom - 40)
    .text('Created By:', summaryX - 80, doc.page.height - doc.page.margins.bottom - 40)
    .text(invoiceCreator, summaryX, doc.page.height - doc.page.margins.bottom - 40, { width: amountWidth, align: 'right' });

  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i += 1) {
    doc.switchToPage(i);
    const signatureWidth = 100;
    const signatureHeight = 32;
    const signatureX = headerX;
    const signatureY = doc.page.height - doc.page.margins.bottom - 85;

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
