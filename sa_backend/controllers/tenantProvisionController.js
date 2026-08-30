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
import { uploadBase64Document } from '../utils/s3UploadService.js';
import { encrypt, decrypt, encryptTenantData, decryptTenantData } from '../utils/encryption.js';

const getCentralTenantModel = async () => {
  const master = await connectCentralDb();
  return master.models.Tenant || master.model('Tenant', tenantSchema);
};

export const getDashboardSummary = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();

    const tenantsRaw = await Tenant.find().sort({ createdAt: -1 }).lean();
    const tenants = tenantsRaw.map((t) => decryptTenantData(t));

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
    const { 
      name, tenantId, ownerName, ownerEmail, ownerPhone, plan, 
      s3BucketName, s3Region, dbName: customDbName,
      personalDetails, hotelDetails, legalCompliance 
    } = req.body;

    const resolvedName = (name || hotelDetails?.hotelName || '').trim();
    const resolvedTenantId = (tenantId || '').trim();
    const resolvedOwnerName = (ownerName || personalDetails?.fullName || '').trim();
    const resolvedOwnerEmail = (ownerEmail || personalDetails?.email1 || '').trim();
    const resolvedOwnerPhone = (ownerPhone || personalDetails?.phone1 || '').trim();

    if (!resolvedName || !resolvedTenantId || !resolvedOwnerEmail || !resolvedOwnerName) {
      return res.status(400).json({ message: "Tenant name, tenantId (slug), ownerName, and ownerEmail are required" });
    }

    const slug = resolvedTenantId.toLowerCase().trim();
    const dbName = customDbName ? customDbName.trim() : slug;

    const existing = await Tenant.findOne({ $or: [{ tenantId: slug }, { dbName }] });
    if (existing) {
      return res.status(409).json({ message: `Tenant with slug '${slug}' or database '${dbName}' already exists` });
    }

    const s3Config = {
      bucketName: s3BucketName || process.env.AWS_S3_BUCKET,
      region: s3Region || process.env.AWS_REGION,
    };

    // Upload Onboarding Files to S3 / Storage
    const [signatureUrl, govtIdUrl, logoUrl, gstUrl, panUrl, shopLicenceUrl, fireNocUrl] = await Promise.all([
      uploadBase64Document({ base64Data: personalDetails?.signature, tenantId: slug, category: 'onboarding', fileLabel: 'signature', s3Config }),
      uploadBase64Document({ base64Data: personalDetails?.govtIdProof, tenantId: slug, category: 'onboarding', fileLabel: 'govt_id', s3Config }),
      uploadBase64Document({ base64Data: hotelDetails?.hotelLogo, tenantId: slug, category: 'branding', fileLabel: 'logo', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.gstCertificate, tenantId: slug, category: 'compliance', fileLabel: 'gst_certificate', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.panCardPhoto, tenantId: slug, category: 'compliance', fileLabel: 'pan_card', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.shopLicencePhoto, tenantId: slug, category: 'compliance', fileLabel: 'shop_licence', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.fireSafetyNoc, tenantId: slug, category: 'compliance', fileLabel: 'fire_noc', s3Config }),
    ]);

    const credentials = generateTenantCredentials(slug, resolvedOwnerEmail);

    const parsedExpiry = req.body.expiryDate || hotelDetails?.expiryDate;

    const tenantData = {
      tenantId: slug,
      name: resolvedName,
      dbName,
      plan: plan || 'pro',
      expiryDate: parsedExpiry ? new Date(parsedExpiry) : null,
      owner: {
        name: resolvedOwnerName,
        email: resolvedOwnerEmail.toLowerCase(),
        phone: resolvedOwnerPhone,
      },
      config: {
        siteName: resolvedName,
        s3BucketName: s3BucketName || null,
        s3Region: s3Region || null,
        logoUrl: logoUrl || null,
        s3: req.body.config?.s3 ? {
          key: req.body.config.s3.key || null,
          secretKey: req.body.config.s3.secretKey || null,
          bucket_name: req.body.config.s3.bucket_name || s3BucketName || null,
          region: req.body.config.s3.region || s3Region || null,
        } : undefined,
      },
      credentials: {
        superAdminEmail: credentials.superAdmin.email,
        adminEmail: credentials.admin.email,
        superAdminPassword: credentials.superAdmin.password,
        adminPassword: credentials.admin.password,
      },
      personalDetails: personalDetails ? {
        fullName: personalDetails.fullName || resolvedOwnerName,
        signature: signatureUrl || personalDetails.signature || '',
        phone1: personalDetails.phone1 || resolvedOwnerPhone,
        phone2: personalDetails.phone2 || '',
        email1: personalDetails.email1 || resolvedOwnerEmail,
        email2: personalDetails.email2 || '',
        legalDocNumber: personalDetails.legalDocNumber || '',
        residentialAddress: personalDetails.residentialAddress || '',
        businessAddress: personalDetails.businessAddress || '',
        govtIdProof: govtIdUrl || personalDetails.govtIdProof || '',
      } : undefined,
      hotelDetails: hotelDetails ? {
        legalPropertyName: hotelDetails.legalPropertyName || resolvedName,
        hotelName: hotelDetails.hotelName || resolvedName,
        propertyType: hotelDetails.propertyType || 'Hotel',
        hotelLogo: logoUrl || hotelDetails.hotelLogo || '',
      } : undefined,
      legalCompliance: legalCompliance ? {
        gstCertificate: gstUrl || legalCompliance.gstCertificate || '',
        panCardPhoto: panUrl || legalCompliance.panCardPhoto || '',
        shopLicencePhoto: shopLicenceUrl || legalCompliance.shopLicencePhoto || '',
        fireSafetyNoc: fireNocUrl || legalCompliance.fireSafetyNoc || '',
      } : undefined,
    };

    const encryptedTenant = encryptTenantData(tenantData);
    const tenant = await Tenant.create(encryptedTenant);

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
      firstName: resolvedOwnerName.split(' ')[0] || 'Tenant',
      lastName: resolvedOwnerName.split(' ').slice(1).join(' ') || 'SuperAdmin',
      email: credentials.superAdmin.email,
      password: credentials.superAdmin.password,
      role: 'SUPER_ADMIN',
      phone: resolvedOwnerPhone ? resolvedOwnerPhone.trim() : undefined,
      isActive: true,
      login_secret_key: superAdminSecret,
    });

    const adminSecret = crypto.randomBytes(40).toString('hex');
    await User.create({
      firstName: resolvedOwnerName.split(' ')[0] || 'GuestHouse',
      lastName: 'Manager',
      email: credentials.admin.email,
      password: credentials.admin.password,
      role: 'ADMIN',
      isActive: true,
      login_secret_key: adminSecret,
    });

    sendWelcomeCredentialsEmail({
      ownerEmail: resolvedOwnerEmail.toLowerCase().trim(),
      ownerName: resolvedOwnerName,
      tenantName: resolvedName,
      credentials,
    }).catch(err => console.error("Email send error:", err));

    return res.status(201).json({
      message: "Tenant provisioned successfully",
      tenant: decryptTenantData(tenant),
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
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
    return res.json({ tenants: tenants.map(t => decryptTenantData(t)) });
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
      tenant: decryptTenantData(tenant),
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
      tenant: decryptTenantData(tenant),
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

export const getTenantByTenantId = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const { tenantId } = req.params;
    const cleanId = tenantId.toLowerCase().trim();

    const tenant = await Tenant.findOne({
      $or: [{ tenantId: cleanId }, { dbName: cleanId }]
    }).lean();

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    return res.json({ tenant: decryptTenantData(tenant) });
  } catch (error) {
    console.error("Error fetching single tenant:", error);
    return res.status(500).json({ message: "Failed to fetch tenant details" });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const Tenant = await getCentralTenantModel();
    const { tenantId } = req.params;
    const cleanId = tenantId.toLowerCase().trim();

    const tenant = await Tenant.findOne({
      $or: [{ tenantId: cleanId }, { dbName: cleanId }]
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const { 
      name, plan, expiryDate, personalDetails, hotelDetails, legalCompliance,
      s3BucketName, s3Region 
    } = req.body;

    const s3Config = {
      bucketName: s3BucketName || decrypt(tenant.config?.s3BucketName) || process.env.AWS_S3_BUCKET,
      region: s3Region || decrypt(tenant.config?.s3Region) || process.env.AWS_REGION,
    };

    // Process new Base64 uploads if present
    const [signatureUrl, govtIdUrl, logoUrl, gstUrl, panUrl, shopLicenceUrl, fireNocUrl] = await Promise.all([
      uploadBase64Document({ base64Data: personalDetails?.signature, tenantId: cleanId, category: 'onboarding', fileLabel: 'signature', s3Config }),
      uploadBase64Document({ base64Data: personalDetails?.govtIdProof, tenantId: cleanId, category: 'onboarding', fileLabel: 'govt_id', s3Config }),
      uploadBase64Document({ base64Data: hotelDetails?.hotelLogo, tenantId: cleanId, category: 'branding', fileLabel: 'logo', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.gstCertificate, tenantId: cleanId, category: 'compliance', fileLabel: 'gst_certificate', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.panCardPhoto, tenantId: cleanId, category: 'compliance', fileLabel: 'pan_card', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.shopLicencePhoto, tenantId: cleanId, category: 'compliance', fileLabel: 'shop_licence', s3Config }),
      uploadBase64Document({ base64Data: legalCompliance?.fireSafetyNoc, tenantId: cleanId, category: 'compliance', fileLabel: 'fire_noc', s3Config }),
    ]);

    const resolvedName = (name || hotelDetails?.hotelName || tenant.name).trim();
    tenant.name = resolvedName;
    if (plan) tenant.plan = plan.toLowerCase().trim();

    const parsedExpiry = expiryDate !== undefined ? expiryDate : hotelDetails?.expiryDate;
    if (parsedExpiry !== undefined) {
      tenant.expiryDate = parsedExpiry ? new Date(parsedExpiry) : null;
    }

    if (personalDetails?.fullName) {
      tenant.owner.name = personalDetails.fullName.trim();
    }
    if (personalDetails?.email1) {
      tenant.owner.email = personalDetails.email1.toLowerCase().trim();
    }
    if (personalDetails?.phone1) {
      tenant.owner.phone = personalDetails.phone1.trim();
    }

    if (logoUrl) tenant.config.logoUrl = logoUrl;
    tenant.config.siteName = resolvedName;
    if (s3BucketName !== undefined) tenant.config.s3BucketName = encrypt(s3BucketName);
    if (s3Region !== undefined) tenant.config.s3Region = encrypt(s3Region);
    if (req.body.config?.s3) {
      tenant.config.s3 = {
        key: req.body.config.s3.key ? encrypt(req.body.config.s3.key) : tenant.config.s3?.key,
        secretKey: req.body.config.s3.secretKey ? encrypt(req.body.config.s3.secretKey) : tenant.config.s3?.secretKey,
        bucket_name: req.body.config.s3.bucket_name ? encrypt(req.body.config.s3.bucket_name) : (s3BucketName ? encrypt(s3BucketName) : tenant.config.s3?.bucket_name),
        region: req.body.config.s3.region ? encrypt(req.body.config.s3.region) : (s3Region ? encrypt(s3Region) : tenant.config.s3?.region),
      };
    }

    // Update nested objects while retaining existing encrypted values if not replaced
    const decryptedPersonal = decryptTenantData(tenant).personalDetails || {};
    const updatedPersonal = {
      fullName: personalDetails?.fullName || decryptedPersonal.fullName || tenant.owner.name,
      signature: signatureUrl || personalDetails?.signature || decryptedPersonal.signature || '',
      phone1: personalDetails?.phone1 || decryptedPersonal.phone1 || tenant.owner.phone,
      phone2: personalDetails?.phone2 || decryptedPersonal.phone2 || '',
      email1: personalDetails?.email1 || decryptedPersonal.email1 || tenant.owner.email,
      email2: personalDetails?.email2 || decryptedPersonal.email2 || '',
      legalDocNumber: personalDetails?.legalDocNumber || decryptedPersonal.legalDocNumber || '',
      residentialAddress: personalDetails?.residentialAddress || decryptedPersonal.residentialAddress || '',
      businessAddress: personalDetails?.businessAddress || decryptedPersonal.businessAddress || '',
      govtIdProof: govtIdUrl || personalDetails?.govtIdProof || decryptedPersonal.govtIdProof || '',
    };

    tenant.personalDetails = {
      fullName: updatedPersonal.fullName,
      signature: encrypt(updatedPersonal.signature),
      phone1: encrypt(updatedPersonal.phone1),
      phone2: encrypt(updatedPersonal.phone2),
      email1: updatedPersonal.email1,
      email2: updatedPersonal.email2,
      legalDocNumber: encrypt(updatedPersonal.legalDocNumber),
      residentialAddress: encrypt(updatedPersonal.residentialAddress),
      businessAddress: encrypt(updatedPersonal.businessAddress),
      govtIdProof: encrypt(updatedPersonal.govtIdProof),
    };

    tenant.hotelDetails = {
      legalPropertyName: hotelDetails?.legalPropertyName || tenant.hotelDetails?.legalPropertyName || resolvedName,
      hotelName: resolvedName,
      propertyType: hotelDetails?.propertyType || tenant.hotelDetails?.propertyType || 'Hotel',
      hotelLogo: logoUrl || hotelDetails?.hotelLogo || tenant.hotelDetails?.hotelLogo || '',
    };

    const decryptedCompliance = decryptTenantData(tenant).legalCompliance || {};
    const updatedCompliance = {
      gstCertificate: gstUrl || legalCompliance?.gstCertificate || decryptedCompliance.gstCertificate || '',
      panCardPhoto: panUrl || legalCompliance?.panCardPhoto || decryptedCompliance.panCardPhoto || '',
      shopLicencePhoto: shopLicenceUrl || legalCompliance?.shopLicencePhoto || decryptedCompliance.shopLicencePhoto || '',
      fireSafetyNoc: fireNocUrl || legalCompliance?.fireSafetyNoc || decryptedCompliance.fireSafetyNoc || '',
    };

    tenant.legalCompliance = {
      gstCertificate: encrypt(updatedCompliance.gstCertificate),
      panCardPhoto: encrypt(updatedCompliance.panCardPhoto),
      shopLicencePhoto: encrypt(updatedCompliance.shopLicencePhoto),
      fireSafetyNoc: encrypt(updatedCompliance.fireSafetyNoc),
    };

    await tenant.save();

    return res.json({
      message: "Tenant details updated successfully",
      tenant: decryptTenantData(tenant),
    });
  } catch (error) {
    console.error("Error updating tenant details:", error);
    return res.status(500).json({ message: error.message || "Failed to update tenant details" });
  }
};
