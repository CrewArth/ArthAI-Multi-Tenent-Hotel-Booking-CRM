import mongoose from 'mongoose';
import { resolveBanquetHotel } from '../utils/banquetHotel.js';
import { buildWindow, overlappingQuery, rangeBounds } from '../utils/banquetSchedule.js';

class CalendarError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const sendError = (res, error) => {
  if (error instanceof CalendarError) return res.status(error.status).json({ message: error.message });
  console.error('Banquet calendar error:', error);
  return res.status(500).json({ message: 'Unable to process banquet calendar request.' });
};

const scopedHotel = async (req, res, value) => {
  const result = await resolveBanquetHotel(req, value);
  if (!result.hotel) res.status(result.status).json({ message: result.message });
  return result.hotel;
};

const validateOccupancy = (body) => {
  if (!mongoose.isValidObjectId(body?.hallId)) throw new CalendarError(400, 'Select a hall.');
  if (typeof body.eventName !== 'string' || !body.eventName.trim() || body.eventName.length > 120) throw new CalendarError(400, 'Enter an event name (up to 120 characters).');
  if (!['HOLD', 'CONFIRMED', 'BLOCKED'].includes(body.status)) throw new CalendarError(400, 'Select hold, confirmed, or blocked status.');
  if (body.status !== 'BLOCKED' && (typeof body.eventType !== 'string' || !body.eventType.trim())) throw new CalendarError(400, 'Select an event type for this reservation.');
  if (body.notes && (typeof body.notes !== 'string' || body.notes.length > 1000)) throw new CalendarError(400, 'Notes must be under 1,000 characters.');
  if (body.status === 'HOLD') {
    const holdUntil = new Date(body.holdUntil);
    if (!body.holdUntil || Number.isNaN(holdUntil.valueOf()) || holdUntil <= new Date()) throw new CalendarError(400, 'Select a future hold expiry.');
    return holdUntil;
  }
  return null;
};

const occupancyFields = (body, window, hall, holdUntil) => ({
  eventName: body.eventName.trim(), eventType: typeof body.eventType === 'string' ? body.eventType.trim() : '',
  layout: typeof body.layout === 'string' ? body.layout.trim() : '',
  expectedGuests: body.expectedGuests === '' || body.expectedGuests == null ? null : Number(body.expectedGuests),
  eventDate: body.eventDate, startTime: body.startTime, endTime: body.endTime,
  effectiveStartAt: window.effectiveStartAt, effectiveEndAt: window.effectiveEndAt,
  setupBufferMinutes: hall.setupBufferMinutes, cleanupBufferMinutes: hall.cleanupBufferMinutes,
  status: body.status, holdUntil, notes: typeof body.notes === 'string' ? body.notes.trim() : '',
});

const activeFilter = (now = new Date()) => ({ $or: [
  { status: { $in: ['CONFIRMED', 'BLOCKED'] } },
  { status: 'HOLD', holdUntil: { $gt: now } },
] });

export const checkAvailability = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.body?.guestHouseId);
    if (!hotel) return;
    const halls = await req.tenantModels.BanquetHall.find({ guestHouseId: hotel._id }).sort({ name: 1 }).lean();
    const requestedHallId = req.body?.hallId;
    if (requestedHallId && !halls.some((hall) => String(hall._id) === String(requestedHallId))) return res.status(404).json({ message: 'Hall not found for this hotel.' });
    const selected = requestedHallId ? halls.filter((hall) => String(hall._id) === String(requestedHallId)) : halls;
    const results = await Promise.all(selected.map(async (hall) => {
      if (hall.status !== 'ACTIVE') return { hallId: hall._id, name: hall.name, available: false, reason: 'Hall is not active.' };
      const window = buildWindow(hall, req.body || {});
      if (window.reason) return { hallId: hall._id, name: hall.name, available: false, reason: window.reason };
      const conflicts = await req.tenantModels.BanquetOccupancy.find({ guestHouseId: hotel._id, ...overlappingQuery(hall._id, window) })
        .select('eventName eventDate startTime endTime status setupBufferMinutes cleanupBufferMinutes')
        .sort({ effectiveStartAt: 1 }).lean();
      return {
        hallId: hall._id, name: hall.name, available: conflicts.length === 0,
        reason: conflicts.length ? 'This hall has an existing reservation.' : null,
        conflicts: conflicts.map(({ eventName, eventDate, startTime, endTime, status, setupBufferMinutes, cleanupBufferMinutes }) => ({
          eventName, eventDate, startTime, endTime, status, setupBufferMinutes, cleanupBufferMinutes,
        })),
      };
    }));
    return res.json({ results });
  } catch (error) { return sendError(res, error); }
};

