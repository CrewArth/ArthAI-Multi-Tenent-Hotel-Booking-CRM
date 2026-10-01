import mongoose from 'mongoose';
import { resolveBanquetHotel } from '../utils/banquetHotel.js';
import { clockMinutes, parseEventDate } from '../utils/banquetSchedule.js';
import { ENQUIRY_STATUSES, LEAD_SOURCES, LOST_REASONS } from '../models/tenantModels/BanquetEnquiry.js';

const FINAL_STATUSES = new Set(['CONFIRMED', 'LOST', 'CANCELLED', 'NOT_RESPONDING']);
const STATUS_ORDER = ENQUIRY_STATUSES.filter((status) => !FINAL_STATUSES.has(status));
const QUOTATION_STATUSES = new Set(['QUOTATION_SENT', 'NEGOTIATION', 'CONFIRMED']);
const GUEST_FIELDS = ['vegGuests', 'nonVegGuests', 'jainGuests', 'noOnionNoGarlicGuests'];
const textField = (value, max) => typeof value === 'string' && value.trim().length <= max;

export const validateEnquiry = (body) => {
  if (!textField(body?.customerName, 120) || !body.customerName.trim()) return 'Enter a customer name (up to 120 characters).';
  if (typeof body.mobileNo !== 'string' || !/^\+?[0-9\s-]{7,20}$/.test(body.mobileNo.trim())) return 'Enter a valid mobile number.';
  if (!textField(body.email ?? '', 254) || (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))) return 'Enter a valid email address.';
  if (!textField(body.companyName ?? '', 120) || !textField(body.budgetRange ?? '', 100) || !textField(body.requirements ?? '', 2000) || !textField(body.notes ?? '', 2000)) return 'One or more text fields exceed their allowed length.';
  if (!textField(body.eventType, 80) || !body.eventType.trim()) return 'Enter an event type.';
  if (!parseEventDate(body.eventDate)) return 'Select a valid event date.';
  const start = clockMinutes(body.preferredStartTime);
  const end = clockMinutes(body.preferredEndTime);
  if (start === null || end === null || start >= end) return 'Select a start time before the end time.';
  if (!Number.isInteger(body.expectedGuests) || body.expectedGuests < 1) return 'Expected guests must be a positive whole number.';
  if (GUEST_FIELDS.some((field) => !Number.isInteger(body[field] ?? 0) || (body[field] ?? 0) < 0)) return 'Guest counts must be non-negative whole numbers.';
  if (GUEST_FIELDS.reduce((sum, field) => sum + (body[field] ?? 0), 0) > body.expectedGuests) return 'Guest category counts cannot exceed expected guests.';
  if (!LEAD_SOURCES.includes(body.leadSource)) return 'Select a valid lead source.';
  if (body.assignedTo && !mongoose.isValidObjectId(body.assignedTo)) return 'Select a valid assignee.';
  return null;
};

export const canTransitionEnquiry = (from, to) => {
  if (!ENQUIRY_STATUSES.includes(to) || FINAL_STATUSES.has(from) || from === to) return false;
  if (to === 'CONFIRMED') return ['QUOTATION_SENT', 'NEGOTIATION'].includes(from);
  if (FINAL_STATUSES.has(to)) return true;
  return STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(from);
};

const nextStatuses = (current, hasQuotation) => ENQUIRY_STATUSES.filter((status) => canTransitionEnquiry(current, status) && (hasQuotation || !QUOTATION_STATUSES.has(status)));

export const getEnquiryOptions = (_req, res) => res.json({ statuses: ENQUIRY_STATUSES, leadSources: LEAD_SOURCES, lostReasons: LOST_REASONS });

