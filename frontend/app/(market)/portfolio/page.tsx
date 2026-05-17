"use client";
export const dynamic = "force-dynamic";
import {
    TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight, DollarSign,
    RotateCcw, AlertTriangle, Loader2, X, Target, Flame, Award, ThumbsDown,
    BookOpen, Tag, Pencil, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
    BarChart, Bar,
} from "recharts";
import useGetPortfolio from "@/hooks/use-getPortfolio";
import useGetTrades, { Trade } from "@/hooks/use-getTrades";
import { useMarketPolling } from "@/hooks/use-marketpolling";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";

const STRATEGY_TAGS = ["Momentum", "Breakout", "Dip Buy", "Swing", "Earnings", "Technical", "Fundamental", "Scalp", "FOMO", "Hedge"] as const;

const TAG_COLOR: Record<string, string> = {
    "Momentum":    "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Breakout":    "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Dip Buy":     "bg-[hsl(var(--up)/0.12)] text-up border-[hsl(var(--up)/0.2)]",
    "Swing":       "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Earnings":    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "Technical":   "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "Fundamental": "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "Scalp":       "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "FOMO":        "bg-[hsl(var(--down)/0.12)] text-down border-[hsl(var(--down)/0.2)]",
    "Hedge":       "bg-muted text-muted-foreground border-border",
};

