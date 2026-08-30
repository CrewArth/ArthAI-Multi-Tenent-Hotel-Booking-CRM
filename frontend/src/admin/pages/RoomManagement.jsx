import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomFormModal from '../components/RoomFormModel';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { RupeeIcon } from '../../common/icons';

import { getStoredUser } from '../../utils/auth';

const RoomManagement = () => {
  const [rooms, setRooms]               = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [guestHouse, setGuestHouse]     = useState(null);
  const [guestHouses, setGuestHouses]   = useState([]);
  const [selectedGHId, setSelectedGHId] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [subUsage, setSubUsage]         = useState(null);
  const [togglingRoomId, setTogglingRoomId] = useState(null);

  const [searchParams] = useSearchParams();
  const ghFromQuery = searchParams.get('guestHouseId');

  const fetchGuestHouses = async () => {
    try {
      const res = await api.post('/api/guesthouses/list');
      let list = Array.isArray(res.data) ? res.data : [];
      const user = getStoredUser();
      const isScopedAdmin = user?.role === 'HOTEL_ADMIN' || user?.role === 'HOTEL-ADMIN' || (user?.role === 'ADMIN' && user?.assignedGuestHouseId);
      const assignedId = user?.assignedGuestHouseId;

      if (isScopedAdmin && assignedId) {
        list = list.filter(g => String(g.guestHouseId) === String(assignedId) || String(g._id) === String(assignedId));
        if (list.length > 0) {
          const targetId = list[0].guestHouseId || list[0]._id;
          setSelectedGHId(targetId);
        }
      }
      setGuestHouses(list);
    } catch (err) { console.error(err); }
  };

  const fetchSubUsage = async () => {
    try {
      const res = await api.post('/api/subscription/usage');
      setSubUsage(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchGuestHouse = async (id) => {
    if (!id) { setGuestHouse(null); return; }
    try {
      const res = await api.get(`/api/guesthouses/${id}`);
      setGuestHouse(res.data.guestHouse || null);
    } catch (err) { setGuestHouse(null); }
  };

  const fetchRooms = async (ghId) => {
    if (!ghId) { setRooms([]); return; }
    try {
      setLoading(true);
      const res = await api.post(`/api/rooms/by-guesthouse`, { guestHouseId: ghId });
      setRooms(res.data.rooms || []);
    } catch (err) { setRooms([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchGuestHouses();
    fetchSubUsage();
    if (ghFromQuery) { setSelectedGHId(ghFromQuery); fetchGuestHouse(ghFromQuery); fetchRooms(ghFromQuery); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghFromQuery]);

  useEffect(() => {
    if (selectedGHId) { fetchGuestHouse(selectedGHId); fetchRooms(selectedGHId); }
    else { setGuestHouse(null); setRooms([]); }
  }, [selectedGHId]);

  const planName = subUsage?.plan || 'BASIC';
  const maxRoomsPerHotel = subUsage?.limits?.maxRoomsPerHotel ?? 10;
  const currentRoomCount = rooms.length;
  const isRoomLimitReached = Boolean(selectedGHId) && currentRoomCount >= maxRoomsPerHotel;

  const roomHoverMessage = !selectedGHId
    ? 'Please select a hotel first'
    : isRoomLimitReached
      ? `Subscription limit reached: Your ${planName} plan allows a maximum of ${maxRoomsPerHotel} room(s) per hotel. Please upgrade your plan.`
      : '';

  const handleAdd = async (newRoom) => {
    try {
      await api.post('/api/rooms', { ...newRoom, roomType: newRoom.roomType || 'single', guestHouseId: selectedGHId });
      toast.success('Room created successfully');
      fetchRooms(selectedGHId);
      fetchSubUsage();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to add room'); }
  };

  const handleEdit = async (updated) => {
    try {
      await api.put(`/api/rooms/${selectedRoom._id}`, { ...updated, roomType: updated.roomType || 'single' });
      toast.success('Room updated');
      fetchRooms(selectedGHId);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update room'); }
  };

  const toggleAvailability = async (roomId, current) => {
    const nextAvailability = !current;

    // 1. Optimistic in-place update for instant UI feedback without table reload
    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r._id === roomId ? { ...r, isAvailable: nextAvailability } : r
      )
    );
    setTogglingRoomId(roomId);

    try {
      // 2. Perform API call in background
      await api.patch(`/api/rooms/${roomId}/availability`, { isAvailable: nextAvailability });
      toast.success(`Room marked as ${nextAvailability ? 'Available' : 'Maintenance'}`);
    } catch (err) {
      console.error('toggleAvailability error:', err);
      // 3. Rollback local state on error
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          r._id === roomId ? { ...r, isAvailable: current } : r
        )
      );
      toast.error(err?.response?.data?.message || 'Failed to update room availability');
    } finally {
      setTogglingRoomId(null);
    }
  };

  const deleteRoom = async (roomId) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await api.delete(`/api/rooms/${roomId}`);
      toast.success('Room deleted');
      fetchRooms(selectedGHId);
      fetchSubUsage();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to delete room'); }
  };

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Room Management</h1>
          <p className="page-subtitle">
            {guestHouse ? guestHouse.guestHouseName : selectedGHId ? 'Loading…' : 'Select a hotel to view rooms'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedGHId && subUsage && (
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
              Plan: <strong style={{ color: '#1e293b' }}>{planName}</strong> ({currentRoomCount}/{maxRoomsPerHotel} Rooms)
            </span>
          )}
          <select
            className="toolbar-select"
            value={selectedGHId || ''}
            onChange={(e) => setSelectedGHId(e.target.value || null)}
          >
            <option value="">Select Hotel</option>
            {guestHouses.map((g) => (
              <option key={g.guestHouseId || g._id} value={g.guestHouseId || g._id}>
                {g.guestHouseName}
              </option>
            ))}
          </select>
          <button
            className="btn-primary-cta"
            disabled={!selectedGHId || isRoomLimitReached}
            title={roomHoverMessage}
            style={(!selectedGHId || isRoomLimitReached) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            onClick={() => {
              if (!selectedGHId) { alert('Please select a Hotel first.'); return; }
              setIsModalOpen(true);
            }}
          >
            + Add Room {isRoomLimitReached && `(${currentRoomCount}/${maxRoomsPerHotel})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        {loading ? (
          <div style={{ padding: '1.5rem', color: '#64748b' }}>Loading rooms…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Room No.</th>
                <th>Capacity</th>
                <th>Price (per night)</th>
                <th>Discount</th>
                <th>Final Price</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr><td colSpan="7" className="table-empty">No rooms found. Select a hotel or add a new room.</td></tr>
              ) : (
                rooms.map((room) => {
                  const price    = room.price    ?? 0;
                  const discount = room.discountPercentage ?? 0;
                  const finalPrice = price - (price * discount) / 100;

                  return (
                  <tr key={room._id}>
                    <td>Room {room.roomNumber}</td>
                    <td>{room.roomCapacity}</td>
                    <td>{price ? `${RupeeIcon}${price.toLocaleString('en-IN')}` : '—'}</td>
                    <td>{discount ? `${discount}%` : '—'}</td>
                    <td>{price ? `${RupeeIcon}${finalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td>
                      <span className={`badge ${room.isAvailable ? 'active' : 'maintenance'}`}>
                        {room.isAvailable ? 'Available' : 'Maintenance'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-action edit"   onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }}>Edit</button>
                        <button
                          className="btn-action toggle"
                          disabled={togglingRoomId === room._id}
                          onClick={() => toggleAvailability(room._id, room.isAvailable)}
                        >
                          {togglingRoomId === room._id ? 'Updating…' : 'Toggle'}
                        </button>
                        <button className="btn-action delete" onClick={() => deleteRoom(room._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <RoomFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedRoom(null); }}
          onSubmit={selectedRoom ? handleEdit : handleAdd}
          initialData={selectedRoom}
        />
      )}
    </div>
  );
};

export default RoomManagement;
