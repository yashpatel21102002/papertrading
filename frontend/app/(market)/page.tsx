"use client";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Wifi, WifiOff, Loader2, Star, Zap, BarChart2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useMarketPolling } from "@/hooks/use-marketpolling";
import { useWatchlist } from "@/hooks/use-watchlist";
import { SECTOR_MAP, SECTOR_COLOR, formatVolume } from "@/lib/sectors";
import { cn } from "@/lib/utils";

// ── helpers ────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_120px] gap-4 px-4 py-3 items-center border-b border-border/50 animate-pulse">
      <div className="w-4 h-4 bg-muted rounded" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-24 bg-muted rounded" />
        <div className="h-2.5 w-32 bg-muted/60 rounded hidden sm:block" />
      </div>
      <div className="hidden sm:flex"><div className="h-4 w-14 bg-muted rounded-full" /></div>
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
  const sector = SECTOR_MAP[stock.symbol];
  const sectorClass = sector ? (SECTOR_COLOR[sector] ?? "bg-accent/10 text-accent border-accent/20") : null;

  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_120px] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0 group">
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

      {/* Symbol + name */}
      <Link href={`/trade?symbol=${stock.symbol}`} className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-foreground leading-tight">
          {stock.symbol.replace(".NS", "")}
        </span>
        <span className="text-xs text-muted-foreground truncate max-w-[160px] leading-tight mt-0.5 hidden sm:block">
          {stock.shortName}
        </span>
      </Link>

      {/* Sector badge — desktop only */}
      {sectorClass ? (
        <Link
          href={`/trade?symbol=${stock.symbol}`}
          className={cn("hidden sm:inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap", sectorClass)}
        >
          {sector}
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Price */}
      <Link
        href={`/trade?symbol=${stock.symbol}`}
        className={cn(
          "text-right font-mono text-sm font-medium transition-colors",
          flashData[stock.symbol] === "up" ? "price-flash-up text-up" : "",
          flashData[stock.symbol] === "down" ? "price-flash-down text-down" : "",
          !flashData[stock.symbol] && "text-foreground",
        )}
      >
        ₹{stock.regularMarketPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Link>

      {/* Abs change */}
      <Link
        href={`/trade?symbol=${stock.symbol}`}
        className={cn("text-right font-mono text-sm", stock.regularMarketChange >= 0 ? "text-up" : "text-down")}
      >
        {stock.regularMarketChange >= 0 ? "+" : ""}
        {stock.regularMarketChange.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Link>

      {/* % change pill */}
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

// ── main component ─────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const { marketData, flashData, loading, error } = useMarketPolling();
  const { symbols: watchlist, toggle, isWatched, hydrated } = useWatchlist();

  const stocks = useMemo(() => Object.values(marketData), [marketData]);

  const connectionStatus: "connected" | "disconnected" | "loading" =
    loading && stocks.length === 0 ? "loading"
    : stocks.length > 0 ? "connected"
    : error ? "disconnected"
    : "loading";

  // ── derived stats ────────────────────────────────────────────────────────────

  const { gainers, losers, unchanged, avgChange, topGainer, topLoser, mostActive } = useMemo(() => {
    if (stocks.length === 0) return { gainers: 0, losers: 0, unchanged: 0, avgChange: 0, topGainer: null, topLoser: null, mostActive: null };

    let g = 0, l = 0, u = 0, sumChange = 0;
    let tg = stocks[0], tl = stocks[0], ma = stocks[0];

    for (const s of stocks) {
      const pct = s.regularMarketChangePercent;
      sumChange += pct;
      if (pct > 0) g++; else if (pct < 0) l++; else u++;
      if (pct > tg.regularMarketChangePercent) tg = s;
      if (pct < tl.regularMarketChangePercent) tl = s;
      if ((s.regularMarketVolume ?? 0) > (ma.regularMarketVolume ?? 0)) ma = s;
    }

    return {
      gainers: g, losers: l, unchanged: u,
      avgChange: sumChange / stocks.length,
      topGainer: tg, topLoser: tl, mostActive: ma,
    };
  }, [stocks]);

  const filtered = useMemo(() =>
    stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.shortName.toLowerCase().includes(search.toLowerCase()),
    ), [stocks, search]);

  const watchedStocks = hydrated ? stocks.filter((s) => watchlist.includes(s.symbol)) : [];
  const breadthPct = stocks.length > 0 ? (gainers / stocks.length) * 100 : 50;

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* T11 — Market breadth bar */}
      {stocks.length > 0 && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Nifty 50</span>
            <span className={cn(
              "text-xs font-mono font-bold flex items-center gap-0.5",
              avgChange >= 0 ? "text-up" : "text-down",
            )}>
              {avgChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}% avg
            </span>
          </div>

          {/* Breadth bar */}
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <div className="flex h-1.5 rounded-full overflow-hidden flex-1 bg-muted">
              <div
                className="bg-[hsl(var(--up))] transition-all duration-500"
                style={{ width: `${breadthPct}%` }}
              />
              {unchanged > 0 && (
                <div
                  className="bg-muted-foreground/40"
                  style={{ width: `${(unchanged / stocks.length) * 100}%` }}
                />
              )}
              <div className="flex-1 bg-[hsl(var(--down))]" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <span className="flex items-center gap-1 text-up font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--up))] shrink-0" />
              {gainers} up
            </span>
            {unchanged > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                {unchanged} flat
              </span>
            )}
            <span className="flex items-center gap-1 text-down font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--down))] shrink-0" />
              {losers} down
            </span>
          </div>
        </div>
      )}

      {/* T10 — Overview cards: Top Gainer / Top Loser / Most Active */}
      {stocks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {/* Top Gainer */}
          {topGainer && (
            <Link
              href={`/trade?symbol=${topGainer.symbol}`}
              className="bg-card border border-border hover:border-[hsl(var(--up)/0.4)] rounded-xl px-4 py-3 flex items-center gap-3 group transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--up)/0.12)] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-up" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Top Gainer</p>
                <p className="text-sm font-bold text-foreground leading-tight truncate">
                  {topGainer.symbol.replace(".NS", "")}
                </p>
                <p className="text-xs font-mono font-semibold text-up">
                  +{topGainer.regularMarketChangePercent.toFixed(2)}%
                </p>
              </div>
            </Link>
          )}

          {/* Top Loser */}
          {topLoser && (
            <Link
              href={`/trade?symbol=${topLoser.symbol}`}
              className="bg-card border border-border hover:border-[hsl(var(--down)/0.4)] rounded-xl px-4 py-3 flex items-center gap-3 group transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--down)/0.12)] flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-down" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Top Loser</p>
                <p className="text-sm font-bold text-foreground leading-tight truncate">
                  {topLoser.symbol.replace(".NS", "")}
                </p>
                <p className="text-xs font-mono font-semibold text-down">
                  {topLoser.regularMarketChangePercent.toFixed(2)}%
                </p>
              </div>
            </Link>
          )}

          {/* Most Active */}
          {mostActive && (
            <Link
              href={`/trade?symbol=${mostActive.symbol}`}
              className="bg-card border border-border hover:border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3 group transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Most Active</p>
                <p className="text-sm font-bold text-foreground leading-tight truncate">
                  {mostActive.symbol.replace(".NS", "")}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {formatVolume(mostActive.regularMarketVolume ?? 0)} vol
                </p>
              </div>
            </Link>
          )}
        </div>
      )}

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

      {/* Watchlist hint */}
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
            <span className="ml-auto text-[10px] text-muted-foreground">
              {watchedStocks.length} stock{watchedStocks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_120px] gap-4 px-4 py-2.5 text-[10px] font-semibold text-muted-foreground border-b border-border/50 uppercase tracking-wider bg-muted/10">
            <span />
            <span>Asset</span>
            <span className="hidden sm:block">Sector</span>
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
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_120px] gap-4 px-4 py-3 text-[11px] font-semibold text-muted-foreground border-b border-border uppercase tracking-wider bg-muted/30">
          <span />
          <span>Asset</span>
          <span className="hidden sm:block">Sector</span>
          <span className="text-right">Last Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">24h %</span>
        </div>

        {connectionStatus === "loading" && stocks.length === 0 &&
          Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
        }

        {connectionStatus === "disconnected" && (
          <div className="py-16 text-center">
            <WifiOff className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Market data unavailable</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Check that the engine service is running</p>
          </div>
        )}

        {filtered.map((stock) => (
          <StockRow
            key={stock.symbol}
            stock={stock}
            isWatched={isWatched(stock.symbol)}
            onToggleWatch={() => toggle(stock.symbol)}
            flashData={flashData}
          />
        ))}

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