function JournalRow({ trade, onSaved }: { trade: Trade; onSaved: () => void }) {
    const [editing, setEditing] = useState(false);
    const [editNote, setEditNote] = useState(trade.order?.note ?? "");
    const [editTags, setEditTags] = useState<string[]>(trade.order?.tags ?? []);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const hasNote = !!(trade.order?.note);
    const hasTags = (trade.order?.tags?.length ?? 0) > 0;
    const hasContent = hasNote || hasTags;

    const save = useCallback(async () => {
        setSaving(true);
        try {
            await api.patch(`/api/orders/${trade.orderId}/note`, {
                note: editNote.trim() || null,
                tags: editTags,
            });
            toast.success("Journal updated");
            setEditing(false);
            onSaved();
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Failed to save note";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    }, [editNote, editTags, trade.orderId, onSaved]);

    const pnlPositive = trade.realizedPnl >= 0;
    const INR = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="border-b border-border/40 last:border-0">
            {/* Main row */}
            <div
                className="flex items-start gap-3 px-5 py-4 hover:bg-muted/10 transition-colors cursor-pointer"
                onClick={() => setExpanded((p) => !p)}
            >
                {/* Side indicator */}
                <div className={cn(
                    "mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black uppercase shrink-0",
                    trade.side === "buy"
                        ? "bg-[hsl(var(--up)/0.12)] text-up"
                        : "bg-[hsl(var(--down)/0.12)] text-down",
                )}>
                    {trade.side === "buy" ? "B" : "S"}
                </div>

                {/* Trade info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{trade.symbol.replace(".NS", "")}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                            {trade.quantity} × ₹{trade.executionPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </span>
                        {hasTags && !expanded && (
                            <div className="flex gap-1 flex-wrap">
                                {(trade.order?.tags ?? []).slice(0, 2).map((tag) => (
                                    <span key={tag} className={cn("px-1.5 py-0.5 text-[9px] font-bold rounded-full border", TAG_COLOR[tag] ?? "bg-muted text-muted-foreground border-border")}>
                                        {tag}
                                    </span>
                                ))}
                                {(trade.order?.tags?.length ?? 0) > 2 && (
                                    <span className="text-[9px] text-muted-foreground">+{(trade.order?.tags?.length ?? 0) - 2}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground">
                            {new Date(trade.filledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                        {trade.side === "sell" && (
                            <span className={cn("text-[11px] font-semibold font-mono", pnlPositive ? "text-up" : "text-down")}>
                                {pnlPositive ? "+" : ""}{pnlPositive ? INR(trade.realizedPnl) : `-${INR(trade.realizedPnl)}`}
                            </span>
                        )}
                        {!hasContent && !expanded && (
                            <span className="text-[10px] text-muted-foreground/50 italic">No note — click to add</span>
                        )}
                    </div>
                </div>

                {/* Expand toggle */}
                <div className="text-muted-foreground mt-1 shrink-0">
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
            </div>

            {/* Expanded detail / edit */}
            {expanded && (
                <div className="px-5 pb-4 space-y-3">
                    {!editing ? (
                        <>
                            {hasTags && (
                                <div className="flex gap-1.5 flex-wrap">
                                    {(trade.order?.tags ?? []).map((tag) => (
                                        <span key={tag} className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full border", TAG_COLOR[tag] ?? "bg-muted text-muted-foreground border-border")}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {hasNote ? (
                                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg px-3 py-2.5 leading-relaxed border border-border/50">
                                    {trade.order?.note}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground/50 italic">No journal note for this trade.</p>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setEditNote(trade.order?.note ?? ""); setEditTags(trade.order?.tags ?? []); setEditing(true); }}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Pencil className="w-3 h-3" />
                                {hasContent ? "Edit note" : "Add note"}
                            </button>
                        </>
                    ) : (
                        <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                            {/* Tag selector */}
                            <div className="flex flex-wrap gap-1.5">
                                {STRATEGY_TAGS.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setEditTags((prev) =>
                                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                                        )}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all",
                                            editTags.includes(tag)
                                                ? cn("border", TAG_COLOR[tag] ?? "bg-primary/10 text-primary border-primary/30")
                                                : "bg-muted border-border text-muted-foreground hover:border-primary/30",
                                        )}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                maxLength={500}
                                rows={3}
                                autoFocus
                                placeholder="What was your thesis? What did you learn?"
                                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:ring-1 focus:ring-primary transition-colors"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
                                >
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Save
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const CHART_COLORS = [
    "#00d97e", "#3b82f6", "#a855f7", "#f59e0b", "#ff4560", "#06b6d4",
];

const INR = (v: number, decimals = 2) =>
    `₹${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: false,
        });
    } catch { return "—"; }
}

function StatCard({
    label, value, sub, positive, icon: Icon, accentClass,
}: {
    label: string; value: string; sub?: string; positive?: boolean;
    icon: React.ElementType; accentClass: string;
}) {
    return (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accentClass)}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
            </div>
            <div>
                <p className="text-2xl font-mono font-bold tracking-tight text-foreground">{value}</p>
                {sub && (
                    <p className={cn("text-xs mt-1 flex items-center gap-1", positive === true ? "text-up" : positive === false ? "text-down" : "text-muted-foreground")}>
                        {positive === true && <ArrowUpRight className="w-3 h-3" />}
                        {positive === false && <ArrowDownRight className="w-3 h-3" />}
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

function SkeletonCard() {
    return <div className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />;
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
            <p className="text-muted-foreground mb-0.5">{label}</p>
            <p className="font-mono font-semibold text-foreground">{INR(payload[0]?.value ?? 0, 0)}</p>
        </div>
    );
}

export default function PortfolioPage() {
    const { portfolio: data, isLoading } = useGetPortfolio();
    const { trades, totalRealizedPnl, isLoading: tradesLoading } = useGetTrades();
    const { marketData } = useMarketPolling();
    const [posTab, setPosTab] = useState<"open" | "closed" | "analytics" | "journal">("open");
    const [journalFilter, setJournalFilter] = useState<"all" | "buy" | "sell" | string>("all");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetInput, setResetInput] = useState("");
    const queryClient = useQueryClient();

    const resetMutation = useMutation({
        mutationFn: () => api.post("/api/portfolio/reset"),
        onSuccess: () => {
            toast.success("Portfolio reset", { description: "Balance restored to ₹10,00,000" });
            queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["trades"] });
            setShowResetConfirm(false);
            setResetInput("");
        },
        onError: () => toast.error("Reset failed", { description: "Please try again" }),
    });

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto space-y-5">
                <div className="h-7 w-28 bg-muted rounded animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
                    <div className="bg-card border border-border rounded-xl h-64 animate-pulse" />
                    <div className="bg-card border border-border rounded-xl h-64 animate-pulse" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="bg-card border border-border rounded-xl p-16 text-center">
                    <Wallet className="w-10 h-10 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-foreground font-medium mb-1">No portfolio data</p>
                    <p className="text-sm text-muted-foreground mb-4">Connect to backend to see your portfolio</p>
                    <Link href="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-110 transition-all">
                        Browse Markets
                    </Link>
                </div>
            </div>
        );
    }

    const {
        totalPortfolioValue = 0,
        holdingsValue = 0,
        unrealizedPnl = 0,
        overallPnl = 0,
        buyingPower = 0,
        portfolioHoldings = [],
        equityHistory = [],
    } = data;

    // Build live-price lookup from 10s market poll
    const livePrice: Record<string, number> = {};
    Object.values(marketData).forEach((q) => { livePrice[q.symbol] = q.regularMarketPrice; });
    const hasLivePrices = portfolioHoldings.length > 0 && portfolioHoldings.some((h) => livePrice[h.symbol] !== undefined);

    const liveHoldingsValue = portfolioHoldings.reduce((sum, h) => {
        const cp = livePrice[h.symbol] ?? h.currentPrice;
        return sum + cp * h.qty;
    }, 0);
    const liveUnrealizedPnl = portfolioHoldings.reduce((sum, h) => {
        const cp = livePrice[h.symbol] ?? h.currentPrice;
        return sum + (cp - h.avgPrice) * h.qty;
    }, 0);
    const liveTotalPortfolioValue = buyingPower + liveHoldingsValue;
    const liveOverallPnl = liveTotalPortfolioValue - 1_000_000;

    // Use live values when available, otherwise fall back to API values
    const displayHoldingsValue = hasLivePrices ? liveHoldingsValue : holdingsValue;
    const displayUnrealizedPnl = hasLivePrices ? liveUnrealizedPnl : unrealizedPnl;
    const displayTotalValue = hasLivePrices ? liveTotalPortfolioValue : totalPortfolioValue;
    const displayOverallPnl = hasLivePrices ? liveOverallPnl : overallPnl;

    const pieData = portfolioHoldings.map((h) => ({
        name: h.symbol.replace(".NS", ""),
        value: parseFloat(h.allocation as any) || 0,
    }));

    const pnlPositive = displayOverallPnl >= 0;
    const unrealPnlPositive = displayUnrealizedPnl >= 0;
    const realizedPositive = totalRealizedPnl >= 0;

    // Closed positions: group sell trades by symbol, sum realized PnL
    const closedPositions = trades
        .filter((t) => t.side === "sell")
        .reduce<Record<string, { symbol: string; qty: number; avgCostBasis: number; executionPrice: number; realizedPnl: number; lastFilled: string }>>((acc, t) => {
            if (!acc[t.symbol]) {
                acc[t.symbol] = { symbol: t.symbol, qty: 0, avgCostBasis: t.avgCostBasis, executionPrice: t.executionPrice, realizedPnl: 0, lastFilled: t.filledAt };
            }
            acc[t.symbol].qty += t.quantity;
            acc[t.symbol].realizedPnl += t.realizedPnl;
            if (t.filledAt > acc[t.symbol].lastFilled) acc[t.symbol].lastFilled = t.filledAt;
            return acc;
        }, {});

    // ── Analytics ──────────────────────────────────────────────────────────────
    const INITIAL_BALANCE = 1_000_000;
    const sellTrades = trades.filter((t) => t.side === "sell");
    const winTrades  = sellTrades.filter((t) => t.realizedPnl > 0);
    const lossTrades = sellTrades.filter((t) => t.realizedPnl < 0);
    const winRate    = sellTrades.length > 0 ? (winTrades.length / sellTrades.length) * 100 : 0;
    const grossProfit = winTrades.reduce((s, t) => s + t.realizedPnl, 0);
    const grossLoss   = Math.abs(lossTrades.reduce((s, t) => s + t.realizedPnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin  = winTrades.length  > 0 ? grossProfit / winTrades.length  : 0;
    const avgLoss = lossTrades.length > 0 ? grossLoss   / lossTrades.length : 0;
    const bestTrade  = sellTrades.length > 0 ? sellTrades.reduce((b, t) => t.realizedPnl > b.realizedPnl ? t : b) : null;
    const worstTrade = sellTrades.length > 0 ? sellTrades.reduce((w, t) => t.realizedPnl < w.realizedPnl ? t : w) : null;

    // Advanced metrics: Sharpe ratio and max drawdown from equity history
    const computeSharpeRatio = (history: typeof equityHistory) => {
        if (history.length < 2) return 0;
        const values = history.map(h => h.equity);
        const returns = [];
        for (let i = 1; i < values.length; i++) {
            returns.push((values[i] - values[i - 1]) / values[i - 1]);
        }
        const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        return stdDev > 0 ? (avgReturn * 252) / stdDev : 0; // annualized
    };

    const computeMaxDrawdown = (history: typeof equityHistory) => {
        if (history.length === 0) return 0;
        let maxValue = history[0].equity;
        let maxDD = 0;
        for (const h of history) {
            if (h.equity > maxValue) maxValue = h.equity;
            const dd = (maxValue - h.equity) / maxValue;
            if (dd > maxDD) maxDD = dd;
        }
        return maxDD * 100;
    };

    const sharpeRatio = computeSharpeRatio(equityHistory);
    const maxDrawdown = computeMaxDrawdown(equityHistory);

    // P&L by day of week (sells only)
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const pnlByDay = DAYS.map((day, i) => ({
        day,
        pnl: sellTrades
            .filter((t) => new Date(t.filledAt).getDay() === i)
            .reduce((s, t) => s + t.realizedPnl, 0),
        count: sellTrades.filter((t) => new Date(t.filledAt).getDay() === i).length,
    }));

    // Monthly P&L (last 6 months)
    const pnlByMonth = (() => {
        const map: Record<string, number> = {};
        sellTrades.forEach((t) => {
            const key = new Date(t.filledAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
            map[key] = (map[key] ?? 0) + t.realizedPnl;
        });
        const sorted = Object.entries(map).sort(([a], [b]) => {
            const parse = (s: string) => new Date(s.replace(/(\w+) (\d+)/, "20$2-$1-01"));
            return parse(a).getTime() - parse(b).getTime();
        });
        return sorted.slice(-6).map(([month, pnl]) => ({ month, pnl }));
    })();

    // Current trading streak (consecutive wins/losses from most recent sell)
    const tradingStreak = (() => {
        if (sellTrades.length === 0) return { count: 0, type: "none" as const };
        const sorted = [...sellTrades].sort((a, b) => new Date(b.filledAt).getTime() - new Date(a.filledAt).getTime());
        const firstType = sorted[0].realizedPnl > 0 ? "win" : sorted[0].realizedPnl < 0 ? "loss" : "even";
        let streak = 1;
        for (let i = 1; i < sorted.length; i++) {
            const cur = sorted[i].realizedPnl > 0 ? "win" : sorted[i].realizedPnl < 0 ? "loss" : "even";
            if (cur !== firstType) break;
            streak++;
        }
        return { count: streak, type: firstType };
    })();

    // Top 5 traded symbols
    const topSymbols = (() => {
        const counts: Record<string, { count: number; pnl: number }> = {};
        trades.forEach((t) => {
            if (!counts[t.symbol]) counts[t.symbol] = { count: 0, pnl: 0 };
            counts[t.symbol].count++;
            if (t.side === "sell") counts[t.symbol].pnl += t.realizedPnl;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5)
            .map(([symbol, d]) => ({ symbol: symbol.replace(".NS", ""), count: d.count, pnl: d.pnl }));
    })();

    const ACHIEVEMENTS = [
        {
            id: "first_trade",
            icon: "🎯",
            title: "First Trade",
            description: "Placed your first order",
            unlocked: trades.length >= 1,
        },
        {
            id: "first_win",
            icon: "🏆",
            title: "First Win",
            description: "Closed a profitable trade",
            unlocked: winTrades.length >= 1,
        },
        {
            id: "explorer",
            icon: "🌏",
            title: "Market Explorer",
            description: "Hold 3 different stocks simultaneously",
            unlocked: portfolioHoldings.length >= 3,
        },
        {
            id: "diversified",
            icon: "📊",
            title: "Diversified",
            description: "Hold 5+ different positions at once",
            unlocked: portfolioHoldings.length >= 5,
        },
        {
            id: "win_rate",
            icon: "🔥",
            title: "50% Club",
            description: "Achieve ≥50% win rate (min 5 closed trades)",
            unlocked: sellTrades.length >= 5 && winRate >= 50,
        },
        {
            id: "profit_factor",
            icon: "⚡",
            title: "Profit Factor Pro",
            description: "Maintain profit factor ≥2 (min 5 closed trades)",
            unlocked: sellTrades.length >= 5 && profitFactor >= 2,
        },
        {
            id: "ten_percent",
            icon: "🚀",
            title: "10% Club",
            description: "Grow your portfolio by 10% (₹1,00,000+)",
            unlocked: overallPnl >= 100_000,
        },
        {
            id: "active",
            icon: "💼",
            title: "Active Trader",
            description: "Complete 25+ trades",
            unlocked: trades.length >= 25,
        },
    ] as const;

    const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-foreground">Portfolio</h1>
                <div className="flex items-center gap-3">
                    {hasLivePrices ? (
                        <span className="flex items-center gap-1.5 text-xs font-mono text-up hidden sm:flex">
                            <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
                            Live prices
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">Updated every 30s</span>
                    )}
                    <button
                        onClick={() => { setResetInput(""); setShowResetConfirm(true); }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-down border border-border hover:border-down/40 rounded-lg px-3 py-1.5 transition-all"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Stats grid — 5 cards: 2 cols mobile, 5 cols desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    label="Total Portfolio Value"
                    value={INR(displayTotalValue, 0)}
                    sub={`${pnlPositive ? "+" : ""}${INR(displayOverallPnl, 0)} overall`}
                    positive={pnlPositive}
                    icon={pnlPositive ? TrendingUp : TrendingDown}
                    accentClass={pnlPositive ? "bg-[hsl(var(--up)/0.12)] text-up" : "bg-[hsl(var(--down)/0.12)] text-down"}
                />
                <StatCard
                    label="Cash Balance"
                    value={INR(buyingPower, 0)}
                    sub="Available to trade"
                    icon={Wallet}
                    accentClass="bg-primary/10 text-primary"
                />
                <StatCard
                    label="Holdings Value"
                    value={INR(displayHoldingsValue, 0)}
                    sub={`${portfolioHoldings.length} position${portfolioHoldings.length !== 1 ? "s" : ""}`}
                    icon={BarChart3}
                    accentClass="bg-accent/10 text-accent"
                />
                <StatCard
                    label="Unrealized P&L"
                    value={`${unrealPnlPositive ? "+" : ""}${INR(displayUnrealizedPnl, 0)}`}
                    sub={hasLivePrices ? "Live · open positions" : "Open positions"}
                    positive={displayUnrealizedPnl === 0 ? undefined : unrealPnlPositive}
                    icon={unrealPnlPositive ? TrendingUp : TrendingDown}
                    accentClass={displayUnrealizedPnl === 0 ? "bg-muted text-muted-foreground" : unrealPnlPositive ? "bg-[hsl(var(--up)/0.12)] text-up" : "bg-[hsl(var(--down)/0.12)] text-down"}
                />
                <StatCard
                    label="Realized P&L"
                    value={`${realizedPositive ? "+" : ""}${INR(totalRealizedPnl, 0)}`}
                    sub="From closed trades"
                    positive={totalRealizedPnl === 0 ? undefined : realizedPositive}
                    icon={DollarSign}
                    accentClass={totalRealizedPnl === 0 ? "bg-muted text-muted-foreground" : realizedPositive ? "bg-[hsl(var(--up)/0.12)] text-up" : "bg-[hsl(var(--down)/0.12)] text-down"}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
                {/* Allocation donut */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        Asset Allocation
                    </p>
                    {pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" stroke="none">
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-3">
                                {pieData.map((entry, i) => (
                                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                        <span className="text-muted-foreground flex-1 truncate">{entry.name}</span>
                                        <span className="font-mono font-medium text-foreground">{entry.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-[160px] flex flex-col items-center justify-center text-center gap-2">
                            <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
                            <p className="text-xs text-muted-foreground">No holdings yet</p>
                            <Link href="/" className="text-xs text-primary hover:underline">Browse Markets →</Link>
                        </div>
                    )}
                </div>

                {/* Equity curve */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Value (30 Days)</p>
                        <span className={cn("text-xs font-mono font-semibold", pnlPositive ? "text-up" : "text-down")}>
                            {pnlPositive ? "+" : ""}{INR(overallPnl, 0)}
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={equityHistory}>
                            <defs>
                                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00d97e" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#00d97e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke="#1e2a3a" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4b5563" }} axisLine={false} tickLine={false} interval={5} />
                            <YAxis
                                tick={{ fontSize: 9, fill: "#4b5563" }} axisLine={false} tickLine={false}
                                domain={["auto", "auto"]}
                                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                width={52}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="equity" stroke="#00d97e" strokeWidth={2} fill="url(#equityGrad)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Achievements */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Achievements</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                        {unlockedCount} / {ACHIEVEMENTS.length} unlocked
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-border/40">
                    {ACHIEVEMENTS.map((a) => (
                        <div
                            key={a.id}
                            className={cn(
                                "p-4 flex flex-col gap-2 transition-colors",
                                a.unlocked ? "bg-card" : "bg-muted/20 opacity-50",
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className={cn("text-xl", !a.unlocked && "grayscale")}>{a.icon}</span>
                                {a.unlocked && (
                                    <span className="text-[9px] font-bold text-up bg-[hsl(var(--up)/0.12)] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                        Unlocked
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className={cn("text-xs font-bold", a.unlocked ? "text-foreground" : "text-muted-foreground")}>
                                    {a.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-0.5">
                                    {a.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Positions table — Open / Closed tabs */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-border">
                    {([
                        { id: "open",      label: "Open Positions",   count: portfolioHoldings.length },
                        { id: "closed",    label: "Closed Positions", count: Object.keys(closedPositions).length },
                        { id: "analytics", label: "Analytics",        count: sellTrades.length },
                        { id: "journal",   label: "Journal",          count: trades.length },
                    ] as const).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setPosTab(tab.id)}
                            className={cn(
                                "px-5 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
                                posTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                posTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Open positions */}
                {posTab === "open" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] text-muted-foreground border-b border-border/50 uppercase tracking-wider">
                                    <th className="text-left px-5 py-3 font-semibold">Symbol</th>
                                    <th className="text-right px-5 py-3 font-semibold">Qty</th>
                                    <th className="text-right px-5 py-3 font-semibold">Avg Cost</th>
                                    <th className="text-right px-5 py-3 font-semibold">
                                        LTP
                                        {hasLivePrices && (
                                            <span className="ml-1.5 text-[9px] font-bold text-up bg-[hsl(var(--up)/0.12)] px-1 py-0.5 rounded uppercase tracking-wider">Live</span>
                                        )}
                                    </th>
                                    <th className="text-right px-5 py-3 font-semibold">Market Value</th>
                                    <th className="text-right px-5 py-3 font-semibold">Unrealized P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolioHoldings.length > 0 ? portfolioHoldings.map((h) => {
                                    const cp = livePrice[h.symbol] ?? h.currentPrice;
                                    const isRowLive = livePrice[h.symbol] !== undefined;
                                    const pnl = (cp - h.avgPrice) * h.qty;
                                    const pnlPct = h.avgPrice > 0 ? ((cp - h.avgPrice) / h.avgPrice) * 100 : 0;
                                    const pos = pnl >= 0;
                                    return (
                                        <tr key={h.symbol} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                        {h.symbol[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{h.symbol.replace(".NS", "")}</p>
                                                        <p className="text-[10px] text-muted-foreground">{h.symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">{h.qty}</td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">{INR(h.avgPrice)}</td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">
                                                {INR(cp)}
                                                {isRowLive && (
                                                    <span className="ml-1 w-1 h-1 rounded-full bg-up inline-block align-middle" />
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">{INR(cp * h.qty, 0)}</td>
                                            <td className="px-5 py-4 text-right">
                                                <p className={cn("font-mono text-sm font-semibold", pos ? "text-up" : "text-down")}>
                                                    {pos ? "+" : ""}{INR(pnl, 0)}
                                                </p>
                                                <p className={cn("text-[10px]", pos ? "text-up" : "text-down")}>
                                                    {pos ? "+" : ""}{pnlPct.toFixed(2)}%
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Wallet className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20" />
                                            <p className="text-sm text-muted-foreground mb-1">No open positions</p>
                                            <Link href="/" className="text-xs text-primary hover:underline">Browse Markets →</Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Closed positions */}
                {posTab === "closed" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] text-muted-foreground border-b border-border/50 uppercase tracking-wider">
                                    <th className="text-left px-5 py-3 font-semibold">Symbol</th>
                                    <th className="text-right px-5 py-3 font-semibold">Total Qty Sold</th>
                                    <th className="text-right px-5 py-3 font-semibold">Avg Cost</th>
                                    <th className="text-right px-5 py-3 font-semibold">Avg Sell Price</th>
                                    <th className="text-right px-5 py-3 font-semibold">Last Filled</th>
                                    <th className="text-right px-5 py-3 font-semibold">Realized P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(closedPositions).length > 0 ? Object.values(closedPositions).map((cp) => {
                                    const pos = cp.realizedPnl >= 0;
                                    const pct = cp.avgCostBasis > 0 ? (cp.realizedPnl / (cp.avgCostBasis * cp.qty)) * 100 : 0;
                                    return (
                                        <tr key={cp.symbol} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                                                        {cp.symbol[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{cp.symbol.replace(".NS", "")}</p>
                                                        <p className="text-[10px] text-muted-foreground">{cp.symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">{cp.qty}</td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">{INR(cp.avgCostBasis)}</td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">{INR(cp.executionPrice)}</td>
                                            <td className="px-5 py-4 text-right text-xs text-muted-foreground">{formatDate(cp.lastFilled)}</td>
                                            <td className="px-5 py-4 text-right">
                                                <p className={cn("font-mono text-sm font-semibold", pos ? "text-up" : "text-down")}>
                                                    {pos ? "+" : ""}{INR(cp.realizedPnl, 0)}
                                                </p>
                                                <p className={cn("text-[10px]", pos ? "text-up" : "text-down")}>
                                                    {pos ? "+" : ""}{pct.toFixed(2)}%
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            {tradesLoading ? (
                                                <div className="flex justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                                            ) : (
                                                <>
                                                    <DollarSign className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20" />
                                                    <p className="text-sm text-muted-foreground mb-1">No closed positions yet</p>
                                                    <p className="text-xs text-muted-foreground/60">Realized P&L appears here after you sell a position</p>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Analytics panel */}
                {posTab === "analytics" && (
                    <div className="p-5 space-y-5">
                        {sellTrades.length === 0 ? (
                            <div className="py-12 text-center">
                                <Target className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20" />
                                <p className="text-sm text-muted-foreground mb-1">No closed trades yet</p>
                                <p className="text-xs text-muted-foreground/60">Analytics appear after you complete your first sell</p>
                            </div>
                        ) : (
                            <>
                                {/* Metric cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                    {/* Win Rate */}
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Win Rate</span>
                                            <Target className={cn("w-3.5 h-3.5", winRate >= 50 ? "text-up" : "text-down")} />
                                        </div>
                                        <p className={cn("text-2xl font-mono font-bold", winRate >= 50 ? "text-up" : "text-down")}>
                                            {winRate.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {winTrades.length}W · {lossTrades.length}L · {sellTrades.length - winTrades.length - lossTrades.length} even
                                        </p>
                                    </div>

                                    {/* Profit Factor */}
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Profit Factor</span>
                                            <Flame className={cn("w-3.5 h-3.5", profitFactor >= 1 ? "text-up" : "text-down")} />
                                        </div>
                                        <p className={cn("text-2xl font-mono font-bold", profitFactor >= 1 ? "text-up" : "text-down")}>
                                            {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">gross profit / gross loss</p>
                                    </div>

                                    {/* Avg Win */}
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Avg Win</span>
                                            <Award className="w-3.5 h-3.5 text-up" />
                                        </div>
                                        <p className="text-2xl font-mono font-bold text-up">
                                            {winTrades.length > 0 ? `+${INR(avgWin, 0)}` : "—"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">per winning trade</p>
                                    </div>

                                    {/* Avg Loss */}
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Avg Loss</span>
                                            <ThumbsDown className="w-3.5 h-3.5 text-down" />
                                        </div>
                                        <p className="text-2xl font-mono font-bold text-down">
                                            {lossTrades.length > 0 ? `-${INR(avgLoss, 0)}` : "—"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">per losing trade</p>
                                    </div>

                                    {/* Sharpe Ratio */}
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sharpe Ratio</span>
                                            <BarChart3 className={cn("w-3.5 h-3.5", sharpeRatio > 1 ? "text-up" : sharpeRatio < -1 ? "text-down" : "text-muted-foreground")} />
                                        </div>
                                        <p className={cn("text-2xl font-mono font-bold", sharpeRatio > 1 ? "text-up" : sharpeRatio < -1 ? "text-down" : "text-foreground")}>
                                            {sharpeRatio.toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">risk-adjusted return</p>
                                    </div>

                                    {/* Max Drawdown */}
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Max Drawdown</span>
                                            <TrendingDown className="w-3.5 h-3.5 text-down" />
                                        </div>
                                        <p className="text-2xl font-mono font-bold text-down">
                                            -{maxDrawdown.toFixed(2)}%
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">peak to trough</p>
                                    </div>
                                </div>

                                {/* Best / Worst trade */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {bestTrade && (
                                        <div className="bg-[hsl(var(--up)/0.05)] border border-[hsl(var(--up)/0.2)] rounded-xl p-4 flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] font-semibold text-up uppercase tracking-wider mb-1">Best Trade</p>
                                                <p className="text-sm font-bold text-foreground">{bestTrade.symbol.replace(".NS", "")}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(bestTrade.filledAt)}</p>
                                            </div>
                                            <p className="text-lg font-mono font-bold text-up">+{INR(bestTrade.realizedPnl, 0)}</p>
                                        </div>
                                    )}
                                    {worstTrade && (
                                        <div className="bg-[hsl(var(--down)/0.05)] border border-[hsl(var(--down)/0.2)] rounded-xl p-4 flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] font-semibold text-down uppercase tracking-wider mb-1">Worst Trade</p>
                                                <p className="text-sm font-bold text-foreground">{worstTrade.symbol.replace(".NS", "")}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(worstTrade.filledAt)}</p>
                                            </div>
                                            <p className="text-lg font-mono font-bold text-down">{INR(worstTrade.realizedPnl, 0)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Totals row */}
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    {[
                                        { label: "Total Trades", value: trades.length.toString() },
                                        { label: "Gross Profit", value: `+${INR(grossProfit, 0)}`, color: "text-up" },
                                        { label: "Gross Loss",   value: `-${INR(grossLoss, 0)}`, color: "text-down" },
                                    ].map((m) => (
                                        <div key={m.label} className="bg-background border border-border rounded-xl py-3 px-2">
                                            <p className={cn("text-lg font-mono font-bold", m.color ?? "text-foreground")}>{m.value}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Streak + Top symbols */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Streak */}
                                    <div className={cn(
                                        "rounded-xl border p-4 flex items-center justify-between",
                                        tradingStreak.type === "win"
                                            ? "bg-[hsl(var(--up)/0.05)] border-[hsl(var(--up)/0.2)]"
                                            : tradingStreak.type === "loss"
                                                ? "bg-[hsl(var(--down)/0.05)] border-[hsl(var(--down)/0.2)]"
                                                : "bg-background border-border",
                                    )}>
                                        <div>
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Streak</p>
                                            <p className={cn("text-2xl font-mono font-bold",
                                                tradingStreak.type === "win" ? "text-up" : tradingStreak.type === "loss" ? "text-down" : "text-foreground",
                                            )}>
                                                {tradingStreak.count}×
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1 capitalize">
                                                {tradingStreak.type === "none" ? "no trades" : `consecutive ${tradingStreak.type}s`}
                                            </p>
                                        </div>
                                        <div className={cn("text-4xl",
                                            tradingStreak.type === "win" ? "" : tradingStreak.type === "loss" ? "" : ""
                                        )}>
                                            {tradingStreak.type === "win" ? "🔥" : tradingStreak.type === "loss" ? "❄️" : "—"}
                                        </div>
                                    </div>

                                    {/* Top symbols */}
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Most Traded</p>
                                        <div className="space-y-1.5">
                                            {topSymbols.length === 0 ? (
                                                <p className="text-xs text-muted-foreground/50 italic">No trades yet</p>
                                            ) : topSymbols.map((s) => (
                                                <div key={s.symbol} className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-xs font-semibold font-mono text-foreground w-20 truncate">{s.symbol}</span>
                                                        <span className="text-[10px] text-muted-foreground">{s.count} trades</span>
                                                    </div>
                                                    <span className={cn("text-[11px] font-mono font-bold shrink-0", s.pnl >= 0 ? "text-up" : "text-down")}>
                                                        {s.pnl >= 0 ? "+" : ""}{INR(s.pnl, 0)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* P&L by Day of Week */}
                                <div className="bg-background border border-border rounded-xl p-4">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">P&amp;L by Day of Week</p>
                                    <ResponsiveContainer width="100%" height={130}>
                                        <BarChart data={pnlByDay} barSize={28}>
                                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip
                                                cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
                                                            <p className="text-muted-foreground mb-0.5">{d.day} · {d.count} trades</p>
                                                            <p className={cn("font-mono font-semibold", d.pnl >= 0 ? "text-up" : "text-down")}>
                                                                {d.pnl >= 0 ? "+" : ""}{INR(d.pnl, 0)}
                                                            </p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                                {pnlByDay.map((entry, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={entry.pnl >= 0 ? "hsl(var(--up))" : "hsl(var(--down))"}
                                                        fillOpacity={entry.count > 0 ? 0.85 : 0.2}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Monthly P&L */}
                                {pnlByMonth.length > 0 && (
                                    <div className="bg-background border border-border rounded-xl p-4">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Monthly P&amp;L</p>
                                        <ResponsiveContainer width="100%" height={120}>
                                            <BarChart data={pnlByMonth} barSize={32}>
                                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                                <YAxis hide />
                                                <Tooltip
                                                    cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload?.length) return null;
                                                        const d = payload[0].payload;
                                                        return (
                                                            <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
                                                                <p className="text-muted-foreground mb-0.5">{d.month}</p>
                                                                <p className={cn("font-mono font-semibold", d.pnl >= 0 ? "text-up" : "text-down")}>
                                                                    {d.pnl >= 0 ? "+" : ""}{INR(d.pnl, 0)}
                                                                </p>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                                    {pnlByMonth.map((entry, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={entry.pnl >= 0 ? "hsl(var(--up))" : "hsl(var(--down))"}
                                                            fillOpacity={0.85}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Journal panel */}
                {posTab === "journal" && (() => {
                    const SIDE_FILTERS = [
                        { id: "all",  label: "All Trades" },
                        { id: "buy",  label: "Buys" },
                        { id: "sell", label: "Sells" },
                    ] as const;

                    const allTags = Array.from(new Set(trades.flatMap((t) => t.order?.tags ?? [])));

                    const filtered = trades.filter((t) => {
                        if (journalFilter === "all") return true;
                        if (journalFilter === "buy" || journalFilter === "sell") return t.side === journalFilter;
                        return t.order?.tags?.includes(journalFilter);
                    });

                    return (
                        <div>
                            {/* Filter bar */}
                            <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto">
                                {SIDE_FILTERS.map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setJournalFilter(f.id)}
                                        className={cn(
                                            "px-3 py-1 text-xs font-semibold rounded-full border whitespace-nowrap transition-all",
                                            journalFilter === f.id
                                                ? "bg-primary/15 border-primary/40 text-primary"
                                                : "bg-muted border-border text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                                {allTags.length > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-border mx-1 shrink-0" />
                                        {allTags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => setJournalFilter(journalFilter === tag ? "all" : tag)}
                                                className={cn(
                                                    "px-2.5 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap transition-all",
                                                    journalFilter === tag
                                                        ? cn(TAG_COLOR[tag] ?? "bg-primary/15 border-primary/40 text-primary")
                                                        : "bg-muted border-border text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                <Tag className="w-2.5 h-2.5 inline mr-1" />{tag}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Trade rows */}
                            {filtered.length > 0 ? (
                                <div>
                                    {filtered.map((trade) => (
                                        <JournalRow
                                            key={trade.id}
                                            trade={trade}
                                            onSaved={() => queryClient.invalidateQueries({ queryKey: ["trades"] })}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <BookOpen className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20" />
                                    <p className="text-sm text-muted-foreground mb-1">
                                        {trades.length === 0 ? "No trades yet" : "No trades match this filter"}
                                    </p>
                                    <p className="text-xs text-muted-foreground/60">
                                        {trades.length === 0
                                            ? "After your first fill, journal entries appear here"
                                            : "Try a different filter above"}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Reset confirmation modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-[hsl(var(--down)/0.06)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--down)/0.15)] flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-down" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Reset Portfolio</p>
                                    <p className="text-[11px] text-muted-foreground">This action cannot be undone</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowResetConfirm(false); setResetInput(""); }}
                                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                All your holdings, open orders, and trade history will be permanently deleted.
                                Your balance will be restored to <span className="text-foreground font-semibold">₹10,00,000</span>.
                            </p>
                            <div className="bg-[hsl(var(--down)/0.06)] border border-[hsl(var(--down)/0.25)] rounded-lg p-3 text-xs text-down space-y-1">
                                <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> What will be deleted:</p>
                                <p className="text-down/80 pl-4">· All open &amp; filled orders</p>
                                <p className="text-down/80 pl-4">· All trade history &amp; realized P&amp;L</p>
                                <p className="text-down/80 pl-4">· All holdings &amp; positions</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">
                                    Type <span className="text-foreground font-bold font-mono">RESET</span> to confirm
                                </label>
                                <input
                                    type="text"
                                    value={resetInput}
                                    onChange={(e) => setResetInput(e.target.value)}
                                    placeholder="Type RESET here"
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="px-6 pb-5 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => { setShowResetConfirm(false); setResetInput(""); }}
                                className="py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/70 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => resetMutation.mutate()}
                                disabled={resetInput !== "RESET" || resetMutation.isPending}
                                className="py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--down)/0.15)] text-down border border-[hsl(var(--down)/0.3)] hover:bg-[hsl(var(--down)/0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {resetMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
                                ) : (
                                    <><RotateCcw className="w-4 h-4" /> Reset Portfolio</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
