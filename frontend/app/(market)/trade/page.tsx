"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nifty50Stocks } from "@/lib/mock-data";
import {
    ArrowUpRight, ArrowDownRight, BarChart2, Clock, History,
    Trash2, AlertCircle, Loader2, TrendingUp, Wifi, WifiOff, X,
} from "lucide-react";
import StockChart from "@/components/StockChart";
import useGetOrders from "@/hooks/use-getOrders";
import useGetPortfolio from "@/hooks/use-getPortfolio";
import { useWebSocket } from "@/hooks/use-websockets";
import { useActivity } from "@/context/activity-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import axios from "axios";
import api from "@/lib/axios";
import { SECTOR_MAP, SECTOR_COLOR, formatVolume, formatMarketCap } from "@/lib/sectors";

const MARKET_URL = process.env.NEXT_PUBLIC_MARKET_URL || "http://localhost:8002";

const MARKET_STATE_LABEL: Record<string, { label: string; color: string }> = {
    REGULAR: { label: "Market Open", color: "text-up" },
    PRE: { label: "Pre-Market", color: "text-accent" },
    PREPRE: { label: "Pre-Market", color: "text-accent" },
    POST: { label: "After-Hours", color: "text-accent" },
    POSTPOST: { label: "After-Hours", color: "text-accent" },
    CLOSED: { label: "Market Closed", color: "text-muted-foreground" },
};

interface Order {
    id: string; symbol: string; side: "buy" | "sell"; type: "limit" | "market";
    price: number; quantity: number; status: "open" | "pending" | "filled" | "cancelled";
    createdAt: string;
}

const INR = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LoadingScreen = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
            <TrendingUp className="w-10 h-10 text-primary animate-pulse" />
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Loading</p>
        </div>
    </div>
);

export default function TradePage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <TradeContent />
        </Suspense>
    );
}

