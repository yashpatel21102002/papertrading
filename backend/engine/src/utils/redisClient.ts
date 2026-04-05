import { createClient } from 'redis';
import dotenv from 'dotenv';

//loading the environment variables from the .env file
dotenv.config();

export class RedisClient {
    private static instance: RedisClient;
    client: ReturnType<typeof createClient>;
    publisher: ReturnType<typeof createClient>;
    subscriber: ReturnType<typeof createClient>;

    private constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = createClient({ url: redisUrl });
        this.publisher = this.client.duplicate();
        this.subscriber = this.client.duplicate();

        //connecting to the redis server
        this.connect();
    }

    private connect() {
        this.client.connect().then(() => {
            console.log('Connected to Redis');
        }).catch((err) => {
            console.error('Error connecting to Redis:', err);
        });
        this.publisher.connect().then(() => {
            console.log('Publisher connected to Redis');
        }).catch((err) => {
            console.error('Error connecting publisher to Redis:', err);
        });
        this.subscriber.connect().then(() => {
            console.log('Subscriber connected to Redis');
        }).catch((err) => {
            console.error('Error connecting subscriber to Redis:', err);
        });
    }

    public static getclient() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance
    }

    public static async disconnect() {
        if (RedisClient.instance) {
            await RedisClient.instance.client.quit();
            await RedisClient.instance.publisher.quit();
            await RedisClient.instance.subscriber.quit();
            RedisClient.instance = undefined as any;
        }
    }
}