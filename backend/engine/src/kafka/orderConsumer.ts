import { Consumer } from 'kafkajs';
import { kafka, TOPICS } from './kafkaClient';
import { orders, reverseOrders, OrderEntry } from '../store/orderStore';
import { persistOrder, removeOrder } from '../store/orderPersistence';
import { marketManager } from '../utils/MarketManager';
import { publishOrderEvent } from './orderProducer';
import logger from '../utils/logger';

const log = logger.child({ module: 'kafka-consumer' });

let consumer: Consumer | null = null;

export async function connectConsumer(): Promise<void> {
    consumer = kafka.consumer({ groupId: 'engine-order-group' });
    await consumer.connect();
    await consumer.subscribe({
        topics: [TOPICS.ORDER_CREATED, TOPICS.ORDER_CANCEL_REQUESTED],
        fromBeginning: false,
    });

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            if (!message.value) return;

            let payload: unknown;
            try {
                payload = JSON.parse(message.value.toString());
            } catch {
                log.error({ topic }, 'Failed to parse Kafka message, skipping');
                return;
            }

            if (topic === TOPICS.ORDER_CREATED) {
                await handleOrderCreated(payload as OrderCreatedPayload);
            } else if (topic === TOPICS.ORDER_CANCEL_REQUESTED) {
                await handleOrderCancelRequested(payload as { orderId: string });
            }
        },
    });

    log.info('Kafka consumer connected and listening');
}

export async function disconnectConsumer(): Promise<void> {
    if (consumer) {
        await consumer.disconnect();
        consumer = null;
        log.info('Kafka consumer disconnected');
    }
}

interface OrderCreatedPayload {
    orderId: string;
    symbol: string;
    quantity: number;
    price: number | null; // null for market orders
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
}

async function handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    const { orderId, symbol, quantity, price, side, type } = payload;

    if (!orderId || !symbol || !quantity || !side || !type) {
        log.warn({ payload }, 'Malformed order.created message, skipping');
        return;
    }

    if (type === 'limit' && (price === null || price <= 0)) {
        log.warn({ payload }, 'Limit order missing valid price, skipping');
        return;
    }

    if (!marketManager.isMarketOpen(symbol)) {
        log.warn({ orderId, symbol }, 'Order rejected — market is not REGULAR');
        await publishOrderEvent({ orderId, symbol, quantity, price: price ?? 0, side, type, status: 'cancelled' });
        return;
    }

    // Market orders fill immediately at the current live price.
    if (type === 'market') {
        const executionPrice = marketManager.getPrice(symbol);
        if (!executionPrice) {
            log.warn({ orderId, symbol }, 'Market order cancelled — no price data available');
            await publishOrderEvent({ orderId, symbol, quantity, price: 0, side, type, status: 'cancelled' });
            return;
        }

        log.info({ orderId, symbol, side, quantity, executionPrice }, 'Market order filled immediately');
        await publishOrderEvent({ orderId, symbol, quantity, price: 0, side, type, status: 'open' });
        await publishOrderEvent({ orderId, symbol, quantity, price: 0, side, type, executionPrice, status: 'filled' });
        return;
    }

    // Limit order: add to in-memory store for matching on future price ticks.
    const entry: OrderEntry = { orderId, quantity, price: price!, side, type };
    if (!orders.has(symbol)) orders.set(symbol, []);
    orders.get(symbol)!.push(entry);
    const state = { symbol, quantity, price: price!, side, type, status: 'open' as const };
    reverseOrders.set(orderId, state);

    // Persist to Redis so the order survives an engine restart.
    persistOrder(orderId, state).catch((err) =>
        log.error({ err, orderId }, 'Failed to persist order to Redis'),
    );

    log.info({ orderId, symbol, side, type, price, quantity }, 'Limit order registered');

    await publishOrderEvent({ orderId, symbol, quantity, price: price!, side, type, status: 'open' });
}

async function handleOrderCancelRequested(payload: { orderId: string }): Promise<void> {
    const { orderId } = payload;

    if (!orderId) {
        log.warn({ payload }, 'Malformed order.cancel-requested message, skipping');
        return;
    }

    const state = reverseOrders.get(orderId);
    if (!state) {
        log.warn({ orderId }, 'Cancel request for unknown order, ignoring');
        return;
    }

    if (state.status !== 'open') {
        log.warn({ orderId, status: state.status }, 'Order already resolved, cannot cancel');
        return;
    }

    // Clean up in-memory store immediately so matchOrders skips it on next tick.
    reverseOrders.delete(orderId);
    const symbolOrders = orders.get(state.symbol) || [];
    orders.set(state.symbol, symbolOrders.filter(o => o.orderId !== orderId));

    // Remove from Redis so it isn't restored on next engine restart.
    removeOrder(orderId).catch((err) =>
        log.error({ err, orderId }, 'Failed to remove cancelled order from Redis'),
    );

    log.info({ orderId, symbol: state.symbol }, 'Order cancelled');

    await publishOrderEvent({
        orderId,
        symbol: state.symbol,
        quantity: state.quantity,
        price: state.price,
        side: state.side,
        type: state.type,
        status: 'cancelled',
    });
}
