import React, { useState } from 'react';
import { X, Building, User, Mail, Phone, Layers, Server } from 'lucide-react';
import { saTenantApi } from '../api/saApi';

export const ProvisionTenantModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    tenantId: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    plan: 'pro',
    s3BucketName: '',
    s3Region: 'us-east-1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'name' && !prev.tenantId) {
        updated.tenantId = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await saTenantApi.provisionTenant(formData);
      onSuccess(res.data.generatedCredentials, formData.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to provision tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel-card" style={{ width: '580px', padding: '28px', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#64748b', fontSize: '18px', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Quick Provision Hotel</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Or use full enterprise onboarding stepper page</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              window.location.href = '/provision-hotel';
            }}
            style={{
              padding: '6px 12px', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe',
              color: '#2563eb', fontWeight: '700', fontSize: '12px', cursor: 'pointer', marginRight: '24px'
            }}
          >
            Launch Stepper →
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Hotel Name *</label>
              <div style={{ position: 'relative' }}>
                <Building size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Hyatt Palace Hotel"
                  value={formData.name}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Tenant Slug / ID *</label>
              <div style={{ position: 'relative' }}>
                <Server size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  name="tenantId"
                  required
                  placeholder="e.g. hyatt"
                  value={formData.tenantId}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Owner Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  name="ownerName"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={formData.ownerName}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Owner Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="email"
                  name="ownerEmail"
                  required
                  placeholder="rajesh@hotel.com"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Owner Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  name="ownerPhone"
                  placeholder="+91 9876543210"
                  value={formData.ownerPhone}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Subscription Plan</label>
              <div style={{ position: 'relative' }}>
                <Layers size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: '600' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '9px 22px', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '14px' }}
            >
              {loading ? 'Provisioning DB...' : 'Provision Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
