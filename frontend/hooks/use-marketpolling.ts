"use client"
import { useState, useEffect, useRef } from "react"
import axios from 'axios';
import { set } from "date-fns";

export interface MarketRange {
    low: number;
    high: number;
}

export interface StockQuote {
    language: string;
    region: string;
    quoteType: string;
    typeDisp: string;
    quoteSourceName: string;
    triggerable: boolean;
    customPriceAlertConfidence: string;
    currency: string;
    hasPrePostMarketData: boolean;
    firstTradeDateMilliseconds: string; // ISO Date String
    regularMarketTime: string;          // ISO Date String
    exchange: string;
    exchangeTimezoneName: string;
    exchangeTimezoneShortName: string;
    gmtOffSetMilliseconds: number;
    market: string;
    esgPopulated: boolean;
    regularMarketChangePercent: number;
    regularMarketPrice: number;
    priceHint: number;
    regularMarketChange: number;
    regularMarketDayHigh: number;
    regularMarketDayRange: MarketRange;
    regularMarketDayLow: number;
    regularMarketVolume: number;
    regularMarketPreviousClose: number;
    fullExchangeName: string;
    regularMarketOpen: number;
    fiftyTwoWeekLowChange: number;
    fiftyTwoWeekLowChangePercent: number;
    fiftyTwoWeekRange: MarketRange;
    fiftyTwoWeekHighChange: number;
    fiftyTwoWeekHighChangePercent: number;
    fiftyTwoWeekLow: number;
    fiftyTwoWeekHigh: number;
    sourceInterval: number;
    exchangeDataDelayedBy: number;
    tradeable: boolean;
    cryptoTradeable: boolean;
    marketState: string;
    shortName: string;
    symbol: string;
}

const MARKET_URL = process.env.NEXT_PUBLIC_MARKET_URL || "http://localhost:8002";

export const useMarketPolling = () => {
    const [marketData, setMarketData] = useState<Record<string, StockQuote>>({});
    const [flashData, setFlashData] = useState<Record<string, "up" | "down" | null>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevPricesRef = useRef<Record<string, number>>({});

    const fetchMarketData = async () => {
        try {
            setLoading(true);
            const response = await axios.get<Record<string, StockQuote>>(`${MARKET_URL}/api/market`);
            setMarketData(response.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setLoading(false);
        }


    }

    // Effect to detect price changes and trigger flashes
    useEffect(() => {
        const newFlashes: Record<string, "up" | "down"> = {};
        let hasChanges = false;

        Object.values(marketData).forEach((stock) => {
            const currentPrice = stock.regularMarketPrice;
            const prevPrice = prevPricesRef.current[stock.symbol];

            // Compare with the price from the LAST poll
            if (prevPrice !== undefined && currentPrice !== prevPrice) {
                newFlashes[stock.symbol] = currentPrice > prevPrice ? "up" : "down";
                hasChanges = true;
            }

            // Update ref for next comparison
            prevPricesRef.current[stock.symbol] = currentPrice;
        });

        if (hasChanges) {
            setFlashData(newFlashes);

            // Clear the flash after 2 seconds to allow the CSS animation to reset
            const timer = setTimeout(() => {
                setFlashData({});
            }, 2000);

            return () => clearTimeout(timer);
        }


        //cleanup logic
        return () => {
            setFlashData({});
        }
    }, [marketData]);

    useEffect(() => {
        fetchMarketData(); // Initial fetch

        // Set up polling every 10 seconds
        intervalRef.current = setInterval(fetchMarketData, 10000);

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }


    }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

    return { marketData, flashData, loading, error };
}