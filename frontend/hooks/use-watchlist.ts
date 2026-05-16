"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "watchlist_symbols";

export function useWatchlist() {
    const [symbols, setSymbols] = useState<string[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setSymbols(JSON.parse(saved));
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    const toggle = useCallback((symbol: string) => {
        setSymbols((prev) => {
            const next = prev.includes(symbol)
                ? prev.filter((s) => s !== symbol)
                : [...prev, symbol];
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const isWatched = useCallback((symbol: string) => symbols.includes(symbol), [symbols]);

    return { symbols, toggle, isWatched, hydrated };
}
