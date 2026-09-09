import React, { useEffect, useState } from 'react';
import BedFormModal from '../components/BedFormModal';
import BedConfigModal from '../components/BedConfigModal';
import { toast } from 'react-toastify';
import api from '../../utils/api';

import { getStoredUser } from '../../utils/auth';

const BedManagement = () => {
  const user = getStoredUser();
  const rawAssigned = user?.assignedGuestHouseId;
  const assignedId = typeof rawAssigned === 'object'
    ? (rawAssigned?.guestHouseId || rawAssigned?._id)
    : rawAssigned;
  const isHotelAdmin = user?.role === 'HOTEL_ADMIN' || user?.role === 'HOTEL-ADMIN';
  const isScopedAdmin = isHotelAdmin || (user?.role === 'ADMIN' && Boolean(assignedId));

  const [guestHouses, setGuestHouses] = useState(isScopedAdmin && typeof rawAssigned === 'object' && rawAssigned ? [rawAssigned] : []);
  const [rooms, setRooms]             = useState([]);
  const [beds, setBeds]               = useState([]);
  const [selectedGH, setSelectedGH]   = useState(isScopedAdmin && assignedId ? assignedId : null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBed, setSelectedBed]   = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [togglingBedId, setTogglingBedId] = useState(null);
  const [bedConfigs, setBedConfigs]     = useState([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  useEffect(() => {
    fetchGuestHouses();
    fetchBedConfigs();
  }, []);

  const fetchBedConfigs = async () => {
    try {
      const res = await api.post('/api/beds/configs/list');
      if (res.data?.configs) setBedConfigs(res.data.configs);
    } catch (err) {
      console.error('Failed to load bed configs:', err);
    }
  };

  const fetchGuestHouses = async () => {
    try {
      const res = await api.post('/api/guesthouses/list');
      let list = Array.isArray(res.data) ? res.data : [];

      if (isScopedAdmin && assignedId) {
        const targetStr = String(assignedId).trim().toLowerCase();
        let assigned = list.filter(
          (g) =>
            String(g.guestHouseId || '').trim().toLowerCase() === targetStr ||
            String(g._id || '').trim().toLowerCase() === targetStr
        );
        if (assigned.length === 0 && typeof rawAssigned === 'object' && rawAssigned) {
          assigned = [rawAssigned];
        }
        list = assigned;
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
    if (!room) return toast.error('Select a valid room.');
    if (beds.filter((b) => b.isActive).length >= room.roomCapacity) {
      return toast.warning(`Room capacity is ${room.roomCapacity}. Cannot add more beds.`);
    }
    try {
      await api.post('/api/beds', { ...newBed, roomId: selectedRoom, bedType: newBed.bedType });
      toast.success('Bed created successfully');
      fetchBedsForRoom(selectedRoom);
      setIsModalOpen(false);
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to add bed'); }
  };

  const handleEdit = async (updated) => {
    try {
      await api.put(`/api/beds/${selectedBed._id}`, { ...updated, bedType: updated.bedType });
      toast.success('Bed updated');
      fetchBedsForRoom(selectedRoom);
      setIsModalOpen(false);
    } catch (err) { toast.error('Failed to update bed'); }
  };

  const toggleAvailability = async (bedId, current) => {
    const nextAvailability = !current;

    // 1. Optimistic in-place update
    setBeds((prevBeds) =>
      prevBeds.map((b) =>
        b._id === bedId ? { ...b, isAvailable: nextAvailability } : b
      )
    );
    setTogglingBedId(bedId);

    try {
      // 2. Perform API call in background
      await api.patch(`/api/beds/${bedId}/availability`, { isAvailable: nextAvailability });
      toast.success(`Bed marked as ${nextAvailability ? 'Available' : 'Booked'}`);
    } catch (err) {
      console.error('toggleAvailability error:', err);
      // 3. Rollback on failure
      setBeds((prevBeds) =>
        prevBeds.map((b) =>
          b._id === bedId ? { ...b, isAvailable: current } : b
        )
      );
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update bed availability');
    } finally {
      setTogglingBedId(null);
    }
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
    if (!bedConfigs || bedConfigs.length === 0) {
      return toast.warning('Please configure at least one bed type in "Bed Config" first');
    }
    const room = rooms.find((r) => String(r._id) === String(selectedRoom));
    if (!room) return toast.error('Room not found');
    const existing = beds.filter((b) => b.isActive).length;
    if (existing >= room.roomCapacity) return toast.warning(`Room already at full capacity (${room.roomCapacity})`);
    try {
      const selectedType = bedConfigs[0]?.bedType;
      const res = await api.post('/api/beds/auto-create', { roomId: selectedRoom, bedType: selectedType });
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
          <p className="page-subtitle">
            Manage bed allocations and availability
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="toolbar-select"
            value={selectedGH || ''}
            disabled={isHotelAdmin || (isScopedAdmin && Boolean(selectedGH))}
            style={isHotelAdmin || (isScopedAdmin && Boolean(selectedGH)) ? { opacity: 0.85, cursor: 'not-allowed' } : {}}
            onChange={(e) => setSelectedGH(e.target.value || null)}
          >
            {!selectedGH && <option value="">Select Hotel</option>}
            {guestHouses.map((g) => (
              <option key={g.guestHouseId || g._id} value={g.guestHouseId || g._id}>
                {g.guestHouseName}
              </option>
            ))}
          </select>
          <select
            className="toolbar-select"
            value={selectedRoom || ''}
            disabled={!selectedGH}
            onChange={(e) => setSelectedRoom(e.target.value || null)}
          >
            <option value="">Select Room</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>
                Room {r.roomNumber} (Cap: {r.roomCapacity})
              </option>
            ))}
          </select>
          <button
            className="btn-primary-cta"
            disabled={!selectedRoom}
            onClick={() => {
              if (!selectedRoom) { toast.error('Please select a room first'); return; }
              const room = rooms.find((r) => String(r._id) === String(selectedRoom));
              if (room && beds.filter((b) => b.isActive).length >= room.roomCapacity) {
                toast.warning(`Room capacity is ${room.roomCapacity}. Cannot add more beds.`);
                return;
              }
              setIsModalOpen(true);
            }}
          >
            + Add Bed
          </button>
          <button
            className="btn-secondary-cta"
            disabled={!selectedRoom}
            onClick={handleAutoCreate}
          >
          Auto Create Beds
          </button>
          <button
            type="button"
            className="btn-secondary-cta"
            onClick={() => setIsConfigModalOpen(true)}
          >
            Bed Config
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bed No.</th>
              <th>Bed Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!selectedRoom ? (
              <tr><td colSpan="4" className="table-empty">Please select a hotel and room to manage beds.</td></tr>
            ) : beds.length === 0 ? (
              <tr><td colSpan="4" className="table-empty">No beds found for this room.</td></tr>
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
                      <button
                        className="btn-action toggle"
                        disabled={togglingBedId === b._id}
                        onClick={() => toggleAvailability(b._id, b.isAvailable)}
                      >
                        {togglingBedId === b._id ? 'Updating…' : 'Toggle'}
                      </button>
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
          bedConfigs={bedConfigs}
        />
      )}

      {isConfigModalOpen && (
        <BedConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          configs={bedConfigs}
          onConfigUpdated={(updated) => setBedConfigs(updated)}
        />
      )}
    </div>
  );
};

export default BedManagement;
