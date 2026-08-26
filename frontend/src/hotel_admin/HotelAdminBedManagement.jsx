import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Plus, Edit2, Trash2, ArrowLeft, Wand2 } from 'lucide-react';
import api from '../utils/api';
import { getStoredUser } from '../utils/auth';

export const HotelAdminBedManagement = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const assignedId = user?.assignedGuestHouseId;

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState(null);

  const [bedForm, setBedForm] = useState({
    bedNumber: '',
    bedType: 'Single',
  });

  useEffect(() => {
    const fetchRooms = async () => {
      if (!assignedId) return;
      try {
        const res = await api.post('/rooms/by-guesthouse', { guestHouseId: assignedId });
        const roomList = res.data || [];
        setRooms(roomList);
        if (roomList.length > 0) {
          setSelectedRoomId(roomList[0]._id);
        }
      } catch (err) {
        console.error('Error fetching property rooms:', err);
      }
    };
    fetchRooms();
  }, [assignedId]);

  const fetchBeds = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    try {
      const res = await api.post('/beds/list', { roomId: selectedRoomId });
      setBeds(res.data || []);
    } catch (err) {
      console.error('Error fetching room beds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [selectedRoomId]);

  const handleCreateBed = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/beds', {
        ...bedForm,
        roomId: selectedRoomId,
        guestHouseId: assignedId,
      });
      setShowAddModal(false);
      setBedForm({ bedNumber: '', bedType: 'Single' });
      fetchBeds();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create bed');
    }
  };

  const handleAutoCreateBeds = async () => {
    if (!selectedRoomId) return;
    try {
      await api.post('/beds/auto-create', {
        roomId: selectedRoomId,
        guestHouseId: assignedId,
      });
      fetchBeds();
    } catch (err) {
      console.error('Auto create beds error:', err);
    }
  };

  const handleDeleteBed = async (bedId) => {
    if (!window.confirm('Are you sure you want to delete this bed?')) return;
    try {
      await api.delete(`/beds/${bedId}`);
      fetchBeds();
    } catch (err) {
      console.error('Delete bed error:', err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Bed Inventory Management — {assignedId}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Manage bed assets per room for property {assignedId}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/hotel-admin/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
              background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
              color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <button
            onClick={handleAutoCreateBeds}
            disabled={!selectedRoomId}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
              background: '#f3e8ff', color: '#7c3aed', border: '1px solid #d8b4fe', borderRadius: '8px',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer'
            }}
          >
            <Wand2 size={16} /> Auto-Generate Beds
          </button>

          <button
            onClick={() => {
              setBedForm({ bedNumber: '', bedType: 'Single' });
              setShowAddModal(true);
            }}
            disabled={!selectedRoomId}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
              background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add Bed
          </button>
        </div>
      </div>

      {/* Filter Selector & Beds Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        
        {/* Room Selector */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Select Room:</label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#ffffff', minWidth: '240px' }}
          >
            {rooms.length === 0 ? (
              <option value="">No rooms available</option>
            ) : (
              rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  Room {r.roomNumber} ({r.roomType || 'Standard'}) - Floor {r.floor || 1}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Beds Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading beds...</div>
        ) : beds.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No beds found in this room. Click "Add Bed" or "Auto-Generate Beds".</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' }}>
                  <th style={{ padding: '12px 16px' }}>Bed Number</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {beds.map((b) => (
                  <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <td style={{ padding: '16px', fontWeight: '700', color: '#0f172a' }}>Bed {b.bedNumber}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{b.bedType || 'Single'}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                        background: b.isAvailable !== false ? '#dcfce7' : '#fee2e2',
                        color: b.isAvailable !== false ? '#15803d' : '#b91c1c'
                      }}>
                        {b.isAvailable !== false ? 'Available' : 'Occupied'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteBed(b._id)}
                        style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Bed Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', width: '420px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>Add Bed</h3>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBed} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Bed Number / Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B1"
                  value={bedForm.bedNumber}
                  onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Bed Type</label>
                <select
                  value={bedForm.bedType}
                  onChange={(e) => setBedForm({ ...bedForm, bedType: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#ffffff' }}
                >
                  <option value="Single">Single Bed</option>
                  <option value="Double">Double Bed</option>
                  <option value="King">King Size</option>
                  <option value="Bunk">Bunk Bed</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: '700' }}
                >
                  Create Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
