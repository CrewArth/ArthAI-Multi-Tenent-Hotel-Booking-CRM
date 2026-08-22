import crypto from 'crypto';
import { connectCentralDb, getTenantDb } from '../config/db.js';
import tenantSchema from '../models/Tenant.js';
import userSchema from '../../backend/models/tenantModels/User.js';
import taxSchema from '../../backend/models/tenantModels/Tax.js';
import guestHouseSchema from '../../backend/models/tenantModels/GuestHouse.js';
import roomSchema from '../../backend/models/tenantModels/Room.js';
import bookingSchema from '../../backend/models/tenantModels/Booking.js';
import { generateTenantCredentials } from '../utils/credentialGenerator.js';
import { sendWelcomeCredentialsEmail } from '../utils/emailService.js';

const getCentralTenantModel = async () => {
  const master = await connectCentralDb();
  return master.models.Tenant || master.model('Tenant', tenantSchema);
};

export const getDashboardSummary = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();

    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.isActive).length;
    const inactiveTenants = totalTenants - activeTenants;

    const planDistribution = {
      basic: tenants.filter((t) => t.plan === 'basic').length,
      pro: tenants.filter((t) => t.plan === 'pro').length,
      enterprise: tenants.filter((t) => t.plan === 'enterprise').length,
    };

    let aggregateRooms = 0;
    let aggregateBookings = 0;
    let aggregateGuestHouses = 0;

    const sampleActiveTenants = tenants.filter(t => t.isActive).slice(0, 10);
    await Promise.all(
      sampleActiveTenants.map(async (t) => {
        try {
          const tenantDb = await getTenantDb(t.dbName);
          const GuestHouse = tenantDb.models.GuestHouse || tenantDb.model('GuestHouse', guestHouseSchema);
          const Room = tenantDb.models.Room || tenantDb.model('Room', roomSchema);
          const Booking = tenantDb.models.Booking || tenantDb.model('Booking', bookingSchema);

          const [ghCount, roomCount, bookingCount] = await Promise.all([
            GuestHouse.countDocuments(),
            Room.countDocuments(),
            Booking.countDocuments(),
          ]);

          aggregateGuestHouses += ghCount;
          aggregateRooms += roomCount;
          aggregateBookings += bookingCount;
        } catch (err) {
          console.warn(`[Dashboard Telemetry Warning] Failed reading stats for ${t.dbName}:`, err.message);
        }
      })
    );

    return res.json({
      summary: {
        totalTenants,
        activeTenants,
        inactiveTenants,
        planDistribution,
        telemetry: {
          aggregateGuestHouses,
          aggregateRooms,
          aggregateBookings,
        },
      },
      tenants,
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({ message: error.message || 'Server error while fetching dashboard' });
  }
};

