import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSaAuth } from '../context/SaAuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const SaLogin = () => {
  const { user, login, loading } = useSaAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await login(email, password);
    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(res.error);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', backgroundColor: '#f8fafc' }}>
      <div className="panel-card" style={{ width: '420px', padding: '40px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src={logoImg}
            alt="Arth.AI Logo"
            style={{ height: '52px', width: 'auto', objectFit: 'contain', margin: '0 auto 12px', display: 'block' }}
            draggable="false"
          />
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>Super Super Admin</h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Control Plane Sign In</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="email"
                required
                placeholder="arth@superadmin.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#2563eb', color: '#fff', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}
          >
            {loading ? 'Authenticating...' : <>Sign In to Control Plane <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};
