import YahooFinance from "yahoo-finance2";
import { RedisClient } from "./redisClient";
import dotenv from 'dotenv';
import { orders, reverseOrders } from "../routes/ordersRouter";
import { marketManager } from "./MarketManager";

//loading the environment variables from the .env file
dotenv.config();

//getting the symbols from env file
const symbols = process.env.SYMBOLS;
let intervalTime = process.env.POLLING_INTERVAL ? parseInt(process.env.POLLING_INTERVAL) : 2000;
const sybolsArray = symbols ? symbols.split(',').map(s => s.trim()) : ["RELIANCE.NS", "TCS.NS"];

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

//to be removed
//storing the previous price so that we can generate other price on that.
const previousMap = new Map<string, { price: number }>();

function randomPriceGenerator(ticker: string, price: number) {
    // 1. Define how "Crazy" the market is (0.01 = 1% potential move per tick)
    const VOLATILITY_COEFFICIENT = 0.005; // 0.5% base swing - quite high for Nifty!

    // 2. Create a "Noise" factor that isn't just linear
    // Using Math.pow makes small moves common but big moves much more impactful
    let rawRandom = Math.random() - 0.5; // -0.5 to 0.5
    let sign = Math.sign(rawRandom);
    let skewedRandom = sign * Math.pow(Math.abs(rawRandom), 0.8); // 0.8 makes big moves easier

    // 3. Get Previous Price
    const previousPrice = previousMap.get(ticker)?.price || price;

    // 4. Calculate the "High Volatility" Change
    // We removed the "/ 100" and replaced it with our Coefficient
    const change = skewedRandom * VOLATILITY_COEFFICIENT;
    const newPrice = previousPrice * (1 + change);

    // 5. Apply "Gap" Logic (Optional: 1% chance of a 2% jump)
    let finalPrice = newPrice;
    if (Math.random() < 0.01) {
        const gapDirection = Math.random() > 0.5 ? 1.02 : 0.98;
        finalPrice *= gapDirection;
    }

    return finalPrice
}

//function to fetch the stock data for the given symbols every 2 seconds
export async function fetchStockData() {

    if (isPolling) {
        console.log("Polling is already running...");
        return;
    }

    isPolling = true;

    try {
        for (const ticker of sybolsArray) {
            const stockData = await yahooFinance.quoteCombine(ticker, { fields: IMPORTANT_FIELDS });

            if (!stockData) continue;

            //to be removed
            // 6. Round to NSE Tick Size (0.05)
            stockData.regularMarketPrice = Math.round(randomPriceGenerator(ticker, stockData.regularMarketPrice) / 0.05) * 0.05;
            previousMap.set(ticker, stockData.regularMarketPrice);


            // 1. Update the central state
            // updating and storing the latest stock data for each symbol so that we can use it in the marketRouter to send the latest data to the client when requested.
            // we will store all the data that we get from the api in the stockDataMap and then we will use it in the marketRouter to send the latest data to the client when requested.
            marketManager.updateSymbol(
                stockData.symbol,
                stockData
            );

            if (!marketManager.isMarketOpen(stockData.symbol)) {
                console.log(`Skipping matching for ${stockData.symbol} - Market is ${stockData.marketState}`);
                intervalTime = 10000; // Increase interval to 10 seconds when market is closed
                continue;
            } else {
                intervalTime = process.env.POLLING_INTERVAL ? parseInt(process.env.POLLING_INTERVAL) : 2000; // Reset to default when market is open
            }

            //MatchOrders logic.
            await matchOrders(ticker, stockData.regularMarketPrice);

            //publishing the data to the redis channel
            await redisClient.publisher.publish(`stock:${stockData.symbol}`, JSON.stringify({
                symbol: stockData.symbol,
                regularMarketPrice: stockData.regularMarketPrice,
                regularMarketChange: stockData.regularMarketChange,
                regularMarketChangePercent: stockData.regularMarketChangePercent,
                regularMarketTime: stockData.regularMarketTime,
                shortName: stockData.shortName
            })).then(() => {
                // console.log(`Published data for symbol: ${symbol} to Redis channel: stock:${symbol}`);
            }).catch((err) => {
                console.error(`Error publishing data for symbol: ${stockData.symbol} to Redis channel: stock:${stockData.symbol}`, err);
            });

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

        const isBuyFilled = order.side === 'buy' && currentPrice <= order.price;
        const isSellFilled = order.side === 'sell' && currentPrice >= order.price;

        if (isBuyFilled || isSellFilled) {
            // Update State
            state.status = 'filled';
            reverseOrders.set(order.orderId, state);
            console.log(`[✅ FILLED] Order ${order.orderId} for ${symbol} at price ${currentPrice}`);

            // Notify via Redis
            RedisClient.getclient().publisher.publish(`order:${order.orderId}`, JSON.stringify({
                ...order,
                executionPrice: order.price,
                status: 'filled'
            }));

            reverseOrders.delete(order.orderId); // Clean up filled order from reverseOrders
            return false; // Remove from the active 'orders' array
        }

        return true; // Keep in the array (still open)
    });

    orders.set(symbol, remainingOrders);
}