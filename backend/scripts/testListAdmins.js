import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { listUsers } from '../controller/adminController.js';

const mockReq = {
  body: { page: 1, limit: 10 },
  tenantModels: null,
};

const mockRes = {
  status: (code) => {
    console.log(`[Test List Users] HTTP Status Code: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('[Test List Users] Total Users Returned:', data?.users?.length);
    console.log('[Test List Users] User Roles:', data?.users?.map(u => ({ email: u.email, role: u.role })));
    return mockRes;
  },
};

import { getTenantDb } from '../config/dbManager.js';

const runTest = async () => {
  console.log('🧪 Testing POST /api/admin/users/list role filtering...');
  const tenantDb = await getTenantDb('gh_tenant_welcomebaroda');
  mockReq.tenantModels = tenantDb.models;

  await listUsers(mockReq, mockRes);
  process.exit(0);
};

runTest();
