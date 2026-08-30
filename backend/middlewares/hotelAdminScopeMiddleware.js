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
export const verifyPropertyOwnership = async (req, res, next) => {
  const role = req.user?.role;

  // SUPER_ADMIN has unrestricted multi-property access
  if (role === 'SUPER_ADMIN') {
    return next();
  }

  if (role === 'HOTEL_ADMIN' || role === 'ADMIN') {
    const assignedId = req.user?.assignedGuestHouseId;
    if (!assignedId) {
      return next();
    }

    const assignedStr = String(
      typeof assignedId === 'object'
        ? assignedId.guestHouseId || assignedId._id
        : assignedId
    ).trim();

    // Check direct guestHouseId in body, query, or params
    const targetGHId = req.body?.guestHouseId || req.query?.guestHouseId || req.params.guestHouseId;
    if (targetGHId) {
      const targetStr = String(
        typeof targetGHId === 'object'
          ? targetGHId.guestHouseId || targetGHId._id
          : targetGHId
      ).trim();

      if (assignedStr !== targetStr) {
        return res.status(403).json({
          message: `Access denied: You are only authorized to manage your assigned hotel property (${assignedStr}).`,
          assignedGuestHouseId: assignedStr,
          attemptedGuestHouseId: targetStr,
        });
      }
      return next();
    }

    // If param :id is provided, check if it's a Room or Bed
    if (req.params.id && req.tenantModels) {
      const { Room, Bed, GuestHouse } = req.tenantModels;
      const paramId = req.params.id;

      // Check if paramId is a Room
      if (Room) {
        const room = await Room.findById(paramId).lean();
        if (room && room.guestHouseId) {
          const roomGH = String(room.guestHouseId);
          if (roomGH !== assignedStr) {
            const gh = GuestHouse ? await GuestHouse.findById(room.guestHouseId).lean() : null;
            const matches = gh && (String(gh.guestHouseId) === assignedStr || String(gh._id) === assignedStr);
            if (!matches) {
              return res.status(403).json({
                message: 'Access denied: Room does not belong to your assigned hotel property.',
              });
            }
          }
          return next();
        }
      }

      // Check if paramId is a Bed
      if (Bed) {
        const bed = await Bed.findById(paramId).lean();
        if (bed && bed.roomId) {
          const room = Room ? await Room.findById(bed.roomId).lean() : null;
          if (room && room.guestHouseId) {
            const roomGH = String(room.guestHouseId);
            if (roomGH !== assignedStr) {
              const gh = GuestHouse ? await GuestHouse.findById(room.guestHouseId).lean() : null;
              const matches = gh && (String(gh.guestHouseId) === assignedStr || String(gh._id) === assignedStr);
              if (!matches) {
                return res.status(403).json({
                  message: 'Access denied: Bed does not belong to your assigned hotel property.',
                });
              }
            }
          }
          return next();
        }
      }
    }
  }

  return next();
};
