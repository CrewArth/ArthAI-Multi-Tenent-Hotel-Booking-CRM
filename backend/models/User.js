import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { normalizeRole } from '../utils/roles.js';

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true,
        minlength: 2,
        default: null,
    },

    lastName: {
        type: String,
        trim: true,
        default: null,
    },

    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,   // allows multiple null values while keeping uniqueness for non-null
        unique: true,
        default: null,
    },

    phone: {
        type: String,   // changed from Number to String to support +91 prefix and formatting
        trim: true,
        sparse: true,
        unique: true,
        default: null,
    },

    address: {
        type: String,
        default: null,
    },

    role: {
        type: String,
        enum: ["ADMIN", "SUPER_ADMIN", "HOTEL_ADMIN", "USER"],
        default: "ADMIN",
        set: (value) => normalizeRole(value),
    },

    password: {
        type: String,
        minlength: 6,
        default: null,
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    // ── Admin-only fields ──────────────────────────────────────
    assignedGuestHouseId: {
        type: String,
        default: null,
    },
    allowedWidgets: {
        type: [String],
        default: null,
    },
    allowedReports: {
        type: [String],
        default: null,
    },
    eSignatureUrl: {
        type: String,
        default: null,
    },
    passwordResetToken: {
        type: String,
        select: false,
    },
    passwordResetExpires: {
        type: Date,
        select: false,
    },

    // ── Guest (USER role) fields ───────────────────────────────
    dateOfBirth: {
        type: Date,
        default: null,
    },
    gender: {
        type: String,
        enum: ["male", "female", "other", "prefer_not_to_say", null],
        default: null,
    },
    nationality: {
        type: String,
        trim: true,
        default: null,
    },
    identityType: {
        type: String,
        default: null,
    },
    identityNumber: {
        type: String,
        trim: true,
        default: null,
    },
    emergencyContactName: {
        type: String,
        trim: true,
        default: null,
    },
    emergencyContactPhone: {
        type: String,
        trim: true,
        default: null,
    },
    // Guest house where the user first registered/booked (set only once on create)
    registeredGuestHouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GuestHouse",
        default: null,
    },
    // References to all bookings made by this guest
    bookingIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
        },
    ],
    totalBookings: {
        type: Number,
        default: 0,
    },
    lastBookingAt: {
        type: Date,
        default: null,
    },
},
{ timestamps: true });


userSchema.pre('save', async function(next){
    // Only hash password if it is changed or new, and only if a password exists
    if (!this.isModified('password') || !this.password) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Index for fast login lookup by email
userSchema.index({ email: 1 });
// Index for role-based admin queries
userSchema.index({ role: 1, isActive: 1 });


export default mongoose.model("User", userSchema);