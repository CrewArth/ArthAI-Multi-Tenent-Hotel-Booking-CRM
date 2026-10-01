import assert from 'node:assert/strict';
import test from 'node:test';
import { checkAvailability, createOccupancy } from '../controller/banquetCalendarController.js';

const hotelId = '507f1f77bcf86cd799439011';
const hallId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';
const hall = {
  _id: hallId, guestHouseId: hotelId, status: 'ACTIVE', availableFrom: '09:00', availableUntil: '23:00',
  timeIncrement: 30, minimumBookingDuration: 60, setupBufferMinutes: 60, cleanupBufferMinutes: 30,
  allowedEventTypes: ['Wedding'], capacities: [{ layout: 'Theatre', guests: 250 }],
};
const body = {
  guestHouseId: hotelId, hallId, eventName: 'Patel wedding', eventType: 'Wedding',
  eventDate: '2026-11-15', startTime: '10:00', endTime: '13:00', status: 'CONFIRMED',
  expectedGuests: 200, layout: 'Theatre',
};

const mockRequest = (conflict, onCreate) => ({
  user: { role: 'SUPER_ADMIN', _id: userId }, body,
  tenantDb: { startSession: async () => ({ withTransaction: async (callback) => callback(), endSession: async () => {} }) },
  tenantModels: {
    GuestHouse: { findById: (id) => ({ select: () => ({ lean: async () => ({ _id: id }) }) }) },
    BanquetHall: { findOneAndUpdate: async () => hall },
    BanquetOccupancy: {
      findOne: () => ({ session: () => ({ lean: async () => conflict }) }),
      create: async (documents) => { onCreate(documents[0]); return documents; },
    },
  },
});
const mockResponse = () => ({ status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } });

test('rejects an overlapping reservation before creating it', async () => {
  let created = false;
  const res = mockResponse();
  await createOccupancy(mockRequest({ _id: 'existing' }, () => { created = true; }), res);
  assert.equal(res.code, 409);
  assert.equal(created, false);
});

test('stores one reservation with its effective blocked interval', async () => {
  let created;
  const res = mockResponse();
  await createOccupancy(mockRequest(null, (document) => { created = document; }), res);
  assert.equal(res.code, 201);
  assert.equal(created.guestHouseId, hotelId);
  assert.equal(created.effectiveStartAt.toISOString(), '2026-11-15T09:00:00.000Z');
  assert.equal(created.effectiveEndAt.toISOString(), '2026-11-15T13:30:00.000Z');
  assert.equal(created.expectedGuests, 200);
});

test('availability check reports reservation details only from the selected hotel', async () => {
  const conflict = {
    eventName: 'Patel wedding', eventDate: body.eventDate, startTime: '10:00', endTime: '13:00',
    status: 'CONFIRMED', setupBufferMinutes: 60, cleanupBufferMinutes: 30,
  };
  let queriedHotel;
  const req = {
    user: { role: 'SUPER_ADMIN' }, body,
    tenantModels: {
      GuestHouse: { findById: (id) => ({ select: () => ({ lean: async () => ({ _id: id }) }) }) },
      BanquetHall: { find: () => ({ sort: () => ({ lean: async () => [hall] }) }) },
      BanquetOccupancy: {
        find: (filter) => {
          queriedHotel = filter.guestHouseId;
          return { select: () => ({ sort: () => ({ lean: async () => [conflict] }) }) };
        },
      },
    },
  };
  const res = mockResponse();
  await checkAvailability(req, res);
  assert.equal(queriedHotel, hotelId);
  assert.equal(res.payload.results[0].available, false);
  assert.deepEqual(res.payload.results[0].conflicts, [conflict]);
});
