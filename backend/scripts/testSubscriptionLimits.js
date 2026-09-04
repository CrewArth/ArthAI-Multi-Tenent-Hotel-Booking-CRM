import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../sa_backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getSubscriptionLimits } from '../config/subscriptionLimits.js';
import { checkHotelLimit, checkRoomLimit, checkAdminLimit } from '../middlewares/subscriptionMiddleware.js';

const runTests = async () => {
  console.log('🧪 Running Subscription Limits Configuration & Middleware Tests...\n');

  // Test 1: Config Limits Matrix
  const basicLimits = getSubscriptionLimits('basic');
  const proLimits = getSubscriptionLimits('pro');
  const enterpriseLimits = getSubscriptionLimits('enterprise');

  console.log('📋 Matrix Verification:');
  console.log(' - BASIC:', basicLimits);
  console.log(' - PRO:', proLimits);
  console.log(' - ENTERPRISE:', enterpriseLimits);

  if (
    basicLimits.maxHotels === 1 && basicLimits.maxRoomsPerHotel === 10 && basicLimits.maxAdminsPerHotel === 2 &&
    proLimits.maxHotels === 3 && proLimits.maxRoomsPerHotel === 20 && proLimits.maxAdminsPerHotel === 4 &&
    enterpriseLimits.maxHotels === 5 && enterpriseLimits.maxRoomsPerHotel === 50 && enterpriseLimits.maxAdminsPerHotel === 8
  ) {
    console.log('\n✅ Subscription Matrix Configuration Verified 100% Correct!');
  } else {
    console.error('\n❌ Subscription Matrix Configuration Mismatch!');
    process.exit(1);
  }

  // Test 2: Basic Plan Hotel Limit Mock Check
  const mockHotelReq = {
    tenantModels: {
      GuestHouse: {
        countDocuments: async () => 1, // Already 1 hotel exists
      },
    },
    subscription: {
      plan: 'basic',
      limits: basicLimits,
    },
  };

  let isHotelBlocked = false;
  const mockHotelRes = {
    status: (code) => {
      if (code === 403) isHotelBlocked = true;
      return mockHotelRes;
    },
    json: (data) => {
      console.log('\n🔒 Basic Plan Hotel Limit Blocked Output:');
      console.log(' - Message:', data.message);
      console.log(' - HTTP Status Code: 403');
      return mockHotelRes;
    },
  };

  await checkHotelLimit(mockHotelReq, mockHotelRes, () => {
    console.error('❌ Failed: checkHotelLimit should have blocked creation');
  });

  if (!isHotelBlocked) {
    console.error('❌ Basic Plan Hotel Limit test failed');
    process.exit(1);
  }

  // Test 3: Basic Plan Admin Limit Mock Check
  const mockAdminReq = {
    tenantModels: {
      User: {
        countDocuments: async () => 2, // Already 2 admins exist (limit reached)
      },
    },
    subscription: {
      plan: 'basic',
      limits: basicLimits,
    },
  };

  let isAdminBlocked = false;
  const mockAdminRes = {
    status: (code) => {
      if (code === 403) isAdminBlocked = true;
      return mockAdminRes;
    },
    json: (data) => {
      console.log('\n🔒 Basic Plan Admin Limit Blocked Output:');
      console.log(' - Message:', data.message);
      console.log(' - HTTP Status Code: 403');
      return mockAdminRes;
    },
  };

  await checkAdminLimit(mockAdminReq, mockAdminRes, () => {
    console.error('❌ Failed: checkAdminLimit should have blocked creation');
  });

  if (!isAdminBlocked) {
    console.error('❌ Basic Plan Admin Limit test failed');
    process.exit(1);
  }

  console.log('\n🎉 ALL SUBSCRIPTION LIMIT TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
};

runTests();
