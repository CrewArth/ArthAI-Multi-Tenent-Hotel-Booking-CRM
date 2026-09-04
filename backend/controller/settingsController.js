import { connectMasterDb } from '../config/dbManager.js';
import tenantSchema from '../models/centralModels/Tenant.js';
import { uploadTenantImage } from '../utils/s3TenantClient.js';

const getCentralTenantModel = async () => {
  const master = await connectMasterDb();
  return master.models.Tenant || master.model('Tenant', tenantSchema);
};

const parseBase64Data = (base64Str) => {
  if (!base64Str || typeof base64Str !== 'string') return null;

  const matches = base64Str.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
  if (!matches) {
    if (base64Str.startsWith('http://') || base64Str.startsWith('https://') || base64Str.startsWith('file:///') || base64Str.startsWith('/images/')) {
      return { isUrl: true, url: base64Str };
    }
    return null;
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  let ext = contentType.split('/')[1] || 'png';
  if (ext === 'jpeg') ext = 'jpg';
  if (ext.includes('svg')) ext = 'svg';

  return { contentType, buffer, ext };
};

const sanitizeLogoUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('file:///')) {
    const normalized = trimmed.replace(/\\/g, '/');
    const match = normalized.match(/(?:RishabhGuestHouseImages|images)\/(.+)$/i);
    if (match) {
      return `/images/${match[1]}`;
    }
    return trimmed.replace(/^file:\/\/\/?([a-zA-Z]:)?/, '/images');
  }
  return trimmed;
};

/**
 * GET /api/settings
 * Fetch site settings (siteName, logoUrl) for current tenant context
 */
export const getSettings = async (req, res) => {
  try {
    const dbName = req.tenantDb?.name ||
      req.headers['x-tenant-id'] ||
      req.headers['x-tenant-slug'] ||
      req.query?.tenantSlug ||
      process.env.DEFAULT_TENANT_DB ||
      'guesthouses';

    const Tenant = await getCentralTenantModel();
    const tenant = await Tenant.findOne({
      $or: [{ dbName }, { tenantId: dbName }]
    }).lean();

    const siteName = tenant?.config?.siteName || tenant?.hotelDetails?.hotelName || tenant?.name || 'Neuvera';
    const rawLogo = tenant?.config?.logoUrl || tenant?.hotelDetails?.hotelLogo || null;
    const logoUrl = sanitizeLogoUrl(rawLogo);

    return res.status(200).json({
      siteName,
      logoUrl,
    });
  } catch (error) {
    console.error('[Settings Controller Error] getSettings:', error);
    return res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

/**
 * PUT /api/settings
 * Update site settings (siteName, logoUrl) in DB and upload logo to AWS S3 if base64 provided
 */
export const updateSettings = async (req, res) => {
  try {
    const { siteName, logoUrl } = req.body;

    if (!siteName || !siteName.trim()) {
      return res.status(400).json({ message: 'Site name is required' });
    }

    const trimmedSiteName = siteName.trim();
    const dbName = req.tenantDb?.name ||
      req.userInfo?.dbName ||
      req.headers['x-tenant-id'] ||
      req.headers['x-tenant-slug'] ||
      process.env.DEFAULT_TENANT_DB ||
      'guesthouses';

    const Tenant = await getCentralTenantModel();
    let tenant = await Tenant.findOne({
      $or: [{ dbName }, { tenantId: dbName }]
    });

    let finalLogoUrl = sanitizeLogoUrl(logoUrl) || null;

    if (logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('data:image/')) {
      const parsed = parseBase64Data(logoUrl);
      if (parsed && !parsed.isUrl) {
        const tenantId = tenant?.tenantId || dbName;
        const key = `tenants/${tenantId}/branding/logo_${Date.now()}.${parsed.ext}`;
        finalLogoUrl = await uploadTenantImage(
          key,
          parsed.buffer,
          parsed.contentType,
          tenant?.config?.s3 || {}
        );
      }
    }

    finalLogoUrl = sanitizeLogoUrl(finalLogoUrl);

    if (tenant) {
      if (!tenant.config) tenant.config = {};
      tenant.config.siteName = trimmedSiteName;
      tenant.config.logoUrl = finalLogoUrl;

      if (!tenant.hotelDetails) tenant.hotelDetails = {};
      tenant.hotelDetails.hotelName = trimmedSiteName;
      tenant.hotelDetails.hotelLogo = finalLogoUrl;

      tenant.markModified('config');
      tenant.markModified('hotelDetails');
      await tenant.save();
    } else {
      tenant = await Tenant.create({
        tenantId: dbName,
        name: trimmedSiteName,
        dbName,
        config: {
          siteName: trimmedSiteName,
          logoUrl: finalLogoUrl,
        },
        hotelDetails: {
          hotelName: trimmedSiteName,
          hotelLogo: finalLogoUrl,
        },
      });
    }

    return res.status(200).json({
      message: 'Settings updated successfully',
      siteName: trimmedSiteName,
      logoUrl: finalLogoUrl,
    });
  } catch (error) {
    console.error('[Settings Controller Error] updateSettings:', error);
    return res.status(500).json({ message: error.message || 'Failed to update settings' });
  }
};
