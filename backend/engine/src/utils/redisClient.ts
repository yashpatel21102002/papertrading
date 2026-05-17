import { createClient } from 'redis';
import logger from './logger';

const log = logger.child({ module: 'redis' });

const RECONNECT_MAX_RETRIES = 10;

function reconnectStrategy(retries: number): number | Error {
    if (retries > RECONNECT_MAX_RETRIES) {
        log.error({ retries }, 'Redis max reconnection attempts exceeded');
        return new Error('Redis max reconnection attempts exceeded');
    }
    const delayMs = Math.min(retries * 200, 3000);
    log.warn({ retries, delayMs }, 'Redis reconnecting');
    return delayMs;
}

export class RedisClient {
    private static instance: RedisClient;

    readonly client: ReturnType<typeof createClient>;
    readonly publisher: ReturnType<typeof createClient>;
    readonly subscriber: ReturnType<typeof createClient>;

    private constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const options = { url: redisUrl, socket: { reconnectStrategy } };

        this.client = createClient(options);
        this.publisher = this.client.duplicate();
        this.subscriber = this.client.duplicate();

        // Error handlers are mandatory — without them an emitted 'error' event
        // with no listener crashes the Node process immediately.
        this.client.on('error', (err) => log.error({ err }, 'Redis client error'));
        this.client.on('reconnecting', () => log.warn('Redis client reconnecting'));

        this.publisher.on('error', (err) => log.error({ err }, 'Redis publisher error'));
        this.publisher.on('reconnecting', () => log.warn('Redis publisher reconnecting'));

        this.subscriber.on('error', (err) => log.error({ err }, 'Redis subscriber error'));
        this.subscriber.on('reconnecting', () => log.warn('Redis subscriber reconnecting'));
    }

    public static getclient(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    // Must be called once at startup and awaited before the server begins serving.
    public static async connect(): Promise<void> {
        const instance = RedisClient.getclient();
        await Promise.all([
            instance.client.connect(),
            instance.publisher.connect(),
            instance.subscriber.connect(),
        ]);
        log.info('All Redis connections established');
    }

    public static async disconnect(): Promise<void> {
        if (!RedisClient.instance) return;
        await Promise.all([
            RedisClient.instance.client.quit(),
            RedisClient.instance.publisher.quit(),
            RedisClient.instance.subscriber.quit(),
        ]);
        log.info('All Redis connections closed');
        RedisClient.instance = undefined as any;
    }
}
