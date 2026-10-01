import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { canAccessRolePath, getRedirectPathForRole, getStoredToken, getStoredUser, normalizeRole } from "../../utils/auth";
import { BanquetAccessProvider } from '../../features/banquet/BanquetAccess';

export default function ProtectedAdminRoute({ children }) {
  const reduxToken = useSelector((state) => state.auth?.token);
  const reduxUser = useSelector((state) => state.auth?.user);
  const location = useLocation();

  const token = reduxToken || getStoredToken();
  const user = reduxUser || getStoredUser();
  const role = normalizeRole(user?.role);

  if (!token || !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (canAccessRolePath(role, location.pathname)) {
    return role === 'SUPER_ADMIN' || role === 'HOTEL_ADMIN'
      ? <BanquetAccessProvider>{children}</BanquetAccessProvider>
      : children;
  }

  return <Navigate to={getRedirectPathForRole(role)} replace />;
}
