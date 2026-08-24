import redisClient, { isRedisReady } from '../config/redis.js';
import crypto from 'crypto';

export const acquireLock = async (lockKey, ttlMs = 10000) => {
  if (!isRedisReady()) {
    return 'fallback_token';
  }

  const token = crypto.randomBytes(16).toString('hex');
  try {
    const result = await redisClient.set(lockKey, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  } catch {
    return 'fallback_token';
  }
};

export const releaseLock = async (lockKey, token) => {
  if (!isRedisReady() || !token || token === 'fallback_token') {
    return true;
  }

  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    await redisClient.eval(luaScript, 1, lockKey, token);
    return true;
  } catch {
    return false;
  }
};

export default {
  acquireLock,
  releaseLock,
};
