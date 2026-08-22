import { connectMasterDb } from './dbManager.js';

const connectDb = async () => {
  return await connectMasterDb();
};

export default connectDb;
