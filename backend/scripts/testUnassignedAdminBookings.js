import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { getAllBookings } from '../controller/bookingController.js';
import { getTenantDb } from '../config/dbManager.js';

const mockReq = {
  body: { page: 1, limit: 10 },
  user: {
    role: 'ADMIN',
    assignedGuestHouseId: null, // Unassigned Admin
  },
  tenantModels: null,
};

const mockRes = {
  status: (code) => {
    console.log(`[Test Unassigned Admin Bookings] HTTP Status Code: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('[Test Unassigned Admin Bookings] Returned Bookings Count:', data?.bookings?.length);
    console.log('[Test Unassigned Admin Bookings] Total Count:', data?.totalCount);
    if (data?.message) console.log('[Test Unassigned Admin Bookings] Message:', data.message);
    return mockRes;
  },
};

const runTest = async () => {
  console.log('🧪 Testing POST /api/bookings/list for UNASSIGNED Admin (assignedGuestHouseId = null)...');
  const tenantDb = await getTenantDb('gh_tenant_welcomebaroda');
  mockReq.tenantModels = tenantDb.models;

  await getAllBookings(mockReq, mockRes);
  process.exit(0);
};

runTest();
