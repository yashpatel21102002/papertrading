"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE_URL = process.env.NEXT_PUBLIC_MARKET_WS_URL || "ws://localhost:8003";

interface WSTickData {
    symbol: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketTime: string;
    shortName: string;
}

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
    return null;
}

function buildWsUrl(): string {
    const token = getCookie("auth_token");
    return token ? `${WS_BASE_URL}?token=${token}` : WS_BASE_URL;
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

        // Append JWT token so the server can authenticate the upgrade request.
        const ws = new WebSocket(buildWsUrl());
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
                subscribedRef.current.forEach(ticker => {
                    wsRef.current?.send(JSON.stringify({ type: "UNSUBSCRIBE", ticker }));
                });
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    // Subscription Management — send raw symbol; server adds the `stock:` prefix.
    useEffect(() => {
        if (status === "connected" && wsRef.current?.readyState === WebSocket.OPEN) {
            const currentTickers = new Set(tickers);

            // Unsubscribe from tickers no longer needed
            subscribedRef.current.forEach(ticker => {
                if (!currentTickers.has(ticker)) {
                    wsRef.current?.send(JSON.stringify({ type: "UNSUBSCRIBE", ticker }));
                    subscribedRef.current.delete(ticker);
                }
            });

            // Subscribe to new tickers
            currentTickers.forEach(ticker => {
                if (!subscribedRef.current.has(ticker)) {
                    wsRef.current?.send(JSON.stringify({ type: "SUBSCRIBE", ticker }));
                    subscribedRef.current.add(ticker);
                }
            });
        }
    }, [tickers, status]);

    return { tickData, flashMap, status };
}
