import mongoose from 'mongoose';

export const ENQUIRY_STATUSES = [
  'NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_DONE',
  'QUOTATION_SENT', 'NEGOTIATION', 'CONFIRMED', 'LOST', 'CANCELLED', 'NOT_RESPONDING',
];

export const LEAD_SOURCES = [
  'Walk-in', 'Phone', 'WhatsApp', 'Website', 'Google', 'Instagram',
  'Wedding Portal', 'Reference', 'Corporate', 'Repeat Customer', 'Other',
];

export const LOST_REASONS = [
  'Price too high', 'Date not available', 'Capacity issue',
  'Customer chose another venue', 'Customer postponed event', 'No response', 'Other',
];

const schema = new mongoose.Schema({
  guestHouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestHouse', required: true },
  enquiryNo: { type: String, required: true },
  customerName: { type: String, required: true, trim: true, maxlength: 120 },
  mobileNo: { type: String, required: true, trim: true, maxlength: 20 },
  email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
  companyName: { type: String, default: '', trim: true, maxlength: 120 },
  eventType: { type: String, required: true, trim: true, maxlength: 80 },
  eventDate: { type: String, required: true },
  preferredStartTime: { type: String, required: true },
  preferredEndTime: { type: String, required: true },
  expectedGuests: { type: Number, required: true, min: 1 },
  vegGuests: { type: Number, default: 0, min: 0 },
  nonVegGuests: { type: Number, default: 0, min: 0 },
  jainGuests: { type: Number, default: 0, min: 0 },
  noOnionNoGarlicGuests: { type: Number, default: 0, min: 0 },
  budgetRange: { type: String, default: '', trim: true, maxlength: 100 },
  leadSource: { type: String, enum: LEAD_SOURCES, required: true },
  requirements: { type: String, default: '', trim: true, maxlength: 2000 },
  notes: { type: String, default: '', trim: true, maxlength: 2000 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ENQUIRY_STATUSES, default: 'NEW' },
  lostReason: { type: String, enum: LOST_REASONS, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

schema.index({ guestHouseId: 1, enquiryNo: 1 }, { unique: true });
schema.index({ guestHouseId: 1, status: 1, createdAt: -1 });
schema.index({ guestHouseId: 1, eventDate: 1 });
schema.index({ guestHouseId: 1, mobileNo: 1 });

export default schema;
