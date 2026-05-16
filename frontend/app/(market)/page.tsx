"use client";
import Link from "next/link";
import { Search, TrendingUp, Wifi, WifiOff, Loader2, Star } from "lucide-react";
import { useState } from "react";
import { useMarketPolling } from "@/hooks/use-marketpolling";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[auto_2fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_1fr_1fr_120px] gap-4 px-4 py-3 items-center border-b border-border/50 animate-pulse">
      <div className="w-4 h-4 bg-muted rounded" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-24 bg-muted rounded" />
        <div className="h-2.5 w-32 bg-muted/60 rounded hidden sm:block" />
      </div>
      <div className="flex justify-end"><div className="h-3.5 w-20 bg-muted rounded" /></div>
      <div className="flex justify-end"><div className="h-3.5 w-16 bg-muted rounded" /></div>
      <div className="flex justify-end"><div className="h-5 w-16 bg-muted rounded-full" /></div>
    </div>
  );
}

function StockRow({
  stock,
  isWatched,
  onToggleWatch,
  flashData,
}: {
  stock: any;
  isWatched: boolean;
  onToggleWatch: () => void;
  flashData: Record<string, "up" | "down">;
}) {
  return (
    <div className="grid grid-cols-[auto_2fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_1fr_1fr_120px] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0 group">
      {/* Star */}
      <button
        onClick={(e) => { e.preventDefault(); onToggleWatch(); }}
        className={cn(
          "transition-all shrink-0",
          isWatched ? "text-amber-400" : "text-border hover:text-amber-400 hover:scale-110",
        )}
        aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Star className={cn("w-3.5 h-3.5", isWatched && "fill-amber-400")} />
      </button>

      {/* Symbol + name — clickable */}
      <Link href={`/trade?symbol=${stock.symbol}`} className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground">{stock.symbol.replace(".NS", "")}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[180px]">{stock.shortName}</span>
      </Link>

      <Link href={`/trade?symbol=${stock.symbol}`}
        className={cn(
          "text-right font-mono text-sm font-medium transition-colors",
          flashData[stock.symbol] === "up" ? "price-flash-up text-up" : "",
          flashData[stock.symbol] === "down" ? "price-flash-down text-down" : "",
          !flashData[stock.symbol] && "text-foreground",
        )}
      >
        ₹{stock.regularMarketPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Link>

      <Link href={`/trade?symbol=${stock.symbol}`}
        className={cn("text-right font-mono text-sm", stock.regularMarketChange >= 0 ? "text-up" : "text-down")}
      >
        {stock.regularMarketChange >= 0 ? "+" : ""}
        {stock.regularMarketChange.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Link>

      <Link href={`/trade?symbol=${stock.symbol}`} className="flex justify-end">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold",
          stock.regularMarketChange >= 0 ? "pill-up" : "pill-down",
        )}>
          {stock.regularMarketChange >= 0 ? "+" : ""}
          {stock.regularMarketChangePercent.toFixed(2)}%
          <TrendingUp className={cn("w-3 h-3", stock.regularMarketChange < 0 && "rotate-180")} />
        </span>
      </Link>
    </div>
  );
}

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const { marketData, flashData, loading, error } = useMarketPolling();
  const { symbols: watchlist, toggle, isWatched, hydrated } = useWatchlist();

  const stocks = Object.values(marketData);

  const connectionStatus: "connected" | "disconnected" | "loading" = loading && stocks.length === 0
    ? "loading"
    : stocks.length > 0
      ? "connected"
      : error
        ? "disconnected"
        : "loading";

  const filtered = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.shortName.toLowerCase().includes(search.toLowerCase()),
  );

  const watchedStocks = hydrated
    ? stocks.filter((s) => watchlist.includes(s.symbol))
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Markets</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Nifty 50 — live prices</p>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold",
            connectionStatus === "connected" && "bg-[hsl(var(--up)/0.15)] text-up",
            connectionStatus === "disconnected" && "bg-[hsl(var(--down)/0.15)] text-down",
            connectionStatus === "loading" && "bg-muted text-muted-foreground",
          )}>
            {connectionStatus === "connected" && <Wifi className="w-3 h-3" />}
            {connectionStatus === "disconnected" && <WifiOff className="w-3 h-3" />}
            {connectionStatus === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
            {connectionStatus === "connected" ? "LIVE" : connectionStatus === "disconnected" ? "OFFLINE" : "CONNECTING"}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search stocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Watchlist hint — shown when nothing starred yet */}
      {hydrated && watchedStocks.length === 0 && !search && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-xs text-muted-foreground">
          <Star className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
          <span>Star any stock to add it to your watchlist — it will appear here for quick access.</span>
        </div>
      )}

      {/* Watchlist section */}
      {hydrated && watchedStocks.length > 0 && !search && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Watchlist</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{watchedStocks.length} stock{watchedStocks.length !== 1 ? "s" : ""}</span>
          </div>
          {/* Table header */}
          <div className="grid grid-cols-[auto_2fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_1fr_1fr_120px] gap-4 px-4 py-2.5 text-[10px] font-semibold text-muted-foreground border-b border-border/50 uppercase tracking-wider bg-muted/10">
            <span />
            <span>Asset</span>
            <span className="text-right">Last Price</span>
            <span className="text-right">Change</span>
            <span className="text-right">24h %</span>
          </div>
          {watchedStocks.map((stock) => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              isWatched={true}
              onToggleWatch={() => toggle(stock.symbol)}
              flashData={flashData}
            />
          ))}
        </div>
      )}

      {/* All stocks table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_2fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_1fr_1fr_120px] gap-4 px-4 py-3 text-[11px] font-semibold text-muted-foreground border-b border-border uppercase tracking-wider bg-muted/30">
          <span />
          <span>Asset</span>
          <span className="text-right">Last Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">24h %</span>
        </div>

        {/* Loading skeletons */}
        {connectionStatus === "loading" && stocks.length === 0 && (
          Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
        )}

        {/* Error state */}
        {connectionStatus === "disconnected" && (
          <div className="py-16 text-center">
            <WifiOff className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Market data unavailable</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Check that the engine service is running</p>
          </div>
        )}

        {/* Rows */}
        {filtered.map((stock) => (
          <StockRow
            key={stock.symbol}
            stock={stock}
            isWatched={isWatched(stock.symbol)}
            onToggleWatch={() => toggle(stock.symbol)}
            flashData={flashData}
          />
        ))}

        {/* Empty search */}
        {filtered.length === 0 && stocks.length > 0 && (
          <div className="py-16 text-center">
            <Search className="w-7 h-7 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No stocks match &quot;{search}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
