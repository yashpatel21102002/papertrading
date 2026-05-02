import { redisManager } from './redisClient';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

export const startEngineSubscriber = async () => {
    const subscriber = redisManager.getSubscriber();

    await subscriber.pSubscribe('order:*', async (message, channel) => {
        const event = JSON.parse(message);
        const { orderId, status } = event;
        console.log(message, channel);
        console.log(`\n[🔔 EVENT] Received ${channel} | OrderID: ${orderId} | Status: ${status}`);

        if (!event) {
            return console.warn(`[⚠️ WARNING] Empty event received on channel ${channel}`);
        }

        if (event.status === "open") {
            console.log(`[INFO] Order ${orderId} is now OPEN. No DB action required.`);
            return;
        }
        try {
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const order = await tx.order.findUnique({ where: { id: orderId } });

                if (!order) {
                    console.warn(`[⚠️ SKIP] Order ${orderId} not found in DB.`);
                    return;
                }

                if (order.status !== 'open') {
                    console.warn(`[⚠️ SKIP] Order ${orderId} is already '${order.status}'.`);
                    return;
                }

                console.log(`[🚀 START] Processing ${order.side.toUpperCase()} for User ${order.userId}`);

                if (status === 'filled') {
                    await handleFill(tx, order, event);
                } else if (status === 'cancelled' || status === 'failed') {
                    await handleRefund(tx, order);
                }
            });
            console.log(`[🏁 FINISHED] Transaction committed successfully for Order ${orderId}`);
        } catch (error) {
            console.error(`[❌ CRITICAL] Transaction rolled back for Order ${orderId}:`, error);
        }
    });
};

async function handleFill(tx: Prisma.TransactionClient, order: any, event: any) {
    const actualCost = event.price * event.quantity;
    const originalLocked = order.lockedValue; // Use the stored value, not a calculation

    if (order.side === 'buy') {
        // 1. Clear the lock and refund the "slippage change"
        const change = originalLocked - actualCost;

        await tx.user.update({
            where: { id: order.userId },
            data: {
                lockedBalance: { decrement: originalLocked },
                balance: { increment: change > 0 ? change : 0 }
            }
        });

        // 2. Add the shares and update average price
        const existingHolding = await tx.holding.findUnique({
            where: { userId_symbol: { userId: order.userId, symbol: order.symbol } }
        });

        if (existingHolding) {
            const newQuantity = existingHolding.quantity + event.quantity;
            const newAveragePrice = ((existingHolding.averagePrice * existingHolding.quantity) + (event.price * event.quantity)) / newQuantity;

            await tx.holding.update({
                where: { id: existingHolding.id },
                data: {
                    quantity: newQuantity,
                    averagePrice: newAveragePrice
                }
            });
        } else {
            await tx.holding.create({
                data: {
                    userId: order.userId,
                    symbol: order.symbol,
                    quantity: event.quantity,
                    averagePrice: event.price
                }
            });
        }

    } else {
        // SELL SIDE
        await tx.holding.update({
            where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
            data: { lockedQuantity: { decrement: order.quantity } }
        });

        await tx.user.update({
            where: { id: order.userId },
            data: { balance: { increment: actualCost } }
        });
    }

    await tx.order.update({
        where: { id: order.id },
        data: { status: 'filled', price: event.price }
    });
}

async function handleRefund(tx: Prisma.TransactionClient, order: any) {
    console.log(`[REFUND] Initiating recovery for ${order.side} order...`);

    if (order.side === 'buy') {
        const amount = order.lockedValue;
        const updatedUser = await tx.user.update({
            where: { id: order.userId },
            data: { lockedBalance: { decrement: amount }, balance: { increment: amount } }
        });
        console.log(`[DB:USER] Refunded ${amount} to User ${order.userId}. New Balance: ${updatedUser.balance}`);
    } else {
        const updatedHolding = await tx.holding.update({
            where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
            data: { lockedQuantity: { decrement: order.quantity }, quantity: { increment: order.quantity } }
        });
        console.log(`[DB:HOLDING] Returned ${order.quantity} shares to User ${order.userId}. New Quantity: ${updatedHolding.quantity}`);
    }

    const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'cancelled' }
    });
    console.log(`[DB:ORDER] Order ${finalOrder.id} status marked as CANCELLED`);
}