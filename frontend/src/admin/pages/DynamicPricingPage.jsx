import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Calculator, Calendar, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import DynamicPricingModal from '../components/DynamicPricingModal';
import '../styles/dynamicPricing.css';

const LIMIT = 10;

const formatSchedule = (rule) => {
  if (rule.ruleType === 'weekend' || rule.ruleType === 'weekday') {
    if (!rule.applicableDays || rule.applicableDays.length === 0) {
      return rule.ruleType === 'weekend' ? 'Fri, Sat, Sun' : 'Mon, Tue, Wed, Thu';
    }
    return rule.applicableDays
      .map((d) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3))
      .join(', ');
  }
  if (rule.ruleType === 'holiday' || rule.ruleType === 'custom_date_range') {
    const s = rule.startDate ? new Date(rule.startDate).toLocaleDateString('en-IN') : '—';
    const e = rule.endDate ? new Date(rule.endDate).toLocaleDateString('en-IN') : '—';
    return `${s} to ${e}`;
  }
  return 'All Dates';
};

const formatAdjustment = (rule) => {
  const val = Number(rule.adjustmentValue) || 0;
  if (rule.adjustmentType === 'percentage') {
    return `${val > 0 ? '+' : ''}${val}%`;
  }
  if (rule.adjustmentType === 'fixed_amount') {
    return `${val > 0 ? '+₹' : '-₹'}${Math.abs(val)}`;
  }
  return `Flat ₹${val}/night`;
};

