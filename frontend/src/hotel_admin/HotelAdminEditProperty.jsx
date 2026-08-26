import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Save, ArrowLeft, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import { getStoredUser } from '../utils/auth';

export const HotelAdminEditProperty = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const assignedId = user?.assignedGuestHouseId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    guestHouseName: '',
    city: '',
    state: '',
    description: '',
    maintenance: false,
  });

  useEffect(() => {
    if (!assignedId) {
      setError('No assigned property found for your Hotel Admin account.');
      setFetching(false);
      return;
    }

    const fetchProperty = async () => {
      setFetching(true);
      try {
        const res = await api.get(`/guesthouses/${assignedId}`);
        const gh = res.data?.guestHouse || res.data;
        if (gh) {
          setFormData({
            guestHouseName: gh.guestHouseName || '',
            city: gh.location?.city || '',
            state: gh.location?.state || '',
            description: gh.description || '',
            maintenance: Boolean(gh.maintenance),
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch assigned property details');
      } finally {
        setFetching(false);
      }
    };

    fetchProperty();
  }, [assignedId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = new FormData();
    payload.append('guestHouseName', formData.guestHouseName);
    payload.append('location', JSON.stringify({ city: formData.city, state: formData.state }));
    payload.append('description', formData.description);

    try {
      await api.put(`/guesthouses/${assignedId}`, payload);
      setSuccess('Hotel details updated successfully!');
      setTimeout(() => navigate('/hotel-admin/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update hotel property');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceToggle = async () => {
    try {
      await api.patch(`/guesthouses/${assignedId}/maintenance`);
      setFormData((prev) => ({ ...prev, maintenance: !prev.maintenance }));
      setSuccess(`Maintenance mode ${!formData.maintenance ? 'activated' : 'deactivated'}`);
    } catch (err) {
      setError('Failed to toggle maintenance mode');
    }
  };

  if (fetching) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading property details...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Edit Assigned Hotel Details
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Property ID: <strong>{assignedId}</strong>
          </p>
        </div>

        <button
          onClick={() => navigate('/hotel-admin/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
            color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Main Form Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '32px' }}>
        
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
              Hotel / Guest House Name *
            </label>
            <input
              type="text"
              required
              value={formData.guestHouseName}
              onChange={(e) => setFormData({ ...formData, guestHouseName: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                State *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Maintenance Mode Toggle Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Maintenance Mode</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Temporarily pause new bookings for this property.</div>
            </div>
            <button
              type="button"
              onClick={handleMaintenanceToggle}
              style={{
                padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
                background: formData.maintenance ? '#fee2e2' : '#dcfce7',
                color: formData.maintenance ? '#dc2626' : '#16a34a',
                border: formData.maintenance ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                cursor: 'pointer'
              }}
            >
              {formData.maintenance ? 'Deactivate Maintenance' : 'Activate Maintenance'}
            </button>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => navigate('/hotel-admin/dashboard')}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: '8px', background: '#2563eb', color: '#ffffff',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Save size={16} /> {loading ? 'Saving...' : 'Save Hotel Changes'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
