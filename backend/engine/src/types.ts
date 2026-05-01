export interface EngineOrder {
    orderId: string;
    symbol: string;
    quantity: number;
    price: number;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    status?: 'open' | 'filled' | 'cancelled';
}

export interface OrderEvent extends EngineOrder {
    executionPrice?: number;
}

export interface StockUpdate {
    symbol: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketTime: Date | number;
    shortName: string;
}
