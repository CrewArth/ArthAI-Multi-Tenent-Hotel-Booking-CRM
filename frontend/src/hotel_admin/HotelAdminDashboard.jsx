import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Edit3, DoorOpen, BedDouble, CheckCircle, ShieldAlert, Sparkles, MapPin, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { getStoredUser } from '../utils/auth';

export const HotelAdminDashboard = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const assignedId = user?.assignedGuestHouseId;

  const [hotelDetails, setHotelDetails] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (assignedId) {
        const ghRes = await api.get(`/guesthouses/${assignedId}`);
        setHotelDetails(ghRes.data?.guestHouse || ghRes.data);

        const roomRes = await api.post('/rooms/by-guesthouse', { guestHouseId: assignedId });
        setRooms(roomRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching assigned hotel dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [assignedId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px', padding: '28px 32px', color: '#ffffff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#60a5fa', marginBottom: '12px' }}>
            <Sparkles size={14} /> HOTEL_ADMIN Control Panel
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em', color: '#ffffff' }}>
            {hotelDetails?.guestHouseName || `Assigned Property: ${assignedId || 'Not Assigned'}`}
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} /> {hotelDetails?.location?.city ? `${hotelDetails.location.city}, ${hotelDetails.location.state}` : 'Property Location Unspecified'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px', color: '#ffffff', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Sync
          </button>

          <button
            onClick={() => navigate('/hotel-admin/edit-property')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              background: '#2563eb', border: 'none', borderRadius: '10px',
              color: '#ffffff', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
            }}
          >
            <Edit3 size={16} /> Edit Hotel Details
          </button>
        </div>
      </div>

      {/* Scope Restriction Notice */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#1e40af'
      }}>
        <ShieldAlert size={20} color="#2563eb" />
        <div>
          <strong>Localized Hotel Administration Permissions Active:</strong> You have full editing privileges for property <strong>{assignedId}</strong>, including its rooms, beds, and telemetry. Note that creating new hotels or deleting existing properties requires central SuperAdmin authorization.
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Assigned Property</span>
            <Building2 size={20} color="#2563eb" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
            {assignedId || 'N/A'}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Total Rooms</span>
            <DoorOpen size={20} color="#16a34a" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a' }}>
            {rooms.length}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Maintenance Status</span>
            <CheckCircle size={20} color={hotelDetails?.maintenance ? '#dc2626' : '#16a34a'} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: hotelDetails?.maintenance ? '#dc2626' : '#16a34a' }}>
            {hotelDetails?.maintenance ? 'Under Maintenance' : 'Operational'}
          </div>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
          Hotel Admin Quick Controls
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div
            onClick={() => navigate('/hotel-admin/edit-property')}
            style={{
              padding: '18px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff',
              cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', gap: '14px', alignItems: 'center'
            }}
          >
            <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', color: '#2563eb' }}>
              <Edit3 size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Edit Hotel Branding & Details</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Update name, location, image, and maintenance mode.</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/hotel-admin/rooms')}
            style={{
              padding: '18px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff',
              cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', gap: '14px', alignItems: 'center'
            }}
          >
            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}>
              <DoorOpen size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Manage Rooms</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Add, edit, or toggle room availability for this hotel.</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/hotel-admin/beds')}
            style={{
              padding: '18px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff',
              cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', gap: '14px', alignItems: 'center'
            }}
          >
            <div style={{ padding: '12px', background: '#f3e8ff', borderRadius: '10px', color: '#7c3aed' }}>
              <BedDouble size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Manage Beds</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Configure bed inventory & auto-generation per room.</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
