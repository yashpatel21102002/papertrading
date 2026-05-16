import { prisma } from './prisma';
import { fetchAllPrices } from '../routes/portfolioRouter';
import logger from './logger';

const log = logger.child({ module: 'snapshot-scheduler' });

// Returns today's date in IST as "YYYY-MM-DD"
function todayIST(): string {
    return new Date(Date.now() + 5.5 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
}

async function takeSnapshot(): Promise<void> {
    const date = todayIST();

    let priceMap: Record<string, number>;
    try {
        priceMap = await fetchAllPrices();
    } catch {
        priceMap = {};
    }

    const users = await prisma.user.findMany({ include: { holdings: true } });
    if (users.length === 0) return;

    for (const user of users) {
        let holdingsValue = 0;
        for (const h of user.holdings) {
            const price = priceMap[h.symbol] ?? h.averagePrice;
            holdingsValue += price * h.quantity;
        }
        const totalValue = user.balance + user.lockedBalance + holdingsValue;

        await prisma.equitySnapshot.upsert({
            where: { userId_date: { userId: user.id, date } },
            create: { userId: user.id, value: totalValue, date },
            update: { value: totalValue, takenAt: new Date() },
        });
    }

    log.info({ date, users: users.length }, 'Equity snapshots taken');
}

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startSnapshotScheduler(): void {
    // Immediate snapshot on startup so the chart is never empty
    takeSnapshot().catch((err) => log.error({ err }, 'Initial snapshot failed'));

    setInterval(() => {
        takeSnapshot().catch((err) => log.error({ err }, 'Hourly snapshot failed'));
    }, INTERVAL_MS);

    log.info('Snapshot scheduler started (every 1 h, grouped by IST date)');
}
