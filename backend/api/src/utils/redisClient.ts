import { createClient, RedisClientType } from 'redis';
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

class RedisManager {
    private static instance: RedisManager;
    private client: RedisClientType;
    private publisher: RedisClientType;
    private subscriber: RedisClientType;

    private constructor() {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        const options = { url, socket: { reconnectStrategy } };

        this.client = createClient(options) as RedisClientType;
        this.publisher = createClient(options) as RedisClientType;
        this.subscriber = createClient(options) as RedisClientType;

        this.client.on('error', (err) => log.error({ err }, 'Redis client error'));
        this.client.on('reconnecting', () => log.warn('Redis client reconnecting'));

        this.publisher.on('error', (err) => log.error({ err }, 'Redis publisher error'));
        this.publisher.on('reconnecting', () => log.warn('Redis publisher reconnecting'));

        this.subscriber.on('error', (err) => log.error({ err }, 'Redis subscriber error'));
        this.subscriber.on('reconnecting', () => log.warn('Redis subscriber reconnecting'));
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public async connect(): Promise<void> {
        await Promise.all([
            this.client.connect(),
            this.publisher.connect(),
            this.subscriber.connect(),
        ]);
        log.info('All Redis connections established');
    }

    public getClient() { return this.client; }
    public getPublisher() { return this.publisher; }
    public getSubscriber() { return this.subscriber; }

    public async disconnect(): Promise<void> {
        await Promise.all([
            this.client.quit(),
            this.publisher.quit(),
            this.subscriber.quit(),
        ]);
        log.info('All Redis connections closed');
    }
}

export const redisManager = RedisManager.getInstance();
