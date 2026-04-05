import express from 'express';
import dotenv from 'dotenv';
import { WebSocketManager } from './utils/webSocketManager';


dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8004;

const wss = WebSocketManager.getInstance();
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
})