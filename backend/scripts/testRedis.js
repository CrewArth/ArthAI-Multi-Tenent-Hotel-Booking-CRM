import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connectionUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
console.log('Testing Redis connection to Docker Redis:', connectionUrl);

const redis = new Redis(connectionUrl, {
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
});

redis.on('connect', () => console.log('✅ Connected to Docker Redis!'));
redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
  process.exit(1);
});

async function test() {
  try {
    const pingRes = await redis.ping();
    console.log('✅ PING response:', pingRes);

    await redis.set('docker:test', 'Redis Docker is active!', 'EX', 30);
    const val = await redis.get('docker:test');
    console.log('✅ GET docker:test:', val);
    await redis.del('docker:test');

    redis.disconnect();
    console.log('✅ Test complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

test();
