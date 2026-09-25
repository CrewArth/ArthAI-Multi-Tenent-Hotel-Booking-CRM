import React from 'react';
import { useSelector } from 'react-redux';
import '../styles/adminDashboard.css';
import Calendar from '../components/Calender.jsx';
import TodayBookings from '../components/TodayBookings';

const Overview = ({ showTodayBookings = false }) => {
  const currentUser = useSelector((state) => state.auth?.user);
  const assignedGhId = (String(currentUser?.role || '').toUpperCase() === 'ADMIN' && currentUser?.assignedGuestHouseId)
    ? currentUser.assignedGuestHouseId
    : null;

  return (
    <div className="page-root">
      {showTodayBookings && (
        <div className="overview-today-bookings">
          <TodayBookings />
        </div>
      )}

      <div className="calendar-section">
        <h2 className="section-title">Booking Calendar</h2>
        <p className="section-subtitle">All approved bookings at a glance</p>
        <Calendar assignedGhId={assignedGhId} />
      </div>
    </div>
  );
};

export default Overview;
