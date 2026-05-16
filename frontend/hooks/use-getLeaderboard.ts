"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    email: string;
    totalValue: number;
    pnl: number;
    pnlPct: number;
    isCurrentUser: boolean;
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await api.get<LeaderboardEntry[]>("/api/leaderboard");
    return res.data;
}

export default function useGetLeaderboard() {
    const query = useQuery({
        queryKey: ["leaderboard"],
        queryFn: fetchLeaderboard,
        refetchInterval: 60_000,
        staleTime: 55_000,
    });

    return {
        entries: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error ? (query.error as Error).message : null,
    };
}
