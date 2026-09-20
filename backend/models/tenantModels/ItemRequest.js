import mongoose from 'mongoose';

const requestedItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const itemRequestSchema = new mongoose.Schema({
  guestHouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestHouse', required: true },
  items: { type: [requestedItemSchema], required: true, validate: [(items) => items.length > 0, 'At least one item is required'] },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'CANCELLED'], default: 'PENDING' },
  note: { type: String, trim: true, default: '' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  declineReason: { type: String, trim: true, default: '' },
}, { timestamps: true, collection: 'item_request' });

itemRequestSchema.index({ guestHouseId: 1, status: 1, createdAt: -1 });
itemRequestSchema.index({ status: 1, createdAt: -1 });

export default itemRequestSchema;
