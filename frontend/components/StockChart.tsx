"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

export default function Chart() {
  const searchParams = useSearchParams();
  const [symbol, setSymbol] = useState("BSE:RELIANCE");

  useEffect(() => {
    const symbolParam = searchParams.get("symbol") || localStorage.getItem("lastViewedTicker") || "RELIANCE.NS";
    const formattedSymbol = `BSE:${symbolParam.replace(".NS", "").toUpperCase()}`;
    setSymbol(formattedSymbol);
  }, [searchParams]);

  return (
    <div className="h-full w-full">
      <AdvancedRealTimeChart
        symbol={symbol}
        theme="dark"
        interval="D"
        autosize
        hide_side_toolbar={false}
        allow_symbol_change={true}
        save_image={false}
        details={true}
        hotlist={true}
        calendar={true}
      />
    </div>
  );
}
