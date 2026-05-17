"use client";
import { BarChart3, Bell, Briefcase, Menu, TrendingUp, X, Activity, LogOut, Keyboard, Trophy, Settings, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import useGetPortfolio from "@/hooks/use-getPortfolio";
import { useActivity } from "@/context/activity-context";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Markets", path: "/", icon: BarChart3 },
  { label: "Trade", path: "/trade", icon: TrendingUp },
  { label: "Portfolio", path: "/portfolio", icon: Briefcase },
  { label: "Watchlist", path: "/watchlist", icon: Star },
  { label: "Activity", path: "/activity", icon: Activity },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
];

function getEmailFromToken(): string {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie.split("; ").find((r) => r.startsWith("auth_token="));
  if (!cookie) return "";
  try {
    const payload = JSON.parse(atob(cookie.split("=")[1].split(".")[1]));
    return payload.email || payload.sub || "";
  } catch {
    return "";
  }
}

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [email, setEmail] = useState("");
  const { portfolio } = useGetPortfolio();
  const { unreadCount } = useActivity();
  const pathname = usePathname();
  const router = useRouter();

  // Client-only: decode JWT cookie after mount
  useEffect(() => {
    setEmail(getEmailFromToken());
  }, []);

  function handleLogout() {
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    router.push("/auth");
  }

  const balance = portfolio?.balance ?? 0;
  const formattedBalance = typeof balance === "number"
    ? `₹${balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : "₹—";

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground hidden sm:inline" style={{ fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.03em" }}>
            NexTrade
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: balance + bell + hamburger */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono bg-muted rounded-md px-3 py-1.5">
            <span className="text-muted-foreground">Balance</span>
            <span className="text-primary font-semibold">{formattedBalance}</span>
          </div>

          {/* Shortcuts hint */}
          <button
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "?", bubbles: true });
              window.dispatchEvent(e);
            }}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1">?</kbd>
          </button>

          {/* Notification bell */}
          <button
            onClick={() => router.push("/activity")}
            className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Activity log"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="User menu"
            >
              {email ? <Avatar email={email} size="sm" /> : <div className="w-7 h-7 rounded-full bg-muted" />}
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-card border border-border rounded-lg shadow-xl py-1 overflow-hidden">
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </Link>
                  <div className="border-t border-border" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-down hover:bg-muted transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-2 pb-3 pt-1">
          <div className="sm:hidden px-3 py-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono">Balance: </span>
            <span className="text-xs text-primary font-mono font-semibold">{formattedBalance}</span>
          </div>
          {navItems.map((item) => {
            const active = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.path === "/activity" && unreadCount > 0 && (
                  <span className="ml-auto text-xs font-bold text-destructive">{unreadCount}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
