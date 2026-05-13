"use client";
import Link from "next/link";
import { Search, TrendingUp, Wifi, WifiOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useMarketPolling } from "@/hooks/use-marketpolling";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

const INDEXES = [
  { label: "All Stocks", value: "all" },
  { label: "Nifty 50", value: "nifty50" },
  { label: "Sensex", value: "sensex" },
  { label: "Bank Nifty", value: "banknifty" },
];

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState("all");

  const { marketData, flashData, loading, error } = useMarketPolling();
  const stocks = Object.values(marketData);

  const connectionStatus =
    stocks.length >= 1 ? "connected" : error ? "disconnected" : "connected";

  const filtered = useMemo(() => {
    return stocks.filter(
      (s) =>
        (s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.shortName.toLowerCase().includes(search.toLowerCase())) &&
        (selectedIndex === "all" || s.symbol.includes(".NS")) // Dummy index filtering for now
    );
  }, [stocks, search, selectedIndex]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedStocks = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Filters */}
        <aside className="w-full md:w-64 space-y-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">
              Market Indexes
            </h2>
            <div className="space-y-1">
              {INDEXES.map((idx) => (
                <button
                  key={idx.value}
                  onClick={() => {
                    setSelectedIndex(idx.value);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedIndex === idx.value
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {idx.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">
              Market Status
            </h2>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono ${
              connectionStatus === "connected"
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500"
            }`}>
              {connectionStatus === "connected" ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {connectionStatus === "connected" ? "TRADING LIVE" : "MARKET OFFLINE"}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Markets</h1>
              <p className="text-sm text-muted-foreground">
                Showing {filtered.length} instruments
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search stocks, sectors..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[2fr_1fr_1fr_120px] gap-4 px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
              <span>Instrument</span>
              <span className="text-right">Market Price</span>
              <span className="text-right">Day Change</span>
              <span className="text-right">Performance</span>
            </div>
            <div className="divide-y divide-border/50">
              {paginatedStocks.map((stock) => (
                <Link
                  key={stock.symbol}
                  href={`/trade?symbol=${stock.symbol}`}
                  className="grid grid-cols-[2fr_1fr_1fr_120px] gap-4 px-6 py-4 items-center hover:bg-accent/30 transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {stock.symbol}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                      {stock.shortName}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "text-right font-mono text-sm font-semibold transition-colors duration-300",
                      flashData[stock.symbol] === "up" && "text-green-500",
                      flashData[stock.symbol] === "down" && "text-red-500"
                    )}
                  >
                    ₹{stock.regularMarketPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>

                  <span
                    className={cn(
                      "text-right font-mono text-sm",
                      stock.regularMarketChange >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {stock.regularMarketChange >= 0 ? "+" : ""}
                    {stock.regularMarketChange.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>

                  <div className="flex justify-end">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold gap-1.5",
                        stock.regularMarketChange >= 0
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      )}
                    >
                      {stock.regularMarketChangePercent.toFixed(2)}%
                      {stock.regularMarketChange >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {paginatedStocks.length === 0 && (
              <div className="py-20 text-center text-muted-foreground italic">
                No stocks found matching your criteria
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-xs text-muted-foreground font-medium">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </div>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-2 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      "w-9 h-9 rounded-md border text-xs font-bold transition-all",
                      currentPage === page
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card hover:bg-accent text-muted-foreground"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-2 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
