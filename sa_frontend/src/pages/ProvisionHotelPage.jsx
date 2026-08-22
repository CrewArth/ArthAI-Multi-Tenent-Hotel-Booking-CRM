import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, User, Mail, Phone, Layers, Server, ArrowLeft } from 'lucide-react';
import { saTenantApi } from '../api/saApi';
import { CredentialsModal } from '../components/CredentialsModal';

export const ProvisionHotelPage = () => {
  const navigate = useNavigate();
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
  const [newCredentials, setNewCredentials] = useState(null);
  const [newTenantName, setNewTenantName] = useState('');

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
      setNewCredentials(res.data.generatedCredentials);
      setNewTenantName(formData.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to provision tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsClose = () => {
    setNewCredentials(null);
    navigate('/');
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            Provision New Hotel
          </h1>

        </div>

        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
            color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Main Form Card */}
      <div className="panel-card" style={{ padding: '32px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Hotel Name *</label>
              <div style={{ position: 'relative' }}>
                <Building size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Hyatt Palace Hotel"
                  value={formData.name}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px 10px 40px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Tenant Slug / ID *</label>
              <div style={{ position: 'relative' }}>
                <Server size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  name="tenantId"
                  required
                  placeholder="e.g. hyatt"
                  value={formData.tenantId}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px 10px 40px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Owner Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  name="ownerName"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={formData.ownerName}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px 10px 40px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Owner Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  name="ownerEmail"
                  required
                  placeholder="rajesh@hotel.com"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px 10px 40px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Owner Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  name="ownerPhone"
                  placeholder="+91 9876543210"
                  value={formData.ownerPhone}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px 10px 40px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Subscription Plan</label>
              <div style={{ position: 'relative' }}>
                <Layers size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px 10px 40px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 24px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              {loading ? 'Provisioning DB...' : 'Provision Tenant'}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Credentials Modal */}
      {newCredentials && (
        <CredentialsModal
          credentials={newCredentials}
          tenantName={newTenantName}
          onClose={handleCredentialsClose}
        />
      )}
    </div>
  );
};
