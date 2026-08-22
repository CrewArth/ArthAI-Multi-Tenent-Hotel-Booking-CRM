import guestHouseSchema from './GuestHouse.js';
import roomSchema from './Room.js';
import bedSchema from './Bed.js';
import bookingSchema from './Booking.js';
import userSchema from './User.js';
import taxSchema from './Tax.js';
import paymentSchema from './Payment.js';
import invoiceSchema from './Invoice.js';
import auditLogSchema from './AuditLog.js';
import counterSchema from './Counter.js';

export default function initTenantModels(conn) {
  if (!conn.models.GuestHouse) conn.model('GuestHouse', guestHouseSchema);
  if (!conn.models.Room)       conn.model('Room', roomSchema);
  if (!conn.models.Bed)        conn.model('Bed', bedSchema);
  if (!conn.models.Booking)    conn.model('Booking', bookingSchema);
  if (!conn.models.User)       conn.model('User', userSchema);
  if (!conn.models.Tax)        conn.model('Tax', taxSchema);
  if (!conn.models.Payment)    conn.model('Payment', paymentSchema);
  if (!conn.models.Invoice)    conn.model('Invoice', invoiceSchema);
  if (!conn.models.AuditLog)   conn.model('AuditLog', auditLogSchema);
  if (!conn.models.Counter)    conn.model('Counter', counterSchema);
}
