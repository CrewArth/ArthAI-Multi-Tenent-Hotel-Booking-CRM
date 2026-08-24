import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import '../styles/receiptPaymentModal.css';
import { printOutstandingReceipt } from '../utils/printInvoice';

const fmt = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

import { PAYMENT_METHODS, DEFAULT_PAYMENT_METHOD } from '../../common/paymentMethods.js';

export default function ReceiptPaymentModal({ receipt, onClose, onSuccess }) {
  const { bookingId, outstandingBalance, booking: receiptBooking } = receipt || {};
  const currentUser = useSelector((state) => state.auth?.user);

  const [booking, setBooking] = useState(receiptBooking || null);
  const [invoice, setInvoice] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(!receiptBooking);
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [paymentAmount, setPaymentAmount] = useState(String(outstandingBalance || ''));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [lastInvoice, setLastInvoice] = useState(null); // set after successful payment

  useEffect(() => {
    if (!bookingId) return;
    const load = async () => {
      try {
        setLoadingBooking(true);
        const [bookingRes, invoiceRes] = await Promise.allSettled([
          api.get(`/api/bookings/${bookingId}`),
          api.get(`/api/payments/booking/${bookingId}/invoice`),
        ]);
        if (bookingRes.status === 'fulfilled') setBooking(bookingRes.value.data?.booking || null);
        if (invoiceRes.status === 'fulfilled') {
          const inv = invoiceRes.value.data?.invoice || invoiceRes.value.data?.invoiceDoc?.invoiceData;
          setInvoice(inv || null);
        }
      } catch (err) {
        console.error('ReceiptPaymentModal load error:', err);
      } finally {
        setLoadingBooking(false);
      }
    };
    load();
  }, [bookingId]);

  const nights = useMemo(() => {
    if (!booking?.checkIn || !booking?.checkOut) return 0;
    const diff = new Date(booking.checkOut) - new Date(booking.checkIn);
    return diff > 0 ? Math.max(1, Math.ceil(diff / 86400000)) : 0;
  }, [booking]);

  const guestName = booking
    ? `${booking.userId?.firstName || ''}${booking.userId?.lastName ? ' ' + booking.userId.lastName : ''}`.trim() || '—'
    : '—';

  const totalBilled  = Number(invoice?.bookingTotal || outstandingBalance || 0);
  const totalPaid    = Number(invoice?.amountPaid || 0);
  const outstanding  = Number(outstandingBalance || 0);
  const payAmt       = Number(paymentAmount) || 0;
  const afterPayment = Math.max(0, outstanding - payAmt);
  const isValid      = payAmt > 0 && payAmt <= outstanding;

  const roomsLabel = useMemo(() => {
    if (!booking) return '—';
    const rooms = Array.isArray(booking.roomIds) ? booking.roomIds : [];
    return rooms.map((r) => (r?.roomNumber ? `Room ${r.roomNumber}` : '')).filter(Boolean).join(', ') || '—';
  }, [booking]);

  const handleSubmit = async () => {
    if (!isValid) { toast.error('Enter a valid amount (1 – outstanding balance).'); return; }
    try {
      setSubmitting(true);
      const updatedInvoice = {
        ...(invoice || {}),
        bookingId,
        amountPaid: totalPaid + payAmt,         // cumulative — stored in DB
        outstandingBalance: afterPayment,
        paymentMethod,
        note,
        createdAt: new Date().toISOString(),
        bookingDetails: booking,
      };
      await api.post('/api/payments', {
        bookingId, amountPaid: payAmt, paymentMethod,
        taxesTotal: invoice?.taxesTotal || 0,
        taxBreakdown: invoice?.taxBreakdown || [],
        invoiceId: invoice?.id || null,
        invoice: updatedInvoice, note,
        outstanding_payment: true,
      });
      // For printing: show only what was paid NOW, not the cumulative total
      const receiptInvoice = {
        ...updatedInvoice,
        amountPaid: payAmt,                     // this transaction only
        previouslyPaid: totalPaid,              // what was paid at checkout
        bookingTotal: invoice?.bookingTotal || 0,
        outstandingBalance: afterPayment,
      };
      setLastInvoice(receiptInvoice);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('ReceiptPaymentModal submit error:', err);
      toast.error(err.response?.data?.message || 'Unable to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rpm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rpm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="rpm-header">
          <h2 className="rpm-title">Record Payment</h2>
          <button className="rpm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Summary bar */}
        <div className="rpm-banner">
          <div className="rpm-banner-item">
            <span>Total Billed</span>
            <strong>{fmt(totalBilled)}</strong>
          </div>
          <div className="rpm-banner-divider" />
          <div className="rpm-banner-item">
            <span>Paid</span>
            <strong>{fmt(totalPaid)}</strong>
          </div>
          <div className="rpm-banner-divider" />
          <div className="rpm-banner-item">
            <span>Outstanding</span>
            <strong className="rpm-banner-outstanding">{fmt(outstanding)}</strong>
          </div>
        </div>

        {/* Tabs */}
        <div className="rpm-tabs">
          <button className={`rpm-tab${activeTab === 'details' ? ' rpm-tab--active' : ''}`} onClick={() => setActiveTab('details')}>
            Booking Details
          </button>
          <button className={`rpm-tab${activeTab === 'payment' ? ' rpm-tab--active' : ''}`} onClick={() => setActiveTab('payment')}>
            Record Payment
          </button>
        </div>

        {/* Body */}
        <div className="rpm-body">

          {/* Tab: Booking Details */}
          {activeTab === 'details' && (
            <div className="rpm-details">
              {loadingBooking ? (
                <p className="rpm-loading">Loading…</p>
              ) : !booking ? (
                <p className="rpm-error">Could not load booking details.</p>
              ) : (
                <>
                  <div className="rpm-section">
                    <h3 className="rpm-section-title">Guest</h3>
                    <div className="rpm-grid">
                      <div className="rpm-field"><span>Name</span><strong>{guestName}</strong></div>
                      <div className="rpm-field"><span>Phone</span><strong>{booking.userId?.phone || '—'}</strong></div>
                      <div className="rpm-field"><span>Email</span><strong>{booking.userId?.email || '—'}</strong></div>
                      {booking.userId?.nationality && <div className="rpm-field"><span>Nationality</span><strong>{booking.userId.nationality}</strong></div>}
                      {booking.userId?.identityType && <div className="rpm-field"><span>ID Type</span><strong>{booking.userId.identityType}</strong></div>}
                      {booking.identityNumber && <div className="rpm-field"><span>ID Number</span><strong>{booking.identityNumber}</strong></div>}
                    </div>
                  </div>

                  <div className="rpm-section">
                    <h3 className="rpm-section-title">Stay</h3>
                    <div className="rpm-grid">
                      <div className="rpm-field"><span>Room(s)</span><strong>{roomsLabel}</strong></div>
                      {booking.bedId?.bedNumber && <div className="rpm-field"><span>Bed</span><strong>Bed {booking.bedId.bedNumber} · {booking.bedId.bedType}</strong></div>}
                      <div className="rpm-field"><span>Check In</span><strong>{fmtDate(booking.checkIn)}</strong></div>
                      <div className="rpm-field"><span>Check Out</span><strong>{fmtDate(booking.checkOut)}</strong></div>
                      <div className="rpm-field"><span>Duration</span><strong>{nights} night{nights !== 1 ? 's' : ''}</strong></div>
                      <div className="rpm-field"><span>Status</span><strong><span className={`rpm-status rpm-status--${booking.status}`}>{booking.status}</span></strong></div>
                    </div>
                  </div>

                  {invoice && (
                    <div className="rpm-section">
                      <h3 className="rpm-section-title">Billing</h3>
                      <div className="rpm-bill-rows">
                        {invoice.bookingTotal != null && (
                          <div className="rpm-bill-row"><span>Room Charges</span><span>{fmt(invoice.bookingTotal - (invoice.taxesTotal || 0) - (invoice.extrasTotal || 0))}</span></div>
                        )}
                        {invoice.extrasTotal > 0 && (
                          <div className="rpm-bill-row"><span>Extras</span><span>{fmt(invoice.extrasTotal)}</span></div>
                        )}
                        {invoice.taxBreakdown?.length > 0 && invoice.taxBreakdown.map((t, i) => (
                          <div key={i} className="rpm-bill-row rpm-bill-row--tax"><span>{t.name} ({t.percentage}%)</span><span>{fmt(t.amount)}</span></div>
                        ))}
                        {invoice.taxesTotal > 0 && (
                          <div className="rpm-bill-row"><span>Taxes</span><span>{fmt(invoice.taxesTotal)}</span></div>
                        )}
                        <div className="rpm-bill-row rpm-bill-row--total"><span>Total</span><span>{fmt(totalBilled)}</span></div>
                        <div className="rpm-bill-row rpm-bill-row--paid"><span>Paid</span><span>{fmt(totalPaid)}</span></div>
                        <div className="rpm-bill-row rpm-bill-row--outstanding"><span>Outstanding</span><span>{fmt(outstanding)}</span></div>
                      </div>
                    </div>
                  )}

                  {booking.familyMembers?.length > 0 && (
                    <div className="rpm-section">
                      <h3 className="rpm-section-title">Family Members ({booking.familyMembers.length})</h3>
                      <div className="rpm-family-list">
                        {booking.familyMembers.map((m, i) => (
                          <div key={i} className="rpm-family-item">
                            <strong>{m.name}</strong>
                            <span>{m.relation}{m.age != null ? `, Age ${m.age}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {booking.specialRequests && (
                    <div className="rpm-section">
                      <h3 className="rpm-section-title">Special Requests</h3>
                      <p className="rpm-note">{booking.specialRequests}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab: Record Payment */}
          {activeTab === 'payment' && (
            <div className="rpm-payment">
              <div className="rpm-section">
                <h3 className="rpm-section-title">Payment Method</h3>
                <select
                  className="rpm-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="rpm-section">
                <h3 className="rpm-section-title">Amount</h3>
                <div className="rpm-amount-wrap">
                  <span className="rpm-amount-prefix">₹</span>
                  <input
                    type="number"
                    className="rpm-amount-input"
                    min="1"
                    max={outstanding}
                    step="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Max ${outstanding}`}
                    autoFocus
                  />
                  <button type="button" className="rpm-amount-full" onClick={() => setPaymentAmount(String(outstanding))}>
                    Full
                  </button>
                </div>
                {paymentAmount && !isValid && <p className="rpm-input-error">Amount must be between ₹1 and {fmt(outstanding)}.</p>}
                {isValid && afterPayment === 0 && <p className="rpm-input-success">This will fully clear the outstanding balance.</p>}
                {isValid && afterPayment > 0 && <p className="rpm-input-info">Balance remaining: {fmt(afterPayment)}</p>}
              </div>

              <div className="rpm-section">
                <h3 className="rpm-section-title">Note <span className="rpm-optional">(optional)</span></h3>
                <textarea
                  className="rpm-note-input"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Internal note"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rpm-footer">
          <button className="rpm-footer-btn rpm-footer-btn--secondary" onClick={onClose}>Cancel</button>
          {lastInvoice && (
            <button
              className="rpm-footer-btn rpm-footer-btn--secondary"
              onClick={() => {
                if (!printOutstandingReceipt(booking, lastInvoice, { eSignatureUrl: currentUser?.eSignatureUrl }))
                  toast.error('Pop-up blocked. Please allow pop-ups for this site.');
              }}
            >
              Print Receipt
            </button>
          )}
          {activeTab === 'details' ? (
            <button className="rpm-footer-btn rpm-footer-btn--primary" onClick={() => setActiveTab('payment')}>
              Proceed to Payment
            </button>
          ) : (
            <button className="rpm-footer-btn rpm-footer-btn--primary" onClick={handleSubmit} disabled={!isValid || submitting}>
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
