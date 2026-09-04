import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { Search, X, User as UserIcon, Calendar, Mail, Phone, MapPin, Shield, CheckCircle, XCircle, BookOpen } from 'lucide-react';

const UserProfileManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Bookings modal state
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [bookingsModalUser, setBookingsModalUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const fetchUsers = async (page = 1, search = appliedSearch) => {
    try {
      setLoading(true);
      setErr('');
      const res = await api.post('/api/admin/users/regular-users', {
        page,
        limit: 10,
        search,
      });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalUsers(res.data.totalUsers || 0);
      setCurrentPage(res.data.currentPage || 1);
    } catch (e) {
      console.error(e);
      setErr('Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, appliedSearch);
  }, [currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(searchInput);
    setCurrentPage(1);
    fetchUsers(1, searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
    fetchUsers(1, '');
  };

  const handleShowBookings = async (user) => {
    setBookingsModalUser(user);
    setIsBookingsModalOpen(true);
    setLoadingBookings(true);
    try {
      const res = await api.post('/api/bookings/my', { userId: user._id });
      setUserBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Error fetching bookings for user:', err);
      toast.error('Failed to load user bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatRoomsAndBeds = (booking) => {
    const roomLabels = (booking.roomIds || []).map((r) => r.roomNumber ? `Room ${r.roomNumber}` : 'Room').join(', ');
    const bedLabel = booking.bedId?.bedNumber ? `Bed ${booking.bedId.bedNumber}` : '';
    if (roomLabels && bedLabel) return `${roomLabels} (${bedLabel})`;
    return roomLabels || bedLabel || '—';
  };

  return (
    <div className="page-root">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">User Profile</h1>
        </div>
      </div>

      {/* Search Toolbar */}
      <form onSubmit={handleSearchSubmit} className="toolbar-row" style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '420px' }}>
          <input
            type="text"
            className="export-date-input"
            style={{ width: '100%', paddingLeft: '36px', height: '40px', boxSizing: 'border-box' }}
            placeholder="Search by name, email, phone, or identity..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary-cta" style={{ height: '40px' }} disabled={loading}>
          Search
        </button>
        {appliedSearch && (
          <button type="button" className="btn-secondary-cta" style={{ height: '40px' }} onClick={handleClearSearch}>
            Reset Filter
          </button>
        )}
      </form>

      {/* Selected User Inline Profile Display */}
      {selectedUser && (
        <div className="card-surface" style={{ marginBottom: '2rem', border: '1px solid #bfdbfe', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1.2rem',
                }}
              >
                {(selectedUser.firstName?.[0] || 'U').toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>
                  {selectedUser.firstName || ''} {selectedUser.lastName || ''}
                </h3>
                <span className={`badge ${selectedUser.isActive ? 'active' : 'inactive'}`} style={{ marginTop: '4px' }}>
                  {selectedUser.isActive ? 'Active User' : 'Inactive User'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-primary-cta"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '7px 14px' }}
                onClick={() => handleShowBookings(selectedUser)}
              >
                <BookOpen size={16} /> Show Bookings
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="btn-action view"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#cbd5e1' }}
              >
                <X size={16} /> Close Profile
              </button>
            </div>
          </div>

          {/* Profile Details Grid */}
          <div className="modal-detail-grid">
            <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserIcon size={16} color="#2563eb" /> Personal Information
              </h4>
              <p><strong>First Name:</strong> {selectedUser.firstName || '—'}</p>
              <p><strong>Last Name:</strong> {selectedUser.lastName || '—'}</p>
              <p><strong>Email:</strong> {selectedUser.email || '—'}</p>
              <p><strong>Phone:</strong> {selectedUser.phone || '—'}</p>
              <p><strong>Gender:</strong> {selectedUser.gender ? selectedUser.gender.toUpperCase() : '—'}</p>
              <p><strong>Date of Birth:</strong> {formatDate(selectedUser.dateOfBirth)}</p>
              <p><strong>Nationality:</strong> {selectedUser.nationality || '—'}</p>
              <p><strong>Address:</strong> {selectedUser.address || '—'}</p>
            </div>

            <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} color="#2563eb" /> Identity & Emergency Contacts
              </h4>
              <p><strong>Identity Type:</strong> {selectedUser.identityType || '—'}</p>
              <p><strong>Identity Number:</strong> {selectedUser.identityNumber || '—'}</p>
              <p><strong>Emergency Name:</strong> {selectedUser.emergencyContactName || '—'}</p>
              <p><strong>Emergency Phone:</strong> {selectedUser.emergencyContactPhone || '—'}</p>
              
              <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} color="#2563eb" /> Booking & Account Activity
              </h4>
              <p><strong>Total Bookings:</strong> {selectedUser.totalBookings ?? selectedUser.bookingIds?.length ?? 0}</p>
              <p><strong>Last Booking At:</strong> {formatDate(selectedUser.lastBookingAt)}</p>
              <p><strong>Account Created:</strong> {formatDate(selectedUser.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="center">#</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Identity Type</th>
              <th>Identity No</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="table-empty">Loading user list...</td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan="8" className="table-empty" style={{ color: '#ef4444' }}>{err}</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  {appliedSearch ? `No users found matching "${appliedSearch}"` : 'No users found'}
                </td>
              </tr>
            ) : (
              users.map((u, index) => {
                const isSelected = selectedUser?._id === u._id;
                return (
                  <tr
                    key={u._id}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : undefined,
                    }}
                  >
                    <td className="center">{(currentPage - 1) * 10 + index + 1}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {u.firstName || ''} {u.lastName || ''}
                    </td>
                    <td>{u.email || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.identityType || '—'}</td>
                    <td>{u.identityNumber || '—'}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn-action view"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                        >
                          {isSelected ? 'Viewing Profile' : 'View Profile'}
                        </button>
                        <button
                          type="button"
                          className="btn-action primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowBookings(u);
                          }}
                        >
                          Bookings
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination-row">
        <button
          disabled={currentPage === 1 || loading}
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        >
          ← Prev
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages} (Total: {totalUsers} users)
        </span>
        <button
          disabled={currentPage >= totalPages || loading}
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        >
          Next →
        </button>
      </div>

      {/* Bookings Modal Popup */}
      {isBookingsModalOpen && (
        <div className="page-modal-backdrop" onClick={() => setIsBookingsModalOpen(false)}>
          <div
            className="page-modal-card"
            style={{ maxWidth: '900px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-modal-header">
              <h3>
                Bookings for {bookingsModalUser?.firstName || ''} {bookingsModalUser?.lastName || ''}
              </h3>
              <button
                className="page-modal-close"
                onClick={() => setIsBookingsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="page-modal-body">
              {loadingBookings ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
                  Loading user bookings...
                </p>
              ) : userBookings.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2.5rem 0' }}>
                  No bookings found for this user.
                </p>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="center">#</th>
                        <th>Guest House</th>
                        <th>Room / Bed</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Status</th>
                        <th>Source</th>
                        <th>Special Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userBookings.map((b, i) => (
                        <tr key={b._id || i}>
                          <td className="center">{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>
                            {b.guestHouseId?.guestHouseName || '—'}
                          </td>
                          <td>{formatRoomsAndBeds(b)}</td>
                          <td>{formatDate(b.checkIn)}</td>
                          <td>{formatDate(b.checkOut)}</td>
                          <td>
                            <span className={`badge ${b.status || 'pending'}`}>
                              {b.status ? b.status.replace('-', ' ').toUpperCase() : 'PENDING'}
                            </span>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>
                            {b.bookingSource ? b.bookingSource.replace('_', ' ') : 'Self Service'}
                          </td>
                          <td>{b.specialRequests || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="page-modal-footer">
              <button
                type="button"
                className="btn-action view"
                onClick={() => setIsBookingsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileManagement;
