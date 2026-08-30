import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { getCurrentMonthDateRange } from '../utils/dateUtils';
import '../styles/todayBookings.css';

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTwoDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  return getLocalDate(date);
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const isSameDay = (left, right) => {
  const first = new Date(left);
  const second = new Date(right);

  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) {
    return false;
  }

  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
};

const isCheckoutEligible = (booking) => {
  if (!booking?.checkOut) return false;
  if (['cancelled', 'rejected'].includes(booking?.status)) return false;
  return isSameDay(booking.checkOut, new Date());
};

export default function TodayBookings() {
  const today = getLocalDate();
  const { fromDate: monthStart, toDate: monthEnd } = getCurrentMonthDateRange();
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(monthEnd);
  const [appliedFilter, setAppliedFilter] = useState({ startDate: monthStart, endDate: monthEnd });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const rowsPerPage = 10;

  // Cancel confirmation modal state
  const [cancelTarget, setCancelTarget] = useState(null); // booking to cancel
  const [cancelling, setCancelling] = useState(false);

  // If the admin has an assigned guest house, scope all queries to it
  const assignedGuestHouse = useSelector((state) => state.auth.user?.assignedGuestHouseId);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');
        const params = {
          ...appliedFilter,
          page: currentPage,
          limit: rowsPerPage,
        };
        if (assignedGuestHouse) {
          // assignedGuestHouse could be an object or just the guestHouseId string
          params.guestHouseId = assignedGuestHouse.guestHouseId || assignedGuestHouse;
        }
        const response = await api.post('/api/bookings/list', params);
        setBookings(response.data.bookings || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.totalCount || 0);
      } catch (requestError) {
        console.error('Error fetching dashboard bookings:', requestError);
        setError('Unable to load bookings for this date range.');
        setBookings([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [appliedFilter, assignedGuestHouse, currentPage]);

  const applyFilter = () => {
    if (!fromDate || !toDate || fromDate > toDate) {
      setError('Select a valid date range.');
      return;
    }

    setCurrentPage(1);
    setAppliedFilter({ startDate: fromDate, endDate: toDate });
  };

  const showToday = () => {
    const twoDaysAgo = getTwoDaysAgo();
    setFromDate(twoDaysAgo);
    setToDate(today);
    setCurrentPage(1);
    setAppliedFilter({ startDate: twoDaysAgo, endDate: today });
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      await api.patch(`/api/bookings/${cancelTarget._id}/cancel`);
      setBookings((prev) =>
        prev.map((b) => b._id === cancelTarget._id ? { ...b, status: 'cancelled' } : b)
      );
      setCancelTarget(null);
      window.dispatchEvent(new CustomEvent('bookingStatusChanged'));
    } catch (err) {
      console.error('Error cancelling booking:', err);
    } finally {
      setCancelling(false);
    }
  };

  const handleViewInvoice = async (booking) => {
    if (!booking?.isCheckedOut) return;

    try {
      const response = await api.get(`/api/payments/booking/${booking._id}/invoice`);
      const invoice = response.data?.invoice || response.data?.invoiceDoc?.invoiceData;

      if (!invoice) {
        toast.error('Invoice is not available for this booking yet.');
        return;
      }

      navigate('/admin/invoice', { state: { invoice } });
    } catch (err) {
      console.error('Error fetching invoice:', err);
      toast.error('Unable to load invoice right now.');
    }
  };

  return (
    <section className="today-bookings" aria-labelledby="today-bookings-title">
      {/* ── Cancel confirmation modal ── */}
      {cancelTarget && (
        <div className="tb-modal-backdrop" onClick={() => setCancelTarget(null)}>
          <div className="tb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="tb-modal-title">Cancel Booking?</h3>
            <p className="tb-modal-body">
              Are you sure you want to cancel the booking?
              <br />This action cannot be undone.
            </p>
            <div className="tb-modal-actions">
              <button
                className="tb-modal-btn tb-modal-btn--cancel"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                No
              </button>
              <button
                className="tb-modal-btn tb-modal-btn--confirm"
                onClick={handleCancelConfirm}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="today-bookings-header">
        <div>
          <h2 id="today-bookings-title" style={{fontWeight: "bold", marginBottom: "30px"}}>
            Today&apos;s Bookings <span style={{ color: '#6c757d', fontSize: '0.8em', fontWeight: 'normal', marginLeft: '8px' }}>({formatDate(today)})</span>
          </h2>
        </div>

        <div className="today-bookings-filters">
          <label>
            From
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <button type="button" onClick={applyFilter}>Filter</button>
          <button type="button" className="today-bookings-secondary" onClick={showToday}>Today</button>
        </div>
      </div>

      {loading && <p className="today-bookings-message">Loading bookings…</p>}
      {!loading && error && <p className="today-bookings-error">{error}</p>}

      {!loading && !error && (
        <div className="today-bookings-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Hotel</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Room / Bed</th>
                <th>Status</th>
                <th>Checkout</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="today-bookings-empty">No bookings found for this date range.</td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const isCancelled = booking.status === 'cancelled';

                  return (
                    <tr key={booking._id}>
                      <td>{`${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || '—'}</td>
                      <td>{booking.guestHouseId?.guestHouseName || '—'}</td>
                      <td>{formatDate(booking.checkIn)}</td>
                      <td>{formatDate(booking.checkOut)}</td>
                      <td>
                        {Array.isArray(booking.roomIds) && booking.roomIds.length ? booking.roomIds.map(r => r?.roomNumber ? `Room ${r.roomNumber}` : '').filter(Boolean).join(', ') || '—' : '—'}
                        {booking.bedId?.bedNumber ? ` / Bed ${booking.bedId.bedNumber}` : ''}
                      </td>
                      <td><span className={`today-bookings-status ${booking.status}`}>{booking.status}</span></td>
                      <td>
                        <button
                          type="button"
                          className="tb-checkout-btn"
                          onClick={() => {
                            navigate('/admin/checkout', { state: { bookingId: booking._id } });
                          }}
                          disabled={!isCheckoutEligible(booking) || booking.isCheckedOut}
                          title={booking.isCheckedOut ? 'Already checked out' : isCheckoutEligible(booking) ? 'Proceed to payment' : 'Checkout available on the checkout date'}
                        >
                          {booking.isCheckedOut ? 'Checked out' : 'Checkout'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="tb-action-btn"
                            onClick={() => {
                              if (isCancelled || booking.isCheckedOut) return;
                              navigate('/admin/book-room', { state: { bookingId: booking._id } });
                            }}
                            title={isCancelled ? 'Cannot edit a cancelled booking' : booking.isCheckedOut ? 'Cannot edit a checked-out booking' : 'Edit booking'}
                            disabled={isCancelled || booking.isCheckedOut}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>

                          {booking.isCheckedOut && (
                            <button
                              className="tb-invoice-btn"
                              onClick={() => handleViewInvoice(booking)}
                              title="View invoice"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          )}

                          {booking.status !== 'cancelled' && (
                            <button
                              className="tb-cancel-btn"
                              onClick={() => {
                                if (booking.isCheckedOut) return;
                                setCancelTarget(booking);
                              }}
                              disabled={booking.isCheckedOut}
                              title={booking.isCheckedOut ? 'Cannot cancel a checked-out booking' : 'Cancel booking'}
                              style={booking.isCheckedOut ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalCount > 0 && (
            <div className="today-bookings-pagination">
              <button
                type="button"
                className="today-bookings-page-btn"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                « First
              </button>
              <button
                type="button"
                className="today-bookings-page-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Prev
              </button>
              <span className="today-bookings-page-info">
                Page {currentPage} of {totalPages}
                <span style={{ marginLeft: '10px', color: '#6b7280', fontSize: '0.85em', fontWeight: 500 }}>
                  ({(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, totalCount)} of {totalCount})
                </span>
              </span>
              <button
                type="button"
                className="today-bookings-page-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
              <button
                type="button"
                className="today-bookings-page-btn"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last »
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
