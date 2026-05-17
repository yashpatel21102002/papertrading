import { RedisClient } from '../utils/redisClient';
import { orders, reverseOrders, OrderEntry, OrderState } from './orderStore';
import logger from '../utils/logger';

const log = logger.child({ module: 'order-persistence' });

// Redis key conventions:
//   order:{orderId}   — Hash of OrderState fields
//   orders:open       — Set of all open order IDs

const OPEN_SET_KEY = 'orders:open';

function orderKey(orderId: string) {
    return `order:${orderId}`;
}

/** Write a newly created open order to Redis. */
export async function persistOrder(orderId: string, state: OrderState): Promise<void> {
    const client = RedisClient.getclient().client;
    try {
        await Promise.all([
            client.hSet(orderKey(orderId), {
                symbol: state.symbol,
                quantity: String(state.quantity),
                price: String(state.price),
                side: state.side,
                type: state.type,
                status: state.status,
            }),
            client.sAdd(OPEN_SET_KEY, orderId),
        ]);
    } catch (err) {
        log.error({ err, orderId }, 'Failed to persist order to Redis');
    }
}

/** Remove a resolved (filled / cancelled) order from Redis. */
export async function removeOrder(orderId: string): Promise<void> {
    const client = RedisClient.getclient().client;
    try {
        await Promise.all([
            client.del(orderKey(orderId)),
            client.sRem(OPEN_SET_KEY, orderId),
        ]);
    } catch (err) {
        log.error({ err, orderId }, 'Failed to remove order from Redis');
    }
}

/**
 * Called once at startup.
 * Reads all open orders from Redis and rebuilds the in-memory Maps.
 * If the engine crashed mid-fill, the API's idempotent event handler will
 * safely ignore duplicate fill/cancel events.
 */
export async function restoreOrdersFromRedis(): Promise<void> {
    const client = RedisClient.getclient().client;
    try {
        const orderIds = await client.sMembers(OPEN_SET_KEY);
        if (orderIds.length === 0) {
            log.info('No open orders found in Redis — starting with empty order store');
            return;
        }

        let restored = 0;
        for (const orderId of orderIds) {
            const raw = await client.hGetAll(orderKey(orderId));
            if (!raw.symbol || !raw.quantity || !raw.price || !raw.side || !raw.type) {
                log.warn({ orderId }, 'Incomplete order data in Redis, skipping');
                await client.sRem(OPEN_SET_KEY, orderId);
                continue;
            }

            const state: OrderState = {
                symbol: raw.symbol,
                quantity: parseInt(raw.quantity),
                price: parseFloat(raw.price),
                side: raw.side as 'buy' | 'sell',
                type: raw.type as 'limit' | 'market',
                status: 'open',
            };

            const entry: OrderEntry = {
                orderId,
                quantity: state.quantity,
                price: state.price,
                side: state.side,
                type: state.type,
            };

            if (!orders.has(state.symbol)) orders.set(state.symbol, []);
            orders.get(state.symbol)!.push(entry);
            reverseOrders.set(orderId, state);
            restored++;
        }

        log.info({ restored, total: orderIds.length }, 'Restored open orders from Redis');
    } catch (err) {
        log.error({ err }, 'Failed to restore orders from Redis — starting with empty store');
    }
}
