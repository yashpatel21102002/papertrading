"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, Suspense } from "react";
import { nifty50Stocks } from "@/lib/mock-data";
import {
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Clock,
  History,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import StockChart from "@/components/StockChart";
import useGetOrders from "@/hooks/use-getOrders";
import { useWebSocket } from "@/hooks/use-websockets"; // 1. Import the hook
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import axios from "axios";
import api from "@/lib/axios";

interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price: number;
  quantity: number;
  status: "open" | "filled" | "cancelled";
  createdAt: string;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

const TradeLoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        {/* The Icon */}
        <Loader2 className="h-10 w-10 animate-spin text-primary" />

        {/* Optional Text */}
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase animate-pulse">
          Syncing Market
        </p>
      </div>
    </div>
  );
};

// --- WRAPPER PAGE (This satisfies Next.js Build Requirements) ---
export default function TradePage() {
  return (
    <Suspense fallback={<TradeLoadingScreen />}>
      <TradeContent />
    </Suspense>
  );
}

function TradeContent() {
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol") || "RELIANCE.NS";

  // 2. Initialize WebSocket for this specific symbol
  const tickers = useMemo(() => [symbolParam], [symbolParam]);
  const { tickData, flashMap } = useWebSocket(tickers);

  const staticStock = useMemo(() => {
    return (
      nifty50Stocks.find((s) => s.symbol === symbolParam) || nifty50Stocks[0]
    );
  }, [symbolParam]);

  const [marketInfo, setMarketInfo] = useState<StockData | null>(null);

  // Form State
  const [orderType, setOrderType] = useState<"Limit" | "Market">("Limit");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [price, setPrice] = useState(staticStock.price.toString());
  const [quantity, setQuantity] = useState("10");
  const [bottomTab, setBottomTab] = useState<"open" | "history">("open");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial Fetch from the Market Polling source
  useEffect(() => {
    const fetchLatestMarketData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8002/api/market/${symbolParam}`,
        );
        const data = response.data;
        setMarketInfo({
          symbol: symbolParam,
          price: data.regularMarketPrice,
          change: data.regularMarketChange,
          changePercent: data.regularMarketChangePercent,
          name: data.shortName,
        });
      } catch (err) {
        console.error("Failed to fetch initial market data", err);
      }
    };
    fetchLatestMarketData();
  }, [symbolParam]);

  // 3. Merge WebSocket data with static data
  // We use the Live data if available, otherwise fallback to static
  const livePrice =
    tickData[symbolParam]?.regularMarketPrice ??
    marketInfo?.price ??
    staticStock.price;
  const liveChange =
    tickData[symbolParam]?.regularMarketChange ??
    marketInfo?.change ??
    staticStock.change;
  const livePercent =
    tickData[symbolParam]?.regularMarketChangePercent ??
    marketInfo?.changePercent ??
    staticStock.changePercent;
  const flashStatus = flashMap[symbolParam]; // "up" | "down" | undefined
  // State for the "Latest" data (initialized from API polling source)
  // Sync price input when selecting a new stock or when market moves (if using limit)
  // Sync price input when selecting a new stock OR when the initial API fetch completes
  const name = marketInfo?.name;
  useEffect(() => {
    if (livePrice) {
      setPrice(livePrice.toString());
    }
  }, [symbolParam, marketInfo]); // Added marketInfo here

  const { openOrders, orderHistory, mutate: refreshOrders } = useGetOrders();

  const orderTypes = ["Limit", "Market"] as const;
  const percentages = [25, 50, 75, 100];

  const formatINR = (val: number) =>
    val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "---";
    }
  };

  const estTotal = useMemo(() => {
    const currentPrice =
      orderType === "Market" ? livePrice : parseFloat(price || "0");
    const qty = parseInt(quantity || "0");
    return isNaN(currentPrice * qty) ? 0 : currentPrice * qty;
  }, [price, quantity, orderType, livePrice]);

  const handlePlaceOrder = async () => {
    const qtyNum = parseInt(quantity);
    const priceNum = parseFloat(price);

    if (!qtyNum || qtyNum <= 0) {
      toast.error("Invalid Quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/orders/create", {
        symbol: symbolParam,
        quantity: qtyNum,
        price: orderType === "Market" ? 0 : priceNum,
        side: side.toLowerCase(),
        type: orderType.toLowerCase(),
      });
      toast.success("Order Placed Successfully");
      refreshOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || "Order execution failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      await api.delete(`/api/orders/cancel/${id}`);
      toast.success("Order Cancelled");
      refreshOrders();
    } catch (err) {
      toast.error("Failed to cancel order");
    }
  };

  if (!marketInfo) {
    return <TradeLoadingScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-foreground">
      {/* 1. Header Card */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {symbolParam[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{symbolParam}</h1>
            <p className="text-sm text-muted-foreground">{name}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            {/* Price with Flash Effect */}
            <p
              className={cn(
                "text-2xl font-mono font-bold tracking-tighter transition-colors duration-300",
                flashStatus === "up" && "text-green-500",
                flashStatus === "down" && "text-red-500",
              )}
            >
              ₹{formatINR(livePrice)}
            </p>
            <div
              className={cn(
                "flex items-center justify-end text-sm font-medium",
                liveChange >= 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {liveChange >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {liveChange >= 0 ? "+" : ""}
              {livePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* 2. Chart Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center gap-2 text-sm font-medium">
            <BarChart2 className="w-4 h-4 text-primary" />
            Live Market Chart
          </div>
          <div className="h-[500px] w-full">
            <StockChart />
          </div>
        </div>

        {/* 3. Order Placement Card */}
        <div className="bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden h-fit">
          <div className="flex p-1 bg-muted/50 gap-1">
            <button
              onClick={() => setSide("BUY")}
              className={cn(
                "flex-1 py-3 text-sm font-bold rounded-md transition-all relative z-10",
                side === "BUY"
                  ? "bg-background text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:bg-background/30",
              )}
            >
              BUY
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={cn(
                "flex-1 py-3 text-sm font-bold rounded-md transition-all relative z-10",
                side === "SELL"
                  ? "bg-background text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:bg-background/30",
              )}
            >
              SELL
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {orderTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-md transition-all",
                    orderType === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {orderType === "Limit"
                    ? "Limit Price"
                    : "Market Price (Est.)"}
                </label>
                <input
                  type="number"
                  value={orderType === "Market" ? livePrice : price}
                  disabled={orderType === "Market"}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-4 py-2 font-mono text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-4 py-2 font-mono text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {percentages.map((p) => (
                <button
                  key={p}
                  onClick={() =>
                    setQuantity(
                      Math.floor((1000000 / livePrice) * (p / 100)).toString(),
                    )
                  } // Dummy logic for buying power
                  className="flex-1 py-1.5 text-[10px] font-bold border border-border rounded hover:bg-accent transition-colors"
                >
                  {p}%
                </button>
              ))}
            </div>

            <div className="bg-muted/40 p-4 rounded-lg space-y-2 border border-border/50">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Est. Order Value</span>
                <span className="font-mono font-bold">
                  ₹{formatINR(estTotal)}
                </span>
              </div>
            </div>

            <button
              disabled={isSubmitting}
              onClick={handlePlaceOrder}
              className={cn(
                "w-full py-4 rounded-md font-bold text-sm tracking-wider transition-all shadow-sm",
                isSubmitting
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
              )}
            >
              {isSubmitting ? "PROCESSING..." : `CONFIRM ${side}`}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Orders Table Section */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex bg-muted/20 border-b border-border">
          <button
            onClick={() => setBottomTab("open")}
            className={cn(
              "px-6 py-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
              bottomTab === "open"
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground",
            )}
          >
            <Clock className="w-4 h-4" /> OPEN ORDERS
          </button>
          <button
            onClick={() => setBottomTab("history")}
            className={cn(
              "px-6 py-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
              bottomTab === "history"
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground",
            )}
          >
            <History className="w-4 h-4" /> ORDER HISTORY
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-muted-foreground text-[11px] uppercase font-bold">
                <th className="text-left px-6 py-4">Created Date & Time</th>
                <th className="text-left px-6 py-4">Symbol</th>
                <th className="text-left px-6 py-4">Side</th>
                <th className="text-right px-6 py-4">Price</th>
                <th className="text-right px-6 py-4">Qty</th>
                <th className="text-right px-6 py-4">Status</th>
                {bottomTab === "open" && (
                  <th className="text-center px-6 py-4">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(bottomTab === "open" ? openOrders : orderHistory).map(
                (order: Order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-bold">{order.symbol}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded uppercase",
                          order.side === "buy"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-600",
                        )}
                      >
                        {order.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      ₹{formatINR(order.price)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                          order.status === "open" &&
                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-500",
                          order.status === "filled" &&
                            "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500",
                          order.status === "cancelled" &&
                            "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500",
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                    {bottomTab === "open" && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {(bottomTab === "open" ? openOrders : orderHistory).length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
              <p>No records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
