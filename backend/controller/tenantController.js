import { connectMasterDb } from '../config/dbManager.js';
import tenantSchema from '../models/centralModels/Tenant.js';
import { seedTenantDb } from '../utils/tenantSeeder.js';

const getCentralTenantModel = async () => {
  const master = await connectMasterDb();
  return master.model('Tenant', tenantSchema);
};

// POST /api/tenants - Create / Onboard a new Tenant
export const createTenant = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const { name, tenantId, adminEmail, adminPassword, firstName, lastName, plan, config, dbName: customDbName } = req.body;

    if (!name || !tenantId) {
      return res.status(400).json({ message: "Tenant name and tenantId (slug) are required" });
    }

    const slug = tenantId.toLowerCase().trim();
    const dbName = customDbName ? customDbName.trim() : slug;

    const existing = await Tenant.findOne({ $or: [{ tenantId: slug }, { dbName }] });
    if (existing) {
      return res.status(409).json({ message: "Tenant ID or Database Name already registered" });
    }

    const tenant = await Tenant.create({
      tenantId: slug,
      name: name.trim(),
      dbName,
      plan: plan || 'pro',
      config: config || {},
    });

    let seedResult = {};
    if (adminEmail && adminPassword) {
      seedResult = await seedTenantDb({
        tenantId: slug,
        dbName,
        adminEmail,
        adminPassword,
        firstName,
        lastName,
      });
    }

    return res.status(201).json({
      message: "Tenant provisioned successfully",
      tenant,
      adminCreated: !!seedResult.adminUser,
    });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return res.status(500).json({ message: error.message || "Failed to create tenant" });
  }
};

// GET /api/tenants - List all registered tenants
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

// GET /api/tenants/:slug - Get single tenant info by slug/tenantId
export const getTenantBySlug = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const { slug } = req.params;
    const tenant = await Tenant.findOne({ tenantId: slug.toLowerCase().trim(), isActive: true });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    return res.json({ tenant });
  } catch (error) {
    console.error("Error getting tenant:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
