import mongoose from 'mongoose';
import { resolveBanquetHotel } from '../utils/banquetHotel.js';

const POLICIES = new Set(['IN_HOUSE_ONLY', 'OUTSIDE_ALLOWED', 'APPROVED_VENDORS_ONLY']);
const DJ_POLICIES = new Set(['IN_HOUSE_ONLY', 'OUTSIDE_ALLOWED', 'NOT_ALLOWED']);
const STATUSES = new Set(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE']);
const isClock = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const nonNegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const uniqueLabels = (values) => new Set(values.map((value) => value.trim().toLowerCase())).size === values.length;
const validLabels = (values) => Array.isArray(values) && values.every((value) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 80) && uniqueLabels(values);

export const validateHall = (body) => {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!name || name.length > 120 || !code || !/^[A-Z0-9_-]{2,24}$/.test(code)) return 'Enter a hall name and a 2–24 character hall code.';
  if (typeof body.description !== 'string' || body.description.length > 1000) return 'Description must be under 1,000 characters.';
  if (!STATUSES.has(body.status)) return 'Select a valid hall status.';
  if (!Array.isArray(body.capacities) || body.capacities.length === 0 ||
    !validLabels(body.capacities.map((entry) => entry?.layout)) ||
    body.capacities.some((entry) => !Number.isInteger(entry?.guests) || entry.guests < 1)) return 'Add at least one unique layout with a positive guest capacity.';
  if (!validLabels(body.amenities) || !validLabels(body.allowedEventTypes) || body.allowedEventTypes.length === 0) return 'Enter unique amenities and at least one allowed event type.';
  if (!isClock(body.availableFrom) || !isClock(body.availableUntil) || minutes(body.availableFrom) >= minutes(body.availableUntil)) return 'Operating hours must have a valid start before end.';
  if (!Number.isInteger(body.minimumBookingDuration) || body.minimumBookingDuration < 15 || body.minimumBookingDuration > minutes(body.availableUntil) - minutes(body.availableFrom)) return 'Minimum duration must fit within operating hours.';
  if (![15, 30, 60].includes(body.timeIncrement)) return 'Select a valid time increment.';
  if (![body.setupBufferMinutes, body.cleanupBufferMinutes].every((value) => Number.isInteger(value) && value >= 0 && value <= 1440)) return 'Setup and cleanup buffers must be valid minutes.';
  if (!nonNegative(body.baseHallRent) || !Number.isInteger(body.minimumGuaranteedPax) || body.minimumGuaranteedPax < 0) return 'Rent and minimum guaranteed guests cannot be negative.';
  if (!POLICIES.has(body.cateringPolicy) || !POLICIES.has(body.decorationPolicy) || !DJ_POLICIES.has(body.djPolicy)) return 'Select valid hall policies.';
  return null;
};

const hallFields = (body) => ({
  name: body.name.trim(), code: body.code.trim().toUpperCase(), description: body.description.trim(), status: body.status,
  capacities: body.capacities.map(({ layout, guests }) => ({ layout: layout.trim(), guests })),
  amenities: body.amenities.map((value) => value.trim()),
  allowedEventTypes: body.allowedEventTypes.map((value) => value.trim()),
  availableFrom: body.availableFrom, availableUntil: body.availableUntil,
  minimumBookingDuration: body.minimumBookingDuration, timeIncrement: body.timeIncrement,
  setupBufferMinutes: body.setupBufferMinutes, cleanupBufferMinutes: body.cleanupBufferMinutes,
  baseHallRent: body.baseHallRent, minimumGuaranteedPax: body.minimumGuaranteedPax,
  cateringPolicy: body.cateringPolicy, decorationPolicy: body.decorationPolicy, djPolicy: body.djPolicy,
});

const handleError = (res, error) => {
  if (error.code === 11000) return res.status(409).json({ message: 'Hall code already exists for this hotel.' });
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  console.error('Banquet hall error:', error);
  return res.status(500).json({ message: 'Unable to save banquet hall.' });
};

export const listHalls = async (req, res) => {
  try {
    const { hotel, status, message } = await resolveBanquetHotel(req, req.query.guestHouseId);
    if (!hotel) return res.status(status).json({ message });
    const halls = await req.tenantModels.BanquetHall.find({ guestHouseId: hotel._id }).sort({ name: 1 }).lean();
    return res.json({ halls });
  } catch (error) { return handleError(res, error); }
};

export const createHall = async (req, res) => {
  try {
    const { hotel, status, message } = await resolveBanquetHotel(req, req.body?.guestHouseId);
    if (!hotel) return res.status(status).json({ message });
    const validationError = validateHall(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const hall = await req.tenantModels.BanquetHall.create({ ...hallFields(req.body), guestHouseId: hotel._id, createdBy: req.user._id, updatedBy: req.user._id });
    return res.status(201).json({ hall });
  } catch (error) { return handleError(res, error); }
};

export const updateHall = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hall ID.' });
    const { hotel, status, message } = await resolveBanquetHotel(req, req.body?.guestHouseId);
    if (!hotel) return res.status(status).json({ message });
    const validationError = validateHall(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const hall = await req.tenantModels.BanquetHall.findOneAndUpdate(
      { _id: req.params.id, guestHouseId: hotel._id },
      { $set: { ...hallFields(req.body), updatedBy: req.user._id } },
      { new: true, runValidators: true },
    );
    if (!hall) return res.status(404).json({ message: 'Hall not found for this hotel.' });
    return res.json({ hall });
  } catch (error) { return handleError(res, error); }
};

export const setHallStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !STATUSES.has(req.body?.status)) return res.status(400).json({ message: 'Invalid hall or status.' });
    const { hotel, status, message } = await resolveBanquetHotel(req, req.body?.guestHouseId);
    if (!hotel) return res.status(status).json({ message });
    const hall = await req.tenantModels.BanquetHall.findOneAndUpdate(
      { _id: req.params.id, guestHouseId: hotel._id },
      { $set: { status: req.body.status, updatedBy: req.user._id } },
      { new: true, runValidators: true },
    );
    if (!hall) return res.status(404).json({ message: 'Hall not found for this hotel.' });
    return res.json({ hall });
  } catch (error) { return handleError(res, error); }
};
