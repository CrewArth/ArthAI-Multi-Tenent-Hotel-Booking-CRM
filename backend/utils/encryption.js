import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const PREFIX = 'enc:gcm:';

/**
 * Derives a consistent 32-byte key from environment encryption secret
 */
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY ||
                 process.env.JWT_SECRET ||
                 'guesthouse-super-admin-encryption-key-32b-secret';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypts a string or object using AES-256-GCM
 * @param {string|object} value - Value to encrypt
 * @returns {string|any} Encrypted string prefixed with enc:gcm: or original value if null/undefined
 */
export const encrypt = (value) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // Avoid double encryption
  if (strValue.startsWith(PREFIX)) {
    return strValue;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(strValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption Error] Failed to encrypt data:', error.message);
    return value;
  }
};

/**
 * Decrypts an encrypted string created by encrypt().
 * If not encrypted or already plain text, returns original value gracefully.
 * @param {string} encryptedValue - Encrypted string to decrypt
 * @returns {string|object|any} Decrypted string or parsed JSON object
 */
export const decrypt = (encryptedValue) => {
  if (typeof encryptedValue !== 'string' || !encryptedValue.startsWith(PREFIX)) {
    return encryptedValue;
  }

  try {
    const parts = encryptedValue.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      return encryptedValue;
    }

    const [ivHex, tagHex, encryptedText] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Parse JSON if serialized object/array
    try {
      if ((decrypted.startsWith('{') && decrypted.endsWith('}')) ||
          (decrypted.startsWith('[') && decrypted.endsWith(']'))) {
        return JSON.parse(decrypted);
      }
    } catch {
      // return as plain string
    }

    return decrypted;
  } catch (error) {
    console.warn('[Decryption Warning] Failed to decrypt value:', error.message);
    return encryptedValue;
  }
};

/**
 * Encrypts sensitive fields on a tenant data object before storing in DB
 * @param {Object} tenantData 
 * @returns {Object} tenantData with encrypted sensitive fields
 */
export const encryptTenantData = (tenantData = {}) => {
  if (!tenantData || typeof tenantData !== 'object') return tenantData;
  const clone = JSON.parse(JSON.stringify(tenantData));

  // 1. Encrypt S3 details
  if (clone.config) {
    if (clone.config.s3) {
      if (clone.config.s3.key) clone.config.s3.key = encrypt(clone.config.s3.key);
      if (clone.config.s3.secretKey) clone.config.s3.secretKey = encrypt(clone.config.s3.secretKey);
      if (clone.config.s3.bucket_name) clone.config.s3.bucket_name = encrypt(clone.config.s3.bucket_name);
      if (clone.config.s3.region) clone.config.s3.region = encrypt(clone.config.s3.region);
    }
    if (clone.config.s3BucketName) clone.config.s3BucketName = encrypt(clone.config.s3BucketName);
    if (clone.config.s3Region) clone.config.s3Region = encrypt(clone.config.s3Region);
  }

  // 2. Encrypt Credentials
  if (clone.credentials) {
    if (clone.credentials.superAdminEmail) clone.credentials.superAdminEmail = encrypt(clone.credentials.superAdminEmail);
    if (clone.credentials.adminEmail) clone.credentials.adminEmail = encrypt(clone.credentials.adminEmail);
    if (clone.credentials.superAdminPassword) clone.credentials.superAdminPassword = encrypt(clone.credentials.superAdminPassword);
    if (clone.credentials.adminPassword) clone.credentials.adminPassword = encrypt(clone.credentials.adminPassword);
  }

  // 3. Encrypt Personal Details & Legal Compliance Docs
  if (clone.personalDetails) {
    if (clone.personalDetails.legalDocNumber) clone.personalDetails.legalDocNumber = encrypt(clone.personalDetails.legalDocNumber);
    if (clone.personalDetails.signature) clone.personalDetails.signature = encrypt(clone.personalDetails.signature);
    if (clone.personalDetails.govtIdProof) clone.personalDetails.govtIdProof = encrypt(clone.personalDetails.govtIdProof);
    if (clone.personalDetails.phone1) clone.personalDetails.phone1 = encrypt(clone.personalDetails.phone1);
    if (clone.personalDetails.phone2) clone.personalDetails.phone2 = encrypt(clone.personalDetails.phone2);
    if (clone.personalDetails.residentialAddress) clone.personalDetails.residentialAddress = encrypt(clone.personalDetails.residentialAddress);
    if (clone.personalDetails.businessAddress) clone.personalDetails.businessAddress = encrypt(clone.personalDetails.businessAddress);
  }

  if (clone.legalCompliance) {
    if (clone.legalCompliance.gstCertificate) clone.legalCompliance.gstCertificate = encrypt(clone.legalCompliance.gstCertificate);
    if (clone.legalCompliance.panCardPhoto) clone.legalCompliance.panCardPhoto = encrypt(clone.legalCompliance.panCardPhoto);
    if (clone.legalCompliance.shopLicencePhoto) clone.legalCompliance.shopLicencePhoto = encrypt(clone.legalCompliance.shopLicencePhoto);
    if (clone.legalCompliance.fireSafetyNoc) clone.legalCompliance.fireSafetyNoc = encrypt(clone.legalCompliance.fireSafetyNoc);
  }

  return clone;
};

