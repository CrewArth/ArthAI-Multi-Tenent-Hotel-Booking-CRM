// src/components/BedFormModal.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../styles/bedFormModal.css';

const BedFormModal = ({ isOpen, onClose, onSubmit, initialData, bedConfigs = [] }) => {
  const configuredTypes = (bedConfigs || []).map((c) => (typeof c === 'string' ? c : c.bedType)).filter(Boolean);
  const allTypes = Array.from(new Set(configuredTypes));

  if (initialData?.bedType && !allTypes.includes(initialData.bedType)) {
    allTypes.unshift(initialData.bedType);
  }

  const [bedData, setBedData] = useState({
    bedNumber: '',
    bedType: '',
  });

  useEffect(() => {
    if (initialData) {
      setBedData({
        bedNumber: initialData.bedNumber || '',
        bedType:   initialData.bedType   || (allTypes[0] || ''),
      });
    } else {
      setBedData({ bedNumber: '', bedType: '' });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBedData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!bedData.bedNumber) return toast.error('Please enter bed number');
    if (!bedData.bedType?.trim()) return toast.error('Please select a bed type');
    onSubmit({ ...bedData, bedType: bedData.bedType.trim() });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <h2 className="modal-title">{initialData ? 'Edit Bed' : 'Add New Bed'}</h2>

        <form onSubmit={handleSubmit} className="bed-form">
          <div className="form-group">
            <label>Bed Number</label>
            <input
              type="number"
              name="bedNumber"
              value={bedData.bedNumber}
              onChange={handleChange}
              required
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Bed Type</label>
            {allTypes.length === 0 ? (
              <div style={{ color: '#d9534f', fontSize: '13px', marginTop: '6px', lineHeight: '1.4' }}>
                No bed types configured yet. Please close this modal and use the <strong>Bed Config</strong> button to add bed types first.
              </div>
            ) : (
              <select
                name="bedType"
                value={bedData.bedType}
                onChange={handleChange}
                required
              >
                <option value="">Select Bed Type</option>
                {allTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bed-form-buttons">
            <button type="button" className="btn cancel" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn submit"
              disabled={allTypes.length === 0}
            >
              {initialData ? 'Update Bed' : 'Create Bed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BedFormModal;
