import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaAuth } from '../context/SaAuthContext';
import { ShieldCheck, LogOut } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const Navbar = () => {
  const { user, logout } = useSaAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      height: '70px',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>

        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={logoImg}
            alt="Neuvera Logo"
            style={{ height: '42px', width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => navigate('/')}
            draggable="false"
          />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              Neuvera
            </h2>
          </div>
        </div>

        {/* User Status & Actions */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 14px', borderRadius: '100px', border: '1px solid #e2e8f0' }}>
              <ShieldCheck size={16} color="#16a34a" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fca5a5',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                transition: 'all 0.15s ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#b91c1c';
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
