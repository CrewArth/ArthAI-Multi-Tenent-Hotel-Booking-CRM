import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

export const HotelAdminConfiguration = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await api.post('/api/hotel-admin/configuration');
        if (res.data?.configuration) {
          setSendEmail(res.data.configuration.sendEmail !== false);
          setSendWhatsapp(Boolean(res.data.configuration.sendWhatsapp));
        }
      } catch (err) {
        console.error('Error fetching hotel configuration:', err);
        toast.error(err.response?.data?.message || 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/api/hotel-admin/configuration/update', {
        sendEmail,
        sendWhatsapp,
      });
      toast.success(res.data?.message || 'Configuration saved successfully');
      if (res.data?.configuration) {
        setSendEmail(res.data.configuration.sendEmail !== false);
        setSendWhatsapp(Boolean(res.data.configuration.sendWhatsapp));
      }
    } catch (err) {
      console.error('Error saving hotel configuration:', err);
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', padding: '20px' }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Configuration
        </h1>
      </div>

      <form
        onSubmit={handleSave}
        style={{
          flex: 1,
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label
              htmlFor="sendEmail"
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              Send Email
            </label>
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label
              htmlFor="sendWhatsapp"
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              Send Whatsapp Message
            </label>
            <input
              type="checkbox"
              id="sendWhatsapp"
              checked={sendWhatsapp}
              onChange={(e) => setSendWhatsapp(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Save button at bottom left */}
        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelAdminConfiguration;
