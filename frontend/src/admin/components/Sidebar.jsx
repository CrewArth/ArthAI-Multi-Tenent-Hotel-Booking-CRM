import "../styles/sidebar.css";
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';
import { superAdminSidebarData, adminSidebarData } from '../utils/sidebarData';
import { useSidebar } from '../context/SidebarContext';

const SETTINGS_ID = 'MC_SETTINGS';

const Sidebar = () => {
  const user = useSelector((state) => state.auth.user);
  const role = String(user?.role || '').toUpperCase();
  const { mobileOpen, close } = useSidebar();
  const sidebarRef = useRef(null);

  const isHotelAdmin = role === 'HOTEL_ADMIN' || role === 'HOTEL-ADMIN';
  const sidebarDataset = role === 'ADMIN' ? adminSidebarData : superAdminSidebarData;

  const navItems = sidebarDataset.filter((item) => item.id !== SETTINGS_ID);
  const settingsItem = isHotelAdmin ? null : sidebarDataset.find((item) => item.id === SETTINGS_ID);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        mobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !e.target.closest('.sidebar-burger-nav')
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [mobileOpen, close]);

  const renderLink = (item) => (
    <li key={item.id} className="nav-item">
      <NavLink
        to={item.navigate}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        onClick={close}
      >
        <item.icon size={20} />
        <span>{item.name}</span>
        <ChevronRight size={16} className="arrow-icon" />
      </NavLink>
    </li>
  );

  return (
    <>
      {/* Overlay backdrop for mobile */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}
      >
        <nav className="sidebar-nav">
          {/* Main navigation items */}
          <ul className="nav-list">
            {navItems.map(renderLink)}
          </ul>

          {/* Settings pinned at the bottom with a divider (if present) */}
          {settingsItem && (
            <>
              <div className="sidebar-divider" />
              <ul className="nav-list">
                {renderLink(settingsItem)}
              </ul>
            </>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
