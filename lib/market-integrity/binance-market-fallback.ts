import { readJsonResponseBounded } from "@/lib/network/fetch-with-deadline";
import { brokeredEgressFetch } from "@/lib/network/brokered-egress";
import type { MarketIntegrityRow } from "./coingecko";
import {
  attachPass4644ProviderReceipts,
  createPass4644ProviderEvidenceReceipt,
} from "./provider-evidence-receipt";
import { analyzeTokenRisk } from "./risk-engine";

const BINANCE_SPOT_BASES = [
  "https://api.binance.com",
  "https://api-gcp.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
] as const;

const BINANCE_ATTEMPT_TIMEOUT_MS = 6_500;
const BINANCE_TOTAL_TIMEOUT_MS = 8_000;
const BINANCE_HEDGE_DELAY_MS = 250;

type BinanceFallbackAsset = {
  id: string;
  symbol: string;
  name: string;
  binanceBase?: string;
};

type ValidatedBinanceTicker = {
  asset: BinanceFallbackAsset;
  pairSymbol: string;
  price: number;
  open24h?: number;
  high24h?: number;
  low24h?: number;
  priceChange24h?: number;
  volume24h?: number;
  closeTime?: number;
  observedAt?: string;
  tradeCount?: number;
};

const BINANCE_FALLBACK_ASSETS: BinanceFallbackAsset[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "usd-coin", symbol: "USDC", name: "USDC" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "stellar", symbol: "XLM", name: "Stellar" },
  { id: "sui", symbol: "SUI", name: "Sui" },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash" },
  { id: "hedera-hashgraph", symbol: "HBAR", name: "Hedera" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "toncoin", symbol: "TON", name: "Toncoin" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap" },
  { id: "pepe", symbol: "PEPE", name: "Pepe" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol" },
  { id: "aptos", symbol: "APT", name: "Aptos" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer" },
  { id: "aave", symbol: "AAVE", name: "Aave" },
  { id: "ethereum-classic", symbol: "ETC", name: "Ethereum Classic" },
  { id: "crypto-com-chain", symbol: "CRO", name: "Cronos" },
  { id: "bittensor", symbol: "TAO", name: "Bittensor" },
  { id: "filecoin", symbol: "FIL", name: "Filecoin" },
  { id: "render-token", symbol: "RENDER", name: "Render" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum" },
  { id: "algorand", symbol: "ALGO", name: "Algorand" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos Hub" },
  { id: "celestia", symbol: "TIA", name: "Celestia" },
  { id: "injective-protocol", symbol: "INJ", name: "Injective" },
  { id: "optimism", symbol: "OP", name: "Optimism" },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon" },
  { id: "maker", symbol: "MKR", name: "Maker" },
  { id: "first-digital-usd", symbol: "FDUSD", name: "First Digital USD" },
  { id: "immutable-x", symbol: "IMX", name: "Immutable" },
  { id: "bonk", symbol: "BONK", name: "Bonk" },
  { id: "stacks", symbol: "STX", name: "Stacks" },
  { id: "the-graph", symbol: "GRT", name: "The Graph" },
  { id: "lido-dao", symbol: "LDO", name: "Lido DAO" },
  { id: "worldcoin-wld", symbol: "WLD", name: "Worldcoin" },
  { id: "sei-network", symbol: "SEI", name: "Sei" },
  { id: "jupiter-exchange-solana", symbol: "JUP", name: "Jupiter" },
  { id: "ondo-finance", symbol: "ONDO", name: "Ondo" },
  { id: "gala", symbol: "GALA", name: "Gala" },
  { id: "floki", symbol: "FLOKI", name: "FLOKI" },
  { id: "the-sandbox", symbol: "SAND", name: "The Sandbox" },
  { id: "eos", symbol: "EOS", name: "EOS" },
  { id: "quant-network", symbol: "QNT", name: "Quant" },
  { id: "tezos", symbol: "XTZ", name: "Tezos" },
  { id: "flow", symbol: "FLOW", name: "Flow" },
  { id: "curve-dao-token", symbol: "CRV", name: "Curve DAO" },
  { id: "arweave", symbol: "AR", name: "Arweave" },
  { id: "pyth-network", symbol: "PYTH", name: "Pyth Network" },
  { id: "ethereum-name-service", symbol: "ENS", name: "Ethereum Name Service" },
  { id: "neo", symbol: "NEO", name: "NEO" },
  { id: "iota", symbol: "IOTA", name: "IOTA" },
  { id: "axie-infinity", symbol: "AXS", name: "Axie Infinity" },
  { id: "decentraland", symbol: "MANA", name: "Decentraland" },
  { id: "thorchain", symbol: "RUNE", name: "THORChain" },
  { id: "pendle", symbol: "PENDLE", name: "Pendle" },
  { id: "chiliz", symbol: "CHZ", name: "Chiliz" },
  { id: "pancakeswap-token", symbol: "CAKE", name: "PancakeSwap" },
  { id: "compound-governance-token", symbol: "COMP", name: "Compound" },
  { id: "synthetix-network-token", symbol: "SNX", name: "Synthetix" },
  { id: "zcash", symbol: "ZEC", name: "Zcash" },
  { id: "ecash", symbol: "XEC", name: "eCash" },
  { id: "kava", symbol: "KAVA", name: "Kava" },
  { id: "1inch", symbol: "1INCH", name: "1inch" },
  { id: "nexo", symbol: "NEXO", name: "NEXO" },
  { id: "conflux-token", symbol: "CFX", name: "Conflux" },
  { id: "rocket-pool", symbol: "RPL", name: "Rocket Pool" },
  { id: "blur", symbol: "BLUR", name: "Blur" },
  { id: "zilliqa", symbol: "ZIL", name: "Zilliqa" },
  { id: "ankr", symbol: "ANKR", name: "Ankr" },
  { id: "loopring", symbol: "LRC", name: "Loopring" },
];

const DECIMAL_NUMBER_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function finiteDecimal(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > 64 || !DECIMAL_NUMBER_PATTERN.test(normalized)) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function safeEpochIso(value: unknown, referenceMs = Date.now()): string | undefined {
  const epoch = finiteDecimal(value);
  if (
    epoch === undefined ||
    epoch <= 0 ||
    !Number.isInteger(epoch) ||
    epoch > referenceMs + 120_000
  ) return undefined;
  try {
    const date = new Date(epoch);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  } catch {
    return undefined;
  }
}

function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
  predicate: (value: number) => boolean,
): { valid: true; value?: number } | { valid: false } {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return { valid: true };
  const value = finiteDecimal(record[key]);
  return value !== undefined && predicate(value)
    ? { valid: true, value }
    : { valid: false };
}

function validateAndMapTicker(
  candidate: unknown,
  assetByPair: ReadonlyMap<string, BinanceFallbackAsset>,
  referenceMs: number,
): ValidatedBinanceTicker | null {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const ticker = candidate as Record<string, unknown>;
  const pairSymbol = typeof ticker.symbol === "string"
    ? ticker.symbol.trim().toUpperCase()
    : "";
  const asset = assetByPair.get(pairSymbol);
  if (!asset) return null;

  const price = finiteDecimal(ticker.lastPrice);
  if (price === undefined || price <= 0 || price > Number.MAX_SAFE_INTEGER) return null;

  const positiveMarketValue = (value: number) => value > 0 && value <= Number.MAX_SAFE_INTEGER;
  const open = readOptionalNumber(ticker, "openPrice", positiveMarketValue);
  const high = readOptionalNumber(ticker, "highPrice", positiveMarketValue);
  const low = readOptionalNumber(ticker, "lowPrice", positiveMarketValue);
  const change = readOptionalNumber(
    ticker,
    "priceChangePercent",
    (value) => value >= -100 && value <= 1_000_000,
  );
  const volume = readOptionalNumber(
    ticker,
    "quoteVolume",
    (value) => value >= 0 && value <= Number.MAX_SAFE_INTEGER,
  );
  const closeTime = readOptionalNumber(
    ticker,
    "closeTime",
    (value) => Number.isInteger(value) && value > 0 && value <= referenceMs + 120_000,
  );
  const tradeCount = readOptionalNumber(
    ticker,
    "count",
    (value) => Number.isSafeInteger(value) && value >= 0,
  );
  if (
    !open.valid || !high.valid || !low.valid || !change.valid ||
    !volume.valid || !closeTime.valid || !tradeCount.valid
  ) return null;

  if (high.value !== undefined && high.value < price) return null;
  if (low.value !== undefined && low.value > price) return null;
  if (high.value !== undefined && low.value !== undefined && high.value < low.value) return null;
  if (open.value !== undefined && high.value !== undefined && open.value > high.value) return null;
  if (open.value !== undefined && low.value !== undefined && open.value < low.value) return null;

  const observedAt = closeTime.value === undefined
    ? undefined
    : safeEpochIso(closeTime.value, referenceMs);
  if (closeTime.value !== undefined && !observedAt) return null;

  return {
    asset,
    pairSymbol,
    price,
    open24h: open.value,
    high24h: high.value,
    low24h: low.value,
    priceChange24h: change.value,
    volume24h: volume.value,
    closeTime: closeTime.value,
    observedAt,
    tradeCount: tradeCount.value,
  };
}

function validatedTickerPayload(payload: unknown, referenceMs: number): ValidatedBinanceTicker[] | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const assetByPair = new Map(BINANCE_FALLBACK_ASSETS.map((asset) => [
    `${asset.binanceBase ?? asset.symbol}USDT`.toUpperCase(),
    asset,
  ] as const));
  const seenPairs = new Set<string>();
  const tickers: ValidatedBinanceTicker[] = [];
  for (const candidate of payload) {
    const mapped = validateAndMapTicker(candidate, assetByPair, referenceMs);
    if (!mapped || seenPairs.has(mapped.pairSymbol)) continue;
    seenPairs.add(mapped.pairSymbol);
    tickers.push(mapped);
  }
  return tickers.length > 0 ? tickers : null;
}

function abortableDelay(delayMs: number, signal: AbortSignal) {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

async function fetchTickerPayload() {
  const errors = new Map<number, string>();
  const winnerController = new AbortController();
  const totalTimeoutSignal = AbortSignal.timeout(BINANCE_TOTAL_TIMEOUT_MS);
  const attempts = BINANCE_SPOT_BASES.map(async (base, index) => {
    try {
      await abortableDelay(index * BINANCE_HEDGE_DELAY_MS, winnerController.signal);
      const startedAt = Date.now();
      const response = await brokeredEgressFetch(`${base}/api/v3/ticker/24hr`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.any([
          winnerController.signal,
          totalTimeoutSignal,
          AbortSignal.timeout(BINANCE_ATTEMPT_TIMEOUT_MS),
        ]),
        cache: "no-store",
      }, {
        profile: "binance_spot",
        operation: "binance_spot_24h",
        timeoutMs: BINANCE_ATTEMPT_TIMEOUT_MS,
      });
      if (!response.ok) {
        errors.set(index, `${new URL(base).host}:${response.status}`);
        throw new Error("binance_non_success_status");
      }
      const payload = await readJsonResponseBounded<unknown>(response, 8_388_608);
      const receivedAtMs = Date.now();
      const validatedPayload = validatedTickerPayload(payload, receivedAtMs);
      if (!validatedPayload) {
        errors.set(index, `${new URL(base).host}:no-valid-mapped-tickers`);
        throw new Error("binance_invalid_payload");
      }
      return {
        payload: validatedPayload,
        base,
        receivedAt: new Date(receivedAtMs).toISOString(),
        latencyMs: Math.max(0, receivedAtMs - startedAt),
        httpStatus: response.status,
      };
    } catch (error) {
      if (!errors.has(index) && !winnerController.signal.aborted) {
        errors.set(index,
          `${new URL(base).host}:${error instanceof Error ? error.name : "network"}`,
        );
      }
      throw error;
    }
  });

  try {
    const winner = await Promise.any(attempts);
    winnerController.abort(new DOMException("Hedged request completed", "AbortError"));
    return winner;
  } catch {
    winnerController.abort(new DOMException("All hedged requests failed", "AbortError"));
    const orderedErrors = BINANCE_SPOT_BASES.map((base, index) =>
      errors.get(index) ?? `${new URL(base).host}:cancelled`,
    );
    throw new Error(`Binance fallback unavailable (${orderedErrors.join(", ")})`);
  }
}

function tickerToRow(
  ticker: ValidatedBinanceTicker,
  receiptContext: {
    receivedAt: string;
    latencyMs: number;
    httpStatus: number;
    providerHost: string;
  },
): MarketIntegrityRow | null {
  const { asset, price, high24h, low24h, priceChange24h, volume24h, observedAt } = ticker;
  const sparkline7d: number[] = [];
  const result = analyzeTokenRisk(
    {
      marketId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      currentPrice: price,
      volume24h,
      priceChange24h,
      assetClass: "crypto",
      dataSources: ["Binance Spot 24hr ticker"],
    },
    "partial",
  );

  attachPass4644ProviderReceipts(result, [createPass4644ProviderEvidenceReceipt({
    providerId: `binance_spot_24h:${receiptContext.providerHost}`,
    providerFamily: "binance_spot",
    surface: "crypto",
    verification: "normalized_response",
    state: "partial",
    requestedIdentity: asset.symbol,
    resolvedSymbol: asset.symbol,
    resolvedMarketId: asset.id,
    identityMatched: true,
    capabilities: ["identity", "price", "range_24h", "volume_24h"],
    timestampProvenance: "provider",
    observedAt,
    receivedAt: receiptContext.receivedAt,
    ttlMs: 5 * 60_000,
    httpStatus: receiptContext.httpStatus,
    latencyMs: receiptContext.latencyMs,
    normalizedPayload: {
      symbol: ticker.pairSymbol,
      lastPrice: ticker.price,
      openPrice: ticker.open24h,
      highPrice: ticker.high24h,
      lowPrice: ticker.low24h,
      priceChangePercent: ticker.priceChange24h,
      quoteVolume: ticker.volume24h,
      closeTime: ticker.closeTime,
      count: ticker.tradeCount,
    },
  })]);

  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    price,
    priceChange24h,
    volume24h,
    high24h,
    low24h,
    observedAt,
    sparkline7d,
    result,
  };
}

export async function fetchBinanceMarketFallback(input: {
  page?: number;
  perPage?: number;
} = {}) {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const perPage = Math.min(250, Math.max(10, Math.trunc(input.perPage ?? 100)));
  const { payload, base, receivedAt, latencyMs, httpStatus } = await fetchTickerPayload();
  const providerHost = new URL(base).host;
  const tickerBySymbol = new Map(
    payload.map((ticker) => [ticker.pairSymbol, ticker] as const),
  );

  const allRows = BINANCE_FALLBACK_ASSETS.map((asset) => {
    const pair = `${asset.binanceBase ?? asset.symbol}USDT`.toUpperCase();
    const ticker = tickerBySymbol.get(pair);
    return ticker ? tickerToRow(ticker, {
      receivedAt,
      latencyMs,
      httpStatus,
      providerHost,
    }) : null;
  }).filter((row): row is MarketIntegrityRow => Boolean(row));

  const start = (page - 1) * perPage;
  const rows = allRows.slice(start, start + perPage);
  if (!rows.length) throw new Error("Binance returned no mapped USDT market rows");

  return {
    rows,
    source: `Binance Spot 24hr ticker (${providerHost})`,
    generatedAt: receivedAt,
    coverage: {
      mapped: rows.length,
      available: allRows.length,
      catalog: BINANCE_FALLBACK_ASSETS.length,
      ordering: "static_identity_catalog_not_market_rank",
      rankAvailable: false,
      missingFields: ["marketCap", "1h", "7d", "30d", "historicalSparkline"],
    },
  };
}
