const currency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v || 0));

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

const guestInfo = (booking) => ({
  name: `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || '—',
  phone: booking.userId?.phone || '—',
  email: booking.userId?.email || '—',
  room: booking.roomId?.roomNumber
    ? `Room ${booking.roomId.roomNumber}`
    : Array.isArray(booking.roomIds) && booking.roomIds.length
      ? booking.roomIds.map((r) => `Room ${r.roomNumber}`).join(', ')
      : '—',
  bed: booking.bedId?.bedNumber
    ? ` / Bed ${booking.bedId.bedNumber}${booking.bedId.bedType ? ` (${booking.bedId.bedType})` : ''}`
    : '',
  guestHouseName: booking.guestHouseId?.guestHouseName || '—',
  guestHouseLocation: (() => {
    const loc = booking.guestHouseId?.location;
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    return [loc.city, loc.state].filter(Boolean).join(', ');
  })(),
});

const PAGE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #111827; background: #fff; padding: 36px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .header h1 { font-size: 1.8rem; letter-spacing: 0.05em; }
  .header-right { text-align: right; font-size: 0.88rem; color: #475569; line-height: 1.8; }
  .header-right strong { color: #111827; }
  .company { font-size: 0.88rem; color: #6b7280; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; }
  .box-title { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.06em; margin-bottom: 8px; }
  .box p { font-size: 0.88rem; line-height: 1.75; color: #374151; }
  .box p strong { color: #111827; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.9rem; }
  thead tr { background: #f3f4f6; }
  th { padding: 9px 12px; font-size: 0.75rem; font-weight: 700; text-align: left; border-bottom: 2px solid #d1d5db; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
  th.right, td.right { text-align: right; }
  td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  .summary { display: flex; justify-content: flex-end; margin-top: 8px; }
  .summary-table { width: 280px; border-collapse: collapse; }
  .summary-table td { padding: 5px 10px; font-size: 0.9rem; color: #374151; border: none; }
  .summary-table td.right { text-align: right; }
  .grand-total td { font-weight: 700; font-size: 1rem; color: #111827; border-top: 2px solid #374151; padding-top: 10px; }
  .footer { margin-top: 40px; font-size: 0.78rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { padding: 16mm 15mm 20mm 15mm; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 6px 15mm 10px; background: #fff; border-top: 1px solid #e5e7eb; }
  }
`;

/**
 * Normalize invoice data: accepts new top-level fields OR legacy invoiceData fields.
 * Guarantees: bookingTotal, taxesTotal, taxBreakdown, extrasTotal,
 *             amountPaid, outstandingBalance, paymentMethod, createdAt, discount
 * are all present as top-level keys.
 */
const normalizeInvoice = (invoiceData = {}) => {
  const id = invoiceData.id
    || invoiceData._id
    || (invoiceData.invoiceId && String(invoiceData.invoiceId))
    || '';
  return {
    id,
    bookingTotal: Number(
      invoiceData.bookingTotal
        ?? invoiceData.totalAmount
        ?? invoiceData.invoiceData?.bookingTotal
        ?? 0
    ),
    taxesTotal: Number(
      invoiceData.taxesTotal
        ?? invoiceData.normTaxAmount
        ?? invoiceData.taxAmount
        ?? invoiceData.invoiceData?.taxesTotal
        ?? 0
    ),
    taxBreakdown: Array.isArray(invoiceData.taxBreakdown) && invoiceData.taxBreakdown.length
      ? invoiceData.taxBreakdown
      : Array.isArray(invoiceData.invoiceData?.taxBreakdown)
        ? invoiceData.invoiceData.taxBreakdown
        : [],
    extrasTotal: Number(
      invoiceData.extrasTotal
        ?? invoiceData.normExtrasTotal
        ?? invoiceData.invoiceData?.extrasTotal
        ?? 0
    ),
    amountPaid: Number(
      invoiceData.amountPaid
        ?? invoiceData.normPaidAmount
        ?? invoiceData.paidAmount
        ?? invoiceData.invoiceData?.amountPaid
        ?? 0
    ),
    outstandingBalance: Number(
      invoiceData.outstandingBalance
        ?? invoiceData.normOutstandingAmount
        ?? invoiceData.outstandingAmount
        ?? invoiceData.invoiceData?.outstandingBalance
        ?? 0
    ),
    discount: Number(invoiceData.discount ?? invoiceData.discountAmount ?? invoiceData.invoiceData?.discount ?? 0),
    paymentMethod: invoiceData.paymentMethod
      ?? invoiceData.normPaymentMethod
      ?? invoiceData.invoiceData?.paymentMethod
      ?? '',
    note: invoiceData.note ?? invoiceData.notes ?? invoiceData.invoiceData?.note ?? '',
    createdAt: invoiceData.createdAt ?? invoiceData.invoiceData?.createdAt,
  };
};

/**
 * Print a checkout invoice.
 */
export const printInvoice = (booking, invoiceData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const inv = normalizeInvoice(invoiceData);
  const g = guestInfo(booking);
  const bookingCharges = inv.bookingTotal - inv.extrasTotal - inv.taxesTotal;

  const taxRows = Array.isArray(inv.taxBreakdown) && inv.taxBreakdown.length > 0
    ? inv.taxBreakdown.map((t) =>
        `<tr><td>${t.name || 'Tax'}${t.percentage != null ? ` (${t.percentage}%)` : ''}</td><td style="text-align:right">${currency(t.amount)}</td></tr>`
      ).join('')
    : inv.taxesTotal
      ? `<tr><td>Taxes</td><td style="text-align:right">${currency(inv.taxesTotal)}</td></tr>`
      : '';

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice - ${inv.id || booking._id}</title>
<style>${PAGE_STYLES}</style></head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <p class="company">${g.guestHouseName}${g.guestHouseLocation ? ' · ' + g.guestHouseLocation : ''}</p>
    </div>
    <div class="header-right">
      <div>Invoice #: <strong>${inv.id || '—'}</strong></div>
      <div>Date: <strong>${fmt(inv.createdAt)}</strong></div>
      <div>Booking ID: <strong>${String(booking._id).slice(-8).toUpperCase()}</strong></div>
    </div>
  </div>
  <div class="meta-grid">
    <div class="box">
      <div class="box-title">Bill To</div>
      <p><strong>${g.name}</strong></p>
      <p>Phone: ${g.phone}</p>
      <p>Email: ${g.email}</p>
      <p>Room: ${g.room}${g.bed}</p>
      <p>Check-in: ${fmt(booking.checkIn)}</p>
      <p>Check-out: ${fmt(booking.checkOut)}</p>
    </div>
    <div class="box">
      <div class="box-title">Payment Details</div>
      <p>Method: <strong>${inv.paymentMethod || '—'}</strong></p>
      <p>Paid On: <strong>${fmt(inv.createdAt)}</strong></p>
      <p>Hotel: ${g.guestHouseName}</p>
    </div>
  </div>
  <table>
    <thead><tr><th style="width:40px">#</th><th>Description</th><th class="right" style="width:140px">Amount</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Booking Charges</td><td class="right">${currency(bookingCharges)}</td></tr>
      <tr><td>2</td><td>Extras / Add-ons</td><td class="right">${currency(inv.extrasTotal)}</td></tr>
      ${taxRows}
    </tbody>
  </table>
  <div class="summary">
    <table class="summary-table">
      <tr><td>Subtotal</td><td class="right">${currency(inv.bookingTotal)}</td></tr>
      <tr><td>Amount Paid</td><td class="right">${currency(inv.amountPaid)}</td></tr>
      <tr class="grand-total"><td>Balance Due</td><td class="right">${currency(inv.outstandingBalance)}</td></tr>
    </table>
  </div>
  <div class="footer">
    <span>Generated on ${fmt(new Date())}</span>
    <span>Thank you for staying with us!</span>
  </div>
  <script>window.onload = function () { window.print(); };<\/script>
</body></html>`);

  printWindow.document.close();
  return true;
};

/**
 * Print a receipt for an outstanding payment.
 * Shows: Total Bill, Already Paid, Outstanding Amount Paid (this transaction), Balance Remaining.
 */
export const printOutstandingReceipt = (booking, receiptData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const g = guestInfo(booking);

  // room label — handle both populated object and plain string/ObjectId
  const roomLabel = (() => {
    const rooms = Array.isArray(booking.roomIds) && booking.roomIds.length
      ? booking.roomIds
      : booking.roomId
        ? [booking.roomId]
        : [];
    const label = rooms.map((r) => (r?.roomNumber ? `Room ${r.roomNumber}` : '')).filter(Boolean).join(', ');
    return label || '—';
  })();

  const inv = normalizeInvoice(receiptData);
  // For outstanding receipt, receiptData.amountPaid is ONLY this transaction
  const totalBill      = Number(receiptData.bookingTotal || inv.bookingTotal || 0);
  const alreadyPaid    = Number(receiptData.previouslyPaid || 0);
  const paidNow        = Number(receiptData.amountPaid || 0);
  const balanceRemain  = Number(receiptData.outstandingBalance ?? inv.outstandingBalance ?? 0);

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Receipt - ${String(booking._id).slice(-8).toUpperCase()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #111827; background: #fff; padding: 36px; max-width: 480px; margin: 0 auto; }
  .header { margin-bottom: 24px; border-bottom: 2px solid #111827; padding-bottom: 14px; }
  .header h1 { font-size: 1.6rem; letter-spacing: 0.05em; }
  .header p  { font-size: 0.85rem; color: #6b7280; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 24px; font-size: 0.85rem; }
  .meta .label { color: #6b7280; }
  .meta .value { font-weight: 600; color: #111827; }
  .amount-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 18px; margin-bottom: 20px; }
  .amount-box .row { display: flex; justify-content: space-between; font-size: 0.9rem; color: #374151; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
  .amount-box .row:last-child { border-bottom: none; }
  .amount-box .row.total { font-weight: 700; font-size: 1.05rem; color: #111827; border-top: 2px solid #111827; margin-top: 6px; padding-top: 10px; border-bottom: none; }
  .footer { margin-top: 28px; font-size: 0.75rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: center; }
  @page { size: A5 portrait; margin: 0; }
  @media print { body { padding: 12mm; } }
</style></head>
<body>
  <div class="header">
    <h1>RECEIPT</h1>
    <p>${g.guestHouseName}</p>
  </div>
  <div class="meta">
    <span class="label">Date</span>
    <span class="value">${fmt(receiptData.createdAt || new Date())}</span>

    <span class="label">Booking Ref</span>
    <span class="value">${String(booking._id).slice(-8).toUpperCase()}</span>

    <span class="label">Guest</span>
    <span class="value">${g.name}</span>

    <span class="label">Phone</span>
    <span class="value">${g.phone}</span>

    <span class="label">Room</span>
    <span class="value">${roomLabel}</span>

    <span class="label">Payment Method</span>
    <span class="value">${receiptData.paymentMethod || '—'}</span>
  </div>
  <div class="amount-box">
    <div class="row">
      <span>Total Bill Amount</span>
      <span>${currency(totalBill)}</span>
    </div>
    <div class="row">
      <span>Already Paid</span>
      <span>${currency(alreadyPaid)}</span>
    </div>
    <div class="row">
      <span>Amount Paid</span>
      <span>${currency(paidNow)}</span>
    </div>
    <div class="row total">
      <span>Outstanding Balance</span>
      <span>${currency(balanceRemain)}</span>
    </div>
  </div>
  <div class="footer">Generated on ${fmt(new Date())}</div>
  <script>window.onload = function () { window.print(); };<\/script>
</body></html>`);

  printWindow.document.close();
  return true;
};
