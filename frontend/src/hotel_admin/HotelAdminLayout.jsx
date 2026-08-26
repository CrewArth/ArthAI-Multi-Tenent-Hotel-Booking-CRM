import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, Edit3, DoorOpen, BedDouble, LogOut, ShieldAlert, User } from 'lucide-react';
import { getStoredUser } from '../utils/auth';

export const HotelAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/hotel-admin/dashboard', icon: LayoutDashboard },
    { label: 'Edit Assigned Hotel', path: '/hotel-admin/edit-property', icon: Edit3 },
    { label: 'Rooms Management', path: '/hotel-admin/rooms', icon: DoorOpen },
    { label: 'Beds Management', path: '/hotel-admin/beds', icon: BedDouble },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* Hotel Admin Header Bar */}
      <header style={{
        background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff',
            padding: '8px 14px', borderRadius: '10px', border: '1px solid #bfdbfe'
          }}>
            <Building2 size={22} color="#2563eb" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
                {user?.assignedGuestHouseId ? `Hotel: ${user.assignedGuestHouseId}` : 'Assigned Hotel Admin'}
              </div>
              <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <ShieldAlert size={10} /> Localized Hotel Admin Scope
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
                    borderRadius: '8px', fontSize: '13px', fontWeight: isActive ? '700' : '600',
                    color: isActive ? '#2563eb' : '#475569', background: isActive ? '#eff6ff' : 'transparent',
                    textDecoration: 'none', transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={16} /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <User size={16} />
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Hotel Admin'}
              </div>
              <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                HOTEL_ADMIN
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '8px', background: '#fef2f2', border: '1px solid #fca5a5',
              color: '#dc2626', fontWeight: '700', fontSize: '12px', cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content View */}
      <main style={{ flex: 1, padding: '32px 28px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};
