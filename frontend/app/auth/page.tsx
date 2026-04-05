"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import axios, { AxiosError } from "axios";
import Error from "next/error";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setSubmitting(true);
    try {
      if (mode === "login") {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
          {
            email,
            password,
          },
        );

        const token = response.data.token;

        if (!token) {
          toast("Login failed", {
            description: "Invalid credentials. Please try again.",
          });
          setSubmitting(false);
          return;
        }

        // Set token in the cookie for 7 days with SameSite=Lax for security
        document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;

        toast("Welcome back!", {
          description: "Redirecting to your dashboard...",
        });

        // Delay the redirect slightly so the user can read the toast message
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      } else {
        if (password.length < 6) {
          toast("Invalid Password", {
            description: "Password must be at least 6 characters.",
          });
          setSubmitting(false);
          return;
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`,
          {
            email,
            password,
          },
        );

        if (response.status === 200 || response.status === 201) {
          toast("Account created!", {
            description: "You can now sign in with your new account.",
          });
          setMode("login");
          setPassword(""); // Clear the password field for the login attempt
        }
      }
    } catch (error) {
      // Improved error handling to show backend message if available
      toast("Error occurred", {
        description:
          error.response?.data?.message ||
          "Something went wrong. Please check your connection.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-foreground tracking-tight">
              NexTrade
            </span>
          </div>
          <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">
            Master the markets.
            <br />
            <span className="text-primary">Risk-free.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Practice trading Nifty 50 stocks with virtual money. Build
            strategies, track performance, and learn — without risking a single
            rupee.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { label: "Virtual Balance", value: "₹10,00,000" },
              { label: "Nifty 50 Stocks", value: "50+" },
              { label: "Real-time Data", value: "Live" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card/50 border border-border rounded-lg p-4"
              >
                <p className="text-xl font-mono font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">NexTrade</span>
          </div>

          <div className="bg-card border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "login"
                ? "Sign in to continue trading"
                : "Start your paper trading journey"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "register" ? "Min. 6 characters" : "••••••••"
                    }
                    required
                    minLength={6}
                    className="w-full bg-secondary border border-border rounded-lg pl-10 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
