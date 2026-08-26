import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Plus, Edit2, Trash2, CheckCircle2, XCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import { getStoredUser } from '../utils/auth';

export const HotelAdminRoomManagement = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const assignedId = user?.assignedGuestHouseId;

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [error, setError] = useState(null);

  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    roomType: 'Standard',
    floor: 1,
    capacity: 2,
    ratePerNight: 1500,
  });

  const fetchRooms = async () => {
    setLoading(true);
    try {
      if (assignedId) {
        const res = await api.post('/rooms/by-guesthouse', { guestHouseId: assignedId });
        setRooms(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [assignedId]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/rooms', {
        ...roomForm,
        guestHouseId: assignedId,
      });
      setShowAddModal(false);
      setRoomForm({ roomNumber: '', roomType: 'Standard', floor: 1, capacity: 2, ratePerNight: 1500 });
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    }
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.put(`/rooms/${editingRoom._id}`, {
        ...roomForm,
        guestHouseId: assignedId,
      });
      setEditingRoom(null);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      fetchRooms();
    } catch (err) {
      console.error('Delete room error:', err);
    }
  };

  const handleToggleAvailability = async (roomId, currentAvailable) => {
    try {
      await api.patch(`/rooms/${roomId}/availability`, { available: !currentAvailable });
      fetchRooms();
    } catch (err) {
      console.error('Toggle availability error:', err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Room Management — {assignedId}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Add, configure, and manage rooms exclusively for property {assignedId}.
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
            onClick={() => {
              setRoomForm({ roomNumber: '', roomType: 'Standard', floor: 1, capacity: 2, ratePerNight: 1500 });
              setShowAddModal(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
              background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add New Room
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No rooms found for this property yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' }}>
                  <th style={{ padding: '12px 16px' }}>Room No.</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Floor</th>
                  <th style={{ padding: '12px 16px' }}>Capacity</th>
                  <th style={{ padding: '12px 16px' }}>Rate / Night</th>
                  <th style={{ padding: '12px 16px' }}>Availability</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <td style={{ padding: '16px', fontWeight: '700', color: '#0f172a' }}>{r.roomNumber}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{r.roomType || 'Standard'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>Floor {r.floor || 1}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{r.capacity} Guests</td>
                    <td style={{ padding: '16px', fontWeight: '700', color: '#15803d' }}>₹{r.ratePerNight}</td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => handleToggleAvailability(r._id, r.available)}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                          background: r.available ? '#dcfce7' : '#fee2e2',
                          color: r.available ? '#15803d' : '#b91c1c',
                          border: 'none', cursor: 'pointer'
                        }}
                      >
                        {r.available ? 'Available' : 'Occupied / Maintenance'}
                      </button>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setEditingRoom(r);
                            setRoomForm({
                              roomNumber: r.roomNumber,
                              roomType: r.roomType || 'Standard',
                              floor: r.floor || 1,
                              capacity: r.capacity || 2,
                              ratePerNight: r.ratePerNight || 1500,
                            });
                          }}
                          style={{ padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r._id)}
                          style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Room Modal */}
      {(showAddModal || editingRoom) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', width: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </h3>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <form onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Room Number *</label>
                <input
                  type="text"
                  required
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Type</label>
                  <select
                    value={roomForm.roomType}
                    onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#ffffff' }}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Floor</label>
                  <input
                    type="number"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Capacity (Guests)</label>
                  <input
                    type="number"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Rate / Night (₹)</label>
                  <input
                    type="number"
                    value={roomForm.ratePerNight}
                    onChange={(e) => setRoomForm({ ...roomForm, ratePerNight: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingRoom(null); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: '700' }}
                >
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
