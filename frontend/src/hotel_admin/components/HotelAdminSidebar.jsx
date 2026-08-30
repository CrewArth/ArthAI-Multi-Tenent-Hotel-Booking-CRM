import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { hotelAdminNavItems } from '../utils/sidebarData';
import { useSidebar } from '../../admin/context/SidebarContext';
import '../../admin/styles/sidebar.css';

export const HotelAdminSidebar = () => {
  const { mobileOpen, close } = useSidebar();
  const sidebarRef = useRef(null);

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
        to={item.path || item.navigate}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        onClick={close}
      >
        <item.icon size={20} />
        <span>{item.label || item.name}</span>
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
          <ul className="nav-list">
            {hotelAdminNavItems.map(renderLink)}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default HotelAdminSidebar;
