import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { provisionTenant } from '../controllers/tenantProvisionController.js';

const testId = `steppertest_${Date.now().toString().slice(-4)}`;

const mockReq = {
  body: {
    name: 'Enterprise Stepper Hotel',
    tenantId: testId,
    dbName: testId,
    ownerName: 'Stephan Manager',
    ownerEmail: `stephan_${testId}@hotel.com`,
    ownerPhone: '+91 9988776655',
    plan: 'enterprise',
    personalDetails: {
      fullName: 'Stephan Manager',
      phone1: '+91 9988776655',
      email1: `stephan_${testId}@hotel.com`,
      legalDocNumber: 'DOC-987654321',
      residentialAddress: '123 Residency St, City',
      businessAddress: '123 Business Plaza, City',
      govtIdProof: 'id_proof_scan.pdf',
    },
    hotelDetails: {
      legalPropertyName: 'Enterprise Stepper Hotel Private Limited',
      hotelName: 'Enterprise Stepper Hotel',
      propertyType: 'Palace',
      hotelLogo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
    legalCompliance: {
      gstCertificate: 'gst_certificate.pdf',
      panCardPhoto: 'pan_card.jpg',
    },
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
