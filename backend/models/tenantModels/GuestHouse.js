import mongoose from 'mongoose';

const guestHouseSchema = new mongoose.Schema({
  guestHouseId: { type: String, unique: true, required: true },

  guestHouseName: { type: String, required: true, unique: true },

  location: {
    city: { type: String, required: true },
    state: { type: String, required: true }
  },

  image: { type: String },
  
  description: { type: String },

  maintenance: { type: Boolean, default: false }
}, { timestamps: true });

guestHouseSchema.index({ maintenance: 1 });

export default guestHouseSchema;
