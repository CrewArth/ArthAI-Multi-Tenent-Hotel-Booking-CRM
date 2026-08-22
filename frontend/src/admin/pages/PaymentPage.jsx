import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const steps = ['Booking Summary', 'Extras / Charges', 'Payment'];
import { PAYMENT_METHODS as paymentMethods, DEFAULT_PAYMENT_METHOD } from '../../common/paymentMethods.js';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
};

const currency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

const compressLogo = (dataUrl, maxSize = 120) =>
  new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png', 0.85));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });

const PaymentPage = ({ isOpen = false, onClose, bookingId: bookingIdProp, onInvoiceGenerated, initialPaymentAmount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = bookingIdProp || location.state?.bookingId;

  const [activeStep, setActiveStep] = useState(1);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [extras, setExtras] = useState([{ name: '', quantity: '1', unitPrice: '0', total: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [paymentAmount, setPaymentAmount] = useState(initialPaymentAmount ? String(initialPaymentAmount) : '');
  const [taxes, setTaxes] = useState([]);
  const logoUrl = useSelector((state) => state.siteSettings.logoUrl);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPaymentAmount(initialPaymentAmount ? String(initialPaymentAmount) : '');
  }, [initialPaymentAmount]);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking was selected for checkout.');
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/api/bookings/${bookingId}`);
        setBooking(response.data?.booking || null);
      } catch (err) {
        console.error(err);
        setError('Unable to load booking details for payment.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const nights = useMemo(() => {
    if (!booking?.checkIn || !booking?.checkOut) return 0;
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    const diff = end.getTime() - start.getTime();
    return diff > 0 ? Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24))) : 0;
  }, [booking]);

  const nightlyRate = 2000;
  const roomCharges = nights * nightlyRate;
  const subtotal = roomCharges;

  const extrasTotal = useMemo(() => extras.reduce((sum, item) => sum + Number(item.total || 0), 0), [extras]);
  // Taxes: fetch active taxes and apply on (subtotal + extras)
  const taxableBase = subtotal + extrasTotal;
  const taxBreakdown = useMemo(() => {
    if (!Array.isArray(taxes) || taxes.length === 0) return [];
    return taxes.map((t) => ({
      _id: t._id,
      name: t.name,
      percentage: Number(t.percentage) || 0,
      amount: ((Number(t.percentage) || 0) / 100) * taxableBase,
    }));
  }, [taxes, taxableBase]);

  const taxesTotal = useMemo(() => taxBreakdown.reduce((s, i) => s + (i.amount || 0), 0), [taxBreakdown]);
  const bookingTotal = subtotal + extrasTotal + taxesTotal;
  const paymentAmountValue = Number(paymentAmount || 0);
  const remainingBalance = Math.max(0, bookingTotal - paymentAmountValue);
  const isPaymentValid = paymentAmountValue > 0 && paymentAmountValue <= bookingTotal;

  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        const res = await api.post('/api/taxes/list');
        const active = (res.data.taxes || []).filter((t) => t.isActive);
        setTaxes(active);
      } catch (err) {
        console.error('Unable to fetch taxes', err);
        setTaxes([]);
      }
    };
    fetchTaxes();
  }, []);

  const updateExtra = (index, field, value) => {
    const nextExtras = [...extras];
    nextExtras[index][field] = value;

    const quantity = Number(nextExtras[index].quantity || 0);
    const unitPrice = Number(nextExtras[index].unitPrice || 0);
    nextExtras[index].total = quantity * unitPrice;

    setExtras(nextExtras);
  };

  const addExtra = () => {
    setExtras([...extras, { name: '', quantity: '1', unitPrice: '0', total: 0 }]);
  };

  const removeExtra = (index) => {
    if (extras.length === 1) {
      setExtras([{ name: '', quantity: '1', unitPrice: '0', total: 0 }]);
      return;
    }

    setExtras(extras.filter((_, itemIndex) => itemIndex !== index));
  };

  const submitPayment = async () => {
    if (!isPaymentValid) {
      toast.error('Please enter a valid payment amount that does not exceed the outstanding balance.');
      return;
    }

    try {
      setSubmitting(true);
      const invoice = {
        id: `INV-${Date.now()}`,
        bookingId,
        guestName: booking?.userId?.firstName || booking?.fullName || 'Guest',
        bookingDate: booking?.checkIn || new Date().toISOString(),
        amountPaid: paymentAmountValue,
        extrasTotal,
        taxesTotal,
        taxBreakdown,
        bookingTotal,
        outstandingBalance: remainingBalance,
        paymentMethod,
        createdAt: new Date().toISOString(),
        bookingDetails: booking,
      };

      // Create payment record in backend (marks booking as checked out)
      try {
        await api.post('/api/payments', {
          bookingId,
          amountPaid: paymentAmountValue,
          paymentMethod,
          taxesTotal,
          taxBreakdown,
          invoiceId: invoice.id,
          invoice: invoice,
        });
        // update local booking state to reflect checked-out
        setBooking((b) => ({ ...(b || {}), isCheckedOut: true }));
      } catch (err) {
        console.error('Failed to save payment record:', err);
        toast.warn('Payment recorded locally but failed to persist to server.');
      }

      const compressedLogo = await compressLogo(logoUrl);
      const response = await api.post(
        '/api/reports/invoice/generate',
        { invoice, logoUrl: compressedLogo },
        { responseType: 'blob' }
      );

      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.error || 'Could not generate invoice PDF.');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Invoice PDF generated and downloaded successfully.');
      if (onInvoiceGenerated) {
        onInvoiceGenerated(invoice);
      } else if (!isOpen) {
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1200);
      }
    } catch (err) {
      console.error(err);

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          toast.error(json.error || 'Could not generate invoice PDF.');
        } catch {
          toast.error('Could not generate invoice PDF.');
        }
      } else {
        toast.error(err.message || 'Could not complete payment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = () => {
    if (activeStep < steps.length) {
      setActiveStep((step) => Math.min(steps.length, step + 1));
      return;
    }

    submitPayment();
  };

  const renderStepContent = () => {
    if (loading) {
      return <p style={{ color: '#64748b' }}>Loading booking details…</p>;
    }

    if (error || !booking) {
      return <p style={{ color: '#dc2626' }}>{error || 'Booking details could not be loaded.'}</p>;
    }

    if (activeStep === 1) {
      return (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Guest Name', value: `${booking.userId?.firstName || '—'} ${booking.userId?.lastName || ''}`.trim() || '—' },
              { label: 'Email', value: booking.userId?.email || '—' },
              { label: 'Phone', value: booking.userId?.phone || '—' },
              { label: 'Hotel', value: booking.guestHouseId?.guestHouseName || booking.guestHouseId || '—' },
              { label: 'Room / Bed', value: `${booking.roomId?.roomNumber ? `Room ${booking.roomId.roomNumber}` : '—'}${booking.bedId?.bedNumber ? ` / Bed ${booking.bedId.bedNumber}` : ''}` },
              { label: 'Check In', value: formatDate(booking.checkIn) },
              { label: 'Check Out', value: formatDate(booking.checkOut) },
              { label: 'Guests', value: (booking.familyMembers?.length || 0) + 1 },
              { label: 'Nights', value: nights },
              { label: 'Room Charges', value: currency(roomCharges) },
              { label: 'Taxes', value: currency(taxesTotal) },
              { label: 'Booking Subtotal', value: currency(subtotal) },
            ].map((item) => (
              <div key={item.label} style={{ padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '4px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeStep === 2) {
      return (
        <div style={{ display: 'grid', gap: '12px' }}>
          {extras.map((item, index) => (
            <div key={index} style={extraCardStyle}>
              <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1.4fr 0.7fr 0.9fr auto', alignItems: 'end' }}>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Extra / Activity</span>
                  <input value={item.name} onChange={(event) => updateExtra(index, 'name', event.target.value)} placeholder="Extra Bed / Service" style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Qty</span>
                  <input type="number" min="1" value={item.quantity} onChange={(event) => updateExtra(index, 'quantity', event.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Unit Price</span>
                  <input type="number" min="0" value={item.unitPrice} onChange={(event) => updateExtra(index, 'unitPrice', event.target.value)} style={inputStyle} />
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Total</span>
                  <strong style={{ fontSize: '0.95rem' }}>{currency(item.total || 0)}</strong>
                  <button type="button" onClick={() => removeExtra(index)} style={removeButtonStyle}>Remove</button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addExtra} style={secondaryButtonStyle}>+ Add Extra Item</button>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'start' }}>
        {/* Left Column: Summary & Taxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ ...summaryCardStyle, borderLeft: '4px solid #2563eb', padding: '10px 14px' }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Total Due</span>
              <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{currency(bookingTotal)}</strong>
            </div>
            <div style={{ ...summaryCardStyle, borderLeft: '4px solid #dc2626', padding: '10px 14px' }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Remaining Balance</span>
              <strong style={{ fontSize: '1.25rem', color: '#dc2626' }}>{currency(remainingBalance)}</strong>
            </div>
          </div>

          {taxBreakdown.length > 0 && (
            <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Tax Breakdown</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {taxBreakdown.map((t) => (
                  <div key={t._id} style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>{t.name} ({t.percentage}%): </span>
                    <strong style={{ color: '#0f172a' }}>{currency(t.amount)}</strong>
                  </div>
                ))}
                <div style={{ background: '#fff7ed', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde2bf', fontSize: '0.8rem' }}>
                  <span style={{ color: '#975a16' }}>Total Taxes: </span>
                  <strong style={{ color: '#975a16' }}>{currency(taxesTotal)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Payment Method & Amount */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
              Select Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: paymentMethod === method ? '#2563eb' : '#ffffff',
                    color: paymentMethod === method ? '#ffffff' : '#334155',
                    borderColor: paymentMethod === method ? '#2563eb' : '#cbd5e1',
                  }}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Payment Amount</span>
            <input
              type="number"
              min="0"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              style={inputStyle}
            />
            {!isPaymentValid && paymentAmount && (
              <small style={{ color: '#dc2626', fontSize: '0.78rem' }}>
                Payment amount cannot exceed the outstanding balance.
              </small>
            )}
          </label>
        </div>
      </div>
    );
  };

  const content = (
    <div style={{ padding: '16px 20px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: '1.4rem', fontWeight: 700 }}>Checkout / Payment</h2>
        </div>
        {isOpen && onClose ? (
          <button type="button" onClick={onClose} style={backButtonStyle}>✕ Close</button>
        ) : (
          <button type="button" onClick={() => navigate(-1)} style={backButtonStyle}>← Back</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isDone = stepNumber < activeStep;
          return (
            <div key={label} style={{ ...stepPillStyle, background: isActive ? '#2563eb' : isDone ? '#dbeafe' : '#f8fafc', color: isActive || isDone ? '#fff' : '#334155' }}>
              <strong>{stepNumber}</strong> {label}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)', border: '1px solid #e2e8f0' }}>
          {renderStepContent()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setActiveStep((step) => Math.max(1, step - 1))} disabled={activeStep === 1} style={navButtonStyle}>
            Previous
          </button>
          <button type="button" onClick={handleAction} disabled={submitting || (activeStep === steps.length && !isPaymentValid)} style={primaryButtonStyle}>
            {activeStep < steps.length ? 'Next' : submitting ? 'Processing…' : 'Submit Payment'}
          </button>
        </div>
      </div>
    </div>
  );

  if (isOpen) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.62)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  zIndex: 2000,
};

const modalStyle = {
  width: 'min(1100px, 100%)',
  maxHeight: '92vh',
  overflowY: 'auto',
  background: '#f8fafc',
  borderRadius: '18px',
  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)',
};

const inputStyle = { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', width: '100%' };
const primaryButtonStyle = { padding: '9px 18px', border: 'none', borderRadius: '8px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' };
const navButtonStyle = { padding: '9px 18px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' };
const backButtonStyle = { padding: '6px 12px', border: 'none', borderRadius: '6px', background: '#e2e8f0', color: '#0f172a', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' };
const secondaryButtonStyle = { padding: '8px 12px', border: '1px dashed #2563eb', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600, width: 'fit-content', fontSize: '0.82rem' };
const extraCardStyle = { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', background: '#f8fafc' };
const removeButtonStyle = { padding: '4px 8px', border: 'none', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: '0.78rem' };
const summaryCardStyle = { padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px' };
const stepPillStyle = { padding: '6px 12px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600 };

export default PaymentPage;
