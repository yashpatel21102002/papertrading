/**
 * Returns a user-scoped localStorage key so different accounts on the same
 * browser never share watchlist / price-alert / activity data.
 * Reads the user-id claim from the JWT cookie — no async needed on the client.
 */
export function getUserKey(baseKey: string): string {
    if (typeof document === "undefined") return baseKey;
    const cookie = document.cookie.split("; ").find((r) => r.startsWith("auth_token="));
    if (!cookie) return baseKey;
    try {
        const payload = JSON.parse(atob(cookie.split("=")[1].split(".")[1]));
        const uid: string = payload.id || payload.sub || payload.email || "";
        return uid ? `${baseKey}__${uid}` : baseKey;
    } catch {
        return baseKey;
    }
}
