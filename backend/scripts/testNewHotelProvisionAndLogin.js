import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../sa_backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

import { provisionTenant } from '../../sa_backend/controllers/tenantProvisionController.js';
import { loginUser } from '../controller/authController.js';

const testSlug = `hotel_${Date.now()}`;
const ownerEmail = `${testSlug}@hoteltest.com`;

const runE2ETest = async () => {
  console.log(`🧪 Provisioning new test hotel with slug '${testSlug}'...`);

  let generatedCreds = null;

  const mockProvReq = {
    body: {
      name: `Test Hotel ${testSlug}`,
      tenantId: testSlug,
      ownerName: 'Test Hotel Owner',
      ownerEmail: ownerEmail,
      ownerPhone: '+91 9999911111',
      plan: 'pro',
    },
  };

  const mockProvRes = {
    status: (code) => mockProvRes,
    json: (data) => {
      generatedCreds = data.generatedCredentials;
      console.log('[E2E Provision] Result:', data.message);
      console.log('[E2E Provision] Generated SuperAdmin Email:', generatedCreds?.superAdmin?.email);
      console.log('[E2E Provision] Generated SuperAdmin Password:', generatedCreds?.superAdmin?.password);
      return mockProvRes;
    },
  };

  await provisionTenant(mockProvReq, mockProvRes);

  if (!generatedCreds?.superAdmin) {
    console.error('❌ Provisioning failed, stopping test.');
    process.exit(1);
  }

  console.log(`\n🔑 Testing signin for generated credentials...`);

  const mockLoginReq = {
    body: {
      email: generatedCreds.superAdmin.email,
      password: generatedCreds.superAdmin.password,
    },
    headers: {},
  };

  const mockLoginRes = {
    status: (code) => {
      console.log(`[E2E Signin] HTTP Status Code: ${code}`);
      return mockLoginRes;
    },
    json: (data) => {
      console.log('[E2E Signin] User Email:', data?.user?.email);
      console.log('[E2E Signin] User Role:', data?.user?.role);
      console.log('[E2E Signin] JWT Token Issued:', !!data?.token);
      if (data?.message) console.log('[E2E Signin] Message:', data.message);
      return mockLoginRes;
    },
  };

  await loginUser(mockLoginReq, mockLoginRes);
  process.exit(0);
};

runE2ETest();
