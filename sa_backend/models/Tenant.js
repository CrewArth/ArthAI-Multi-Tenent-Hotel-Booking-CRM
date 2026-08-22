import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  dbName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    default: 'pro',
  },
  owner: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  config: {
    s3BucketName: { type: String, default: null },
    s3Region: { type: String, default: null },
    siteName: { type: String, default: null },
    logoUrl: { type: String, default: null },
  },
  credentials: {
    superAdminEmail: { type: String },
    adminEmail: { type: String },
  },
}, { timestamps: true });

export default tenantSchema;
