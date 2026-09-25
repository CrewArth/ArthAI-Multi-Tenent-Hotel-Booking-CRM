import assert from 'node:assert/strict';
import test from 'node:test';
import { assignedHotelId, buildAdminCredentialEmail, normalizeCredentialUsername, resolveCredentialHotel } from '../utils/adminCredentials.js';

test('generates a credential email from username and hotel name', () => {
  assert.equal(buildAdminCredentialEmail(' CRMHotel ', 'Neu Vera'), 'crmhotel@neuvera.in');
  assert.equal(buildAdminCredentialEmail('frontdesk2', 'Hôtel 21'), 'frontdesk2@hotel21.in');
});

test('rejects invalid credential usernames and hotel names', () => {
  assert.equal(normalizeCredentialUsername('  Admin01  '), 'admin01');
  assert.equal(buildAdminCredentialEmail('1admin', 'Neu Vera'), null);
  assert.equal(buildAdminCredentialEmail('ab', 'Neu Vera'), null);
  assert.equal(buildAdminCredentialEmail('admin', '***'), null);
});

test('resolves hotel assignments safely for super and hotel admins', async () => {
  assert.equal(assignedHotelId({ role: 'SUPER_ADMIN', assignedGuestHouseId: null }), null);
  assert.equal(assignedHotelId({ assignedGuestHouseId: 'hotel-1' }), 'hotel-1');
  assert.equal(assignedHotelId({ assignedGuestHouseId: { guestHouseId: 'hotel-2' } }), 'hotel-2');

  let hotelLookup;
  const GuestHouse = { findOne: async (query) => { hotelLookup = query; return null; } };
  await resolveCredentialHotel(GuestHouse, 'hotel-1');
  assert.deepEqual(hotelLookup, { $or: [{ guestHouseId: 'hotel-1' }] });
});
