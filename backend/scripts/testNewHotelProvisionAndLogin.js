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
      console.log('[E2E Provision] Generated HotelAdmin Email:', generatedCreds?.hotelAdmin?.email);
      console.log('[E2E Provision] Generated Admin Email:', generatedCreds?.admin?.email);
      return mockProvRes;
    },
  };

  await provisionTenant(mockProvReq, mockProvRes);

  if (!generatedCreds?.superAdmin || !generatedCreds?.hotelAdmin || !generatedCreds?.admin) {
    console.error('❌ Provisioning failed: Missing credentials, stopping test.');
    process.exit(1);
  }

  console.log(`\n🔑 Testing signin for generated SuperAdmin...`);

  const mockLoginReq = {
    body: {
      email: generatedCreds.superAdmin.email,
      password: generatedCreds.superAdmin.password,
    },
    headers: {},
  };

  const mockLoginRes = {
    status: (code) => {
      console.log(`[E2E SuperAdmin Signin] HTTP Status Code: ${code}`);
      return mockLoginRes;
    },
    json: (data) => {
      console.log('[E2E SuperAdmin Signin] User Email:', data?.user?.email);
      console.log('[E2E SuperAdmin Signin] User Role:', data?.user?.role);
      console.log('[E2E SuperAdmin Signin] JWT Token Issued:', !!data?.token);
      return mockLoginRes;
    },
  };

  await loginUser(mockLoginReq, mockLoginRes);

  console.log(`\n🔑 Testing signin for UNASSIGNED HotelAdmin (Expect 403 'Hotel not assigned yet')...`);
  const mockHotelAdminLoginReq = {
    body: {
      email: generatedCreds.hotelAdmin.email,
      password: generatedCreds.hotelAdmin.password,
    },
    headers: {},
  };

  let unassignedBlocked = false;
  const mockHotelAdminLoginRes = {
    status: (code) => {
      console.log(`[E2E Unassigned HotelAdmin Signin] HTTP Status Code: ${code}`);
      if (code === 403) unassignedBlocked = true;
      return mockHotelAdminLoginRes;
    },
    json: (data) => {
      console.log('[E2E Unassigned HotelAdmin Signin] Response message:', data?.message);
      if (data?.message === 'Hotel not assigned yet') {
        console.log('✅ Correctly blocked unassigned HotelAdmin with: "Hotel not assigned yet"');
      }
      return mockHotelAdminLoginRes;
    },
  };

  await loginUser(mockHotelAdminLoginReq, mockHotelAdminLoginRes);

  if (!unassignedBlocked) {
    console.error('❌ Failed: Unassigned HotelAdmin should have been blocked with 403!');
    process.exit(1);
  }

  console.log(`\n🏨 Now creating a test hotel and assigning it to HotelAdmin...`);
  const { getTenantDb } = await import('../config/dbManager.js');
  const tenantDb = await getTenantDb(testSlug);
  const GuestHouse = tenantDb.models.GuestHouse || tenantDb.model('GuestHouse');
  const User = tenantDb.models.User || tenantDb.model('User');

  const testHotel = await GuestHouse.create({
    guestHouseId: `GH_${Date.now()}`,
    guestHouseName: `Grand Palace ${testSlug}`,
    location: { city: 'Mumbai', state: 'Maharashtra' },
  });

  await User.updateOne(
    { email: generatedCreds.hotelAdmin.email.toLowerCase().trim() },
    { $set: { assignedGuestHouseId: testHotel.guestHouseId } }
  );

  console.log(`✅ Hotel '${testHotel.guestHouseName}' assigned to HotelAdmin. Testing signin again...`);

  let hotelAdminLoginSuccess = false;
  const mockAssignedLoginRes = {
    status: (code) => {
      console.log(`[E2E Assigned HotelAdmin Signin] HTTP Status Code: ${code}`);
      return mockAssignedLoginRes;
    },
    json: (data) => {
      console.log('[E2E Assigned HotelAdmin Signin] User Email:', data?.user?.email);
      console.log('[E2E Assigned HotelAdmin Signin] User Role:', data?.user?.role);
      console.log('[E2E Assigned HotelAdmin Signin] Assigned Hotel Name:', data?.user?.assignedGuestHouseId?.guestHouseName);
      console.log('[E2E Assigned HotelAdmin Signin] JWT Token Issued:', !!data?.token);
      if (data?.user?.role === 'HOTEL_ADMIN' && data?.token && data?.user?.assignedGuestHouseId?.guestHouseName === testHotel.guestHouseName) {
        hotelAdminLoginSuccess = true;
      }
      return mockAssignedLoginRes;
    },
  };

  await loginUser(mockHotelAdminLoginReq, mockAssignedLoginRes);

  if (!hotelAdminLoginSuccess) {
    console.error('❌ Assigned HotelAdmin login verification failed!');
    process.exit(1);
  }

  console.log('\n🎉 ALL HOTEL ASSIGNMENT & LOGIN ENFORCEMENT TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
};

runE2ETest();
