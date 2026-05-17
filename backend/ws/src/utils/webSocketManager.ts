import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import jwt from 'jsonwebtoken';
import { RedisClient } from './redisClient';
import logger from './logger';

const log = logger.child({ module: 'ws-manager' });

const MAX_CONNECTIONS = parseInt(process.env.MAX_WS_CONNECTIONS || '1000');

interface ClientSubscription {
    ws: WebSocket;
    tickers: Set<string>;
    userId: string;
}

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    return secret;
}

export class WebSocketManager {
    private static instance: WebSocketManager;
    private wss: WebSocketServer;
    private subscriptions: Map<string, ClientSubscription> = new Map();

    private constructor(server: http.Server) {
        this.wss = new WebSocketServer({
            server,
            // W-D1: verify JWT on the HTTP upgrade before the WebSocket is established.
            verifyClient: (info, callback) => {
                try {
                    const url = new URL(info.req.url ?? '', 'ws://localhost');
                    const token = url.searchParams.get('token');
                    if (!token) {
                        callback(false, 401, 'Unauthorized: missing token');
                        return;
                    }
                    jwt.verify(token, getJwtSecret());
                    callback(true);
                } catch {
                    callback(false, 401, 'Unauthorized: invalid token');
                }
            },
        });

        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    }

    public static getInstance(server?: http.Server): WebSocketManager {
        if (!WebSocketManager.instance) {
            if (!server) throw new Error('WebSocketManager requires an http.Server on first initialisation');
            WebSocketManager.instance = new WebSocketManager(server);
        }
        return WebSocketManager.instance;
    }

    private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
        // W-D2: reject connections beyond the configured ceiling.
        if (this.subscriptions.size >= MAX_CONNECTIONS) {
            log.warn({ total: this.subscriptions.size }, 'Connection limit reached, rejecting new client');
            ws.close(1013, 'Server at capacity');
            return;
        }

        const url = new URL(req.url ?? '', 'ws://localhost');
        const token = url.searchParams.get('token')!;
        const decoded = jwt.decode(token) as { id: string };
        const userId = decoded.id;

        const id = crypto.randomUUID();
        this.subscriptions.set(id, { ws, tickers: new Set(), userId });
        log.info({ clientId: id, userId }, 'Client connected');

        ws.on('message', (raw) => {
            let msg: any;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                ws.send(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }
            this.handleMessage(msg, id);
        });

        ws.on('close', () => this.handleDisconnect(id));
    }

    private handleMessage(msg: any, id: string): void {
        const sub = this.subscriptions.get(id);
        if (!sub || !msg?.ticker || typeof msg.ticker !== 'string') return;

        const ticker = msg.ticker;
        const redisChannel = `stock:${ticker}`;

        if (msg.type === 'SUBSCRIBE') {
            if (sub.tickers.has(ticker)) return;

            const alreadyWatched = this.isChannelWatched(ticker);
            sub.tickers.add(ticker);

            if (!alreadyWatched) {
                RedisClient.getclient().subscriber.subscribe(redisChannel, (message) => {
                    this.broadcast(ticker, message);
                }).catch((err) => log.error({ err, redisChannel }, 'Redis subscribe failed'));
            }
        } else if (msg.type === 'UNSUBSCRIBE') {
            sub.tickers.delete(ticker);

            if (!this.isChannelWatched(ticker)) {
                RedisClient.getclient().subscriber.unsubscribe(redisChannel)
                    .catch((err) => log.error({ err, redisChannel }, 'Redis unsubscribe failed'));
            }
        }
    }

    private handleDisconnect(id: string): void {
        const sub = this.subscriptions.get(id);
        if (!sub) return;

        log.info({ clientId: id, userId: sub.userId }, 'Client disconnected');

        for (const ticker of sub.tickers) {
            sub.tickers.delete(ticker);
            if (!this.isChannelWatched(ticker)) {
                RedisClient.getclient().subscriber.unsubscribe(`stock:${ticker}`)
                    .catch((err) => log.error({ err, ticker }, 'Redis unsubscribe on disconnect failed'));
            }
        }

        this.subscriptions.delete(id);
    }

    private broadcast(ticker: string, message: string): void {
        for (const sub of this.subscriptions.values()) {
            if (sub.tickers.has(ticker) && sub.ws.readyState === WebSocket.OPEN) {
                sub.ws.send(message);
            }
        }
    }

    private isChannelWatched(ticker: string): boolean {
        for (const sub of this.subscriptions.values()) {
            if (sub.tickers.has(ticker)) return true;
        }
        return false;
    }
}
