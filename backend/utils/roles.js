export const normalizeRole = (role) => {
  if (role == null) {
    return null;
  }

  const trimmedRole = String(role).trim();

  if (!trimmedRole) {
    return null;
  }

  if (trimmedRole === 'admin') {
    return 'SUPER_ADMIN';
  }

  const upperRole = trimmedRole.toUpperCase();

  if (upperRole === 'SUPER_ADMIN' || upperRole === 'SUPER-ADMIN') {
    return 'SUPER_ADMIN';
  }

  if (upperRole === 'HOTEL_ADMIN' || upperRole === 'HOTEL-ADMIN' || upperRole === 'HOTELADMIN') {
    return 'HOTEL_ADMIN';
  }

  if (upperRole === 'ADMIN') {
    return 'ADMIN';
  }

  if (upperRole === 'USER') {
    return 'USER';
  }

  return upperRole;
};

export const normalizeUser = (user) => {
  if (!user) {
    return user;
  }

  return {
    ...user,
    role: normalizeRole(user.role),
  };
};