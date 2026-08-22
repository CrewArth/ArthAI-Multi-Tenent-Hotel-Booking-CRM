import { getSubscriptionLimits } from '../config/subscriptionLimits.js';

/**
 * POST /api/subscription/usage
 * Returns current tenant subscription plan, resource limits, and active counts.
 */
export const getSubscriptionUsage = async (req, res) => {
  try {
    const { GuestHouse, Room, User } = req.tenantModels;
    const { plan, limits } = req.subscription || { plan: 'basic', limits: getSubscriptionLimits('basic') };

    const [hotelCount, adminCount, rooms] = await Promise.all([
      GuestHouse.countDocuments(),
      User.countDocuments({ role: 'ADMIN' }),
      Room.aggregate([
        { $group: { _id: "$guestHouseId", roomCount: { $sum: 1 } } }
      ])
    ]);

    const roomsPerHotelMap = {};
    rooms.forEach((r) => {
      if (r._id) roomsPerHotelMap[r._id] = r.roomCount;
    });

    return res.json({
      plan: plan.toUpperCase(),
      limits,
      usage: {
        hotels: {
          current: hotelCount,
          max: limits.maxHotels,
          available: Math.max(0, limits.maxHotels - hotelCount),
          limitReached: hotelCount >= limits.maxHotels,
        },
        admins: {
          current: adminCount,
          max: limits.maxAdminsPerHotel,
          available: Math.max(0, limits.maxAdminsPerHotel - adminCount),
          limitReached: adminCount >= limits.maxAdminsPerHotel,
        },
        roomsPerHotel: {
          max: limits.maxRoomsPerHotel,
          byHotel: roomsPerHotelMap,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching subscription usage:', error);
    return res.status(500).json({ message: 'Server error while fetching subscription usage' });
  }
};
