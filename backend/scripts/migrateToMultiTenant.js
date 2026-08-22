import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectMasterDb, getTenantDb } from '../config/dbManager.js';
import tenantSchema from '../models/centralModels/Tenant.js';

const migrate = async () => {
  try {
    console.log('🚀 Starting Multi-Tenant Registration & Migration...');

    const masterConn = await connectMasterDb();
    const Tenant = masterConn.model('Tenant', tenantSchema);

    const defaultTenantId = 'arth';
    const defaultTenantName = 'Arth Guest House';
    const defaultDbName = process.env.DEFAULT_TENANT_DB || 'guesthouses';

    let tenant = await Tenant.findOne({ tenantId: defaultTenantId });
    if (!tenant) {
      tenant = await Tenant.create({
        tenantId: defaultTenantId,
        name: defaultTenantName,
        dbName: defaultDbName,
        isActive: true,
        plan: 'enterprise',
        config: {
          siteName: defaultTenantName,
        },
      });
      console.log(`✅ Default Tenant '${defaultTenantName}' registered in central DB.`);
    } else {
      console.log(`ℹ️ Default Tenant '${defaultTenantName}' already registered.`);
    }

    const tenantDb = await getTenantDb(defaultDbName);
    const User = tenantDb.model('User');

    const usersWithoutSecret = await User.find({ login_secret_key: { $in: [null, undefined] } });
    if (usersWithoutSecret.length > 0) {
      for (const u of usersWithoutSecret) {
        u.login_secret_key = crypto.randomBytes(40).toString('hex');
        await u.save({ validateBeforeSave: false });
      }
      console.log(`✅ Initialized session secret keys for ${usersWithoutSecret.length} users in '${defaultDbName}'.`);
    }

    console.log('🎉 Multi-Tenant Migration & Registration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
