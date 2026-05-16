"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ActivityEventType =
    | "order_placed"
    | "order_filled"
    | "order_cancelled"
    | "order_rejected";

export interface ActivityEvent {
    id: string;
    type: ActivityEventType;
    symbol: string;
    side: "buy" | "sell";
    qty: number;
    price?: number;
    timestamp: string;
    read: boolean;
}

interface ActivityContextValue {
    events: ActivityEvent[];
    unreadCount: number;
    addEvent: (event: Omit<ActivityEvent, "id" | "timestamp" | "read">) => void;
    markAllRead: () => void;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

const STORAGE_KEY = "activity_events";
const MAX_EVENTS = 200;

export function ActivityProvider({ children }: { children: React.ReactNode }) {
    const [events, setEvents] = useState<ActivityEvent[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setEvents(JSON.parse(stored));
        } catch {
            /* ignore parse errors */
        }
    }, []);

    const persist = useCallback((next: ActivityEvent[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            /* quota exceeded — skip */
        }
    }, []);

    const addEvent = useCallback(
        (event: Omit<ActivityEvent, "id" | "timestamp" | "read">) => {
            const newEvent: ActivityEvent = {
                ...event,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                timestamp: new Date().toISOString(),
                read: false,
            };
            setEvents((prev) => {
                const next = [newEvent, ...prev].slice(0, MAX_EVENTS);
                persist(next);
                return next;
            });
        },
        [persist],
    );

    const markAllRead = useCallback(() => {
        setEvents((prev) => {
            const next = prev.map((e) => ({ ...e, read: true }));
            persist(next);
            return next;
        });
    }, [persist]);

    const unreadCount = events.filter((e) => !e.read).length;

    return (
        <ActivityContext.Provider value={{ events, unreadCount, addEvent, markAllRead }}>
            {children}
        </ActivityContext.Provider>
    );
}

export function useActivity() {
    const ctx = useContext(ActivityContext);
    if (!ctx) throw new Error("useActivity must be used inside ActivityProvider");
    return ctx;
}
