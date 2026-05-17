"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getUserKey } from "@/lib/user-storage";

export function useWatchlist() {
    const keyRef = useRef<string>("");
    const [symbols, setSymbols] = useState<string[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        keyRef.current = getUserKey("watchlist_symbols");
        try {
            const saved = localStorage.getItem(keyRef.current);
            if (saved) setSymbols(JSON.parse(saved));
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    const toggle = useCallback((symbol: string) => {
        setSymbols((prev) => {
            const next = prev.includes(symbol)
                ? prev.filter((s) => s !== symbol)
                : [...prev, symbol];
            try { localStorage.setItem(keyRef.current, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const isWatched = useCallback((symbol: string) => symbols.includes(symbol), [symbols]);

    return { symbols, toggle, isWatched, hydrated };
}
