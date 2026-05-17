"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts(onToggleHelp: () => void) {
    const router = useRouter();
    const gPressedRef = useRef(false);
    const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleKey = useCallback(
        (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Don't fire while user is typing in an input or contenteditable
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) return;

            if (e.key === "?") {
                onToggleHelp();
                return;
            }

            // Handle the second key of a G-sequence
            if (gPressedRef.current) {
                gPressedRef.current = false;
                if (gTimerRef.current) clearTimeout(gTimerRef.current);
                switch (e.key.toLowerCase()) {
                    case "m": router.push("/"); break;
                    case "t": router.push("/trade"); break;
                    case "p": router.push("/portfolio"); break;
                    case "a": router.push("/activity"); break;
                    case "l": router.push("/leaderboard"); break;
                }
                return;
            }

            // Start a G-sequence
            if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey) {
                gPressedRef.current = true;
                gTimerRef.current = setTimeout(() => {
                    gPressedRef.current = false;
                }, 1000);
            }
        },
        [router, onToggleHelp],
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKey);
        return () => {
            window.removeEventListener("keydown", handleKey);
            if (gTimerRef.current) clearTimeout(gTimerRef.current);
        };
    }, [handleKey]);
}
