"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getUserKey } from "@/lib/user-storage";

export interface PriceAlert {
    id: string;
    symbol: string;
    shortName: string;
    direction: "above" | "below";
    targetPrice: number;
    triggered: boolean;
    triggeredAt?: string;
    createdAt: string;
}

export function usePriceAlerts() {
    const keyRef = useRef<string>("");
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        keyRef.current = getUserKey("price_alerts_v1");
        try {
            const saved = localStorage.getItem(keyRef.current);
            if (saved) setAlerts(JSON.parse(saved));
        } catch {}
        setHydrated(true);
    }, []);

    const persist = useCallback((next: PriceAlert[]) => {
        setAlerts(next);
        try { localStorage.setItem(keyRef.current, JSON.stringify(next)); } catch {}
    }, []);

    const addAlert = useCallback((
        symbol: string,
        shortName: string,
        direction: "above" | "below",
        targetPrice: number,
    ): PriceAlert => {
        const alert: PriceAlert = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            symbol,
            shortName,
            direction,
            targetPrice,
            triggered: false,
            createdAt: new Date().toISOString(),
        };
        setAlerts((prev) => {
            const next = [alert, ...prev];
            try { localStorage.setItem(keyRef.current, JSON.stringify(next)); } catch {}
            return next;
        });
        return alert;
    }, []);

    const removeAlert = useCallback((id: string) => {
        setAlerts((prev) => {
            const next = prev.filter((a) => a.id !== id);
            try { localStorage.setItem(keyRef.current, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const checkAndTrigger = useCallback((
        priceMap: Record<string, number>,
        currentAlerts: PriceAlert[],
    ): PriceAlert[] => {
        const now = new Date().toISOString();
        const triggered: PriceAlert[] = [];

        const updated = currentAlerts.map((a) => {
            if (a.triggered) return a;
            const price = priceMap[a.symbol];
            if (!price) return a;
            const hit = a.direction === "above" ? price >= a.targetPrice : price <= a.targetPrice;
            if (hit) {
                triggered.push(a);
                return { ...a, triggered: true, triggeredAt: now };
            }
            return a;
        });

        if (triggered.length > 0) {
            setAlerts(updated);
            try { localStorage.setItem(keyRef.current, JSON.stringify(updated)); } catch {}
        }

        return triggered;
    }, []);

    const clearTriggered = useCallback(() => {
        setAlerts((prev) => {
            const next = prev.filter((a) => !a.triggered);
            try { localStorage.setItem(keyRef.current, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    return { alerts, addAlert, removeAlert, checkAndTrigger, clearTriggered, hydrated };
}
