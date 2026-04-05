import express from 'express';
import { RedisClient } from '../utils/redisClient';
import { marketManager } from '../utils/MarketManager';

export const orders: Map<string, { orderId: string, quantity: number, price: number, side: 'buy' | 'sell', type: 'limit' | 'market' }[]> = new Map();
export const reverseOrders: Map<string, { symbol: string, quantity: number, price: number, side: 'buy' | 'sell', type: 'limit' | 'market', status: 'open' | 'filled' | 'cancelled' }> = new Map();

const router = express.Router();

//creating the order in the memory object
router.post('/create', (req, res) => {
    console.log("Received order creation request:", req.body);
    const { orderId, symbol, quantity, price, side, type } = req.body;
    if (!orderId || !symbol || !quantity || !price || !side || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!marketManager.isMarketOpen(symbol)) {
        return res.status(403).json({
            error: `Cannot place order. ${symbol} market is currently ${marketManager.getPrice(symbol) ? 'CLOSED' : 'UNKNOWN'}.`
        });
    }

    if (!orders.has(symbol)) {
        orders.set(symbol, []);
    }
    orders.get(symbol)!.push({ orderId, quantity, price, side, type });

    reverseOrders.set(orderId, { symbol, quantity, price, side, type, status: 'open' });
    RedisClient.getclient().publisher.publish(`order:${orderId}`, JSON.stringify({
        orderId,
        quantity,
        price,
        side,
        type,
        status: 'open'
    }));

    res.json({ message: 'Order created successfully', orderId });
})


//cancelling the order by removing it from the memory object
router.post('/cancel', (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = reverseOrders.get(orderId);
    if (!order) {
        return res.status(400).json({ error: "Order not found" })
    }

    //we want to cancel the order 
    order.status = 'cancelled';

    //setting the cancelled order in the reverseOrders map
    reverseOrders.set(orderId, order);

    //publishing the cancelled order to the redis channel
    RedisClient.getclient().publisher.publish(`order:${orderId}`, JSON.stringify({
        orderId,
        ...order,
        status: 'cancelled'
    }));

    res.json({ message: 'Order cancelled successfully', orderId });
});



export default router;