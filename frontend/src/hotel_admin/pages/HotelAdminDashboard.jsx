import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  DoorOpen,
  TrendingUp,
  CalendarCheck,
  CreditCard,
  List,
  Receipt,
  FileBarChart,
  ArrowRight,
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { fetchDashboardStats } from '../../redux/hotelAdminSlice';
import { StatCard } from '../components/StatCard';
import { DataTable } from '../components/DataTable';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import '../styles/hotelAdminDashboard.css';

export const HotelAdminDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/hotel-admin/dashboard-stats');
      setData(res.data);
      dispatch(fetchDashboardStats());
    } catch (err) {
      console.error('Failed to load hotel admin dashboard stats:', err);
      toast.error(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const stats = data?.stats || {};
  const recentBookings = data?.recentBookings || [];

  // Table column definition for recent bookings
  const columns = [
    {
      header: 'Booking ID',
      accessor: 'bookingId',
      render: (b) => (
        <span style={{ fontWeight: 700, color: 'var(--ha-text-main)' }}>
          {b.bookingId || b._id?.substring(0, 8)}
        </span>
      ),
    },
    {
      header: 'Guest Name',
      render: (b) => {
        const guestName = `${b.userId?.firstName || ''} ${b.userId?.lastName || ''}`.trim() || 'Guest';
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{guestName}</div>
            <div style={{ fontSize: '11px', color: 'var(--ha-text-muted)' }}>
              {b.userId?.phone || b.userId?.email || ''}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Room',
      render: (b) => b.roomIds?.map((r) => `Room ${r.roomNumber}`).join(', ') || '—',
    },
    {
      header: 'Dates',
      render: (b) => `${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}`,
    },
    {
      header: 'Status',
      render: (b) => (
        <span className={`ha-badge ${getStatusBadgeClass(b.status)}`}>
          {b.status || 'Pending'}
        </span>
      ),
    },
    {
      header: 'Total',
      align: 'right',
      render: (b) => (
        <span style={{ fontWeight: 700, color: 'var(--ha-text-main)' }}>
          {formatCurrency(b.bookingTotal || b.amountPaid)}
        </span>
      ),
    },
  ];

  return (
    <div className="ha-page-container">
      {/* KPI Stats Grid */}
      <div className="ha-kpi-grid">
        <StatCard
          title="Total Rooms"
          value={stats.totalRooms ?? '—'}
          icon={DoorOpen}
          colorTheme="blue"
        />
        <StatCard
          title="Occupancy Rate"
          value={stats.occupancyRate !== undefined ? `${stats.occupancyRate}%` : '—'}
          icon={TrendingUp}
          colorTheme="green"
        />
        <StatCard
          title="Today's Check-ins"
          value={stats.todayArrivals ?? 0}
          icon={CalendarCheck}
          colorTheme="amber"
        />
        <StatCard
          title="Revenue Collected"
          value={formatCurrency(stats.totalRevenue)}
          icon={CreditCard}
          colorTheme="emerald"
        />
      </div>

      {/* Quick Action Operations */}
      <div className="ha-card">
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ha-text-main)', margin: '0 0 16px 0' }}>
          Hotel Operations Quick Links
        </h2>

        <div className="ha-quick-links-grid">
          <div
            onClick={() => navigate('/hotel-admin/bookings')}
            className="ha-quick-link-card"
          >
            <div className="ha-quick-link-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <List size={20} />
            </div>
            <div className="ha-quick-link-title">Bookings List</div>
          </div>

          <div
            onClick={() => navigate('/hotel-admin/rooms')}
            className="ha-quick-link-card"
          >
            <div className="ha-quick-link-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <DoorOpen size={20} />
            </div>
            <div className="ha-quick-link-title">Room Management</div>
          </div>

          <div
            onClick={() => navigate('/hotel-admin/receipts')}
            className="ha-quick-link-card"
          >
            <div className="ha-quick-link-icon-wrap" style={{ background: '#fdf2f8', color: '#db2777' }}>
              <Receipt size={20} />
            </div>
            <div className="ha-quick-link-title">Outstanding Receipts</div>
          </div>

          <div
            onClick={() => navigate('/hotel-admin/reports')}
            className="ha-quick-link-card"
          >
            <div className="ha-quick-link-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <FileBarChart size={20} />
            </div>
            <div className="ha-quick-link-title">Property Reports</div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Section */}
      <div className="ha-card">
        <div className="ha-section-header">
          <h2 className="ha-section-title">Recent Bookings</h2>
          <button
            onClick={() => navigate('/hotel-admin/bookings')}
            className="ha-view-all-btn"
          >
            View all bookings <ArrowRight size={14} />
          </button>
        </div>

        <DataTable
          columns={columns}
          data={recentBookings}
          loading={loading}
          loadingMessage="Loading recent bookings..."
          emptyMessage="No recent bookings recorded for this property."
        />
      </div>
    </div>
  );
};

export default HotelAdminDashboard;
