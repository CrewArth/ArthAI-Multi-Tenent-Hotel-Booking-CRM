import mongoose from 'mongoose';

const taxSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  percentage: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

taxSchema.index({ name: 1 }, { unique: true, sparse: true });

export default taxSchema;
