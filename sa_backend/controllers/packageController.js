import { connectCentralDb } from '../config/db.js';
import packageSchema from '../../backend/models/centralModels/Package.js';
import { SUBSCRIPTION_PLANS } from '../../backend/config/subscriptionLimits.js';

const getPackageModel = async () => {
  const master = await connectCentralDb();
  return master.models.Package || master.model('Package', packageSchema);
};

const normalizeSlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const ensureDefaultPackages = async (Package) => {
  const operations = Object.entries(SUBSCRIPTION_PLANS).map(([slug, limits]) => ({
    updateOne: {
      filter: { slug },
      update: { $setOnInsert: {
        planName: limits.name,
        slug,
        maxHotels: limits.maxHotels,
        maxRooms: limits.maxRoomsPerHotel,
        maxAdmins: limits.maxAdminsPerHotel,
        isSystem: true,
      } },
      upsert: true,
    },
  }));

  await Package.bulkWrite(operations, { ordered: false });
};

export const listPackages = async (req, res) => {
  try {
    const Package = await getPackageModel();
    await ensureDefaultPackages(Package);
    const packages = await Package.find().sort({ isSystem: -1, createdAt: 1 }).lean();
    return res.json({ packages });
  } catch (error) {
    console.error('Error listing packages:', error);
    return res.status(500).json({ message: 'Unable to fetch packages' });
  }
};

export const createPackage = async (req, res) => {
  try {
    const planName = String(req.body.planName || '').trim();
    const slug = normalizeSlug(planName);
    const maxHotels = Number(req.body.maxHotels);
    const maxRooms = Number(req.body.maxRooms);
    const maxAdmins = Number(req.body.maxAdmins);

    if (!planName || !slug) {
      return res.status(400).json({ message: 'Plan Name is required' });
    }

    if (![maxHotels, maxRooms, maxAdmins].every(Number.isInteger) ||
        [maxHotels, maxRooms, maxAdmins].some((value) => value < 1)) {
      return res.status(400).json({ message: 'Package limits must be positive whole numbers' });
    }

    const Package = await getPackageModel();
    await ensureDefaultPackages(Package);
    const createdPackage = await Package.create({
      planName,
      slug,
      maxHotels,
      maxRooms,
      maxAdmins,
    });

    return res.status(201).json({
      message: 'Package created successfully',
      package: createdPackage,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A package with this Plan Name already exists' });
    }
    console.error('Error creating package:', error);
    return res.status(500).json({ message: 'Unable to create package' });
  }
};
