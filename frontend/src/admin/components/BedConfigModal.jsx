import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import '../styles/bedConfigModal.css';

const BedConfigModal = ({ isOpen, onClose, configs = [], onConfigUpdated }) => {
  const [bedType, setBedType] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const trimmed = bedType.trim();
    const parsedCap = parseInt(capacity, 10);

    if (!trimmed) {
      toast.error('Please enter a Bed Type');
      return;
    }

    if (isNaN(parsedCap) || parsedCap < 1) {
      toast.error('Please enter a valid capacity (minimum 1)');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/api/beds/configs', {
        bedType: trimmed,
        capacity: parsedCap,
      });

      toast.success('Bed configuration saved');
      setBedType('');
      setCapacity('1');
      if (onConfigUpdated && res.data?.configs) {
        onConfigUpdated(res.data.configs);
      }
    } catch (err) {
      console.error('Save bed config error:', err);
      toast.error(err.response?.data?.error || 'Failed to save bed configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Delete configuration for "${type}"?`)) return;

    setDeletingId(id);
    try {
      const res = await api.post('/api/beds/configs/delete', { id });
      toast.info('Bed configuration deleted');
      if (onConfigUpdated && res.data?.configs) {
        onConfigUpdated(res.data.configs);
      }
    } catch (err) {
      console.error('Delete bed config error:', err);
      toast.error(err.response?.data?.error || 'Failed to delete configuration');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bcm-backdrop" onClick={onClose}>
      <div className="bcm-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bcm-header">
          <h2 className="bcm-title">Bed Configuration</h2>
          <button className="bcm-close" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        {/* Input Form */}
        <form className="bcm-form" onSubmit={handleSave}>
          <div className="bcm-form-grid">
            <div className="bcm-group">
              <label>Bed Type</label>
              <input
                type="text"
                placeholder="e.g. King, Queen, Standard"
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                required
              />
            </div>
            <div className="bcm-group">
              <label>Bed Capacity</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 1, 2"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="bcm-btn-save" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>

        {/* Configured Bed Types List */}
        <div className="bcm-list-section">
          <div className="bcm-list-title">Configured Bed Types ({configs.length})</div>
          {configs.length === 0 ? (
            <div className="bcm-empty">No bed types configured yet.</div>
          ) : (
            <table className="bcm-table">
              <thead>
                <tr>
                  <th>Bed Type</th>
                  <th>Capacity</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr key={c._id || c.bedType}>
                    <td style={{ fontWeight: 500 }}>{c.bedType}</td>
                    <td>{c.capacity || 1} Person(s)</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="bcm-btn-del"
                        disabled={deletingId === c._id}
                        onClick={() => handleDelete(c._id, c.bedType)}
                      >
                        {deletingId === c._id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BedConfigModal;
