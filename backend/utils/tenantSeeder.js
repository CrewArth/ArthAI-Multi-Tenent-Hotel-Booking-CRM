import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getTenantDb } from '../config/dbManager.js';

export const seedTenantDb = async ({ tenantId, dbName, adminEmail, adminPassword, firstName = 'Tenant', lastName = 'Admin' }) => {
  const tenantDb = await getTenantDb(dbName);
  const { Tax, User } = tenantDb.models;

  // 1. Seed Default Tax entries if missing
  const defaultTaxes = [
    { name: 'GST', percentage: 12, isActive: true },
    { name: 'Service Tax', percentage: 5, isActive: true },
  ];

  for (const taxData of defaultTaxes) {
    const exists = await Tax.findOne({ name: taxData.name });
    if (!exists) {
      await Tax.create(taxData);
    }
  }

  // 2. Create initial Tenant SUPER_ADMIN user if adminEmail provided
  let adminUser = null;
  if (adminEmail && adminPassword) {
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    if (!existingAdmin) {
      const secretKey = crypto.randomBytes(40).toString('hex');
      adminUser = await User.create({
        firstName,
        lastName,
        email: adminEmail.toLowerCase().trim(),
        password: adminPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
        login_secret_key: secretKey,
        last_login: new Date(),
      });
      console.log(`[Seeder] Initial SUPER_ADMIN created for tenant '${tenantId}': ${adminEmail}`);
    } else {
      adminUser = existingAdmin;
    }
  }

  return { tenantDb, adminUser };
};
