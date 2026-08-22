import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/guestHouseModal.css';

const GuestHouseFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    guestHouseName: '',
    city: '',
    state: '',
    description: '',
    image: null,               // For file input
    previewImage: '',          // To show preview if needed
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        guestHouseName: initialData.guestHouseName || '',
        city: initialData.location?.city || '',
        state: initialData.location?.state || '',
        description: initialData.description || '',
        image: null,
        previewImage: initialData.image || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setFormData((prev) => ({ ...prev, previewImage: URL.createObjectURL(file) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use FormData for mixed data + file
    const payload = new FormData();
    payload.append("guestHouseName", formData.guestHouseName);
    payload.append("location", JSON.stringify({
      city: formData.city,
      state: formData.state,
    }));
    payload.append("description", formData.description);

    if (formData.image) {
      payload.append("image", formData.image); // Image file to upload
    }

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      // Keep modal open, parent already shows the error toast
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <h2>{initialData ? "Edit Hotel" : "Add New Hotel"}</h2>

        <form onSubmit={handleSubmit} className="gh-form" encType="multipart/form-data">
          <label>
            Hotel Name
            <input
              type="text"
              name="guestHouseName"
              value={formData.guestHouseName}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            City
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            State
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Image Upload (optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>

          {formData.previewImage && (
            <div className="image-preview">
              <img src={formData.previewImage} alt="Preview" />
              <button
                type="button"
                className="btn small"
                onClick={() => setFormData(prev => ({ ...prev, image: null, previewImage: '' }))}
              >
                Remove Image
              </button>
            </div>
          )}

          <label>
            Description (optional)
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            ></textarea>
          </label>

          <div className="gh-form-buttons">
            <button type="button" className="btn cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn submit">
              {initialData ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuestHouseFormModal;
