import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const ALL_DAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

export const DynamicPricingModal = ({
  isOpen,
  onClose,
  hotelId,
  initialRule,
  onSuccess,
}) => {
  const isEditing = Boolean(initialRule?._id);

  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState('weekend');
  const [roomType, setRoomType] = useState('all');
  const [adjustmentType, setAdjustmentType] = useState('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState(20);
  const [applicableDays, setApplicableDays] = useState(['friday', 'saturday', 'sunday']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name || '');
      setRuleType(initialRule.ruleType || 'weekend');
      setRoomType(initialRule.roomType || 'all');
      setAdjustmentType(initialRule.adjustmentType || 'percentage');
      setAdjustmentValue(initialRule.adjustmentValue ?? 20);
      setApplicableDays(initialRule.applicableDays || ['friday', 'saturday', 'sunday']);
      setStartDate(initialRule.startDate ? initialRule.startDate.slice(0, 10) : '');
      setEndDate(initialRule.endDate ? initialRule.endDate.slice(0, 10) : '');
      setIsActive(initialRule.isActive !== false);
    } else {
      setName('');
      setRuleType('weekend');
      setRoomType('all');
      setAdjustmentType('percentage');
      setAdjustmentValue(20);
      setApplicableDays(['friday', 'saturday', 'sunday']);
      setStartDate('');
      setEndDate('');
      setIsActive(true);
    }
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const handleRuleTypeChange = (type) => {
    setRuleType(type);
    if (type === 'weekend') {
      setApplicableDays(['friday', 'saturday', 'sunday']);
    } else if (type === 'weekday') {
      setApplicableDays(['monday', 'tuesday', 'wednesday', 'thursday']);
    } else {
      setApplicableDays([]);
    }
  };

  const toggleDay = (dayId) => {
    setApplicableDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Rule name is required.');
      return;
    }

    if (adjustmentValue === '' || isNaN(Number(adjustmentValue))) {
      toast.error('Valid adjustment value is required.');
      return;
    }

    if ((ruleType === 'holiday' || ruleType === 'custom_date_range') && (!startDate || !endDate)) {
      toast.error('Start and End dates are required for holiday/date range rules.');
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error('End date cannot be earlier than start date.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        guestHouseId: hotelId,
        name: name.trim(),
        ruleType,
        roomType,
        adjustmentType,
        adjustmentValue: Number(adjustmentValue),
        applicableDays: ruleType === 'weekend' || ruleType === 'weekday' ? applicableDays : [],
        startDate: startDate || null,
        endDate: endDate || null,
        isActive,
      };

      if (isEditing) {
        payload._id = initialRule._id;
        await api.post('/api/dynamic-pricing/update', payload);
        toast.success('Dynamic pricing rule updated successfully');
      } else {
        await api.post('/api/dynamic-pricing/create', payload);
        toast.success('Dynamic pricing rule created successfully');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving pricing rule:', err);
      toast.error(err.response?.data?.message || 'Failed to save pricing rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dp-modal-backdrop" onClick={onClose}>
      <div className="dp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="dp-modal-header">
          <h2 className="dp-modal-title">
            {isEditing ? 'Edit Dynamic Pricing Rule' : 'Add Dynamic Pricing Rule'}
          </h2>
          <button className="dp-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dp-modal-form">
          {/* Rule Name */}
          <div className="dp-form-group">
            <label className="dp-form-label">Rule Name</label>
            <input
              type="text"
              className="dp-form-input"
              placeholder="e.g. Weekend Surge (+20%), Diwali Peak, Mon-Thu Discount"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Rule Type & Room Type */}
          <div className="dp-form-row">
            <div className="dp-form-group">
              <label className="dp-form-label">Rule Type</label>
              <select
                className="dp-form-select"
                value={ruleType}
                onChange={(e) => handleRuleTypeChange(e.target.value)}
              >
                <option value="weekend">Weekend Pricing</option>
                <option value="weekday">Weekday Pricing</option>
                <option value="holiday">Holiday / Event</option>
                <option value="custom_date_range">Custom Date Range</option>
              </select>
            </div>

            <div className="dp-form-group">
              <label className="dp-form-label">Room Type</label>
              <select
                className="dp-form-select"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
              >
                <option value="all">All Room Types</option>
                <option value="single">Single Room</option>
                <option value="double">Double Room</option>
                <option value="deluxe">Deluxe Room</option>
                <option value="suite">Suite</option>
                <option value="family">Family Room</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          </div>

          {/* Adjustment Type & Value */}
          <div className="dp-form-row">
            <div className="dp-form-group">
              <label className="dp-form-label">Adjustment Type</label>
              <select
                className="dp-form-select"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                <option value="percentage">Percentage (+% / -%)</option>
                <option value="fixed_amount">Fixed Amount (+₹ / -₹)</option>
                <option value="flat_rate">Flat Rate (Fixed ₹/Night)</option>
              </select>
            </div>

            <div className="dp-form-group">
              <label className="dp-form-label">
                {adjustmentType === 'percentage'
                  ? 'Adjustment % (e.g. 20 for +20%, -10 for -10%)'
                  : adjustmentType === 'fixed_amount'
                  ? 'Fixed Adjustment (₹ e.g. 500 or -200)'
                  : 'Flat Nightly Rate (₹ e.g. 3500)'}
              </label>
              <input
                type="number"
                step="any"
                className="dp-form-input"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Days of Week (For Weekend / Weekday) */}
          {(ruleType === 'weekend' || ruleType === 'weekday') && (
            <div className="dp-form-group">
              <label className="dp-form-label">Applicable Days</label>
              <div className="dp-days-grid">
                {ALL_DAYS.map((day) => {
                  const isSelected = applicableDays.includes(day.id);
                  return (
                    <button
                      type="button"
                      key={day.id}
                      className={`dp-day-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleDay(day.id)}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date Range (For Holiday / Custom Range) */}
          {(ruleType === 'holiday' || ruleType === 'custom_date_range') && (
            <div className="dp-form-row">
              <div className="dp-form-group">
                <label className="dp-form-label">Start Date</label>
                <input
                  type="date"
                  className="dp-form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="dp-form-group">
                <label className="dp-form-label">End Date</label>
                <input
                  type="date"
                  className="dp-form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Active Status Checkbox */}
          <div className="dp-form-checkbox-row">
            <input
              type="checkbox"
              id="ruleIsActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="dp-checkbox"
            />
            <label htmlFor="ruleIsActive" className="dp-checkbox-label">
              Rule is Active
            </label>
          </div>

          {/* Footer Actions */}
          <div className="dp-modal-footer">
            <button
              type="button"
              className="dp-btn dp-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dp-btn dp-btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DynamicPricingModal;
