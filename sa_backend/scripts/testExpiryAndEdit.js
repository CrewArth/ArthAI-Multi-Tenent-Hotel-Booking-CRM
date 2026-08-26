import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { getTenantByTenantId, updateTenant, provisionTenant } from '../controllers/tenantProvisionController.js';
import { loginUser } from '../../backend/controller/authController.js';

const runExpiryAndEditTest = async () => {
  console.log('🧪 1. Provisioning a Test Tenant with Future Expiry Date...');
  const testId = `expirytest_${Date.now().toString().slice(-4)}`;
  const ownerEmail = `admin_${testId}@hotel.com`;

  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);

  const mockReqProvision = {
    body: {
      name: 'Expiry Test Hotel',
      tenantId: testId,
      dbName: testId,
      ownerName: 'Expiry Admin',
      ownerEmail,
      ownerPhone: '+91 9999988888',
      plan: 'pro',
      expiryDate: futureDate.toISOString().split('T')[0],
    },
  };

  let generatedCreds = null;
  const mockResProvision = {
    status: (code) => mockResProvision,
    json: (data) => {
      generatedCreds = data.generatedCredentials;
      console.log('✅ Provisioned Tenant:', data.tenant?.tenantId, 'Expiry:', data.tenant?.expiryDate);
      return mockResProvision;
    },
  };

  await provisionTenant(mockReqProvision, mockResProvision);

  console.log('\n🧪 2. Fetching Tenant Details via getTenantByTenantId...');
  const mockReqGet = { params: { tenantId: testId } };
  const mockResGet = {
    status: (code) => mockResGet,
    json: (data) => {
      console.log('✅ Fetched Tenant Name:', data.tenant?.name, 'Plan:', data.tenant?.plan);
      return mockResGet;
    },
  };
  await getTenantByTenantId(mockReqGet, mockResGet);

  console.log('\n🧪 3. Updating Tenant Expiry Date to YESTERDAY (Expired state)...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const mockReqUpdate = {
    params: { tenantId: testId },
    body: {
      expiryDate: yesterday.toISOString().split('T')[0],
    },
  };

  const mockResUpdate = {
    status: (code) => mockResUpdate,
    json: (data) => {
      console.log('✅ Updated Tenant Expiry Date to:', data.tenant?.expiryDate);
      return mockResUpdate;
    },
  };
  await updateTenant(mockReqUpdate, mockResUpdate);

  console.log('\n🧪 4. Testing Login for Expired Tenant (Expecting HTTP 403 Block)...');
  const mockReqLogin = {
    body: {
      email: generatedCreds.superAdmin.email,
      password: generatedCreds.superAdmin.password,
      tenantSlug: testId,
      dbName: testId,
    },
  };

  const mockResLogin = {
    status: (code) => {
      console.log(`[Auth Login Test] Response HTTP Code: ${code}`);
      return mockResLogin;
    },
    json: (data) => {
      console.log(`[Auth Login Test] Response Message: "${data.message}"`);
      return mockResLogin;
    },
  };

  await loginUser(mockReqLogin, mockResLogin);

  console.log('\n🧪 5. Renewing Tenant Expiry Date to Future...');
  const renewedDate = new Date();
  renewedDate.setFullYear(renewedDate.getFullYear() + 1);

  const mockReqRenew = {
    params: { tenantId: testId },
    body: {
      expiryDate: renewedDate.toISOString().split('T')[0],
    },
  };

  await updateTenant(mockReqRenew, mockResUpdate);

  console.log('\n🧪 6. Re-testing Login for Renewed Tenant (Expecting HTTP 200 Success)...');
  await loginUser(mockReqLogin, mockResLogin);

  process.exit(0);
};

runExpiryAndEditTest();
