import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import tenantSchema from '../models/centralModels/Tenant.js';
import { requireBanquetAccess } from '../middlewares/banquetAccess.js';

test('new and existing tenant records default Banquet Hall access to off', () => {
  const Tenant = mongoose.model('BanquetAccessTenantTest', tenantSchema);
  assert.equal(new Tenant({ tenantId: 'sample', name: 'Sample', dbName: 'sample' }).config.banquetHallEnabled, false);
  assert.equal(Boolean(new Tenant({ tenantId: 'sample', name: 'Sample', dbName: 'sample', config: {} }).config.banquetHallEnabled), false);
  assert.equal(new Tenant({ tenantId: 'sample', name: 'Sample', dbName: 'sample', config: { banquetHallEnabled: true } }).config.banquetHallEnabled, true);
});

test('banquet API rejects disabled tenants before reaching hall handlers', () => {
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  let continued = false;
  requireBanquetAccess({ banquetEnabled: false }, res, () => { continued = true; });
  assert.equal(res.code, 403);
  assert.equal(continued, false);
  requireBanquetAccess({ banquetEnabled: true }, res, () => { continued = true; });
  assert.equal(continued, true);
});
