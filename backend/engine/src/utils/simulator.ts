const previousMap = new Map<string, number>();

export function randomPriceGenerator(ticker: string, price: number): number {
    // 1. Define how "Crazy" the market is (0.005 = 0.5% potential move per tick)
    const VOLATILITY_COEFFICIENT = 0.005;

    // 2. Create a "Noise" factor
    let rawRandom = Math.random() - 0.5; // -0.5 to 0.5
    let sign = Math.sign(rawRandom);
    let skewedRandom = sign * Math.pow(Math.abs(rawRandom), 0.8);

    // 3. Get Previous Price
    const previousPrice = previousMap.get(ticker) || price;

    // 4. Calculate the Change
    const change = skewedRandom * VOLATILITY_COEFFICIENT;
    const newPrice = previousPrice * (1 + change);

    // 5. Apply "Gap" Logic (1% chance of a 2% jump)
    let finalPrice = newPrice;
    if (Math.random() < 0.01) {
        const gapDirection = Math.random() > 0.5 ? 1.02 : 0.98;
        finalPrice *= gapDirection;
    }

    const roundedPrice = Math.round(finalPrice / 0.05) * 0.05;
    previousMap.set(ticker, roundedPrice);
    return roundedPrice;
}
