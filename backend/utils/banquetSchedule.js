const DAY_MS = 24 * 60 * 60 * 1000;
const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const parseEventDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
};

export const clockMinutes = (value) => CLOCK_PATTERN.test(value || '')
  ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
  : null;

export const buildWindow = (hall, input) => {
  const date = parseEventDate(input.eventDate);
  const start = clockMinutes(input.startTime);
  const end = clockMinutes(input.endTime);
  if (!date || start === null || end === null || start >= end) return { reason: 'Enter a valid date and a start time before the end time.' };
  const opening = clockMinutes(hall.availableFrom);
  const closing = clockMinutes(hall.availableUntil);
  if (opening === null || closing === null || start < opening || end > closing) return { reason: 'The requested time is outside this hall’s operating hours.' };
  if (start % hall.timeIncrement !== 0 || end % hall.timeIncrement !== 0) return { reason: `Times must follow ${hall.timeIncrement}-minute increments.` };
  if (end - start < hall.minimumBookingDuration) return { reason: `Minimum booking duration is ${hall.minimumBookingDuration} minutes.` };
  if (input.eventType && (typeof input.eventType !== 'string' || !hall.allowedEventTypes.some((type) => type.toLowerCase() === input.eventType.trim().toLowerCase()))) return { reason: 'This hall does not support the selected event type.' };
  if (input.expectedGuests !== undefined && input.expectedGuests !== null && input.expectedGuests !== '') {
    const guests = Number(input.expectedGuests);
    if (!Number.isInteger(guests) || guests < 1) return { reason: 'Enter a valid guest count.' };
    if (typeof input.layout !== 'string' || !input.layout.trim()) return { reason: 'Select a layout for the guest count.' };
    const capacity = hall.capacities.find((entry) => entry.layout.toLowerCase() === input.layout.trim().toLowerCase());
    if (!capacity || guests > capacity.guests) return { reason: 'The selected layout cannot accommodate this guest count.' };
  }
  const base = date.valueOf();
  return {
    startAt: new Date(base + start * 60000),
    endAt: new Date(base + end * 60000),
    effectiveStartAt: new Date(base + (start - hall.setupBufferMinutes) * 60000),
    effectiveEndAt: new Date(base + (end + hall.cleanupBufferMinutes) * 60000),
  };
};

export const overlappingQuery = (hallId, window, now = new Date(), excludeId) => ({
  hallId,
  effectiveStartAt: { $lt: window.effectiveEndAt },
  effectiveEndAt: { $gt: window.effectiveStartAt },
  $or: [
    { status: { $in: ['CONFIRMED', 'BLOCKED'] } },
    { status: 'HOLD', holdUntil: { $gt: now } },
  ],
  ...(excludeId ? { _id: { $ne: excludeId } } : {}),
});

export const rangeBounds = (startDate, endDate) => {
  const start = parseEventDate(startDate);
  const end = parseEventDate(endDate);
  if (!start || !end || end < start || end.valueOf() - start.valueOf() > 62 * DAY_MS) return null;
  return { start, endExclusive: new Date(end.valueOf() + DAY_MS) };
};
