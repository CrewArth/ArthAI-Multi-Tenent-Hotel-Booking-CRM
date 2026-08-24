/**
 * Seed Script: Creates Payments + Invoices for the seeded bookings.
 *
 * Scenarios:
 *   - FULL_PAID   (~25 bookings): isCheckedOut=true, outstandingBalance=0
 *   - PARTIAL     (~8 bookings) : isCheckedOut=true, outstandingBalance>0 (outstanding payment owed)
 *   - NO_PAYMENT  (rest)        : approved, isCheckedOut=false, no invoice
 *
 * Run AFTER seedBookings.js:
 *   node backend/scripts/seedPayments.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
console.log('✅  Connected to MongoDB');

const db = mongoose.connection.db;

// ── Helpers ─────────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const METHODS = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer'];

const nightlyRate = (room) => {
  const price = room?.price || 1500;
  const disc  = room?.discountPercentage || 0;
  return Math.round(price - (price * disc) / 100);
};

const nights = (checkIn, checkOut) => {
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(1, Math.ceil(diff / 86400000));
};

const GST_PCT   = 18;
const buildInvoice = ({ bookingId, bookingDoc, roomDoc, userDoc, amountPaid, outstandingBalance, method, paidAt }) => {
  const n            = nights(bookingDoc.checkIn, bookingDoc.checkOut);
  const roomCharges  = nightlyRate(roomDoc) * n;
  const extrasTotal  = 0;
  const taxBase      = roomCharges + extrasTotal;
  const gstAmt       = Math.round(taxBase * GST_PCT / 100);
  const taxBreakdown = [{ name: 'GST', percentage: GST_PCT, amount: gstAmt }];
  const taxesTotal   = gstAmt;
  const bookingTotal = roomCharges + extrasTotal + taxesTotal;
  const guestName    = `${userDoc?.firstName || ''} ${userDoc?.lastName || ''}`.trim() || 'Guest';

  return {
    id: `INV-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    bookingId: String(bookingId),
    guestName,
    bookingDate: bookingDoc.checkIn,
    amountPaid,
    extrasTotal,
    taxesTotal,
    taxBreakdown,
    bookingTotal,
    outstandingBalance,
    paymentMethod: method,
    createdAt: paidAt.toISOString(),
    bookingDetails: bookingDoc,
    roomCharges,
  };
};

// ── Fetch seeded bookings (only the ones from our seed script — June/July 2026) ──
const start = new Date('2026-06-01T00:00:00Z');
const end   = new Date('2026-08-01T00:00:00Z');

const bookings = await db.collection('bookings').find({
  checkIn: { $gte: start, $lt: end },
  status:  'approved',
  isCheckedOut: false,
}).sort({ checkIn: 1 }).toArray();

console.log(`📋  Found ${bookings.length} approved, un-checked-out bookings`);

if (bookings.length === 0) {
  console.log('No bookings to process. Run seedBookings.js first.');
  await mongoose.disconnect();
  process.exit(0);
}

// ── Fetch rooms for price lookup ─────────────────────────────────────────────
const allRooms = await db.collection('rooms').find({}).toArray();
const roomMap  = {};
allRooms.forEach((r) => { roomMap[String(r._id)] = r; });

// ── Fetch users ───────────────────────────────────────────────────────────────
const allUsers = await db.collection('users').find({}).toArray();
const userMap  = {};
allUsers.forEach((u) => { userMap[String(u._id)] = u; });

// ── Assign scenarios ──────────────────────────────────────────────────────────
// Shuffle for random assignment
const shuffled = [...bookings].sort(() => Math.random() - 0.5);

const FULL_PAID_COUNT    = Math.floor(bookings.length * 0.55);  // ~55% fully paid
const PARTIAL_COUNT      = Math.floor(bookings.length * 0.20);  // ~20% partial

const fullPaid   = shuffled.slice(0, FULL_PAID_COUNT);
const partial    = shuffled.slice(FULL_PAID_COUNT, FULL_PAID_COUNT + PARTIAL_COUNT);
// rest stay approved with no payment

let paymentCount = 0, invoiceCount = 0;

// ── Process FULL_PAID bookings ────────────────────────────────────────────────
for (const b of fullPaid) {
  const room    = roomMap[String(b.roomIds?.[0])];
  const user    = userMap[String(b.userId)];
  const n       = nights(b.checkIn, b.checkOut);
  const rate    = nightlyRate(room);
  const charges = rate * n;
  const tax     = Math.round(charges * GST_PCT / 100);
  const total   = charges + tax;
  const method  = pick(METHODS);
  const paidAt  = new Date(new Date(b.checkOut).getTime() + 3600000); // 1hr after checkout

  const invData = buildInvoice({
    bookingId: b._id, bookingDoc: b, roomDoc: room, userDoc: user,
    amountPaid: total, outstandingBalance: 0, method, paidAt,
  });

  // Insert Payment
  const payRes = await db.collection('payments').insertOne({
    bookingId:    b._id,
    amountPaid:   total,
    paymentMethod:method,
    taxesTotal:   invData.taxesTotal,
    taxBreakdown: invData.taxBreakdown,
    createdBy:    null,
    createdAt:    paidAt,
    updatedAt:    paidAt,
  });

  // Insert Invoice
  const invRes = await db.collection('invoices').insertOne({
    bookingId:    b._id,
    paymentId:    payRes.insertedId,
    invoiceData:  invData,
    amountPaid:   total,
    taxesTotal:   invData.taxesTotal,
    taxBreakdown: invData.taxBreakdown,
    createdBy:    null,
    createdAt:    paidAt,
    updatedAt:    paidAt,
  });

  // Link payment → invoice
  await db.collection('payments').updateOne(
    { _id: payRes.insertedId },
    { $set: { invoiceId: invRes.insertedId } }
  );

  // Mark booking checked out
  await db.collection('bookings').updateOne(
    { _id: b._id },
    { $set: { isCheckedOut: true, updatedAt: paidAt } }
  );

  const gName = `${user?.firstName || '?'} ${user?.lastName || ''}`.trim();
  console.log(`  ✅ FULL  | ${gName.padEnd(20)} | ₹${total.toLocaleString('en-IN').padStart(8)} | ${method}`);
  paymentCount++;
  invoiceCount++;
}

// ── Process PARTIAL bookings ──────────────────────────────────────────────────
for (const b of partial) {
  const room      = roomMap[String(b.roomIds?.[0])];
  const user      = userMap[String(b.userId)];
  const n         = nights(b.checkIn, b.checkOut);
  const rate      = nightlyRate(room);
  const charges   = rate * n;
  const tax       = Math.round(charges * GST_PCT / 100);
  const total     = charges + tax;
  const method    = pick(METHODS);
  const paidAt    = new Date(new Date(b.checkOut).getTime() + 3600000);

  // Partial: pay 60–80% of total
  const pctPaid   = 0.6 + Math.random() * 0.2;
  const amountPaid= Math.round(total * pctPaid);
  const outstanding = total - amountPaid;

  const invData = buildInvoice({
    bookingId: b._id, bookingDoc: b, roomDoc: room, userDoc: user,
    amountPaid, outstandingBalance: outstanding, method, paidAt,
  });

  const payRes = await db.collection('payments').insertOne({
    bookingId:    b._id,
    amountPaid,
    paymentMethod:method,
    taxesTotal:   invData.taxesTotal,
    taxBreakdown: invData.taxBreakdown,
    createdBy:    null,
    createdAt:    paidAt,
    updatedAt:    paidAt,
  });

  const invRes = await db.collection('invoices').insertOne({
    bookingId:    b._id,
    paymentId:    payRes.insertedId,
    invoiceData:  invData,
    amountPaid,
    taxesTotal:   invData.taxesTotal,
    taxBreakdown: invData.taxBreakdown,
    createdBy:    null,
    createdAt:    paidAt,
    updatedAt:    paidAt,
  });

  await db.collection('payments').updateOne(
    { _id: payRes.insertedId },
    { $set: { invoiceId: invRes.insertedId } }
  );

  await db.collection('bookings').updateOne(
    { _id: b._id },
    { $set: { isCheckedOut: true, updatedAt: paidAt } }
  );

  const gName = `${user?.firstName || '?'} ${user?.lastName || ''}`.trim();
  console.log(`  ⚠️  PART  | ${gName.padEnd(20)} | Paid ₹${amountPaid.toLocaleString('en-IN').padStart(7)} / ₹${total.toLocaleString('en-IN').padStart(7)} | Due ₹${outstanding.toLocaleString('en-IN')}`);
  paymentCount++;
  invoiceCount++;
}

const noPayment = bookings.length - fullPaid.length - partial.length;
console.log(`\n✅  Done`);
console.log(`   Fully paid   : ${fullPaid.length} bookings`);
console.log(`   Partial paid : ${partial.length} bookings (outstanding balance)`);
console.log(`   No payment   : ${noPayment} bookings (approved, awaiting checkout)`);
console.log(`   Payments     : ${paymentCount}`);
console.log(`   Invoices     : ${invoiceCount}`);

await mongoose.disconnect();
process.exit(0);
