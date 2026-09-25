export const getStoredUser = () => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem("token");

export const normalizeRole = (role) => {
  if (!role) {
    return null;
  }

  const trimmedRole = String(role).trim();

  if (!trimmedRole) {
    return null;
  }

  if (trimmedRole === "admin") {
    return "SUPER_ADMIN";
  }

  const normalizedRole = trimmedRole.toUpperCase();

  if (normalizedRole === "SUPER_ADMIN" || normalizedRole === "SUPER-ADMIN") {
    return "SUPER_ADMIN";
  }

  if (normalizedRole === "HOTEL_ADMIN" || normalizedRole === "HOTEL-ADMIN" || normalizedRole === "HOTELADMIN") {
    return "HOTEL_ADMIN";
  }

  if (normalizedRole === "ADMIN") {
    return "ADMIN";
  }

  if (normalizedRole === "USER") {
    return "USER";
  }

  return normalizedRole;
};

const ROLE_BASE_PATHS = Object.freeze({
  SUPER_ADMIN: '/super-admin',
  ADMIN: '/admin',
  HOTEL_ADMIN: '/hotel-admin',
});

export const getRoleBasePath = (role) => ROLE_BASE_PATHS[normalizeRole(role)] || null;

export const getRouteRoleForPath = (pathname) => Object.entries(ROLE_BASE_PATHS)
  .find(([, basePath]) => pathname === basePath || pathname.startsWith(`${basePath}/`))?.[0] || null;

export const canAccessRolePath = (role, pathname) => {
  const requiredRole = getRouteRoleForPath(pathname);
  return requiredRole !== null && normalizeRole(role) === requiredRole;
};

export const getRedirectPathForRole = (role) => {
  if (normalizeRole(role) === 'USER') return '/profile';
  const basePath = getRoleBasePath(role);
  return basePath ? `${basePath}/dashboard` : '/signin';
};

export const getAuthenticatedRedirectPath = () => {
  const token = getStoredToken();
  const user = getStoredUser();

  if (token && user?.role) {
    return getRedirectPathForRole(user.role);
  }

  return null;
};
