import { verifyToken } from '../utils/jwt.js';
import { getTenantDb } from '../config/dbManager.js';

export const authenticateCaptureSession = async (req, res, next) => {
  try {
    // Collect potential tokens from query, headers, body, or auth header
    const candidateTokens = [];
    if (req.query?.token) candidateTokens.push(req.query.token);
    if (req.headers['x-capture-token']) candidateTokens.push(req.headers['x-capture-token']);
    if (req.body?.token) candidateTokens.push(req.body.token);

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      candidateTokens.push(authHeader.slice(7));
    }

    if (candidateTokens.length === 0) {
      return res.status(401).json({ message: 'Capture session token is required' });
    }

    let payload = null;
    let tokenError = null;

    for (const candidate of candidateTokens) {
      try {
        const decoded = verifyToken(candidate);
        if (decoded?.scope === 'guest-capture' && decoded.bookingId) {
          payload = decoded;
          break;
        }
      } catch (err) {
        tokenError = err;
      }
    }

    if (!payload) {
      if (tokenError && candidateTokens.length === 1) {
        return res.status(401).json({ message: 'Capture session token is invalid or expired' });
      }
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
