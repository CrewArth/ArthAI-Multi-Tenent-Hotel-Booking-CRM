import { verifyToken } from '../utils/jwt.js';
import { normalizeRole } from '../utils/roles.js';
import { getTenantDb } from '../config/dbManager.js';
import { getClientIp } from '../utils/ipHelper.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

export const invalidateUserSession = async (dbName, userId) => {
  if (!dbName || !userId) return;
  const cacheKey = `tenant:${dbName}:user:${userId}`;
  await deleteCache(cacheKey);
};

export const resolveTenantContext = async (req, res, next) => {
  // Pass-through auth routes so authController can dynamically resolve database per user
  if (req.path.startsWith('/auth') || req.path.startsWith('/api/auth')) {
    return next();
  }

  if (req.tenantModels && req.tenantDb) return next();

  try {
    let dbName = null;

    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const token = authorization.slice(7);
        const payload = verifyToken(token);
        if (payload?.dbName) {
          dbName = payload.dbName;
        }
      } catch {
        // ignore token verify errors for unauthenticated/public endpoints
      }
    }

    if (!dbName) {
      dbName = req.headers['x-tenant-id'] ||
               req.headers['x-tenant-slug'] ||
               req.body?.dbName ||
               req.body?.tenantSlug ||
               req.query?.tenantSlug ||
               process.env.DEFAULT_TENANT_DB ||
               'guesthouses';
    }

    const tenantDb = await getTenantDb(dbName);
    req.tenantDb = tenantDb;
    req.tenantModels = tenantDb.models;
  } catch (err) {
    console.error('[TenantContext Middleware Error]:', err.message);
  }

  return next();
};

export const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication is required' });
  }

  try {
    const token = authorization.slice(7);
    const payload = verifyToken(token);

    const dbName = payload.dbName || process.env.DEFAULT_TENANT_DB || 'guesthouses';

    const tenantDb = await getTenantDb(dbName);
    const cacheKey = `tenant:${dbName}:user:${payload.id}`;
    let user = await getCache(cacheKey);

    if (!user) {
      const User = tenantDb.models.User || tenantDb.model('User');
      user = await User.findById(payload.id).select(
        '_id email role isActive firstName lastName assignedGuestHouseId allowedWidgets allowedReports eSignatureUrl login_secret_key'
      ).lean();

      if (user) {
        await setCache(cacheKey, user, 900); // 15 mins TTL
      }
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Your account is not active' });
    }

    if (payload.secret_key && user.login_secret_key && user.login_secret_key !== payload.secret_key) {
      // Re-query database directly to bypass potentially stale cache
      const User = tenantDb.models.User || tenantDb.model('User');
      const freshUser = await User.findById(payload.id).select(
        '_id email role isActive firstName lastName assignedGuestHouseId allowedWidgets allowedReports eSignatureUrl login_secret_key'
      ).lean();

      if (freshUser && freshUser.login_secret_key === payload.secret_key) {
        user = freshUser;
        await setCache(cacheKey, freshUser, 900);
      } else if (freshUser && !freshUser.login_secret_key) {
        user = freshUser;
      } else {
        return res.status(401).json({ message: 'Your session has expired or been terminated' });
      }
    }

    if (process.env.ENFORCE_IP_CHECK === 'true' && payload.ip_address) {
      const currentIp = getClientIp(req);
      if (payload.ip_address !== currentIp) {
        return res.status(401).json({ message: 'Access denied: unrecognized IP address' });
      }
    }

    req.userInfo = payload;
    req.tenantDb = tenantDb;
    req.tenantModels = tenantDb.models;

    req.user = {
      _id: user._id,
      email: user.email,
      role: normalizeRole(user.role),
      firstName: user.firstName,
      lastName: user.lastName,
      assignedGuestHouseId: user.assignedGuestHouseId,
      allowedWidgets: user.allowedWidgets,
      allowedReports: user.allowedReports,
      eSignatureUrl: user.eSignatureUrl,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session is invalid or expired' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  }

  return next();
};

export default {
  resolveTenantContext,
  authenticate,
  authorize,
};
