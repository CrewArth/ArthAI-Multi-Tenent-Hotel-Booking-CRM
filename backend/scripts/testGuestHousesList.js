import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { getGuestHouses } from '../controller/guestHouseController.js';
import { resolveTenantContext } from '../middlewares/auth.js';

const mockReq = {
  body: {},
  headers: {},
};

const mockRes = {
  status: (code) => {
    console.log(`[Test GuestHouses List] HTTP Status Code: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('[Test GuestHouses List] Returned GuestHouses Count:', data?.guestHouses?.length ?? data?.data?.length);
    if (data?.message) console.log('[Test GuestHouses List] Message:', data.message);
    return mockRes;
  },
};

const runTest = async () => {
  console.log('🧪 Testing POST /api/guesthouses/list with global tenant context resolver...');
  await resolveTenantContext(mockReq, mockRes, async () => {
    await getGuestHouses(mockReq, mockRes);
  });
  process.exit(0);
};

runTest();
