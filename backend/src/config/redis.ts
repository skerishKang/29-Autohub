import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;

/**
 * Redis 클라이언트 초기화
 */
export async function connectRedis(): Promise<RedisClientType> {
    if (redisClient) {
        return redisClient;
    }

    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT || 6379);
    const password = process.env.REDIS_PASSWORD;

    const url = password
        ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
        : `redis://${host}:${port}`;

    redisClient = createClient({ url });

    redisClient.on('error', (err) => {
        logger.error('Redis 에러 발생', { error: err });
    });

    await redisClient.connect();
    logger.info('Redis 연결 성공', { host, port });

    return redisClient;
}

export function getRedisClient(): RedisClientType {
    if (!redisClient) {
        throw new Error('Redis not connected. connectRedis()를 먼저 호출하세요.');
    }
    return redisClient;
}

export async function disconnectRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info('Redis 연결 종료');
    }
}
