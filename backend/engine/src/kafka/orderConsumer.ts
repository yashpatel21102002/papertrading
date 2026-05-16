import { Consumer } from 'kafkajs';
import { kafka, TOPICS } from './kafkaClient';
import { orders, reverseOrders, OrderEntry } from '../store/orderStore';
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
    price: number;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
}

async function handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    const { orderId, symbol, quantity, price, side, type } = payload;

    if (!orderId || !symbol || !quantity || !price || !side || !type) {
        log.warn({ payload }, 'Malformed order.created message, skipping');
        return;
    }

    if (!marketManager.isMarketOpen(symbol)) {
        log.warn({ orderId, symbol }, 'Order rejected — market is not REGULAR');
        await publishOrderEvent({ orderId, symbol, quantity, price, side, type, status: 'cancelled' });
        return;
    }

    const entry: OrderEntry = { orderId, quantity, price, side, type };
    if (!orders.has(symbol)) orders.set(symbol, []);
    orders.get(symbol)!.push(entry);
    reverseOrders.set(orderId, { symbol, quantity, price, side, type, status: 'open' });

    log.info({ orderId, symbol, side, type, price, quantity }, 'Order registered');

    await publishOrderEvent({ orderId, symbol, quantity, price, side, type, status: 'open' });
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

    // Clean up in-memory store immediately so matchOrders skips it on next tick
    reverseOrders.delete(orderId);
    const symbolOrders = orders.get(state.symbol) || [];
    orders.set(state.symbol, symbolOrders.filter(o => o.orderId !== orderId));

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
