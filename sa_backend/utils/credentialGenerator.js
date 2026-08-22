import crypto from 'crypto';

/**
 * Generates a random secure password containing letters, numbers, and special characters.
 */
export const generateSecurePassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
};

/**
 * Auto-generates initial Tenant Super Admin and Tenant Admin credential pairs.
 * @param {string} tenantSlug - e.g. "taj"
 * @param {string} ownerEmail - e.g. "owner@tajhotels.com"
 */
export const generateTenantCredentials = (tenantSlug, ownerEmail) => {
  const cleanSlug = tenantSlug.toLowerCase().trim();
  const domain = ownerEmail.includes('@') ? ownerEmail.split('@')[1] : 'guesthouse.com';

  const superAdminEmail = `${cleanSlug}_superadmin@${domain}`;
  const superAdminPassword = generateSecurePassword(12);

  const adminEmail = `${cleanSlug}_admin@${domain}`;
  const adminPassword = generateSecurePassword(12);

  return {
    superAdmin: {
      email: superAdminEmail,
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
    admin: {
      email: adminEmail,
      password: adminPassword,
      role: 'ADMIN',
    },
  };
};
