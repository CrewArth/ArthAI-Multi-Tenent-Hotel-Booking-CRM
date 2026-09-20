import mongoose from 'mongoose';

const issuedItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const itemIssueSchema = new mongoose.Schema({
  guestHouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestHouse', required: true },
  items: { type: [issuedItemSchema], required: true, validate: [(items) => items.length > 0, 'At least one item is required'] },
  type: { type: String, enum: ['REQUEST_APPROVAL', 'DIRECT_ISSUE'], required: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemRequest' },
  note: { type: String, trim: true, default: '' },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'item_issue' });

itemIssueSchema.index({ guestHouseId: 1, createdAt: -1 });
itemIssueSchema.index({ requestId: 1 }, { sparse: true });

export default itemIssueSchema;
