"use client";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Wifi, WifiOff, Loader2, Star, Zap, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useMarketPolling } from "@/hooks/use-marketpolling";
import { useWatchlist } from "@/hooks/use-watchlist";
import { SECTOR_MAP, SECTOR_COLOR, formatVolume } from "@/lib/sectors";
import { cn } from "@/lib/utils";

// ── helpers ─────────────────────────────────────────────────────────────────

type SortKey = "symbol" | "price" | "change" | "pct" | "volume";
type SortDir = "asc" | "desc";

const ALL_SECTORS = Array.from(new Set(Object.values(SECTOR_MAP))).sort();

function SortIcon({ colKey, sortKey, sortDir }: { colKey: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (colKey !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-primary" />
    : <ArrowDown className="w-3 h-3 text-primary" />;
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_100px_120px] gap-4 px-4 py-3 items-center border-b border-border/50 animate-pulse">
      <div className="w-4 h-4 bg-muted rounded" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-24 bg-muted rounded" />
        <div className="h-2.5 w-32 bg-muted/60 rounded hidden sm:block" />
      </div>
      <div className="hidden sm:flex"><div className="h-4 w-14 bg-muted rounded-full" /></div>
      <div className="flex justify-end"><div className="h-3.5 w-20 bg-muted rounded" /></div>
      <div className="flex justify-end"><div className="h-3.5 w-16 bg-muted rounded" /></div>
      <div className="hidden sm:flex justify-end"><div className="h-3.5 w-16 bg-muted rounded" /></div>
      <div className="flex justify-end"><div className="h-5 w-16 bg-muted rounded-full" /></div>
    </div>
  );
}

