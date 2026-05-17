"use client";
import { X, Keyboard } from "lucide-react";
import { useEffect } from "react";

interface ShortcutsModalProps {
    onClose: () => void;
}

const NAV_SHORTCUTS = [
    { keys: ["G", "M"], label: "Go to Markets" },
    { keys: ["G", "T"], label: "Go to Trade" },
    { keys: ["G", "P"], label: "Go to Portfolio" },
    { keys: ["G", "A"], label: "Go to Activity" },
    { keys: ["G", "L"], label: "Go to Leaderboard" },
];

const GENERAL_SHORTCUTS = [
    { keys: ["?"], label: "Show / hide this help" },
    { keys: ["Esc"], label: "Close dialogs / modals" },
];

function Kbd({ children }: { children: string }) {
    return (
        <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-muted border border-border rounded text-[10px] font-mono font-semibold text-foreground">
            {children}
        </kbd>
    );
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Keyboard className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Keyboard Shortcuts</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-5">
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                            Navigation
                        </p>
                        <div className="space-y-2">
                            {NAV_SHORTCUTS.map((s) => (
                                <div key={s.label} className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">{s.label}</span>
                                    <div className="flex items-center gap-1">
                                        {s.keys.map((k, i) => (
                                            <span key={k} className="flex items-center gap-1">
                                                {i > 0 && <span className="text-muted-foreground/40 text-xs">then</span>}
                                                <Kbd>{k}</Kbd>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                            General
                        </p>
                        <div className="space-y-2">
                            {GENERAL_SHORTCUTS.map((s) => (
                                <div key={s.label} className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">{s.label}</span>
                                    <div className="flex items-center gap-1">
                                        {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-5 pb-4">
                    <p className="text-[10px] text-muted-foreground/50 text-center">
                        Shortcuts are disabled while typing in a text field
                    </p>
                </div>
            </div>
        </div>
    );
}
