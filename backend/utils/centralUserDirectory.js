import { connectMasterDb } from '../config/dbManager.js';
import centralUserSchema from '../models/centralModels/CentralUser.js';

export const normalizeDirectoryEmail = (email) => String(email || '').trim().toLowerCase();

export const getCentralUserModel = async () => {
  const master = await connectMasterDb();
  return master.models.CentralUser || master.model('CentralUser', centralUserSchema);
};

export const findCentralUserByEmail = async (email) => {
  const normalizedEmail = normalizeDirectoryEmail(email);
  if (!normalizedEmail) return null;
  const CentralUser = await getCentralUserModel();
  return CentralUser.findOne({ email: normalizedEmail }).lean();
};

export const syncCentralUser = async ({ user, dbName, tenantId = dbName }) => {
  const email = normalizeDirectoryEmail(user?.email);
  if (!email || !user?._id || !dbName) return null;

  const CentralUser = await getCentralUserModel();
  return CentralUser.findOneAndUpdate(
    { dbName: String(dbName).trim(), userId: user._id },
    { $set: {
      email,
      tenantId: String(tenantId || dbName).trim(),
      dbName: String(dbName).trim(),
      userId: user._id,
      role: user.role || 'USER',
      isActive: user.isActive !== false,
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const removeCentralUser = async ({ userId, dbName, email }) => {
  const CentralUser = await getCentralUserModel();
  const normalizedEmail = normalizeDirectoryEmail(email);
  const filters = [];
  if (userId && dbName) filters.push({ userId, dbName });
  if (normalizedEmail) filters.push({ email: normalizedEmail });
  if (filters.length === 0) return null;
  return CentralUser.deleteOne(filters.length === 1 ? filters[0] : { $or: filters });
};

export const syncCentralUserSafely = async (details, context = 'user write') => {
  try {
    return await syncCentralUser(details);
  } catch (error) {
    console.error(`[CentralUserDirectory] Failed to sync after ${context}:`, error.message);
    return null;
  }
};

export const removeCentralUserSafely = async (details, context = 'user delete') => {
  try {
    return await removeCentralUser(details);
  } catch (error) {
    console.error(`[CentralUserDirectory] Failed to remove after ${context}:`, error.message);
    return null;
  }
};
