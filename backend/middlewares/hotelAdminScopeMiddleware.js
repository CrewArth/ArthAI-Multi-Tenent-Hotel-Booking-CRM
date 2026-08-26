/**
 * hotelAdminScopeMiddleware.js
 * Enforces property-scoped access control rules for HOTEL_ADMIN users.
 */

// Block HOTEL_ADMIN from creating new hotels
export const preventHotelCreationForHotelAdmin = (req, res, next) => {
  if (req.user?.role === 'HOTEL_ADMIN') {
    return res.status(403).json({
      message: 'HOTEL_ADMIN users are not authorized to create new hotel properties.',
    });
  }
  return next();
};

// Block HOTEL_ADMIN from deleting hotel properties
export const preventHotelDeletionForHotelAdmin = (req, res, next) => {
  if (req.user?.role === 'HOTEL_ADMIN') {
    return res.status(403).json({
      message: 'HOTEL_ADMIN users are not authorized to delete hotel properties.',
    });
  }
  return next();
};

// Verify HOTEL_ADMIN is operating strictly on their assignedGuestHouseId
export const verifyPropertyOwnership = (req, res, next) => {
  const role = req.user?.role;

  // SUPER_ADMIN has unrestricted multi-property access
  if (role === 'SUPER_ADMIN') {
    return next();
  }

  if (role === 'HOTEL_ADMIN' || role === 'ADMIN') {
    const assignedId = req.user?.assignedGuestHouseId;
    const targetId = req.params.guestHouseId || req.params.id || req.body?.guestHouseId || req.query?.guestHouseId;

    if (assignedId && targetId && String(assignedId).trim() !== String(targetId).trim()) {
      return res.status(403).json({
        message: `Access denied: You are only authorized to manage your assigned hotel property (${assignedId}).`,
        assignedGuestHouseId: assignedId,
        attemptedGuestHouseId: targetId,
      });
    }
  }

  return next();
};
