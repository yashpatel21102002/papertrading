import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/authRouter';
import orderRouter from './routes/orderRouter';
import portfolioRouter from './routes/portfolioRouter';
import leaderboardRouter from './routes/leaderboardRouter';
import { authenticate } from './middleware/auth';
import { redisManager } from './utils/redisClient';
import { connectProducer, disconnectProducer } from './kafka/orderProducer';
import { connectConsumer, disconnectConsumer } from './kafka/orderConsumer';
import { startSnapshotScheduler } from './utils/snapshotScheduler';
import logger from './utils/logger';

dotenv.config();

const log = logger.child({ module: 'server' });

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/orders', authenticate, orderRouter);
app.use('/api/portfolio', authenticate, portfolioRouter);
app.use('/api/leaderboard', authenticate, leaderboardRouter);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

let server: ReturnType<typeof app.listen>;

async function shutdown(signal: string) {
    log.info({ signal }, 'Shutdown signal received, closing connections');
    server.close(async () => {
        await disconnectConsumer();
        await disconnectProducer();
        await redisManager.disconnect();
        log.info('All connections closed');
        process.exit(0);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function bootstrap() {
    if (!process.env.JWT_SECRET) {
        log.fatal('JWT_SECRET environment variable is not set — refusing to start');
        process.exit(1);
    }

    await redisManager.connect();
    await connectProducer();
    await connectConsumer();
    startSnapshotScheduler();

    server = app.listen(Number(PORT), '0.0.0.0', () => {
        log.info({ port: PORT }, 'API server started');
    });
}

bootstrap().catch((err) => {
    log.fatal({ err }, 'API failed to start, exiting');
    process.exit(1);
});
