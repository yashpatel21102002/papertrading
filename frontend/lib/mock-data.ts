export interface Stock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    volume: string;
    sparkline: number[];
}

const generateSparkline = (base: number, volatility: number): number[] => {
    const points: number[] = [];
    let current = base;
    for (let i = 0; i < 24; i++) {
        current += (Math.random() - 0.5) * volatility;
        points.push(Math.round(current * 100) / 100);
    }
    return points;
};

export const nifty50Stocks: Stock[] = [
    { symbol: "RELIANCE", name: "Reliance Industries", price: 2467.35, change: 23.45, changePercent: 0.96, high24h: 2489.00, low24h: 2441.20, volume: "12.4M", sparkline: generateSparkline(2467, 15) },
    { symbol: "TCS", name: "Tata Consultancy", price: 3891.20, change: -18.30, changePercent: -0.47, high24h: 3920.00, low24h: 3875.50, volume: "5.2M", sparkline: generateSparkline(3891, 20) },
    { symbol: "HDFCBANK", name: "HDFC Bank", price: 1678.90, change: 12.75, changePercent: 0.77, high24h: 1695.00, low24h: 1662.30, volume: "8.9M", sparkline: generateSparkline(1678, 10) },
    { symbol: "INFY", name: "Infosys", price: 1523.45, change: -8.90, changePercent: -0.58, high24h: 1545.00, low24h: 1518.20, volume: "7.1M", sparkline: generateSparkline(1523, 12) },
    { symbol: "ICICIBANK", name: "ICICI Bank", price: 1089.60, change: 15.20, changePercent: 1.41, high24h: 1098.00, low24h: 1072.40, volume: "10.3M", sparkline: generateSparkline(1089, 8) },
    { symbol: "HINDUNILVR", name: "Hindustan Unilever", price: 2534.80, change: -5.60, changePercent: -0.22, high24h: 2558.00, low24h: 2525.10, volume: "3.8M", sparkline: generateSparkline(2534, 14) },
    { symbol: "SBIN", name: "State Bank of India", price: 628.45, change: 8.90, changePercent: 1.44, high24h: 635.00, low24h: 618.20, volume: "15.6M", sparkline: generateSparkline(628, 5) },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1456.30, change: 22.10, changePercent: 1.54, high24h: 1468.00, low24h: 1430.50, volume: "6.4M", sparkline: generateSparkline(1456, 11) },
    { symbol: "ITC", name: "ITC Limited", price: 438.75, change: -2.30, changePercent: -0.52, high24h: 445.00, low24h: 435.60, volume: "18.2M", sparkline: generateSparkline(438, 3) },
    { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", price: 1834.50, change: 9.80, changePercent: 0.54, high24h: 1852.00, low24h: 1820.30, volume: "4.5M", sparkline: generateSparkline(1834, 12) },
    { symbol: "LT", name: "Larsen & Toubro", price: 3456.20, change: 34.50, changePercent: 1.01, high24h: 3478.00, low24h: 3418.60, volume: "3.2M", sparkline: generateSparkline(3456, 22) },
    { symbol: "AXISBANK", name: "Axis Bank", price: 1145.80, change: -12.40, changePercent: -1.07, high24h: 1165.00, low24h: 1138.90, volume: "7.8M", sparkline: generateSparkline(1145, 9) },
    { symbol: "WIPRO", name: "Wipro", price: 467.30, change: 5.60, changePercent: 1.21, high24h: 472.00, low24h: 460.80, volume: "9.1M", sparkline: generateSparkline(467, 4) },
    { symbol: "TATAMOTORS", name: "Tata Motors", price: 945.60, change: 18.90, changePercent: 2.04, high24h: 952.00, low24h: 924.30, volume: "11.7M", sparkline: generateSparkline(945, 8) },
    { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1234.50, change: -7.80, changePercent: -0.63, high24h: 1250.00, low24h: 1228.40, volume: "5.6M", sparkline: generateSparkline(1234, 9) },
    { symbol: "MARUTI", name: "Maruti Suzuki", price: 10876.30, change: 87.60, changePercent: 0.81, high24h: 10945.00, low24h: 10780.50, volume: "1.2M", sparkline: generateSparkline(10876, 65) },
    { symbol: "TITAN", name: "Titan Company", price: 3245.80, change: -15.30, changePercent: -0.47, high24h: 3278.00, low24h: 3230.10, volume: "2.8M", sparkline: generateSparkline(3245, 18) },
    { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 6789.40, change: 45.20, changePercent: 0.67, high24h: 6834.00, low24h: 6740.80, volume: "2.1M", sparkline: generateSparkline(6789, 40) },
    { symbol: "ASIANPAINT", name: "Asian Paints", price: 2876.90, change: -22.40, changePercent: -0.77, high24h: 2910.00, low24h: 2865.30, volume: "3.4M", sparkline: generateSparkline(2876, 16) },
    { symbol: "HCLTECH", name: "HCL Technologies", price: 1567.80, change: 11.30, changePercent: 0.73, high24h: 1578.00, low24h: 1552.40, volume: "4.9M", sparkline: generateSparkline(1567, 10) },
];

export const portfolioHoldings = [
    { symbol: "RELIANCE", name: "Reliance Industries", qty: 50, avgPrice: 2420.00, currentPrice: 2467.35, allocation: 22 },
    { symbol: "TCS", name: "Tata Consultancy", qty: 30, avgPrice: 3950.00, currentPrice: 3891.20, allocation: 18 },
    { symbol: "HDFCBANK", name: "HDFC Bank", qty: 80, avgPrice: 1650.00, currentPrice: 1678.90, allocation: 15 },
    { symbol: "INFY", name: "Infosys", qty: 60, avgPrice: 1480.00, currentPrice: 1523.45, allocation: 12 },
    { symbol: "ICICIBANK", name: "ICICI Bank", qty: 100, avgPrice: 1050.00, currentPrice: 1089.60, allocation: 10 },
    { symbol: "SBIN", name: "State Bank of India", qty: 200, avgPrice: 610.00, currentPrice: 628.45, allocation: 8 },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", qty: 40, avgPrice: 1400.00, currentPrice: 1456.30, allocation: 8 },
    { symbol: "ITC", name: "ITC Limited", qty: 150, avgPrice: 430.00, currentPrice: 438.75, allocation: 7 },
];

export const equityHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    equity: 500000 + Math.random() * 50000 + i * 1500,
}));

export const openOrders = [
    { id: "ORD001", symbol: "RELIANCE", side: "BUY" as const, type: "Limit", price: 2450.00, qty: 10, status: "Open", time: "10:32:15" },
    { id: "ORD002", symbol: "INFY", side: "SELL" as const, type: "Stop-Loss", price: 1500.00, qty: 25, status: "Open", time: "11:05:42" },
];

export const orderHistory = [
    { id: "ORD003", symbol: "TCS", side: "BUY" as const, type: "Market", price: 3950.00, qty: 30, status: "Filled", time: "09:15:30" },
    { id: "ORD004", symbol: "HDFCBANK", side: "BUY" as const, type: "Limit", price: 1650.00, qty: 80, status: "Filled", time: "09:22:18" },
    { id: "ORD005", symbol: "SBIN", side: "BUY" as const, type: "Market", price: 610.00, qty: 200, status: "Filled", time: "10:45:05" },
    { id: "ORD006", symbol: "WIPRO", side: "SELL" as const, type: "Limit", price: 480.00, qty: 50, status: "Cancelled", time: "14:30:22" },
];
