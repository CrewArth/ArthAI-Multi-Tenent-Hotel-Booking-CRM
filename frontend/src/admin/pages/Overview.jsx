import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import "../styles/adminDashboard.css";
import BookingsPerDayChart from "../components/BookingsPerDayChart.jsx";
import TopGuestHousesChart from "../components/TopGuestHousesChart.jsx";
import Calendar from "../components/Calender.jsx";
import TodayBookings from "../components/TodayBookings";
import api from "../../utils/api";
import { isWidgetAllowed } from "../../common/widgetsConfig";
import { getCurrentMonthDateRange } from "../utils/dateUtils";

const Overview = ({ showTodayBookings = false }) => {
  const currentUser = useSelector((state) => state.auth?.user);

  // Derive the assigned guest house ID for ADMIN role once
  const assignedGhId = (String(currentUser?.role || '').toUpperCase() === 'ADMIN' && currentUser?.assignedGuestHouseId)
    ? currentUser.assignedGuestHouseId
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
  const [bookingsTrend, setBookingsTrend]   = useState({ data: [], loading: false, rangeLabel: "" });
  const [topGuestHouses, setTopGuestHouses] = useState({ data: [], loading: false, rangeLabel: "" });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState({ startDate: '', endDate: '' });

  const { startDate: defaultStart, endDate: defaultEnd } = getCurrentMonthDateRange();
  const [dateRange, setDateRange] = useState({ startDate: defaultStart, endDate: defaultEnd });
  const maxDate = defaultEnd;

  const fmt = (range) => {
    if (!range?.startDate || !range?.endDate) return "";
    const f = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return `${f.format(new Date(range.startDate))} – ${f.format(new Date(range.endDate))}`;
  };

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await api.post("/api/admin/summary");
      setStats(res.data);
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  };

  const fetchMetrics = useCallback(async () => {
    setBookingsTrend((p) => ({ ...p, loading: true }));
    setTopGuestHouses((p) => ({ ...p, loading: true }));
    try {
      const [tR, gR] = await Promise.all([
        api.post("/api/admin/metrics/bookings-per-day", { startDate: dateRange.startDate, endDate: dateRange.endDate, status: "approved", ...(assignedGhId && { guestHouseId: assignedGhId }) }),
        api.post("/api/admin/metrics/top-guest-houses", { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 5, status: "approved", ...(assignedGhId && { guestHouseId: assignedGhId }) }),
      ]);
      setBookingsTrend({ data: tR.data?.data || [], loading: false, rangeLabel: fmt(tR.data?.range) });
      setTopGuestHouses({ data: gR.data?.data || [], loading: false, rangeLabel: fmt(gR.data?.range) });
    } catch (err) {
      console.error(err);
      setBookingsTrend((p) => ({ ...p, loading: false }));
      setTopGuestHouses((p) => ({ ...p, loading: false }));
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchStats();
    fetchMetrics();
    const id = setInterval(() => {
      fetchStats();
      fetchMetrics();
    }, 30000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const formattedToday = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());

  const allStatCards = [
    { id: "totalBookings", label: "Total Bookings", val: stats.totalBookings },
    { id: "totalUsers", label: "Total Admins", val: stats.totalUsers },
    { id: "totalGuestHouses", label: "Hotels", val: stats.totalGuestHouses },
    { id: "cancelledBookings", label: "Cancelled", val: stats.cancelledBookings, cls: "danger" },
    { id: "pendingBookings", label: "Pending", val: stats.pendingBookings, cls: "warning" },
    { id: "approvedBookings", label: "Approved", val: stats.approvedBookings, cls: "success" },
    { id: "occupancyRate", label: "Occupancy Rate", val: `${stats.occupancyRate}%` },
    { id: "todaysBookings", label: <>Today's Bookings</>, val: stats.todaysBookings },
  ];

  const visibleStatCards = allStatCards.filter((card) => isWidgetAllowed(currentUser, card.id));

  return (
    <div className="page-root">
      <div className="page-header-row">
        {refreshing && <span className="refreshing-text">Refreshing…</span>}
      </div>

      {/* Today's Bookings table */}
      {showTodayBookings && <TodayBookings />}

      {/* Filtered Stat Cards Grid */}
      {visibleStatCards.length > 0 && (
        <div className="card-grid">
          {visibleStatCards.map(({ id, label, val, cls }) => (
            <div key={id} className={`dashboard-card${cls ? ` ${cls}` : ""}`}>
              <h2 className="stat-number">{val}</h2>
              <p>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Date range picker */}
      <div className="date-range-selector">
        <button
          className="date-range-btn"
          onClick={() => { setDraft({ ...dateRange }); setPickerOpen((o) => !o); }}
        >
          📅 {dateRange.startDate} → {dateRange.endDate}
        </button>

        {pickerOpen && (
          <div className="date-range-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="date-range-dropdown-body">
              <label>
                From
                <input type="date" value={draft.startDate}
                  onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))} />
              </label>
              <label>
                To
                <input type="date" value={draft.endDate}
                  onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))} />
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

      {/* Charts */}
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

      {/* Calendar */}
      <div className="calendar-section">
        <h2 className="section-title">Booking Calendar</h2>
        <p className="section-subtitle">All approved bookings at a glance</p>
        <Calendar assignedGhId={assignedGhId} />
      </div>
    </div>
  );
};

export default Overview;
