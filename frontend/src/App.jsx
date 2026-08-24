import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import lazyLoad from './utils/lazyLoad';
import ProtectedRoute from './users/routes/ProtectedRoute';
import PublicRoute from './users/routes/PublicRoute';
import Dashboard from './users/pages/Dashboard';
import ProtectedAdminRoute from './admin/routes/ProtectedAdminRoute';
const LoginPage = lazyLoad(() => import('./users/pages/Login'));
const AdminDashboard = lazyLoad(() => import('./admin/pages/AdminDashboard'));
const AdminUserDashboard = lazyLoad(() => import('./admin/pages/AdminUserDashboard'));
const AdminRoomBooking = lazyLoad(() => import('./admin/pages/AdminRoomBooking'));
const Profile = lazyLoad(() => import('./users/pages/Profile'));
const AddRooms = lazyLoad(() => import('./admin/pages/RoomManagement.jsx'));
const AddBeds = lazyLoad(() => import('./admin/pages/BedManagement.jsx'));
const AuditLogs = lazyLoad(() => import('./admin/pages/AuditLogs'));
const Overview = lazyLoad(() => import('./admin/pages/Overview'));
const Bookings = lazyLoad(() => import('./admin/pages/Bookings'));
const GuestHouseManagement = lazyLoad(() => import('./admin/pages/GuestHouseManagement.jsx'));
const AddHotelPage = lazyLoad(() => import('./admin/pages/AddHotelPage'));
const UsersList = lazyLoad(() => import('./admin/pages/UsersList'));
const NotFound = lazyLoad(() => import('./components/NotFound'));
const Settings = lazyLoad(() => import('./admin/pages/Settings'));
const Reports = lazyLoad(() => import('./admin/pages/Reports'));
const GuestHouseBookings = lazyLoad(() => import('./admin/pages/GuestHouseBookings'));
const PaymentPage = lazyLoad(() => import('./admin/pages/PaymentPage'));
const InvoicePage = lazyLoad(() => import('./admin/pages/InvoicePage'));
const TaxesManagement = lazyLoad(() => import('./admin/pages/TaxesManagement'));
const Receipts = lazyLoad(() => import('./admin/pages/Receipts'));
const InvoiceList = lazyLoad(() => import('./admin/pages/InvoiceList'));
const ForgotPassword = lazyLoad(() => import('./users/pages/ForgotPassword'));
const ResetPassword = lazyLoad(() => import('./users/pages/ResetPassword'));
const AboutUs = lazyLoad(() => import('./commonPages/AboutUs'));
const ContactUs = lazyLoad(() => import('./commonPages/ContactUs'));
const TermsAndPolicy = lazyLoad(() => import('./commonPages/TermsAndPolicy'));
const FAQ = lazyLoad(() => import('./commonPages/FAQ'));
import ScrollToTop from './components/ScrollToTop';
import { getAuthenticatedRedirectPath } from './utils/auth';

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


function App() {
  const RootRedirect = () => {
    const redirectPath = getAuthenticatedRedirectPath();

    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }

    return <LoginPage />;
  };

  return (

    <>
    <ToastContainer position="top-right" autoClose={2500} theme="colored" newestOnTop closeOnClick pauseOnHover />
    
    <BrowserRouter>
      <ScrollToTop />
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1rem',
              color: '#334155',
            }}
          >
            Loading...
          </div>
        }
      >
        <Routes>
        
        {/* ------------------ PUBLIC ROUTES ------------------ */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/signup" element={<Navigate to="/signin" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/terms" element={<TermsAndPolicy />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/checkout" element={<Navigate to="/admin/checkout" replace />} />

        {/* ------------------ USER PROTECTED ROUTES ------------------ */}
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/booking" element={<Navigate to="/admin/book-room" replace />} />
        <Route path="/my-bookings" element={<Navigate to="/admin/dashboard" replace />} />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ------------------ ADMIN & SUPER ADMIN PANEL ROUTES ------------------ */}
        <Route 
          element={
            <ProtectedAdminRoute>
              <AdminDashboard /> {/* Sidebar Layout wrapper */}
            </ProtectedAdminRoute>
          }
        >
          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<AdminUserDashboard />} />
          <Route path="/admin/book-room" element={<AdminRoomBooking />} />
          <Route path="/admin/guest-house-bookings" element={<GuestHouseBookings />} />
          <Route path="/admin/payment" element={<PaymentPage />} />
          <Route path="/admin/checkout" element={<PaymentPage />} />
          <Route path="/admin/invoice" element={<InvoicePage />} />
          <Route path="/admin/receipts" element={<Receipts />} />
          <Route path="/admin/invoice-list" element={<InvoiceList />} />
          <Route path="/admin/reports" element={<Reports />} />

          {/* Super Admin routes */}
          <Route path="/super-admin/users" element={<UsersList />} />
          <Route path="/super-admin/dashboard" element={<Overview />} />
          <Route path="/super-admin/hotel" element={<GuestHouseManagement />} />
          <Route path="/super-admin/guesthouses" element={<Navigate to="/super-admin/hotel" replace />} />
          <Route path="/super-admin/add-hotel" element={<AddHotelPage />} />
          <Route path="/super-admin/rooms" element={<AddRooms />} />
          <Route path="/super-admin/beds" element={<AddBeds />} />
          <Route path="/super-admin/audits" element={<AuditLogs />} />
          <Route path="/super-admin/bookings" element={<Bookings />}/>
          <Route path="/super-admin/reports" element={<Reports />} />
          <Route path="/super-admin/settings" element={<Settings />} />
          <Route path="/super-admin/taxes" element={<TaxesManagement />} />
        </Route>  

        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </>
  );
}

export default App;