const fields = (body) => ({
  customerName: body.customerName.trim(), mobileNo: body.mobileNo.trim(),
  email: (body.email || '').trim().toLowerCase(), companyName: (body.companyName || '').trim(),
  eventType: body.eventType.trim(), eventDate: body.eventDate,
  preferredStartTime: body.preferredStartTime, preferredEndTime: body.preferredEndTime,
  expectedGuests: body.expectedGuests,
  ...Object.fromEntries(GUEST_FIELDS.map((field) => [field, body[field] ?? 0])),
  budgetRange: (body.budgetRange || '').trim(), leadSource: body.leadSource,
  requirements: (body.requirements || '').trim(), notes: (body.notes || '').trim(),
  assignedTo: body.assignedTo || null,
});

const sendError = (res, error) => {
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  if (error.code === 11000) return res.status(409).json({ message: 'Enquiry number already exists.' });
  console.error('Banquet enquiry error:', error);
  return res.status(500).json({ message: 'Unable to process banquet enquiry.' });
};

const scopedHotel = async (req, res, value) => {
  const result = await resolveBanquetHotel(req, value);
  if (!result.hotel) res.status(result.status).json({ message: result.message });
  return result.hotel;
};

const validAssignee = async (req, hotel, id) => {
  if (!id) return true;
  const assigned = await req.tenantModels.User.findOne({
    _id: id, role: { $in: ['ADMIN', 'HOTEL_ADMIN'] }, isActive: true,
    assignedGuestHouseId: { $in: [String(hotel._id), hotel.guestHouseId].filter(Boolean) },
  }).select('_id').lean();
  return Boolean(assigned);
};

export const listEnquiries = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.query?.guestHouseId);
    if (!hotel) return;
    const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query?.limit, 10) || 20));
    const filter = { guestHouseId: hotel._id };
    if (req.query?.status && ENQUIRY_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const search = String(req.query?.search || '').trim().slice(0, 100);
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ customerName: { $regex: safe, $options: 'i' } }, { mobileNo: { $regex: safe, $options: 'i' } }, { enquiryNo: { $regex: safe, $options: 'i' } }];
    }
    const [enquiries, total] = await Promise.all([
      req.tenantModels.BanquetEnquiry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      req.tenantModels.BanquetEnquiry.countDocuments(filter),
    ]);
    const quotations = enquiries.length ? await req.tenantModels.BanquetQuotation.find({ guestHouseId: hotel._id, enquiryId: { $in: enquiries.map((enquiry) => enquiry._id) } }).select('_id enquiryId status').lean() : [];
    const quoteByEnquiry = new Map(quotations.map((quote) => [String(quote.enquiryId), quote]));
    return res.json({ enquiries: enquiries.map((enquiry) => {
      const quotation = quoteByEnquiry.get(String(enquiry._id)) || null;
      return { ...enquiry, quotation, nextStatuses: nextStatuses(enquiry.status, Boolean(quotation)) };
    }), total, page, limit });
  } catch (error) { return sendError(res, error); }
};

export const listEnquiryAssignees = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.query?.guestHouseId);
    if (!hotel) return;
    const users = await req.tenantModels.User.find({
      role: { $in: ['ADMIN', 'HOTEL_ADMIN'] }, isActive: true,
      assignedGuestHouseId: { $in: [String(hotel._id), hotel.guestHouseId].filter(Boolean) },
    }).select('_id firstName lastName email').sort({ firstName: 1 }).lean();
    return res.json({ users });
  } catch (error) { return sendError(res, error); }
};

export const createEnquiry = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.body?.guestHouseId);
    if (!hotel) return;
    const error = validateEnquiry(req.body);
    if (error) return res.status(400).json({ message: error });
    if (!await validAssignee(req, hotel, req.body.assignedTo)) return res.status(400).json({ message: 'Assignee must belong to this hotel.' });
    const year = new Date().getUTCFullYear();
    const counter = await req.tenantModels.Counter.findOneAndUpdate(
      { _id: `banquet-enquiry:${hotel._id}:${year}` }, { $inc: { seq: 1 } }, { upsert: true, new: true },
    );
    const enquiryNo = `BE-${year}-${String(counter.seq).padStart(6, '0')}`;
    const enquiry = await req.tenantModels.BanquetEnquiry.create({
      ...fields(req.body), guestHouseId: hotel._id, enquiryNo,
      createdBy: req.user._id, updatedBy: req.user._id,
    });
    return res.status(201).json({ enquiry });
  } catch (error) { return sendError(res, error); }
};

