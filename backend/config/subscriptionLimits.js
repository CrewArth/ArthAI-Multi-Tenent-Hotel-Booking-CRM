/**
 * Subscription Plan Resource Limits Configuration
 * Single source of truth for Basic, Pro, and Enterprise subscription tiers.
 */

export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    maxHotels: 1,
    maxRoomsPerHotel: 10,
    maxAdminsPerHotel: 1,
  },
  pro: {
    name: 'Pro',
    maxHotels: 3,
    maxRoomsPerHotel: 20,
    maxAdminsPerHotel: 3,
  },
  enterprise: {
    name: 'Enterprise',
    maxHotels: 5,
    maxRoomsPerHotel: 50,
    maxAdminsPerHotel: 5,
  },
};

/**
 * Returns resource limits for a given subscription plan name.
 * @param {string} planName - "basic", "pro", or "enterprise"
 */
export const getSubscriptionLimits = (planName = 'basic') => {
  const normalized = String(planName || 'basic').toLowerCase().trim();
  return SUBSCRIPTION_PLANS[normalized] || SUBSCRIPTION_PLANS.basic;
};

export default {
  SUBSCRIPTION_PLANS,
  getSubscriptionLimits,
};
