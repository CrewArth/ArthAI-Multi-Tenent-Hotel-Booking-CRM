import React from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredToken, getStoredUser, normalizeRole } from '../../utils/auth';

export const ProtectedHotelAdminRoute = ({ children }) => {
  const token = getStoredToken();
  const user = getStoredUser();
  const role = normalizeRole(user?.role);

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (role === 'HOTEL_ADMIN' || role === 'SUPER_ADMIN') {
    return children;
  }

  return <Navigate to="/signin" replace />;
};

export default ProtectedHotelAdminRoute;
