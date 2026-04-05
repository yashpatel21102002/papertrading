"use client";
import Link from "next/link";
import { Search, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useMarketPolling } from "@/hooks/use-marketpolling";

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const { marketData, flashData, loading, error } = useMarketPolling();
  const stocks = Object.values(marketData);

  const connectionStatus =
    stocks.length >= 1 ? "connected" : error ? "disconnected" : "connected";

  const filtered = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.shortName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Markets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Nifty 50 Stocks — Live Prices
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono ${
              connectionStatus === "connected"
                ? "bg-[hsl(var(--up)/0.15)] text-[hsl(var(--up))]"
                : "bg-[hsl(var(--down)/0.15)] text-[hsl(var(--down))]"
            }`}
          >
            {connectionStatus === "connected" ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {connectionStatus === "connected" ? "LIVE" : "OFFLINE"}
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search stocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_100px] sm:grid-cols-[2fr_1fr_1fr_120px] gap-4 px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border">
          <span>Asset</span>
          <span className="text-right">Last Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">24h Change</span>
        </div>
        {filtered.map((stock) => (
          <Link
            key={stock.symbol}
            href={`/trade?symbol=${stock.symbol}`}
            className="grid grid-cols-[2fr_1fr_1fr_100px] sm:grid-cols-[2fr_1fr_1fr_120px] gap-4 px-4 py-3 items-center hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0"
          >
            <div>
              <span className="text-sm font-medium text-foreground">
                {stock.symbol}
              </span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                {stock.shortName}
              </span>
            </div>

            <span
              className={`text-right font-mono text-sm text-foreground transition-colors ${
                flashData[stock.symbol] === "up"
                  ? "price-flash-up"
                  : flashData[stock.symbol] === "down"
                    ? "price-flash-down"
                    : "text-foreground"
              }`}
            >
              ₹{stock.regularMarketPrice.toLocaleString("en-IN")}
            </span>
            <span
              className={`text-right font-mono text-sm text-foreground transition-colors ${
                flashData[stock.symbol] === "up"
                  ? "price-flash-up"
                  : flashData[stock.symbol] === "down"
                    ? "price-flash-down"
                    : ""
              }`}
            >
              ₹
              {stock.regularMarketChange.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
            <div className="flex justify-end">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium gap-2 ${
                  stock.regularMarketChange >= 0 ? "pill-up" : "pill-down"
                }`}
              >
                {stock.regularMarketChange >= 0 ? "+" : ""}
                {stock.regularMarketChangePercent.toFixed(2)}%
                <span>
                  {stock.regularMarketChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                  )}
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
