import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },

  bedNumber: {
    type: Number,
    required: true, 
  },

  bedType: {
    type: String,
    required: true,
    trim: true,
  },

  isAvailable: {
    type: Boolean,
    default: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ roomId: 1, isActive: 1 });
bedSchema.index({ roomId: 1, isAvailable: 1, isActive: 1 });

export default bedSchema;
