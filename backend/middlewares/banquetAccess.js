import { connectMasterDb } from '../config/dbManager.js';
import tenantSchema from '../models/centralModels/Tenant.js';

export const loadBanquetAccess = async (req, res, next) => {
  try {
    const master = await connectMasterDb();
    const Tenant = master.models.Tenant || master.model('Tenant', tenantSchema);
    const tenant = await Tenant.findOne({ dbName: req.tenantDb.name }).select('config.banquetHallEnabled').lean();
    req.banquetEnabled = tenant?.config?.banquetHallEnabled === true;
    return next();
  } catch (error) {
    console.error('Banquet access check failed:', error);
    return res.status(503).json({ message: 'Unable to verify Banquet Hall access.' });
  }
};

export const requireBanquetAccess = (req, res, next) => {
  if (!req.banquetEnabled) return res.status(403).json({ message: 'Banquet Hall is not enabled for this hotel.' });
  return next();
};
