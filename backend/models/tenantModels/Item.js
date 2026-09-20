import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  unit: { type: String, trim: true, default: 'piece' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'items' });

itemSchema.index({ name: 1 }, { unique: true });

export default itemSchema;
