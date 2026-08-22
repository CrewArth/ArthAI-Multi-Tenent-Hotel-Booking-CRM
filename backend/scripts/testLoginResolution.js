import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { loginUser } from '../controller/authController.js';

const mockReq = {
  body: {
    email: 'hyatt_hotel_superadmin@admin.in',
    password: 'dl0d&UWbFLFL',
  },
  headers: {},
};

const mockRes = {
  status: (code) => {
    console.log(`[Test Hyatt Login] HTTP Status Code: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('[Test Hyatt Login] Response User Email:', data?.user?.email);
    console.log('[Test Hyatt Login] User Role:', data?.user?.role);
    console.log('[Test Hyatt Login] Generated JWT Token Issued:', !!data?.token);
    if (data?.message) console.log('[Test Hyatt Login] Message:', data.message);
    return mockRes;
  },
};

const runTest = async () => {
  console.log('🧪 Testing Tenant DB Auto-Resolution for Hyatt Hotel SuperAdmin...');
  await loginUser(mockReq, mockRes);
  process.exit(0);
};

runTest();
