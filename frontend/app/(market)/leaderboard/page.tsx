"use client";
import useGetLeaderboard from "@/hooks/use-getLeaderboard";
import { cn } from "@/lib/utils";
import { Trophy, Medal, TrendingUp, TrendingDown, Loader2, Users } from "lucide-react";

const INR = (v: number, dec = 0) =>
    `₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

const RANK_STYLES: Record<number, { bg: string; text: string; icon: React.ElementType }> = {
    1: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", icon: Trophy },
    2: { bg: "bg-zinc-400/10 border-zinc-400/30",   text: "text-zinc-400",  icon: Medal },
    3: { bg: "bg-orange-700/10 border-orange-700/30", text: "text-orange-500", icon: Medal },
};

export default function LeaderboardPage() {
    const { entries, isLoading } = useGetLeaderboard();

    const top3 = entries.slice(0, 3);
    const rest  = entries.slice(3);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Leaderboard</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Ranked by total portfolio value</p>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            )}

            {!isLoading && entries.length === 0 && (
                <div className="bg-card border border-border rounded-xl py-16 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">No traders yet</p>
                </div>
            )}

            {!isLoading && entries.length > 0 && (
                <>
                    {/* Podium — top 3 */}
                    {top3.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {top3.map((e) => {
                                const style = RANK_STYLES[e.rank];
                                const Icon = style?.icon ?? Medal;
                                const pos = e.pnl >= 0;
                                return (
                                    <div
                                        key={e.userId}
                                        className={cn(
                                            "bg-card border rounded-xl p-5 flex flex-col gap-3 transition-all",
                                            style?.bg ?? "border-border",
                                            e.isCurrentUser && "ring-2 ring-primary/40",
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border", style?.bg ?? "bg-muted border-border")}>
                                                <Icon className={cn("w-4.5 h-4.5", style?.text ?? "text-muted-foreground")} />
                                            </div>
                                            {e.isCurrentUser && (
                                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className={cn("text-xs font-bold uppercase tracking-widest", style?.text ?? "text-muted-foreground")}>
                                                #{e.rank}
                                            </p>
                                            <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{e.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-mono font-bold text-foreground">{INR(e.totalValue)}</p>
                                            <p className={cn("text-xs font-mono font-semibold flex items-center gap-0.5 mt-0.5", pos ? "text-up" : "text-down")}>
                                                {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {pos ? "+" : "-"}{INR(e.pnl)} ({pos ? "+" : ""}{e.pnlPct.toFixed(2)}%)
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full table */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-4 px-5 py-3 text-[11px] font-semibold text-muted-foreground border-b border-border uppercase tracking-wider bg-muted/30">
                            <span>#</span>
                            <span>Trader</span>
                            <span className="text-right">Portfolio Value</span>
                            <span className="text-right">Overall P&amp;L</span>
                        </div>

                        {entries.map((e) => {
                            const pos = e.pnl >= 0;
                            const style = RANK_STYLES[e.rank];
                            return (
                                <div
                                    key={e.userId}
                                    className={cn(
                                        "grid grid-cols-[40px_1fr_1fr_1fr] gap-4 px-5 py-3.5 items-center border-b border-border/30 last:border-0 transition-colors",
                                        e.isCurrentUser
                                            ? "bg-primary/5 border-l-2 border-l-primary"
                                            : "hover:bg-muted/20",
                                    )}
                                >
                                    <span className={cn("text-sm font-bold font-mono", style?.text ?? "text-muted-foreground")}>
                                        {e.rank}
                                    </span>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                            <span className="text-[11px] font-bold text-primary leading-none">
                                                {e.email[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-sm text-foreground font-medium truncate">{e.email}</span>
                                        {e.isCurrentUser && (
                                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">YOU</span>
                                        )}
                                    </div>
                                    <span className="text-right font-mono text-sm font-semibold text-foreground">
                                        {INR(e.totalValue)}
                                    </span>
                                    <div className="text-right">
                                        <p className={cn("font-mono text-sm font-semibold", pos ? "text-up" : "text-down")}>
                                            {pos ? "+" : "-"}{INR(e.pnl)}
                                        </p>
                                        <p className={cn("text-[10px] font-mono", pos ? "text-up" : "text-down")}>
                                            {pos ? "+" : ""}{e.pnlPct.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-center text-[11px] text-muted-foreground/50">
                        Refreshes every 60 seconds · Emails partially masked for privacy
                    </p>
                </>
            )}
        </div>
    );
}
