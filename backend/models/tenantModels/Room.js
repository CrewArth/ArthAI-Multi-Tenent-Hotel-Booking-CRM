import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    guestHouseId: { type: String, ref: "GuestHouse", required: true },

    roomNumber: { type: Number },
    
    roomType: { type: String, required: true, trim: true, default: 'Standard' },
    
    isAvailable: { type: Boolean, default: true },
    
    roomCapacity: { type: Number, required: true },

    price: { type: Number, required: false },

    discountPercentage: { type: Number, required: false, default: 0, min: 0, max: 100 },

    isActive: { type: Boolean, default: true },
}, { timestamps: true });

roomSchema.index({ guestHouseId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ guestHouseId: 1, isActive: 1 });
roomSchema.index({ guestHouseId: 1, isAvailable: 1, isActive: 1 });

export default roomSchema;
