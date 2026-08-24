import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import '../styles/bookingform.css';
import '../../admin/styles/adminRoomBooking.css';
import Navbar from '../../components/Navbar';
import { Multiselect } from 'multiselect-react-dropdown';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import loadingIcon from '../../assets/loading.svg';

const BookingForm = () => {
  const location = useLocation();
  const selectedGuestHouse = location.state?.guestHouse;
  const navigate = useNavigate();

  const storedUser = useSelector((state) => state.auth.user);

  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [bedsError, setBedsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [unavailableRooms, setUnavailableRooms] = useState([]);
  const [unavailableBeds, setUnavailableBeds] = useState([]);

  const [dateError, setDateError] = useState('');

  const [formData, setFormData] = useState({
    checkInDate: '',
    checkOutDate: '',
    guestHouse: selectedGuestHouse || '',
    roomIds: [],
    bed: '',
    fullName: storedUser ? `${storedUser.firstName} ${storedUser.lastName}` : '',
    email: storedUser?.email || '',
    phone: storedUser?.phone || '',
    address: storedUser?.address || '',
    specialRequests: ''
  });

  useEffect(() => {
    if (storedUser) {
      setFormData(prev => ({
        ...prev,
        fullName: `${storedUser.firstName} ${storedUser.lastName}`,
        email: storedUser.email,
        phone: storedUser.phone,
        address: storedUser.address || '',
      }));
    }
  }, []);

  const [step, setStep] = useState(1);

  useEffect(() => {
    if (selectedGuestHouse) {
      fetchRooms(selectedGuestHouse);
    }
    setFormData(prev => ({ ...prev, roomIds: [], bed: '' }));
    setBeds([]);
  }, [selectedGuestHouse]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const validateDates = (checkIn, checkOut) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkIn) {
      const checkInDate = new Date(checkIn);
      checkInDate.setHours(0, 0, 0, 0);
      
      if (checkInDate < today) {
        setDateError("Check-in date cannot be in the past. Please select today or a future date.");
        return false;
      }
    }
    
    if (checkIn && checkOut) {
      if (new Date(checkOut) <= new Date(checkIn)) {
        setDateError("Check-out date must be after Check-in date");
        return false;
      }
    }
    setDateError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const updatedData = {
      ...formData,
      [name]: value
    };

    setFormData(updatedData);

    if (name === "checkInDate" || name === "checkOutDate") {
      validateDates(
        name === "checkInDate" ? value : formData.checkInDate,
        name === "checkOutDate" ? value : formData.checkOutDate
      );
    }

  };

  const handleRoomSelection = (selectedItems) => {
    const nextRoomIds = Array.isArray(selectedItems)
      ? selectedItems
          .map((item) => item._id || item.value)
          .filter((id) => id && !unavailableRooms.includes(id)) // block unavailable rooms
      : [];
    const cleanRoomIds = nextRoomIds.filter(Boolean);

    setFormData(prev => ({ ...prev, roomIds: cleanRoomIds, bed: '' }));

    if (cleanRoomIds.length >= 2) {
      setBeds([]);
      setBedsError(null);
    }
  };

  const fetchRooms = async (gh) => {
    try {
      setRoomsLoading(true);
      const res = await api.post(`/api/rooms/by-guesthouse`, { guestHouseId: gh.guestHouseId });
      setRooms(Array.isArray(res.data?.rooms) ? res.data.rooms : []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setRoomsError('Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchBeds = async (roomId) => {
    try {
      setBedsLoading(true);
      const res = await api.post(`/api/beds/list`, { roomId });
      setBeds(Array.isArray(res.data?.beds) ? res.data.beds : []);
    } catch (err) {
      console.error('Error fetching beds:', err);
      setBedsError('Failed to load beds');
    } finally {
      setBedsLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      if (!formData.checkInDate || !formData.checkOutDate || !selectedGuestHouse) return;

      const res = await api.post(`/api/bookings/availability`, {
          guestHouseId: selectedGuestHouse.guestHouseId || selectedGuestHouse._id,
          checkIn: formData.checkInDate,
          checkOut: formData.checkOutDate,
        });

      setUnavailableRooms(res.data.unavailableRooms || []);
      setUnavailableBeds(res.data.unavailableBeds || []);
    } catch (err) {
      console.error("Error checking availability:", err);
    }
  };

  useEffect(() => {
    if (formData.checkInDate && formData.checkOutDate && selectedGuestHouse) {
      checkAvailability();
    }
  }, [formData.checkInDate, formData.checkOutDate, selectedGuestHouse]);

  // Function to perform booking from user side.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateDates(formData.checkInDate, formData.checkOutDate)) {
      alert("Please fix date validation errors before submitting.");
      return;
    }

    if (formData.roomIds.length === 0) {
      toast.error('Please select at least one room for this booking.');
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    try {
      const bookingData = {
        guestHouseId: selectedGuestHouse?.guestHouseId || selectedGuestHouse?._id,
        roomIds: formData.roomIds,
        bedId: null,
        checkIn: formData.checkInDate,
        checkOut: formData.checkOutDate,
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        specialRequests: formData.specialRequests,
        userId: storedUser?._id,
      };

      const res = await api.post("/api/bookings", bookingData);
        
      if (res.status === 201) {
        toast.success("Booking request submitted successfully!");
        navigate('/admin/dashboard', { replace: true });
      } else {
        toast.error(res.data?.message || "Failed to submit booking");
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast.error(error.response?.data?.message || "Server error submitting booking");
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-bg">
      <Navbar />

      <div className="booking-page-container">
        <div className="step-indicator">
          <span className={step === 1 ? 'active' : ''}>1. Booking Details</span>
          <span className={step === 2 ? 'active' : ''}>2. Personal Info</span>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <form className="booking-form" onSubmit={(e) => {
            e.preventDefault();
            if (!dateError) setStep(2);
          }}>
            {selectedGuestHouse && (
              <div className="selected-guesthouse-info">
                <h3>You Selected:</h3>
                <div className="guesthouse-details">
                  <h4>{selectedGuestHouse.guestHouseName}</h4>
                  <p>Location: {selectedGuestHouse.location.city}, {selectedGuestHouse.location.state}</p>
                </div>
              </div>
            )}

            <div className="form-section step-form">
              <h2>Booking Details</h2>

              <div className="form-grid">
                <div className="form-control">
                  <label>Check-in Date <span>*</span></label>
                  <input
                    type="date"
                    name="checkInDate"
                    value={formData.checkInDate}
                    onChange={handleChange}
                    required
                    className={dateError ? "error-input" : ""}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {dateError && dateError.includes("past") && (
                    <span className="error-message">{dateError}</span>
                  )}
                </div>

                <div className="form-control">
                  <label>Check-out Date <span>*</span></label>
                  <input
                    type="date"
                    name="checkOutDate"
                    value={formData.checkOutDate}
                    onChange={handleChange}
                    required
                    className={dateError ? "error-input" : ""}
                    min={formData.checkInDate ? new Date(new Date(formData.checkInDate).getTime() + 86400000)
                      .toISOString()
                      .split("T")[0]
                      : new Date().toISOString().split("T")[0]}
                  />
                  {dateError && dateError.includes("Check-out") && (
                    <span className="error-message">{dateError}</span>
                  )}
                </div>

                <div className="form-control">
                  <label>Room</label>
                  <Multiselect
                    className="room-multiselect"
                    options={rooms.map((room) => ({
                      _id: room._id,
                      name: `Room ${room.roomNumber} - ${room.roomType} ${room.price ? `($${room.price}/night)` : ''} ${unavailableRooms.includes(room._id) ? '(Full)' : ''}`.trim(),
                      disabled: unavailableRooms.includes(room._id),
                    }))}
                    selectedValues={formData.roomIds.map((roomId) => ({
                      _id: roomId,
                      name: rooms.find((room) => room._id === roomId)?.roomNumber ? `Room ${rooms.find((room) => room._id === roomId).roomNumber}` : roomId,
                    }))}
                    onSelect={handleRoomSelection}
                    onRemove={handleRoomSelection}
                    displayValue="name"
                    placeholder={roomsLoading ? 'Loading rooms...' : 'Select rooms'}
                    disable={(!selectedGuestHouse || roomsLoading)}
                    showCheckbox
                    closeIcon="cancel"
                    avoidHighlightFirstOption
                  />
                  <small>{formData.roomIds.length ? `${formData.roomIds.length} room(s) selected` : 'Select at least one room'}</small>
                </div>

                <div className="form-control">
                  <label>Bed</label>
                  <select name="bed" value={formData.bed} disabled>
                    <option value="">Bed is not required for multi-room booking</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => window.history.back()}>Cancel</button>
                <button type="submit" className="btn primary" disabled={!!dateError}>
                  Next
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="form-section step-form">
              <h2>Personal Information</h2>

              <div className="form-grid">
                <div className="form-control full-width">
                  <label>Full Name <span>*</span></label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
                </div>

                <div className="form-control">
                  <label>Email <span>*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>

                <div className="form-control">
                  <label>Phone <span>*</span></label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                </div>

                <div className="form-control full-width">
                  <label>Address <span>*</span></label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows="3" required></textarea>
                </div>

                <div className="form-control full-width">
                  <label>Special Requests (Optional)</label>
                  <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} rows="3"></textarea>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setStep(1)}>Back</button>

                <button type="submit" className="btn primary submit-btn" disabled={submitting}>
                  {submitting ? <div className="spinner"></div> : "Send Request"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Fullscreen loading overlay */}
      {submitting && (
        <div className="arb-loading-overlay">
          <img src={loadingIcon} alt="Processing..." className="arb-loading-icon" />
        </div>
      )}
    </div>
  );
};

export default BookingForm;
