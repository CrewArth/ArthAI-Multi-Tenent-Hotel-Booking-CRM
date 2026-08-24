import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  amountPaid: { type: Number, required: true },
  paymentMethod: { type: String },
  taxesTotal: { type: Number, default: 0 },
  taxBreakdown: [{ name: String, percentage: Number, amount: Number }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  outstanding_payment: { type: Boolean, default: false },
}, { timestamps: true });

export default paymentSchema;
