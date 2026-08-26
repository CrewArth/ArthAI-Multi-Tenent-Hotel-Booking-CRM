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
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'pro',
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  config: {
    s3: {
      key: { type: String, default: null },
      secretKey: { type: String, default: null },
      bucket_name: { type: String, default: null },
      region: { type: String, default: null },
    },
    siteName: { type: String, default: null },
    logoUrl: { type: String, default: null },
    primaryColor: { type: String, default: null },
    customDomain: { type: String, default: null },
    whatsapp_enabled: { type: Boolean, default: true },
  },
}, { timestamps: true });

export default tenantSchema;
