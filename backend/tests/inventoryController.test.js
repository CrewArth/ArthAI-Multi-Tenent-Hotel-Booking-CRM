import assert from 'node:assert/strict';
import test from 'node:test';
import { createItemRequest, updateItem, deleteItem } from '../controller/inventoryController.js';

const itemId = '507f1f77bcf86cd799439011';
const hotelId = '507f1f77bcf86cd799439012';

const query = (value) => ({ select: () => ({ lean: async () => value }) });

const requestInventory = async ({ isChargeable, allowHotelPriceChange = true, submittedPrice = 75 }) => {
  let savedRequest;
  const req = {
    user: { _id: '507f1f77bcf86cd799439013', assignedGuestHouseId: hotelId },
    body: { items: [{ itemId, quantity: 2, price: submittedPrice }] },
    tenantModels: {
      GuestHouse: { findById: () => query({ _id: hotelId }) },
      Inventory: { find: () => ({ lean: async () => [{ itemId, quantity: 10, price: 40 }] }) },
      Configuration: { findOne: () => query({ allowHotelPriceChange }) },
      Item: { find: () => query([{ _id: itemId, isChargeable }]) },
      ItemRequest: { create: async (request) => { savedRequest = request; return request; } },
    },
  };
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await createItemRequest(req, res);
  return { res, savedRequest };
};

test('free items ignore a hotel-submitted charge', async () => {
  const { res, savedRequest } = await requestInventory({ isChargeable: false });
  assert.equal(res.statusCode, 201);
  assert.equal(savedRequest.items[0].price, 0);
});

test('chargeable items use the central price when hotel price changes are disabled', async () => {
  const { res, savedRequest } = await requestInventory({ isChargeable: true, allowHotelPriceChange: false });
  assert.equal(res.statusCode, 201);
  assert.equal(savedRequest.items[0].price, 40);
});

test('editing an item to free clears prices across its stock locations', async () => {
  const item = { _id: itemId, set(values) { Object.assign(this, values); }, async save() {} };
  const inventory = { itemId, set(values) { Object.assign(this, values); }, async save() {} };
  let clearedPrices;
  const req = {
    params: { id: itemId },
    user: { _id: hotelId },
    body: { name: 'Bath Towel', initials: 'BT', description: '', unit: 'piece', quantity: 5, price: 99, costPrice: 12, isChargeable: false },
    tenantDb: { async startSession() { return { async withTransaction(callback) { await callback(); }, async endSession() {} }; } },
    tenantModels: {
      Inventory: {
        findById: () => ({ session: async () => inventory, populate: () => ({ populate: async () => inventory }) }),
        updateMany: async (_query, update) => { clearedPrices = update.$set.price; },
      },
      Item: {
        findById: () => ({ session: async () => item }),
        findOne: () => ({ session: async () => null }),
      },
    },
  };
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await updateItem(req, res);
  assert.equal(res.body?.message, 'Inventory item updated.');
  assert.equal(item.isChargeable, false);
  assert.equal(inventory.price, 0);
  assert.equal(clearedPrices, 0);
});

test('deleting stock leaves the shared item definition untouched', async () => {
  let stockDeleted = false;
  const req = {
    params: { id: itemId },
    tenantModels: { Inventory: { findByIdAndDelete: async () => { stockDeleted = true; return { _id: itemId }; } } },
  };
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await deleteItem(req, res);
  assert.equal(stockDeleted, true);
  assert.equal(res.body?.message, 'Inventory item deleted.');
});
