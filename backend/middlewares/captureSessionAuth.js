import { verifyToken } from '../utils/jwt.js';
import { getTenantDb } from '../config/dbManager.js';

export const authenticateCaptureSession = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query?.token) {
      token = req.query.token;
    } else if (req.body?.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Capture session token is required' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Capture session token is invalid or expired' });
    }

    if (payload.scope !== 'guest-capture' || !payload.bookingId) {
      return res.status(403).json({ message: 'Invalid token scope for document capture' });
    }

    const dbName = payload.dbName || payload.tenantSlug || process.env.DEFAULT_TENANT_DB || 'guesthouses';
    const tenantDb = await getTenantDb(dbName);
    const Booking = tenantDb.models.Booking || tenantDb.model('Booking');

    const booking = await Booking.findById(payload.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking associated with this session was not found' });
    }

    // Check if session has been invalidated or expired
    if (booking.captureSession) {
      if (booking.captureSession.active === false) {
        return res.status(401).json({ message: 'Capture session has been ended by the desk' });
      }
      if (booking.captureSession.sessionId && booking.captureSession.sessionId !== payload.sessionId) {
        return res.status(401).json({ message: 'This capture session has been superseded by a newer session' });
      }
      if (booking.captureSession.expiresAt && new Date(booking.captureSession.expiresAt).getTime() < Date.now()) {
        return res.status(401).json({ message: 'Capture session has expired' });
      }
    }

    req.captureSession = payload;
    req.booking = booking;
    req.tenantDb = tenantDb;
    req.tenantModels = tenantDb.models;

    return next();
  } catch (error) {
    console.error('[CAPTURE_SESSION_AUTH] Error:', error);
    return res.status(500).json({ message: 'Internal error verifying capture session' });
  }
};

export default authenticateCaptureSession;
