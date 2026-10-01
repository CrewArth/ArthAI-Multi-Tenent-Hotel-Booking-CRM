import mongoose from 'mongoose';

const banquetOccupancySchema = new mongoose.Schema({
  guestHouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestHouse', required: true },
  hallId: { type: mongoose.Schema.Types.ObjectId, ref: 'BanquetHall', required: true },
  eventName: { type: String, required: true, trim: true, maxlength: 120 },
  eventType: { type: String, default: '', trim: true },
  layout: { type: String, default: '', trim: true },
  expectedGuests: { type: Number, default: null, min: 1 },
  eventDate: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  effectiveStartAt: { type: Date, required: true },
  effectiveEndAt: { type: Date, required: true },
  setupBufferMinutes: { type: Number, required: true },
  cleanupBufferMinutes: { type: Number, required: true },
  status: { type: String, enum: ['HOLD', 'CONFIRMED', 'BLOCKED', 'CANCELLED'], required: true },
  holdUntil: { type: Date, default: null },
  notes: { type: String, default: '', trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

banquetOccupancySchema.index({ guestHouseId: 1, hallId: 1, effectiveStartAt: 1, effectiveEndAt: 1 });
banquetOccupancySchema.index({ guestHouseId: 1, eventDate: 1, status: 1 });

export default banquetOccupancySchema;
