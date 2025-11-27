import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Redis client singleton for health checks and direct Redis operations
 * BullMQ creates its own connections, but we need one for health checks
 */
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    if (!env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error', {}, error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection (used during shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
