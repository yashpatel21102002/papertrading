export interface OrderEntry {
    orderId: string;
    quantity: number;
    price: number;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
}

export interface OrderState {
    symbol: string;
    quantity: number;
    price: number;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    status: 'open' | 'filled' | 'cancelled';
}

// symbol → pending orders for that symbol
export const orders: Map<string, OrderEntry[]> = new Map();
// orderId → full state (symbol, status, etc.)
export const reverseOrders: Map<string, OrderState> = new Map();
