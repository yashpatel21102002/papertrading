import { TickerTape } from "@/components/TickerTap";
import { TopNav } from "@/components/TopNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <TickerTape />
      <TopNav />
      <main className="flex-1 px-4 py-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
