"use client";
import { useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsModal } from "./ShortcutsModal";

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
    const [showHelp, setShowHelp] = useState(false);
    useKeyboardShortcuts(() => setShowHelp((v) => !v));

    return (
        <>
            {children}
            {showHelp && <ShortcutsModal onClose={() => setShowHelp(false)} />}
        </>
    );
}
