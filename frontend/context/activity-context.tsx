"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getUserKey } from "@/lib/user-storage";

export type ActivityEventType =
    | "order_placed"
    | "order_filled"
    | "order_cancelled"
    | "order_rejected"
    | "price_alert";

export interface ActivityEvent {
    id: string;
    type: ActivityEventType;
    symbol: string;
    side: "buy" | "sell" | "alert";
    qty: number;
    price?: number;
    timestamp: string;
    read: boolean;
    meta?: string; // extra context e.g. "above ₹2,500"
}

interface ActivityContextValue {
    events: ActivityEvent[];
    unreadCount: number;
    addEvent: (event: Omit<ActivityEvent, "id" | "timestamp" | "read">) => void;
    markAllRead: () => void;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

const MAX_EVENTS = 200;

export function ActivityProvider({ children }: { children: React.ReactNode }) {
    const keyRef = useRef<string>("");
    const [events, setEvents] = useState<ActivityEvent[]>([]);

    useEffect(() => {
        keyRef.current = getUserKey("activity_events");
        try {
            const stored = localStorage.getItem(keyRef.current);
            if (stored) setEvents(JSON.parse(stored));
        } catch {
            /* ignore parse errors */
        }
    }, []);

    const persist = useCallback((next: ActivityEvent[]) => {
        try {
            localStorage.setItem(keyRef.current, JSON.stringify(next));
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
