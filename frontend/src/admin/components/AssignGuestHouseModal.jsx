import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

import { getStoredUser } from '../../utils/auth';

/**
 * Modal that lets a SUPER_ADMIN or HOTEL_ADMIN assign (or unassign) a hotel to an admin.
 * Props:
 *   user       – the admin user object
 *   onClose    – close callback
 *   onSuccess  – called after a successful assignment so the list can refresh
 */
export default function AssignGuestHouseModal({ user, onClose, onSuccess }) {
  const currentUser = getStoredUser();
  const isHotelAdmin = currentUser?.role === 'HOTEL_ADMIN' || currentUser?.role === 'HOTEL-ADMIN';
  const assignedId = currentUser?.assignedGuestHouseId;

  const [guestHouses, setGuestHouses] = useState([]);
  const [selected, setSelected] = useState(
    user.assignedGuestHouseId?.guestHouseId || user.assignedGuestHouseId?._id || user.assignedGuestHouseId || ''
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.post('/api/guesthouses/list')
      .then((res) => {
        let list = Array.isArray(res.data) ? res.data : res.data.guestHouses || [];
        if (isHotelAdmin && assignedId) {
          list = list.filter(g => String(g.guestHouseId) === String(assignedId) || String(g._id) === String(assignedId));
        }
        setGuestHouses(list);
      })
      .catch(() => toast.error('Unable to load hotels'));
  }, [isHotelAdmin, assignedId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch(`/api/admin/users/${user._id}/assign-guesthouse`, {
        guestHouseId: selected || null,
      });
      toast.success(selected ? 'Hotel assigned successfully' : 'Hotel unassigned');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign hotel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="page-modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>

        <div className="page-modal-header">
          <h3>Assign Hotel</h3>
          <button className="page-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="page-modal-body">
          <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#64748b' }}>
            Admin: <strong style={{ color: '#1e293b' }}>{user.firstName} {user.lastName}</strong>
          </p>
          <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            Hotel
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 7, font: 'inherit' }}
            >
              <option value="">None (unassign)</option>
              {guestHouses.map((gh) => (
                <option key={gh._id} value={gh.guestHouseId || gh._id}>{gh.guestHouseName}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="page-modal-footer">
          <button className="btn-action edit" onClick={onClose}>Cancel</button>
          <button className="btn-action approve" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

      </div>
    </div>
  );
}
