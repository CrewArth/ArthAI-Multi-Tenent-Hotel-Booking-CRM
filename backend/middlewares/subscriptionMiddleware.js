import { connectMasterDb } from '../config/dbManager.js';
import tenantSchema from '../models/centralModels/Tenant.js';
import { getSubscriptionLimits } from '../config/subscriptionLimits.js';
import { isObjectId } from '../utils/isObjectId.js';
import packageSchema from '../models/centralModels/Package.js';

/**
 * Resolves the active tenant's subscription plan from central registry (guesthouse_central)
 * and attaches req.subscription = { plan, planName, limits }.
 */
export const resolveSubscriptionPlan = async (req, res, next) => {
  try {
    const dbName = req.tenantDb?.name || req.userInfo?.dbName || process.env.DEFAULT_TENANT_DB || 'guesthouses';

    const master = await connectMasterDb();
    const Tenant = master.models.Tenant || master.model('Tenant', tenantSchema);
    const Package = master.models.Package || master.model('Package', packageSchema);

    const tenant = await Tenant.findOne({ dbName }).lean();
    const plan = String(tenant?.plan || 'pro').toLowerCase().trim();
    const customPackage = await Package.findOne({ slug: plan }).lean();
    const limits = customPackage
      ? {
          name: customPackage.planName,
          maxHotels: customPackage.maxHotels,
          maxRoomsPerHotel: customPackage.maxRooms,
          maxAdminsPerHotel: customPackage.maxAdmins,
        }
      : getSubscriptionLimits(plan);

    req.subscription = {
      plan,
      planName: customPackage?.planName || limits.name,
      limits,
    };
  } catch (err) {
    console.error('[Subscription Middleware Error]:', err.message);
    const limits = getSubscriptionLimits('pro');
    req.subscription = { plan: 'pro', planName: limits.name, limits };
  }
  return next();
};

/**
 * Validates that total GuestHouses/Hotels in tenant database do not exceed the plan limit.
 */
export const checkHotelLimit = async (req, res, next) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const { plan, planName, limits } = req.subscription || { plan: 'basic', limits: getSubscriptionLimits('basic') };

    const currentHotelCount = await GuestHouse.countDocuments();
    if (currentHotelCount >= limits.maxHotels) {
      return res.status(403).json({
        message: `Subscription limit reached: Your ${planName || plan.toUpperCase()} plan allows a maximum of ${limits.maxHotels} hotel(s). Please upgrade your plan.`,
        limitExceeded: true,
        resource: 'hotel',
        current: currentHotelCount,
        max: limits.maxHotels,
      });
    }
  } catch (err) {
    console.error('[Hotel Limit Check Error]:', err.message);
  }
  return next();
};

/**
 * Validates that total Rooms in a specific GuestHouse do not exceed the plan limit.
 */
export const checkRoomLimit = async (req, res, next) => {
  try {
    const { Room, GuestHouse } = req.tenantModels;
    const { plan, planName, limits } = req.subscription || { plan: 'basic', limits: getSubscriptionLimits('basic') };
    const { guestHouseId } = req.body;

    if (guestHouseId) {
      const isObjId = isObjectId(guestHouseId);
      const gh = await GuestHouse.findOne({
        $or: [
          { guestHouseId },
          ...(isObjId ? [{ _id: guestHouseId }] : []),
        ],
      }).lean();

      const targetGhId = gh ? gh.guestHouseId : guestHouseId;
      const currentRoomCount = await Room.countDocuments({ guestHouseId: targetGhId });

      if (currentRoomCount >= limits.maxRoomsPerHotel) {
        return res.status(403).json({
          message: `Subscription limit reached: Your ${planName || plan.toUpperCase()} plan allows a maximum of ${limits.maxRoomsPerHotel} room(s) per hotel. Please upgrade your plan.`,
          limitExceeded: true,
          resource: 'room',
          current: currentRoomCount,
          max: limits.maxRoomsPerHotel,
        });
      }
    }
  } catch (err) {
    console.error('[Room Limit Check Error]:', err.message);
  }
  return next();
};

/**
 * Validates that total ADMIN accounts in tenant database do not exceed the plan limit.
 */
export const checkAdminLimit = async (req, res, next) => {
  try {
    const { User } = req.tenantModels;
    const { plan, planName, limits } = req.subscription || { plan: 'basic', limits: getSubscriptionLimits('basic') };

    const currentAdminCount = await User.countDocuments({ role: 'ADMIN' });
    if (currentAdminCount >= limits.maxAdminsPerHotel) {
      return res.status(403).json({
        message: `Subscription limit reached: Your ${planName || plan.toUpperCase()} plan allows a maximum of ${limits.maxAdminsPerHotel} admin account(s). Please upgrade your plan.`,
        limitExceeded: true,
        resource: 'admin',
        current: currentAdminCount,
        max: limits.maxAdminsPerHotel,
      });
    }
  } catch (err) {
    console.error('[Admin Limit Check Error]:', err.message);
  }
  return next();
};

export default {
  resolveSubscriptionPlan,
  checkHotelLimit,
  checkRoomLimit,
  checkAdminLimit,
};
