import { Consumer } from 'kafkajs';
import { kafka, TOPICS } from './kafkaClient';
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

const log = logger.child({ module: 'kafka-consumer' });

let consumer: Consumer | null = null;

export async function connectConsumer(): Promise<void> {
    consumer = kafka.consumer({ groupId: 'api-order-events-group' });
    await consumer.connect();
    await consumer.subscribe({ topics: [TOPICS.ORDER_EVENTS], fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;

            let event: OrderEvent;
            try {
                event = JSON.parse(message.value.toString());
            } catch {
                log.error('Failed to parse order.events message, skipping');
                return;
            }

            await processOrderEvent(event);
        },
    });

    log.info('Kafka consumer connected, listening on order.events');
}

export async function disconnectConsumer(): Promise<void> {
    if (consumer) {
        await consumer.disconnect();
        consumer = null;
        log.info('Kafka consumer disconnected');
    }
}

interface OrderEvent {
    orderId: string;
    symbol: string;
    quantity: number;
    price: number;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    status: 'open' | 'filled' | 'cancelled';
    executionPrice?: number;
}

async function processOrderEvent(event: OrderEvent): Promise<void> {
    const { orderId, status } = event;

    try {
        await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });

            if (!order) {
                log.warn({ orderId }, 'Order not found in DB, skipping');
                return;
            }

            if (status === 'open') {
                if (order.status !== 'pending') return;
                await tx.order.update({ where: { id: orderId }, data: { status: 'open' } });
                log.info({ orderId }, 'Order status updated to open');
                return;
            }

            // cancelled can arrive for a 'pending' order (market closed instant reject)
            // or for an 'open' order (explicit cancel). filled only valid for 'open'.
            const isActionable =
                (status === 'cancelled' && (order.status === 'pending' || order.status === 'open')) ||
                (status === 'filled' && order.status === 'open');

            if (!isActionable) {
                log.warn({ orderId, currentStatus: order.status, incomingStatus: status }, 'Order event not actionable, skipping');
                return;
            }

            if (status === 'filled') {
                await handleFill(tx, order, event);
                log.info({ orderId, symbol: order.symbol, side: order.side, executionPrice: event.executionPrice }, 'Order filled');
            } else if (status === 'cancelled') {
                await handleRefund(tx, order);
                log.info({ orderId, symbol: order.symbol, side: order.side }, 'Order cancelled and refunded');
            }
        });
    } catch (err) {
        log.error({ err, orderId }, 'Transaction failed for order event');
    }
}

async function handleFill(tx: Prisma.TransactionClient, order: any, event: OrderEvent): Promise<void> {
    // Always use executionPrice for cost/proceeds — it reflects the actual fill,
    // not the limit price which may differ for limit orders filled at a better price.
    const executionPrice = event.executionPrice ?? event.price;
    const actualCost = executionPrice * event.quantity;

    let avgCostBasis = executionPrice;
    let realizedPnl = 0;

    if (order.side === 'buy') {
        // lockedValue is what was moved to lockedBalance at order creation.
        // Refund any difference between the locked amount and the actual fill cost.
        const change = order.lockedValue - actualCost;

        await tx.user.update({
            where: { id: order.userId },
            data: {
                lockedBalance: { decrement: order.lockedValue },
                balance: { increment: change > 0 ? change : 0 },
            },
        });

        // Upsert holding with weighted average price recalculation.
        const existing = await tx.holding.findUnique({
            where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
        });

        if (existing) {
            const newQty = existing.quantity + event.quantity;
            const newAvg = (existing.quantity * existing.averagePrice + event.quantity * executionPrice) / newQty;
            await tx.holding.update({
                where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
                data: { quantity: newQty, averagePrice: newAvg },
            });
        } else {
            await tx.holding.create({
                data: {
                    userId: order.userId,
                    symbol: order.symbol,
                    quantity: event.quantity,
                    averagePrice: executionPrice,
                },
            });
        }
    } else {
        // Read avgPrice BEFORE unlocking so we can compute realized P&L.
        const holding = await tx.holding.findUnique({
            where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
        });
        avgCostBasis = holding?.averagePrice ?? executionPrice;
        realizedPnl = (executionPrice - avgCostBasis) * event.quantity;

        // Unlock the reserved shares and credit the sale proceeds.
        await tx.holding.update({
            where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
            data: { lockedQuantity: { decrement: order.quantity } },
        });
        await tx.user.update({
            where: { id: order.userId },
            data: { balance: { increment: actualCost } },
        });
    }

    await tx.order.update({
        where: { id: order.id },
        data: { status: 'filled', price: executionPrice },
    });

    // Record every fill as a Trade for history and realized P&L tracking.
    await tx.trade.create({
        data: {
            userId: order.userId,
            orderId: order.id,
            symbol: order.symbol,
            side: order.side,
            quantity: event.quantity,
            executionPrice,
            avgCostBasis,
            realizedPnl,
        },
    });
}

async function handleRefund(tx: Prisma.TransactionClient, order: any): Promise<void> {
    if (order.side === 'buy') {
        // Use lockedValue — this is the exact amount moved to lockedBalance,
        // correctly handles market orders (price=0) and limit orders with a buffer.
        await tx.user.update({
            where: { id: order.userId },
            data: {
                lockedBalance: { decrement: order.lockedValue },
                balance: { increment: order.lockedValue },
            },
        });
    } else {
        await tx.holding.update({
            where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
            data: {
                lockedQuantity: { decrement: order.quantity },
                quantity: { increment: order.quantity },
            },
        });
    }

    await tx.order.update({
        where: { id: order.id },
        data: { status: 'cancelled' },
    });
}
