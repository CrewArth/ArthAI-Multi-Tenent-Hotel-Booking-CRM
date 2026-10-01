import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  guestHouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestHouse', required: true },
  enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'BanquetEnquiry', required: true },
  status: { type: String, enum: ['DRAFT', 'SENT', 'NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED_TO_BOOKING'], default: 'DRAFT' },
  customerName: { type: String, required: true, trim: true },
  eventType: { type: String, required: true, trim: true },
  eventDate: { type: String, required: true },
  expectedGuests: { type: Number, required: true, min: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

schema.index({ guestHouseId: 1, enquiryId: 1 }, { unique: true });

export default schema;
