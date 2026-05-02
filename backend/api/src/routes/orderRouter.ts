import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';
import { validateOrderInput } from '../utils/validators';

const router = Router();
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:5000';

// POST /api/orders/create
router.post('/create', async (req: AuthRequest, res: Response, next: any) => {
    try {
        const { symbol, quantity, price, side, type } = req.body;
        const userId = req.user?.id!;

        if (!validateOrderInput(quantity, price, type)) {
            return res.status(400).json({ error: "Invalid order input. Ensure quantity and price are positive." });
        }

        let lockPrice = price;

        // 1. Calculate the exact value to lock
        if (type === 'market') {
            const ticker: any = await axios.get(`${ENGINE_URL}/api/ticker/${symbol}`);
            // Add 5% buffer to ensure the market order doesn't fail due to minor price jumps
            lockPrice = ticker.data.price * 1.05;
        }

        const totalLockedValue = lockPrice * quantity;

        // 2. Database Transaction: Atomic Lock
        const order = await prisma.$transaction(async (tx) => {
            if (side === 'buy') {
                const user = await tx.user.findUnique({ where: { id: userId } });
                if (!user || user.balance < totalLockedValue) {
                    throw new Error("Insufficient funds (including slippage buffer)");
                }

                // Move funds to locked
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        balance: { decrement: totalLockedValue },
                        lockedBalance: { increment: totalLockedValue }
                    }
                });
            } else {
                const holding = await tx.holding.findUnique({
                    where: { userId_symbol: { userId, symbol } }
                });
                console.log(holding)
                // For selling, we lock the quantity of shares, not the price
                if (!holding || holding.quantity < quantity) {
                    throw new Error("Insufficient shares available");
                }

                await tx.holding.update({
                    where: { id: holding.id },
                    data: {
                        quantity: { decrement: quantity },
                        lockedQuantity: { increment: quantity }
                    }
                });
            }

            // 3. Create the order record with the stored 'lockedValue'
            return await tx.order.create({
                data: {
                    userId,
                    symbol,
                    quantity,
                    price: type === 'market' ? 0 : price,
                    side,
                    status: 'open',
                    type,
                    lockedValue: side === 'buy' ? totalLockedValue : quantity
                }
            });
        });

        // 4. Notify Engine (Outside Transaction)
        try {
            await axios.post(`${ENGINE_URL}/api/order/create`, {
                orderId: order.id,
                userId,
                symbol,
                quantity,
                price: type === 'market' ? null : price,
                side,
                type
            });
        } catch (engineErr) {
            // Note: In a production app, you would trigger an automatic rollback/cleanup
            // if the engine is unreachable.
            console.error("[ENGINE_ERROR] Failed to reach engine:", engineErr);
        }

        res.status(201).json({ message: "Order placed successfully", orderId: order.id });

    } catch (err: any) {
        next(err);
    }
});

// DELETE /api/orders/cancel/:id
router.delete('/cancel/:id', async (req: AuthRequest, res: Response, next: any) => {
    try {
        const userId = req.user?.id!;
        const orderId = String(req.params.id); // Fixed: removed the [0] index bug

        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order || order.userId !== userId || order.status !== 'open') {
            return res.status(404).json({ error: "Order not found or cannot be cancelled" });
        }

        // We do NOT unlock funds here.
        // We request the engine to cancel. The engine will emit a 'cancelled' event
        // via Pub/Sub, which your subscriber will use to unlock funds safely.
        await axios.post(`${ENGINE_URL}/api/order/cancel`, {
            orderId,
            symbol: order.symbol
        });

        res.status(202).json({ message: "Cancellation request sent to engine" });

    } catch (err) {
        next(err);
    }
});

// GET /api/orders/get
router.get('/get', async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { status } = req.query;
    console.log(`[API] Fetching orders for User ${userId} with status filter: ${status || 'none'}`);
    try {
        const orders = await prisma.order.findMany({
            where: {
                userId: userId,
                ...(status ? { status: status as string } : {})
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/orders/order/:orderId
router.get('/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ error: "Order not found" });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;