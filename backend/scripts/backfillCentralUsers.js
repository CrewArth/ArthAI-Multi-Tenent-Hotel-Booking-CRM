import dotenv from 'dotenv';
import { connectMasterDb, getTenantDb } from '../config/dbManager.js';
import tenantSchema from '../models/centralModels/Tenant.js';
import centralUserSchema from '../models/centralModels/CentralUser.js';

dotenv.config();

const BATCH_SIZE = 500;

const run = async () => {
  const master = await connectMasterDb();
  const Tenant = master.models.Tenant || master.model('Tenant', tenantSchema);
  const CentralUser = master.models.CentralUser || master.model('CentralUser', centralUserSchema);

  await CentralUser.init();

  const tenants = await Tenant.find({ dbName: { $exists: true, $ne: '' } })
    .select('tenantId dbName')
    .lean();

  let scanned = 0;
  let synced = 0;
  const failures = [];

  for (const tenant of tenants) {
    try {
      const flush = async (operations) => {
        if (operations.length === 0) return;
        try {
          await CentralUser.bulkWrite(operations, { ordered: false });
          synced += operations.length;
        } catch (error) {
          const writeErrors = error.writeErrors || [];
          failures.push({
            tenant: tenant.tenantId || tenant.dbName,
            message: error.message,
            conflicts: writeErrors.map((item) => item.err?.op?.q || item.err?.op?.u?.$set?.email).filter(Boolean),
          });
          console.error(`[CentralUserBackfill] Batch issue for tenant '${tenant.tenantId || tenant.dbName}':`, error.message);
        }
      };

      const tenantDb = await getTenantDb(tenant.dbName);
      const User = tenantDb.models.User || tenantDb.model('User');
      const cursor = User.find({ email: { $exists: true, $nin: [null, ''] } })
        .select('_id email role isActive')
        .lean()
        .cursor();

      let operations = [];
      for await (const user of cursor) {
        scanned += 1;
        operations.push({
          updateOne: {
            filter: { dbName: tenant.dbName, userId: user._id },
            update: { $set: {
              email: String(user.email).trim().toLowerCase(),
              tenantId: tenant.tenantId || tenant.dbName,
              dbName: tenant.dbName,
              userId: user._id,
              role: user.role || 'USER',
              isActive: user.isActive !== false,
            } },
            upsert: true,
          },
        });

        if (operations.length >= BATCH_SIZE) {
          await flush(operations);
          operations = [];
        }
      }

      await flush(operations);

      console.log(`[CentralUserBackfill] Completed tenant '${tenant.tenantId || tenant.dbName}'`);
    } catch (error) {
      failures.push({ tenant: tenant.tenantId || tenant.dbName, message: error.message });
      console.error(`[CentralUserBackfill] Failed tenant '${tenant.tenantId || tenant.dbName}':`, error.message);
    }
  }

  console.log(`[CentralUserBackfill] Scanned ${scanned}; sync operations completed ${synced}; reported issues ${failures.length}`);
  if (failures.length > 0) {
    console.error('[CentralUserBackfill] Failures:', failures);
    process.exitCode = 1;
  }

  await master.close();
};

run().catch((error) => {
  console.error('[CentralUserBackfill] Fatal error:', error);
  process.exit(1);
});
