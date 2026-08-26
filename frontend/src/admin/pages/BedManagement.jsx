import React, { useEffect, useState } from 'react';
import BedFormModal from '../components/BedFormModal';
import { toast } from 'react-toastify';
import api from '../../utils/api';

import { getStoredUser } from '../../utils/auth';

const BedManagement = () => {
  const [guestHouses, setGuestHouses] = useState([]);
  const [rooms, setRooms]             = useState([]);
  const [beds, setBeds]               = useState([]);
  const [selectedGH, setSelectedGH]   = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBed, setSelectedBed]   = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);

  useEffect(() => { fetchGuestHouses(); }, []);

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
          setSelectedGH(targetId);
        }
      }
      setGuestHouses(list);
    } catch (err) { console.error(err); }
  };

  const fetchRoomsForGH = async (ghId) => {
    if (!ghId) { setRooms([]); return; }
    try {
      const res = await api.post(`/api/rooms/by-guesthouse`, { guestHouseId: ghId });
      setRooms(res.data.rooms || []);
    } catch (err) { setRooms([]); }
  };

  const fetchBedsForRoom = async (roomId) => {
    if (!roomId) { setBeds([]); return; }
    try {
      const res = await api.post(`/api/beds/list`, { roomId });
      setBeds(res.data.beds || []);
    } catch (err) { setBeds([]); }
  };

  useEffect(() => {
    if (selectedGH) { fetchRoomsForGH(selectedGH); setSelectedRoom(null); setBeds([]); }
  }, [selectedGH]);

  useEffect(() => {
    if (selectedRoom) fetchBedsForRoom(selectedRoom);
  }, [selectedRoom]);

  const handleAdd = async (newBed) => {
    const room = rooms.find((r) => String(r._id) === String(selectedRoom));
    if (!room) return alert('Select a valid room.');
    if (beds.filter((b) => b.isActive).length >= room.roomCapacity)
      return alert(`Room capacity is ${room.roomCapacity}. Cannot add more beds.`);
    try {
      await api.post('/api/beds', { ...newBed, roomId: selectedRoom, bedType: newBed.bedType || 'single' });
      toast.success('Bed created successfully');
      fetchBedsForRoom(selectedRoom);
      setIsModalOpen(false);
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to add bed'); }
  };

  const handleEdit = async (updated) => {
    try {
      await api.put(`/api/beds/${selectedBed._id}`, { ...updated, bedType: updated.bedType || 'single' });
      toast.success('Bed updated');
      fetchBedsForRoom(selectedRoom);
      setIsModalOpen(false);
    } catch (err) { toast.error('Failed to update bed'); }
  };

  const toggleAvailability = async (bedId, current) => {
    try {
      await api.patch(`/api/beds/${bedId}/availability`, { isAvailable: !current });
      fetchBedsForRoom(selectedRoom);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (bedId) => {
    if (!window.confirm('Delete this bed?')) return;
    try {
      await api.delete(`/api/beds/${bedId}`);
      toast.success('Bed deleted');
      fetchBedsForRoom(selectedRoom);
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to delete bed'); }
  };

  const handleAutoCreate = async () => {
    if (!selectedRoom) return toast.error('Select a room first');
    const room = rooms.find((r) => String(r._id) === String(selectedRoom));
    if (!room) return toast.error('Room not found');
    const existing = beds.filter((b) => b.isActive).length;
    if (existing >= room.roomCapacity) return toast.warning(`Room already at full capacity (${room.roomCapacity})`);
    try {
      const res = await api.post('/api/beds/auto-create', { roomId: selectedRoom, bedType: 'single' });
      toast.success(res.data.message || 'Beds created successfully');
      fetchBedsForRoom(selectedRoom);
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to auto-create beds'); }
  };

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Bed Management</h1>
          <p className="page-subtitle">Select a hotel and room to manage beds</p>
        </div>
      </div>

      {/* Toolbar: cascading dropdowns + action buttons */}
      <div className="toolbar-row" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <select
          className="toolbar-select"
          value={selectedGH || ''}
          onChange={(e) => setSelectedGH(e.target.value || null)}
        >
          <option value="">Select Hotel</option>
          {guestHouses.map((g) => (
            <option key={g.guestHouseId || g._id} value={g.guestHouseId || g._id}>
              {g.guestHouseName}
            </option>
          ))}
        </select>

        <select
          className="toolbar-select"
          value={selectedRoom || ''}
          onChange={(e) => setSelectedRoom(e.target.value || null)}
          disabled={!selectedGH}
        >
          <option value="">Select Room</option>
          {rooms.map((r) => (
            <option key={r._id} value={r._id}>
              Room {r.roomNumber}  (Capacity: {r.roomCapacity})
            </option>
          ))}
        </select>

        <button
          className="btn-primary-cta"
          disabled={!selectedRoom}
          onClick={() => {
            if (!selectedRoom) return toast.error('Select a room first');
            setIsModalOpen(true);
          }}
        >
          + Add Bed
        </button>

        <button
          className="btn-primary-cta green"
          disabled={!selectedRoom}
          onClick={handleAutoCreate}
        >
          Auto Create Beds
        </button>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bed Number</th>
              <th>Type</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {beds.length === 0 ? (
              <tr>
                <td colSpan="4" className="table-empty">
                  {selectedRoom ? 'No beds found for this room.' : 'Select a hotel and room to view beds.'}
                </td>
              </tr>
            ) : (
              beds.map((b) => (
                <tr key={b._id}>
                  <td>Bed {b.bedNumber}</td>
                  <td style={{ textTransform: 'capitalize' }}>{b.bedType}</td>
                  <td>
                    <span className={`badge ${b.isAvailable ? 'active' : 'inactive'}`}>
                      {b.isAvailable ? 'Available' : 'Booked'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-action edit"   onClick={() => { setSelectedBed(b); setIsModalOpen(true); }}>Edit</button>
                      <button className="btn-action toggle" onClick={() => toggleAvailability(b._id, b.isAvailable)}>Toggle</button>
                      <button className="btn-action delete" onClick={() => handleDelete(b._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <BedFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedBed(null); }}
          onSubmit={selectedBed ? handleEdit : handleAdd}
          initialData={selectedBed}
        />
      )}
    </div>
  );
};

export default BedManagement;
