import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { RedisClient } from "./redisClient";

export class WebSocketManager {
    private static instance: WebSocketManager;
    wss: WebSocketServer;
    subscriptions: { [key: string]: { ws: WebSocket, tickers: string[] } } = {};

    //creating a private constructor to prevent instantiation of the class from outside
    private constructor(port: number) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws: WebSocket) => {
            console.log('Client connected');
            const id = crypto.randomUUID();
            this.subscriptions[id] = { ws, tickers: [] }; // Store the WebSocket client and its subscribed tickers

            ws.on('close', () => {
                console.log('Client disconnected');

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
        const parsedMessage = JSON.parse(message);

        // hanlde the subscribe message from the client and add the client to the corresponding ticker
        if (parsedMessage.type === 'SUBSCRIBE') {

            this.subscriptions[id].tickers.push(parsedMessage.ticker);
            //if there is one of the subscriber is there then we will subscribe to pubsub channel for that ticker
            if (this.oneUserSubscribedToTicker(parsedMessage.ticker)) {
                RedisClient.getclient().subscriber.subscribe(parsedMessage.ticker, (message) => {
                    // console.log(`Received message for ticker ${parsedMessage.ticker}: ${message}`);
                    //broadcast the message to all the clients subscribed to that ticker
                    Object.keys(this.subscriptions).map((key) => {
                        if (this.subscriptions[key].tickers.includes(parsedMessage.ticker)) {
                            this.subscriptions[key].ws.send(message);
                        }
                    });
                });
            }

        }

        // handle the unsubscribe message from the client and remove the client from the corresponding ticker
        if (parsedMessage.type === 'UNSUBSCRIBE') {
            this.subscriptions[id].tickers = this.subscriptions[id].tickers.filter((key) => key !== parsedMessage.ticker);

            if (!this.oneUserSubscribedToTicker(parsedMessage.ticker)) {
                RedisClient.getclient().subscriber.unsubscribe(parsedMessage.ticker);
            }
        }
    }

    private oneUserSubscribedToTicker(ticker: string): boolean {
        let subscribed = false;
        Object.keys(this.subscriptions).map((key) => {
            if (this.subscriptions[key].tickers.includes(ticker)) {
                subscribed = true;
            }
        });
        return subscribed;
    }


}