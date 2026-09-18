import mongoose from 'mongoose';

const centralUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  tenantId: { type: String, required: true, trim: true },
  dbName: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

centralUserSchema.index({ dbName: 1, userId: 1 }, { unique: true });
centralUserSchema.index({ tenantId: 1, isActive: 1 });

export default centralUserSchema;
