import express from "express";
import { marketManager } from "../utils/MarketManager";

const router = express.Router();

router.get("/:ticker", (req, res) => {
    const ticker = req.params.ticker;

    // Fetch the latest stock data for the requested ticker from the MarketManager
    const stockData = marketManager.getStockData(ticker);

    if (stockData) {
        res.status(200).json(stockData);
    } else {
        res.status(404).json({ error: "Ticker not found" });
    }
})

router.get("/", (req, res) => {
    res.status(200).json(marketManager.getAllStockData());
})


export default router;