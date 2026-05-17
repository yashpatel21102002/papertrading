"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface Order {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    type: "limit" | "market";
    price: number;
    quantity: number;
    status: "open" | "pending" | "filled" | "cancelled";
    createdAt: string;
}

async function fetchOrders(): Promise<Order[]> {
    const response = await api.get<{ orders: Order[]; total: number }>("/api/orders/get");
    return response.data.orders ?? [];
}

export default function useGetOrders() {
    const query = useQuery({
        queryKey: ["orders"],
        queryFn: fetchOrders,
        refetchInterval: 3000,
        staleTime: 2000,
    });

    const orders = query.data ?? [];
    const openOrders = orders.filter((o) => o.status === "open" || o.status === "pending");
    const orderHistory = orders.filter((o) => o.status === "filled" || o.status === "cancelled");

    return {
        orders,
        openOrders,
        orderHistory,
        isLoading: query.isLoading,
        error: query.error ? (query.error as Error).message : null,
        mutate: () => query.refetch(),
    };
}
