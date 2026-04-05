"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

export default function Chart() {
  const searchParams = useSearchParams();
  // const symbolParam = searchParams.get("symbol")?.slice(0, -3).toUpperCase();

  const symbolParam = searchParams.get("symbol");

  const formattedSymbol = symbolParam
    ? `BSE:${symbolParam.replace(".NS", "").toUpperCase()}`
    : "B  SE:RELIANCE";
  return (
    <div className="h-[500px]">
      <AdvancedRealTimeChart
        symbol={formattedSymbol}
        theme="light"
        // allow_symbol_change={false}
        interval="D"
        autosize
      />
    </div>
  );
}
