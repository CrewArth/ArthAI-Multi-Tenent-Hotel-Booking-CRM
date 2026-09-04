import mongoose from 'mongoose';

const dynamicPricingSchema = new mongoose.Schema({
  guestHouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestHouse',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ruleType: {
    type: String,
    enum: ['weekend', 'weekday', 'holiday', 'custom_date_range'],
    required: true,
  },
  roomType: {
    type: String,
    default: 'all',
    trim: true,
  },
  adjustmentType: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'flat_rate'],
    default: 'percentage',
  },
  adjustmentValue: {
    type: Number,
    required: true,
  },
  applicableDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  }],
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
  },
}, { timestamps: true });

dynamicPricingSchema.index({ guestHouseId: 1, isActive: 1 });
dynamicPricingSchema.index({ guestHouseId: 1, ruleType: 1 });

export default mongoose.model('DynamicPricing', dynamicPricingSchema);
