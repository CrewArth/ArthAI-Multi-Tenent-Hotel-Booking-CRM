import mongoose from 'mongoose';
import initTenantModels from '../models/tenantModels/index.js';

let masterConn = null;

/**
 * Connects to the primary MongoDB cluster database (default: guesthouse_central).
 */
export const connectMasterDb = async () => {
  if (masterConn && masterConn.readyState === 1) {
    return masterConn;
  }

  const baseUri = process.env.MONGODB_URI;
  if (!baseUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  masterConn = await mongoose.createConnection(baseUri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  console.log('[Multi-Tenant] Master MongoDB Cluster connection established.');
  return masterConn;
};

/**
 * Returns a tenant-scoped Mongoose connection utilizing .useDb(dbName, { useCache: true }).
 * @param {string} dbName - Tenant database name (e.g. 'gh_tenant_default')
 */
export const getTenantDb = async (dbName) => {
  if (!dbName) {
    throw new Error('Tenant dbName is required');
  }

  const master = await connectMasterDb();
  const tenantConn = master.useDb(dbName, { useCache: true });

  // Initialize and register all schemas on this tenant connection
  initTenantModels(tenantConn);

  return tenantConn;
};

export default {
  connectMasterDb,
  getTenantDb,
};
