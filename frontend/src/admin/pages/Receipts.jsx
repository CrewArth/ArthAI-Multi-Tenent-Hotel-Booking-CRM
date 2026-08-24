import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import ReceiptPaymentModal from '../components/ReceiptPaymentModal';
import { printOutstandingReceipt } from '../utils/printInvoice';
import { getCurrentMonthDateRange } from '../utils/dateUtils';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
};

const Receipts = () => {
  const { fromDate: defaultFrom, toDate: defaultTo } = getCurrentMonthDateRange();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  // Applied filters (committed on Search / Reset)
  const [applied, setApplied] = useState({ search: '', fromDate: defaultFrom, toDate: defaultTo, paid: false });
  const [paid, setPaid] = useState(false);

  const fetchReceipts = async (filters = applied) => {
    setLoading(true);
    setError('');
    try {
      const body = {};
      if (filters.search)   body.search   = filters.search;
      if (filters.fromDate) body.fromDate  = filters.fromDate;
      if (filters.toDate)   body.toDate    = filters.toDate;
      if (filters.paid)     body.paid      = true;

      const response = await api.post('/api/payments/outstanding', body);
      setReceipts(response.data?.receipts || []);
    } catch (err) {
      console.error('Error fetching outstanding receipts:', err);
      setError('Unable to load outstanding receipts.');
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchReceipts({ search: '', fromDate: defaultFrom, toDate: defaultTo });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const next = { search: searchInput, fromDate, toDate, paid };
    setApplied(next);
    fetchReceipts(next);
  };

  const handleReset = () => {
    const { fromDate: dFrom, toDate: dTo } = getCurrentMonthDateRange();
    setSearchInput('');
    setFromDate(dFrom);
    setToDate(dTo);
    setPaid(false);
    const next = { search: '', fromDate: dFrom, toDate: dTo, paid: false };
    setApplied(next);
    fetchReceipts(next);
  };

  const handleTogglePaid = () => {
    const next = { ...applied, search: searchInput, fromDate, toDate, paid: !paid };
    setPaid(!paid);
    setApplied(next);
    fetchReceipts(next);
  };

  const handlePaymentSuccess = () => {
    setSelectedReceipt(null);
    fetchReceipts(applied);
    toast.success('Outstanding payment recorded successfully.');
  };

  const hasActiveFilter = applied.search || applied.fromDate || applied.toDate || applied.paid;

  return (
    <div className="page-root">
      {selectedReceipt && (
        <ReceiptPaymentModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Outstanding Payments</h1>
        </div>
        <button
          className="btn-action view"
          onClick={() => fetchReceipts(applied)}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Filter bar */}
      <form onSubmit={handleSearch} className="toolbar-row" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <input
          type="text"
          className="toolbar-select"
          placeholder="Search by name, phone or email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ padding: '6px 12px', minWidth: 220 }}
        />

        <span className="toolbar-label">From:</span>
        <input
          type="date"
          className="toolbar-select"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{ padding: '6px 10px' }}
        />

        <span className="toolbar-label">To:</span>
        <input
          type="date"
          className="toolbar-select"
          value={toDate}
          min={fromDate || undefined}
          onChange={(e) => setToDate(e.target.value)}
          style={{ padding: '6px 10px' }}
        />

        <button type="submit" className="btn-action view" disabled={loading}>
          Search
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={paid}
            onChange={handleTogglePaid}
            style={{ width: 15, height: 15, cursor: 'pointer' }}
          />
          Is Paid
        </label>
        {hasActiveFilter && (
          <button type="button" className="btn-action reject" onClick={handleReset}>
            Reset
          </button>
        )}
      </form>

      {/* States */}
      {loading && <p style={{ color: '#64748b' }}>Loading outstanding receipts…</p>}
      {!loading && error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {!loading && !error && (
        <div className="table-scroll">
          <table className="data-table" style={{ minWidth: 780 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Guest</th>
                <th>Check In</th>
                <th>{paid ? 'Amount Paid' : 'Amount Due'}</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    {hasActiveFilter
                      ? `No ${paid ? 'paid' : 'outstanding'} payments match your filters.`
                      : `No ${paid ? 'paid' : 'outstanding'} payments found.`}
                  </td>
                </tr>
              ) : (
                receipts.map((receipt, i) => {
                  const booking = receipt.booking || {};
                  const guestName =
                    `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || '—';
                  const amountDue  = Number(receipt.outstandingBalance || 0);
                  const inv        = receipt.invoiceData || {};
                  const totalBill  = Number(inv.bookingTotal || 0);
                  const prevPaid   = Number(inv.previouslyPaid || 0);
                  // For PAID mode: inv.amountPaid is already this transaction only (set by backend's $project)
                  const amountPaidThisTransaction = Number(inv.amountPaid || 0);

                  return (
                    <tr key={receipt._id}>
                      <td className="center">{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{guestName}</div>
                        {booking.userId?.email && (
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {booking.userId.email}
                          </div>
                        )}
                        {booking.userId?.phone && (
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {booking.userId?.phone}
                          </div>
                        )}
                      </td>
                      <td>{formatDate(booking.checkIn)}</td>
                      <td style={{ fontWeight: 700, color: paid ? '#15803d' : '#b45309' }}>
                        {paid ? formatCurrency(amountPaidThisTransaction) : formatCurrency(amountDue)}
                      </td>
                      <td>{formatDate(receipt.createdAt)}</td>
                      <td>
                        <span className={`badge ${paid ? 'approved' : 'pending'}`}>
                          {paid ? 'Paid' : 'Outstanding'}
                        </span>
                      </td>
                      <td>
                        {paid ? (
                          <button
                            className="tb-invoice-btn"
                            title="View invoice"
                            style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', cursor: 'pointer' }}
                            onClick={() => {
                              const invData = receipt.invoiceData;
                              if (!invData) { toast.error('No invoice available.'); return; }
                              const receiptData = {
                                ...invData,
                                amountPaid: amountPaidThisTransaction,
                                previouslyPaid: prevPaid,
                                bookingTotal: totalBill,
                                outstandingBalance: amountDue,
                              };
                              if (!printOutstandingReceipt(booking, receiptData))
                                toast.error('Pop-up blocked. Please allow pop-ups for this site.');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 6 2 18 2 18 9" />
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                              <rect width="12" height="8" x="6" y="14" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            className="btn-action view"
                            onClick={() => setSelectedReceipt(receipt)}
                          >
                            Receive Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Receipts;
