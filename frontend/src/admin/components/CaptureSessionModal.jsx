import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import '../styles/captureSessionModal.css';

const CaptureSessionModal = ({
  bookingId,
  isOpen,
  onClose,
  onSessionUpdated,
  initialRoster = [],
}) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [roster, setRoster] = useState(initialRoster);
  const [customHost, setCustomHost] = useState('');
  const [ending, setEnding] = useState(false);

  const pollTimerRef = useRef(null);
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Determine dynamic base host URL
  const effectiveBaseHost = customHost.trim()
    ? customHost.trim().replace(/\/+$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const fullCaptureUrl = token ? `${effectiveBaseHost}/capture/${token}` : '';

  // ── 1. Start Capture Session on Modal Open ──
  const startSession = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/bookings/${bookingId}/capture-session`);
      const { token: sessionToken, expiresAt: exp, guests } = res.data;
      setToken(sessionToken);
      setExpiresAt(exp);
      if (Array.isArray(guests)) {
        setRoster(guests);
      }
    } catch (err) {
      console.error('[CSM] Failed to start capture session:', err);
      toast.error(err.response?.data?.message || 'Failed to start mobile capture session');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [bookingId, onClose]);

  useEffect(() => {
    if (isOpen && bookingId) {
      startSession();
    } else {
      setToken(null);
      setExpiresAt(null);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, bookingId, startSession]);

  // ── 2. Expiry Countdown Timer ──
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remainingMs = new Date(expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Expired');
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        return;
      }
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs} remaining`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // ── 3. Live Polling Roster (every 3.5 seconds) ──
  useEffect(() => {
    if (!token || !isOpen) return;

    const pollRoster = async () => {
      try {
        const res = await api.get(`/api/capture-session/roster?token=${token}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Capture-Token': token,
          },
        });
        if (res.data?.guests) {
          setRoster(res.data.guests);
          if (onSessionUpdated) {
            onSessionUpdated(res.data);
          }
        }
        if (res.data?.sessionActive === false) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (err) {
        console.warn('[CSM] Polling error:', err?.message);
      }
    };

    pollRoster();
    pollTimerRef.current = setInterval(pollRoster, 3500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [token, isOpen, onSessionUpdated]);

  // ── 4. End Session Early ──
  const handleEndSession = async () => {
    if (!bookingId) return;
    setEnding(true);
    try {
      await api.post(`/api/bookings/${bookingId}/capture-session/end`);
      toast.info('Capture session ended');
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      onClose();
    } catch (err) {
      console.error('[CSM] End session error:', err);
      toast.error('Failed to end capture session');
    } finally {
      setEnding(false);
    }
  };

  const handleCopyLink = () => {
    if (!fullCaptureUrl) return;
    navigator.clipboard.writeText(fullCaptureUrl);
    toast.success('Mobile capture link copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="csm-overlay" onClick={onClose}>
      <div className="csm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="csm-header">
          <div className="csm-title-wrap">
            <h3>
              Mobile Document Capture
            </h3>
            <p className="csm-subtitle">Scan QR code from phone camera to upload guest IDs</p>
          </div>
          <button className="csm-btn-close" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="csm-body">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Generating secure capture token...
            </div>
          ) : (
            <>
              {/* QR Code section */}
              <div className="csm-qr-section">
                <div className="csm-qr-container">
                  {fullCaptureUrl && (
                    <QRCodeSVG
                      value={fullCaptureUrl}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>

                {timeLeft && (
                  <div className={`csm-timer ${timeLeft === 'Expired' ? 'warning' : ''}`}>
                    <span>⏳</span> Session: {timeLeft}
                  </div>
                )}

                {/* Localhost IP helper toggle if on localhost */}
                {isLocalhost && (
                  <div className="csm-host-override">
                    If scanning from phone on same Wi-Fi, replace <code>localhost</code> with your computer's local IP (e.g. <code>http://192.168.1.5:5173</code>):
                    <div className="csm-host-input-row">
                      <input
                        className="csm-host-input"
                        placeholder={`http://${window.location.hostname}:5173`}
                        value={customHost}
                        onChange={(e) => setCustomHost(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Link row */}
                <div className="csm-link-row">
                  <input
                    className="csm-link-input"
                    readOnly
                    value={fullCaptureUrl}
                    onClick={(e) => e.target.select()}
                  />
                  <button className="csm-btn-copy" type="button" onClick={handleCopyLink}>
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Live Roster Status */}
              <div className="csm-roster-section">
                <div className="csm-roster-header">
                  <h4 className="csm-roster-title">Live Guest Document Status</h4>
                  <div className="csm-live-badge">
                    <span className="csm-pulse-dot"></span>
                    Live Syncing
                  </div>
                </div>

                <div className="csm-roster-list">
                  {roster.map((guest, idx) => {
                    const hasDoc = Boolean(guest.document?.url);
                    return (
                      <div
                        key={guest._id || idx}
                        className={`csm-guest-card ${hasDoc ? 'verified' : ''}`}
                      >
                        <div className="csm-guest-info">
                          <span className="csm-guest-name">
                            {guest.name || `Guest ${idx + 1}`}{' '}
                            {guest.role === 'PRIMARY' ? '(Primary Guest)' : guest.relation ? `(${guest.relation})` : ''}
                          </span>
                          <span className="csm-guest-meta">
                            {hasDoc
                              ? `${guest.document?.label || 'Document'} uploaded via ${guest.document?.uploadedVia || 'phone'}`
                              : 'Waiting for photo capture...'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {hasDoc && (
                            <img
                              src={guest.document.url}
                              alt="Doc"
                              className="csm-thumb-preview"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <span
                            className={`csm-status-badge ${hasDoc ? 'complete' : 'missing'}`}
                          >
                            {hasDoc ? '✓ Uploaded' : '● Pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="csm-footer">
          <button
            className="csm-btn-end"
            type="button"
            onClick={handleEndSession}
            disabled={ending || loading}
          >
            {ending ? 'Ending…' : 'End Capture Session'}
          </button>
          <button className="csm-btn-done" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptureSessionModal;