export const DynamicPricingPage = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [hotel, setHotel] = useState(location.state?.hotel || null);
  const [isDynamicEnabled, setIsDynamicEnabled] = useState(false);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [ruleTypeFilter, setRuleTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  // Estimator / Preview State
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [previewCheckIn, setPreviewCheckIn] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [previewCheckOut, setPreviewCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [previewResult, setPreviewResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Fetch Hotel Config Status (Dynamic Pricing flag from Configuration collection)
  const fetchConfigStatus = useCallback(async () => {
    if (!hotelId) return;
    try {
      const res = await api.post('/api/dynamic-pricing/config-status', { guestHouseId: hotelId });
      if (res.data?.hotel) {
        setHotel(res.data.hotel);
      }
      setIsDynamicEnabled(Boolean(res.data?.dynamicRoomPrice));
    } catch (err) {
      console.error('Failed to fetch dynamic pricing config status:', err);
    }
  }, [hotelId]);

  // Fetch Pricing Rules with Pagination
  const fetchRules = useCallback(async (page = currentPage, ruleType = ruleTypeFilter, searchTerm = search) => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const res = await api.post('/api/dynamic-pricing/list', {
        guestHouseId: hotelId,
        page,
        limit: LIMIT,
        ruleType: ruleType !== 'all' ? ruleType : undefined,
        search: searchTerm.trim() || undefined,
      });

      if (res.data?.hotel && !hotel) {
        setHotel(res.data.hotel);
      }
      setRules(res.data?.rules || []);
      setTotalPages(res.data?.totalPages || 1);
      setCurrentPage(res.data?.currentPage || page);
      setTotalCount(res.data?.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch dynamic pricing rules:', err);
      toast.error(err.response?.data?.message || 'Failed to load dynamic pricing rules');
    } finally {
      setLoading(false);
    }
  }, [hotelId, hotel, currentPage, ruleTypeFilter, search]);

  // Fetch Rooms for Estimator
  const fetchRooms = useCallback(async () => {
    if (!hotelId) return;
    try {
      const res = await api.post('/api/rooms/by-guesthouse', { guestHouseId: hotelId });
      const roomList = Array.isArray(res.data?.rooms)
        ? res.data.rooms
        : Array.isArray(res.data)
        ? res.data
        : [];
      setRooms(roomList);
      if (roomList.length > 0) {
        setSelectedRoomId(roomList[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch rooms for estimator:', err);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchConfigStatus();
    fetchRules(1, ruleTypeFilter, search);
    fetchRooms();
  }, [hotelId]);

  useEffect(() => {
    fetchRules(1, ruleTypeFilter, search);
  }, [ruleTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRules(1, ruleTypeFilter, search);
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    fetchRules(page, ruleTypeFilter, search);
  };

  // Toggle Hotel Configuration Flag
  const handleToggleHotelConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await api.post('/api/dynamic-pricing/toggle-config-status', {
        guestHouseId: hotelId,
      });
      setIsDynamicEnabled(Boolean(res.data?.dynamicRoomPrice));
      toast.success(res.data?.message || 'Configuration updated successfully');
    } catch (err) {
      console.error('Failed to toggle dynamic pricing config:', err);
      toast.error(err.response?.data?.message || 'Failed to toggle dynamic pricing');
    } finally {
      setConfigLoading(false);
    }
  };

  // Toggle Rule Status
  const handleToggleRule = async (ruleId) => {
    // Optimistic UI update
    setRules((prev) =>
      prev.map((r) => (r._id === ruleId ? { ...r, isActive: !r.isActive } : r))
    );

    try {
      const res = await api.post('/api/dynamic-pricing/toggle', { _id: ruleId });
      toast.success(res.data?.message || 'Rule status updated');
    } catch (err) {
      console.error('Failed to toggle rule:', err);
      // Rollback
      setRules((prev) =>
        prev.map((r) => (r._id === ruleId ? { ...r, isActive: !r.isActive } : r))
      );
      toast.error(err.response?.data?.message || 'Failed to update rule');
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this dynamic pricing rule?')) return;
    try {
      await api.post('/api/dynamic-pricing/delete', { _id: ruleId });
      toast.success('Rule deleted successfully');
      fetchRules(currentPage, ruleTypeFilter, search);
    } catch (err) {
      console.error('Failed to delete rule:', err);
      toast.error(err.response?.data?.message || 'Failed to delete rule');
    }
  };

  // Run Estimator / Preview
  const handleCalculatePreview = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRoomId || !previewCheckIn || !previewCheckOut) {
      toast.error('Please select room and dates for preview.');
      return;
    }

    setCalculating(true);
    try {
      const res = await api.post('/api/dynamic-pricing/preview', {
        guestHouseId: hotelId,
        roomId: selectedRoomId,
        checkIn: previewCheckIn,
        checkOut: previewCheckOut,
      });
      setPreviewResult(res.data);
    } catch (err) {
      console.error('Failed to calculate pricing preview:', err);
      toast.error(err.response?.data?.message || 'Failed to calculate pricing preview');
    } finally {
      setCalculating(false);
    }
  };

  const hotelDisplayName = hotel?.guestHouseName || hotel?.guestHouseId || 'Hotel';
  const hotelLocationStr = hotel?.location ? `${hotel.location.city || ''}, ${hotel.location.state || ''}`.trim() : '';

  return (
    <div className="dp-page-container">
      {/* Header Bar */}
      <div className="dp-header-row">
        <div className="dp-title-group">
          <button
            className="dp-back-btn"
            onClick={() => navigate('/super-admin/hotel')}
            title="Back to Hotel Management"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="dp-page-title">
              Dynamic Pricing — {hotelDisplayName} {hotelLocationStr && `(${hotelLocationStr})`}
            </h1>
          </div>
        </div>

        <div className="dp-header-actions">
          <button
            onClick={() => {
              fetchConfigStatus();
              fetchRules(currentPage, ruleTypeFilter, search);
            }}
            className="dp-btn dp-btn-secondary"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => {
              setSelectedRule(null);
              setIsModalOpen(true);
            }}
            className="dp-btn dp-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Pricing Rule
          </button>
        </div>
      </div>

      {/* Hotel Dynamic Pricing Configuration Status Card */}
      <div className="dp-status-card">
        <div className="dp-status-info">
          <span className={`dp-status-tag ${isDynamicEnabled ? 'active' : 'inactive'}`}>
            {isDynamicEnabled ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {isDynamicEnabled ? 'Dynamic Pricing is ACTIVE' : 'Dynamic Pricing is INACTIVE'}
          </span>
          <span className="dp-status-desc">
            {isDynamicEnabled
              ? 'Active dynamic pricing rules will be applied to room rates for bookings in this hotel.'
              : 'Dynamic pricing is disabled in this hotel\'s configuration. Base room prices will be used until enabled.'}
          </span>
        </div>

        <button
          className={`dp-toggle-status-btn ${isDynamicEnabled ? 'disable' : 'enable'}`}
          onClick={handleToggleHotelConfig}
          disabled={configLoading}
        >
          {configLoading
            ? 'Updating...'
            : isDynamicEnabled
            ? 'Disable for this Hotel'
            : 'Enable for this Hotel'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="ha-filter-bar">
        <form onSubmit={handleSearchSubmit} className="ha-search-wrapper" style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search rules by name, room type, or rule type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ha-search-input"
            style={{ paddingLeft: '12px' }}
          />
          <button type="submit" className="dp-btn dp-btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ha-text-secondary)' }}>
            Rule Type:
          </span>
          <select
            value={ruleTypeFilter}
            onChange={(e) => setRuleTypeFilter(e.target.value)}
            className="ha-select"
          >
            <option value="all">All Rule Types ({totalCount})</option>
            <option value="weekend">Weekend Rules</option>
            <option value="weekday">Weekday Rules</option>
            <option value="holiday">Holiday / Events</option>
            <option value="custom_date_range">Custom Date Ranges</option>
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="dp-card">
        <h2 className="dp-card-title">
          <Tag size={18} /> Dynamic Pricing Rules
        </h2>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Type</th>
                <th>Room Type</th>
                <th>Rate Adjustment</th>
                <th>Applicable Schedule</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading pricing rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No dynamic pricing rules configured for this hotel. Click "+ Add Pricing Rule" to create one.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule._id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{rule.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {rule.ruleType}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{rule.roomType || 'All'}</td>
                    <td style={{ fontWeight: 700, color: '#0284c7' }}>
                      {formatAdjustment(rule)}
                    </td>
                    <td>{formatSchedule(rule)}</td>
                    <td>
                      <span className={`badge ${rule.isActive ? 'active' : 'inactive'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn-action edit"
                          onClick={() => {
                            setSelectedRule(rule);
                            setIsModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-action toggle"
                          onClick={() => handleToggleRule(rule._id)}
                        >
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn-action delete"
                          onClick={() => handleDeleteRule(rule._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalCount > 0 && (
          <div className="pagination-row">
            <button disabled={currentPage === 1} onClick={() => goToPage(1)}>« First</button>
            <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>← Prev</button>

            <span className="pagination-info">
              Page {currentPage} of {totalPages}
              <span style={{ marginLeft: 14, color: '#94a3b8' }}>
                ({(currentPage - 1) * LIMIT + 1}–{Math.min(currentPage * LIMIT, totalCount)} of {totalCount})
              </span>
            </span>

            <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>Next →</button>
            <button disabled={currentPage === totalPages} onClick={() => goToPage(totalPages)}>Last »</button>
          </div>
        )}
      </div>

      {/* Interactive Price Estimator & Preview */}
      <div className="dp-card">
        <h2 className="dp-card-title">
          <Calculator size={18} /> Live Price Calculation Simulator
        </h2>

        <form onSubmit={handleCalculatePreview}>
          <div className="dp-calc-grid">
            <div className="dp-form-group">
              <label className="dp-form-label">Select Room</label>
              <select
                className="dp-form-select"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                required
              >
                {rooms.length === 0 ? (
                  <option value="">No rooms available for this hotel</option>
                ) : (
                  rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      Room {r.roomNumber} ({r.roomType || 'Standard'} — Base: ₹{r.price || 0}/night)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="dp-form-group">
              <label className="dp-form-label">Check-In Date</label>
              <input
                type="date"
                className="dp-form-input"
                value={previewCheckIn}
                onChange={(e) => setPreviewCheckIn(e.target.value)}
                required
              />
            </div>

            <div className="dp-form-group">
              <label className="dp-form-label">Check-Out Date</label>
              <input
                type="date"
                className="dp-form-input"
                value={previewCheckOut}
                onChange={(e) => setPreviewCheckOut(e.target.value)}
                required
              />
            </div>

            <div className="dp-form-group" style={{ justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="dp-btn dp-btn-primary"
                disabled={calculating}
                style={{ height: '38px' }}
              >
                {calculating ? 'Calculating...' : 'Simulate Rates'}
              </button>
            </div>
          </div>
        </form>

        {previewResult && (
          <div className="dp-calc-results">
            <div className="dp-calc-summary">
              <div className="dp-calc-summary-item">
                <span className="dp-calc-summary-label">Total Nights</span>
                <span className="dp-calc-summary-val">{previewResult.pricing.totalNights}</span>
              </div>
              <div className="dp-calc-summary-item">
                <span className="dp-calc-summary-label">Base Rate Total</span>
                <span className="dp-calc-summary-val">₹{previewResult.pricing.totalBasePrice?.toLocaleString('en-IN')}</span>
              </div>
              <div className="dp-calc-summary-item">
                <span className="dp-calc-summary-label">Dynamic Rate Total</span>
                <span className="dp-calc-summary-val highlight">₹{previewResult.pricing.totalDynamicPrice?.toLocaleString('en-IN')}</span>
              </div>
              <div className="dp-calc-summary-item">
                <span className="dp-calc-summary-label">Avg Rate / Night</span>
                <span className="dp-calc-summary-val">₹{previewResult.pricing.averageNightlyRate?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1rem 0 0.5rem 0', color: '#334155' }}>
              Night-by-Night Rate Breakdown
            </h3>
            <table className="dp-breakdown-table">
              <thead>
                <tr>
                  <th>Night</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Base Price</th>
                  <th>Applied Rate</th>
                  <th>Rule Triggered</th>
                </tr>
              </thead>
              <tbody>
                {previewResult.pricing.breakdown?.map((item) => (
                  <tr key={item.nightIndex}>
                    <td>Night #{item.nightIndex}</td>
                    <td>{item.date}</td>
                    <td>{item.dayOfWeek}</td>
                    <td>₹{item.basePrice}</td>
                    <td style={{ fontWeight: 700, color: item.dynamicPrice !== item.basePrice ? '#0284c7' : 'inherit' }}>
                      ₹{item.dynamicPrice}
                    </td>
                    <td>
                      {item.ruleApplied ? (
                        <span className="badge active" style={{ fontSize: '11px' }}>
                          {item.ruleApplied.name} ({item.ruleApplied.ruleType})
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Standard Base Rate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <DynamicPricingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRule(null);
          }}
          hotelId={hotelId}
          initialRule={selectedRule}
          onSuccess={() => {
            fetchRules(currentPage, ruleTypeFilter, search);
            fetchConfigStatus();
          }}
        />
      )}
    </div>
  );
};

export default DynamicPricingPage;
