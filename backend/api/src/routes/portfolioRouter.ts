import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';

const router = Router();
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:5000';

/**
 * Fetches all live prices from the engine in a single call.
 * Returns a map: { "AAPL": 182.5, "TSLA": 245.1, ... }
 */
async function fetchAllPrices(): Promise<Record<string, number>> {
    try {
        const response = await axios.get<Record<string, { price: number }>>(
            `${ENGINE_URL}/api/market`
        );
        const priceMap: Record<string, number> = {};
        for (const [symbol, data] of Object.entries(response.data)) {
            if (data?.price) priceMap[symbol] = data.price;
        }
        return priceMap;
    } catch (err) {
        console.warn('[Portfolio] Engine price fetch failed, falling back to avg prices');
        return {};
    }
}

/**
 * GET /api/portfolio/summary
 * Returns full portfolio breakdown shaped for the frontend PortfolioPage.
 */
router.get('/summary', async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.user?.id!;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { holdings: true }
        });

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

        // Total unrealized PnL across all positions
        const totalPnl = totalEquity - totalCostBasis;

        // equity history - mock for now, replace with DB snapshots later
        // Tip: persist a daily `EquitySnapshot` model to make this real
        const baseEquity = totalEquity + user.balance + user.lockedBalance;
        const equityHistory = Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86_400_000).toLocaleDateString(
                'en-IN',
                { month: 'short', day: 'numeric' }
            ),
            equity: Math.max(0, baseEquity - (29 - i) * 500),
        }));

        return res.json({
            totalEquity,
            todayPnl: totalPnl,         // frontend labels this "Total PnL" — matches
            buyingPower: user.balance,
            portfolioHoldings,
            equityHistory,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/portfolio/portfolio
 * Raw balance + holdings — used by order placement screens etc.
 */
router.get('/portfolio', async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.user?.id!;
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
        next(error);
    }
});

export default router;