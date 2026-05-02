import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { RedisClient } from "./redisClient";

export class WebSocketManager {
    private static instance: WebSocketManager;
    wss: WebSocketServer;
    private tickerToClientIds: Map<string, Set<string>> = new Map();
    private clientIdToWs: Map<string, WebSocket> = new Map();
    private clientIdToTickers: Map<string, Set<string>> = new Map();

    //creating a private constructor to prevent instantiation of the class from outside
    private constructor(port: number) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws: WebSocket) => {
            console.log('Client connected');
            const id = crypto.randomUUID();
            this.clientIdToWs.set(id, ws);
            this.clientIdToTickers.set(id, new Set());

            ws.on('close', () => {
                console.log('Client disconnected');
                this.handleDisconnect(id);
            });

            ws.on('message', (message) => {
                this.handleMessage(message.toString(), id);
            });
        });
    }

    //singleton pattern to ensure only one instance of WebSocketManager is created
    public static getInstance() {
        if (!WebSocketManager.instance) {
            const port = Number(process.env.PORT) || 8003;
            WebSocketManager.instance = new WebSocketManager(port);
        }
        return WebSocketManager.instance;

    }

    private handleMessage(message: string, id: string) {
        try {
            const parsedMessage = JSON.parse(message);
            const { type, ticker } = parsedMessage;

            if (type === 'SUBSCRIBE' && ticker) {
                this.clientIdToTickers.get(id)?.add(ticker);
                if (!this.tickerToClientIds.has(ticker)) {
                    this.tickerToClientIds.set(ticker, new Set());
                    // First subscriber for this ticker, subscribe to Redis
                    RedisClient.getclient().subscriber.subscribe(ticker, (msg) => {
                        this.broadcast(ticker, msg);
                    });
                }
                this.tickerToClientIds.get(ticker)?.add(id);
            }

            if (type === 'UNSUBSCRIBE' && ticker) {
                this.clientIdToTickers.get(id)?.delete(ticker);
                const clients = this.tickerToClientIds.get(ticker);
                if (clients) {
                    clients.delete(id);
                    if (clients.size === 0) {
                        this.tickerToClientIds.delete(ticker);
                        RedisClient.getclient().subscriber.unsubscribe(ticker);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to handle WebSocket message:", err);
        }
    }

    private handleDisconnect(id: string) {
        const tickers = this.clientIdToTickers.get(id);
        if (tickers) {
            tickers.forEach(ticker => {
                const clients = this.tickerToClientIds.get(ticker);
                if (clients) {
                    clients.delete(id);
                    if (clients.size === 0) {
                        this.tickerToClientIds.delete(ticker);
                        RedisClient.getclient().subscriber.unsubscribe(ticker);
                    }
                }
            });
        }
        this.clientIdToTickers.delete(id);
        this.clientIdToWs.delete(id);
    }

    private broadcast(ticker: string, message: string) {
        const clientIds = this.tickerToClientIds.get(ticker);
        if (clientIds) {
            clientIds.forEach(id => {
                const ws = this.clientIdToWs.get(id);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            });
        }
    }


}