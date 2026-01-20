import { createClient } from 'redis';
import { Logger } from '../utils/logger';
import { config } from './env';

const redisClient = createClient({
    url: config.redis.url,
});

redisClient.on('error', (err) => {
    Logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    Logger.info('Redis Client Connected');
});

export async function connectRedis(): Promise<void> {
    try {
        await redisClient.connect();
        Logger.info('Redis connection established successfully');
    } catch (error) {
        Logger.error('Failed to connect to Redis:', error);
        throw error;
    }
}

export default redisClient;
