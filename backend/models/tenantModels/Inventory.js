import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  // null identifies the SuperAdmin's central stock; a value identifies hotel stock.
  guestHouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestHouse', default: null },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'inventories' });

inventorySchema.index({ itemId: 1, guestHouseId: 1 }, { unique: true });
inventorySchema.index({ guestHouseId: 1, quantity: 1 });

export default inventorySchema;
