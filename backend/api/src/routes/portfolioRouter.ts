import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';
import logger from '../utils/logger';

const log = logger.child({ module: 'portfolio-router' });
const router = Router();
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8002';

/**
 * Fetches all live prices from the engine in a single call.
 * Returns a map: { "AAPL": 182.5, "TSLA": 245.1, ... }
 */
export async function fetchAllPrices(): Promise<Record<string, number>> {
    try {
        const response = await axios.get<Record<string, { regularMarketPrice: number }>>(
            `${ENGINE_URL}/api/market`
        );
        const priceMap: Record<string, number> = {};
        for (const [symbol, data] of Object.entries(response.data)) {
            if (data?.regularMarketPrice) priceMap[symbol] = data.regularMarketPrice;
        }
        return priceMap;
    } catch (err) {
        log.warn('Engine price fetch failed, falling back to avg prices');
        return {};
    }
}

/**
 * GET /api/portfolio/summary
 * Returns full portfolio breakdown shaped for the frontend PortfolioPage.
 */
router.get('/summary', async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;

    try {
        const [user, rawSnapshots] = await prisma.$transaction([
            prisma.user.findUnique({ where: { id: userId }, include: { holdings: true } }),
            prisma.equitySnapshot.findMany({
                where: { userId },
                orderBy: { date: 'asc' },
                take: 30,
            }),
        ]);

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Single batch call to engine instead of N individual calls
        const priceMap = await fetchAllPrices();

        let totalEquity = 0;
        let totalCostBasis = 0;

        const holdings = user.holdings.map((h) => {
            // Fallback to avgPrice if engine doesn't have this ticker
            const ltp = priceMap[h.symbol] ?? h.averagePrice;
            const marketValue = ltp * h.quantity;
            const costBasis = h.averagePrice * h.quantity;

            totalEquity += marketValue;
            totalCostBasis += costBasis;

            return {
                symbol: h.symbol,
                qty: h.quantity,
                avgPrice: h.averagePrice,
                currentPrice: ltp,
                marketValue,
            };
        });

        // Allocation is computed after totalEquity is finalized
        const portfolioHoldings = holdings.map((h) => ({
            ...h,
            allocation: totalEquity > 0
                ? ((h.marketValue / totalEquity) * 100).toFixed(1)
                : '0.0',
        }));

        // Total unrealized PnL across all open positions
        const unrealizedPnl = totalEquity - totalCostBasis;

        // True portfolio value = cash + locked cash + holdings market value
        const totalPortfolioValue = user.balance + user.lockedBalance + totalEquity;

        // Overall PnL vs starting balance of ₹10,00,000
        const INITIAL_BALANCE = 1_000_000;
        const overallPnl = totalPortfolioValue - INITIAL_BALANCE;

        // Build 30-point equity history from real snapshots.
        // Pad the front with INITIAL_BALANCE entries when fewer than 30 snapshots exist.
        const DAYS = 30;
        const snapCount = rawSnapshots.length;
        const equityHistory = Array.from({ length: DAYS }, (_, i) => {
            const snapshotIdx = i - (DAYS - snapCount);
            if (snapshotIdx < 0) {
                // Before the user's first snapshot — show starting balance
                const msAgo = (DAYS - 1 - i) * 86_400_000;
                return {
                    date: new Date(Date.now() - msAgo).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                    equity: INITIAL_BALANCE,
                };
            }
            const snap = rawSnapshots[snapshotIdx];
            return {
                date: new Date(snap.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                equity: snap.value,
            };
        });

        return res.json({
            totalPortfolioValue,   // cash + locked + holdings — the real portfolio value
            holdingsValue: totalEquity,
            unrealizedPnl,
            overallPnl,
            buyingPower: user.balance,
            portfolioHoldings,
            equityHistory,
        });
    } catch (error) {
        log.error({ err: error, userId }, 'Portfolio summary failed');
        return res.status(500).json({ error: 'Portfolio sync failed' });
    }
});

/**
 * GET /api/portfolio/trades
 * Full trade history with per-trade realized P&L and running total.
 */
router.get('/trades', async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;

    try {
        const [trades, agg] = await prisma.$transaction([
            prisma.trade.findMany({
                where: { userId },
                orderBy: { filledAt: 'desc' },
                take: 200,
            }),
            prisma.trade.aggregate({
                where: { userId, side: 'sell' },
                _sum: { realizedPnl: true },
            }),
        ]);

        return res.json({
            trades,
            totalRealizedPnl: agg._sum.realizedPnl ?? 0,
        });
    } catch (error) {
        log.error({ err: error, userId }, 'Trade history fetch failed');
        return res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});

/**
 * POST /api/portfolio/reset
 * Wipes all holdings, orders, and trades for the user, restores the ₹10L starting balance.
 * Orders already live in the engine's memory will be skipped gracefully by the consumer
 * when they fill (order not found in DB → log warn → return).
 */
router.post('/reset', async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;

    try {
        await prisma.$transaction([
            prisma.trade.deleteMany({ where: { userId } }),
            prisma.order.deleteMany({ where: { userId } }),
            prisma.holding.deleteMany({ where: { userId } }),
            prisma.user.update({
                where: { id: userId },
                data: { balance: 1_000_000, lockedBalance: 0 },
            }),
        ]);

        log.info({ userId }, 'Portfolio reset to ₹10,00,000');
        return res.json({ message: 'Portfolio reset successfully' });
    } catch (error) {
        log.error({ err: error, userId }, 'Portfolio reset failed');
        return res.status(500).json({ error: 'Reset failed' });
    }
});

/**
 * GET /api/portfolio/portfolio
 * Raw balance + holdings — used by order placement screens etc.
 */
router.get('/portfolio', async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;

    try {
        const [user, holdings] = await prisma.$transaction([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.holding.findMany({ where: { userId } }),
        ]);

        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.json({
            balance: user.balance,
            lockedBalance: user.lockedBalance,
            holdings,
        });
    } catch (error) {
        log.error({ err: error, userId }, 'Portfolio fetch failed');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;