"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_MARKET_WS_URL || "ws://localhost:8003";

interface WSTickData {
    symbol: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketTime: string;
    shortName: string;
}

export function useWebSocket(tickers: string[]) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const subscribedRef = useRef<Set<string>>(new Set());
    const connectRef = useRef<() => void>(() => { });

    const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
    const [tickData, setTickData] = useState<Record<string, WSTickData>>({});
    const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({});

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) return;

        setTimeout(() => setStatus("connecting"), 0);

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus("connected");
            subscribedRef.current.clear();
        };

        ws.onmessage = (event) => {
            try {
                const data: WSTickData = JSON.parse(event.data);
                if (!data.symbol) return;

                setTickData((prev) => {
                    const oldPrice = prev[data.symbol]?.regularMarketPrice;
                    if (oldPrice !== undefined && data.regularMarketPrice !== oldPrice) {
                        const direction = data.regularMarketPrice > oldPrice ? "up" : "down";
                        setFlashMap((f) => ({ ...f, [data.symbol]: direction }));
                        setTimeout(() => {
                            setFlashMap((f) => {
                                const newMap = { ...f };
                                delete newMap[data.symbol];
                                return newMap;
                            });
                        }, 600);
                    }
                    return { ...prev, [data.symbol]: data };
                });
            } catch (e) { }
        };

        ws.onclose = () => {
            setStatus("disconnected");
            wsRef.current = null;
            subscribedRef.current.clear();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => connectRef.current(), 3000);
        };

        ws.onerror = () => ws.close();
    }, []);

    useEffect(() => { connectRef.current = connect; }, [connect]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                // CLEANUP: Unsubscribe from everything before closing
                subscribedRef.current.forEach(topic => {
                    wsRef.current?.send(JSON.stringify({ type: "UNSUBSCRIBE", ticker: topic }));
                });
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    // Subscription Management with Cleanup
    useEffect(() => {
        if (status === "connected" && wsRef.current?.readyState === WebSocket.OPEN) {
            const currentTopics = new Set(tickers.map(t => `stock:${t}`));

            // 1. Unsubscribe from topics no longer in the tickers array
            subscribedRef.current.forEach(topic => {
                if (!currentTopics.has(topic)) {
                    wsRef.current?.send(JSON.stringify({ type: "UNSUBSCRIBE", ticker: topic }));
                    subscribedRef.current.delete(topic);
                }
            });

            // 2. Subscribe to new topics
            currentTopics.forEach(topic => {
                if (!subscribedRef.current.has(topic)) {
                    wsRef.current?.send(JSON.stringify({ type: "SUBSCRIBE", ticker: topic }));
                    subscribedRef.current.add(topic);
                }
            });
        }
    }, [tickers, status]);

    return { tickData, flashMap, status };
}