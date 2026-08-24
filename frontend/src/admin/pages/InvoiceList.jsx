import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { printInvoice } from '../utils/printInvoice';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const LIMIT = 15;

const InvoiceList = () => {
  const currentUser = useSelector((state) => state.auth?.user);
  const assignedGuestHouse = currentUser?.assignedGuestHouseId;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [printingId, setPrintingId] = useState(null);

  const getGuestHouseId = () => {
    if (!assignedGuestHouse) return null;
    return typeof assignedGuestHouse === 'object'
      ? assignedGuestHouse.guestHouseId
      : assignedGuestHouse;
  };

  const fetchBookings = async (page = 1, searchTerm = search) => {
    setLoading(true);
    setError('');
    try {
      const body = { page, limit: LIMIT, search: searchTerm };
      const ghId = getGuestHouseId();
      if (ghId) body.guestHouseId = ghId;

      const res = await api.post('/api/payments/checked-out', body);
      setBookings(res.data?.bookings || []);
      setTotalPages(res.data?.totalPages || 1);
      setCurrentPage(res.data?.currentPage || page);
      setTotalCount(res.data?.totalCount || 0);
    } catch (err) {
      console.error('Error fetching invoice list:', err);
      const msg = err.response?.data?.message || 'Unable to load completed bookings.';
      setError(msg);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchBookings(1, '');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
    fetchBookings(1, searchInput);
  };

  const handleClear = () => {
    setSearchInput('');
    setSearch('');
    setCurrentPage(1);
    fetchBookings(1, '');
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchBookings(newPage, search);
  };

  const handlePrintInvoice = async (booking) => {
    if (!booking.invoice) { toast.error('No invoice found for this booking.'); return; }
    setPrintingId(booking._id);
    try {
      const res = await api.get(`/api/payments/booking/${booking._id}/invoice`);
      const invoiceData = res.data?.invoice || res.data?.invoiceDoc?.invoiceData;
      if (!invoiceData) { toast.error('Invoice data is not available for this booking.'); return; }
      if (!printInvoice(booking, invoiceData))
        toast.error('Pop-up blocked. Please allow pop-ups for this site.');
    } catch (err) {
      console.error('Error printing invoice:', err);
      toast.error('Unable to load invoice for printing.');
    } finally {
      setPrintingId(null);
    }
  };

  // DEAD CODE REMOVAL — openPrintWindow replaced by shared printInvoice utility
  const openPrintWindow = (booking, invoiceData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }

    const currency = (v) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v || 0));

    const fmt = (v) => {
      if (!v) return '—';
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
    };

    const guestHouseName = booking.guestHouseId?.guestHouseName || '—';
    const guestHouseLocation =
      typeof booking.guestHouseId?.location === 'string'
        ? booking.guestHouseId.location
        : booking.guestHouseId?.location
          ? [booking.guestHouseId.location.city, booking.guestHouseId.location.state].filter(Boolean).join(', ')
          : '';

    const taxRows = Array.isArray(invoiceData.taxBreakdown) && invoiceData.taxBreakdown.length > 0
      ? invoiceData.taxBreakdown
          .map((t) => `<tr><td>${t.name || 'Tax'}${t.percentage != null ? ` (${t.percentage}%)` : ''}</td><td style="text-align:right">${currency(t.amount)}</td></tr>`)
          .join('')
      : invoiceData.taxesTotal
        ? `<tr><td>Taxes</td><td style="text-align:right">${currency(invoiceData.taxesTotal)}</td></tr>`
        : '';

    const roomLabel = Array.isArray(booking.roomIds) && booking.roomIds.length
      ? booking.roomIds.map((r) => `Room ${r.roomNumber}`).join(', ')
      : '—';

    const bedLabel = booking.bedId?.bedNumber
      ? ` / Bed ${booking.bedId.bedNumber}${booking.bedId.bedType ? ` (${booking.bedId.bedType})` : ''}`
      : '';

    const guestPhone = booking.userId?.phone || '—';
    const guestEmail = booking.userId?.email || '—';
    const guestNameStr = `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || '—';

    const bookingCharges = (invoiceData.bookingTotal || 0) - (invoiceData.extrasTotal || 0) - (invoiceData.taxesTotal || 0);

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice – ${invoiceData.id || booking._id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; padding: 36px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .header h1 { font-size: 1.8rem; letter-spacing: 0.05em; color: #111827; }
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
    .grand-total td { font-weight: 700; font-size: 1rem; color: #111827; border-top: 2px solid #374151; padding-top: 10px; margin-top: 4px; }
    .footer { margin-top: 40px; font-size: 0.78rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      body { padding: 16mm 15mm 20mm 15mm; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 6px 15mm 10px; background: #fff; border-top: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <p class="company">${guestHouseName}${guestHouseLocation ? ' &middot; ' + guestHouseLocation : ''}</p>
    </div>
    <div class="header-right">
      <div>Invoice #: <strong>${invoiceData.id || '—'}</strong></div>
      <div>Date: <strong>${fmt(invoiceData.createdAt)}</strong></div>
      <div>Booking ID: <strong>${String(booking._id).slice(-8).toUpperCase()}</strong></div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="box">
      <div class="box-title">Bill To</div>
      <p><strong>${guestNameStr}</strong></p>
      <p>Phone: ${guestPhone}</p>
      <p>Email: ${guestEmail}</p>
      <p>Room: ${roomLabel}${bedLabel}</p>
      <p>Check-in: ${fmt(booking.checkIn)}</p>
      <p>Check-out: ${fmt(booking.checkOut)}</p>
    </div>
    <div class="box">
      <div class="box-title">Payment Details</div>
      <p>Method: <strong>${invoiceData.paymentMethod || '—'}</strong></p>
      <p>Paid On: <strong>${fmt(invoiceData.createdAt)}</strong></p>
      <p>Hotel: ${guestHouseName}</p>
      <p>Status: <strong>Checked Out</strong></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Description</th>
        <th class="right" style="width:140px">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>Booking Charges</td><td class="right">${currency(bookingCharges)}</td></tr>
      <tr><td>2</td><td>Extras / Add-ons</td><td class="right">${currency(invoiceData.extrasTotal)}</td></tr>
      ${taxRows}
    </tbody>
  </table>

  <div class="summary">
    <table class="summary-table">
      <tr><td>Subtotal</td><td class="right">${currency(invoiceData.bookingTotal)}</td></tr>
      <tr><td>Amount Paid</td><td class="right">${currency(invoiceData.amountPaid)}</td></tr>
      <tr class="grand-total"><td>Balance Due</td><td class="right">${currency(invoiceData.outstandingBalance)}</td></tr>
    </table>
  </div>

  <div class="footer">
    <span>Generated on ${fmt(new Date())}</span>
  </div>

  <script>window.onload = function () { window.print(); };<\/script>
</body>
</html>`);

    printWindow.document.close();
  };

  const guestName = (b) =>
    `${b.userId?.firstName || ''} ${b.userId?.lastName || ''}`.trim() || '—';

  const roomLabel = (b) => {
    if (Array.isArray(b.roomIds) && b.roomIds.length)
      return b.roomIds.map((r) => (r?.roomNumber ? `Room ${r.roomNumber}` : '')).filter(Boolean).join(', ') || '—';
    return '—';
  };

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Invoice List</h1>
        </div>
        <button
          className="btn-action view"
          onClick={() => fetchBookings(currentPage, search)}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="toolbar-row" style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="toolbar-select"
          placeholder="Search by name, phone or email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ padding: '6px 12px', minWidth: 260 }}
        />
        <button type="submit" className="btn-action view" disabled={loading}>Search</button>
        {searchInput && (
          <button type="button" className="btn-action reject" onClick={handleClear}>
            Clear
          </button>
        )}
      </form>

      {/* States */}
      {loading && <p style={{ color: '#64748b', padding: '12px 0' }}>Loading completed bookings…</p>}
      {!loading && error && <p style={{ color: '#dc2626', padding: '12px 0' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th className="center">#</th>
                  <th>Guest</th>
                  <th>Phone</th>
                  <th>Room / Bed</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Amount Paid</th>
                  <th>Balance Due</th>
                  <th className="center">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="table-empty">No completed bookings found.</td>
                  </tr>
                ) : (
                  bookings.map((b, i) => {
                    const idx = (currentPage - 1) * LIMIT + i + 1;
                    const inv = b.invoice || null;
                    const invData = inv?.invoiceData || {};
                    // Prefer normalized top-level fields from backend (new schema), fallback to invoiceData (old schema)
                    const amountPaid = inv != null
                      ? Number(inv.normPaidAmount ?? inv.paidAmount ?? inv.amountPaid ?? invData.amountPaid ?? 0)
                      : null;
                    const balance = inv != null
                      ? Number(inv.normOutstandingAmount ?? inv.outstandingAmount ?? invData.outstandingBalance ?? 0)
                      : null;
                    const hasInvoice = !!b.invoice;

                    return (
                      <tr key={b._id}>
                        <td className="center">{idx}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{guestName(b)}</div>
                          {(b.userId?.email) && (
                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                              {b.userId?.email}
                            </div>
                          )}
                        </td>
                        <td>{b.userId?.phone || '—'}</td>
                        <td>
                          {roomLabel(b)}
                          {b.bedId?.bedNumber ? ` / Bed ${b.bedId.bedNumber}` : ''}
                          {b.bedId?.bedType ? ` (${b.bedId.bedType})` : ''}
                        </td>
                        <td>{formatDate(b.checkIn)}</td>
                        <td>{formatDate(b.checkOut)}</td>
                        <td style={{ fontWeight: 600, color: '#15803d' }}>
                          {amountPaid !== null ? formatCurrency(amountPaid) : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: balance > 0 ? '#b45309' : '#15803d' }}>
                          {balance !== null ? formatCurrency(balance) : '—'}
                        </td>
                        <td className="center">
                          <button
                            title={hasInvoice ? 'Print invoice' : 'No invoice available'}
                            disabled={!hasInvoice || printingId === b._id}
                            onClick={() => handlePrintInvoice(b)}
                            style={{
                              width: 32,
                              height: 32,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              borderRadius: 6,
                              cursor: hasInvoice ? 'pointer' : 'not-allowed',
                              background: hasInvoice ? '#f0fdf4' : '#f1f5f9',
                              color: hasInvoice ? '#16a34a' : '#94a3b8',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              if (hasInvoice) {
                                e.currentTarget.style.background = '#16a34a';
                                e.currentTarget.style.color = '#fff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (hasInvoice) {
                                e.currentTarget.style.background = '#f0fdf4';
                                e.currentTarget.style.color = '#16a34a';
                              }
                            }}
                          >
                            {printingId === b._id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'il-spin 1s linear infinite' }}>
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect width="12" height="8" x="6" y="14" />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="pagination-row">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              >
                ← Prev
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
                <span style={{ marginLeft: 16, color: '#64748b' }}>
                  Showing {(currentPage - 1) * LIMIT + 1}–{Math.min(currentPage * LIMIT, totalCount)} of {totalCount}
                </span>
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes il-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InvoiceList;
