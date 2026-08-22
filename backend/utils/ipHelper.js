/**
 * Safely extracts client IP address from incoming Express request.
 */
export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
};
