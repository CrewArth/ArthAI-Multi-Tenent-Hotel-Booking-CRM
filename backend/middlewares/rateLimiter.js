import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient, { isRedisReady } from '../config/redis.js';

export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 10,
    message = 'Too many requests, please try again later.',
    prefix = 'rl:',
  } = options;

  const store = isRedisReady()
    ? new RedisStore({
        // @ts-ignore
        sendCommand: (...args) => redisClient.call(...args),
        prefix,
      })
    : undefined;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: { message },
    skipFailedRequests: true,
  });
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  prefix: 'ratelimit:auth:',
});

export default authRateLimiter;
