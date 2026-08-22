import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../sa_backend/.env') });

import { connectMasterDb, getTenantDb } from '../config/dbManager.js';
import tenantSchema from '../models/centralModels/Tenant.js';

const runInspect = async () => {
  const master = await connectMasterDb();
  const Tenant = master.model('Tenant', tenantSchema);

  const tenants = await Tenant.find({ tenantId: 'hyatt_hotel' }).lean();
  console.log('📋 Hyatt Tenant Info:');
  console.log(JSON.stringify(tenants, null, 2));

  const targetEmail = 'hyatt_hotel_superadmin@admin.in';
  console.log(`\n🔍 Searching for user '${targetEmail}' across tenant database 'hyatt_hotel'...`);

  for (const t of tenants) {
    try {
      const tDb = await getTenantDb(t.dbName);
      const User = tDb.model('User');
      const allUsers = await User.find().lean();
      console.log(`\nAll users in DB '${t.dbName}':`, allUsers);

      const user = await User.findOne({ email: targetEmail }).lean();
      if (user) {
        console.log(`\n✅ FOUND USER '${targetEmail}' in DB '${t.dbName}'! Role: ${user.role}, Active: ${user.isActive}`);
      } else {
        console.log(`\n❌ User '${targetEmail}' NOT FOUND in DB '${t.dbName}'!`);
      }
    } catch (err) {
      console.error(`Error inspecting DB '${t.dbName}':`, err.message);
    }
  }

  process.exit(0);
};

runInspect();