export const updateEnquiry = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.body?.guestHouseId);
    if (!hotel) return;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry ID.' });
    const error = validateEnquiry(req.body);
    if (error) return res.status(400).json({ message: error });
    if (!await validAssignee(req, hotel, req.body.assignedTo)) return res.status(400).json({ message: 'Assignee must belong to this hotel.' });
    const enquiry = await req.tenantModels.BanquetEnquiry.findOneAndUpdate(
      { _id: req.params.id, guestHouseId: hotel._id },
      { $set: { ...fields(req.body), updatedBy: req.user._id } },
      { new: true, runValidators: true },
    );
    return enquiry ? res.json({ enquiry }) : res.status(404).json({ message: 'Enquiry not found.' });
  } catch (error) { return sendError(res, error); }
};

export const updateEnquiryStatus = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.body?.guestHouseId);
    if (!hotel) return;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry ID.' });
    const current = await req.tenantModels.BanquetEnquiry.findOne({ _id: req.params.id, guestHouseId: hotel._id }).lean();
    if (!current) return res.status(404).json({ message: 'Enquiry not found.' });
    const next = req.body?.status;
    if (!canTransitionEnquiry(current.status, next)) return res.status(400).json({ message: 'Invalid enquiry status transition.' });
    if (QUOTATION_STATUSES.has(next)) {
      const quotation = await req.tenantModels.BanquetQuotation.findOne({ guestHouseId: hotel._id, enquiryId: current._id }).select('_id').lean();
      if (!quotation) return res.status(409).json({ message: 'Create a quotation draft before advancing this enquiry.' });
    }
    const lostReason = next === 'LOST' ? req.body?.lostReason : null;
    if (next === 'LOST' && !LOST_REASONS.includes(lostReason)) return res.status(400).json({ message: 'Select a reason for the lost enquiry.' });
    const enquiry = await req.tenantModels.BanquetEnquiry.findOneAndUpdate(
      { _id: current._id, guestHouseId: hotel._id, status: current.status },
      { $set: { status: next, lostReason, updatedBy: req.user._id } },
      { new: true, runValidators: true },
    );
    return enquiry ? res.json({ enquiry }) : res.status(409).json({ message: 'Enquiry status changed. Refresh and try again.' });
  } catch (error) { return sendError(res, error); }
};

export const convertEnquiryToQuotation = async (req, res) => {
  try {
    const hotel = await scopedHotel(req, res, req.body?.guestHouseId);
    if (!hotel) return;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry ID.' });
    const enquiry = await req.tenantModels.BanquetEnquiry.findOne({ _id: req.params.id, guestHouseId: hotel._id }).lean();
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' });
    if (FINAL_STATUSES.has(enquiry.status)) return res.status(409).json({ message: 'Closed enquiries cannot be converted.' });
    const filter = { guestHouseId: hotel._id, enquiryId: enquiry._id };
    let quotation;
    try {
      quotation = await req.tenantModels.BanquetQuotation.findOneAndUpdate(
        filter,
        { $setOnInsert: {
          ...filter, status: 'DRAFT', customerName: enquiry.customerName,
          eventType: enquiry.eventType, eventDate: enquiry.eventDate,
          expectedGuests: enquiry.expectedGuests, createdBy: req.user._id, updatedBy: req.user._id,
        } },
        { upsert: true, new: true, runValidators: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      quotation = await req.tenantModels.BanquetQuotation.findOne(filter);
      if (!quotation) throw error;
    }
    return res.json({ quotation });
  } catch (error) { return sendError(res, error); }
};
