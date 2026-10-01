import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionEnquiry, convertEnquiryToQuotation, createEnquiry, updateEnquiryStatus, validateEnquiry } from '../controller/banquetEnquiryController.js';

const hotelId = '507f1f77bcf86cd799439011';
const otherHotelId = '507f1f77bcf86cd799439012';
const enquiryId = '507f1f77bcf86cd799439013';
const userId = '507f1f77bcf86cd799439014';
const body = {
  guestHouseId: hotelId, customerName: 'Asha Patel', mobileNo: '+919876543210',
  email: 'asha@example.com', companyName: '', eventType: 'Wedding', eventDate: '2026-11-15',
  preferredStartTime: '10:00', preferredEndTime: '13:00', expectedGuests: 200,
  vegGuests: 150, nonVegGuests: 50, jainGuests: 0, noOnionNoGarlicGuests: 0,
  budgetRange: '', leadSource: 'Phone', requirements: '', notes: '', assignedTo: '',
};
const response = () => ({ status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } });
const guestHouse = (id) => ({ _id: id, guestHouseId: `GH-${id.slice(-3)}` });
const GuestHouse = { findById: (id) => ({ select: () => ({ lean: async () => guestHouse(id) }) }) };

test('validates event times and guest breakdown before creating an enquiry', () => {
  assert.equal(validateEnquiry(body), null);
  assert.match(validateEnquiry({ ...body, preferredEndTime: '09:00' }), /start time/);
  assert.match(validateEnquiry({ ...body, jainGuests: 1 }), /cannot exceed/);
});

test('status flow moves forward and requires a reason when lost', async () => {
  assert.equal(canTransitionEnquiry('NEW', 'CONTACTED'), true);
  assert.equal(canTransitionEnquiry('CONTACTED', 'NEW'), false);
  assert.equal(canTransitionEnquiry('NEW', 'CONFIRMED'), false);
  assert.equal(canTransitionEnquiry('LOST', 'CONTACTED'), false);
  const res = response();
  await updateEnquiryStatus({
    user: { role: 'SUPER_ADMIN', _id: userId }, params: { id: enquiryId },
    body: { guestHouseId: hotelId, status: 'LOST' },
    tenantModels: {
      GuestHouse,
      BanquetEnquiry: { findOne: () => ({ lean: async () => ({ _id: enquiryId, status: 'CONTACTED' }) }) },
    },
  }, res);
  assert.equal(res.code, 400);
  assert.match(res.payload.message, /reason/);
});

test('quotation status requires a draft for the same hotel and enquiry', async () => {
  const res = response();
  await updateEnquiryStatus({
    user: { role: 'SUPER_ADMIN', _id: userId }, params: { id: enquiryId },
    body: { guestHouseId: hotelId, status: 'QUOTATION_SENT' },
    tenantModels: {
      GuestHouse,
      BanquetEnquiry: { findOne: () => ({ lean: async () => ({ _id: enquiryId, status: 'CONTACTED' }) }) },
      BanquetQuotation: { findOne: (filter) => {
        assert.equal(filter.guestHouseId, hotelId);
        assert.equal(filter.enquiryId, enquiryId);
        return { select: () => ({ lean: async () => null }) };
      } },
    },
  }, res);
  assert.equal(res.code, 409);
  assert.match(res.payload.message, /quotation draft/);
});

test('hotel admin cannot create an enquiry for a different hotel', async () => {
  let created = false;
  const res = response();
  await createEnquiry({
    user: { role: 'HOTEL_ADMIN', _id: userId, assignedGuestHouseId: hotelId },
    body: { ...body, guestHouseId: otherHotelId },
    tenantModels: { GuestHouse, BanquetEnquiry: { create: async () => { created = true; } } },
  }, res);
  assert.equal(res.code, 403);
  assert.equal(created, false);
});

test('enquiry creation generates a hotel-scoped number', async () => {
  let created;
  const res = response();
  await createEnquiry({
    user: { role: 'SUPER_ADMIN', _id: userId }, body,
    tenantModels: {
      GuestHouse,
      Counter: { findOneAndUpdate: async (filter) => { assert.match(filter._id, new RegExp(hotelId)); return { seq: 7 }; } },
      BanquetEnquiry: { create: async (document) => { created = document; return document; } },
    },
  }, res);
  assert.equal(res.code, 201);
  assert.match(created.enquiryNo, /^BE-\d{4}-000007$/);
  assert.equal(created.guestHouseId, hotelId);
});

test('conversion creates a draft linked to the selected enquiry', async () => {
  let draft;
  let insertCount = 0;
  const quotationModel = { findOneAndUpdate: async (filter, update, options) => {
    assert.equal(options.upsert, true);
    assert.equal(String(filter.enquiryId), enquiryId);
    if (!draft) { draft = { _id: 'draft', ...update.$setOnInsert }; insertCount += 1; }
    return draft;
  } };
  const res = response();
  const req = {
    user: { role: 'SUPER_ADMIN', _id: userId }, params: { id: enquiryId }, body: { guestHouseId: hotelId },
    tenantModels: {
      GuestHouse,
      BanquetEnquiry: { findOne: () => ({ lean: async () => ({
        _id: enquiryId, status: 'CONTACTED', customerName: 'Asha Patel',
        eventType: 'Wedding', eventDate: '2026-11-15', expectedGuests: 200,
      }) }) },
      BanquetQuotation: quotationModel,
    },
  };
  await convertEnquiryToQuotation(req, res);
  await convertEnquiryToQuotation(req, res);
  assert.equal(draft.status, 'DRAFT');
  assert.equal(draft.customerName, 'Asha Patel');
  assert.equal(res.payload.quotation.enquiryId, enquiryId);
  assert.equal(insertCount, 1);
});
