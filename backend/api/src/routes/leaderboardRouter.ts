import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { fetchAllPrices } from './portfolioRouter';
import logger from '../utils/logger';

const log = logger.child({ module: 'leaderboard-router' });
const router = Router();
const INITIAL_BALANCE = 1_000_000;

// Mask email: "john.doe@gmail.com" → "jo***e@gmail.com"
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return `${local}@${domain}`;
    const visible = local.slice(0, 2) + '***' + local.slice(-1);
    return `${visible}@${domain}`;
}

/**
 * GET /api/leaderboard
 * Returns all users ranked by total portfolio value, masking emails.
 * The current user's entry includes `isCurrentUser: true`.
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    const currentUserId = req.user?.id!;

    try {
        const [priceMap, users] = await Promise.all([
            fetchAllPrices(),
            prisma.user.findMany({ include: { holdings: true } }),
        ]);

        const entries = users.map((u) => {
            let holdingsValue = 0;
            for (const h of u.holdings) {
                const price = priceMap[h.symbol] ?? h.averagePrice;
                holdingsValue += price * h.quantity;
            }
            const totalValue = u.balance + u.lockedBalance + holdingsValue;
            const pnl = totalValue - INITIAL_BALANCE;
            const pnlPct = (pnl / INITIAL_BALANCE) * 100;

            return {
                userId: u.id,
                email: maskEmail(u.email),
                totalValue,
                pnl,
                pnlPct,
                isCurrentUser: u.id === currentUserId,
            };
        });

        entries.sort((a, b) => b.totalValue - a.totalValue);

        return res.json(entries.map((e, i) => ({ ...e, rank: i + 1 })));
    } catch (err) {
        log.error({ err }, 'Leaderboard fetch failed');
        return res.status(500).json({ error: 'Leaderboard unavailable' });
    }
});

export default router;
