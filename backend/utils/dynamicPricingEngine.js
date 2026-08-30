/**
 * dynamicPricingEngine.js
 * Calculates night-by-night dynamic rates based on weekend/weekday/holiday rules
 * and the hotel's dynamicRoomPrice configuration flag.
 */

const DAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Normalizes date to midnight UTC/Local for clean day comparison
 */
const normalizeDate = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Calculates dynamic pricing breakdown for a room and date range
 *
 * @param {Object} params
 * @param {Object} params.room - Room document or object ({ price, roomType, discountPercentage })
 * @param {Date|string} params.checkIn - Check-in date
 * @param {Date|string} params.checkOut - Check-out date
 * @param {Array} params.pricingRules - Array of active DynamicPricing rules
 * @param {boolean} params.isDynamicEnabled - Whether dynamicRoomPrice is true for this hotel
 * @returns {Object} { totalBasePrice, totalDynamicPrice, totalFinalPrice, nights, breakdown, isDynamicApplied }
 */
export const calculateDynamicStayPricing = ({
  room,
  checkIn,
  checkOut,
  pricingRules = [],
  isDynamicEnabled = false,
}) => {
  const basePrice = Number(room?.price) || 0;
  const discountPercent = Number(room?.discountPercentage) || 0;
  const roomType = String(room?.roomType || 'standard').toLowerCase();

  const start = normalizeDate(checkIn);
  const end = normalizeDate(checkOut);

  // If check-out is on or before check-in, consider at least 1 night
  const diffTime = end.getTime() - start.getTime();
  const totalNights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  const breakdown = [];
  let totalBasePrice = 0;
  let totalDynamicPrice = 0;

  for (let i = 0; i < totalNights; i++) {
    const currentNight = new Date(start);
    currentNight.setDate(start.getDate() + i);

    const dayOfWeek = DAYS_MAP[currentNight.getDay()];
    const dateStr = currentNight.toISOString().split('T')[0];

    totalBasePrice += basePrice;

    let appliedRule = null;
    let nightPrice = basePrice;

    if (isDynamicEnabled && Array.isArray(pricingRules) && pricingRules.length > 0) {
      // Filter active rules applicable to this room type
      const activeRules = pricingRules.filter((r) => {
        if (!r.isActive) return false;
        const ruleRoomType = String(r.roomType || 'all').toLowerCase();
        return ruleRoomType === 'all' || ruleRoomType === roomType;
      });

      // 1. Check Holiday / Custom Date Range rules first (highest priority)
      const holidayRule = activeRules.find((r) => {
        if (r.ruleType !== 'holiday' && r.ruleType !== 'custom_date_range') return false;
        if (!r.startDate || !r.endDate) return false;
        const s = normalizeDate(r.startDate);
        const e = normalizeDate(r.endDate);
        return currentNight >= s && currentNight <= e;
      });

      // 2. Check Weekend rules (Fri, Sat, Sun or custom applicableDays)
      const weekendRule = !holidayRule
        ? activeRules.find((r) => {
            if (r.ruleType !== 'weekend') return false;
            const days = Array.isArray(r.applicableDays) && r.applicableDays.length > 0
              ? r.applicableDays.map((d) => d.toLowerCase())
              : ['friday', 'saturday', 'sunday'];
            return days.includes(dayOfWeek);
          })
        : null;

      // 3. Check Weekday rules (Mon-Thu or custom applicableDays)
      const weekdayRule = !holidayRule && !weekendRule
        ? activeRules.find((r) => {
            if (r.ruleType !== 'weekday') return false;
            const days = Array.isArray(r.applicableDays) && r.applicableDays.length > 0
              ? r.applicableDays.map((d) => d.toLowerCase())
              : ['monday', 'tuesday', 'wednesday', 'thursday'];
            return days.includes(dayOfWeek);
          })
        : null;

      appliedRule = holidayRule || weekendRule || weekdayRule;

      if (appliedRule) {
        const val = Number(appliedRule.adjustmentValue) || 0;
        if (appliedRule.adjustmentType === 'percentage') {
          nightPrice = Math.max(0, basePrice * (1 + val / 100));
        } else if (appliedRule.adjustmentType === 'fixed_amount') {
          nightPrice = Math.max(0, basePrice + val);
        } else if (appliedRule.adjustmentType === 'flat_rate') {
          nightPrice = Math.max(0, val);
        }
      }
    }

    totalDynamicPrice += nightPrice;

    breakdown.push({
      nightIndex: i + 1,
      date: dateStr,
      dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
      basePrice,
      dynamicPrice: Math.round(nightPrice * 100) / 100,
      ruleApplied: appliedRule
        ? {
            name: appliedRule.name,
            ruleType: appliedRule.ruleType,
            adjustmentType: appliedRule.adjustmentType,
            adjustmentValue: appliedRule.adjustmentValue,
          }
        : null,
    });
  }

  // Calculate discount after dynamic pricing
  const totalAfterDiscount = discountPercent > 0
    ? totalDynamicPrice - (totalDynamicPrice * discountPercent) / 100
    : totalDynamicPrice;

  return {
    totalNights,
    basePricePerNight: basePrice,
    totalBasePrice: Math.round(totalBasePrice * 100) / 100,
    totalDynamicPrice: Math.round(totalDynamicPrice * 100) / 100,
    discountPercentage: discountPercent,
    totalFinalPrice: Math.round(totalAfterDiscount * 100) / 100,
    averageNightlyRate: Math.round((totalDynamicPrice / totalNights) * 100) / 100,
    isDynamicApplied: isDynamicEnabled && totalDynamicPrice !== totalBasePrice,
    breakdown,
  };
};

export default {
  calculateDynamicStayPricing,
};
