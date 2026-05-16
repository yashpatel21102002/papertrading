"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface PortfolioHolding {
    symbol: string;
    allocation: string;
    qty: number;
    avgPrice: number;
    currentPrice: number;
    marketValue: number;
}

export interface Portfolio {
    totalPortfolioValue: number;
    holdingsValue: number;
    unrealizedPnl: number;
    overallPnl: number;
    buyingPower: number;
    portfolioHoldings: PortfolioHolding[];
    equityHistory: { date: string; equity: number }[];
    /** convenience alias for buyingPower used by TopNav */
    balance: number;
}

async function fetchPortfolio(): Promise<Portfolio> {
    const res = await api.get<Omit<Portfolio, "balance">>("/api/portfolio/summary");
    return { ...res.data, balance: res.data.buyingPower };
}

export default function useGetPortfolio() {
    const query = useQuery({
        queryKey: ["portfolio"],
        queryFn: fetchPortfolio,
        refetchInterval: 30000,
        staleTime: 25000,
    });

    return {
        portfolio: query.data ?? null,
        error: query.error ? (query.error as Error).message : null,
        isLoading: query.isLoading,
    };
}
