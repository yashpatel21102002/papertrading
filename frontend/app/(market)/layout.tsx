import { TickerTape } from "@/components/TickerTap";
import { TopNav } from "@/components/TopNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KeyboardShortcutsProvider>
      <div className="flex flex-col min-h-screen">
        <TickerTape />
        <TopNav />
        <main className="flex-1 px-4 py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </KeyboardShortcutsProvider>
  );
}
