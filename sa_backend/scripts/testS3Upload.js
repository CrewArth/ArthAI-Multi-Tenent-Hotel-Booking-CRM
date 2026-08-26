import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { uploadBase64Document } from '../utils/s3UploadService.js';
import { provisionTenant } from '../controllers/tenantProvisionController.js';

// 1x1 Red Pixel PNG base64 string
const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Sample PDF base64 header string
const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJSDigqwKMSAwIG9iagomb2JqCg==';

const runS3Test = async () => {
  console.log('🧪 1. Testing S3 Base64 Image Upload & Sharp Processing...');
  const tenantId = `s3test_${Date.now().toString().slice(-4)}`;

  const logoUrl = await uploadBase64Document({
    base64Data: samplePngBase64,
    tenantId,
    category: 'branding',
    fileLabel: 'logo',
  });
  console.log('✅ Generated Logo URL:', logoUrl);

  console.log('🧪 2. Testing S3 Base64 PDF Document Upload...');
  const gstUrl = await uploadBase64Document({
    base64Data: samplePdfBase64,
    tenantId,
    category: 'compliance',
    fileLabel: 'gst_certificate',
  });
  console.log('✅ Generated GST PDF URL:', gstUrl);

  console.log('🧪 3. Testing Full Tenant Provisioning with S3 Documents...');
  const mockReq = {
    body: {
      name: 'S3 Verified Palace',
      tenantId,
      dbName: tenantId,
      ownerName: 'Vikramaditya Owner',
      ownerEmail: `owner_${tenantId}@palace.com`,
      ownerPhone: '+91 9123456789',
      plan: 'enterprise',
      personalDetails: {
        fullName: 'Vikramaditya Owner',
        signature: samplePngBase64,
        phone1: '+91 9123456789',
        email1: `owner_${tenantId}@palace.com`,
        legalDocNumber: 'DOC-AX987654',
        residentialAddress: 'Palace Grounds, Jaipur',
        businessAddress: 'Palace Grounds, Jaipur',
        govtIdProof: samplePdfBase64,
      },
      hotelDetails: {
        legalPropertyName: 'S3 Verified Hospitality Pvt Ltd',
        hotelName: 'S3 Verified Palace',
        propertyType: 'Palace',
        hotelLogo: samplePngBase64,
      },
      legalCompliance: {
        gstCertificate: samplePdfBase64,
        panCardPhoto: samplePngBase64,
      },
    },
  };

  const mockRes = {
    status: (code) => {
      console.log(`[Provision S3 Test] HTTP Code: ${code}`);
      return mockRes;
    },
    json: (data) => {
      console.log('[Provision S3 Test] Saved Tenant Document URLs:');
      console.log('  Logo:', data.tenant?.hotelDetails?.hotelLogo);
      console.log('  Signature:', data.tenant?.personalDetails?.signature);
      console.log('  Govt ID:', data.tenant?.personalDetails?.govtIdProof);
      console.log('  GST Cert:', data.tenant?.legalCompliance?.gstCertificate);
      console.log('  PAN Card:', data.tenant?.legalCompliance?.panCardPhoto);
      return mockRes;
    },
  };

  await provisionTenant(mockReq, mockRes);
  process.exit(0);
};

runS3Test();
