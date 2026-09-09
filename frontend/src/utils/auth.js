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

  if (trimmedRole === "user") {
    return "ADMIN";
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
    return "ADMIN";
  }

  return normalizedRole;
};

export const getRedirectPathForRole = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") {
    return "/super-admin/dashboard";
  }

  if (normalizedRole === "HOTEL_ADMIN") {
    return "/hotel-admin/dashboard";
  }

  if (normalizedRole === "ADMIN") {
    return "/admin/dashboard";
  }

  return "/signin";
};

export const getAuthenticatedRedirectPath = () => {
  const token = getStoredToken();
  const user = getStoredUser();

  if (token && user?.role) {
    return getRedirectPathForRole(user.role);
  }

  return null;
};
