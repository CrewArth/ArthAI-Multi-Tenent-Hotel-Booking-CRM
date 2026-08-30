import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { DataTable } from '../components/DataTable';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import ReceiptPaymentModal from '../../admin/components/ReceiptPaymentModal';
import '../styles/hotelAdminBookings.css';

const LIMIT = 10;

export const HotelAdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

  const fetchBookings = useCallback(async (page = currentPage, status = statusFilter, searchTerm = search) => {
    setLoading(true);
    try {
      const res = await api.post('/api/hotel-admin/bookings', {
        page,
        limit: LIMIT,
        status: status !== 'all' ? status : undefined,
        search: searchTerm.trim() || undefined,
      });
      setBookings(res.data?.bookings || []);
      setTotalPages(res.data?.totalPages || 1);
      setCurrentPage(res.data?.currentPage || page);
      setTotalCount(res.data?.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      toast.error(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, search]);

  useEffect(() => {
    fetchBookings(1, statusFilter, search);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings(1, statusFilter, search);
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    fetchBookings(page, statusFilter, search);
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (!window.confirm(`Are you sure you want to change this booking status to "${newStatus}"?`)) return;
    try {
      await api.patch(`/api/hotel-admin/bookings/${bookingId}/status`, { status: newStatus });
      toast.success(`Booking status updated to ${newStatus}`);
      fetchBookings(currentPage, statusFilter, search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update booking status');
    }
  };

  const columns = [
    {
      header: 'Booking ID',
      render: (b) => (
        <span style={{ fontWeight: 700, color: 'var(--ha-text-main)' }}>
          {b.bookingId || b._id?.substring(0, 8)}
        </span>
      ),
    },
    {
      header: 'Guest Details',
      render: (b) => {
        const guestName = `${b.userId?.firstName || ''} ${b.userId?.lastName || ''}`.trim() || 'Guest';
        return (
          <div className="ha-bookings-user-cell">
            <div className="ha-bookings-user-name">{guestName}</div>
            <div className="ha-bookings-user-phone">{b.userId?.phone || ''}</div>
            <div className="ha-bookings-user-email">{b.userId?.email || ''}</div>
          </div>
        );
      },
    },
    {
      header: 'Rooms / Bed',
      render: (b) => {
        const roomStr = b.roomIds?.map((r) => `Room ${r.roomNumber}`).join(', ') || '—';
        const bedStr = b.bedId ? `Bed ${b.bedId.bedNumber}` : null;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ha-text-main)' }}>{roomStr}</div>
            {bedStr && <div style={{ fontSize: '11.5px', color: 'var(--ha-text-muted)' }}>{bedStr}</div>}
          </div>
        );
      },
    },
    {
      header: 'Stay Dates',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 600 }}>{formatDate(b.checkIn)}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--ha-text-muted)' }}>to {formatDate(b.checkOut)}</div>
        </div>
      ),
    },
    {
      header: 'Financials',
      render: (b) => {
        const balance = Number(b.outstandingBalance || 0);
        return (
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ha-text-main)' }}>
              {formatCurrency(b.bookingTotal || b.amountPaid)}
            </div>
            {balance > 0 ? (
              <div className="ha-bookings-due">Due: {formatCurrency(balance)}</div>
            ) : (
              <div className="ha-bookings-paid">Paid in full</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      render: (b) => (
        <span className={`ha-badge ${getStatusBadgeClass(b.status)}`}>
          {b.status || 'Pending'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (b) => {
        const balance = Number(b.outstandingBalance || 0);
        const isCheckedIn = b.status === 'checked-in';
        const isCancelled = b.status === 'cancelled' || b.status === 'rejected';

        return (
          <div className="ha-bookings-actions">
            {isCheckedIn && (
              <button
                onClick={() => handleUpdateStatus(b._id, 'checked-out')}
                className="ha-btn ha-btn--primary ha-btn--sm"
                title="Check-out guest"
              >
                Check-Out
              </button>
            )}

            {balance > 0 && !isCancelled && (
              <button
                onClick={() => setSelectedBookingForPayment(b)}
                className="ha-btn ha-btn--sm"
                style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', color: '#db2777' }}
                title="Collect Payment"
              >
                Pay Due
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="ha-page-container">
      {/* Header Bar */}
      <div className="ha-page-header">
        <h1 className="ha-page-title">All Bookings List</h1>

        <div className="ha-header-actions">
          <button
            onClick={() => fetchBookings(currentPage, statusFilter, search)}
            className="ha-btn ha-btn--secondary"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="ha-filter-bar">
        <form onSubmit={handleSearchSubmit} className="ha-search-wrapper" style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} className="ha-search-icon" />
            <input
              type="text"
              placeholder="Search by guest name, email, phone, or booking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ha-search-input"
            />
          </div>
          <button type="submit" className="ha-btn ha-btn--secondary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ha-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={14} /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ha-select"
          >
            <option value="all">All Statuses ({totalCount})</option>
            <option value="approved">Approved / Confirmed</option>
            <option value="checked-in">Checked In</option>
            <option value="checked-out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Bookings Data Table & Pagination */}
      <div className="ha-card">
        <DataTable
          columns={columns}
          data={bookings}
          loading={loading}
          loadingMessage="Loading bookings..."
          emptyMessage="No bookings matching current criteria."
        />

        {totalCount > 0 && (
          <div className="pagination-row">
            <button disabled={currentPage === 1} onClick={() => goToPage(1)}>« First</button>
            <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>← Prev</button>

            <span className="pagination-info">
              Page {currentPage} of {totalPages}
              <span style={{ marginLeft: 14, color: "#94a3b8" }}>
                ({(currentPage - 1) * LIMIT + 1}–{Math.min(currentPage * LIMIT, totalCount)} of {totalCount})
              </span>
            </span>

            <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>Next →</button>
            <button disabled={currentPage === totalPages} onClick={() => goToPage(totalPages)}>Last »</button>
          </div>
        )}
      </div>

      {/* Payment Receipt Modal */}
      {selectedBookingForPayment && (
        <ReceiptPaymentModal
          booking={selectedBookingForPayment}
          isOpen={Boolean(selectedBookingForPayment)}
          onClose={() => setSelectedBookingForPayment(null)}
          onPaymentSuccess={() => {
            setSelectedBookingForPayment(null);
            fetchBookings(currentPage, statusFilter, search);
          }}
        />
      )}
    </div>
  );
};

export default HotelAdminBookings;
