import { Router, Response } from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { produceOrderCreated, produceOrderCancelRequested } from '../kafka/orderProducer';
import logger from '../utils/logger';

const log = logger.child({ module: 'order-router' });
const router = Router();
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8002';

const orderCreateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many order requests, please slow down' },
    // Route is behind authenticate — req.user.id is always present.
    keyGenerator: (req: any) => req.user?.id ?? 'unauthenticated',
});

const VALID_SIDES = ['buy', 'sell'] as const;
const VALID_TYPES = ['limit', 'market'] as const;
const VALID_STATUSES = ['pending', 'open', 'filled', 'cancelled'] as const;

// POST /api/orders/create
router.post('/create', orderCreateLimiter, async (req: AuthRequest, res: Response) => {
    const { symbol, quantity, price, side, type } = req.body;
    const userId = req.user?.id!;

    if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ error: 'symbol is required' });
    }
    if (!quantity || typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({ error: 'quantity must be a positive integer' });
    }
    if (!VALID_SIDES.includes(side)) {
        return res.status(400).json({ error: 'side must be buy or sell' });
    }
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'type must be limit or market' });
    }
    if (type === 'limit' && (typeof price !== 'number' || price <= 0)) {
        return res.status(400).json({ error: 'price must be a positive number for limit orders' });
    }

    try {
        let lockPrice = price;

        // For market orders, fetch the current live price from the engine and add a
        // 5% slippage buffer. The actual fill will happen at the real execution price
        // and any excess locked funds will be refunded by the order consumer.
        if (type === 'market') {
            const response = await axios.get<{ regularMarketPrice: number }>(`${ENGINE_URL}/api/market/${symbol}`);
            lockPrice = response.data.regularMarketPrice * 1.05;
            if (!lockPrice) {
                return res.status(503).json({ error: 'Market price unavailable, try again shortly' });
            }
        }

        const totalLockedValue = lockPrice * quantity;

        // Serializable isolation prevents two concurrent buy requests from both
        // reading the same balance, passing the check, and overdrawing the account.
        const order = await prisma.$transaction(async (tx) => {
            if (side === 'buy') {
                const user = await tx.user.findUnique({ where: { id: userId } });
                if (!user || user.balance < totalLockedValue) {
                    throw new Error('Insufficient funds (including slippage buffer)');
                }
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        balance: { decrement: totalLockedValue },
                        lockedBalance: { increment: totalLockedValue },
                    },
                });
            } else {
                const holding = await tx.holding.findUnique({
                    where: { userId_symbol: { userId, symbol } },
                });
                if (!holding || holding.quantity < quantity) {
                    throw new Error('Insufficient shares available');
                }
                await tx.holding.update({
                    where: { id: holding.id },
                    data: {
                        quantity: { decrement: quantity },
                        lockedQuantity: { increment: quantity },
                    },
                });
            }

            return tx.order.create({
                data: {
                    userId,
                    symbol,
                    quantity,
                    price: type === 'market' ? 0 : price,
                    side,
                    status: 'pending',
                    type,
                    lockedValue: side === 'buy' ? totalLockedValue : quantity,
                },
            });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        // Fire-and-forget: respond immediately, publish to Kafka in background.
        // Funds are already locked in the DB so the order is safe even if Kafka is slow.
        res.status(201).json({ message: 'Order placed successfully', orderId: order.id });

        produceOrderCreated({
            orderId: order.id,
            symbol,
            quantity,
            price: type === 'market' ? null : price,
            side,
            type,
        }).catch((kafkaErr) => {
            log.fatal({ err: kafkaErr, orderId: order.id }, 'Failed to publish order.created — order stuck pending, manual intervention required');
        });

    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Order creation failed' });
    }
});

// DELETE /api/orders/cancel/:id
router.delete('/cancel/:id', async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const orderId = String(req.params.id);

    try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order || order.userId !== userId || order.status !== 'open') {
            return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
        }

        // Publish cancel request — engine removes it from the in-memory store and
        // emits a 'cancelled' event which the Kafka consumer uses to unlock funds.
        await produceOrderCancelRequested(orderId);

        res.status(202).json({ message: 'Cancellation request sent to engine' });

    } catch (err) {
        log.error({ err, orderId }, 'Cancel request failed');
        res.status(500).json({ error: 'Failed to send cancellation request' });
    }
});

// GET /api/orders/get?status=open&page=1&limit=20
router.get('/get', async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined;

    if (status && !VALID_STATUSES.includes(status as any)) {
        return res.status(400).json({ error: 'Invalid status filter' });
    }

    const take = Math.min(parseInt(limit ?? '') || 20, 100);
    const skip = (Math.max(parseInt(page ?? '') || 1, 1) - 1) * take;

    try {
        const [orders, total] = await prisma.$transaction([
            prisma.order.findMany({
                where: { userId, ...(status ? { status } : {}) },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            prisma.order.count({
                where: { userId, ...(status ? { status } : {}) },
            }),
        ]);
        res.json({ orders, total, page: skip / take + 1, limit: take });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/orders/order/:orderId
router.get('/order/:orderId', async (req: AuthRequest, res: Response) => {
    const orderId = String(req.params.orderId);
    const userId = req.user?.id!;

    try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.userId !== userId) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
