/**
 * Seed Script: Creates 20 guest Users + 45 Bookings across June–July 2026
 * with realistic patterns (repeat guests, multiple guest houses, varied stays).
 *
 * Run: node backend/scripts/seedBookings.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌  MONGO_URI not found'); process.exit(1); }

await mongoose.connect(MONGO_URI);
console.log('✅  Connected to MongoDB');

const db = mongoose.connection.db;

// ── Fetch real IDs from DB ──────────────────────────────────────────────────
const guestHouses = await db.collection('guesthouses').find({}).toArray();
const rooms       = await db.collection('rooms').find({ isActive: true }).toArray();

const gh = (id) => guestHouses.find((g) => g.guestHouseId === id || String(g._id) === id);

const GH002 = gh('GH002');
const GH003 = gh('GH003');
const GH004 = gh('GH004');
const GH005 = gh('GH005');

const roomsOf = (ghDoc) => rooms.filter((r) => r.guestHouseId === ghDoc.guestHouseId || String(r.guestHouseId) === String(ghDoc._id));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const date = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const addDays = (dt, n) => new Date(dt.getTime() + n * 86400000);

// ── Guest profiles (20 users, some will recur) ─────────────────────────────
const GUESTS = [
  { firstName: 'Rahul',     lastName: 'Sharma',     email: 'rahul.sharma@gmail.com',     phone: '+919876501001', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1001' },
  { firstName: 'Priya',     lastName: 'Patel',      email: 'priya.patel@yopmail.com',     phone: '+919876501002', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1002' },
  { firstName: 'Amit',      lastName: 'Verma',      email: 'amit.verma@hotmail.com',      phone: '+919876501003', nationality: 'Indian',   identityType: 'PAN',     identityNumber: 'PAN-1003'  },
  { firstName: 'Sneha',     lastName: 'Kulkarni',   email: 'sneha.kulkarni@gmail.com',    phone: '+919876501004', nationality: 'Indian',   identityType: 'Passport',identityNumber: 'PASS-1004' },
  { firstName: 'Vikram',    lastName: 'Singh',      email: 'vikram.singh@yopmail.com',    phone: '+919876501005', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1005' },
  { firstName: 'Ananya',    lastName: 'Mehta',      email: 'ananya.mehta@gmail.com',      phone: '+919876501006', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1006' },
  { firstName: 'Rohan',     lastName: 'Desai',      email: 'rohan.desai@gmail.com',       phone: '+919876501007', nationality: 'Indian',   identityType: 'PAN',     identityNumber: 'PAN-1007'  },
  { firstName: 'Kavya',     lastName: 'Nair',       email: 'kavya.nair@yopmail.com',      phone: '+919876501008', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1008' },
  { firstName: 'Arjun',     lastName: 'Reddy',      email: 'arjun.reddy@gmail.com',       phone: '+919876501009', nationality: 'Indian',   identityType: 'Passport',identityNumber: 'PASS-1009' },
  { firstName: 'Meera',     lastName: 'Iyer',       email: 'meera.iyer@gmail.com',        phone: '+919876501010', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1010' },
  { firstName: 'Suresh',    lastName: 'Gupta',      email: 'suresh.gupta@hotmail.com',    phone: '+919876501011', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1011' },
  { firstName: 'Divya',     lastName: 'Joshi',      email: 'divya.joshi@gmail.com',       phone: '+919876501012', nationality: 'Indian',   identityType: 'PAN',     identityNumber: 'PAN-1012'  },
  { firstName: 'Karan',     lastName: 'Malhotra',   email: 'karan.malhotra@yopmail.com',  phone: '+919876501013', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1013' },
  { firstName: 'Pooja',     lastName: 'Saxena',     email: 'pooja.saxena@gmail.com',      phone: '+919876501014', nationality: 'Indian',   identityType: 'Passport',identityNumber: 'PASS-1014' },
  { firstName: 'Nikhil',    lastName: 'Bhatt',      email: 'nikhil.bhatt@gmail.com',      phone: '+919876501015', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1015' },
  { firstName: 'Isha',      lastName: 'Kapoor',     email: 'isha.kapoor@yopmail.com',     phone: '+919876501016', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1016' },
  { firstName: 'Deepak',    lastName: 'Tiwari',     email: 'deepak.tiwari@gmail.com',     phone: '+919876501017', nationality: 'Indian',   identityType: 'PAN',     identityNumber: 'PAN-1017'  },
  { firstName: 'Nisha',     lastName: 'Chauhan',    email: 'nisha.chauhan@hotmail.com',   phone: '+919876501018', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1018' },
  { firstName: 'Rohit',     lastName: 'Agarwal',    email: 'rohit.agarwal@gmail.com',     phone: '+919876501019', nationality: 'Indian',   identityType: 'Passport',identityNumber: 'PASS-1019' },
  { firstName: 'Sanya',     lastName: 'Bose',       email: 'sanya.bose@yopmail.com',      phone: '+919876501020', nationality: 'Indian',   identityType: 'Aadhaar', identityNumber: 'AADH-1020' },
];

// ── Upsert users ───────────────────────────────────────────────────────────
const userIds = [];
for (const g of GUESTS) {
  const existing = await db.collection('users').findOne({ email: g.email });
  if (existing) {
    userIds.push(existing._id);
    console.log(`  👤 Reusing user: ${g.email}`);
    continue;
  }
  const res = await db.collection('users').insertOne({
    ...g,
    role: 'USER',
    address: '123 Seed Street, Mumbai, India',
    dateOfBirth: new Date(Date.UTC(1990, 0, 1)),
    gender: pick(['male', 'female']),
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+919000000000',
    isActive: true,
    password: null,
    bookingIds: [],
    totalBookings: 0,
    lastBookingAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  userIds.push(res.insertedId);
  console.log(`  👤 Created user: ${g.email}`);
}

// ── Booking template: [guestHouseDoc, checkIn, checkOut, nights, status] ──
// Repeat guests: indices 0,2,5,8,11 appear multiple times
const BOOKING_PLANS = [
  // June bookings
  { gIdx: 0,  gh: GH002, checkIn: date(2026,6,1),  nights: 3, status: 'approved' },
  { gIdx: 1,  gh: GH003, checkIn: date(2026,6,2),  nights: 2, status: 'approved' },
  { gIdx: 2,  gh: GH002, checkIn: date(2026,6,3),  nights: 4, status: 'approved' },
  { gIdx: 3,  gh: GH004, checkIn: date(2026,6,4),  nights: 1, status: 'approved' },
  { gIdx: 4,  gh: GH005, checkIn: date(2026,6,5),  nights: 3, status: 'approved' },
  { gIdx: 5,  gh: GH002, checkIn: date(2026,6,7),  nights: 2, status: 'approved' },
  { gIdx: 6,  gh: GH003, checkIn: date(2026,6,8),  nights: 5, status: 'approved' },
  { gIdx: 7,  gh: GH004, checkIn: date(2026,6,9),  nights: 2, status: 'approved' },
  { gIdx: 8,  gh: GH002, checkIn: date(2026,6,10), nights: 3, status: 'approved' },
  { gIdx: 9,  gh: GH005, checkIn: date(2026,6,11), nights: 2, status: 'approved' },
  { gIdx: 10, gh: GH003, checkIn: date(2026,6,12), nights: 4, status: 'approved' },
  { gIdx: 11, gh: GH002, checkIn: date(2026,6,13), nights: 1, status: 'approved' },
  { gIdx: 12, gh: GH004, checkIn: date(2026,6,14), nights: 3, status: 'cancelled' },
  { gIdx: 13, gh: GH005, checkIn: date(2026,6,15), nights: 2, status: 'approved' },
  { gIdx: 0,  gh: GH003, checkIn: date(2026,6,16), nights: 4, status: 'approved' }, // repeat
  { gIdx: 14, gh: GH002, checkIn: date(2026,6,17), nights: 2, status: 'approved' },
  { gIdx: 15, gh: GH004, checkIn: date(2026,6,18), nights: 3, status: 'approved' },
  { gIdx: 2,  gh: GH005, checkIn: date(2026,6,19), nights: 2, status: 'approved' }, // repeat
  { gIdx: 16, gh: GH003, checkIn: date(2026,6,20), nights: 1, status: 'approved' },
  { gIdx: 17, gh: GH002, checkIn: date(2026,6,21), nights: 5, status: 'approved' },
  { gIdx: 5,  gh: GH004, checkIn: date(2026,6,22), nights: 2, status: 'approved' }, // repeat
  { gIdx: 18, gh: GH005, checkIn: date(2026,6,23), nights: 3, status: 'cancelled' },
  { gIdx: 19, gh: GH003, checkIn: date(2026,6,24), nights: 2, status: 'approved' },
  // July bookings
  { gIdx: 0,  gh: GH004, checkIn: date(2026,7,1),  nights: 3, status: 'approved' }, // repeat
  { gIdx: 8,  gh: GH003, checkIn: date(2026,7,2),  nights: 2, status: 'approved' }, // repeat
  { gIdx: 1,  gh: GH002, checkIn: date(2026,7,3),  nights: 4, status: 'approved' },
  { gIdx: 3,  gh: GH005, checkIn: date(2026,7,4),  nights: 1, status: 'approved' },
  { gIdx: 11, gh: GH002, checkIn: date(2026,7,5),  nights: 3, status: 'approved' }, // repeat
  { gIdx: 4,  gh: GH003, checkIn: date(2026,7,6),  nights: 2, status: 'approved' },
  { gIdx: 6,  gh: GH004, checkIn: date(2026,7,7),  nights: 5, status: 'approved' },
  { gIdx: 7,  gh: GH005, checkIn: date(2026,7,8),  nights: 2, status: 'cancelled' },
  { gIdx: 9,  gh: GH002, checkIn: date(2026,7,9),  nights: 3, status: 'approved' },
  { gIdx: 10, gh: GH003, checkIn: date(2026,7,10), nights: 2, status: 'approved' },
  { gIdx: 12, gh: GH004, checkIn: date(2026,7,11), nights: 4, status: 'approved' },
  { gIdx: 2,  gh: GH002, checkIn: date(2026,7,12), nights: 2, status: 'approved' }, // repeat
  { gIdx: 13, gh: GH005, checkIn: date(2026,7,13), nights: 3, status: 'approved' },
  { gIdx: 5,  gh: GH003, checkIn: date(2026,7,14), nights: 1, status: 'approved' }, // repeat
  { gIdx: 14, gh: GH002, checkIn: date(2026,7,15), nights: 2, status: 'approved' },
  { gIdx: 15, gh: GH004, checkIn: date(2026,7,16), nights: 4, status: 'approved' },
  { gIdx: 16, gh: GH005, checkIn: date(2026,7,17), nights: 2, status: 'approved' },
  { gIdx: 17, gh: GH003, checkIn: date(2026,7,18), nights: 3, status: 'approved' },
  { gIdx: 18, gh: GH002, checkIn: date(2026,7,19), nights: 1, status: 'approved' },
  { gIdx: 19, gh: GH004, checkIn: date(2026,7,20), nights: 5, status: 'approved' },
  { gIdx: 8,  gh: GH005, checkIn: date(2026,7,21), nights: 2, status: 'approved' }, // repeat
  { gIdx: 11, gh: GH003, checkIn: date(2026,7,22), nights: 3, status: 'approved' }, // repeat
  { gIdx: 0,  gh: GH002, checkIn: date(2026,7,24), nights: 2, status: 'approved' }, // repeat
];

// ── Insert bookings ────────────────────────────────────────────────────────
let created = 0;
for (const plan of BOOKING_PLANS) {
  if (!plan.gh) { console.warn('  ⚠️  Guest house not found, skipping'); continue; }

  const ghRooms = roomsOf(plan.gh);
  if (ghRooms.length === 0) { console.warn(`  ⚠️  No rooms for ${plan.gh.guestHouseName}, skipping`); continue; }

  const room     = pick(ghRooms);
  const userId   = userIds[plan.gIdx];
  const checkOut = addDays(plan.checkIn, plan.nights);

  const booking = {
    userId,
    guestHouseId: plan.gh._id,
    roomIds:      [room._id],
    bedId:        null,
    checkIn:      plan.checkIn,
    checkOut,
    status:       plan.status,
    bookingSource:'admin',
    isCheckedOut: false,
    specialRequests: '',
    familyMembers: [],
    verificationImage: null,
    createdAt: plan.checkIn,
    updatedAt: plan.checkIn,
    createdBy: null,
  };

  await db.collection('bookings').insertOne(booking);
  created++;
  console.log(`  📅 Booking ${created}: ${GUESTS[plan.gIdx].firstName} @ ${plan.gh.guestHouseName} | ${plan.checkIn.toISOString().split('T')[0]} → ${checkOut.toISOString().split('T')[0]} [${plan.status}]`);

  // Link booking to user
  await db.collection('users').updateOne(
    { _id: userId },
    {
      $push: { bookingIds: booking._id },
      $inc:  { totalBookings: 1 },
      $set:  { lastBookingAt: plan.checkIn },
    }
  );
}

console.log(`\n✅  Seeded ${created} bookings across 20 guests (June–July 2026)`);
console.log(`   Repeat guests: Rahul (3x), Amit (3x), Ananya (3x), Arjun (3x), Suresh (3x), Karan (3x)`);
await mongoose.disconnect();
process.exit(0);
