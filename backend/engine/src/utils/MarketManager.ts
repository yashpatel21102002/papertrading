export type MarketStateCode = 'PRE' | 'PREPRE' | 'REGULAR' | 'POST' | 'POSTPOST' | 'CLOSED';

export interface StockSnapshot {
    symbol: string;
    regularMarketPrice: number;
    regularMarketChange: number | null;
    regularMarketChangePercent: number | null;
    regularMarketTime: Date | null;
    regularMarketOpen: number | null;
    regularMarketDayHigh: number | null;
    regularMarketDayLow: number | null;
    regularMarketVolume: number | null;
    marketState: MarketStateCode;
    exchange: string | null;
    fullExchangeName: string | null;
    currency: string | null;
    shortName: string | null;
    lastUpdated: number;
}

class MarketManager {
    private static instance: MarketManager;
    private marketData: Map<string, StockSnapshot> = new Map();

    private constructor() { }

    public static getInstance(): MarketManager {
        if (!MarketManager.instance) {
            MarketManager.instance = new MarketManager();
        }
        return MarketManager.instance;
    }

    public updateSymbol(symbol: string, data: Omit<StockSnapshot, 'lastUpdated'>): void {
        this.marketData.set(symbol, { ...data, lastUpdated: Date.now() });
    }

    public isMarketOpen(symbol: string): boolean {
        const data = this.marketData.get(symbol);
        return data?.marketState === 'REGULAR';
    }

    public getPrice(symbol: string): number | null {
        return this.marketData.get(symbol)?.regularMarketPrice ?? null;
    }

    public getStockData(symbol: string): StockSnapshot | null {
        return this.marketData.get(symbol) ?? null;
    }

    public getAllStockData(): Record<string, StockSnapshot> {
        return Object.fromEntries(this.marketData);
    }
}

export const marketManager = MarketManager.getInstance();
