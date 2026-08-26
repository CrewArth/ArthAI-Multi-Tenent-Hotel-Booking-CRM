import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { toast } from "react-toastify";
import api from "../../utils/api";

import { getStoredUser } from "../../utils/auth";

const GuestHouseManagement = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const isHotelAdmin = user?.role === 'HOTEL_ADMIN' || user?.role === 'HOTEL-ADMIN';
  const assignedId = user?.assignedGuestHouseId;

  const [guestHouses, setGuestHouses] = useState([]);
  const [ghToDelete, setGhToDelete] = useState(null);
  const [subUsage, setSubUsage] = useState(null);

  const fetchGuestHouses = async () => {
    try {
      const res = await api.post("/api/guesthouses/list");
      let list = Array.isArray(res.data) ? res.data : res.data.guestHouses || [];
      if (isHotelAdmin && assignedId) {
        list = list.filter(g => String(g.guestHouseId) === String(assignedId) || String(g._id) === String(assignedId));
      }
      setGuestHouses(list);
    } catch (err) {
      console.error(err);
      setGuestHouses([]);
    }
  };

  const fetchSubUsage = async () => {
    try {
      const res = await api.post("/api/subscription/usage");
      setSubUsage(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGuestHouses();
    fetchSubUsage();
  }, []);

  const planName = subUsage?.plan || 'BASIC';
  const maxHotels = subUsage?.limits?.maxHotels ?? 1;
  const currentHotels = guestHouses.length;
  const isLimitReached = currentHotels >= maxHotels;
  const hoverMessage = isLimitReached
    ? `Subscription limit reached: Your ${planName} plan allows a maximum of ${maxHotels} hotel(s). Please upgrade your plan.`
    : '';

  const toggleMaintenance = async (id) => {
    try {
      await api.patch(`/api/guesthouses/${id}/maintenance`);
      fetchGuestHouses();
      fetchSubUsage();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to toggle maintenance mode";
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    const prev = guestHouses;
    setGuestHouses((list) => list.filter((g) => g.guestHouseId !== id));
    try {
      await api.delete(`/api/guesthouses/${id}`);
      toast.success("Hotel deleted successfully");
    } catch (err) {
      setGuestHouses(prev);
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to delete";
      toast.error(msg);
    } finally {
      fetchGuestHouses();
      fetchSubUsage();
    }
  };

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Hotel Management</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {subUsage && (
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
              Plan: <strong style={{ color: '#1e293b' }}>{planName}</strong> ({currentHotels}/{maxHotels} Hotels)
            </span>
          )}
          {!isHotelAdmin && (
            <button 
              className="btn-primary-cta" 
              onClick={() => navigate('/super-admin/add-hotel')}
              disabled={isLimitReached}
              title={hoverMessage}
              style={isLimitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              Add Hotel {isLimitReached && `(${currentHotels}/${maxHotels})`}
            </button>
          )}
        </div>
      </div>  

      {/* Table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hotel ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guestHouses.length === 0 ? (
              <tr><td colSpan="5" className="table-empty">No hotels found.</td></tr>
            ) : (
              guestHouses.map((gh) => (
                <tr key={gh.guestHouseId}>
                  <td>{gh.guestHouseId}</td>
                  <td>{gh.guestHouseName}</td>
                  <td>{gh.location.city}, {gh.location.state}</td>
                  <td>
                    <span className={`badge ${gh.maintenance ? "maintenance" : "active"}`}>
                      {gh.maintenance ? "Maintenance" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button 
                        className="btn-action edit" 
                        onClick={() => navigate('/super-admin/add-hotel', { state: { hotel: gh } })}
                      >
                        Edit
                      </button>
                      <button className="btn-action toggle" onClick={() => toggleMaintenance(gh.guestHouseId)}>
                        {gh.maintenance ? "Activate" : "Maintenance"}
                      </button>
                      {!isHotelAdmin && (
                        <button className="btn-action delete" onClick={() => setGhToDelete(gh.guestHouseId)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {ghToDelete && (
        <ConfirmDeleteModal
          isOpen={!!ghToDelete}
          title="Delete Hotel"
          message="Are you sure you want to delete this hotel? This action will permanently remove all associated rooms and beds."
          onConfirm={() => {
            handleDelete(ghToDelete);
            setGhToDelete(null);
          }}
          onClose={() => setGhToDelete(null)}
        />
      )}
    </div>
  );
};

export default GuestHouseManagement;
