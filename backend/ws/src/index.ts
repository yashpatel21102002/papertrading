import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import { WebSocketManager } from './utils/webSocketManager';
import { RedisClient } from './utils/redisClient';
import logger from './utils/logger';

dotenv.config();

const log = logger.child({ module: 'server' });
const PORT = process.env.PORT || 8003;

const app = express();

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

const server = http.createServer(app);

async function shutdown(signal: string) {
    log.info({ signal }, 'Shutdown signal received, shutting down');
    server.close(async () => {
        await RedisClient.disconnect();
        log.info('All connections closed');
        process.exit(0);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
    if (!process.env.JWT_SECRET) {
        log.fatal('JWT_SECRET environment variable is not set — refusing to start');
        process.exit(1);
    }

    await RedisClient.connect();
    WebSocketManager.getInstance(server);

    server.listen(Number(PORT), '0.0.0.0', () => {
        log.info({ port: PORT }, 'WS server started');
    });
}

main().catch((err) => {
    log.fatal({ err }, 'WS server failed to start, exiting');
    process.exit(1);
});
