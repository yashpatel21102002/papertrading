"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface Trade {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    quantity: number;
    executionPrice: number;
    avgCostBasis: number;
    realizedPnl: number;
    filledAt: string;
}

export interface TradesResponse {
    trades: Trade[];
    totalRealizedPnl: number;
}

async function fetchTrades(): Promise<TradesResponse> {
    const res = await api.get<TradesResponse>("/api/portfolio/trades");
    return res.data;
}

export default function useGetTrades() {
    const query = useQuery({
        queryKey: ["trades"],
        queryFn: fetchTrades,
        refetchInterval: 30000,
        staleTime: 25000,
    });

    return {
        trades: query.data?.trades ?? [],
        totalRealizedPnl: query.data?.totalRealizedPnl ?? 0,
        isLoading: query.isLoading,
        error: query.error ? (query.error as Error).message : null,
    };
}
