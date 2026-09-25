import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import '../styles/adminDashboard.css';
import BookingsPerDayChart from '../components/BookingsPerDayChart.jsx';
import TopGuestHousesChart from '../components/TopGuestHousesChart.jsx';
import Calendar from '../components/Calender.jsx';
import TodayBookings from '../components/TodayBookings';
import api from '../../utils/api';
import { isWidgetAllowed } from '../../common/widgetsConfig';
import { getCurrentMonthDateRange } from '../utils/dateUtils';

const formatRange = (range) => {
  if (!range?.startDate || !range?.endDate) return '';
  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${format.format(new Date(range.startDate))} – ${format.format(new Date(range.endDate))}`;
};

const Overview = ({ showTodayBookings = false }) => {
  const currentUser = useSelector((state) => state.auth?.user);
  const assignment = currentUser?.assignedGuestHouseId;
  const assignedGhId = String(currentUser?.role || '').toUpperCase() === 'ADMIN'
    ? (assignment && typeof assignment === 'object' ? assignment.guestHouseId || assignment._id : assignment) || null
    : null;

  const [stats, setStats] = useState({
    totalBookings: 0,
    totalUsers: 0,
    totalGuestHouses: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    todaysBookings: 0,
    occupancyRate: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [bookingsTrend, setBookingsTrend] = useState({ data: [], loading: false, rangeLabel: '' });
  const [topGuestHouses, setTopGuestHouses] = useState({ data: [], loading: false, rangeLabel: '' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState({ startDate: '', endDate: '' });
  const [{ startDate: initialStart, endDate: initialEnd }] = useState(getCurrentMonthDateRange);
  const [dateRange, setDateRange] = useState({ startDate: initialStart, endDate: initialEnd });

  useEffect(() => {
    let active = true;
    setRefreshing(true);
    api.post('/api/admin/summary')
      .then((res) => { if (active) setStats(res.data); })
      .catch((err) => console.error(err))
      .finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setBookingsTrend((previous) => ({ ...previous, loading: true }));
    setTopGuestHouses((previous) => ({ ...previous, loading: true }));
    Promise.all([
      api.post('/api/admin/metrics/bookings-per-day', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: 'approved',
        ...(assignedGhId && { guestHouseId: assignedGhId }),
      }),
      api.post('/api/admin/metrics/top-guest-houses', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 5,
        status: 'approved',
        ...(assignedGhId && { guestHouseId: assignedGhId }),
      }),
    ])
      .then(([trend, guestHouses]) => {
        if (!active) return;
        setBookingsTrend({ data: trend.data?.data || [], loading: false, rangeLabel: formatRange(trend.data?.range) });
        setTopGuestHouses({ data: guestHouses.data?.data || [], loading: false, rangeLabel: formatRange(guestHouses.data?.range) });
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setBookingsTrend((previous) => ({ ...previous, loading: false }));
          setTopGuestHouses((previous) => ({ ...previous, loading: false }));
        }
      });
    return () => { active = false; };
  }, [dateRange.startDate, dateRange.endDate, assignedGhId]);

  const allStatCards = [
    { id: 'totalBookings', label: 'Total Bookings', val: stats.totalBookings },
    { id: 'totalUsers', label: 'Total Admins', val: stats.totalUsers },
    { id: 'totalGuestHouses', label: 'Hotels', val: stats.totalGuestHouses },
    { id: 'cancelledBookings', label: 'Cancelled', val: stats.cancelledBookings, cls: 'danger' },
    { id: 'pendingBookings', label: 'Pending', val: stats.pendingBookings, cls: 'warning' },
    { id: 'approvedBookings', label: 'Approved', val: stats.approvedBookings, cls: 'success' },
    { id: 'occupancyRate', label: 'Occupancy Rate', val: `${stats.occupancyRate}%` },
    { id: 'todaysBookings', label: <>Today's Bookings</>, val: stats.todaysBookings },
  ];
  const visibleStatCards = allStatCards.filter((card) => isWidgetAllowed(currentUser, card.id));

  return (
    <div className="page-root">
      {refreshing && (
        <div className="page-header-row" style={{ marginBottom: '0.5rem' }}>
          <span className="refreshing-text">Refreshing…</span>
        </div>
      )}

      {showTodayBookings && (
        <div className="overview-today-bookings">
          <TodayBookings />
        </div>
      )}

      {visibleStatCards.length > 0 && (
        <div className="card-grid">
          {visibleStatCards.map(({ id, label, val, cls }) => (
            <div key={id} className={`dashboard-card${cls ? ` ${cls}` : ''}`}>
              <h2 className="stat-number">{val}</h2>
              <p>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="date-range-selector">
        <button
          className="date-range-btn"
          onClick={() => { setDraft({ ...dateRange }); setPickerOpen((open) => !open); }}
        >
          {dateRange.startDate} → {dateRange.endDate}
        </button>
        {pickerOpen && (
          <div className="date-range-dropdown" onClick={(event) => event.stopPropagation()}>
            <div className="date-range-dropdown-body">
              <label>
                From
                <input type="date" value={draft.startDate}
                  onChange={(event) => setDraft((previous) => ({ ...previous, startDate: event.target.value }))} />
              </label>
              <label>
                To
                <input type="date" value={draft.endDate}
                  onChange={(event) => setDraft((previous) => ({ ...previous, endDate: event.target.value }))} />
              </label>
            </div>
            <div className="date-range-dropdown-footer">
              <button className="date-range-apply" onClick={() => { setDateRange(draft); setPickerOpen(false); }}>
                Apply
              </button>
              <button className="date-range-cancel" onClick={() => setPickerOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <BookingsPerDayChart
          key={`b-${dateRange.startDate}-${dateRange.endDate}`}
          data={bookingsTrend.data} loading={bookingsTrend.loading} rangeLabel={bookingsTrend.rangeLabel}
        />
        <TopGuestHousesChart
          key={`g-${dateRange.startDate}-${dateRange.endDate}`}
          data={topGuestHouses.data} loading={topGuestHouses.loading} rangeLabel={topGuestHouses.rangeLabel}
        />
      </div>

      <div className="calendar-section">
        <h2 className="section-title">Booking Calendar</h2>
        <p className="section-subtitle">All approved bookings at a glance</p>
        <Calendar assignedGhId={assignedGhId} />
      </div>
    </div>
  );
};

export default Overview;
