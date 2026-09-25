import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteTax } from '../controller/taxController.js';

const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('deleting a tax removes its record', async () => {
  let deletedId;
  const req = {
    params: { id: 'tax-1' },
    tenantModels: { Tax: { findByIdAndDelete: async (id) => { deletedId = id; return { _id: id }; } } },
  };
  const res = response();

  await deleteTax(req, res);

  assert.equal(deletedId, 'tax-1');
  assert.deepEqual(res.body, { message: 'Tax deleted' });
});

test('deleting a missing tax returns 404', async () => {
  const req = {
    params: { id: 'missing' },
    tenantModels: { Tax: { findByIdAndDelete: async () => null } },
  };
  const res = response();

  await deleteTax(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { message: 'Tax not found' });
});
