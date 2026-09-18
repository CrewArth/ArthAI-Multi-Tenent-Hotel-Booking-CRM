import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  planName: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  maxHotels: { type: Number, required: true, min: 1 },
  maxRooms: { type: Number, required: true, min: 1 },
  maxAdmins: { type: Number, required: true, min: 1 },
  isSystem: { type: Boolean, default: false },
}, { timestamps: true, collection: 'packages' });

export default packageSchema;
