import { createClient, RedisClientType } from 'redis';

class RedisManager {
    private static instance: RedisManager;
    private client: RedisClientType;
    private publisher: RedisClientType;
    private subscriber: RedisClientType;

    private constructor() {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';

        // Initialize three distinct clients for different roles
        this.client = createClient({ url });
        this.publisher = createClient({ url });
        this.subscriber = createClient({ url });

        this.setupErrorHandlers();
    }

    private setupErrorHandlers() {
        [this.client, this.publisher, this.subscriber].forEach((c, i) => {
            c.on('error', (err) => console.error(`Redis Client ${i} Error:`, err));
        });
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    // Modern 'redis' library requires manual connection
    public async connect() {
        try {
            await Promise.all([
                this.client.connect(),
                this.publisher.connect(),
                this.subscriber.connect()
            ]);
            console.log('🚀 Redis Clients Connected Successfully');
        } catch (err) {
            console.error('❌ Failed to connect to Redis:', err);
        }
    }

    // Getters for specific instances
    public getClient() { return this.client; }
    public getPublisher() { return this.publisher; }
    public getSubscriber() { return this.subscriber; }

    public async disconnect() {
        await Promise.all([
            this.client.quit(),
            this.publisher.quit(),
            this.subscriber.quit()
        ]);
    }
}

export const redisManager = RedisManager.getInstance();