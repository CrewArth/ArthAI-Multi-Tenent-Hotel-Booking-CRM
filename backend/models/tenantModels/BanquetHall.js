import mongoose from 'mongoose';

const banquetHallSchema = new mongoose.Schema({
  guestHouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestHouse', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'], default: 'ACTIVE' },
  capacities: [{ layout: { type: String, required: true, trim: true }, guests: { type: Number, required: true, min: 1 } }],
  amenities: [{ type: String, trim: true }],
  allowedEventTypes: [{ type: String, trim: true }],
  availableFrom: { type: String, required: true },
  availableUntil: { type: String, required: true },
  minimumBookingDuration: { type: Number, required: true, min: 15 },
  timeIncrement: { type: Number, enum: [15, 30, 60], required: true },
  setupBufferMinutes: { type: Number, required: true, min: 0 },
  cleanupBufferMinutes: { type: Number, required: true, min: 0 },
  baseHallRent: { type: Number, required: true, min: 0 },
  minimumGuaranteedPax: { type: Number, required: true, min: 0 },
  cateringPolicy: { type: String, enum: ['IN_HOUSE_ONLY', 'OUTSIDE_ALLOWED', 'APPROVED_VENDORS_ONLY'], required: true },
  decorationPolicy: { type: String, enum: ['IN_HOUSE_ONLY', 'OUTSIDE_ALLOWED', 'APPROVED_VENDORS_ONLY'], required: true },
  djPolicy: { type: String, enum: ['IN_HOUSE_ONLY', 'OUTSIDE_ALLOWED', 'NOT_ALLOWED'], required: true },
  scheduleVersion: { type: Number, default: 0, select: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

banquetHallSchema.index({ guestHouseId: 1, code: 1 }, { unique: true });
banquetHallSchema.index({ guestHouseId: 1, status: 1 });

export default banquetHallSchema;
