import { useMemo } from "react";
import { nifty50Stocks, type Stock } from "@/lib/mock-data";
import { useWebSocket } from "./use-websockets";
/**
 * Merges live WebSocket tick data onto the static mock stock list.
 * When the WS delivers a price for a symbol, we overlay it; otherwise we keep the mock baseline.
 */
export function useRealtimeMarketData(tickers: string[]) {
    const { tickData, flashMap, status } = useWebSocket(tickers);

    const stocks: Stock[] = useMemo(
        () =>
            nifty50Stocks.map((stock) => {
                const tick = tickData[stock.symbol];
                if (!tick) return stock;

                const newPrice = tick.regularMarketPrice;
                return {
                    ...stock,
                    price: newPrice,
                    change: tick.regularMarketChange,
                    changePercent: tick.regularMarketChangePercent,
                    sparkline: [...stock.sparkline.slice(1), newPrice],
                };
            }),
        [tickData]
    );

    return { stocks, flashMap, connectionStatus: status };
}

export function useRealtimeConnection() {
    const { status } = useWebSocket([]);
    return status;
}
