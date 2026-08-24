import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    guestHouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuestHouse",
      required: true,
    },
    roomIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    }],
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    verificationImage: { type: String },
    familyMembers: [
      {
        name: { type: String, trim: true },
        relation: { type: String, trim: true },
        age: { type: Number, min: 0 },
        verificationImage: { type: String },
      },
    ],
    bookingSource: {
      type: String,
      enum: ["self", "admin"],
      default: "self",
    },
    specialRequests: { type: String },
    isCheckedOut: { type: Boolean, default: false },
  },
  { timestamps: true },
);

bookingSchema.index({ bedId: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ guestHouseId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, checkIn: 1 });
bookingSchema.index({ createdAt: -1 });

export default bookingSchema;
