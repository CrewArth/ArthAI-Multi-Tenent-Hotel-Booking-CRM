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
  expiryDate: {
    type: Date,
    default: null,
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
    s3: {
      key: { type: String, default: null },
      secretKey: { type: String, default: null },
      bucket_name: { type: String, default: null },
      region: { type: String, default: null },
    },
  },
  credentials: {
    superAdminEmail: { type: String },
    adminEmail: { type: String },
    superAdminPassword: { type: String },
    adminPassword: { type: String },
  },
  personalDetails: {
    fullName: { type: String },
    signature: { type: String },
    phone1: { type: String },
    phone2: { type: String },
    email1: { type: String },
    email2: { type: String },
    legalDocNumber: { type: String },
    residentialAddress: { type: String },
    businessAddress: { type: String },
    govtIdProof: { type: String },
  },
  hotelDetails: {
    legalPropertyName: { type: String },
    hotelName: { type: String },
    propertyType: { 
      type: String, 
      enum: ['Guest House', 'Hotel', 'Palace', 'Stay House'],
      default: 'Hotel'
    },
    hotelLogo: { type: String },
  },
  legalCompliance: {
    gstCertificate: { type: String },
    panCardPhoto: { type: String },
    shopLicencePhoto: { type: String },
    fireSafetyNoc: { type: String },
  },
}, { timestamps: true });

export default tenantSchema;
