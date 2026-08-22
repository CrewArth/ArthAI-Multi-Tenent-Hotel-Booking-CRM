import { verifySaToken } from '../utils/jwt.js';

export const authenticateSa = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Super Super Admin authentication is required' });
  }

  try {
    const token = authorization.slice(7);
    const payload = verifySaToken(token);

    if (payload.role !== 'SUPER_SUPER_ADMIN') {
      return res.status(403).json({ message: 'Access restricted to Super Super Admins' });
    }

    req.saUser = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired Super Super Admin session' });
  }
};
