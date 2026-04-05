"use client";

import { useState, useEffect, useCallback } from "react";
import api from '@/lib/axios';

export default function useGetOrders() {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState<string | null>(null);
    const [openOrders, setOpenOrders] = useState([]);
    const [orderHistory, setOrderHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Memoized fetch function so it can be called manually (mutate) or via interval
    const fetchOrders = useCallback(async () => {
        try {
            const response = await api.get("/api/orders/get");
            const data = response.data;

            setOrders(data);

            // Filter logic matching your backend status strings
            setOpenOrders(data.filter((order) => order.status === "open"));
            setOrderHistory(data.filter((order) =>
                order.status === "filled" || order.status === "cancelled"
            ));

            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to fetch orders");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchOrders();

        // Long Polling: Check for updates every 3 seconds
        // This ensures the UI reflects when an order is filled by the matching engine
        const interval = setInterval(() => {
            fetchOrders();
        }, 3000);

        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, [fetchOrders]);

    return {
        orders,
        error,
        openOrders,
        orderHistory,
        isLoading,
        mutate: fetchOrders // Export this to allow manual refresh after order creation
    };
}