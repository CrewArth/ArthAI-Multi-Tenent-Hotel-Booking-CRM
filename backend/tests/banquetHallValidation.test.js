import assert from 'node:assert/strict';
import test from 'node:test';
import { listHalls, validateHall } from '../controller/banquetHallController.js';

const validHall = () => ({
  name: 'Grand Hall', code: 'GRAND', description: '', status: 'ACTIVE',
  capacities: [{ layout: 'Theatre', guests: 250 }], amenities: ['Stage'], allowedEventTypes: ['Wedding'],
  availableFrom: '09:00', availableUntil: '23:00', minimumBookingDuration: 60,
  timeIncrement: 30, setupBufferMinutes: 60, cleanupBufferMinutes: 30,
  baseHallRent: 35000, minimumGuaranteedPax: 100,
  cateringPolicy: 'IN_HOUSE_ONLY', decorationPolicy: 'OUTSIDE_ALLOWED', djPolicy: 'NOT_ALLOWED',
});

test('accepts a complete hotel hall configuration', () => {
  assert.equal(validateHall(validHall()), null);
});

test('rejects invalid operating hours and duration', () => {
  assert.match(validateHall({ ...validHall(), availableUntil: '08:00' }), /Operating hours/);
  assert.match(validateHall({ ...validHall(), minimumBookingDuration: 900 }), /Minimum duration/);
});

test('rejects duplicate layouts and malformed input', () => {
  assert.match(validateHall({ ...validHall(), capacities: [{ layout: 'Theatre', guests: 250 }, { layout: ' theatre ', guests: 100 }] }), /unique layout/);
  assert.match(validateHall({ ...validHall(), code: 42 }), /hall code/);
  assert.match(validateHall({ ...validHall(), capacities: [null] }), /unique layout/);
});

test('hotel staff can list only their assigned hotel halls', async () => {
  const assignedId = '507f1f77bcf86cd799439011';
  const otherId = '507f1f77bcf86cd799439012';
  let hallQuery;
  const req = {
    user: { role: 'HOTEL_ADMIN', assignedGuestHouseId: assignedId },
    query: { guestHouseId: otherId },
    tenantModels: {
      GuestHouse: { findById: (id) => ({ select: () => ({ lean: async () => ({ _id: id }) }) }) },
      BanquetHall: { find: (query) => { hallQuery = query; return { sort: () => ({ lean: async () => [] }) }; } },
    },
  };
  const res = { status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
  await listHalls(req, res);
  assert.equal(res.code, 403);
  assert.equal(hallQuery, undefined);
  req.query = {};
  await listHalls(req, res);
  assert.deepEqual(hallQuery, { guestHouseId: assignedId });
  assert.deepEqual(res.payload, { halls: [] });
});
