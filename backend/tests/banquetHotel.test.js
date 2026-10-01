import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBanquetHotel } from '../utils/banquetHotel.js';

const assignedId = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439012';
const hotels = new Map([
  [assignedId, { _id: assignedId, guestHouseName: 'Assigned hotel' }],
  [otherId, { _id: otherId, guestHouseName: 'Other hotel' }],
]);
const request = {
  user: { role: 'HOTEL_ADMIN', assignedGuestHouseId: assignedId },
  tenantModels: {
    GuestHouse: {
      findById: (id) => ({ select: () => ({ lean: async () => hotels.get(id) || null }) }),
    },
  },
};

test('hotel admin resolves only the assigned banquet hotel', async () => {
  const result = await resolveBanquetHotel(request);
  assert.equal(result.hotel?._id, assignedId);
});

test('hotel admin cannot request another hotel’s banquet halls', async () => {
  const result = await resolveBanquetHotel(request, otherId);
  assert.equal(result.status, 403);
  assert.equal(result.hotel, undefined);
});
