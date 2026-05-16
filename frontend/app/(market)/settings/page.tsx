"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { Settings, LogOut, Download, RotateCcw, AlertTriangle, Eye, EyeOff, Loader2, Lock, Mail, FileJson } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-context";

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

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");

  useEffect(() => {
    setEmail(getEmailFromToken());
  }, []);

  const changePasswordMutation = useMutation({
    mutationFn: () => api.post("/api/auth/change-password", { newPassword }),
    onSuccess: () => {
      toast.success("Password changed", { description: "Your password has been updated" });
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => toast.error("Failed", { description: "Could not change password" }),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.post("/api/portfolio/reset"),
    onSuccess: () => {
      toast.success("Portfolio reset", { description: "Balance restored to ₹10,00,000" });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      setShowResetConfirm(false);
      setResetInput("");
    },
    onError: () => toast.error("Reset failed", { description: "Please try again" }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const [portfolio, trades, orders] = await Promise.all([
        api.get("/api/portfolio/summary").then(r => r.data),
        api.get("/api/portfolio/trades").then(r => r.data),
        api.get("/api/orders/get").then(r => r.data),
      ]);
      return { portfolio, trades, orders };
    },
    onSuccess: (data) => {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported", { description: "Portfolio data downloaded as JSON" });
    },
    onError: () => toast.error("Export failed", { description: "Could not export data" }),
  });

  const handleLogout = () => {
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    router.push("/auth");
  };

  const passwordsMatch = newPassword && newPassword === confirmPassword;
  const passwordValid = newPassword && newPassword.length >= 6;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your account and preferences</p>
        </div>
      </div>

      {/* Account section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <p className="text-sm font-semibold text-foreground uppercase tracking-widest mb-4">Account</p>

          {/* Email */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
              <span className="text-sm text-foreground flex-1">{email || "—"}</span>
              <span className="text-[10px] text-muted-foreground font-mono">read-only</span>
            </div>
          </div>

          {/* Change password */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Change Password
            </label>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors pr-9"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />

              {newPassword && !passwordValid && (
                <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
              )}

              {newPassword && !passwordsMatch && (
                <p className="text-xs text-down">Passwords do not match</p>
              )}
            </div>

            <button
              onClick={() => changePasswordMutation.mutate()}
              disabled={!passwordsMatch || !passwordValid || changePasswordMutation.isPending}
              className="w-full py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {changePasswordMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1.5" /> Updating…</>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preferences section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <p className="text-sm font-semibold text-foreground uppercase tracking-widest mb-4">Preferences</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground font-medium">Dark Mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use dark theme for the app</p>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
              theme === "dark" ? "bg-primary/30" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-foreground transition-transform",
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Data section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <p className="text-sm font-semibold text-foreground uppercase tracking-widest mb-4">Data</p>

        {/* Export */}
        <button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3 text-left">
            <FileJson className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Export Data</p>
              <p className="text-[10px] text-muted-foreground">Download portfolio, trades &amp; orders as JSON</p>
            </div>
          </div>
          <Download className={cn("w-4 h-4 text-muted-foreground", exportMutation.isPending && "animate-pulse")} />
        </button>

        {/* Reset */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[hsl(var(--down)/0.05)] hover:bg-[hsl(var(--down)/0.08)] border border-[hsl(var(--down)/0.2)] rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3 text-left">
            <RotateCcw className="w-4 h-4 text-down" />
            <div>
              <p className="text-sm font-medium text-down">Reset Portfolio</p>
              <p className="text-[10px] text-down/60">Restore ₹10,00,000 balance, clear all trades</p>
            </div>
          </div>
          <AlertTriangle className="w-4 h-4 text-down" />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[hsl(var(--down)/0.1)] hover:bg-[hsl(var(--down)/0.15)] border border-[hsl(var(--down)/0.25)] rounded-lg text-down font-semibold transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-[hsl(var(--down)/0.06)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--down)/0.15)] flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-down" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Reset Portfolio</p>
                  <p className="text-[11px] text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                All holdings, orders, and trade history will be permanently deleted.
                Your balance will be restored to <span className="text-foreground font-semibold">₹10,00,000</span>.
              </p>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Type <span className="text-foreground font-bold font-mono">RESET</span> to confirm
                </label>
                <input
                  type="text"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder="Type RESET here"
                  className="w-full mt-2 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="px-6 pb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowResetConfirm(false); setResetInput(""); }}
                className="py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/70 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetInput !== "RESET" || resetMutation.isPending}
                className="py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--down)/0.15)] text-down border border-[hsl(var(--down)/0.3)] hover:bg-[hsl(var(--down)/0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {resetMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
                ) : (
                  <><RotateCcw className="w-4 h-4" /> Reset</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
