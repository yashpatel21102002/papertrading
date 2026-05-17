export const SECTOR_MAP: Record<string, string> = {
    "RELIANCE.NS": "Energy", "TCS.NS": "IT", "HDFCBANK.NS": "Banking",
    "INFY.NS": "IT", "ICICIBANK.NS": "Banking", "HINDUNILVR.NS": "FMCG",
    "ITC.NS": "FMCG", "SBIN.NS": "Banking", "BHARTIARTL.NS": "Telecom",
    "KOTAKBANK.NS": "Banking", "LT.NS": "Industrials", "AXISBANK.NS": "Banking",
    "ASIANPAINT.NS": "Paints", "MARUTI.NS": "Auto", "SUNPHARMA.NS": "Pharma",
    "BAJFINANCE.NS": "Financial", "WIPRO.NS": "IT", "HCLTECH.NS": "IT",
    "ULTRACEMCO.NS": "Cement", "TITAN.NS": "Consumer", "POWERGRID.NS": "Power",
    "NTPC.NS": "Power", "ONGC.NS": "Energy", "BAJAJFINSV.NS": "Financial",
    "TATAMOTORS.NS": "Auto", "DRREDDY.NS": "Pharma", "TECHM.NS": "IT",
    "ADANIENT.NS": "Conglomerate", "NESTLEIND.NS": "FMCG", "GRASIM.NS": "Cement",
    "TATASTEEL.NS": "Metals", "JSWSTEEL.NS": "Metals", "HINDALCO.NS": "Metals",
    "COALINDIA.NS": "Mining", "BPCL.NS": "Energy", "INDUSINDBK.NS": "Banking",
    "CIPLA.NS": "Pharma", "DIVISLAB.NS": "Pharma", "BRITANNIA.NS": "FMCG",
    "BAJAJ-AUTO.NS": "Auto", "EICHERMOT.NS": "Auto", "HEROMOTOCO.NS": "Auto",
    "APOLLOHOSP.NS": "Healthcare", "SBILIFE.NS": "Insurance", "HDFCLIFE.NS": "Insurance",
    "TATACONSUM.NS": "FMCG", "UPL.NS": "Agri", "SHREECEM.NS": "Cement",
    "MM.NS": "Auto", "ADANIPORTS.NS": "Logistics",
};

// Distinct colour per sector so badges look varied
export const SECTOR_COLOR: Record<string, string> = {
    "IT":           "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Banking":      "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "FMCG":         "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Energy":       "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "Auto":         "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "Pharma":       "bg-green-500/10 text-green-400 border-green-500/20",
    "Financial":    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "Metals":       "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
    "Cement":       "bg-stone-400/10 text-stone-400 border-stone-400/20",
    "Power":        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "Telecom":      "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "Industrials":  "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "Consumer":     "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "Paints":       "bg-pink-500/10 text-pink-400 border-pink-500/20",
    "Conglomerate": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "Mining":       "bg-lime-500/10 text-lime-400 border-lime-500/20",
    "Healthcare":   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Insurance":    "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    "Agri":         "bg-green-600/10 text-green-500 border-green-600/20",
    "Logistics":    "bg-blue-600/10 text-blue-500 border-blue-600/20",
};

export function formatVolume(v: number): string {
    if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(2)}Cr`;
    if (v >= 100_000) return `${(v / 100_000).toFixed(2)}L`;
    return v.toLocaleString("en-IN");
}

export function formatMarketCap(v: number): string {
    if (v >= 1_000_000_000_000) return `₹${(v / 1_000_000_000_000).toFixed(2)}T`;
    if (v >= 10_000_000_000) return `₹${(v / 10_000_000_000).toFixed(2)}K Cr`;
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
    return `₹${v.toLocaleString("en-IN")}`;
}
