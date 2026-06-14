export type BinanceKlineInterval = "1m" | "15m" | "1h" | "4h" | "1d" | "7d";

export type MarketCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
};

type RawKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type BinanceIntervalProfile = {
  interval: "1m" | "15m" | "1h" | "4h" | "1d" | "1w";
  limit: number;
  minimumBars: number;
  cacheSeconds: number;
  terminalLabel: string;
};

function n(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}

function intervalToBinance(range: BinanceKlineInterval): BinanceIntervalProfile {
  // PASS 57: the UI buttons behave like exchange candle intervals, not tiny
  // one-point time windows. Each range now requests enough historical bars to
  // build a dense Binance/MEXC-style terminal with OHLC, volume and profile.
  if (range === "7d") return { interval: "1w", limit: 104, minimumBars: 32, cacheSeconds: 300, terminalLabel: "7d weekly macro candles" };
  if (range === "1d") return { interval: "1d", limit: 180, minimumBars: 56, cacheSeconds: 180, terminalLabel: "1d daily macro candles" };
  if (range === "4h") return { interval: "4h", limit: 180, minimumBars: 64, cacheSeconds: 90, terminalLabel: "4h swing candles" };
  if (range === "1h") return { interval: "1h", limit: 180, minimumBars: 72, cacheSeconds: 60, terminalLabel: "1h structure candles" };
  if (range === "15m") return { interval: "15m", limit: 180, minimumBars: 80, cacheSeconds: 30, terminalLabel: "15m session candles" };
  return { interval: "1m", limit: 180, minimumBars: 90, cacheSeconds: 15, terminalLabel: "1m scalping candles" };
}

export async function fetchBinanceKlines(
  symbol: string,
  range: BinanceKlineInterval = "7d",
): Promise<{ pair: string; source: string; candles: MarketCandle[] }> {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) throw new Error("Missing symbol");
  const pair = clean.endsWith("USDT") ? clean : `${clean}USDT`;
  const { interval, limit, minimumBars, cacheSeconds, terminalLabel } = intervalToBinance(range);
  const params = new URLSearchParams({
    symbol: pair,
    interval,
    limit: String(limit),
  });
  const response = await fetch(`https://api.binance.com/api/v3/klines?${params.toString()}`, {
    headers: { accept: "application/json" },
    next: { revalidate: cacheSeconds },
  } as RequestInit & { next: { revalidate: number } });
  if (!response.ok) {
    throw new Error(`Binance kline request failed with status ${response.status}`);
  }
  const rows = (await response.json()) as RawKline[];
  const candles = rows
    .map((row) => ({
      timestamp: n(row[0]),
      open: n(row[1]),
      high: n(row[2]),
      low: n(row[3]),
      close: n(row[4]),
      volume: n(row[5]),
      quoteVolume: n(row[7]),
      trades: n(row[8]),
    }))
    .filter(
      (item) =>
        item.timestamp > 0 &&
        item.open > 0 &&
        item.high > 0 &&
        item.low > 0 &&
        item.close > 0,
    );
  if (candles.length < minimumBars) throw new Error(`Not enough Binance candle data (${candles.length}/${minimumBars})`);
  return { pair, source: `Binance spot klines · ${terminalLabel} · ${interval} · ${candles.length} bars`, candles };
}
