import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/authRouter';
import orderRouter from './routes/orderRouter';
import portfolioRouter from './routes/portfolioRouter';
import { authenticate } from './middleware/auth';
import { startEngineSubscriber } from './utils/engineSubscriber';
import { redisManager } from './utils/redisClient';
import { errorHandler } from './middleware/errorHandler';
import { validateEnv } from './utils/envValidator';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Public Routes
app.use('/api/auth', authRouter);

// Protected Routes
app.use('/api/orders', authenticate, orderRouter);
app.use('/api/portfolio', authenticate, portfolioRouter);

app.use(errorHandler);

async function bootstrap() {
    // 1. Connect Redis first
    await redisManager.connect();

    // 2. Start Subscriber worker
    startEngineSubscriber();

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    })
}

bootstrap();