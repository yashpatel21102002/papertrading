"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useActivity, ActivityEvent, ActivityEventType } from "@/context/activity-context";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Activity,
    Inbox,
    Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "order_placed" | "order_filled" | "order_cancelled";

const EVENT_LABELS: Record<ActivityEventType, string> = {
    order_placed: "Order Placed",
    order_filled: "Order Filled",
    order_cancelled: "Order Cancelled",
    order_rejected: "Order Rejected",
    price_alert: "Price Alert",
};

const EVENT_ICONS: Record<ActivityEventType, React.ElementType> = {
    order_placed: Clock,
    order_filled: CheckCircle2,
    order_cancelled: XCircle,
    order_rejected: AlertTriangle,
    price_alert: Bell,
};

const EVENT_COLORS: Record<ActivityEventType, string> = {
    order_placed: "text-accent",
    order_filled: "text-up",
    order_cancelled: "text-down",
    order_rejected: "text-destructive",
    price_alert: "text-primary",
};

const ICON_BG: Record<ActivityEventType, string> = {
    order_placed: "bg-accent/10",
    order_filled: "bg-[hsl(var(--up)/0.12)]",
    order_cancelled: "bg-[hsl(var(--down)/0.12)]",
    order_rejected: "bg-destructive/10",
    price_alert: "bg-primary/10",
};

function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function eventDescription(ev: ActivityEvent): string {
    const action = ev.side === "buy" ? "Bought" : "Sold";
    const priceStr = ev.price ? ` at ₹${ev.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "";
    if (ev.type === "order_placed") return `${action} ${ev.qty} × ${ev.symbol}${priceStr}`;
    if (ev.type === "order_filled") return `${action} ${ev.qty} × ${ev.symbol} — filled${priceStr}`;
    if (ev.type === "order_cancelled") return `${ev.qty} × ${ev.symbol} — order cancelled`;
    if (ev.type === "order_rejected") return `${ev.qty} × ${ev.symbol} — rejected`;
    if (ev.type === "price_alert") return `${ev.symbol.replace(".NS", "")} hit target ${ev.meta ?? ""}`;
    return ev.symbol;
}

const TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "order_placed", label: "Placed" },
    { id: "order_filled", label: "Filled" },
    { id: "order_cancelled", label: "Cancelled" },
];

export default function ActivityPage() {
    const { events, unreadCount, markAllRead } = useActivity();
    const [filter, setFilter] = useState<FilterTab>("all");
    const [, forceRender] = useState(0);

    useEffect(() => {
        markAllRead();
    }, [markAllRead]);

    // Re-render every 30s to update relative timestamps
    useEffect(() => {
        const t = setInterval(() => forceRender((n) => n + 1), 30000);
        return () => clearInterval(t);
    }, []);

    const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Activity Log</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {events.length} event{events.length !== 1 ? "s" : ""} recorded
                        </p>
                    </div>
                </div>
                {events.length > 0 && (
                    <button
                        onClick={markAllRead}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5 hover:bg-muted"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg mb-5 w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            filter === tab.id
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {tab.label}
                        {tab.id === "all" && events.length > 0 && (
                            <span className="ml-1.5 text-muted-foreground">{events.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Feed */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Inbox className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium mb-1">No activity yet</p>
                    <p className="text-sm text-muted-foreground">Place your first trade to get started</p>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {filtered.map((ev) => {
                        const Icon = EVENT_ICONS[ev.type];
                        return (
                            <div
                                key={ev.id}
                                className={cn(
                                    "flex items-start gap-4 px-5 py-4 transition-colors",
                                    !ev.read && "bg-primary/5",
                                )}
                            >
                                {/* Icon */}
                                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", ICON_BG[ev.type])}>
                                    <Icon className={cn("w-4 h-4", EVENT_COLORS[ev.type])} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn("text-xs font-semibold", EVENT_COLORS[ev.type])}>
                                            {EVENT_LABELS[ev.type]}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                            {ev.symbol}
                                        </span>
                                        {ev.side !== "alert" && (
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                                                ev.side === "buy"
                                                    ? "bg-[hsl(var(--up)/0.12)] text-up"
                                                    : "bg-[hsl(var(--down)/0.12)] text-down",
                                            )}>
                                                {ev.side}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground">{eventDescription(ev)}</p>
                                </div>

                                {/* Timestamp */}
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5 shrink-0">
                                    {formatRelative(ev.timestamp)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
