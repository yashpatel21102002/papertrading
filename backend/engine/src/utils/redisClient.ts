import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

//loading the environment variables from the .env file
dotenv.config();

export class RedisManager {
    private static instance: RedisManager;
    private client: RedisClientType;
    private _publisher: RedisClientType;
    private _subscriber: RedisClientType;

    private constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = createClient({ url: redisUrl });
        this._publisher = this.client.duplicate();
        this._subscriber = this.client.duplicate();

        this.setupErrorHandlers();
    }

    private setupErrorHandlers() {
        [this.client, this._publisher, this._subscriber].forEach((c, i) => {
            c.on('error', (err) => console.error(`Redis Client ${i} Error:`, err));
        });
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public async connect() {
        try {
            await Promise.all([
                this.client.connect(),
                this._publisher.connect(),
                this._subscriber.connect()
            ]);
            console.log('🚀 Redis Clients Connected Successfully');
        } catch (err) {
            console.error('❌ Failed to connect to Redis:', err);
        }
    }

    public get client_raw() { return this.client; }
    public get publisher() { return this._publisher; }
    public get subscriber() { return this._subscriber; }

    public async disconnect() {
        await Promise.all([
            this.client.quit(),
            this._publisher.quit(),
            this._subscriber.quit()
        ]);
    }
}

// For backward compatibility with existing code using RedisClient.getclient()
export class RedisClient {
    public static getclient() {
        const manager = RedisManager.getInstance();
        return {
            publisher: manager.publisher,
            subscriber: manager.subscriber
        };
    }
    public static async disconnect() {
        await RedisManager.getInstance().disconnect();
    }
}
