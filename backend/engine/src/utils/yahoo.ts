import YahooFinance from "yahoo-finance2";
import { RedisClient } from "./redisClient";
import { orders, reverseOrders } from "../store/orderStore";
import { publishOrderEvent } from "../kafka/orderProducer";
import { marketManager, MarketStateCode } from "./MarketManager";
import logger from "./logger";

const log = logger.child({ module: 'poller' });

const symbols = process.env.SYMBOLS;
const DEFAULT_INTERVAL = process.env.POLLING_INTERVAL ? parseInt(process.env.POLLING_INTERVAL) : 2000;
const CLOSED_MARKET_INTERVAL = 10000;
const symbolsArray = symbols ? symbols.split(',').map(s => s.trim()) : ["RELIANCE.NS", "TCS.NS"];

const yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey'],
});

const redisClient = RedisClient.getclient();

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
    "shortName",
];

let isPolling = false;
let intervalTime = DEFAULT_INTERVAL;

export async function fetchStockData() {
    if (isPolling) {
        log.warn('Polling already in progress, skipping tick');
        return;
    }

    isPolling = true;

    try {
        const rawQuotes = await yahooFinance.quote(symbolsArray, { fields: IMPORTANT_FIELDS });
        const quotes = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];

        let anyMarketOpen = false;

        for (const stockData of quotes) {
            if (!stockData || !stockData.regularMarketPrice) {
                log.warn({ symbol: stockData?.symbol }, 'No price data returned, skipping symbol');
                continue;
            }

            marketManager.updateSymbol(stockData.symbol, {
                symbol: stockData.symbol,
                regularMarketPrice: stockData.regularMarketPrice,
                regularMarketChange: stockData.regularMarketChange ?? null,
                regularMarketChangePercent: stockData.regularMarketChangePercent ?? null,
                regularMarketTime: stockData.regularMarketTime ?? null,
                regularMarketOpen: stockData.regularMarketOpen ?? null,
                regularMarketDayHigh: stockData.regularMarketDayHigh ?? null,
                regularMarketDayLow: stockData.regularMarketDayLow ?? null,
                regularMarketVolume: stockData.regularMarketVolume ?? null,
                marketState: (stockData.marketState ?? 'CLOSED') as MarketStateCode,
                exchange: stockData.exchange ?? null,
                fullExchangeName: stockData.fullExchangeName ?? null,
                currency: stockData.currency ?? null,
                shortName: stockData.shortName ?? null,
            });

            if (!marketManager.isMarketOpen(stockData.symbol)) {
                log.debug({ symbol: stockData.symbol, marketState: stockData.marketState }, 'Market closed, skipping order matching');
                continue;
            }

            anyMarketOpen = true;

            matchOrders(stockData.symbol, stockData.regularMarketPrice);

            redisClient.publisher.publish(`stock:${stockData.symbol}`, JSON.stringify({
                symbol: stockData.symbol,
                regularMarketPrice: stockData.regularMarketPrice,
                regularMarketChange: stockData.regularMarketChange,
                regularMarketChangePercent: stockData.regularMarketChangePercent,
                regularMarketTime: stockData.regularMarketTime,
                shortName: stockData.shortName,
            })).catch((err) => {
                log.error({ err, symbol: stockData.symbol }, 'Redis publish failed for price update');
            });
        }

        intervalTime = anyMarketOpen ? DEFAULT_INTERVAL : CLOSED_MARKET_INTERVAL;

    } catch (error) {
        log.error({ err: error }, 'Failed to fetch quotes from Yahoo Finance');
    } finally {
        isPolling = false;
        setTimeout(fetchStockData, intervalTime);
    }
}

function matchOrders(symbol: string, currentPrice: number) {
    const ordersArray = orders.get(symbol) || [];
    if (ordersArray.length === 0) return;

    const remainingOrders = ordersArray.filter(order => {
        const state = reverseOrders.get(order.orderId);

        if (!state || state.status !== 'open') return false;

        const isBuyFilled = order.side === 'buy' && currentPrice <= order.price;
        const isSellFilled = order.side === 'sell' && currentPrice >= order.price;

        if (isBuyFilled || isSellFilled) {
            reverseOrders.delete(order.orderId);

            log.info(
                { orderId: order.orderId, symbol, side: order.side, limitPrice: order.price, executionPrice: currentPrice },
                'Order filled'
            );

            publishOrderEvent({
                orderId: order.orderId,
                symbol,
                quantity: order.quantity,
                price: order.price,
                side: order.side,
                type: order.type,
                executionPrice: currentPrice,
                status: 'filled',
            }).catch((err) => {
                log.error({ err, orderId: order.orderId }, 'Kafka publish failed for order fill event');
            });

            return false;
        }

        return true;
    });

    orders.set(symbol, remainingOrders);
}
