import YahooFinance from "yahoo-finance2";
import { RedisClient } from "./redisClient";
import dotenv from 'dotenv';
import { orders, reverseOrders } from "../routes/ordersRouter";
import { marketManager } from "./MarketManager";
import { randomPriceGenerator } from "./simulator";

//loading the environment variables from the .env file
dotenv.config();

//getting the symbols from env file
const symbols = process.env.SYMBOLS;
let intervalTime = process.env.POLLING_INTERVAL ? parseInt(process.env.POLLING_INTERVAL) : 2000;
const symbolsArray = symbols ? symbols.split(',').map(s => s.trim()) : ["RELIANCE.NS", "TCS.NS"];

//getting the instance of the yahoo finance client
const yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey'], quoteCombine: {
        maxSymbolsPerRequest: 50,
        debounceTime: 100,
    },
});

//getting the instance of the redis client. (singleton pattern)
const redisClient = RedisClient.getclient();

//creating the map to store the latest stock data for each symbol
const stockDataMap: Map<string, any> = new Map();

//The data that should fetched from the api
const IMPORTANT_FIELDS = [
    "symbol",
    "regularMarketPrice",
    "regularMarketChange",
    "regularMarketChangePercent",
    "regularMarketTime",


    "regularMarketOpen",
    "regularMarketDayHigh",
    "regularMarketDayLow",
    "regularMarketVolume",

    "marketState",
    "exchange",
    "fullExchangeName",

    "currency",
    "shortName"
];

//flag to check if the polling is already running or not
let isPolling = false;


//function to fetch the stock data for the given symbols every 2 seconds
export async function fetchStockData() {

    if (isPolling) {
        console.log("Polling is already running...");
        return;
    }

    isPolling = true;

    try {
        const results = await Promise.all(symbolsArray.map(ticker =>
            yahooFinance.quoteCombine(ticker, { fields: IMPORTANT_FIELDS })
        ));

        if (!results || !Array.isArray(results)) {
            console.warn("No stock data returned from request");
            return;
        }

        let allMarketsClosed = true;

        for (const stockData of results) {
            if (!stockData) continue;

            const ticker = stockData.symbol;

            // 6. Round to NSE Tick Size (0.05)
            stockData.regularMarketPrice = randomPriceGenerator(ticker, stockData.regularMarketPrice);

            // 1. Update the central state
            marketManager.updateSymbol(ticker, stockData);

            if (marketManager.isMarketOpen(ticker)) {
                allMarketsClosed = false;
                // MatchOrders logic.
                await matchOrders(ticker, stockData.regularMarketPrice);
            } else {
                console.log(`Skipping matching for ${ticker} - Market is ${stockData.marketState}`);
            }

            // Publishing the data to the redis channel
            await redisClient.publisher.publish(`stock:${ticker}`, JSON.stringify({
                symbol: ticker,
                regularMarketPrice: stockData.regularMarketPrice,
                regularMarketChange: stockData.regularMarketChange,
                regularMarketChangePercent: stockData.regularMarketChangePercent,
                regularMarketTime: stockData.regularMarketTime,
                shortName: stockData.shortName
            })).catch((err) => {
                console.error(`Error publishing data for symbol: ${ticker} to Redis channel: stock:${ticker}`, err);
            });
        }

        // Adjust interval based on market state
        if (allMarketsClosed) {
            intervalTime = 10000;
        } else {
            intervalTime = process.env.POLLING_INTERVAL ? parseInt(process.env.POLLING_INTERVAL) : 2000;
        }
    } catch (error) {
        console.error("Error fetching stock data:", error);
    } finally {
        isPolling = false;
        // Schedule the next fetch after the specified interval
        setTimeout(fetchStockData, intervalTime);
    }
}

// --- yahoo.ts (Internal helper) ---
function matchOrders(symbol: string, currentPrice: number) {
    const ordersArray = orders.get(symbol) || [];
    if (ordersArray.length === 0) return;

    // Filter the array to keep only orders that remain 'open'
    const remainingOrders = ordersArray.filter(order => {
        const state = reverseOrders.get(order.orderId);

        // Remove if cancelled elsewhere
        if (!state || state.status !== 'open') return false;

        const isMarketOrder = order.type === 'market';
        const isBuyFilled = order.side === 'buy' && (isMarketOrder || currentPrice <= order.price);
        const isSellFilled = order.side === 'sell' && (isMarketOrder || currentPrice >= order.price);

        if (isBuyFilled || isSellFilled) {
            // Update State
            state.status = 'filled';
            reverseOrders.set(order.orderId, state);
            const executionPrice = isMarketOrder ? currentPrice : order.price;
            console.log(`[✅ FILLED] Order ${order.orderId} for ${symbol} at price ${executionPrice}`);

            // Notify via Redis
            RedisClient.getclient().publisher.publish(`order:${order.orderId}`, JSON.stringify({
                ...order,
                executionPrice,
                price: executionPrice,
                status: 'filled'
            }));

            reverseOrders.delete(order.orderId); // Clean up filled order from reverseOrders
            return false; // Remove from the active 'orders' array
        }

        return true; // Keep in the array (still open)
    });

    orders.set(symbol, remainingOrders);
}