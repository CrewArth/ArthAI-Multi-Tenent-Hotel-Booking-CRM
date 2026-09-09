import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getStoredToken, getStoredUser, normalizeRole } from "../../utils/auth";

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

  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "HOTEL_ADMIN") {
    return children;
  }

  return <Navigate to="/signin" replace />;
}