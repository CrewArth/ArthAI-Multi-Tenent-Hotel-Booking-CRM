import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { CalendarDays, ClipboardList, PanelsTopLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { normalizeRole } from '../../utils/auth';
import { BanquetHotelContext } from './banquetHotelContext';
import useBanquetHotel from './useBanquetHotel';
import './banquet.css';
import './banquetManagement.css';

export default function BanquetManagement() {
  const role = normalizeRole(useSelector((state) => state.auth.user?.role));
  const hotelScope = useBanquetHotel();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const { isHotelAdmin, assigned, hotels, hotelId, setHotelId, hotelError } = hotelScope;

  const selectHotel = (event) => {
    const nextHotelId = event.target.value;
    setHotelId(nextHotelId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextHotelId) next.set('guestHouseId', nextHotelId);
      else next.delete('guestHouseId');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (hotelError) toast.error(hotelError);
  }, [hotelError]);

  const tabs = [
    { path: 'enquiries', label: 'Enquiries', icon: ClipboardList },
    { path: 'calendar', label: 'Calendar', icon: CalendarDays },
    ...(role === 'SUPER_ADMIN' ? [{ path: 'halls', label: 'Hall management', icon: PanelsTopLeft }] : []),
  ];

  return (
    <main className="banquet-management">
      <div className="banquet-management__top">
        <div>
          <p className="banquet-eyebrow">Events & venues</p>
          <h1>Banquet Hall Management</h1>
        </div>
        <label className="banquet-management__hotel">
          <span>Hotel</span>
          {isHotelAdmin ? (
            <strong>{assigned?.guestHouseName || 'Assigned hotel'}</strong>
          ) : (
            <select value={hotelId} onChange={selectHotel}>
              {!hotels.length && <option value="">No hotels available</option>}
              {hotels.map((hotel) => <option key={hotel._id} value={hotel._id}>{hotel.guestHouseName}</option>)}
            </select>
          )}
        </label>
      </div>
      <nav className="banquet-management__tabs" aria-label="Banquet management sections">
        {tabs.map((tab) => (
          <NavLink key={tab.path} to={`${tab.path}${location.search}`} className={({ isActive }) => `banquet-management__tab${isActive ? ' is-active' : ''}`}>
            <tab.icon size={17} aria-hidden="true" /> {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="banquet-management__content">
        <BanquetHotelContext.Provider value={hotelScope}>
          <Outlet />
        </BanquetHotelContext.Provider>
      </div>
    </main>
  );
}
