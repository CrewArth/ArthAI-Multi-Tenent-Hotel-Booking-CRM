import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useNavigate } from 'react-router-dom';
import '../styles/calendar.css';
import '../styles/adminBooking.css';
import '../styles/dashboard.css';
import api from '../../utils/api';

export default function Calendar({ assignedGhId = null }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    fetchApprovedBookings();

    const handleStatusChange = () => {
      fetchApprovedBookings();
    };

    window.addEventListener('bookingStatusChanged', handleStatusChange);
    return () => {
      window.removeEventListener('bookingStatusChanged', handleStatusChange);
    };
  }, [assignedGhId]);

  const fetchApprovedBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/api/bookings/calendar', assignedGhId ? { guestHouseId: assignedGhId } : {});
      
      // Transform bookings into FullCalendar events
      const rawBookings = Array.isArray(response.data?.bookings) ? response.data.bookings : [];
      const calendarEvents = rawBookings.map((booking) => {
        const userName = booking.userId
          ? `${booking.userId.firstName || ''} ${booking.userId.lastName || ''}`.trim()
          : 'Unknown User';

        const userEmail = booking.userId?.email || 'N/A';
        const isCancelled = booking.status === 'cancelled';
        
        const now = new Date();
        const checkOutDateObj = new Date(booking.checkOut);
        const isCheckedOut = booking.isCheckedOut || booking.status === 'checked_out' || booking.status === 'completed' || (!isCancelled && checkOutDateObj <= now);

        // FullCalendar's end date is exclusive, so we add 1 day to checkOut
        const checkOutDate = new Date(booking.checkOut);
        checkOutDate.setDate(checkOutDate.getDate() + 1);

        let bgColor = '#2563eb'; // Blue for active/approved
        let borderColor = '#1d4ed8';
        let statusTag = booking.status || 'approved';

        if (isCancelled) {
          bgColor = '#ef4444'; // Red for cancelled
          borderColor = '#dc2626';
          statusTag = 'cancelled';
        } else if (isCheckedOut) {
          bgColor = '#16a34a'; // Green for checked out
          borderColor = '#15803d';
          statusTag = 'checked_out';
        }

        return {
          id: booking._id,
          title: `${userName}`,
          start: booking.checkIn,
          end: checkOutDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          backgroundColor: bgColor,
          borderColor: borderColor,
          textColor: '#ffffff',
          extendedProps: {
            guestHouse: booking.guestHouseId?.guestHouseName || 'N/A',
            room: Array.isArray(booking.roomIds) && booking.roomIds.length ? booking.roomIds.map(r => r?.roomNumber ? `${r.roomNumber}` : '').filter(Boolean).join(', ') || 'N/A' : 'N/A',
            bed: booking.bedId?.bedNumber || 'N/A',
            bedType: booking.bedId?.bedType || 'N/A',
            email: userEmail,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            status: statusTag,
            isCheckedOut: isCheckedOut,
            isCancelled: isCancelled,
          },
        };
      });

      setEvents(calendarEvents);
    } catch (err) {
      console.error('Error fetching calendar bookings:', err);
      setError('Failed to load calendar bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (clickInfo) => {
    const { extendedProps, title, id } = clickInfo.event;
    
    setSelectedBooking({
      id,
      guest: title,
      email: extendedProps.email,
      guestHouse: extendedProps.guestHouse,
      room: extendedProps.room,
      bed: extendedProps.bed,
      bedType: extendedProps.bedType,
      checkIn: extendedProps.checkIn,
      checkOut: extendedProps.checkOut,
      status: extendedProps.status,
      isCheckedOut: extendedProps.isCheckedOut,
      isCancelled: extendedProps.isCancelled,
    });
    setConfirmCancel(false);
  };

  const isCancelDisabled = Boolean(
    selectedBooking?.isCancelled ||
    selectedBooking?.isCheckedOut ||
    selectedBooking?.status === 'cancelled' ||
    selectedBooking?.status === 'checked_out'
  );

  const isEditDisabled = Boolean(
    selectedBooking?.isCancelled ||
    selectedBooking?.isCheckedOut ||
    selectedBooking?.status === 'cancelled' ||
    selectedBooking?.status === 'checked_out'
  );

  const handleCancelBooking = async () => {
    if (isCancelDisabled) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    try {
      setCancelling(true);
      await api.patch(`/api/bookings/${selectedBooking.id}/cancel`);
      setSelectedBooking(null);
      setConfirmCancel(false);
      fetchApprovedBookings(); // refresh calendar
      window.dispatchEvent(new CustomEvent('bookingStatusChanged'));
    } catch (err) {
      console.error('Error cancelling booking:', err);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-IN", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="calendar-loading">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="calendar-container">
        <div className="calendar-error">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="calendar-container">
        <div className="calendar-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth'
            }}
            height="auto"
            eventContent={renderEventContent}
          />
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="page-modal-backdrop" onClick={() => { setSelectedBooking(null); setConfirmCancel(false); }}>
          <div className="page-modal-card" onClick={(e) => e.stopPropagation()}>

            <div className="page-modal-header">
              <h3>Booking Details</h3>
              <button className="page-modal-close" onClick={() => setSelectedBooking(null)}>✕</button>
            </div>

            <div className="page-modal-body">
              <div className="modal-detail-grid">
                <p className="full">
                  <strong>Guest</strong>
                  {selectedBooking.guest}
                </p>
                <p className="full">
                  <strong>Email</strong>
                  {selectedBooking.email}
                </p>
                <p>
                  <strong>Hotel</strong>
                  {selectedBooking.guestHouse}
                </p>
                <p>
                  <strong>Room</strong>
                  {selectedBooking.room !== 'N/A' ? `Room ${selectedBooking.room}` : 'N/A'}
                </p>
                <p>
                  <strong>Bed</strong>
                  {selectedBooking.bed !== 'N/A'
                    ? `Bed ${selectedBooking.bed} (${selectedBooking.bedType})`
                    : 'N/A'}
                </p>
                <p>
                  <strong>Status</strong>
                  <span className={`today-bookings-status ${selectedBooking.status || 'approved'}`}>
                    {selectedBooking.status || 'approved'}
                  </span>
                </p>
                <p>
                  <strong>Check-in</strong>
                  {formatDate(selectedBooking.checkIn)}
                </p>
                <p>
                  <strong>Check-out</strong>
                  {formatDate(selectedBooking.checkOut)}
                </p>
              </div>
            </div>

            <div className="page-modal-footer">
              {confirmCancel && !isCancelDisabled && (
                <span style={{ fontSize: '0.85rem', color: '#dc2626', marginRight: 'auto' }}>
                  Are you sure? This cannot be undone.
                </span>
              )}
              <button
                className="btn-action delete"
                onClick={handleCancelBooking}
                disabled={isCancelDisabled || cancelling}
                title={isCancelDisabled ? 'Cannot cancel a cancelled or checked-out booking' : 'Cancel booking'}
                style={isCancelDisabled ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
              >
                {cancelling ? 'Cancelling…' : confirmCancel ? 'Confirm Cancel' : 'Cancel Booking'}
              </button>
              <button
                className="btn-action toggle"
                onClick={() => {
                  if (isEditDisabled) return;
                  setSelectedBooking(null);
                  navigate('/admin/book-room', { state: { bookingId: selectedBooking.id } });
                }}
                disabled={isEditDisabled}
                title={isEditDisabled ? 'Cannot edit a cancelled or checked-out booking' : 'Edit booking'}
                style={isEditDisabled ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
              >
                Edit
              </button>
              <button
                className="btn-action edit"
                onClick={() => { setSelectedBooking(null); setConfirmCancel(false); }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function renderEventContent(eventInfo) {
  const { isCancelled, isCheckedOut } = eventInfo.event.extendedProps;
  let statusClass = '';
  if (isCancelled) statusClass = 'cancelled';
  else if (isCheckedOut) statusClass = 'checked-out';

  return (
    <div className={`calendar-event ${statusClass}`}>
      <b>{eventInfo.event.title}</b>
    </div>
  );
}