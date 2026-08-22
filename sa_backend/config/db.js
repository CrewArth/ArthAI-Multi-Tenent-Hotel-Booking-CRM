import mongoose from 'mongoose';

let centralConn = null;

/**
 * Connects to Central Control Database (guesthouse_central).
 */
export const connectCentralDb = async () => {
  if (centralConn && centralConn.readyState === 1) {
    return centralConn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in sa_backend environment');
  }

  centralConn = await mongoose.createConnection(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  console.log('[sa_backend] Connected to Central Control Database (guesthouse_central)');
  return centralConn;
};

/**
 * Returns a Mongoose Connection instance bound to a tenant database namespace.
 */
export const getTenantDb = async (dbName) => {
  const master = await connectCentralDb();
  return master.useDb(dbName, { useCache: true });
};

export default {
  connectCentralDb,
  getTenantDb,
};
