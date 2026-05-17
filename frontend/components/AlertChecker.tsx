"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMarketPolling } from "@/hooks/use-marketpolling";
import { usePriceAlerts } from "@/hooks/use-price-alerts";
import { useActivity } from "@/context/activity-context";

export function AlertChecker() {
    const { marketData } = useMarketPolling();
    const { alerts, checkAndTrigger } = usePriceAlerts();
    const { addEvent } = useActivity();
    const alertsRef = useRef(alerts);

    // Keep ref in sync so the effect always sees current alerts without re-running on every alert change
    useEffect(() => { alertsRef.current = alerts; }, [alerts]);

    useEffect(() => {
        if (Object.keys(marketData).length === 0) return;

        const priceMap: Record<string, number> = {};
        for (const [sym, data] of Object.entries(marketData)) {
            priceMap[sym] = data.regularMarketPrice;
        }

        const triggered = checkAndTrigger(priceMap, alertsRef.current);
        triggered.forEach((alert) => {
            const INR = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
            const currentPrice = priceMap[alert.symbol] ?? alert.targetPrice;

            toast.info(`🔔 Price Alert: ${alert.symbol.replace(".NS", "")}`, {
                description: `${currentPrice >= alert.targetPrice ? "Crossed above" : "Fell below"} your target of ${INR(alert.targetPrice)}. Now at ${INR(currentPrice)}.`,
                duration: 8000,
            });

            addEvent({
                type: "price_alert",
                symbol: alert.symbol,
                side: "alert",
                qty: 0,
                price: alert.targetPrice,
                meta: `${alert.direction} ${INR(alert.targetPrice)}`,
            });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [marketData]);

    return null;
}
