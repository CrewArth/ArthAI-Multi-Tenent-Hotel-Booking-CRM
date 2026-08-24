import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isReady = false;

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    // Retry connection every 1 to 3 seconds if Docker Redis container is starting up
    return Math.min(times * 200, 3000);
  },
};

try {
  const connectionUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisClient = new Redis(connectionUrl, redisOptions);

  redisClient.on('ready', () => {
    isReady = true;
    console.log('[Redis] Connected to Docker Redis server at 127.0.0.1:6379.');
  });

  redisClient.on('connect', () => {
    // Connection established
  });

  redisClient.on('error', (err) => {
    isReady = false;
    // Suppress unhandled connection error stack trace in console
  });

  redisClient.on('close', () => {
    isReady = false;
  });

  redisClient.on('end', () => {
    isReady = false;
  });
} catch (error) {
  console.error('[Redis Initialization Error]:', error.message);
}

export const isRedisReady = () => isReady && redisClient && redisClient.status === 'ready';

export const getCache = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setCache = async (key, value, ttlInSeconds = 300) => {
  if (!isRedisReady()) return false;
  try {
    const payload = JSON.stringify(value);
    if (ttlInSeconds > 0) {
      await redisClient.set(key, payload, 'EX', ttlInSeconds);
    } else {
      await redisClient.set(key, payload);
    }
    return true;
  } catch {
    return false;
  }
};

export const deleteCache = async (key) => {
  if (!isRedisReady()) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch {
    return false;
  }
};

export const deletePatternCache = async (pattern) => {
  if (!isRedisReady()) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(...keys);
    }
    return true;
  } catch {
    return false;
  }
};

export default redisClient;
