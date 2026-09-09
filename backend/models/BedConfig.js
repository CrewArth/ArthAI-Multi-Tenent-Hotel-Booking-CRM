import mongoose from 'mongoose';

const bedConfigSchema = new mongoose.Schema({
  bedType: {
    type: String,
    required: true,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

bedConfigSchema.index({ bedType: 1 }, { unique: true });

export default mongoose.model('BedConfig', bedConfigSchema);
