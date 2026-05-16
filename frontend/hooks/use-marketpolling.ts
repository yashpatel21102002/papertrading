"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

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
    firstTradeDateMilliseconds: string;
    regularMarketTime: string;
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

async function fetchMarket(): Promise<Record<string, StockQuote>> {
    const res = await axios.get<Record<string, StockQuote>>(`${MARKET_URL}/api/market`);
    return res.data;
}

export const useMarketPolling = () => {
    const [flashData, setFlashData] = useState<Record<string, "up" | "down" | null>>({});
    const prevPricesRef = useRef<Record<string, number>>({});

    const query = useQuery({
        queryKey: ["market"],
        queryFn: fetchMarket,
        refetchInterval: 10000,
        staleTime: 8000,
    });

    const marketData = query.data ?? {};

    useEffect(() => {
        const newFlashes: Record<string, "up" | "down"> = {};
        let hasChanges = false;

        Object.values(marketData).forEach((stock) => {
            const currentPrice = stock.regularMarketPrice;
            const prevPrice = prevPricesRef.current[stock.symbol];
            if (prevPrice !== undefined && currentPrice !== prevPrice) {
                newFlashes[stock.symbol] = currentPrice > prevPrice ? "up" : "down";
                hasChanges = true;
            }
            prevPricesRef.current[stock.symbol] = currentPrice;
        });

        if (hasChanges) {
            setFlashData(newFlashes);
            const timer = setTimeout(() => setFlashData({}), 2000);
            return () => clearTimeout(timer);
        }
    }, [marketData]);

    return {
        marketData,
        flashData,
        loading: query.isLoading,
        error: query.error ? (query.error as Error).message : null,
    };
};
