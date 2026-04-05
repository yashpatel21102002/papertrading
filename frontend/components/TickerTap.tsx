"use client";
import React, { useMemo } from "react";
import { StockQuote, useMarketPolling } from "@/hooks/use-marketpolling";

// 1. Create a sub-component for the scrolling items
const TickerTrack = React.memo(({ stocks }: { stocks: StockQuote[] }) => {
  return (
    <div className="flex items-center gap-8 animate-ticker-scroll hover:pause-animation">
      {/* We render the list twice to create a seamless infinite loop */}
      {[...stocks, ...stocks].map((stock, i) => (
        <div
          key={`${stock.symbol}-${i}`}
          className="flex items-center gap-2 text-[11px] font-mono shrink-0"
        >
          <span className="font-bold text-foreground">{stock.symbol}</span>
          <span className="text-muted-foreground">
            ₹
            {stock.regularMarketPrice.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
          <span
            className={`text-[10px] ${stock.regularMarketChange >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {stock.regularMarketChange >= 0 ? "▲" : "▼"}
            {Math.abs(stock.regularMarketChangePercent).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
});

TickerTrack.displayName = "TickerTrack";

export function TickerTape() {
  const { marketData, loading } = useMarketPolling();

  // Convert object to array once per update
  const stocks = useMemo(() => Object.values(marketData), [marketData]);

  if (stocks.length === 0 && loading)
    return <div className="h-8 bg-muted/20 animate-pulse" />;

  return (
    <div className="w-full overflow-hidden bg-background border-b border-border py-1 select-none">
      <div className="relative flex overflow-x-hidden">
        <TickerTrack stocks={stocks} />
      </div>
    </div>
  );
}