/**
 * Decrypts sensitive fields on a tenant data object when reading from DB
 * @param {Object} tenantData 
 * @returns {Object} tenantData with decrypted sensitive fields
 */
export const decryptTenantData = (tenantData = {}) => {
  if (!tenantData || typeof tenantData !== 'object') return tenantData;
  const doc = tenantData.toObject ? tenantData.toObject() : JSON.parse(JSON.stringify(tenantData));

  // 1. Decrypt S3 details
  if (doc.config) {
    if (doc.config.s3) {
      if (doc.config.s3.key) doc.config.s3.key = decrypt(doc.config.s3.key);
      if (doc.config.s3.secretKey) doc.config.s3.secretKey = decrypt(doc.config.s3.secretKey);
      if (doc.config.s3.bucket_name) doc.config.s3.bucket_name = decrypt(doc.config.s3.bucket_name);
      if (doc.config.s3.region) doc.config.s3.region = decrypt(doc.config.s3.region);
    }
    if (doc.config.s3BucketName) doc.config.s3BucketName = decrypt(doc.config.s3BucketName);
    if (doc.config.s3Region) doc.config.s3Region = decrypt(doc.config.s3Region);
  }

  // 2. Decrypt Credentials
  if (doc.credentials) {
    if (doc.credentials.superAdminEmail) doc.credentials.superAdminEmail = decrypt(doc.credentials.superAdminEmail);
    if (doc.credentials.adminEmail) doc.credentials.adminEmail = decrypt(doc.credentials.adminEmail);
    if (doc.credentials.superAdminPassword) doc.credentials.superAdminPassword = decrypt(doc.credentials.superAdminPassword);
    if (doc.credentials.adminPassword) doc.credentials.adminPassword = decrypt(doc.credentials.adminPassword);
  }

  // 3. Decrypt Personal Details & Legal Compliance Docs
  if (doc.personalDetails) {
    if (doc.personalDetails.legalDocNumber) doc.personalDetails.legalDocNumber = decrypt(doc.personalDetails.legalDocNumber);
    if (doc.personalDetails.signature) doc.personalDetails.signature = decrypt(doc.personalDetails.signature);
    if (doc.personalDetails.govtIdProof) doc.personalDetails.govtIdProof = decrypt(doc.personalDetails.govtIdProof);
    if (doc.personalDetails.phone1) doc.personalDetails.phone1 = decrypt(doc.personalDetails.phone1);
    if (doc.personalDetails.phone2) doc.personalDetails.phone2 = decrypt(doc.personalDetails.phone2);
    if (doc.personalDetails.residentialAddress) doc.personalDetails.residentialAddress = decrypt(doc.personalDetails.residentialAddress);
    if (doc.personalDetails.businessAddress) doc.personalDetails.businessAddress = decrypt(doc.personalDetails.businessAddress);
  }

  if (doc.legalCompliance) {
    if (doc.legalCompliance.gstCertificate) doc.legalCompliance.gstCertificate = decrypt(doc.legalCompliance.gstCertificate);
    if (doc.legalCompliance.panCardPhoto) doc.legalCompliance.panCardPhoto = decrypt(doc.legalCompliance.panCardPhoto);
    if (doc.legalCompliance.shopLicencePhoto) doc.legalCompliance.shopLicencePhoto = decrypt(doc.legalCompliance.shopLicencePhoto);
    if (doc.legalCompliance.fireSafetyNoc) doc.legalCompliance.fireSafetyNoc = decrypt(doc.legalCompliance.fireSafetyNoc);
  }

  return doc;
};

export default {
  encrypt,
  decrypt,
  encryptTenantData,
  decryptTenantData,
};
