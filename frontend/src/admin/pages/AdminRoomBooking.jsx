import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Multiselect from 'multiselect-react-dropdown';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import CaptureSessionModal from '../components/CaptureSessionModal';
import '../styles/adminRoomBooking.css';

const STEPS = ['Stay Details', 'Guest Info', 'Identity & Emergency', 'Review'];

const todayStr = () => new Date().toISOString().split('T')[0];

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

const AdminRoomBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // If navigating from "Edit booking", state may contain bookingId
  const editBookingId = location.state?.bookingId || null;
  const isEditMode = Boolean(editBookingId);

  const currentUser = useSelector((state) => state.auth?.user);
  const assignedGuestHouse = currentUser?.assignedGuestHouseId;

  const [step, setStep] = useState(0);
  const [guestHouses, setGuestHouses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);

  // Availability state
  const [unavailableRooms, setUnavailableRooms] = useState([]);
  const [unavailableBeds, setUnavailableBeds] = useState([]);

  // Form State
  const [form, setForm] = useState({
    guestHouseId: '',
    roomIds: [],
    bedId: '',
    checkIn: todayStr(),
    checkOut: '',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationality: 'Indian',
    address: '',
    identityType: '',
    identityNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    specialRequests: '',
  });

  const [verificationImage, setVerificationImage] = useState(null);
  const [capturedPrimaryDoc, setCapturedPrimaryDoc] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [currentBookingId, setCurrentBookingId] = useState(editBookingId);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentBookingId(editBookingId);
  }, [editBookingId]);

  const handleCaptureSessionUpdated = (sessionData) => {
    if (!sessionData?.guests) return;
    const primary = sessionData.guests.find((g) => g.role === 'PRIMARY');
    if (primary?.document?.url) {
      setCapturedPrimaryDoc(primary.document.url);
    }
    const familyFromSession = sessionData.guests.filter((g) => g.role === 'FAMILY_MEMBER');
    if (familyFromSession.length > 0) {
      setFamilyMembers(familyFromSession.map((m) => ({
        name: m.name,
        relation: m.relation || '',
        age: m.age || '',
        image: null,
        capturedUrl: m.document?.url || null,
        documentLabel: m.document?.label || '',
      })));
    }
  };

  const handleOpenCaptureSession = async () => {
    if (currentBookingId) {
      setShowCaptureModal(true);
      return;
    }

    if (!selectedGuestHouse) {
      toast.error('Please select a hotel in Stay Details (Step 1).');
      setStep(0);
      return;
    }
    if (!form.roomIds.length) {
      toast.error('Please select at least one room in Stay Details (Step 1).');
      setStep(0);
      return;
    }
    if (!form.checkIn || !form.checkOut) {
      toast.error('Please select valid check-in and check-out dates (Step 1).');
      setStep(0);
      return;
    }
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Please fill Guest Name and Email in Guest Info (Step 2).');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('guestHouseId', selectedGuestHouse.guestHouseId || selectedGuestHouse._id);
      payload.append('roomIds', JSON.stringify(form.roomIds));
      if (form.bedId) payload.append('bedId', form.bedId);
      payload.append('checkIn', form.checkIn);
      payload.append('checkOut', form.checkOut);
      payload.append('fullName', form.fullName.trim());
      const names = form.fullName.trim().split(' ');
      payload.append('firstName', names[0]);
      payload.append('lastName', names.slice(1).join(' '));
      payload.append('email', form.email.trim());
      payload.append('phone', form.phone || '');
      payload.append('address', form.address || 'Pending Check-in');
      payload.append('identityType', form.identityType || 'Aadhaar');
      payload.append('identityNumber', form.identityNumber || '');
      if (form.specialRequests) payload.append('specialRequests', form.specialRequests);

      const cleanMembers = familyMembers.map(({ image, ...rest }) => rest);
      payload.append('familyMembers', JSON.stringify(cleanMembers));

      const res = await api.post('/api/bookings/admin', payload);
      const newId = res.data?.booking?._id;
      if (newId) {
        setCurrentBookingId(newId);
        toast.success('Booking initialized! Launching Mobile QR code...');
        setShowCaptureModal(true);
      }
    } catch (err) {
      console.error('Failed to initialize booking for capture session:', err);
      toast.error(err.response?.data?.message || 'Failed to initialize booking');
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-assign guestHouseId if admin has assignedGuestHouse ──────
  useEffect(() => {
    if (assignedGuestHouse) {
      const ghId = typeof assignedGuestHouse === 'object'
        ? assignedGuestHouse.guestHouseId
        : assignedGuestHouse;
      setForm((f) => ({ ...f, guestHouseId: ghId }));
    }
  }, [assignedGuestHouse]);

  // ── Pre-fill if Edit Mode ────────────────────────────────────
  useEffect(() => {
    if (!editBookingId) return;
    setLoading(true);
    api.get(`/api/bookings/${editBookingId}`)
      .then((res) => {
        const b = res.data?.booking;
        if (!b) return;
        const ghId = typeof b.guestHouseId === 'object'
          ? b.guestHouseId?.guestHouseId || b.guestHouseId?._id
          : b.guestHouseId;

        const rIds = Array.isArray(b.roomIds) && b.roomIds.length
          ? b.roomIds.map((r) => (typeof r === 'object' ? r._id : r))
          : b.roomId
            ? [typeof b.roomId === 'object' ? b.roomId._id : b.roomId]
            : [];

        const bId = typeof b.bedId === 'object' ? b.bedId?._id : b.bedId;

        setForm({
          guestHouseId: ghId || '',
          roomIds: rIds,
          bedId: bId || '',
          checkIn: b.checkIn ? new Date(b.checkIn).toISOString().split('T')[0] : todayStr(),
          checkOut: b.checkOut ? new Date(b.checkOut).toISOString().split('T')[0] : '',
          fullName: b.userId?.firstName
            ? `${b.userId.firstName} ${b.userId.lastName || ''}`.trim()
            : b.fullName || '',
          email: b.userId?.email || b.email || '',
          phone: b.userId?.phone || b.phone || '',
          dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth).toISOString().split('T')[0] : '',
          gender: b.gender || '',
          nationality: b.nationality || 'Indian',
          address: b.address || '',
          identityType: b.identityType || '',
          identityNumber: b.identityNumber || '',
          emergencyContactName: b.emergencyContactName || '',
          emergencyContactPhone: b.emergencyContactPhone || '',
          specialRequests: b.specialRequests || '',
        });

        if (Array.isArray(b.familyMembers)) {
          setFamilyMembers(b.familyMembers.map((m) => ({ ...m, image: null })));
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load booking for editing.');
      })
      .finally(() => setLoading(false));
  }, [editBookingId]);

  // ── Fetch Guest Houses list to resolve hotel names ─────────────
  useEffect(() => {
    api.post('/api/guesthouses/list')
      .then((res) => setGuestHouses(Array.isArray(res.data) ? res.data : res.data.guestHouses || []))
      .catch(() => console.error('Unable to load hotels list'));
  }, []);

  // ── Resolve currently selected guest house object & primitive ID ──
  const selectedGuestHouseId = assignedGuestHouse
    ? (typeof assignedGuestHouse === 'object' ? (assignedGuestHouse.guestHouseId || assignedGuestHouse._id) : assignedGuestHouse)
    : (form.guestHouseId || null);

  const selectedGuestHouse = assignedGuestHouse
    ? (typeof assignedGuestHouse === 'object' ? assignedGuestHouse : { guestHouseId: assignedGuestHouse, guestHouseName: 'Assigned Hotel' })
    : guestHouses.find((g) => g.guestHouseId === form.guestHouseId || g._id === form.guestHouseId);

  const currentHotel = guestHouses.find((g) =>
    g.guestHouseId === selectedGuestHouseId || g._id === selectedGuestHouseId
  );

  const displayHotelName = currentHotel
    ? currentHotel.guestHouseName
    : (typeof assignedGuestHouse === 'object' && assignedGuestHouse.guestHouseName
      ? assignedGuestHouse.guestHouseName
      : 'Loading hotel...');

  // ── Fetch Rooms when selectedGuestHouseId changes ─────────────
  useEffect(() => {
    if (!selectedGuestHouseId) { setRooms([]); return; }
    api.post('/api/rooms/by-guesthouse', { guestHouseId: selectedGuestHouseId })
      .then((res) => setRooms(res.data.rooms || []))
      .catch(() => toast.error('Unable to load rooms.'));
  }, [selectedGuestHouseId]);

  // ── Fetch Beds when roomIds changes ───────────────────────────
  const roomIdsKey = form.roomIds.join(',');
  useEffect(() => {
    if (!roomIdsKey) { setBeds([]); return; }
    api.post('/api/beds/by-rooms', { roomIds: form.roomIds })
      .then((res) => setBeds(res.data.beds || []))
      .catch(() => toast.error('Unable to load beds.'));
  }, [roomIdsKey]);

  useEffect(() => {
    if (!selectedGuestHouseId || !form.checkIn || !form.checkOut || form.checkOut <= form.checkIn) {
      setUnavailableRooms([]); setUnavailableBeds([]); return;
    }
    api.post('/api/bookings/availability', {
      guestHouseId: selectedGuestHouseId,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      ...(isEditMode && editBookingId ? { excludeBookingId: editBookingId } : {}),
    })
      .then((res) => {
        const newUnavailableRooms = res.data.unavailableRooms || [];
        const newUnavailableBeds = res.data.unavailableBeds || [];
        setUnavailableRooms(newUnavailableRooms);
        setUnavailableBeds(newUnavailableBeds);
        // Drop any selected rooms that are now booked
        setForm((f) => {
          const filteredRooms = f.roomIds.filter((id) => !newUnavailableRooms.includes(id));
          const newBedId = newUnavailableBeds.includes(f.bedId) ? '' : f.bedId;
          if (filteredRooms.length === f.roomIds.length && newBedId === f.bedId) {
            return f;
          }
          return { ...f, roomIds: filteredRooms, bedId: newBedId };
        });
      })
      .catch(() => toast.error('Unable to check availability.'));
  }, [selectedGuestHouseId, form.checkIn, form.checkOut, isEditMode, editBookingId]);

  // ── helpers ─────────────────────────────────────────────────
  const updateForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      if (name === 'guestHouseId') return { ...f, guestHouseId: value, roomIds: [], bedId: '' };
      return { ...f, [name]: value };
    });
  };

  const handleRoomSelection = (selectedItems) => {
    const nextRoomIds = Array.isArray(selectedItems)
      ? selectedItems.map((item) => item._id || item.value || item).filter(Boolean)
      : [];

    setForm((f) => ({
      ...f,
      roomIds: nextRoomIds,
      bedId: f.roomIds.includes(f.bedId) ? f.bedId : '',
    }));
  };

  const addMember = () => setFamilyMembers((prev) => [...prev, { name: '', relation: '', age: '', image: null }]);
  const removeMember = (idx) => setFamilyMembers((prev) => prev.filter((_, i) => i !== idx));
  const updateMember = (idx, field, value) => {
    setFamilyMembers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleStaySubmit = (e) => {
    e.preventDefault();
    if (!form.roomIds.length) { toast.error('Please select at least one room.'); return; }
    if (!form.checkIn || !form.checkOut) { toast.error('Please select valid check-in and check-out dates.'); return; }
    if (form.checkOut <= form.checkIn) { toast.error('Check-out date must be after check-in date.'); return; }
    goNext();
  };

  const handleSubmitBooking = async () => {
    if (!selectedGuestHouse) { toast.error('Please select a hotel.'); return; }
    if (!form.roomIds.length) { toast.error('Please select at least one room.'); return; }
    if (!form.fullName.trim()) { toast.error('Guest name is required.'); return; }
    if (!form.email.trim()) { toast.error('Guest email is required.'); return; }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('guestHouseId', selectedGuestHouse.guestHouseId || selectedGuestHouse._id);
      payload.append('roomIds', JSON.stringify(form.roomIds));

      if (form.bedId) payload.append('bedId', form.bedId);

      payload.append('checkIn', form.checkIn);
      payload.append('checkOut', form.checkOut);

      payload.append('fullName', form.fullName.trim());
      const names = form.fullName.trim().split(' ');
      payload.append('firstName', names[0]);
      payload.append('lastName', names.slice(1).join(' '));
      payload.append('email', form.email.trim());
      payload.append('phone', form.phone || '');

      if (form.dateOfBirth) payload.append('dateOfBirth', form.dateOfBirth);
      if (form.gender) payload.append('gender', form.gender);
      if (form.nationality) payload.append('nationality', form.nationality);
      if (form.address) payload.append('address', form.address);

      if (form.identityType) payload.append('identityType', form.identityType);
      if (form.identityNumber) payload.append('identityNumber', form.identityNumber);
      if (verificationImage) payload.append('verificationImage', verificationImage);

      if (form.emergencyContactName) payload.append('emergencyContactName', form.emergencyContactName);
      if (form.emergencyContactPhone) payload.append('emergencyContactPhone', form.emergencyContactPhone);
      if (form.specialRequests) payload.append('specialRequests', form.specialRequests);

      // Sanitize family members (drop File objects before stringify)
      const cleanMembers = familyMembers.map(({ image, ...rest }) => rest);
      payload.append('familyMembers', JSON.stringify(cleanMembers));

      familyMembers.forEach((m, idx) => {
        if (m.image) {
          const fileWithPrefix = new File([m.image], `idx_${idx}_${m.image.name}`, { type: m.image.type });
          payload.append('familyMemberImages', fileWithPrefix);
        }
      });

      if (isEditMode || currentBookingId) {
        const idToUpdate = editBookingId || currentBookingId;
        await api.put(`/api/bookings/${idToUpdate}/admin`, payload);
        toast.success(isEditMode ? 'Booking updated successfully!' : 'Room booked successfully!');
      } else {
        await api.post('/api/bookings/admin', payload);
        toast.success('Room booked successfully!');
      }

      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || (isEditMode ? 'Failed to update booking.' : 'Failed to create booking.');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBed = beds.find((b) => b._id === form.bedId);
  const selectedRoomNames = rooms
    .filter((r) => form.roomIds.includes(r._id))
    .map((r) => `Room ${r.roomNumber}`);

  if (loading) {
    return <div className="page-root"><p style={{ color: '#64748b' }}>Loading booking details…</p></div>;
  }

  return (
    <div className="page-root arb-root">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{isEditMode ? 'Edit Booking' : 'Book a Room'}</h1>
        </div>
      </div>

      <div className="arb-container">
        {/* Step Indicator */}
        <div className="arb-stepper">
          <div className="arb-steps-track">
            {STEPS.map((label, i) => (
              <div key={label} className={`arb-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                <div className="arb-step-circle">{i + 1}</div>
                <span className="arb-step-label">{label}</span>
                {i < STEPS.length - 1 && <div className="arb-step-line" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 0 : Stay Details ── */}
        {step === 0 && (
          <form className="arb-card" onSubmit={handleStaySubmit}>
            <h2>Stay Details</h2>
            <div className="arb-grid">
              <label>
                Hotel <span>*</span>
                {assignedGuestHouse ? (
                  <input value={displayHotelName} disabled />
                ) : (
                  <select name="guestHouseId" value={form.guestHouseId} onChange={updateForm} required>
                    <option value="">Select hotel</option>
                    {guestHouses.filter((gh) => !gh.maintenance).map((gh) => (
                      <option key={gh._id} value={gh.guestHouseId}>{gh.guestHouseName}</option>
                    ))}
                  </select>
                )}
              </label>
              <label>
                Check In <span>*</span>
                <input type="date" name="checkIn" value={form.checkIn} min={todayStr()} onChange={updateForm} required />
              </label>
              <label>
                Check Out <span>*</span>
                <input type="date" name="checkOut" value={form.checkOut}
                  min={form.checkIn ? new Date(new Date(form.checkIn).getTime() + 86400000).toISOString().split('T')[0] : todayStr()}
                  onChange={updateForm} required />
              </label>
              <label>
                Rooms <span>*</span>
                <Multiselect
                  className="room-multiselect"
                  options={rooms
                    .filter((room) => !unavailableRooms.includes(room._id))
                    .map((room) => ({
                      _id: room._id,
                      name: `Room ${room.roomNumber} · ${room.roomType}`,
                    }))}
                  selectedValues={form.roomIds
                    .filter((roomId) => !unavailableRooms.includes(roomId))
                    .map((roomId) => {
                      const room = rooms.find((item) => item._id === roomId);
                      return room ? { _id: room._id, name: `Room ${room.roomNumber} · ${room.roomType}` } : { _id: roomId, name: roomId };
                    })}
                  onSelect={handleRoomSelection}
                  onRemove={handleRoomSelection}
                  displayValue="name"
                  placeholder={selectedGuestHouse ? 'Select rooms' : 'Choose hotel first'}
                  disable={!selectedGuestHouse}
                  showCheckbox
                  closeIcon="cancel"
                  avoidHighlightFirstOption
                />
                <small>{form.roomIds.length ? `${form.roomIds.length} room(s) selected` : 'Select at least one room'}</small>
                {unavailableRooms.length > 0 && (
                  <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                    {unavailableRooms.length} room(s) not shown (already booked for selected dates)
                  </small>
                )}
              </label>
              <label>
                Bed
                <select name="bedId" value={form.bedId} onChange={updateForm} disabled={!form.roomIds[0]}>
                  <option value="">Select bed (optional)</option>
                  {beds.map((b) => (
                    <option key={b._id} value={b._id} disabled={unavailableBeds.includes(b._id)}>
                      Bed {b.bedNumber} · {b.bedType}{unavailableBeds.includes(b._id) ? ' (Booked)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="arb-actions">
              <button type="button" className="arb-btn-secondary" onClick={() => navigate('/admin/dashboard')}>Cancel</button>
              <button type="submit" className="arb-btn-primary">Next →</button>
            </div>
          </form>
        )}

        {/* ── STEP 1 : Guest Details ── */}
        {step === 1 && (
          <form className="arb-card" onSubmit={(e) => { e.preventDefault(); goNext(); }}>
            <h2>Guest Details</h2>
            <div className="arb-grid">
              <label>
                Full Name <span>*</span>
                <input name="fullName" value={form.fullName} onChange={updateForm} required />
              </label>
              <label>
                Email <span>*</span>
                <input type="email" name="email" value={form.email} onChange={updateForm} required />
              </label>
              <label>
                Phone <span>*</span>
                <PhoneInput
                  international
                  defaultCountry="IN"
                  countryCallingCodeEditable={false}
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v || '' }))}
                  required
                />
              </label>
              <label>
                Date of Birth
                <input type="date" name="dateOfBirth" value={form.dateOfBirth} max={todayStr()} onChange={updateForm} />
              </label>
              <label>
                Gender
                <select name="gender" value={form.gender} onChange={updateForm}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
              <label>
                Nationality
                <input name="nationality" value={form.nationality} onChange={updateForm} />
              </label>
              <label className="arb-full">
                Address <span>*</span>
                <textarea name="address" value={form.address} onChange={updateForm} rows="3" required />
              </label>
            </div>
            <div className="arb-actions">
              <button type="button" className="arb-btn-secondary" onClick={goBack}>← Back</button>
              <button type="submit" className="arb-btn-primary">Next →</button>
            </div>
          </form>
        )}

        {/* ── STEP 2 : Identity & Emergency ── */}
        {step === 2 && (
          <form className="arb-card" onSubmit={(e) => { e.preventDefault(); goNext(); }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Identity & Emergency</h2>
            </div>

            <div className="arb-grid">
              <label>
                ID Type <span>*</span>
                <select name="identityType" value={form.identityType} onChange={updateForm} required>
                  <option value="">Select ID type</option>
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving Licence">Driving Licence</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                ID Number
                <input name="identityNumber" value={form.identityNumber} onChange={updateForm} />
              </label>

              {/* Primary Guest Document Slot with Side-by-Side Options */}
              <label>
                Verification Document {!isEditMode && !capturedPrimaryDoc && <span>*</span>}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ flex: 1 }}
                    onChange={(e) => {
                      setVerificationImage(e.target.files?.[0] || null);
                      setCapturedPrimaryDoc(null);
                    }}
                    required={!isEditMode && !currentBookingId && !verificationImage && !capturedPrimaryDoc}
                  />
                  <button
                    type="button"
                    className="arb-btn-secondary"
                    style={{
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: '#f0f9ff',
                      borderColor: '#bae6fd',
                      color: '#0284c7',
                      cursor: 'pointer',
                    }}
                    onClick={handleOpenCaptureSession}
                    title="Scan QR from phone camera"
                  >
                    <span>📱</span> Phone QR
                  </button>
                </div>
                {verificationImage && <small>{verificationImage.name}</small>}
                {capturedPrimaryDoc && (
                  <small style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    <span>✓</span> Verified via Phone QR
                  </small>
                )}
                {!verificationImage && !capturedPrimaryDoc && (isEditMode || currentBookingId) && (
                  <small style={{ color: '#64748b' }}>Leave empty to keep existing image</small>
                )}
              </label>

              <label>
                Emergency Contact Name
                <input name="emergencyContactName" value={form.emergencyContactName} onChange={updateForm} />
              </label>
              <label>
                Emergency Contact Phone
                <input type="tel" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={updateForm} />
              </label>
            </div>

            {/* Family Members */}
            <div className="arb-section-header">
              <h2 className="arb-section-title" style={{ margin: 0 }}>Family Members</h2>
              <button type="button" className="arb-btn-add" onClick={addMember}>+ Add Member</button>
            </div>
            {familyMembers.length === 0 && <p className="arb-empty">No family members added.</p>}
            {familyMembers.map((m, i) => (
              <div className="arb-family-card" key={i}>
                <div className="arb-family-row">
                  <input placeholder="Full name" value={m.name}
                    onChange={(e) => updateMember(i, 'name', e.target.value)} />
                  <input placeholder="Relation" value={m.relation}
                    onChange={(e) => updateMember(i, 'relation', e.target.value)} />
                  <input type="number" min="0" placeholder="Age" value={m.age}
                    onChange={(e) => updateMember(i, 'age', e.target.value)} />
                  <button type="button" className="arb-btn-remove" onClick={() => removeMember(i)}>Remove</button>
                </div>
                <label className="arb-family-img-label">
                  Verification Document (optional)
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ flex: 1 }}
                      onChange={(e) => updateMember(i, 'image', e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      className="arb-btn-secondary"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: '#f0f9ff',
                        borderColor: '#bae6fd',
                        color: '#0284c7',
                        cursor: 'pointer',
                      }}
                      onClick={handleOpenCaptureSession}
                      title="Scan QR from phone camera"
                    >
                      <span>📱</span> Phone QR
                    </button>
                  </div>
                  {m.image && <small>{m.image.name}</small>}
                  {m.capturedUrl && (
                    <small style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                      <span>✓</span> Captured via Phone QR
                    </small>
                  )}
                </label>
              </div>
            ))}

            <h2 className="arb-section-title">Additional Notes</h2>
            <label className="arb-full">
              Special Requests
              <textarea name="specialRequests" value={form.specialRequests} onChange={updateForm} rows="3" />
            </label>

            <div className="arb-actions">
              <button type="button" className="arb-btn-secondary" onClick={goBack}>← Back</button>
              <button type="submit" className="arb-btn-primary">Next →</button>
            </div>
          </form>
        )}

        {/* ── STEP 3 : Review & Confirm ── */}
        {step === 3 && (
          <div className="arb-card">
            <h2 style={{ fontWeight: "bolder" }}>Review & Confirm</h2>
            <div className="arb-review-section">
              <h3>Stay Details</h3>
              <div className="arb-review-grid">
                <div><span>Hotel</span><strong>{displayHotelName}</strong></div>
                <div><span>Rooms</span><strong>{selectedRoomNames.length ? selectedRoomNames.join(', ') : '—'}</strong></div>
                <div><span>Bed</span><strong>{selectedBed ? `Bed ${selectedBed.bedNumber} · ${selectedBed.bedType}` : '—'}</strong></div>
                <div><span>Check In</span><strong>{formatDate(form.checkIn)}</strong></div>
                <div><span>Check Out</span><strong>{formatDate(form.checkOut)}</strong></div>
              </div>
            </div>

            <div className="arb-review-section">
              <h3>Guest Details</h3>
              <div className="arb-review-grid">
                <div><span>Full Name</span><strong>{form.fullName || '—'}</strong></div>
                <div><span>Email</span><strong>{form.email || '—'}</strong></div>
                <div><span>Phone</span><strong>{form.phone || '—'}</strong></div>
                {form.dateOfBirth && <div><span>Date of Birth</span><strong>{formatDate(form.dateOfBirth)}</strong></div>}
                {form.gender && <div><span>Gender</span><strong>{form.gender}</strong></div>}
                {form.nationality && <div><span>Nationality</span><strong>{form.nationality}</strong></div>}
                {form.address && <div className="full"><span>Address</span><strong>{form.address}</strong></div>}
              </div>
            </div>

            <div className="arb-review-section">
              <h3>Identity & Emergency</h3>
              <div className="arb-review-grid">
                <div><span>ID Type</span><strong>{form.identityType || '—'}</strong></div>
                <div><span>ID Number</span><strong>{form.identityNumber || '—'}</strong></div>
                <div><span>Verification Doc</span><strong>{capturedPrimaryDoc ? '✓ Captured via Phone QR' : verificationImage ? verificationImage.name : (isEditMode ? 'Existing Image' : '—')}</strong></div>
                <div><span>Emergency Contact</span><strong>{form.emergencyContactName || '—'}</strong></div>
                <div><span>Emergency Phone</span><strong>{form.emergencyContactPhone || '—'}</strong></div>
                {form.specialRequests && <div className="full"><span>Special Requests</span><strong>{form.specialRequests}</strong></div>}
              </div>
            </div>

            {familyMembers.length > 0 && (
              <div className="arb-review-section">
                <h3>Family Members ({familyMembers.length})</h3>
                <div className="arb-review-grid">
                  {familyMembers.map((m, i) => (
                    <div key={i}>
                      <span>Member {i + 1}</span>
                      <strong>{m.name || '—'} ({m.relation || '—'}, {m.age || '—'} yrs) {m.capturedUrl ? '✓ QR Verified' : ''}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="arb-actions">
              <button type="button" className="arb-btn-secondary" onClick={goBack} disabled={submitting}>← Back</button>
              <button type="button" className="arb-btn-primary" onClick={handleSubmitBooking} disabled={submitting}>
                {submitting ? (isEditMode ? 'Updating…' : 'Booking…') : (isEditMode ? 'Confirm & Update' : 'Confirm & Book')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile QR Capture Session Modal */}
      <CaptureSessionModal
        bookingId={currentBookingId}
        isOpen={showCaptureModal && Boolean(currentBookingId)}
        onClose={() => setShowCaptureModal(false)}
        onSessionUpdated={handleCaptureSessionUpdated}
      />
    </div>
  );
};

export default AdminRoomBooking;
