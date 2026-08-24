// models/Booking.js
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
      enum: ["self_service", "admin"],
      default: "self_service",
    },
    specialRequests: { type: String },
    isCheckedOut: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes for performance optimization
// Compound index for overlap checking query (bedId + status + date range)
bookingSchema.index({ bedId: 1, status: 1, checkIn: 1, checkOut: 1 });
// Index for user bookings lookup
bookingSchema.index({ userId: 1, createdAt: -1 });
// Index for guest house bookings
bookingSchema.index({ guestHouseId: 1, createdAt: -1 });
// Index for status-based queries (approve/reject/calendar)
bookingSchema.index({ status: 1, checkIn: 1 });
// Index for date range queries used in dashboard metrics
bookingSchema.index({ createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
