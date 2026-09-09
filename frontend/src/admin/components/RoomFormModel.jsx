// src/components/RoomFormModal.jsx
import React, { useState, useEffect } from 'react';
import '../styles/roomFormModel.css';

const RoomFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [roomData, setRoomData] = useState({
    roomNumber: '',
    roomType: '',
    roomCapacity: '',
    price: '',
    discountPercentage: '',
  });

  useEffect(() => {
    if (initialData) {
      setRoomData({
        roomNumber:         initialData.roomNumber         || '',
        roomType:           initialData.roomType           || '',
        roomCapacity:       initialData.roomCapacity       || '',
        price:              initialData.price              ?? '',
        discountPercentage: initialData.discountPercentage ?? '',
      });
    } else {
      setRoomData({ roomNumber: '', roomType: '', roomCapacity: '', price: '', discountPercentage: '' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRoomData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!roomData.roomNumber || !roomData.roomType?.trim() || !roomData.roomCapacity || Number(roomData.roomCapacity) < 1) {
      alert('Please provide a valid room number, room type, and capacity (min 1).');
      return;
    }

    const discount = Number(roomData.discountPercentage) || 0;
    if (discount < 0 || discount > 100) {
      alert('Discount must be between 0 and 100.');
      return;
    }

    onSubmit({ ...roomData, roomType: roomData.roomType.trim() });
    onClose();
  };

  // Live computed values
  const price    = parseFloat(roomData.price) || 0;
  const discount = parseFloat(roomData.discountPercentage) || 0;
  const discountAmount = price > 0 && discount > 0 ? (price * discount) / 100 : 0;
  const finalPrice     = price - discountAmount;
  const showPreview    = price > 0 && discount > 0;

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <h2 className="modal-title">{initialData ? 'Edit Room' : 'Add New Room'}</h2>

        <form onSubmit={handleSubmit} className="room-form">
          <div className="form-group">
            <label>Room Number</label>
            <input
              type="number"
              name="roomNumber"
              value={roomData.roomNumber}
              onChange={handleChange}
              required
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Room Type</label>
            <input
              type="text"
              name="roomType"
              value={roomData.roomType}
              onChange={handleChange}
              placeholder="e.g. Deluxe, Standard, Suite"
              required
              list="room-type-suggestions"
            />
            <datalist id="room-type-suggestions">
              <option value="Single" />
              <option value="Double" />
              <option value="Deluxe" />
              <option value="Super Deluxe" />
              <option value="Suite" />
              <option value="Family" />
              <option value="Standard" />
              <option value="Executive" />
              <option value="AC" />
              <option value="Non-AC" />
            </datalist>
          </div>

          <div className="form-group">
            <label>Room Capacity</label>
            <input
              type="number"
              name="roomCapacity"
              value={roomData.roomCapacity}
              onChange={handleChange}
              required
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Price (per night)</label>
            <input
              type="number"
              name="price"
              value={roomData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Discount (%)</label>
            <input
              type="number"
              name="discountPercentage"
              value={roomData.discountPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
            />
          </div>

          {/* Live price preview */}
          {showPreview && (
            <div className="discount-preview">
              <span className="discount-preview-row">
                <span className="discount-label">Original Price:</span>
                <span className="discount-value">{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="discount-preview-row">
                <span className="discount-label">Discount ({discount}%):</span>
                <span className="discount-value discount-amount">- {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="discount-preview-row discount-final-row">
                <span className="discount-label">Final Price:</span>
                <span className="discount-value discount-final">{finalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
          )}

          <div className="room-form-buttons">
            <button type="button" className="btn cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn submit">{initialData ? 'Update Room' : 'Create Room'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomFormModal;