function StockRow({
  stock, isWatched, onToggleWatch, flashData,
}: {
  stock: any; isWatched: boolean; onToggleWatch: () => void; flashData: Record<string, "up" | "down">;
}) {
  const sector = SECTOR_MAP[stock.symbol];
  const sectorClass = sector ? (SECTOR_COLOR[sector] ?? "bg-accent/10 text-accent border-accent/20") : null;

  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_100px_120px] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0 group">
      {/* Star */}
      <button
        onClick={(e) => { e.preventDefault(); onToggleWatch(); }}
        className={cn("transition-all shrink-0", isWatched ? "text-amber-400" : "text-border hover:text-amber-400 hover:scale-110")}
        aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Star className={cn("w-3.5 h-3.5", isWatched && "fill-amber-400")} />
      </button>

      {/* Symbol + name */}
      <Link href={`/trade?symbol=${stock.symbol}`} className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-foreground leading-tight">{stock.symbol.replace(".NS", "")}</span>
        <span className="text-xs text-muted-foreground truncate max-w-[160px] leading-tight mt-0.5 hidden sm:block">{stock.shortName}</span>
      </Link>

      {/* Sector badge */}
      {sectorClass ? (
        <Link href={`/trade?symbol=${stock.symbol}`} className={cn("hidden sm:inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap", sectorClass)}>
          {sector}
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Price */}
      <Link href={`/trade?symbol=${stock.symbol}`} className={cn(
        "text-right font-mono text-sm font-medium transition-colors",
        flashData[stock.symbol] === "up" ? "price-flash-up text-up" : "",
        flashData[stock.symbol] === "down" ? "price-flash-down text-down" : "",
        !flashData[stock.symbol] && "text-foreground",
      )}>
        ₹{stock.regularMarketPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Link>

      {/* Abs change */}
      <Link href={`/trade?symbol=${stock.symbol}`} className={cn("text-right font-mono text-sm", stock.regularMarketChange >= 0 ? "text-up" : "text-down")}>
        {stock.regularMarketChange >= 0 ? "+" : ""}
        {stock.regularMarketChange.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Link>

      {/* Volume — desktop only */}
      <Link href={`/trade?symbol=${stock.symbol}`} className="hidden sm:block text-right font-mono text-xs text-muted-foreground">
        {formatVolume(stock.regularMarketVolume ?? 0)}
      </Link>

      {/* % change pill */}
      <Link href={`/trade?symbol=${stock.symbol}`} className="flex justify-end">
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold", stock.regularMarketChange >= 0 ? "pill-up" : "pill-down")}>
          {stock.regularMarketChange >= 0 ? "+" : ""}{stock.regularMarketChangePercent.toFixed(2)}%
          <TrendingUp className={cn("w-3 h-3", stock.regularMarketChange < 0 && "rotate-180")} />
        </span>
      </Link>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { marketData, flashData, loading, error } = useMarketPolling();
  const { symbols: watchlist, toggle, isWatched, hydrated } = useWatchlist();

  const stocks = useMemo(() => Object.values(marketData), [marketData]);

  const connectionStatus: "connected" | "disconnected" | "loading" =
    loading && stocks.length === 0 ? "loading"
    : stocks.length > 0 ? "connected"
    : error ? "disconnected"
    : "loading";

  // ── derived stats ────────────────────────────────────────────────────────────

  const { gainers, losers, unchanged, avgChange, top5Gainers, top5Losers } = useMemo(() => {
    if (stocks.length === 0) return { gainers: 0, losers: 0, unchanged: 0, avgChange: 0, topGainer: null, topLoser: null, mostActive: null, top5Gainers: [], top5Losers: [] };
    let g = 0, l = 0, u = 0, sumChange = 0;
    for (const s of stocks) {
      const pct = s.regularMarketChangePercent;
      sumChange += pct;
      if (pct > 0) g++; else if (pct < 0) l++; else u++;
    }
    const sorted = [...stocks].sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent);
    return { gainers: g, losers: l, unchanged: u, avgChange: sumChange / stocks.length, top5Gainers: sorted.slice(0, 5), top5Losers: sorted.slice(-5).reverse() };
  }, [stocks]);

  // ── sort + filter ────────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    let list = stocks.filter((s) => {
      const matchSearch = !search || s.symbol.toLowerCase().includes(search.toLowerCase()) || s.shortName.toLowerCase().includes(search.toLowerCase());
      const matchSector = sectorFilter === "all" || SECTOR_MAP[s.symbol] === sectorFilter;
      return matchSearch && matchSector;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "symbol") cmp = a.symbol.localeCompare(b.symbol);
      else if (sortKey === "price") cmp = a.regularMarketPrice - b.regularMarketPrice;
      else if (sortKey === "change") cmp = a.regularMarketChange - b.regularMarketChange;
      else if (sortKey === "pct") cmp = a.regularMarketChangePercent - b.regularMarketChangePercent;
      else if (sortKey === "volume") cmp = (a.regularMarketVolume ?? 0) - (b.regularMarketVolume ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [stocks, search, sectorFilter, sortKey, sortDir]);

  const watchedStocks = hydrated ? stocks.filter((s) => watchlist.includes(s.symbol)) : [];
  const breadthPct = stocks.length > 0 ? (gainers / stocks.length) * 100 : 50;

  const headerBtn = (key: SortKey, label: string, className = "") => (
    <button
      onClick={() => handleSort(key)}
      className={cn("flex items-center gap-1 hover:text-foreground transition-colors", className)}
    >
      {label}
      <SortIcon colKey={key} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* Market breadth bar */}
      {stocks.length > 0 && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Nifty 50</span>
            <span className={cn("text-xs font-mono font-bold flex items-center gap-0.5", avgChange >= 0 ? "text-up" : "text-down")}>
              {avgChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}% avg
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <div className="flex h-1.5 rounded-full overflow-hidden flex-1 bg-muted">
              <div className="bg-[hsl(var(--up))] transition-all duration-500" style={{ width: `${breadthPct}%` }} />
              {unchanged > 0 && <div className="bg-muted-foreground/40" style={{ width: `${(unchanged / stocks.length) * 100}%` }} />}
              <div className="flex-1 bg-[hsl(var(--down))]" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <span className="flex items-center gap-1 text-up font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--up))] shrink-0" />{gainers} up</span>
            {unchanged > 0 && <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />{unchanged} flat</span>}
            <span className="flex items-center gap-1 text-down font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--down))] shrink-0" />{losers} down</span>
          </div>
        </div>
      )}

      {/* Top Movers */}
      {stocks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Top 5 Gainers */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-up" />
              <span className="text-[11px] font-bold text-up uppercase tracking-wider">Top Gainers</span>
            </div>
            <div className="divide-y divide-border/40">
              {top5Gainers.map((s, i) => (
                <Link key={s.symbol} href={`/trade?symbol=${s.symbol}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/50 font-mono w-3 shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{s.symbol.replace(".NS", "")}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">{s.shortName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-up">+{s.regularMarketChangePercent.toFixed(2)}%</p>
                    <p className="text-[9px] font-mono text-muted-foreground">₹{s.regularMarketPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top 5 Losers */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-down" />
              <span className="text-[11px] font-bold text-down uppercase tracking-wider">Top Losers</span>
            </div>
            <div className="divide-y divide-border/40">
              {top5Losers.map((s, i) => (
                <Link key={s.symbol} href={`/trade?symbol=${s.symbol}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/50 font-mono w-3 shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{s.symbol.replace(".NS", "")}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">{s.shortName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-down">{s.regularMarketChangePercent.toFixed(2)}%</p>
                    <p className="text-[9px] font-mono text-muted-foreground">₹{s.regularMarketPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Most Active */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Most Active</span>
            </div>
            <div className="divide-y divide-border/40">
              {[...stocks].sort((a, b) => (b.regularMarketVolume ?? 0) - (a.regularMarketVolume ?? 0)).slice(0, 5).map((s, i) => (
                <Link key={s.symbol} href={`/trade?symbol=${s.symbol}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/50 font-mono w-3 shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{s.symbol.replace(".NS", "")}</p>
                      <p className="text-[9px] text-muted-foreground">{formatVolume(s.regularMarketVolume ?? 0)} vol</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-mono font-bold", s.regularMarketChangePercent >= 0 ? "text-up" : "text-down")}>
                      {s.regularMarketChangePercent >= 0 ? "+" : ""}{s.regularMarketChangePercent.toFixed(2)}%
                    </p>
                    <p className="text-[9px] font-mono text-muted-foreground">₹{s.regularMarketPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Page header + search */}
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
            onChange={(e) => { setSearch(e.target.value); setSectorFilter("all"); }}
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Sector filter tabs */}
      {stocks.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSectorFilter("all")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap",
              sectorFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/20",
            )}
          >
            All Sectors
            <span className="ml-1.5 text-[10px] opacity-60">{stocks.length}</span>
          </button>

          {ALL_SECTORS.map((sector) => {
            const count = stocks.filter((s) => SECTOR_MAP[s.symbol] === sector).length;
            if (count === 0) return null;
            const colorClass = SECTOR_COLOR[sector] ?? "bg-accent/10 text-accent border-accent/20";
            const isActive = sectorFilter === sector;
            return (
              <button
                key={sector}
                onClick={() => setSectorFilter(sector)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap",
                  isActive ? colorClass : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/20",
                )}
              >
                {sector}
                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Watchlist section */}
      {hydrated && watchedStocks.length > 0 && !search && sectorFilter === "all" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Watchlist</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{watchedStocks.length} stock{watchedStocks.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_100px_120px] gap-4 px-4 py-2.5 text-[10px] font-semibold text-muted-foreground border-b border-border/50 uppercase tracking-wider bg-muted/10">
            <span /><span>Asset</span><span className="hidden sm:block">Sector</span>
            <span className="text-right">Price</span><span className="text-right">Change</span>
            <span className="hidden sm:block text-right">Volume</span><span className="text-right">24h %</span>
          </div>
          {watchedStocks.map((stock) => (
            <StockRow key={stock.symbol} stock={stock} isWatched={true} onToggleWatch={() => toggle(stock.symbol)} flashData={flashData} />
          ))}
        </div>
      )}

      {/* Watchlist hint */}
      {hydrated && watchedStocks.length === 0 && !search && sectorFilter === "all" && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-xs text-muted-foreground">
          <Star className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
          <span>Star any stock to add it to your watchlist — it will appear here for quick access.</span>
        </div>
      )}

      {/* All stocks table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Sortable header */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_100px] sm:grid-cols-[auto_2fr_auto_1fr_1fr_100px_120px] gap-4 px-4 py-3 text-[11px] font-semibold text-muted-foreground border-b border-border uppercase tracking-wider bg-muted/30">
          <span />
          {headerBtn("symbol", "Asset")}
          <span className="hidden sm:block">Sector</span>
          {headerBtn("price", "Price", "justify-end text-right")}
          {headerBtn("change", "Change", "justify-end text-right")}
          {headerBtn("volume", "Volume", "hidden sm:flex justify-end text-right")}
          {headerBtn("pct", "24h %", "justify-end text-right")}
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
            <p className="text-sm text-muted-foreground">
              {search ? `No stocks match "${search}"` : `No stocks in ${sectorFilter}`}
            </p>
            {sectorFilter !== "all" && (
              <button onClick={() => setSectorFilter("all")} className="mt-2 text-xs text-primary hover:underline">
                Clear sector filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
