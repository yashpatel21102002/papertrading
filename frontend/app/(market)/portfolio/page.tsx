"use client";
import {
    TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight, DollarSign,
    RotateCcw, AlertTriangle, Loader2, X, Target, Flame, Award, ThumbsDown,
} from "lucide-react";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import useGetPortfolio from "@/hooks/use-getPortfolio";
import useGetTrades from "@/hooks/use-getTrades";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";

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
    const [posTab, setPosTab] = useState<"open" | "closed" | "analytics">("open");
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

    const pieData = portfolioHoldings.map((h) => ({
        name: h.symbol.replace(".NS", ""),
        value: parseFloat(h.allocation as any) || 0,
    }));

    const pnlPositive = overallPnl >= 0;
    const unrealPnlPositive = unrealizedPnl >= 0;
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

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-foreground">Portfolio</h1>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono hidden sm:inline">Updated every 30s</span>
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
                    value={INR(totalPortfolioValue, 0)}
                    sub={`${pnlPositive ? "+" : ""}${INR(overallPnl, 0)} overall`}
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
                    value={INR(holdingsValue, 0)}
                    sub={`${portfolioHoldings.length} position${portfolioHoldings.length !== 1 ? "s" : ""}`}
                    icon={BarChart3}
                    accentClass="bg-accent/10 text-accent"
                />
                <StatCard
                    label="Unrealized P&L"
                    value={`${unrealPnlPositive ? "+" : ""}${INR(unrealizedPnl, 0)}`}
                    sub="Open positions"
                    positive={unrealizedPnl === 0 ? undefined : unrealPnlPositive}
                    icon={unrealPnlPositive ? TrendingUp : TrendingDown}
                    accentClass={unrealizedPnl === 0 ? "bg-muted text-muted-foreground" : unrealPnlPositive ? "bg-[hsl(var(--up)/0.12)] text-up" : "bg-[hsl(var(--down)/0.12)] text-down"}
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

            {/* Positions table — Open / Closed tabs */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-border">
                    {([
                        { id: "open",      label: "Open Positions",   count: portfolioHoldings.length },
                        { id: "closed",    label: "Closed Positions", count: Object.keys(closedPositions).length },
                        { id: "analytics", label: "Analytics",        count: sellTrades.length },
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
                                    <th className="text-right px-5 py-3 font-semibold">LTP</th>
                                    <th className="text-right px-5 py-3 font-semibold">Market Value</th>
                                    <th className="text-right px-5 py-3 font-semibold">Unrealized P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolioHoldings.length > 0 ? portfolioHoldings.map((h) => {
                                    const pnl = (h.currentPrice - h.avgPrice) * h.qty;
                                    const pnlPct = h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
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
                                            <td className="px-5 py-4 text-right font-mono text-sm">{INR(h.currentPrice)}</td>
                                            <td className="px-5 py-4 text-right font-mono text-sm">{INR(h.marketValue ?? h.currentPrice * h.qty, 0)}</td>
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
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                            </>
                        )}
                    </div>
                )}
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