export const provisionTenant = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const { name, tenantId, ownerName, ownerEmail, ownerPhone, plan, s3BucketName, s3Region, dbName: customDbName } = req.body;

    if (!name || !tenantId || !ownerEmail || !ownerName) {
      return res.status(400).json({ message: "Tenant name, tenantId (slug), ownerName, and ownerEmail are required" });
    }

    const slug = tenantId.toLowerCase().trim();
    const dbName = customDbName ? customDbName.trim() : slug;

    const existing = await Tenant.findOne({ $or: [{ tenantId: slug }, { dbName }] });
    if (existing) {
      return res.status(409).json({ message: `Tenant with slug '${slug}' or database '${dbName}' already exists` });
    }

    const credentials = generateTenantCredentials(slug, ownerEmail);

    const tenant = await Tenant.create({
      tenantId: slug,
      name: name.trim(),
      dbName,
      plan: plan || 'pro',
      owner: {
        name: ownerName.trim(),
        email: ownerEmail.toLowerCase().trim(),
        phone: ownerPhone ? ownerPhone.trim() : '',
      },
      config: {
        siteName: name.trim(),
        s3BucketName: s3BucketName || null,
        s3Region: s3Region || null,
      },
      credentials: {
        superAdminEmail: credentials.superAdmin.email,
        adminEmail: credentials.admin.email,
      },
    });

    const tenantDb = await getTenantDb(dbName);
    const User = tenantDb.models.User || tenantDb.model('User', userSchema);
    const Tax = tenantDb.models.Tax || tenantDb.model('Tax', taxSchema);

    const defaultTaxes = [
      { name: 'GST', percentage: 12, isActive: true },
      { name: 'Service Tax', percentage: 5, isActive: true },
    ];
    for (const tax of defaultTaxes) {
      const exists = await Tax.findOne({ name: tax.name });
      if (!exists) await Tax.create(tax);
    }

    const superAdminSecret = crypto.randomBytes(40).toString('hex');
    await User.create({
      firstName: ownerName.split(' ')[0] || 'Tenant',
      lastName: ownerName.split(' ').slice(1).join(' ') || 'SuperAdmin',
      email: credentials.superAdmin.email,
      password: credentials.superAdmin.password,
      role: 'SUPER_ADMIN',
      phone: ownerPhone ? ownerPhone.trim() : undefined,
      isActive: true,
      login_secret_key: superAdminSecret,
    });

    const adminSecret = crypto.randomBytes(40).toString('hex');
    await User.create({
      firstName: ownerName.split(' ')[0] || 'GuestHouse',
      lastName: 'Manager',
      email: credentials.admin.email,
      password: credentials.admin.password,
      role: 'ADMIN',
      isActive: true,
      login_secret_key: adminSecret,
    });

    sendWelcomeCredentialsEmail({
      ownerEmail: ownerEmail.toLowerCase().trim(),
      ownerName: ownerName.trim(),
      tenantName: name.trim(),
      credentials,
    }).catch(err => console.error("Email send error:", err));

    return res.status(201).json({
      message: "Tenant provisioned successfully",
      tenant,
      generatedCredentials: {
        superAdmin: {
          email: credentials.superAdmin.email,
          password: credentials.superAdmin.password,
        },
        admin: {
          email: credentials.admin.email,
          password: credentials.admin.password,
        },
      },
    });
  } catch (error) {
    console.error("Tenant provisioning error:", error);
    return res.status(500).json({ message: error.message || "Failed to provision tenant" });
  }
};

export const listTenants = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    return res.json({ tenants });
  } catch (error) {
    console.error("Error listing tenants:", error);
    return res.status(500).json({ message: "Unable to list tenants" });
  }
};

export const toggleTenantStatus = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const { tenantId } = req.params;
    const tenant = await Tenant.findOne({ tenantId: tenantId.toLowerCase().trim() });

    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    tenant.isActive = !tenant.isActive;
    await tenant.save();

    return res.json({
      message: tenant.isActive ? "Tenant activated" : "Tenant deactivated",
      tenant,
    });
  } catch (error) {
    console.error("Error toggling tenant status:", error);
    return res.status(500).json({ message: "Unable to update tenant status" });
  }
};

export const updateTenantPlan = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const { tenantId } = req.params;
    const { plan } = req.body;

    const validPlans = ['basic', 'pro', 'enterprise'];
    if (!plan || !validPlans.includes(plan.toLowerCase().trim())) {
      return res.status(400).json({ message: "Invalid plan. Valid options: basic, pro, enterprise" });
    }

    const tenant = await Tenant.findOne({ tenantId: tenantId.toLowerCase().trim() });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    tenant.plan = plan.toLowerCase().trim();
    await tenant.save();

    return res.json({
      message: `Tenant subscription updated to ${tenant.plan.toUpperCase()}`,
      tenant,
    });
  } catch (error) {
    console.error("Error updating tenant plan:", error);
    return res.status(500).json({ message: "Unable to update tenant subscription plan" });
  }
};

export const getPlatformStats = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const [totalTenants, activeTenants] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ isActive: true }),
    ]);

    return res.json({
      stats: {
        totalTenants,
        activeTenants,
        inactiveTenants: totalTenants - activeTenants,
      },
    });
  } catch (error) {
    console.error("Error getting platform stats:", error);
    return res.status(500).json({ message: "Unable to fetch platform stats" });
  }
};
