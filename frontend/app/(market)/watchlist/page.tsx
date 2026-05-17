"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Star, Bell, BellOff, Trash2, Plus, TrendingUp, TrendingDown,
    ArrowUpRight, ArrowDownRight, AlertCircle, Check, X,
} from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePriceAlerts, type PriceAlert } from "@/hooks/use-price-alerts";
import { useMarketPolling } from "@/hooks/use-marketpolling";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const INR = (v: number) =>
    `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface AddAlertFormProps {
    symbol: string;
    shortName: string;
    currentPrice: number;
    onAdd: (direction: "above" | "below", price: number) => void;
    onCancel: () => void;
}

function AddAlertForm({ symbol, shortName, currentPrice, onAdd, onCancel }: AddAlertFormProps) {
    const [direction, setDirection] = useState<"above" | "below">("above");
    const [priceInput, setPriceInput] = useState(currentPrice.toFixed(2));

    const handleSubmit = () => {
        const p = parseFloat(priceInput);
        if (isNaN(p) || p <= 0) { toast.error("Enter a valid price"); return; }
        onAdd(direction, p);
    };

    return (
        <div className="mt-2 p-3 bg-muted/40 border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Set Price Alert — {symbol.replace(".NS", "")}</p>
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                {(["above", "below"] as const).map((d) => (
                    <button
                        key={d}
                        onClick={() => setDirection(d)}
                        className={cn(
                            "py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize",
                            direction === d
                                ? d === "above"
                                    ? "bg-[hsl(var(--up)/0.15)] border-[hsl(var(--up)/0.4)] text-up"
                                    : "bg-[hsl(var(--down)/0.15)] border-[hsl(var(--down)/0.4)] text-down"
                                : "bg-muted border-border text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {d === "above" ? "↑ Above" : "↓ Below"}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Target price"
                />
                <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:brightness-110 transition-all"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Current: {INR(currentPrice)}</p>
        </div>
    );
}

export default function WatchlistPage() {
    const { symbols: watchlist, toggle } = useWatchlist();
    const { alerts, addAlert, removeAlert, clearTriggered } = usePriceAlerts();
    const { marketData } = useMarketPolling();

    const [addAlertFor, setAddAlertFor] = useState<string | null>(null);
    const [alertTab, setAlertTab] = useState<"active" | "triggered">("active");

    const watchedStocks = useMemo(() =>
        watchlist.map((sym) => marketData[sym]).filter(Boolean),
        [watchlist, marketData],
    );

    const activeAlerts = alerts.filter((a) => !a.triggered);
    const triggeredAlerts = alerts.filter((a) => a.triggered);

    const handleAddAlert = (symbol: string, shortName: string, direction: "above" | "below", price: number) => {
        addAlert(symbol, shortName, direction, price);
        toast.success(`Alert set for ${symbol.replace(".NS", "")}`, {
            description: `Notify when price goes ${direction} ${INR(price)}`,
        });
        setAddAlertFor(null);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-foreground">Watchlist & Alerts</h1>
                <Link
                    href="/"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> Add stocks from Markets
                </Link>
            </div>

            {/* Watchlist */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold">Watchlist</span>
                    <span className="text-xs text-muted-foreground ml-auto">{watchlist.length} stocks</span>
                </div>

                {watchedStocks.length === 0 ? (
                    <div className="py-16 text-center">
                        <Star className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground mb-1">No stocks in your watchlist yet</p>
                        <p className="text-xs text-muted-foreground/60 mb-4">Click the ★ icon on any stock in the Markets page</p>
                        <Link href="/" className="text-xs text-primary hover:underline">Browse Markets →</Link>
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {watchedStocks.map((stock) => {
                            const up = stock.regularMarketChangePercent >= 0;
                            const hasAlert = activeAlerts.some((a) => a.symbol === stock.symbol);

                            return (
                                <div key={stock.symbol} className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        {/* Symbol */}
                                        <Link href={`/trade?symbol=${stock.symbol}`} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                    {stock.symbol[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold leading-tight">{stock.symbol.replace(".NS", "")}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{stock.shortName}</p>
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="text-sm font-mono font-semibold">{INR(stock.regularMarketPrice)}</p>
                                            <div className={cn("flex items-center justify-end text-[11px] font-semibold", up ? "text-up" : "text-down")}>
                                                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                {up ? "+" : ""}{stock.regularMarketChangePercent.toFixed(2)}%
                                            </div>
                                        </div>

                                        {/* Alert bell */}
                                        <button
                                            onClick={() => setAddAlertFor(addAlertFor === stock.symbol ? null : stock.symbol)}
                                            className={cn(
                                                "p-1.5 rounded-md transition-colors",
                                                hasAlert
                                                    ? "text-primary bg-primary/10 hover:bg-primary/20"
                                                    : "text-muted-foreground hover:text-primary hover:bg-muted",
                                            )}
                                            title={hasAlert ? "Alert set — click to add another" : "Set price alert"}
                                        >
                                            {hasAlert ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                        </button>

                                        {/* Remove from watchlist */}
                                        <button
                                            onClick={() => toggle(stock.symbol)}
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-down hover:bg-muted transition-colors"
                                            title="Remove from watchlist"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Inline add-alert form */}
                                    {addAlertFor === stock.symbol && (
                                        <AddAlertForm
                                            symbol={stock.symbol}
                                            shortName={stock.shortName ?? stock.symbol}
                                            currentPrice={stock.regularMarketPrice}
                                            onAdd={(dir, price) => handleAddAlert(stock.symbol, stock.shortName ?? stock.symbol, dir, price)}
                                            onCancel={() => setAddAlertFor(null)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Price Alerts */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Price Alerts</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {triggeredAlerts.length > 0 && (
                            <button
                                onClick={clearTriggered}
                                className="text-[10px] text-muted-foreground hover:text-down transition-colors"
                            >
                                Clear triggered
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    {([
                        { id: "active" as const, label: "Active", count: activeAlerts.length },
                        { id: "triggered" as const, label: "Triggered", count: triggeredAlerts.length },
                    ]).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setAlertTab(tab.id)}
                            className={cn(
                                "px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all",
                                alertTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                                alertTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Alert list */}
                {(alertTab === "active" ? activeAlerts : triggeredAlerts).length === 0 ? (
                    <div className="py-14 text-center">
                        <Bell className="w-7 h-7 mx-auto mb-2 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground">
                            {alertTab === "active" ? "No active alerts" : "No triggered alerts yet"}
                        </p>
                        {alertTab === "active" && (
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Click 🔔 next to any watched stock to set a target
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {(alertTab === "active" ? activeAlerts : triggeredAlerts).map((alert: PriceAlert) => {
                            const currentPrice = marketData[alert.symbol]?.regularMarketPrice;
                            const distancePct = currentPrice
                                ? ((alert.targetPrice - currentPrice) / currentPrice) * 100
                                : null;

                            return (
                                <div key={alert.id} className={cn(
                                    "flex items-center gap-4 px-5 py-4",
                                    alert.triggered && "opacity-60",
                                )}>
                                    {/* Direction indicator */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                        alert.direction === "above"
                                            ? "bg-[hsl(var(--up)/0.12)] text-up"
                                            : "bg-[hsl(var(--down)/0.12)] text-down",
                                    )}>
                                        {alert.direction === "above"
                                            ? <TrendingUp className="w-4 h-4" />
                                            : <TrendingDown className="w-4 h-4" />}
                                    </div>

                                    {/* Alert info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/trade?symbol=${alert.symbol}`} className="text-sm font-bold hover:text-primary transition-colors">
                                                {alert.symbol.replace(".NS", "")}
                                            </Link>
                                            <span className={cn(
                                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                                alert.direction === "above"
                                                    ? "bg-[hsl(var(--up)/0.1)] text-up"
                                                    : "bg-[hsl(var(--down)/0.1)] text-down",
                                            )}>
                                                {alert.direction === "above" ? "↑ Above" : "↓ Below"} {INR(alert.targetPrice)}
                                            </span>
                                            {alert.triggered && (
                                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                                    ✓ Triggered
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[11px] text-muted-foreground truncate">{alert.shortName}</span>
                                            {currentPrice && !alert.triggered && distancePct !== null && (
                                                <span className={cn(
                                                    "text-[10px] font-mono font-semibold",
                                                    Math.abs(distancePct) < 2 ? "text-amber-400" : "text-muted-foreground",
                                                )}>
                                                    {distancePct > 0 ? "+" : ""}{distancePct.toFixed(1)}% away
                                                </span>
                                            )}
                                            {alert.triggered && alert.triggeredAt && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(alert.triggeredAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Current price */}
                                    {currentPrice && (
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-mono text-muted-foreground">Now</p>
                                            <p className="text-sm font-mono font-semibold">{INR(currentPrice)}</p>
                                        </div>
                                    )}

                                    {/* Remove */}
                                    <button
                                        onClick={() => removeAlert(alert.id)}
                                        className="text-muted-foreground hover:text-down transition-colors p-1"
                                        title="Remove alert"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Empty state — no watchlist + no alerts */}
            {watchlist.length === 0 && alerts.length === 0 && (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-foreground font-medium mb-1">Nothing here yet</p>
                    <p className="text-sm text-muted-foreground mb-5">
                        Star stocks on the Markets page to watch them, then set price alerts to get notified.
                    </p>
                    <Link href="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-110 transition-all">
                        <Star className="w-4 h-4" />
                        Go to Markets
                    </Link>
                </div>
            )}
        </div>
    );
}
