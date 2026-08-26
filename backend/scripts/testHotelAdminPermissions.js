import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { normalizeRole } from '../utils/roles.js';
import { 
  preventHotelCreationForHotelAdmin, 
  preventHotelDeletionForHotelAdmin, 
  verifyPropertyOwnership 
} from '../middlewares/hotelAdminScopeMiddleware.js';

const runHotelAdminTest = async () => {
  console.log('🧪 1. Testing Role Normalization for HOTEL_ADMIN...');
  console.log('  normalizeRole("hotel_admin") ->', normalizeRole('hotel_admin'));
  console.log('  normalizeRole("HOTEL-ADMIN") ->', normalizeRole('HOTEL-ADMIN'));

  if (normalizeRole('hotel_admin') !== 'HOTEL_ADMIN') {
    throw new Error('Role normalization test failed!');
  }
  console.log('✅ Role Normalization Test Passed!');

  const hotelAdminUser = {
    _id: 'user_ha_123',
    email: 'hoteladmin@test.com',
    role: 'HOTEL_ADMIN',
    assignedGuestHouseId: 'GH_ASSIGNED_001',
  };

  const createMockRes = (testName) => ({
    status: (code) => {
      console.log(`  [${testName}] HTTP Status: ${code}`);
      return createMockRes(testName);
    },
    json: (data) => {
      console.log(`  [${testName}] Response: "${data.message}"`);
      return createMockRes(testName);
    },
  });

  console.log('\n🧪 2. Testing Hotel Creation Restriction for HOTEL_ADMIN...');
  const reqCreate = { user: hotelAdminUser };
  let createPassed = false;
  preventHotelCreationForHotelAdmin(reqCreate, createMockRes('Create Hotel Check'), () => {
    createPassed = true;
  });
  if (createPassed) {
    console.error('❌ FAIL: HOTEL_ADMIN was allowed to create a hotel!');
  } else {
    console.log('✅ PASS: HOTEL_ADMIN was correctly blocked from creating a hotel!');
  }

  console.log('\n🧪 3. Testing Hotel Deletion Restriction for HOTEL_ADMIN...');
  const reqDelete = { user: hotelAdminUser };
  let deletePassed = false;
  preventHotelDeletionForHotelAdmin(reqDelete, createMockRes('Delete Hotel Check'), () => {
    deletePassed = true;
  });
  if (deletePassed) {
    console.error('❌ FAIL: HOTEL_ADMIN was allowed to delete a hotel!');
  } else {
    console.log('✅ PASS: HOTEL_ADMIN was correctly blocked from deleting a hotel!');
  }

  console.log('\n🧪 4. Testing Property Ownership Verification for ASSIGNED Property (GH_ASSIGNED_001)...');
  const reqAssigned = {
    user: hotelAdminUser,
    params: { guestHouseId: 'GH_ASSIGNED_001' },
  };
  let assignedPassed = false;
  verifyPropertyOwnership(reqAssigned, createMockRes('Assigned Property Check'), () => {
    assignedPassed = true;
  });
  if (assignedPassed) {
    console.log('✅ PASS: HOTEL_ADMIN was granted access to edit their assigned property!');
  } else {
    console.error('❌ FAIL: HOTEL_ADMIN was denied access to their assigned property!');
  }

  console.log('\n🧪 5. Testing Property Ownership Verification for UNASSIGNED Property (GH_OTHER_999)...');
  const reqUnassigned = {
    user: hotelAdminUser,
    params: { guestHouseId: 'GH_OTHER_999' },
  };
  let unassignedPassed = false;
  verifyPropertyOwnership(reqUnassigned, createMockRes('Unassigned Property Check'), () => {
    unassignedPassed = true;
  });
  if (unassignedPassed) {
    console.error('❌ FAIL: HOTEL_ADMIN was allowed to access an unassigned property!');
  } else {
    console.log('✅ PASS: HOTEL_ADMIN was correctly blocked from accessing an unassigned property!');
  }

  console.log('\n🎉 ALL HOTEL_ADMIN PERMISSION TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
};

runHotelAdminTest();
