import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { checkAvailability } from '../controller/bookingController.js';
import { resolveTenantContext } from '../middlewares/auth.js';

const mockReq = {
  body: {
    guestHouseId: 'gh_001',
    checkIn: '2026-09-01',
    checkOut: '2026-09-05',
  },
  headers: {},
};

const mockRes = {
  status: (code) => {
    console.log(`[Test Availability] HTTP Status Code: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('[Test Availability] Unavailable Rooms Count:', data?.unavailableRooms?.length);
    console.log('[Test Availability] Unavailable Beds Count:', data?.unavailableBeds?.length);
    if (data?.message) console.log('[Test Availability] Message:', data.message);
    return mockRes;
  },
};

const runTest = async () => {
  console.log('🧪 Testing POST /api/bookings/availability...');
  await resolveTenantContext(mockReq, mockRes, async () => {
    await checkAvailability(mockReq, mockRes);
  });
  process.exit(0);
};

runTest();
