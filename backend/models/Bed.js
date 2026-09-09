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
    default: true, // soft delete functionality
  },
}, { timestamps: true });

// Unique constraint: No two beds in the same room should have the same bed number
bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });
// Fetching all beds for a room (used in booking flow)
bedSchema.index({ roomId: 1, isActive: 1 });
// Availability check during booking
bedSchema.index({ roomId: 1, isAvailable: 1, isActive: 1 });

export default mongoose.model("Bed", bedSchema);
