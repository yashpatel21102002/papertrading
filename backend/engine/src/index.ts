import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchStockData } from './utils/yahoo';
import { RedisClient } from './utils/redisClient';
import orderRouter from './routes/ordersRouter';
import marketRouter from './routes/marketRouter'

const app = express();
dotenv.config();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/order", orderRouter);
app.use("/api/market", marketRouter);

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
})

//fetching the stock data for the given symbols every 2 seconds (getting interval from env file)
fetchStockData()

//removing the connection when the process is terminated
process.on('SIGINT', () => {
    RedisClient.disconnect();
    process.exit();
});

process.on('SIGTERM', () => {
    RedisClient.disconnect();
    process.exit();
});



