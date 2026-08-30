import mongoose from 'mongoose';

const configurationSchema = new mongoose.Schema({
  guestHouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestHouse',
    default: null,
  },
  sendEmail: {
    type: Boolean,
    default: true,
  },
  sendWhatsapp: {
    type: Boolean,
    default: false,
  },
  extraSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

configurationSchema.index({ guestHouseId: 1 });

export default configurationSchema;
