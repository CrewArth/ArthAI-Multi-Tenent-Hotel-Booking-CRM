import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../styles/mobileCapture.css';

// Automatically detect the backend API URL (handles deployed domains or local IP)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  // When running locally on Vite dev server (port 5173), proxy to port 5000
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:5000`;
    }
    // In production or mobile LAN IP, fallback to same origin or port 5000 if dev
    if (window.location.port === '5173') {
      return `${protocol}//${hostname}:5000`;
    }
    return window.location.origin;
  }
  return '';
};

const MobileCapturePage = () => {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = paramToken || searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [uploadingGuestId, setUploadingGuestId] = useState(null);

  // Custom document labels per guest ID
  const [docLabels, setDocLabels] = useState({});

  // Add Family Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', relation: '', age: '' });
  const [addingMember, setAddingMember] = useState(false);

  const fileInputRefs = useRef({});
  const apiBase = getApiBaseUrl();

  // ── 1. Fetch Session Roster ──
  const fetchRoster = useCallback(async () => {
    if (!token) {
      setErrorMsg('No capture token provided');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${apiBase}/api/capture-session/roster?token=${token}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSessionData(res.data);
      setErrorMsg(null);
      setIsExpired(!res.data.sessionActive);

      // Prepopulate default document labels if present
      if (Array.isArray(res.data.guests)) {
        const labels = {};
        res.data.guests.forEach((g) => {
          labels[g._id] = g.document?.label || (g.role === 'PRIMARY' ? 'Aadhaar' : 'Verification Document');
        });
        setDocLabels((prev) => ({ ...labels, ...prev }));
      }
    } catch (err) {
      console.error('[MOBILE_CAPTURE] fetch error:', err);
      const msg = err.response?.data?.message || 'Invalid or expired capture session';
      setErrorMsg(msg);
      setIsExpired(true);
    } finally {
      setLoading(false);
    }
  }, [token, apiBase]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // ── 2. Expiry Countdown ──
  useEffect(() => {
    if (!sessionData?.expiresAt) return;

    const updateTimer = () => {
      const remainingMs = new Date(sessionData.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionData?.expiresAt]);

  // ── 3. Handle File Capture & Upload ──
  const handleFileChange = async (guestId, file) => {
    if (!file) return;

    setUploadingGuestId(guestId);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('label', docLabels[guestId] || 'Verification Document');

      const res = await axios.post(
        `${apiBase}/api/capture-session/guests/${guestId}/document?token=${token}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Photo uploaded successfully!');

      // Update state locally with uploaded document
      if (res.data?.document) {
        setSessionData((prev) => {
          if (!prev) return prev;
          const updatedGuests = prev.guests.map((g) =>
            String(g._id) === String(guestId) ? { ...g, document: res.data.document } : g
          );
          return { ...prev, guests: updatedGuests };
        });
      }
    } catch (err) {
      console.error('[MOBILE_CAPTURE] upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingGuestId(null);
      // Reset input value so re-selecting same file triggers change
      if (fileInputRefs.current[guestId]) {
        fileInputRefs.current[guestId].value = '';
      }
    }
  };

  // ── 4. Add Family Member ──
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name.trim()) {
      toast.error('Please enter guest name');
      return;
    }

    setAddingMember(true);
    try {
      const res = await axios.post(
        `${apiBase}/api/capture-session/guests?token=${token}`,
        newMember,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Family member added!');
      setShowAddModal(false);
      setNewMember({ name: '', relation: '', age: '' });
      await fetchRoster();

      // Automatically trigger camera for the new member
      if (res.data?.guest?._id) {
        const newId = res.data.guest._id;
        setTimeout(() => {
          if (fileInputRefs.current[newId]) {
            fileInputRefs.current[newId].click();
          }
        }, 400);
      }
    } catch (err) {
      console.error('[MOBILE_CAPTURE] add guest error:', err);
      toast.error(err.response?.data?.message || 'Failed to add family member');
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return (
      <div className="mc-container" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div className="mc-spinner" style={{ margin: '0 auto 1rem' }}></div>
          Loading verification session...
        </div>
      </div>
    );
  }

  if (isExpired || errorMsg) {
    return (
      <div className="mc-container">
        <header className="mc-header">
          <div className="mc-brand-title">
            <span>🏨</span> Guest House Verification
          </div>
        </header>
        <div className="mc-content">
          <div className="mc-expired-card">
            <span className="mc-expired-icon">⌛</span>
            <h2 className="mc-expired-title">Session Expired or Inactive</h2>
            <p className="mc-expired-desc">
              {errorMsg || 'This mobile capture session has expired or was ended by the front desk.'}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              Please ask the desk staff to generate a new QR code on the booking screen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { primaryGuestName, guestHouseName, guests = [] } = sessionData || {};
  const completedCount = guests.filter((g) => g.document?.url).length;
  const isAllComplete = guests.length > 0 && completedCount === guests.length;

  return (
    <div className="mc-container">
      {/* Sticky Header */}
      <header className="mc-header">
        <div className="mc-header-top">
          <h1 className="mc-brand-title">
            <span>🏨</span> {guestHouseName || 'Guest House'}
          </h1>
          <span className="mc-badge-live">● Live</span>
        </div>

        <div className="mc-header-info">
          <div>
            Primary Guest: <strong>{primaryGuestName}</strong>
          </div>
          <div>
            Documents Verified: <strong>{completedCount} / {guests.length}</strong>
          </div>
        </div>

        {timeLeft && (
          <div className={`mc-timer-bar ${timeLeft === 'Expired' ? 'warning' : ''}`}>
            <span>⏳ Session expires in</span>
            <strong>{timeLeft}</strong>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mc-content">
        <div className="mc-section-header">
          <h2 className="mc-section-title">Guest Verification Roster</h2>
          <button
            type="button"
            className="mc-btn-add-guest"
            onClick={() => setShowAddModal(true)}
          >
            <span>+</span> Add Member
          </button>
        </div>

        {isAllComplete && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#065f46',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
            }}
          >
            <span>🎉</span> All guest verification documents captured! The desktop booking screen has been updated live.
          </div>
        )}

        {/* Guest Cards */}
        {guests.map((guest, idx) => {
          const guestId = guest._id;
          const hasDoc = Boolean(guest.document?.url);
          const isUploading = uploadingGuestId === guestId;

          return (
            <div
              key={guestId || idx}
              className={`mc-card ${hasDoc ? 'verified' : ''}`}
            >
              {isUploading && (
                <div className="mc-card-overlay">
                  <div className="mc-spinner"></div>
                  <span>Uploading document photo...</span>
                </div>
              )}

              <div className="mc-card-top">
                <div>
                  <h3 className="mc-guest-name">
                    {guest.name || `Guest ${idx + 1}`}
                  </h3>
                  <div className="mc-guest-role">
                    {guest.role === 'PRIMARY'
                      ? '⭐ Primary Guest'
                      : `Family Member ${guest.relation ? `(${guest.relation})` : ''}`}
                    {guest.age ? ` · ${guest.age} yrs` : ''}
                  </div>
                </div>

                <span className={`mc-status-pill ${hasDoc ? 'done' : 'missing'}`}>
                  {hasDoc ? '✓ Done' : '● Missing'}
                </span>
              </div>

              {/* Document Label input */}
              <div className="mc-label-row">
                <label className="mc-label-title" htmlFor={`label-${guestId}`}>
                  Document Type:
                </label>
                <input
                  id={`label-${guestId}`}
                  className="mc-label-input"
                  placeholder="e.g. Aadhaar, Passport, Driving Licence"
                  value={docLabels[guestId] || ''}
                  onChange={(e) =>
                    setDocLabels((prev) => ({ ...prev, [guestId]: e.target.value }))
                  }
                />
              </div>

              {/* Preview if document is uploaded */}
              {hasDoc && (
                <div className="mc-doc-preview">
                  <img
                    src={guest.document.url}
                    alt="Document Preview"
                    className="mc-doc-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="mc-doc-meta">
                    <span className="mc-doc-tag">
                      {guest.document.label || 'Document Photo'}
                    </span>
                    <span className="mc-doc-time">
                      Captured via camera
                    </span>
                  </div>
                </div>
              )}

              {/* Hidden file input with direct camera capture */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="mc-hidden-input"
                ref={(el) => { fileInputRefs.current[guestId] = el; }}
                onChange={(e) => handleFileChange(guestId, e.target.files?.[0])}
              />

              {/* Capture / Recapture button */}
              <button
                type="button"
                className={`mc-camera-btn ${hasDoc ? 'recapture' : ''}`}
                onClick={() => {
                  if (fileInputRefs.current[guestId]) {
                    fileInputRefs.current[guestId].click();
                  }
                }}
              >
                <span>📷</span>
                {hasDoc ? 'Retake / Replace Photo' : 'Take Photo with Camera'}
              </button>
            </div>
          );
        })}
      </main>

      {/* Add Family Member Bottom Sheet */}
      {showAddModal && (
        <div className="mc-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="mc-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="mc-modal-title">Add Family Member</h3>
            <form onSubmit={handleAddMember}>
              <div className="mc-form-group">
                <label>Full Name *</label>
                <input
                  className="mc-form-input"
                  placeholder="e.g. Priya Sharma"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>

              <div className="mc-form-group">
                <label>Relation (optional)</label>
                <input
                  className="mc-form-input"
                  placeholder="e.g. Spouse, Child, Parent"
                  value={newMember.relation}
                  onChange={(e) => setNewMember({ ...newMember, relation: e.target.value })}
                />
              </div>

              <div className="mc-form-group">
                <label>Age (optional)</label>
                <input
                  type="number"
                  min="0"
                  className="mc-form-input"
                  placeholder="e.g. 28"
                  value={newMember.age}
                  onChange={(e) => setNewMember({ ...newMember, age: e.target.value })}
                />
              </div>

              <div className="mc-modal-actions">
                <button
                  type="button"
                  className="mc-btn-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mc-btn-modal-save"
                  disabled={addingMember}
                >
                  {addingMember ? 'Adding…' : 'Add & Take Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCapturePage;