function TradeContent() {
    const searchParams = useSearchParams();
    const symbolParam = searchParams.get("symbol") || "RELIANCE.NS";
    const queryClient = useQueryClient();
    const { addEvent } = useActivity();

    const tickers = useMemo(() => [symbolParam], [symbolParam]);
    const { tickData, flashMap, status: wsStatus } = useWebSocket(tickers);

    const staticStock = useMemo(
        () => nifty50Stocks.find((s) => s.symbol === symbolParam) || nifty50Stocks[0],
        [symbolParam],
    );

    const [marketInfo, setMarketInfo] = useState<{
        price: number; change: number; changePercent: number;
        name: string; dayHigh?: number; dayLow?: number;
        open?: number; volume?: number;
        weekHigh52?: number; weekLow52?: number;
        marketCap?: number; marketState?: string;
        exchange?: string;
    } | null>(null);
    const [fetchingMarket, setFetchingMarket] = useState(true);

    const [orderType, setOrderType] = useState<"Limit" | "Market">("Limit");
    const [side, setSide] = useState<"BUY" | "SELL">("BUY");
    const [price, setPrice] = useState(staticStock.price.toString());
    const [quantity, setQuantity] = useState("10");
    const [bottomTab, setBottomTab] = useState<"open" | "history">("open");
    const [showConfirm, setShowConfirm] = useState(false);

    const prevOrdersRef = useRef<Order[]>([]);

    // Portfolio context for balance + holdings
    const { portfolio } = useGetPortfolio();
    const buyingPower = portfolio?.buyingPower ?? 0;
    const currentHolding = portfolio?.portfolioHoldings.find((h) => h.symbol === symbolParam);

    useEffect(() => {
        setMarketInfo(null);
        setFetchingMarket(true);
        axios
            .get<{
                regularMarketPrice: number; regularMarketChange: number;
                regularMarketChangePercent: number; shortName: string;
                regularMarketDayHigh?: number; regularMarketDayLow?: number;
                regularMarketOpen?: number; regularMarketVolume?: number;
                fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
                marketCap?: number; marketState?: string;
                fullExchangeName?: string;
            }>(`${MARKET_URL}/api/market/${symbolParam}`)
            .then((res) => {
                setMarketInfo({
                    price: res.data.regularMarketPrice,
                    change: res.data.regularMarketChange,
                    changePercent: res.data.regularMarketChangePercent,
                    name: res.data.shortName,
                    dayHigh: res.data.regularMarketDayHigh,
                    dayLow: res.data.regularMarketDayLow,
                    open: res.data.regularMarketOpen,
                    volume: res.data.regularMarketVolume,
                    weekHigh52: res.data.fiftyTwoWeekHigh,
                    weekLow52: res.data.fiftyTwoWeekLow,
                    marketCap: res.data.marketCap,
                    marketState: res.data.marketState,
                    exchange: res.data.fullExchangeName,
                });
            })
            .catch(() => {/* use staticStock fallback */})
            .finally(() => setFetchingMarket(false));
    }, [symbolParam]);

    // Live prices from WS, falling back to market API, then static mock
    const livePrice = tickData[symbolParam]?.regularMarketPrice ?? marketInfo?.price ?? staticStock.price;
    const liveChange = tickData[symbolParam]?.regularMarketChange ?? marketInfo?.change ?? staticStock.change;
    const livePercent = tickData[symbolParam]?.regularMarketChangePercent ?? marketInfo?.changePercent ?? staticStock.changePercent;
    const flashStatus = flashMap[symbolParam];
    const stockName = marketInfo?.name ?? staticStock.name;

    // Sync price input when symbol or market info changes
    useEffect(() => {
        if (livePrice) setPrice(livePrice.toFixed(2));
    }, [symbolParam, marketInfo]);

    const { openOrders, orderHistory } = useGetOrders();

    // Detect status changes to emit activity events
    useEffect(() => {
        const all = [...openOrders, ...orderHistory] as Order[];
        if (prevOrdersRef.current.length > 0) {
            all.forEach((order) => {
                const prev = prevOrdersRef.current.find((o) => o.id === order.id);
                if (!prev || prev.status === order.status) return;
                if (order.status === "filled") {
                    addEvent({ type: "order_filled", symbol: order.symbol, side: order.side, qty: order.quantity, price: order.price });
                } else if (order.status === "cancelled") {
                    addEvent({ type: "order_cancelled", symbol: order.symbol, side: order.side, qty: order.quantity, price: order.price });
                }
            });
        }
        prevOrdersRef.current = all;
    }, [openOrders, orderHistory, addEvent]);

    const percentages = [25, 50, 75, 100];
    const orderTypes = ["Limit", "Market"] as const;

    const estTotal = useMemo(() => {
        const p = orderType === "Market" ? livePrice : parseFloat(price || "0");
        const q = parseInt(quantity || "0");
        return isNaN(p * q) ? 0 : p * q;
    }, [price, quantity, orderType, livePrice]);

    const placeMutation = useMutation({
        mutationFn: (payload: { symbol: string; quantity: number; price: number; side: string; type: string }) =>
            api.post("/api/orders/create", payload),
        onSuccess: (_, vars) => {
            toast.success("Order placed", { description: `${vars.side.toUpperCase()} ${vars.quantity} × ${vars.symbol}` });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            addEvent({
                type: "order_placed",
                symbol: vars.symbol,
                side: vars.side as "buy" | "sell",
                qty: vars.quantity,
                price: vars.price > 0 ? vars.price : undefined,
            });
        },
        onError: (err: any) => toast.error(err?.response?.data?.error || "Order failed"),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/api/orders/cancel/${id}`),
        onSuccess: () => {
            toast.success("Cancellation requested");
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
        onError: () => toast.error("Failed to cancel order"),
    });

    const handlePlaceOrder = () => {
        const qty = parseInt(quantity);
        if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); return; }
        setShowConfirm(true);
    };

    const handleConfirmOrder = () => {
        const qty = parseInt(quantity);
        const px = parseFloat(price);
        setShowConfirm(false);
        placeMutation.mutate({
            symbol: symbolParam,
            quantity: qty,
            price: orderType === "Market" ? 0 : px,
            side: side.toLowerCase(),
            type: orderType.toLowerCase(),
        });
    };

    const formatDateTime = (s: string) => {
        try {
            return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
        } catch { return "—"; }
    };

    const isLive = wsStatus === "connected";

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            {/* ── Header ── */}
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Symbol info */}
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                            {symbolParam[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold">{symbolParam.replace(".NS", "")}</h1>
                                <span className={cn(
                                    "flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full",
                                    isLive ? "bg-[hsl(var(--up)/0.15)] text-up" : "bg-muted text-muted-foreground",
                                )}>
                                    {isLive ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                                    {isLive ? "LIVE" : "DELAYED"}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{stockName}</p>
                        </div>
                    </div>

                    {/* Price + change */}
                    <div className="flex items-end gap-6 flex-wrap">
                        <div className="text-right">
                            <p className={cn(
                                "text-3xl font-mono font-bold tracking-tighter transition-colors",
                                flashStatus === "up" && "text-up",
                                flashStatus === "down" && "text-down",
                                !flashStatus && "text-foreground",
                            )}>
                                {fetchingMarket && !tickData[symbolParam] ? "—" : `₹${INR(livePrice)}`}
                            </p>
                            <div className={cn("flex items-center justify-end text-sm font-semibold", liveChange >= 0 ? "text-up" : "text-down")}>
                                {liveChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {liveChange >= 0 ? "+" : ""}{livePercent.toFixed(2)}%
                                <span className="ml-1 text-xs font-mono opacity-70">
                                    ({liveChange >= 0 ? "+" : ""}₹{Math.abs(liveChange).toFixed(2)})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stock detail bar ── */}
            {marketInfo && (
                <div className="bg-card border border-border rounded-xl px-4 py-3 overflow-x-auto">
                    <div className="flex items-center gap-6 min-w-max text-xs">
                        {marketInfo.open && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">Open</p>
                                <p className="font-mono font-semibold text-foreground">₹{INR(marketInfo.open)}</p>
                            </div>
                        )}
                        {(marketInfo.dayHigh || marketInfo.dayLow) && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">Day Range</p>
                                <p className="font-mono font-semibold text-foreground">
                                    <span className="text-down">₹{INR(marketInfo.dayLow ?? 0)}</span>
                                    <span className="text-muted-foreground mx-1">–</span>
                                    <span className="text-up">₹{INR(marketInfo.dayHigh ?? 0)}</span>
                                </p>
                            </div>
                        )}
                        {(marketInfo.weekHigh52 || marketInfo.weekLow52) && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">52W Range</p>
                                <p className="font-mono font-semibold text-foreground">
                                    <span className="text-down">₹{INR(marketInfo.weekLow52 ?? 0)}</span>
                                    <span className="text-muted-foreground mx-1">–</span>
                                    <span className="text-up">₹{INR(marketInfo.weekHigh52 ?? 0)}</span>
                                </p>
                            </div>
                        )}
                        {marketInfo.volume && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">Volume</p>
                                <p className="font-mono font-semibold text-foreground">{formatVolume(marketInfo.volume)}</p>
                            </div>
                        )}
                        {marketInfo.marketCap && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">Mkt Cap</p>
                                <p className="font-mono font-semibold text-foreground">{formatMarketCap(marketInfo.marketCap)}</p>
                            </div>
                        )}
                        {SECTOR_MAP[symbolParam] && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">Sector</p>
                                <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded-md border",
                                    SECTOR_COLOR[SECTOR_MAP[symbolParam]] ?? "bg-accent/10 text-accent border-accent/20",
                                )}>
                                    {SECTOR_MAP[symbolParam]}
                                </span>
                            </div>
                        )}
                        {marketInfo.exchange && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">Exchange</p>
                                <p className="font-mono font-semibold text-foreground">{marketInfo.exchange}</p>
                            </div>
                        )}
                        {marketInfo.marketState && (
                            <div>
                                <p className="text-muted-foreground mb-0.5 uppercase tracking-wider text-[10px] font-semibold">Status</p>
                                <p className={cn("font-semibold", (MARKET_STATE_LABEL[marketInfo.marketState] ?? MARKET_STATE_LABEL.CLOSED).color)}>
                                    {(MARKET_STATE_LABEL[marketInfo.marketState] ?? MARKET_STATE_LABEL.CLOSED).label}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Chart + Order panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
                {/* Chart */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Price Chart</span>
                        {isLive && (
                            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-up font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
                                LIVE
                            </span>
                        )}
                    </div>
                    <div className="h-[400px] w-full p-3">
                        <StockChart
                            symbol={symbolParam}
                            currentPrice={livePrice}
                            openPrice={marketInfo?.price}
                        />
                    </div>
                </div>

                {/* Order panel */}
                <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    {/* BUY / SELL */}
                    <div className="grid grid-cols-2 gap-1 p-1.5 bg-muted/20">
                        {(["BUY", "SELL"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setSide(s)}
                                className={cn(
                                    "py-3 text-sm font-bold rounded-lg transition-all",
                                    side === s
                                        ? s === "BUY"
                                            ? "bg-[hsl(var(--up)/0.2)] text-up border border-[hsl(var(--up)/0.5)] shadow-sm"
                                            : "bg-[hsl(var(--down)/0.2)] text-down border border-[hsl(var(--down)/0.5)] shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 space-y-4 flex-1">
                        {/* Order type toggle */}
                        <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg">
                            {orderTypes.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setOrderType(t)}
                                    className={cn(
                                        "py-1.5 text-xs font-semibold rounded-md transition-all",
                                        orderType === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Inputs */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
                                    {orderType === "Limit" ? "Limit Price (₹)" : "Market Price (Est.)"}
                                </label>
                                <input
                                    type="number"
                                    value={orderType === "Market" ? livePrice.toFixed(2) : price}
                                    disabled={orderType === "Market"}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 font-mono text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    value={quantity}
                                    min={1}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Quick % buttons — % of available balance */}
                        <div className="grid grid-cols-4 gap-1">
                            {percentages.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        const effectivePrice = orderType === "Market" ? livePrice : parseFloat(price || "0");
                                        if (effectivePrice <= 0) return;
                                        const maxAffordable = side === "BUY"
                                            ? Math.floor((buyingPower * (p / 100)) / effectivePrice)
                                            : Math.floor((currentHolding?.qty ?? 0) * (p / 100));
                                        setQuantity(Math.max(1, maxAffordable).toString());
                                    }}
                                    className="py-1.5 text-[10px] font-bold border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/40 transition-all"
                                >
                                    {p}%
                                </button>
                            ))}
                        </div>

                        {/* Balance + holding context */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-muted/40 rounded-md px-2.5 py-2">
                                <p className="text-muted-foreground mb-0.5">Available Cash</p>
                                <p className="font-mono font-semibold text-foreground">
                                    ₹{buyingPower.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="bg-muted/40 rounded-md px-2.5 py-2">
                                <p className="text-muted-foreground mb-0.5">Current Holding</p>
                                <p className="font-mono font-semibold text-foreground">
                                    {currentHolding ? `${currentHolding.qty} shares` : "—"}
                                </p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-muted/50 border border-border/50 rounded-lg p-3 space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Price per share</span>
                                <span className="font-mono">₹{INR(orderType === "Market" ? livePrice : parseFloat(price || "0"))}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Quantity</span>
                                <span className="font-mono">{parseInt(quantity) || 0}</span>
                            </div>
                            <div className="h-px bg-border my-1" />
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-muted-foreground">Est. Total</span>
                                <span className="font-mono text-foreground">₹{INR(estTotal)}</span>
                            </div>
                        </div>

                        {/* Insufficient balance warning */}
                        {side === "BUY" && estTotal > buyingPower && buyingPower > 0 && (
                            <div className="flex items-center gap-2 bg-[hsl(var(--down)/0.1)] border border-[hsl(var(--down)/0.3)] rounded-lg px-3 py-2">
                                <AlertCircle className="w-3.5 h-3.5 text-down shrink-0" />
                                <p className="text-[11px] text-down font-medium">
                                    Exceeds available balance by ₹{INR(estTotal - buyingPower)}
                                </p>
                            </div>
                        )}
                        {side === "SELL" && currentHolding && parseInt(quantity) > currentHolding.qty && (
                            <div className="flex items-center gap-2 bg-[hsl(var(--down)/0.1)] border border-[hsl(var(--down)/0.3)] rounded-lg px-3 py-2">
                                <AlertCircle className="w-3.5 h-3.5 text-down shrink-0" />
                                <p className="text-[11px] text-down font-medium">
                                    You only hold {currentHolding.qty} shares
                                </p>
                            </div>
                        )}

                        {/* Submit button */}
                        {(() => {
                            const qty = parseInt(quantity) || 0;
                            const insufficientBuy = side === "BUY" && estTotal > buyingPower && buyingPower > 0;
                            const insufficientSell = side === "SELL" && currentHolding !== undefined && qty > currentHolding.qty;
                            const isDisabled = placeMutation.isPending || insufficientBuy || insufficientSell;
                            return (
                                <button
                                    disabled={isDisabled}
                                    onClick={handlePlaceOrder}
                                    className={cn(
                                        "w-full py-3.5 rounded-lg font-bold text-sm tracking-wider transition-all active:scale-[0.98]",
                                        isDisabled
                                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                                            : side === "BUY"
                                                ? "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_20px_hsl(155,100%,43%,0.2)]"
                                                : "bg-destructive text-white hover:brightness-110 shadow-[0_0_20px_hsl(351,85%,63%,0.2)]",
                                    )}
                                >
                                    {placeMutation.isPending ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                                        </span>
                                    ) : `Confirm ${side}`}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* ── Orders table ── */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex border-b border-border">
                    {(["open", "history"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setBottomTab(tab)}
                            className={cn(
                                "px-5 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
                                bottomTab === tab
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab === "open" ? <><Clock className="w-3.5 h-3.5" />Open Orders</> : <><History className="w-3.5 h-3.5" />History</>}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[10px] text-muted-foreground border-b border-border uppercase tracking-wider font-bold">
                                <th className="text-left px-5 py-3">Time</th>
                                <th className="text-left px-5 py-3">Symbol</th>
                                <th className="text-left px-5 py-3">Side</th>
                                <th className="text-left px-5 py-3">Type</th>
                                <th className="text-right px-5 py-3">Price</th>
                                <th className="text-right px-5 py-3">Qty</th>
                                <th className="text-right px-5 py-3">Status</th>
                                {bottomTab === "open" && <th className="px-5 py-3" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {(bottomTab === "open" ? openOrders : orderHistory).map((order: Order) => (
                                <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                                        {formatDateTime(order.createdAt)}
                                    </td>
                                    <td className="px-5 py-3.5 font-bold text-xs">{order.symbol.replace(".NS", "")}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                            order.side === "buy" ? "bg-[hsl(var(--up)/0.12)] text-up" : "bg-[hsl(var(--down)/0.12)] text-down",
                                        )}>
                                            {order.side}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-muted-foreground capitalize">{order.type}</td>
                                    <td className="px-5 py-3.5 text-right font-mono text-xs">
                                        {order.price > 0 ? `₹${INR(order.price)}` : "MKT"}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold">{order.quantity}</td>
                                    <td className="px-5 py-3.5 text-right">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                            order.status === "open" && "bg-accent/10 text-accent",
                                            order.status === "pending" && "bg-muted text-muted-foreground",
                                            order.status === "filled" && "bg-[hsl(var(--up)/0.12)] text-up",
                                            order.status === "cancelled" && "bg-[hsl(var(--down)/0.12)] text-down",
                                        )}>
                                            {order.status}
                                        </span>
                                    </td>
                                    {bottomTab === "open" && (
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() => cancelMutation.mutate(order.id)}
                                                disabled={cancelMutation.isPending}
                                                className="text-muted-foreground hover:text-down transition-colors disabled:opacity-30"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(bottomTab === "open" ? openOrders : orderHistory).length === 0 && (
                        <div className="py-14 flex flex-col items-center justify-center text-muted-foreground">
                            <AlertCircle className="w-7 h-7 mb-2 opacity-20" />
                            <p className="text-sm">{bottomTab === "open" ? "No open orders" : "No order history yet"}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Confirmation modal ── */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        {/* Modal header */}
                        <div className={cn(
                            "px-6 py-4 border-b border-border flex items-center justify-between",
                            side === "BUY" ? "bg-[hsl(var(--up)/0.08)]" : "bg-[hsl(var(--down)/0.08)]",
                        )}>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Confirm Order</p>
                                <p className={cn("text-lg font-bold", side === "BUY" ? "text-up" : "text-down")}>
                                    {side} {symbolParam.replace(".NS", "")}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Order details */}
                        <div className="px-6 py-4 space-y-3">
                            {[
                                { label: "Symbol", value: symbolParam },
                                { label: "Side", value: side, colored: true },
                                { label: "Type", value: orderType },
                                { label: "Price", value: orderType === "Market" ? "Market price" : `₹${INR(parseFloat(price || "0"))}` },
                                { label: "Quantity", value: `${parseInt(quantity) || 0} shares` },
                            ].map(({ label, value, colored }) => (
                                <div key={label} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className={cn(
                                        "font-mono font-semibold",
                                        colored ? (side === "BUY" ? "text-up" : "text-down") : "text-foreground",
                                    )}>{value}</span>
                                </div>
                            ))}
                            <div className="h-px bg-border" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-foreground">Est. Total</span>
                                <span className="font-mono font-bold text-lg text-foreground">₹{INR(estTotal)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-5 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="py-3 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmOrder}
                                disabled={placeMutation.isPending}
                                className={cn(
                                    "py-3 rounded-lg text-sm font-bold transition-all",
                                    side === "BUY"
                                        ? "bg-primary text-primary-foreground hover:brightness-110"
                                        : "bg-destructive text-white hover:brightness-110",
                                    placeMutation.isPending && "opacity-60 cursor-not-allowed",
                                )}
                            >
                                {placeMutation.isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Placing…
                                    </span>
                                ) : `Place ${side}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
