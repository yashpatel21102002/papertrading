"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "@/lib/axios";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/portfolio/summary")
      .then((res) => {
        // Log this to your console to see exactly what the backend is sending
        console.log("Backend Response:", res.data);
        setData(res.data);
      })
      .catch((err) => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  // Safety: If data is null or doesn't have the required arrays, show a fallback
  if (!data || !data.portfolioHoldings)
    return (
      <div className="p-10 text-center text-muted-foreground">
        No portfolio data found. Please check if your backend is returning
        &quot;portfolioHoldings&quot;.
      </div>
    );

  // Destructure with default empty arrays to prevent .map() crashes
  const {
    portfolioHoldings = [],
    equityHistory = [],
    totalEquity = 0,
    todayPnl = 0,
    buyingPower = 0,
  } = data;

  const pieData = portfolioHoldings.map((h) => ({
    name: h.symbol,
    value: parseFloat(h.allocation) || 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Portfolio</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <DollarSign className="w-4 h-4" /> Total Equity
          </div>
          <p className="text-2xl font-mono font-semibold text-foreground">
            ₹{totalEquity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            {todayPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-up" />
            ) : (
              <TrendingDown className="w-4 h-4 text-down" />
            )}
            Total PnL
          </div>
          <p
            className={`text-2xl font-mono font-semibold ${todayPnl >= 0 ? "text-up" : "text-down"}`}
          >
            {todayPnl >= 0 ? "+" : ""}₹
            {todayPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Wallet className="w-4 h-4" /> Buying Power
          </div>
          <p className="text-2xl font-mono font-semibold text-foreground">
            ₹{buyingPower.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 mb-6">
        {/* Asset Allocation */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-4">
            <BarChart3 className="w-4 h-4" /> Asset Allocation
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {pieData.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-mono text-foreground ml-auto">
                      {entry.value}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
              No Assets
            </div>
          )}
        </div>

        {/* Equity Curve */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-4">
            <TrendingUp className="w-4 h-4" /> Equity Growth (30 Days)
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={equityHistory}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(220, 14%, 14%)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(215, 14%, 45%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(215, 14%, 45%)" }}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 7%)",
                  border: "1px solid hsl(220, 14%, 14%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(215, 14%, 45%)" }}
                formatter={(val) => `₹${val.toLocaleString("en-IN")}`}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="hsl(160, 84%, 39%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-medium text-muted-foreground">
          Current Positions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Symbol</th>
                <th className="text-right px-4 py-2 font-medium">Qty</th>
                <th className="text-right px-4 py-2 font-medium">Avg Price</th>
                <th className="text-right px-4 py-2 font-medium">LTP</th>
                <th className="text-right px-4 py-2 font-medium">
                  Unrealized PnL
                </th>
              </tr>
            </thead>
            <tbody>
              {portfolioHoldings.length > 0 ? (
                portfolioHoldings.map((h) => {
                  const pnl = (h.currentPrice - h.avgPrice) * h.qty;
                  const pnlPercent =
                    h.avgPrice > 0
                      ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100
                      : 0;
                  return (
                    <tr
                      key={h.symbol}
                      className="border-b border-border/50 last:border-0 hover:bg-accent/30"
                    >
                      <td className="px-4 py-3 font-medium">{h.symbol}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {h.qty}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ₹{h.avgPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ₹{h.currentPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono ${pnl >= 0 ? "text-up" : "text-down"}`}
                        >
                          {pnl >= 0 ? "+" : ""}₹
                          {pnl.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <span
                          className={`text-xs ml-1 ${pnl >= 0 ? "text-up" : "text-down"}`}
                        >
                          ({pnlPercent >= 0 ? "+" : ""}
                          {pnlPercent.toFixed(2)}%)
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No active positions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
