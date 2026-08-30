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
      enum: ["pending", "approved", "confirmed", "checked-in", "checked-out", "cancelled", "rejected"],
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
    guests: [
      {
        role: {
          type: String,
          enum: ["PRIMARY", "FAMILY_MEMBER"],
          default: "PRIMARY",
          required: true,
        },
        name: { type: String, required: true, trim: true },
        relation: { type: String, trim: true },
        age: { type: Number, min: 0 },
        document: {
          label: { type: String, trim: true },
          url: { type: String },
          uploadedVia: { type: String, enum: ["manual", "qr"], default: "manual" },
          uploadedAt: { type: Date },
        },
      },
    ],
    captureSession: {
      sessionId: { type: String },
      active: { type: Boolean, default: false },
      issuedAt: { type: Date },
      expiresAt: { type: Date },
      issuedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        email: { type: String },
        name: { type: String },
      },
    },
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
