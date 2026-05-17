"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActivity } from "@/context/activity-context";
import useGetOrders, { Order } from "@/hooks/use-getOrders";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

const SYMBOL = (s: string) => s.replace(".NS", "");
const INR = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function OrderStatusWatcher() {
    const { orders } = useGetOrders();
    const { addEvent } = useActivity();
    const queryClient = useQueryClient();

    // Tracks the last known status per order id.
    // On the very first data load we just seed the map — we never fire events
    // for orders that were already filled/cancelled before this session started.
    const initialized = useRef(false);
    const prevStatuses = useRef<Record<string, string>>({});

    useEffect(() => {
        if (orders.length === 0) return;

        if (!initialized.current) {
            orders.forEach((o) => { prevStatuses.current[o.id] = o.status; });
            initialized.current = true;
            return;
        }

        orders.forEach((order: Order) => {
            const prev = prevStatuses.current[order.id];

            if (prev === undefined) {
                // Brand-new order we haven't tracked yet.
                // If it already shows as filled/cancelled (fast market order fill),
                // fire the event only if it was created in the last 60 seconds.
                const ageMs = Date.now() - new Date(order.createdAt).getTime();
                if (ageMs < 60_000) {
                    if (order.status === "filled") fireFilled(order);
                    else if (order.status === "cancelled") fireCancelled(order);
                }
                prevStatuses.current[order.id] = order.status;
                return;
            }

            if (prev === order.status) return;

            if (order.status === "filled") {
                fireFilled(order);
                // Refresh portfolio/trades so P&L updates immediately
                queryClient.invalidateQueries({ queryKey: ["portfolio"] });
                queryClient.invalidateQueries({ queryKey: ["trades"] });
            } else if (order.status === "cancelled") {
                fireCancelled(order);
                queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            }

            prevStatuses.current[order.id] = order.status;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders]);

    function fireFilled(order: Order) {
        const priceStr = order.price > 0 ? ` at ${INR(order.price)}` : "";
        addEvent({
            type: "order_filled",
            symbol: order.symbol,
            side: order.side,
            qty: order.quantity,
            price: order.price > 0 ? order.price : undefined,
        });
        toast.success(
            `${order.side === "buy" ? "Buy" : "Sell"} order filled — ${SYMBOL(order.symbol)}`,
            {
                description: `${order.quantity} shares${priceStr}`,
                icon: <CheckCircle2 className="w-4 h-4 text-up" />,
                duration: 5000,
            },
        );
    }

    function fireCancelled(order: Order) {
        addEvent({
            type: "order_cancelled",
            symbol: order.symbol,
            side: order.side,
            qty: order.quantity,
        });
        toast.info(
            `Order cancelled — ${SYMBOL(order.symbol)}`,
            {
                description: `${order.quantity} shares`,
                icon: <XCircle className="w-4 h-4 text-muted-foreground" />,
                duration: 4000,
            },
        );
    }

    return null;
}