export const getCalendar = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.query?.guestHouseId);
    if (!hotel) return;
    const range = rangeBounds(req.query?.startDate, req.query?.endDate);
    if (!range) return res.status(400).json({ message: 'Select a valid date range of up to 63 days.' });
    const hallFilter = { guestHouseId: hotel._id };
    if (req.query?.hallId) {
      if (!mongoose.isValidObjectId(req.query.hallId)) return res.status(400).json({ message: 'Invalid hall ID.' });
      hallFilter._id = req.query.hallId;
    }
    const halls = await req.tenantModels.BanquetHall.find(hallFilter).sort({ name: 1 }).lean();
    if (req.query?.hallId && !halls.length) return res.status(404).json({ message: 'Hall not found for this hotel.' });
    const occupancies = await req.tenantModels.BanquetOccupancy.find({
      guestHouseId: hotel._id,
      hallId: { $in: halls.map((hall) => hall._id) },
      effectiveStartAt: { $lt: range.endExclusive },
      effectiveEndAt: { $gt: range.start },
      ...activeFilter(),
    }).sort({ effectiveStartAt: 1 }).lean();
    return res.json({ halls, occupancies });
  } catch (error) { return sendError(res, error); }
};

const saveOccupancy = async (req, res, isUpdate) => {
  try {
    const hotel = await scopedHotel(req, res, req.body?.guestHouseId);
    if (!hotel) return;
    if (isUpdate && !mongoose.isValidObjectId(req.params.id)) throw new CalendarError(400, 'Invalid reservation ID.');
    const holdUntil = validateOccupancy(req.body);
    const session = await req.tenantDb.startSession();
    let saved;
    try {
      await session.withTransaction(async () => {
        // A write to the hall document serializes competing reservations for this hall.
        const hall = await req.tenantModels.BanquetHall.findOneAndUpdate(
          { _id: req.body.hallId, guestHouseId: hotel._id, status: 'ACTIVE' },
          { $inc: { scheduleVersion: 1 } },
          { new: true, session },
        );
        if (!hall) throw new CalendarError(409, 'This hall is unavailable. Refresh its configuration.');
        const window = buildWindow(hall, req.body);
        if (window.reason) throw new CalendarError(400, window.reason);
        let existing = null;
        if (isUpdate) {
          existing = await req.tenantModels.BanquetOccupancy.findOne({ _id: req.params.id, guestHouseId: hotel._id, hallId: hall._id, status: { $ne: 'CANCELLED' } }).session(session);
          if (!existing) throw new CalendarError(404, 'Reservation not found for this hall.');
        }
        const conflict = await req.tenantModels.BanquetOccupancy.findOne({ guestHouseId: hotel._id, ...overlappingQuery(hall._id, window, new Date(), existing?._id) }).session(session).lean();
        if (conflict) throw new CalendarError(409, 'This time conflicts with another reservation or its setup/cleanup buffer.');
        const fields = occupancyFields(req.body, window, hall, holdUntil);
        if (existing) {
          existing.set({ ...fields, updatedBy: req.user._id });
          saved = await existing.save({ session });
        } else {
          [saved] = await req.tenantModels.BanquetOccupancy.create([{
            ...fields, guestHouseId: hotel._id, hallId: hall._id, createdBy: req.user._id, updatedBy: req.user._id,
          }], { session });
        }
      });
    } finally { await session.endSession(); }
    return res.status(isUpdate ? 200 : 201).json({ occupancy: saved });
  } catch (error) { return sendError(res, error); }
};

export const createOccupancy = (req, res) => saveOccupancy(req, res, false);
export const updateOccupancy = (req, res) => saveOccupancy(req, res, true);

export const releaseOccupancy = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.body?.guestHouseId);
    if (!hotel) return;
    if (!mongoose.isValidObjectId(req.params.id)) throw new CalendarError(400, 'Invalid reservation ID.');
    const occupancy = await req.tenantModels.BanquetOccupancy.findOneAndUpdate(
      { _id: req.params.id, guestHouseId: hotel._id, status: { $in: ['HOLD', 'BLOCKED'] } },
      { $set: { status: 'CANCELLED', updatedBy: req.user._id } },
      { new: true },
    );
    if (!occupancy) throw new CalendarError(404, 'Active hold or block not found.');
    return res.json({ occupancy });
  } catch (error) { return sendError(res, error); }
};
