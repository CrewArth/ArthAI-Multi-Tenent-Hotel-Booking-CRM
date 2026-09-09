import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getStoredToken, getStoredUser, normalizeRole, getRedirectPathForRole } from "../../utils/auth";

function PublicRoute({ children }) {
  const reduxToken = useSelector((state) => state.auth?.token);
  const reduxUser = useSelector((state) => state.auth?.user);

  const token = reduxToken || getStoredToken();
  const user = reduxUser || getStoredUser();
  const role = normalizeRole(user?.role);

  // If already authenticated with a valid role, redirect directly to dashboard synchronously (no flicker!)
  if (token && role) {
    const redirectPath = getRedirectPathForRole(role);
    return <Navigate to={redirectPath} replace />;
  }

  // If token or user data is corrupted / invalid, purge storage cleanly
  if (token && !role) {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch {
      // ignore
    }
  }

  return children;
}

export default PublicRoute;

