import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { HotelAdminSidebar } from './HotelAdminSidebar';
import { SidebarProvider } from '../../admin/context/SidebarContext';
import '../../admin/styles/dashboard.css';
import '../styles/hotelAdminCommon.css';

export const HotelAdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="dashboard-layout">
        <Navbar />
        <div className="layout-container">
          <HotelAdminSidebar />
          <div className="main-content">
            <Outlet />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default HotelAdminLayout;
