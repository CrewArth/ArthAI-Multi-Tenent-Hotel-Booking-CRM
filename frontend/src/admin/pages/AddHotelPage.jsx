import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const AddHotelPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialHotelData = location.state?.hotel || null;
  const isEditMode = Boolean(initialHotelData);

  const [formData, setFormData] = useState({
    guestHouseName: '',
    city: '',
    state: '',
    description: '',
    image: null,
    previewImage: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialHotelData) {
      setFormData({
        guestHouseName: initialHotelData.guestHouseName || '',
        city: initialHotelData.location?.city || '',
        state: initialHotelData.location?.state || '',
        description: initialHotelData.description || '',
        image: null,
        previewImage: initialHotelData.image || '',
      });
    }
  }, [initialHotelData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
        previewImage: URL.createObjectURL(file),
      }));
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
      previewImage: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = new FormData();
    payload.append('guestHouseName', formData.guestHouseName);
    payload.append(
      'location',
      JSON.stringify({
        city: formData.city,
        state: formData.state,
      })
    );
    payload.append('description', formData.description);

    if (formData.image) {
      payload.append('image', formData.image);
    }

    try {
      if (isEditMode) {
        await api.put(`/api/guesthouses/${initialHotelData.guestHouseId}`, payload);
        toast.success('Hotel updated successfully!');
      } else {
        await api.post('/api/guesthouses', payload);
        toast.success('Hotel created successfully!');
      }
      navigate('/super-admin/hotel');
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (isEditMode ? 'Error updating Hotel' : 'Error creating Hotel');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-root">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{isEditMode ? 'Edit Hotel' : 'Add New Hotel'}</h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            {isEditMode
              ? 'Update the details for this hotel property'
              : 'Enter details below to create a new hotel property'}
          </p>
        </div>
        <button
          className="btn-action view"
          onClick={() => navigate('/super-admin/hotel')}
          style={{ padding: '8px 16px', fontSize: '0.875rem' }}
        >
          ← Back to Hotel List
        </button>
      </div>

      {/* Main Form Container */}
      <div className="panel-card" style={{ padding: '28px 32px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            
            {/* Hotel Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Hotel Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="guestHouseName"
                value={formData.guestHouseName}
                onChange={handleChange}
                placeholder="e.g. Arth.AI Grand Hotel"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.925rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* City */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                City <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Vadodara"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.925rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* State */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                State <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Gujarat"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.925rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description (optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief details about facilities, amenities..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.925rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Image Upload & Preview */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Hotel Banner Image (optional)
              </label>
              
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  <strong>Click to upload</strong> or drag and drop an image file
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0' }}>PNG, JPG, WebP up to 5 MB</p>
                </div>
              </div>

              {formData.previewImage && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '14px', background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
                  <img
                    src={formData.previewImage}
                    alt="Preview"
                    style={{ width: '90px', height: '54px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {formData.image ? formData.image.name : 'Current Hotel Image'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-action reject"
                    onClick={handleRemoveImage}
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Form Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
            <button
              type="button"
              className="btn-action edit"
              onClick={() => navigate('/super-admin/hotel')}
              style={{ padding: '9px 20px', fontSize: '0.9rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-cta"
              disabled={submitting}
              style={{ padding: '9px 24px', fontSize: '0.9rem' }}
            >
              {submitting
                ? isEditMode ? 'Updating Hotel...' : 'Creating Hotel...'
                : isEditMode ? 'Update Hotel' : 'Create Hotel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHotelPage;
