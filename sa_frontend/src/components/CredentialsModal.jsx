import React, { useState } from 'react';
import { KeyRound, Copy, Check, X, ShieldAlert } from 'lucide-react';

export const CredentialsModal = ({ credentials, tenantName, onClose }) => {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!credentials) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel-card" style={{ width: '540px', padding: '28px', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#64748b', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
            <KeyRound size={26} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Tenant Provisioned!</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Generated credentials for {tenantName}</p>
          </div>
        </div>

        <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <ShieldAlert size={18} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '12px', color: '#854d0e', margin: 0, lineHeight: 1.5 }}>
            These credentials have been emailed to the tenant owner. Make sure to copy them now as passwords cannot be displayed again.
          </p>
        </div>

        {/* Super Admin Credentials */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0284c7', marginBottom: '10px' }}>👑 Tenant Super Admin Account</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Email:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{credentials.superAdmin?.email}</code>
                <button onClick={() => handleCopy(credentials.superAdmin?.email, 'sa_email')} style={{ background: 'transparent', color: '#64748b' }}>
                  {copiedKey === 'sa_email' ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Password:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 'bold' }}>{credentials.superAdmin?.password}</code>
                <button onClick={() => handleCopy(credentials.superAdmin?.password, 'sa_pass')} style={{ background: 'transparent', color: '#64748b' }}>
                  {copiedKey === 'sa_pass' ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* House Admin Credentials */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a', marginBottom: '10px' }}>🔑 Tenant House Admin Account</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Email:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{credentials.admin?.email}</code>
                <button onClick={() => handleCopy(credentials.admin?.email, 'a_email')} style={{ background: 'transparent', color: '#64748b' }}>
                  {copiedKey === 'a_email' ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Password:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 'bold' }}>{credentials.admin?.password}</code>
                <button onClick={() => handleCopy(credentials.admin?.password, 'a_pass')} style={{ background: 'transparent', color: '#64748b' }}>
                  {copiedKey === 'a_pass' ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '14px' }}
        >
          Done
        </button>
      </div>
    </div>
  );
};
