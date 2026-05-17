"use client";

import { useEffect, useRef, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    CartesianGrid,
} from "recharts";

interface PricePoint {
    time: string;
    price: number;
}

interface StockChartProps {
    symbol: string;
    currentPrice: number;
    openPrice?: number;
}

const MAX_POINTS = 120;
const MUTED = "#4b5563";
const GREEN = "hsl(155, 100%, 43%)";
const RED = "hsl(351, 85%, 63%)";

function fmt(val: number) {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(iso: string) {
    try {
        return new Date(iso).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", hour12: false,
        });
    } catch { return ""; }
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
            <p className="text-muted-foreground mb-0.5">{label}</p>
            <p className="font-mono font-semibold text-foreground">{fmt(payload[0]?.value ?? 0)}</p>
        </div>
    );
}

export default function StockChart({ symbol, currentPrice, openPrice }: StockChartProps) {
    const bufferRef = useRef<PricePoint[]>([]);
    const [points, setPoints] = useState<PricePoint[]>([]);
    const initializedRef = useRef(false);

    // Reset when symbol changes
    useEffect(() => {
        bufferRef.current = [];
        initializedRef.current = false;
        setPoints([]);
    }, [symbol]);

    // Seed chart immediately with 2 identical points so it renders without waiting for 2 live ticks
    useEffect(() => {
        if (!currentPrice || currentPrice === 0) return;

        if (!initializedRef.current) {
            const now = Date.now();
            bufferRef.current = [
                { time: new Date(now - 5000).toISOString(), price: currentPrice },
                { time: new Date(now).toISOString(), price: currentPrice },
            ];
            initializedRef.current = true;
        } else {
            const last = bufferRef.current[bufferRef.current.length - 1];
            // Only add a new point if price has changed or more than 5s passed
            if (!last || last.price !== currentPrice) {
                bufferRef.current = [
                    ...bufferRef.current,
                    { time: new Date().toISOString(), price: currentPrice },
                ].slice(-MAX_POINTS);
            }
        }

        setPoints([...bufferRef.current]);
    }, [currentPrice, symbol]);

    const ref = openPrice ?? points[0]?.price ?? currentPrice;
    const isUp = currentPrice >= ref;
    const lineColor = isUp ? GREEN : RED;
    const fillColorId = isUp ? "gradientGreen" : "gradientRed";

    const displayPoints = points.map((p) => ({ time: fmtTime(p.time), price: p.price }));

    const prices = displayPoints.map((p) => p.price).filter(Boolean);
    const minPrice = prices.length ? Math.min(...prices) : currentPrice * 0.998;
    const maxPrice = prices.length ? Math.max(...prices) : currentPrice * 1.002;
    const pad = (maxPrice - minPrice) * 0.15 || currentPrice * 0.002;

    return (
        <div className="h-full w-full relative">
            {displayPoints.length < 2 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                    <p className="text-3xl font-mono font-bold text-foreground">{fmt(currentPrice)}</p>
                    <p className="text-xs text-muted-foreground">Waiting for live data…</p>
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayPoints} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                        <defs>
                            <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={RED} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={RED} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="#1e2a3a" vertical={false} />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: MUTED }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                            tickCount={5}
                        />
                        <YAxis
                            domain={[minPrice - pad, maxPrice + pad]}
                            tick={{ fontSize: 10, fill: MUTED }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
                            width={78}
                            orientation="right"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {ref > 0 && (
                            <ReferenceLine
                                y={ref}
                                stroke={MUTED}
                                strokeDasharray="3 3"
                                strokeWidth={1}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke={lineColor}
                            strokeWidth={2}
                            fill={`url(#${fillColorId})`}
                            dot={false}
                            activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
