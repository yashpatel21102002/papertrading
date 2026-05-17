import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { fetchStockData } from './utils/yahoo';
import { RedisClient } from './utils/redisClient';
import logger from './utils/logger';
import marketRouter from './routes/marketRouter';
import { createTopics } from './kafka/admin';
import { connectProducer, disconnectProducer } from './kafka/orderProducer';
import { connectConsumer, disconnectConsumer } from './kafka/orderConsumer';
import { restoreOrdersFromRedis } from './store/orderPersistence';

const log = logger.child({ module: 'server' });

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());
app.use("/api/market", marketRouter);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

async function shutdown(signal: string) {
    log.info({ signal }, 'Shutdown signal received, closing connections');
    await disconnectConsumer();
    await disconnectProducer();
    await RedisClient.disconnect();
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
    await RedisClient.connect();
    // Rebuild in-memory order store before the consumer starts processing new messages.
    await restoreOrdersFromRedis();
    await createTopics();
    await connectProducer();
    await connectConsumer();

    app.listen(Number(PORT), '0.0.0.0', () => {
        log.info({ port: PORT }, 'Engine server started');
    });

    fetchStockData();
}

main().catch((err) => {
    log.fatal({ err }, 'Engine failed to start, exiting');
    process.exit(1);
});
