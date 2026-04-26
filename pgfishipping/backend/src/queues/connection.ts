import IORedis, { type Redis as RedisClient } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let connection: RedisClient | null = null;
let unavailable = false;

export function getQueueConnection(): RedisClient {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    connection.on('error', (err) => {
      if (!unavailable) {
        unavailable = true;
        logger.warn({ err: err.message }, 'Redis connection error (queue)');
      }
    });
    connection.on('ready', () => {
      unavailable = false;
      logger.info('Redis queue connection ready');
    });
  }
  return connection;
}

export async function isRedisAvailable(): Promise<boolean> {
  try {
    const conn = getQueueConnection();
    await conn.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeQueueConnection(): Promise<void> {
  if (connection) {
    await connection.quit().catch(() => undefined);
    connection = null;
  }
}
