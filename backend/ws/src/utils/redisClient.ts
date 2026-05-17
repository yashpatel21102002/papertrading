import { createClient } from 'redis';
import logger from './logger';

const log = logger.child({ module: 'redis' });

const RECONNECT_MAX_RETRIES = 10;

function reconnectStrategy(retries: number): number | Error {
    if (retries > RECONNECT_MAX_RETRIES) {
        return new Error('Redis max reconnection attempts exceeded');
    }
    return Math.min(retries * 200, 3000);
}

export class RedisClient {
    private static instance: RedisClient;

    readonly subscriber: ReturnType<typeof createClient>;

    private constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const options = { url: redisUrl, socket: { reconnectStrategy } };

        this.subscriber = createClient(options);

        this.subscriber.on('error', (err) => log.error({ err }, 'Redis subscriber error'));
        this.subscriber.on('reconnecting', () => log.warn('Redis subscriber reconnecting'));
    }

    public static getclient(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    public static async connect(): Promise<void> {
        const instance = RedisClient.getclient();
        await instance.subscriber.connect();
        log.info('Redis subscriber connected');
    }

    public static async disconnect(): Promise<void> {
        if (RedisClient.instance) {
            await RedisClient.instance.subscriber.quit();
            RedisClient.instance = undefined as any;
        }
    }
}
