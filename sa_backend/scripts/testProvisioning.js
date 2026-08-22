import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { provisionTenant } from '../controllers/tenantProvisionController.js';

const mockReq = {
  body: {
    name: 'Welcome Baroda Guest House',
    tenantId: 'welcomebaroda',
    dbName: 'welcomebaroda',
    ownerName: 'Kohli Admin',
    ownerEmail: 'welcomebaroda_superadmin@kohli.in',
    ownerPhone: '+91 9898989898',
    plan: 'enterprise',
  },
};

const mockRes = {
  status: (code) => {
    console.log(`[Provision Test] HTTP Status Code: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('[Provision Test] Response Data:', JSON.stringify(data, null, 2));
    return mockRes;
  },
};

const runTest = async () => {
  console.log('🧪 Provisioning Tenant "welcomebaroda"...');
  await provisionTenant(mockReq, mockRes);
  process.exit(0);
};

runTest();
