import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'GUESTHOUSE_CREATED', 'GUESTHOUSE_UPDATED', 'GUESTHOUSE_DELETED',
        'MAINTENANCE_TOGGLED',
        'ROOM_CREATED', 'ROOM_UPDATED', 'ROOM_DELETED', 'ROOM_AVAILABILITY_TOGGLED',
        'BED_CREATED', 'BED_UPDATED', 'BED_DELETED', 'BED_AVAILABILITY_TOGGLED',
        'BOOKING_CREATED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'USER_REGISTERED',
        'ADMIN_BOOKING_CREATED', 'ADMIN_BOOKING_UPDATED', 'BOOKING_CANCELLED', 'BOOKING_STATUS_UPDATED',
        'USER_UPDATED', 'USER_DELETED', 'USER_DEACTIVATED', 'USER_ACTIVATED',
        'GUESTHOUSE_ASSIGNED', 'GUESTHOUSE_UNASSIGNED', 'USER_WIDGETS_UPDATED',
        'REPORT_GENERATED',
      ]
    },

    entityType: {
      type: String,
      required: true,
      enum: ['Booking', 'GuestHouse', 'Room', 'Bed', 'User', 'Report']
    },

    entityId: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    performedBy: {
      type: String,
      default: 'System'
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

export default auditLogSchema;
