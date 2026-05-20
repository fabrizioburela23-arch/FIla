import { createClient, RedisClientType } from 'redis';
import { env } from './env';
import { logger } from '../shared/utils/logger';

let redisClient: RedisClientType | null = null;

function createRedisClient(): RedisClientType {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          logger.error('[redis] Max reconnect attempts reached. Giving up.');
          return new Error('Max reconnect attempts reached');
        }
        const delay = Math.min(retries * 100, 3000);
        logger.warn(`[redis] Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
    },
  }) as RedisClientType;

  client.on('connect', () => {
    logger.info('[redis] Connected');
  });

  client.on('ready', () => {
    logger.info('[redis] Ready');
  });

  client.on('error', (err: Error) => {
    logger.error({ err }, '[redis] Client error');
  });

  client.on('end', () => {
    logger.warn('[redis] Connection closed');
  });

  client.on('reconnecting', () => {
    logger.warn('[redis] Reconnecting...');
  });

  return client;
}

export async function connectRedis(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createRedisClient();

  try {
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    logger.error({ err }, '[redis] Failed to connect');
    throw err;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    logger.info('[redis] Disconnected');
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('[redis] Client is not connected. Call connectRedis() first.');
  }
  return redisClient;
}

export { redisClient };
