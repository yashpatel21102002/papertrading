// --- utils/MarketManager.ts ---

export interface MarketState {
    price: number;
    status: string; // 'REGULAR', 'CLOSED', etc.
    lastUpdated: number;
}

class MarketManager {
    private static instance: MarketManager;
    private marketData: Map<string, MarketState> = new Map();

    private constructor() { }

    public static getInstance(): MarketManager {
        if (!MarketManager.instance) {
            MarketManager.instance = new MarketManager();
        }
        return MarketManager.instance;
    }

    // Called by the Poller (yahoo.ts)
    public updateSymbol(symbol: string, stockData: any) {
        this.marketData.set(symbol, stockData);
    }

    // Called by the Router (OrderRouter.ts)
    public isMarketOpen(symbol: string): boolean {
        const data = this.marketData.get(symbol);
        // If status is UNKNOWN (e.g. initial fetch not yet done), assume open for demo
        if (!data) return true;

        // Yahoo Finance marketState values can be 'REGULAR', 'CLOSED', 'PRE', 'POST', etc.
        return data.status === 'REGULAR' || data.status === 'PREMARKET' || data.status === 'POSTMARKET';
    }

    public getPrice(symbol: string): number | null {
        return this.marketData.get(symbol)?.price || null;
    }

    public getStockData(symbol: string): MarketState | null {
        return this.marketData.get(symbol) || null;
    }

    public getAllStockData() {
        return Object.fromEntries(this.marketData);
    }
}

export const marketManager = MarketManager.getInstance();