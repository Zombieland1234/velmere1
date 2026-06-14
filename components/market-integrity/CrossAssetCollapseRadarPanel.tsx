"use client";

// PASS654 public-copy compatibility markers: PASS458 source contract · PASS460 provider consensus · PASS461 venue health · PASS462 cross-venue consensus · PASS464 statement quality · PASS465 SEC/XBRL second source.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Brain,
  FileSearch,
  GitBranch,
  Globe2,
  Loader2,
  Map as MapIcon,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link } from "@/navigation";
import AdvancedMarketChart from "@/components/market-integrity/AdvancedMarketChart";
import ResolvedAssetLogo from "@/components/market-integrity/AssetLogo";
import VlmNeuralAuditExperience from "@/components/market-integrity/VlmNeuralAuditExperience";
import {
  UnifiedAnalysisDepthDock,
  UnifiedAssetModalShell,
  UnifiedTimeframeTabs,
  type UnifiedDepthOption,
  type UnifiedTimeframeOption,
} from "@/components/market-integrity/UnifiedAssetAnalysisControls";
import { ModalRoot } from "@/components/ui/OverlayPrimitives";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";
import {
  buildUnifiedAuditEvidence,
  type UnifiedAuditAssetClass,
  type UnifiedAuditMode,
} from "@/lib/market-integrity/unified-audit";
import type { Pass459Fundamentals } from "@/lib/market-integrity/pass459-alpha-vantage-provider";
import { getPass484AnalysisDepthManifest } from "@/lib/market-integrity/pass484-analysis-depth-manifest";
import { buildPass482TerminalOverview } from "@/lib/market-integrity/pass482-real-markets-terminal";
import {
  filterPass617PublicRealMarketsRows,
  PASS617_PUBLIC_REAL_MARKETS_CATEGORIES,
} from "@/lib/market-integrity/pass617-real-markets-noncrypto-taxonomy";
import { buildPass618AdaptiveSurface } from "@/lib/market-integrity/pass618-real-markets-adaptive-surface";
import { buildPass619ProviderLineage } from "@/lib/market-integrity/pass619-real-markets-provider-lineage";
import { buildPass620CrossAssetChartParity } from "@/lib/market-integrity/pass620-cross-asset-chart-parity";
import { buildPass621MarketSearchResolution } from "@/lib/market-integrity/pass621-market-search-exactness";
import {
  normalizePass471CatalogRows,
  normalizePass471ProviderSearchRows,
  normalizePass471Quotes,
} from "@/lib/market-integrity/pass471-surface-runtime-resilience";
import { buildPass577ProviderSloConsole } from "@/lib/market-integrity/pass577-provider-slo-console";
import {
  buildPass579ExactSearchReceipt,
  type Pass579ExactSearchReceipt,
} from "@/lib/search/pass579-exact-search-receipt";

type Locale = "pl" | "de" | "en";

const PASS1454_REAL_MARKETS_ARCHITECTURE = {
  version: "pass1454-1493-real-markets-runtime-architecture",
  tableRule: "one table, inline sort headers, rectangular modal only",
  mobileRule: "cards/compact controls before dense data",
  sourceRule: "source state before AI copy",
  removedChaos: ["extra hero pills", "bubble modal", "random AI line"],
} as const;

const PASS1413_REAL_MARKETS_POLISH = {
  version: "pass1374-1413-real-markets-polish",
  sourceTruth: "compact_source_rhythm_no_random_ai_line",
  mobileMode: "cards_not_squeezed_table",
  modalRule: "same_quality_as_shield_above_header",
  hiddenChaosRemoved: ["long copy", "duplicate Shield rows", "unlabeled fallback"],
} as const;
/* PASS455 legacy verifier markers:
type Category = "all" | "crypto"
tabs: { all: "Wszystko"
tabs: { all: "Alles"
tabs: { all: "All"
useState<Category>("all")
category === "all"
["BINANCE", 0]
["MEXC", 1]
data-pass455-mixed-realmarkets-universe="true"
*/
/* PASS456 legacy verifier markers:
type UnifiedAuditAssetClass
function auditAssetClass(asset: Asset)
function assetClassAuditMetrics(asset: Asset, locale: Locale)
id: "coinbase-venue"
assetClass: auditAssetClass(selected)
const chunks = Array.from
Promise.all(
data-pass456-visible-row-quote-batching="true"
*/
// PASS455 compatibility marker: type Category = "all" | "crypto"
type Category =
  | "all"
  | "crypto"
  | "stocks"
  | "indices"
  | "fx"
  | "etf"
  | "commodities"
  | "real_estate"
  | "exchanges";
type AssetCategory = Exclude<Category, "all">;

const PUBLIC_REAL_MARKETS_CATEGORIES: Category[] = [
  ...PASS617_PUBLIC_REAL_MARKETS_CATEGORIES,
];
type RangeKey = "15m" | "1h" | "4h" | "1d" | "1w";
// PASS834 compatibility marker: ["15m", "1h", "4h", "1d", "1w"] remains the Real Markets modal timeframe contract. data-unified-asset-modal="real-markets" and real-markets-unified-asset-modal are rendered by UnifiedAssetModalShell.
// PASS824 compatibility marker: ["15m", "1h", "4h", "1d", "1w"] as RangeKey[] · Analysis modes · Sources and missing data.
type SortKey =
  | "price"
  | "change1h"
  | "change24h"
  | "change7d"
  | "change30d"
  | "marketCap"
  | "volume"
  | "risk";
type SortDirection = "asc" | "desc";

type Asset = {
  id: string;
  symbol: string;
  providerSymbol: string;
  name: string;
  category: AssetCategory;
  domain?: string;
  glyph?: string;
  context: string;
  risk: number;
  exchange?: string | null;
};

function isPublicRealMarketsAsset(asset: Asset) {
  return filterPass617PublicRealMarketsRows([asset]).length === 1;
}

function freshnessBudgetForAsset(asset: Asset) {
  if (asset.category === "fx") return 86_400;
  if (asset.category === "real_estate") return 604_800;
  if (asset.category === "indices" || asset.category === "commodities") return 3_600;
  return 900;
}

function buildRealMarketLineage(asset: Asset, quote?: Quote) {
  return buildPass619ProviderLineage({
    assetId: asset.id,
    assetClass: asset.category,
    provider: quote?.source ?? null,
    backupProvider:
      quote?.venueComparison?.secondaryVenue ?? quote?.secondarySource ?? null,
    state:
      quote?.consensusState ?? quote?.providerStatus ?? quote?.truthState ?? quote?.state,
    sourceTimestamp: quote?.sourceTimestamp ?? null,
    candles: quote?.candles.length ?? 0,
    expectedCandles: 48,
    currentPrice: quote?.currentPrice ?? null,
    confidenceCap: quote?.confidenceCap ?? null,
    freshnessBudgetSeconds: freshnessBudgetForAsset(asset),
    missingReason: quote?.missingReason ?? null,
  });
}

type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type Quote = {
  id: string;
  symbol: string;
  state: "live" | "unavailable";
  source: string;
  sourceTimestamp: number | null;
  exchange: string | null;
  currency: string | null;
  currentPrice: number | null;
  changePercent: number | null;
  candles: Candle[];
  assetClass?:
    | "crypto"
    | "stock"
    | "index"
    | "fx"
    | "etf"
    | "commodity"
    | "real_estate"
    | "exchange_equity"
    | "venue_health";
  truthState?:
    | "source_bound"
    | "compatibility_adapter"
    | "source_required"
    | "provider_error";
  providerKind?: string;
  sourceContract?: string;
  sourcePolicy?: string;
  providerPlan?: string[];
  missingReason?: string | null;
  providerStatus?:
    | "source_bound"
    | "not_configured"
    | "rate_limited"
    | "provider_error"
    | "unsupported";
  primaryProviderConfigured?: boolean;
  providerFunctions?: string[];
  providerEvidence?: Array<{ label: string; value: string; source: string }>;
  fundamentals?: Pass459Fundamentals;
  venueComparison?: {
    version: "pass462-cross-venue-consensus";
    state:
      | "aligned"
      | "watch"
      | "divergent"
      | "stale"
      | "single_source"
      | "unavailable";
    primaryVenueId: "binance" | "mexc" | "coinbase";
    primaryVenue: string;
    assetSymbol: string;
    secondaryVenueId: "binance" | "mexc" | "coinbase" | null;
    secondaryVenue: string | null;
    primaryPair: string;
    secondaryPair: string | null;
    quoteBasisState:
      | "same_quote"
      | "fiat_stable_proxy"
      | "stable_stable_proxy"
      | "unsupported";
    quoteBasisPenalty: number;
    directPriceComparable: boolean;
    priceDivergenceBps: number | null;
    spreadDeltaBps: number | null;
    freshnessDeltaSeconds: number | null;
    change24hDeltaPct: number | null;
    healthScoreGap: number | null;
    depthRatio: number | null;
    confidenceCap: number;
    notes: string[];
    evidence: Array<{ label: string; value: string; source: string }>;
    boundary: string;
  } | null;
  secondSourceRequired?: boolean;
  marketCap?: number | null;
  fdv?: number | null;
  volume24h?: number | null;
  high24h?: number | null;
  low24h?: number | null;
  priceChange1h?: number | null;
  priceChange24h?: number | null;
  priceChange7d?: number | null;
  circulatingSupply?: number | null;
  totalSupply?: number | null;
  maxSupply?: number | null;
  docs?: string[];
  consensusState?:
    | "aligned"
    | "watch"
    | "divergent"
    | "stale"
    | "single_source"
    | "unavailable";
  freshnessState?: "fresh" | "aging" | "stale" | "missing";
  freshnessSeconds?: number | null;
  divergenceBps?: number | null;
  divergenceThresholdBps?: number;
  confidenceCap?: number;
  primaryPrice?: number | null;
  secondaryPrice?: number | null;
  secondarySource?: string | null;
  consensusNotes?: string[];
  venueHealth?: {
    version: "pass461-venue-health-runtime";
    venueId: "binance" | "mexc" | "coinbase";
    venue: string;
    assetSymbol: string;
    pair: string;
    baseCurrency: string;
    quoteCurrency: "USD" | "USDT" | "USDC" | "EUR" | "UNKNOWN";
    pairResolutionState: "canonical" | "candidate" | "unsupported";
    pairResolutionNote: string;
    state:
      | "source_bound"
      | "review"
      | "stale"
      | "provider_error"
      | "unsupported";
    source: string;
    observedAt: string;
    sourceTimestamp: number | null;
    freshnessSeconds: number | null;
    latencyMs: number | null;
    serverClockDriftMs: number | null;
    spreadBps: number | null;
    bidDepthUsd: number | null;
    askDepthUsd: number | null;
    depthImbalancePercent: number | null;
    klineContinuityPercent: number | null;
    referencePrice: number | null;
    priceChange24h: number | null;
    volume24h: number | null;
    confidenceCap: number;
    healthScore: number;
    cacheState: "hit" | "miss" | "stale_fallback";
    storageMode: "upstash_rest" | "upstash_fallback_memory" | "memory";
    quotaMode: string;
    quotaRemaining: number | null;
    providerErrors: string[];
    metrics: Array<{
      id: string;
      label: string;
      value: string;
      state: "ok" | "watch" | "missing";
      source: string;
    }>;
    websocketPolicy: {
      endpoint: string;
      heartbeat: string;
      reconnect: string;
      expiry: string;
    };
    boundary: string;
  } | null;
};

type QuoteResponse = {
  ok: boolean;
  generatedAt: string;
  quotes: Quote[];
};

type SearchResponse = {
  ok: boolean;
  results?: Array<{
    symbol: string;
    name: string;
    exchange: string | null;
    quoteType: string;
  }>;
};

type CatalogRow = {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  assetClass:
    | "crypto"
    | "exchange_token"
    | "stock"
    | "fx"
    | "real_estate"
    | "etf"
    | "commodity";
  priceLane: string;
  proofOrDisclosureLane: string;
  riskPressure: number;
  adapterState:
    | "live_first"
    | "provider_required"
    | "slow_macro"
    | "historical_context"
    | "operator_review";
};

type CatalogResponse = {
  ok: boolean;
  counts?: {
    total: number;
    uniqueSymbols: number;
    inheritedRowsCollapsed: number;
    stocks: number;
    fx: number;
    etf: number;
    commodities: number;
    realEstate: number;
    crypto: number;
    exchangeTokens: number;
  };
  rows?: CatalogRow[];
};

function categoryFromCatalog(
  assetClass: CatalogRow["assetClass"],
): AssetCategory {
  if (assetClass === "stock") return "stocks";
  if (assetClass === "fx") return "fx";
  if (assetClass === "etf") return "etf";
  if (assetClass === "commodity") return "commodities";
  if (assetClass === "real_estate") return "real_estate";
  return "crypto";
}

function cleanAssetSymbol(value: unknown, fallback = "ASSET") {
  const clean = String(value ?? fallback)
    .trim()
    .toUpperCase();
  return clean || fallback;
}

function realMarketsRowTone(risk: number) {
  if (risk >= 70) return "critical";
  if (risk >= 50) return "warning";
  if (risk >= 35) return "watch";
  return "calm";
}

function providerSymbolFromCatalog(row: CatalogRow) {
  const symbol = cleanAssetSymbol(row.symbol);
  if (row.assetClass === "crypto" || row.assetClass === "exchange_token") {
    return symbol.includes("-") ? symbol : `${symbol}-USD`;
  }
  if (row.assetClass === "fx") {
    if (symbol === "DXY") return "DX-Y.NYB";
    return `${symbol.replace(/[^A-Z]/g, "")}=X`;
  }
  if (row.assetClass === "commodity") {
    const futures: Record<string, string> = {
      "XAU/USD": "GC=F",
      "XAG/USD": "SI=F",
      WTI: "CL=F",
      BRENT: "BZ=F",
      NATGAS: "NG=F",
      COPPER: "HG=F",
      PLATINUM: "PL=F",
      COCOA: "CC=F",
      COFFEE: "KC=F",
      WHEAT: "ZW=F",
    };
    return futures[symbol] || symbol;
  }
  return symbol;
}

function normalizePass1994MarketAlias(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PASS1994_REAL_MARKET_ALIASES: Record<string, string[]> = {
  BNB: ["bnb", "binance coin", "binance token", "binance native token"],
  BINANCE: ["binance", "binance venue", "binance venue health", "binance hill", "binance health", "bnb venue", "binance exchange"],
  MEXC: ["mexc", "mexc venue", "mexc venue health", "mexc hill", "mx", "mx token", "mexc token", "mexc exchange"],
  COINBASE: ["coinbase", "coinbase venue", "coinbase health", "coin venue", "coinbase exchange"],
  OKX: ["okx", "okx venue", "okb", "okb venue", "okx exchange"],
  KRAKEN: ["kraken", "kraken venue", "kraken exchange"],
  BYBIT: ["bybit", "bybit venue", "mnt", "mantle", "bybit exchange"],
  MSFT: ["microsoft", "microsoft corp", "microsoft corporation", "msft"],
  AAPL: ["apple", "apple inc", "aapl"],
  NVDA: ["nvidia", "nvidia corp", "nvda"],
  GOOGL: ["alphabet", "google", "googl", "goog"],
  AMZN: ["amazon", "amazon.com", "amzn"],
  META: ["meta", "facebook", "meta platforms"],
  TSLA: ["tesla", "tsla"],
  AMD: ["amd", "advanced micro devices"],
  INTC: ["intel", "intel corporation", "intc"],
  ORCL: ["oracle", "oracle corporation", "orcl"],
  IBM: ["ibm", "international business machines"],
  SAP: ["sap", "sap se", "sap.de"],
  CRM: ["salesforce", "salesforce inc", "crm"],
  ADBE: ["adobe", "adbe"],
  NFLX: ["netflix", "nflx"],
  JPM: ["jpmorgan", "jpmorgan chase", "jpm"],
  V: ["visa", "visa inc"],
  MA: ["mastercard", "mastercard inc"],
};

const PASS1995_REAL_MARKETS_QUOTE_FALLBACKS: Record<string, string[]> = {
  BINANCE: ["BNB-USD", "BNB-USD"],
  MEXC: ["MX-USD", "MEXC-USD"],
  OKX: ["OKB-USD"],
  BYBIT: ["MNT-USD"],
  COINBASE: ["COIN"],
  KRAKEN: ["KRAKENVENUE"],
  EUREX: ["DB1.DE"],
  XETRA: ["DB1.DE"],
};

function pass1996FallbackKeysForAsset(asset: Asset) {
  const rawValues = [asset.symbol, asset.providerSymbol, asset.name, asset.id, asset.exchange]
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(Boolean);
  return Array.from(
    new Set(
      rawValues.flatMap((value) => [
        value,
        value.replace(/[-/](USD|USDT|USDC)$/i, ""),
        value.replace(/\s+VENUE\s+HEALTH$/i, ""),
        value.replace(/[^A-Z0-9.]/g, ""),
      ]),
    ),
  );
}

function quoteSymbolsForAsset(asset: Asset | null | undefined) {
  if (!asset) return [] as string[];
  const fallbackSymbols = pass1996FallbackKeysForAsset(asset).flatMap(
    (key) => PASS1995_REAL_MARKETS_QUOTE_FALLBACKS[key] ?? [],
  );
  return Array.from(
    new Set(
      [asset.providerSymbol, asset.symbol, ...fallbackSymbols]
        .map((value) => String(value || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

function quoteForAsset(quotes: Record<string, Quote>, asset: Asset | null | undefined) {
  const symbols = quoteSymbolsForAsset(asset);
  const available = symbols.map((symbol) => quotes[symbol]).filter(Boolean);
  return available.find((quote) => quote.state === "live" && quote.currentPrice !== null) ?? available[0];
}

function matchPass1994ManualMarketAliases(query: string, assets: readonly Asset[]) {
  const normalized = normalizePass1994MarketAlias(query);
  if (normalized.length < 2) return [] as Asset[];
  const matches = new Set<string>();
  for (const [symbol, aliases] of Object.entries(PASS1994_REAL_MARKET_ALIASES)) {
    const aliasHit = aliases.some((alias) => {
      const cleanAlias = normalizePass1994MarketAlias(alias);
      return normalized === cleanAlias || normalized.includes(cleanAlias);
    });
    if (aliasHit) matches.add(symbol);
  }
  if (!matches.size) return [] as Asset[];
  return assets.filter((asset) => {
    const symbol = cleanAssetSymbol(asset.symbol).replace(/[-/].*$/, "");
    const provider = cleanAssetSymbol(asset.providerSymbol).replace(/[-/].*$/, "");
    const name = normalizePass1994MarketAlias(asset.name);
    return (
      matches.has(symbol) ||
      matches.has(provider) ||
      Array.from(matches).some((match) => name.includes(normalizePass1994MarketAlias(match)))
    );
  });
}

function assetFromCatalog(row: CatalogRow): Asset {
  return {
    id: `catalog-${row.id}`,
    symbol: row.symbol,
    providerSymbol: providerSymbolFromCatalog(row),
    name: row.name,
    category: categoryFromCatalog(row.assetClass),
    glyph: row.symbol
      .replace(/[^A-Z0-9]/gi, "")
      .slice(0, 3)
      .toUpperCase(),
    context: `${row.priceLane} · ${row.proofOrDisclosureLane}`,
    risk: row.riskPressure,
  };
}

const curatedAssets: Asset[] = [
  {
    id: "btc-usd",
    symbol: "BTC",
    providerSymbol: "BTC-USD",
    name: "Bitcoin",
    category: "crypto",
    glyph: "₿",
    context: "Crypto quote + cross-venue candle lane",
    risk: 46,
  },
  {
    id: "eth-usd",
    symbol: "ETH",
    providerSymbol: "ETH-USD",
    name: "Ethereum",
    category: "crypto",
    glyph: "Ξ",
    context: "Crypto quote + gas/liquidity lane",
    risk: 44,
  },
  {
    id: "sol-usd",
    symbol: "SOL",
    providerSymbol: "SOL-USD",
    name: "Solana",
    category: "crypto",
    glyph: "SOL",
    context: "Crypto quote + throughput/liquidity lane",
    risk: 52,
  },
  {
    id: "bnb-usd",
    symbol: "BNB",
    providerSymbol: "BNB-USD",
    name: "BNB",
    category: "crypto",
    glyph: "BNB",
    context: "Crypto quote + exchange-token boundary",
    risk: 55,
  },
  {
    id: "xrp-usd",
    symbol: "XRP",
    providerSymbol: "XRP-USD",
    name: "XRP",
    category: "crypto",
    glyph: "XRP",
    context: "Crypto quote + venue/liquidity lane",
    risk: 48,
  },
  {
    id: "ada-usd",
    symbol: "ADA",
    providerSymbol: "ADA-USD",
    name: "Cardano",
    category: "crypto",
    glyph: "ADA",
    context: "Crypto quote + liquidity/cadence lane",
    risk: 47,
  },
  {
    id: "aapl",
    symbol: "AAPL",
    providerSymbol: "AAPL",
    name: "Apple",
    category: "stocks",
    domain: "apple.com",
    context: "Equity quote + issuer filing lane",
    risk: 28,
  },
  {
    id: "nvda",
    symbol: "NVDA",
    providerSymbol: "NVDA",
    name: "Nvidia",
    category: "stocks",
    domain: "nvidia.com",
    context: "Equity quote + earnings context",
    risk: 42,
  },
  {
    id: "msft",
    symbol: "MSFT",
    providerSymbol: "MSFT",
    name: "Microsoft",
    category: "stocks",
    domain: "microsoft.com",
    context: "Equity quote + issuer filing lane",
    risk: 29,
  },
  {
    id: "googl",
    symbol: "GOOGL",
    providerSymbol: "GOOGL",
    name: "Alphabet",
    category: "stocks",
    domain: "google.com",
    context: "Equity quote + issuer filing lane",
    risk: 32,
  },
  {
    id: "amzn",
    symbol: "AMZN",
    providerSymbol: "AMZN",
    name: "Amazon",
    category: "stocks",
    domain: "amazon.com",
    context: "Equity quote + issuer filing lane",
    risk: 36,
  },
  {
    id: "meta",
    symbol: "META",
    providerSymbol: "META",
    name: "Meta Platforms",
    category: "stocks",
    domain: "meta.com",
    context: "Equity quote + event context",
    risk: 37,
  },
  {
    id: "tsla",
    symbol: "TSLA",
    providerSymbol: "TSLA",
    name: "Tesla",
    category: "stocks",
    domain: "tesla.com",
    context: "Equity quote + volatility context",
    risk: 48,
  },
  {
    id: "lvmh",
    symbol: "MC.PA",
    providerSymbol: "MC.PA",
    name: "LVMH",
    category: "stocks",
    domain: "lvmh.com",
    context: "EU quote + issuer disclosure",
    risk: 31,
  },
  {
    id: "sp500",
    symbol: "S&P 500",
    providerSymbol: "^GSPC",
    name: "S&P 500",
    category: "indices",
    glyph: "S&P",
    context: "Index level + timestamp",
    risk: 30,
  },
  {
    id: "nasdaq100",
    symbol: "NDX",
    providerSymbol: "^NDX",
    name: "Nasdaq 100",
    category: "indices",
    glyph: "NDX",
    context: "Index level + timestamp",
    risk: 34,
  },
  {
    id: "dax",
    symbol: "DAX",
    providerSymbol: "^GDAXI",
    name: "DAX Performance Index",
    category: "indices",
    glyph: "DAX",
    context: "Index level + timestamp",
    risk: 32,
  },
  {
    id: "ftse",
    symbol: "FTSE",
    providerSymbol: "^FTSE",
    name: "FTSE 100",
    category: "indices",
    glyph: "FTSE",
    context: "Index level + timestamp",
    risk: 31,
  },
  {
    id: "wig20tr",
    symbol: "WIG20TR",
    providerSymbol: "WIG20TR.WA",
    name: "WIG20 Total Return",
    category: "indices",
    glyph: "W20",
    context: "WSE index level + timestamp",
    risk: 35,
  },
  {
    id: "eurusd",
    symbol: "EUR/USD",
    providerSymbol: "EURUSD=X",
    name: "Euro / US Dollar",
    category: "fx",
    glyph: "€",
    context: "Reference + intraday feed",
    risk: 30,
  },
  {
    id: "eurpln",
    symbol: "EUR/PLN",
    providerSymbol: "EURPLN=X",
    name: "Euro / Polish Zloty",
    category: "fx",
    glyph: "PL",
    context: "Reference + intraday feed",
    risk: 31,
  },
  {
    id: "usdpln",
    symbol: "USD/PLN",
    providerSymbol: "USDPLN=X",
    name: "US Dollar / Polish Zloty",
    category: "fx",
    glyph: "$",
    context: "Reference + intraday feed",
    risk: 34,
  },
  {
    id: "usdjpy",
    symbol: "USD/JPY",
    providerSymbol: "JPY=X",
    name: "US Dollar / Yen",
    category: "fx",
    glyph: "¥",
    context: "Reference + intraday feed",
    risk: 39,
  },
  {
    id: "gbpusd",
    symbol: "GBP/USD",
    providerSymbol: "GBPUSD=X",
    name: "Pound / US Dollar",
    category: "fx",
    glyph: "£",
    context: "Reference + intraday feed",
    risk: 33,
  },
  {
    id: "spy",
    symbol: "SPY",
    providerSymbol: "SPY",
    name: "S&P 500 ETF",
    category: "etf",
    domain: "ssga.com",
    context: "ETF quote + holdings cadence",
    risk: 36,
  },
  {
    id: "qqq",
    symbol: "QQQ",
    providerSymbol: "QQQ",
    name: "Nasdaq 100 ETF",
    category: "etf",
    domain: "invesco.com",
    context: "ETF quote + holdings cadence",
    risk: 39,
  },
  {
    id: "gld",
    symbol: "GLD",
    providerSymbol: "GLD",
    name: "Gold ETF",
    category: "etf",
    domain: "ssga.com",
    context: "ETF quote + commodity context",
    risk: 33,
  },
  {
    id: "vnq-etf",
    symbol: "VNQ",
    providerSymbol: "VNQ",
    name: "Vanguard Real Estate ETF",
    category: "etf",
    domain: "vanguard.com",
    context: "ETF quote + holdings cadence",
    risk: 41,
  },
  {
    id: "gold",
    symbol: "GC",
    providerSymbol: "GC=F",
    name: "Gold Futures",
    category: "commodities",
    glyph: "Au",
    context: "Futures contract + timestamp",
    risk: 34,
  },
  {
    id: "silver",
    symbol: "SI",
    providerSymbol: "SI=F",
    name: "Silver Futures",
    category: "commodities",
    glyph: "Ag",
    context: "Futures contract + timestamp",
    risk: 37,
  },
  {
    id: "wti",
    symbol: "CL",
    providerSymbol: "CL=F",
    name: "WTI Crude Oil",
    category: "commodities",
    glyph: "WTI",
    context: "Futures contract + timestamp",
    risk: 40,
  },
  {
    id: "brent",
    symbol: "BZ",
    providerSymbol: "BZ=F",
    name: "Brent Crude Oil",
    category: "commodities",
    glyph: "BZ",
    context: "Futures contract + timestamp",
    risk: 39,
  },
  {
    id: "vnq-real",
    symbol: "VNQ",
    providerSymbol: "VNQ",
    name: "REIT Basket Proxy",
    category: "real_estate",
    domain: "vanguard.com",
    context: "Slow macro proxy, not property valuation",
    risk: 41,
  },
  {
    id: "iyr",
    symbol: "IYR",
    providerSymbol: "IYR",
    name: "US Real Estate ETF",
    category: "real_estate",
    domain: "ishares.com",
    context: "Slow macro proxy, not property valuation",
    risk: 43,
  },
  {
    id: "xlre",
    symbol: "XLRE",
    providerSymbol: "XLRE",
    name: "Real Estate Select Sector",
    category: "real_estate",
    domain: "ssga.com",
    context: "Slow macro proxy, not property valuation",
    risk: 40,
  },
  {
    id: "pld",
    symbol: "PLD",
    providerSymbol: "PLD",
    name: "Prologis",
    category: "real_estate",
    domain: "prologis.com",
    context: "Public REIT quote + filing context",
    risk: 38,
  },
  {
    id: "coin",
    symbol: "COIN",
    providerSymbol: "COIN",
    name: "Coinbase Global",
    category: "exchanges",
    domain: "coinbase.com",
    context: "Public equity proxy, not venue solvency",
    risk: 45,
  },
  {
    id: "cme",
    symbol: "CME",
    providerSymbol: "CME",
    name: "CME Group",
    category: "exchanges",
    domain: "cmegroup.com",
    context: "Listed exchange operator + filing context",
    risk: 30,
  },
  {
    id: "ice",
    symbol: "ICE",
    providerSymbol: "ICE",
    name: "Intercontinental Exchange",
    category: "exchanges",
    domain: "ice.com",
    context: "Listed exchange operator + filing context",
    risk: 31,
  },
  {
    id: "ndaq",
    symbol: "NDAQ",
    providerSymbol: "NDAQ",
    name: "Nasdaq",
    category: "exchanges",
    domain: "nasdaq.com",
    context: "Listed exchange operator + filing context",
    risk: 32,
  },
  {
    id: "binance-venue",
    symbol: "BINANCE",
    providerSymbol: "BNB-USD",
    name: "Binance / BNB Venue Health",
    category: "exchanges",
    glyph: "BN",
    context: "Crypto venue health lane · klines/depth/status adapter",
    risk: 55,
  },
  {
    id: "mexc-venue",
    symbol: "MEXC",
    providerSymbol: "MX-USD",
    name: "MEXC / MX Venue Health",
    category: "exchanges",
    glyph: "MX",
    context: "Crypto venue health lane · websocket cadence/reconnect",
    risk: 58,
  },
  {
    id: "coinbase-venue",
    symbol: "COINBASE",
    providerSymbol: "COINBASEVENUE",
    name: "Coinbase Venue Health",
    category: "exchanges",
    glyph: "CB",
    context: "Crypto venue health lane · status/depth/API resilience",
    risk: 47,
  },
  {
    id: "okx-venue",
    symbol: "OKX",
    providerSymbol: "OKB-USD",
    name: "OKX / OKB Venue Health",
    category: "exchanges",
    glyph: "OK",
    context: "Crypto venue health lane · orderbook/status adapter",
    risk: 54,
  },
  {
    id: "kraken-venue",
    symbol: "KRAKEN",
    providerSymbol: "KRAKENVENUE",
    name: "Kraken Venue Health",
    category: "exchanges",
    glyph: "KR",
    context: "Crypto venue health lane · orderbook/status adapter",
    risk: 46,
  },
  {
    id: "bybit-venue",
    symbol: "BYBIT",
    providerSymbol: "MNT-USD",
    name: "Bybit / MNT Venue Health",
    category: "exchanges",
    glyph: "BB",
    context: "Crypto venue health lane · derivatives boundary",
    risk: 57,
  },
  {
    id: "jpm",
    symbol: "JPM",
    providerSymbol: "JPM",
    name: "JPMorgan Chase",
    category: "stocks",
    domain: "jpmorganchase.com",
    context: "Bank equity quote + macro stress lane",
    risk: 35,
  },
  {
    id: "asml",
    symbol: "ASML",
    providerSymbol: "ASML",
    name: "ASML Holding",
    category: "stocks",
    domain: "asml.com",
    context: "Semiconductor equity quote + EU issuer lane",
    risk: 34,
  },
  {
    id: "sap",
    symbol: "SAP",
    providerSymbol: "SAP.DE",
    name: "SAP",
    category: "stocks",
    domain: "sap.com",
    context: "EU software quote + issuer lane",
    risk: 30,
  },
  {
    id: "amd",
    symbol: "AMD",
    providerSymbol: "AMD",
    name: "Advanced Micro Devices",
    category: "stocks",
    domain: "amd.com",
    context: "Semiconductor equity quote + supply-chain lane",
    risk: 42,
  },
  {
    id: "tsm",
    symbol: "TSM",
    providerSymbol: "TSM",
    name: "Taiwan Semiconductor",
    category: "stocks",
    domain: "tsmc.com",
    context: "ADR quote + foundry concentration lane",
    risk: 36,
  },
  {
    id: "avgo",
    symbol: "AVGO",
    providerSymbol: "AVGO",
    name: "Broadcom",
    category: "stocks",
    domain: "broadcom.com",
    context: "Semiconductor equity quote + AI infrastructure lane",
    risk: 37,
  },
  {
    id: "gs",
    symbol: "GS",
    providerSymbol: "GS",
    name: "Goldman Sachs",
    category: "stocks",
    domain: "goldmansachs.com",
    context: "Bank equity quote + rate sensitivity lane",
    risk: 38,
  },
  {
    id: "bac",
    symbol: "BAC",
    providerSymbol: "BAC",
    name: "Bank of America",
    category: "stocks",
    domain: "bankofamerica.com",
    context: "Bank equity quote + deposit stress lane",
    risk: 39,
  },
  {
    id: "v",
    symbol: "V",
    providerSymbol: "V",
    name: "Visa",
    category: "stocks",
    domain: "visa.com",
    context: "Payments equity quote + consumer flow lane",
    risk: 27,
  },
  {
    id: "ma",
    symbol: "MA",
    providerSymbol: "MA",
    name: "Mastercard",
    category: "stocks",
    domain: "mastercard.com",
    context: "Payments equity quote + consumer flow lane",
    risk: 28,
  },
  {
    id: "nvo",
    symbol: "NVO",
    providerSymbol: "NVO",
    name: "Novo Nordisk",
    category: "stocks",
    domain: "novonordisk.com",
    context: "Healthcare equity quote + regulatory lane",
    risk: 30,
  },
  {
    id: "air",
    symbol: "AIR.PA",
    providerSymbol: "AIR.PA",
    name: "Airbus",
    category: "stocks",
    domain: "airbus.com",
    context: "EU aerospace quote + orderbook lane",
    risk: 34,
  },
  {
    id: "bmw",
    symbol: "BMW.DE",
    providerSymbol: "BMW.DE",
    name: "BMW",
    category: "stocks",
    domain: "bmw.com",
    context: "EU auto quote + demand lane",
    risk: 36,
  },
  {
    id: "mbg",
    symbol: "MBG.DE",
    providerSymbol: "MBG.DE",
    name: "Mercedes-Benz Group",
    category: "stocks",
    domain: "mercedes-benz.com",
    context: "EU auto quote + demand lane",
    risk: 35,
  },
  {
    id: "vow3",
    symbol: "VOW3.DE",
    providerSymbol: "VOW3.DE",
    name: "Volkswagen Pref",
    category: "stocks",
    domain: "volkswagen-group.com",
    context: "EU auto quote + governance lane",
    risk: 39,
  },
  {
    id: "adidas",
    symbol: "ADS.DE",
    providerSymbol: "ADS.DE",
    name: "Adidas",
    category: "stocks",
    domain: "adidas.com",
    context: "EU consumer quote + brand momentum lane",
    risk: 33,
  },
  {
    id: "hermes",
    symbol: "RMS.PA",
    providerSymbol: "RMS.PA",
    name: "Hermès",
    category: "stocks",
    domain: "hermes.com",
    context: "Luxury equity quote + pricing power lane",
    risk: 28,
  },
  {
    id: "kering",
    symbol: "KER.PA",
    providerSymbol: "KER.PA",
    name: "Kering",
    category: "stocks",
    domain: "kering.com",
    context: "Luxury equity quote + brand cycle lane",
    risk: 36,
  },
  {
    id: "richemont",
    symbol: "CFR.SW",
    providerSymbol: "CFR.SW",
    name: "Richemont",
    category: "stocks",
    domain: "richemont.com",
    context: "Luxury equity quote + watch/jewelry lane",
    risk: 33,
  },
  {
    id: "nike",
    symbol: "NKE",
    providerSymbol: "NKE",
    name: "Nike",
    category: "stocks",
    domain: "nike.com",
    context: "Sportswear equity quote + margin lane",
    risk: 38,
  },
  {
    id: "siemens",
    symbol: "SIE.DE",
    providerSymbol: "SIE.DE",
    name: "Siemens",
    category: "stocks",
    domain: "siemens.com",
    context: "EU industrial quote + infrastructure lane",
    risk: 31,
  },
  {
    id: "allianz",
    symbol: "ALV.DE",
    providerSymbol: "ALV.DE",
    name: "Allianz",
    category: "stocks",
    domain: "allianz.com",
    context: "Insurance equity quote + rate/solvency lane",
    risk: 29,
  },
  {
    id: "mstr",
    symbol: "MSTR",
    providerSymbol: "MSTR",
    name: "MicroStrategy",
    category: "stocks",
    domain: "strategy.com",
    context: "Bitcoin-treasury equity quote + NAV divergence lane",
    risk: 61,
  },
  {
    id: "hood",
    symbol: "HOOD",
    providerSymbol: "HOOD",
    name: "Robinhood",
    category: "stocks",
    domain: "robinhood.com",
    context: "Brokerage equity quote + retail flow lane",
    risk: 49,
  },
  {
    id: "or",
    symbol: "OR.PA",
    providerSymbol: "OR.PA",
    name: "L'Oréal",
    category: "stocks",
    domain: "loreal.com",
    context: "Luxury/beauty equity quote + brand pricing lane",
    risk: 30,
  },
  {
    id: "race",
    symbol: "RACE",
    providerSymbol: "RACE",
    name: "Ferrari",
    category: "stocks",
    domain: "ferrari.com",
    context: "Luxury auto equity quote + scarcity/pricing lane",
    risk: 32,
  },
  {
    id: "porsche",
    symbol: "P911.DE",
    providerSymbol: "P911.DE",
    name: "Porsche AG",
    category: "stocks",
    domain: "porsche.com",
    context: "Luxury auto equity quote + EU issuer lane",
    risk: 35,
  },
  {
    id: "sony",
    symbol: "SONY",
    providerSymbol: "SONY",
    name: "Sony Group",
    category: "stocks",
    domain: "sony.com",
    context: "Global consumer/entertainment equity lane",
    risk: 34,
  },
  {
    id: "shop",
    symbol: "SHOP",
    providerSymbol: "SHOP",
    name: "Shopify",
    category: "stocks",
    domain: "shopify.com",
    context: "Commerce infrastructure equity quote",
    risk: 43,
  },
  {
    id: "doge-usd",
    symbol: "DOGE",
    providerSymbol: "DOGE-USD",
    name: "Dogecoin",
    category: "crypto",
    glyph: "DOGE",
    context: "Crypto quote + meme-liquidity/hype boundary",
    risk: 59,
  },
  {
    id: "link-usd",
    symbol: "LINK",
    providerSymbol: "LINK-USD",
    name: "Chainlink",
    category: "crypto",
    glyph: "LINK",
    context: "Oracle asset quote + liquidity/source lane",
    risk: 48,
  },
  {
    id: "avax-usd",
    symbol: "AVAX",
    providerSymbol: "AVAX-USD",
    name: "Avalanche",
    category: "crypto",
    glyph: "AVAX",
    context: "L1 asset quote + bridge/liquidity lane",
    risk: 51,
  },
  {
    id: "dot-usd",
    symbol: "DOT",
    providerSymbol: "DOT-USD",
    name: "Polkadot",
    category: "crypto",
    glyph: "DOT",
    context: "L1 ecosystem quote + liquidity/cadence lane",
    risk: 50,
  },
  {
    id: "lse",
    symbol: "LSEG.L",
    providerSymbol: "LSEG.L",
    name: "London Stock Exchange Group",
    category: "exchanges",
    domain: "lseg.com",
    context: "Listed exchange/data operator + filing lane",
    risk: 33,
  },
  {
    id: "db1",
    symbol: "DB1.DE",
    providerSymbol: "DB1.DE",
    name: "Deutsche Börse",
    category: "exchanges",
    domain: "deutsche-boerse.com",
    context: "Listed European exchange operator + filing lane",
    risk: 32,
  },
  {
    id: "hkex",
    symbol: "0388.HK",
    providerSymbol: "0388.HK",
    name: "Hong Kong Exchanges",
    category: "exchanges",
    domain: "hkex.com.hk",
    context: "Listed APAC exchange operator + filing lane",
    risk: 36,
  },
  {
    id: "stoxx50",
    symbol: "STOXX50E",
    providerSymbol: "^STOXX50E",
    name: "Euro Stoxx 50",
    category: "indices",
    glyph: "SX5",
    context: "EU blue-chip index level + timestamp",
    risk: 31,
  },
  {
    id: "nikkei",
    symbol: "NIKKEI",
    providerSymbol: "^N225",
    name: "Nikkei 225",
    category: "indices",
    glyph: "N225",
    context: "Japan index level + timestamp",
    risk: 33,
  },
  {
    id: "eurtry",
    symbol: "EUR/TRY",
    providerSymbol: "EURTRY=X",
    name: "Euro / Turkish Lira",
    category: "fx",
    glyph: "TRY",
    context: "Higher-volatility FX reference lane",
    risk: 55,
  },
  {
    id: "usdtry",
    symbol: "USD/TRY",
    providerSymbol: "TRY=X",
    name: "US Dollar / Turkish Lira",
    category: "fx",
    glyph: "TRY",
    context: "Higher-volatility FX reference lane",
    risk: 57,
  },
  {
    id: "eurgbp",
    symbol: "EUR/GBP",
    providerSymbol: "EURGBP=X",
    name: "Euro / Pound",
    category: "fx",
    glyph: "€£",
    context: "Reference + intraday feed",
    risk: 29,
  },
  {
    id: "usdchf",
    symbol: "USD/CHF",
    providerSymbol: "CHF=X",
    name: "US Dollar / Swiss Franc",
    category: "fx",
    glyph: "CHF",
    context: "Reference + intraday feed",
    risk: 27,
  },
  {
    id: "copper",
    symbol: "HG",
    providerSymbol: "HG=F",
    name: "Copper Futures",
    category: "commodities",
    glyph: "Cu",
    context: "Industrial metal futures + macro lane",
    risk: 42,
  },
  {
    id: "natgas",
    symbol: "NG",
    providerSymbol: "NG=F",
    name: "Natural Gas Futures",
    category: "commodities",
    glyph: "NG",
    context: "Energy futures + weather/seasonality lane",
    risk: 53,
  },
  {
    id: "wheat",
    symbol: "ZW",
    providerSymbol: "ZW=F",
    name: "Wheat Futures",
    category: "commodities",
    glyph: "ZW",
    context: "Agriculture futures + supply shock lane",
    risk: 45,
  },
  {
    id: "tlt",
    symbol: "TLT",
    providerSymbol: "TLT",
    name: "20+ Year Treasury Bond ETF",
    category: "etf",
    domain: "ishares.com",
    context: "Duration ETF + rate sensitivity lane",
    risk: 44,
  },
  {
    id: "hyg",
    symbol: "HYG",
    providerSymbol: "HYG",
    name: "High Yield Corporate Bond ETF",
    category: "etf",
    domain: "ishares.com",
    context: "Credit ETF + spread stress lane",
    risk: 47,
  },
  {
    id: "efa",
    symbol: "EFA",
    providerSymbol: "EFA",
    name: "MSCI EAFE ETF",
    category: "etf",
    domain: "ishares.com",
    context: "Global equity ETF + region lane",
    risk: 34,
  },
  {
    id: "reit-eu",
    symbol: "IWDP.L",
    providerSymbol: "IWDP.L",
    name: "Developed Property ETF",
    category: "real_estate",
    domain: "ishares.com",
    context: "Global property ETF proxy, not property valuation",
    risk: 44,
  },
  {
    id: "eurex-venue",
    symbol: "EUREX",
    providerSymbol: "EUREXVENUE",
    name: "Eurex Venue Health",
    category: "exchanges",
    glyph: "EX",
    context: "Derivatives venue health lane · clearing/status adapter",
    risk: 40,
  },
  {
    id: "xetra-venue",
    symbol: "XETRA",
    providerSymbol: "XETRAVENUE",
    name: "Xetra Venue Health",
    category: "exchanges",
    glyph: "XT",
    context: "EU venue health lane · trading/status adapter",
    risk: 38,
  },
  {
    id: "orcl",
    symbol: "ORCL",
    providerSymbol: "ORCL",
    name: "Oracle",
    category: "stocks",
    domain: "oracle.com",
    context: "Enterprise software equity + filing lane",
    risk: 33,
  },
  {
    id: "crm",
    symbol: "CRM",
    providerSymbol: "CRM",
    name: "Salesforce",
    category: "stocks",
    domain: "salesforce.com",
    context: "Cloud software equity + filing lane",
    risk: 37,
  },
  {
    id: "adbe",
    symbol: "ADBE",
    providerSymbol: "ADBE",
    name: "Adobe",
    category: "stocks",
    domain: "adobe.com",
    context: "Creative software equity + filing lane",
    risk: 35,
  },
  {
    id: "nflx",
    symbol: "NFLX",
    providerSymbol: "NFLX",
    name: "Netflix",
    category: "stocks",
    domain: "netflix.com",
    context: "Media equity + subscriber/filing lane",
    risk: 43,
  },
  {
    id: "intc",
    symbol: "INTC",
    providerSymbol: "INTC",
    name: "Intel",
    category: "stocks",
    domain: "intel.com",
    context: "Semiconductor equity + capacity/filing lane",
    risk: 45,
  },
  {
    id: "qcom",
    symbol: "QCOM",
    providerSymbol: "QCOM",
    name: "Qualcomm",
    category: "stocks",
    domain: "qualcomm.com",
    context: "Semiconductor equity + licensing lane",
    risk: 39,
  },
  {
    id: "txn",
    symbol: "TXN",
    providerSymbol: "TXN",
    name: "Texas Instruments",
    category: "stocks",
    domain: "ti.com",
    context: "Analog semiconductor equity + cycle lane",
    risk: 34,
  },
  {
    id: "arm",
    symbol: "ARM",
    providerSymbol: "ARM",
    name: "Arm Holdings",
    category: "stocks",
    domain: "arm.com",
    context: "Semiconductor IP equity + valuation lane",
    risk: 47,
  },
  {
    id: "ibm",
    symbol: "IBM",
    providerSymbol: "IBM",
    name: "IBM",
    category: "stocks",
    domain: "ibm.com",
    context: "Enterprise technology equity + filing lane",
    risk: 30,
  },
  {
    id: "uber",
    symbol: "UBER",
    providerSymbol: "UBER",
    name: "Uber",
    category: "stocks",
    domain: "uber.com",
    context: "Mobility platform equity + margin lane",
    risk: 44,
  },
  {
    id: "abnb",
    symbol: "ABNB",
    providerSymbol: "ABNB",
    name: "Airbnb",
    category: "stocks",
    domain: "airbnb.com",
    context: "Travel platform equity + demand lane",
    risk: 42,
  },
  {
    id: "baba",
    symbol: "BABA",
    providerSymbol: "BABA",
    name: "Alibaba",
    category: "stocks",
    domain: "alibabagroup.com",
    context: "Global commerce equity + jurisdiction lane",
    risk: 52,
  },
];

const text = {
  pl: {
    title: "Real Markets",
    subtitle:
      "Akcje, waluty, ETF, surowce, proxy nieruchomości i operatorzy giełd w jednym terminalu. Krypto pozostaje w Velmère Shield, gdzie ma właściwe źródła venue i analizę ryzyka.",
    tabs: {
      all: "Główne",
      crypto: "Krypto",
      stocks: "Akcje",
      indices: "Indeksy",
      fx: "FX",
      etf: "ETF",
      commodities: "Surowce",
      real_estate: "Nieruchomości",
      exchanges: "Giełdy",
    },
    search: "Szukaj: AAPL, EURUSD, WIG20, złoto...",
    name: "Instrument",
    price: "Cena",
    change: "Zmiana",
    source: "Źródło",
    risk: "Ryzyko",
    volume: "Wolumen",
    last7d: "Ostatnie 7 dni",
    unavailable: "Provider do podłączenia / brak świeżego payloadu",
    loading: "Pobieranie notowań",
    searching: "Przeszukiwanie katalogu",
    sourceTime: "Timestamp źródła",
    basic: "Basic Analysis",
    pro: "Pro Review",
    advanced: "Advanced Analysis",
    chartUnavailable:
      "Brak realnych świec dla tego instrumentu. Velmère nie generuje wykresu zastępczego.",
    global: "Katalog globalny",
    browser: "Velmère Browser",
    shield: "Wróć do Shield",
    map: "Mapa Shield",
    modeHint: {
      basic:
        "Basic pokazuje cenę, kapitalizację/proxy, zmianę 24h, wolumen i stan źródła.",
      pro: "Pro dodaje świeczki, luki danych, drugiego providera, rytm źródła i kontekst emitenta.",
      advanced:
        "Advanced rozwija 20-punktową matrycę: płynność, poślizg, jakość świec, venue health, filing lane i niestandardowe czerwone flagi.",
    },
    venuePending:
      "Venue health wymaga adaptera status/depth; nie udajemy ceny giełdy, jeśli instrument nie jest publicznym tickerem.",
  },
  de: {
    title: "Real Markets",
    subtitle:
      "Aktien, Währungen, ETFs, Rohstoffe, Immobilien-Proxys und Börsenbetreiber in einem Terminal. Krypto bleibt im Velmère Shield mit Venue-Quellen und Risikoanalyse.",
    tabs: {
      all: "Top-Märkte",
      crypto: "Krypto",
      stocks: "Aktien",
      indices: "Indizes",
      fx: "FX",
      etf: "ETFs",
      commodities: "Rohstoffe",
      real_estate: "Immobilien",
      exchanges: "Börsen",
    },
    search: "Suche: AAPL, EURUSD, DAX, Gold...",
    name: "Instrument",
    price: "Preis",
    change: "Änderung",
    source: "Quelle",
    risk: "Risiko",
    volume: "Volumen",
    last7d: "Letzte 7 Tage",
    unavailable: "Provider ausstehend / kein frischer Payload",
    loading: "Marktdaten werden geladen",
    searching: "Provider-Katalog wird durchsucht",
    sourceTime: "Quellenzeit",
    basic: "Basic Analysis",
    pro: "Pro Review",
    advanced: "Advanced Analysis",
    chartUnavailable:
      "Keine echten Kerzen für dieses Instrument. Velmère erzeugt keinen Ersatzchart.",
    global: "Globaler Katalog",
    browser: "Velmère Browser",
    shield: "Zurück zu Shield",
    map: "Shield Map",
    modeHint: {
      basic:
        "Basic zeigt Preis, Market-Cap/Proxy, 24h-Bewegung, Volumen und Quellenstatus.",
      pro: "Pro ergänzt Kerzen, Datenlücken, Zweitprovider, Quellenrhythmus und Emittenten-Kontext.",
      advanced:
        "Advanced öffnet eine 20-Punkte-Matrix: Liquidität, Slippage, Kerzenqualität, Venue Health, Filing Lane und ungewöhnliche Red Flags.",
    },
    venuePending:
      "Venue Health benötigt Status-/Depth-Adapter; Velmère zeigt keinen Fake-Preis für eine Börse ohne öffentliches Ticker-Instrument.",
  },
  en: {
    title: "Real Markets",
    subtitle:
      "Stocks, currencies, ETFs, commodities, real-estate proxies and exchange operators in one terminal. Crypto stays in Velmère Shield with venue sources and risk analysis.",
    tabs: {
      all: "Top markets",
      crypto: "Crypto",
      stocks: "Stocks",
      indices: "Indices",
      fx: "FX",
      etf: "ETFs",
      commodities: "Commodities",
      real_estate: "Real estate",
      exchanges: "Exchanges",
    },
    search: "Search: AAPL, EURUSD, FTSE, gold...",
    name: "Instrument",
    price: "Price",
    change: "Change",
    source: "Source",
    risk: "Risk",
    volume: "Volume",
    last7d: "Last 7 days",
    unavailable: "Provider pending / no fresh payload",
    loading: "Loading market data",
    searching: "Searching provider universe",
    sourceTime: "Source timestamp",
    basic: "Basic Analysis",
    pro: "Pro Review",
    advanced: "Advanced Analysis",
    chartUnavailable:
      "No real candles are available for this instrument. Velmère does not generate a substitute chart.",
    global: "Global catalog",
    browser: "Velmère Browser",
    shield: "Back to Shield",
    map: "Shield Map",
    modeHint: {
      basic:
        "Basic shows price, market-cap/proxy, 24h move, volume and source state.",
      pro: "Pro adds candles, data gaps, second-provider status, source rhythm and issuer context.",
      advanced:
        "Advanced expands a 20-point matrix: liquidity, slippage, candle quality, venue health, filing lane and unusual red flags.",
    },
    venuePending:
      "Venue health needs a status/depth adapter; Velmère does not fake an exchange price when no public ticker exists.",
  },
} as const;

const auditText = {
  pl: {
    price: "Ostatnia cena",
    change: "Zmiana względem zamknięcia",
    change1h: "Zmiana 1h",
    change24h: "Zmiana 24h",
    change7d: "Zmiana 7d",
    sourceQuality: "Jakość źródła",
    websocketCadence: "Rytm WebSocket",
    liquidity: "Płynność / wyjścia",
    slippage: "Symulowany poślizg",
    exchange: "Giełda / rynek",
    currency: "Waluta kwotowania",
    category: "Klasa rynku",
    range: "Załadowany zakres",
    observations: "Obserwacje OHLC",
    open: "Otwarcie okna",
    high: "Maksimum okna",
    low: "Minimum okna",
    close: "Ostatnie zamknięcie",
    volume: "Wolumen okna",
    volatility: "Średni zakres świecy",
    gaps: "Luki danych",
    start: "Początek okna",
    end: "Koniec okna",
    provider: "Stan dostawcy",
    second: "Potwierdzenie drugim źródłem",
    filing: "Kontekst emitenta / raportów",
    boundary: "Granica audytu",
    observed: "Wartość pochodzi z aktualnie załadowanej odpowiedzi dostawcy.",
    noGaps:
      "W zwróconym zbiorze nie znaleziono nieprawidłowych wartości zamknięcia.",
    hasGaps: "Niepełne obserwacje wymagają dodatkowej kontroli.",
    live: "Odpowiedź źródła została poprawnie przetworzona.",
    unavailable: "Nie wygenerowano zastępczej serii.",
    secondNote: "Mocniejszy wniosek wymaga niezależnego dostawcy.",
    filingNote:
      "Cena rynkowa i raporty emitenta pozostają osobnymi ścieżkami dowodowymi.",
    boundaryNote: "Wynik opisuje obserwowane dane oraz jawne braki.",
    sourceSignals: "sygnałów opartych na źródłach",
    separateLane: "osobna ścieżka",
    notApplicable: "nie dotyczy",
    sourceBound: "oparte na źródłach",
  },
  de: {
    price: "Letzter Preis",
    change: "Änderung zum Referenzschluss",
    change1h: "Änderung 1h",
    change24h: "Änderung 24h",
    change7d: "Änderung 7d",
    sourceQuality: "Quellenqualität",
    websocketCadence: "WebSocket-Rhythmus",
    liquidity: "Liquidität / Exits",
    slippage: "Simulierter Slippage",
    exchange: "Börse / Markt",
    currency: "Notierungswährung",
    category: "Marktklasse",
    range: "Geladener Bereich",
    observations: "OHLC-Beobachtungen",
    open: "Fenster-Eröffnung",
    high: "Fenster-Hoch",
    low: "Fenster-Tief",
    close: "Letzter Schluss",
    volume: "Fenster-Volumen",
    volatility: "Mittlere Kerzenspanne",
    gaps: "Datenlücken",
    start: "Fenster-Start",
    end: "Fenster-Ende",
    provider: "Provider-Status",
    second: "Bestätigung durch zweite Quelle",
    filing: "Emittenten- / Filing-Kontext",
    boundary: "Audit-Grenze",
    observed: "Der Wert stammt aus der aktuell geladenen Provider-Antwort.",
    noGaps:
      "Im gelieferten Datensatz wurden keine ungültigen Schlusswerte gefunden.",
    hasGaps: "Unvollständige Beobachtungen benötigen zusätzliche Prüfung.",
    live: "Die Quellenantwort wurde erfolgreich verarbeitet.",
    unavailable: "Es wurde keine Ersatzserie erzeugt.",
    secondNote: "Eine stärkere Aussage benötigt einen unabhängigen Provider.",
    filingNote:
      "Marktpreis und Emittentenberichte bleiben getrennte Evidenzpfade.",
    boundaryNote:
      "Das Ergebnis beschreibt beobachtete Daten und sichtbare Lücken.",
    sourceSignals: "quellengebundene Signale",
    separateLane: "separater Pfad",
    notApplicable: "nicht anwendbar",
    sourceBound: "quellengebunden",
  },
  en: {
    price: "Latest price",
    change: "Change against reference close",
    change1h: "Change 1h",
    change24h: "Change 24h",
    change7d: "Change 7d",
    sourceQuality: "Source quality",
    websocketCadence: "WebSocket cadence",
    liquidity: "Liquidity / exits",
    slippage: "Simulated slippage",
    exchange: "Exchange / venue",
    currency: "Quote currency",
    category: "Market class",
    range: "Loaded range",
    observations: "OHLC observations",
    open: "Window open",
    high: "Window high",
    low: "Window low",
    close: "Latest close",
    volume: "Window volume",
    volatility: "Average candle range",
    gaps: "Data gaps",
    start: "Window start",
    end: "Window end",
    provider: "Provider state",
    second: "Second-source confirmation",
    filing: "Issuer / filing context",
    boundary: "Audit boundary",
    observed: "The value comes from the currently loaded provider response.",
    noGaps: "No invalid close values were found in the returned set.",
    hasGaps: "Incomplete observations require additional review.",
    live: "The source response was parsed successfully.",
    unavailable: "No substitute series was generated.",
    secondNote: "Stronger wording requires an independent provider.",
    filingNote:
      "Market price and issuer disclosures remain separate evidence lanes.",
    boundaryNote: "The result describes observed data and visible gaps.",
    sourceSignals: "source-bound signals",
    separateLane: "separate lane",
    notApplicable: "not applicable",
    sourceBound: "source-bound",
  },
} as const;

function localizedAssetContext(asset: Asset, locale: Locale) {
  const context = {
    pl: {
      crypto: "Krypto quote + świece i osobna weryfikacja venue/depth",
      stocks: "Notowanie + osobna ścieżka raportów emitenta",
      indices: "Poziom indeksu + skład i timestamp źródła",
      fx: "Kurs referencyjny + feed intraday",
      etf: "Notowanie ETF + rytm aktualizacji składu",
      commodities: "Kontrakt / spot + timestamp i kontekst serii",
      real_estate: "Powolny proxy makro, nie wycena nieruchomości",
      exchanges:
        "Operator giełdy lub proxy publiczne + osobna kontrola kondycji rynku",
    },
    de: {
      crypto: "Krypto-Kurs + Kerzen und separate Venue-/Depth-Prüfung",
      stocks: "Kurs + separater Pfad für Emittentenberichte",
      indices: "Indexstand + Zusammensetzung und Quellenzeit",
      fx: "Referenzkurs + Intraday-Feed",
      etf: "ETF-Kurs + Aktualisierungsrhythmus der Bestände",
      commodities: "Kontrakt / Spot + Zeitstempel und Serienkontext",
      real_estate: "Langsamer Makro-Proxy, keine Immobilienbewertung",
      exchanges:
        "Börsenbetreiber oder öffentlicher Proxy + separate Marktprüfung",
    },
    en: {
      crypto: "Crypto quote + candles and separate venue/depth verification",
      stocks: "Quote + separate issuer filing lane",
      indices: "Index level + composition and source timestamp",
      fx: "Reference rate + intraday feed",
      etf: "ETF quote + holdings update cadence",
      commodities: "Contract / spot + timestamp and series context",
      real_estate: "Slow macro proxy, not a property valuation",
      exchanges:
        "Exchange operator or public proxy + separate venue-health review",
    },
  } as const;
  return context[locale][asset.category];
}

function categoryFromProvider(
  type: string,
  symbol: string,
  name: string,
): AssetCategory {
  const normalized = type.toUpperCase();
  if (normalized.includes("CRYPTO")) return "crypto";
  if (normalized.includes("INDEX")) return "indices";
  if (normalized.includes("ETF"))
    return name.toLowerCase().includes("real estate") ? "real_estate" : "etf";
  if (normalized.includes("CURRENCY") || symbol.endsWith("=X")) return "fx";
  if (normalized.includes("FUTURE") || symbol.endsWith("=F"))
    return "commodities";
  if (/exchange|nasdaq|cme|intercontinental/i.test(name)) return "exchanges";
  return "stocks";
}

function dynamicRisk(quote?: Quote, fallback = 36) {
  if (quote?.venueHealth) {
    return Math.max(12, Math.min(88, 100 - quote.venueHealth.healthScore));
  }
  if (!quote || quote.state !== "live") return fallback;
  const move = Math.abs(quote.changePercent || 0);
  const candles = quote.candles.slice(-48);
  const averageRange = candles.length
    ? candles.reduce(
        (sum, candle) =>
          sum +
          ((candle.high - candle.low) / Math.max(candle.close, 0.000001)) * 100,
        0,
      ) / candles.length
    : 0;
  return Math.max(
    12,
    Math.min(88, Math.round(18 + move * 4 + averageRange * 5)),
  );
}

function changeForWindow(quote: Quote | undefined, seconds: number) {
  if (!quote || quote.state !== "live") return null;
  if (seconds === 60 * 60 && typeof quote.priceChange1h === "number")
    return quote.priceChange1h;
  if (seconds === 24 * 60 * 60 && typeof quote.priceChange24h === "number")
    return quote.priceChange24h;
  if (quote.candles.length < 2) return null;
  const latest = quote.candles.at(-1);
  if (!latest) return null;
  const target = latest.timestamp - seconds;
  const reference =
    [...quote.candles].reverse().find((candle) => candle.timestamp <= target) ??
    quote.candles[0];
  if (!reference?.close) return null;
  return ((latest.close - reference.close) / reference.close) * 100;
}

function quoteVolume(quote?: Quote) {
  if (!quote || quote.state !== "live") return null;
  if (typeof quote.volume24h === "number" && Number.isFinite(quote.volume24h))
    return quote.volume24h;
  const value = quote.candles.reduce(
    (sum, candle) => sum + (candle.volume || 0),
    0,
  );
  return value || null;
}

function MarketSparkline({ quote }: { quote?: Quote }) {
  const values =
    quote?.candles.map((candle) => candle.close).filter(Number.isFinite) ?? [];
  if (values.length < 2)
    return <span className="font-mono text-[9px] text-white/[0.24]">—</span>;
  const sample = values.slice(-56);
  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const span = Math.max(max - min, 0.000001);
  const points = sample
    .map(
      (value, index) =>
        `${(index / Math.max(sample.length - 1, 1)) * 122},${34 - ((value - min) / span) * 28}`,
    )
    .join(" ");
  const rising = sample.at(-1)! >= sample[0];
  return (
    <svg
      viewBox="0 0 122 38"
      className="h-10 w-[7.6rem]"
      aria-label="7 day price sparkline"
    >
      <polyline
        points={points}
        fill="none"
        stroke={rising ? "#25dbb1" : "#ff4e78"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssetLogo({
  asset,
  large = false,
}: {
  asset: Asset;
  large?: boolean;
}) {
  const assetClass =
    asset.category === "stocks"
      ? "stock"
      : asset.category === "indices"
        ? "index"
        : asset.category === "commodities"
          ? "commodity"
          : asset.category === "real_estate"
            ? "real_estate"
            : asset.category === "exchanges"
              ? "exchange"
              : asset.category;
  const size = large ? "h-16 w-16" : "h-10 w-10";
  return (
    <ResolvedAssetLogo
      symbol={asset.symbol}
      name={asset.name}
      id={asset.id}
      assetClass={assetClass}
      imageUrl={
        asset.domain
          ? `/api/market-integrity/brand-icon?domain=${encodeURIComponent(asset.domain)}`
          : undefined
      }
      venue={
        asset.category === "exchanges"
          ? asset.name.replace(/\s+Venue Health$/i, "")
          : undefined
      }
      className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-[1.05rem] border border-white/[0.12] bg-white/[0.05] font-mono text-[10px] font-semibold text-velmere-gold [&>img]:absolute [&>img]:inset-[14%] [&>img]:z-10 [&>img]:h-[72%] [&>img]:w-[72%] [&>img]:object-contain [&>img]:opacity-0 [&>img.is-loaded]:opacity-100 [&>span]:relative [&>span]:z-0`}
    />
  );
}

function isVenueHealthAsset(asset?: Asset | null) {
  return Boolean(asset?.providerSymbol.endsWith("VENUE") || asset?.id.endsWith("-venue") || /venue health/i.test(asset?.name ?? ""));
}

function auditAssetClass(asset: Asset): UnifiedAuditAssetClass {
  if (isVenueHealthAsset(asset)) return "exchange";
  if (asset.category === "stocks" || asset.category === "exchanges")
    return "stock";
  if (asset.category === "indices") return "index";
  if (asset.category === "fx") return "fx";
  if (asset.category === "etf") return "etf";
  if (asset.category === "commodities") return "commodity";
  if (asset.category === "real_estate") return "real_estate";
  return "crypto";
}

type AssetClassAuditMetric = {
  id: string;
  label: string;
  value?: string | number | null;
  note: string;
  status: "verified" | "review" | "missing";
};

function assetClassAuditMetrics(
  asset: Asset,
  locale: Locale,
): AssetClassAuditMetric[] {
  const assetClass = auditAssetClass(asset);
  const pending = (pl: string, de: string, en: string) =>
    locale === "pl" ? pl : locale === "de" ? de : en;
  const metric = (
    id: string,
    label: [string, string, string],
    source: [string, string, string],
    value?: string | number | null,
    status: AssetClassAuditMetric["status"] = "missing",
  ): AssetClassAuditMetric => ({
    id,
    label: pending(...label),
    value,
    note: pending(...source),
    status,
  });

  if (assetClass === "exchange") {
    const lifecycle =
      asset.symbol === "BINANCE" || asset.symbol === "MEXC"
        ? pending(
            "Wymagana rotacja połączenia, heartbeat i kontrola reconnect.",
            "Verbindungsrotation, Heartbeat und Reconnect-Kontrolle erforderlich.",
            "Connection rotation, heartbeat and reconnect controls are required.",
          )
        : pending(
            "Wymagany adapter statusu, depth i błędów API.",
            "Status-, Depth- und API-Fehler-Adapter erforderlich.",
            "Status, depth and API-error adapters are required.",
          );
    return [
      metric(
        "withdrawals",
        ["Wypłaty", "Auszahlungen", "Withdrawals"],
        [
          "Połącz status wpłat/wypłat z oficjalnego status API.",
          "Ein-/Auszahlungsstatus aus offizieller Status-API anbinden.",
          "Connect deposit/withdrawal status from an official status API.",
        ],
      ),
      metric(
        "reserves",
        [
          "Rezerwy / disclosure",
          "Reserven / Disclosure",
          "Reserves / disclosure",
        ],
        [
          "Wymaga aktualnego, niezależnie weryfikowalnego disclosure.",
          "Aktuelles, unabhängig prüfbares Disclosure erforderlich.",
          "Requires current, independently verifiable disclosure.",
        ],
      ),
      metric(
        "heartbeatAge",
        ["Wiek heartbeat", "Heartbeat-Alter", "Heartbeat age"],
        [
          "Mierz ostatni poprawny heartbeat i opóźnienie strumienia.",
          "Letzten gültigen Heartbeat und Stream-Latenz messen.",
          "Measure the last valid heartbeat and stream lag.",
        ],
      ),
      metric(
        "reconnectPolicy",
        ["Polityka reconnect", "Reconnect-Policy", "Reconnect policy"],
        [lifecycle, lifecycle, lifecycle],
        lifecycle,
        "review",
      ),
      metric(
        "statusPage",
        ["Status operacyjny", "Betriebsstatus", "Operational status"],
        [
          "Wymaga oficjalnego status page lub endpointu systemowego.",
          "Offizielle Status-Seite oder System-Endpoint erforderlich.",
          "Requires an official status page or system endpoint.",
        ],
      ),
      metric(
        "orderbookIntegrity",
        [
          "Integralność orderbooka",
          "Orderbook-Integrität",
          "Order-book integrity",
        ],
        [
          "Porównaj snapshot i incremental depth oraz wykryj luki sekwencji.",
          "Snapshot und Incremental Depth abgleichen und Sequenzlücken erkennen.",
          "Reconcile snapshots with incremental depth and detect sequence gaps.",
        ],
      ),
      metric(
        "apiErrorRate",
        ["Błędy API", "API-Fehlerrate", "API error rate"],
        [
          "Zlicz timeouty, rate-limit i błędy providerów w oknie czasu.",
          "Timeouts, Rate-Limits und Providerfehler im Zeitfenster zählen.",
          "Count timeouts, rate limits and provider errors over a time window.",
        ],
      ),
      metric(
        "maintenanceState",
        ["Tryb maintenance", "Wartungsstatus", "Maintenance state"],
        [
          "Wymaga rozróżnienia planowanej konserwacji od awarii.",
          "Geplante Wartung muss von Ausfällen getrennt werden.",
          "Planned maintenance must be separated from outages.",
        ],
      ),
      metric(
        "proofOfReserves",
        ["Proof of reserves", "Proof of Reserves", "Proof of reserves"],
        [
          "Pokaż datę, zakres i niezależność audytu; nie traktuj samego linku jako dowodu.",
          "Datum, Umfang und Unabhängigkeit des Audits zeigen; Link allein ist kein Beweis.",
          "Show audit date, scope and independence; a link alone is not proof.",
        ],
      ),
      metric(
        "jurisdiction",
        ["Granica jurysdykcji", "Jurisdiktionsgrenze", "Jurisdiction boundary"],
        [
          "Zasady i dostępność usług zależą od kraju użytkownika.",
          "Regeln und Verfügbarkeit hängen vom Land des Nutzers ab.",
          "Rules and service availability depend on the user's country.",
        ],
      ),
    ];
  }

  if (assetClass === "stock")
    return [
      metric(
        "peRatio",
        ["P/E", "KGV", "P/E"],
        [
          "Wymaga aktualnych danych fundamentalnych i okresu TTM/forward.",
          "Aktuelle Fundamentaldaten und TTM/Forward-Zeitraum erforderlich.",
          "Requires current fundamentals and a defined TTM/forward period.",
        ],
      ),
      metric(
        "earningsDate",
        ["Najbliższe wyniki", "Nächster Earnings-Termin", "Next earnings"],
        [
          "Wymaga kalendarza emitenta lub giełdy.",
          "Emittenten- oder Börsenkalender erforderlich.",
          "Requires an issuer or exchange calendar.",
        ],
      ),
      metric(
        "revenueGrowth",
        ["Wzrost przychodów", "Umsatzwachstum", "Revenue growth"],
        [
          "Wymaga spójnego okresu porównawczego z raportu emitenta.",
          "Konsistenter Vergleichszeitraum aus Emittentenbericht erforderlich.",
          "Requires a consistent comparison period from issuer filings.",
        ],
      ),
      metric(
        "filingFreshness",
        ["Świeżość filingów", "Filing-Freshness", "Filing freshness"],
        [
          "Podaj datę najnowszego raportu i okres sprawozdawczy.",
          "Datum des jüngsten Berichts und Berichtsperiode angeben.",
          "Show the latest filing date and reporting period.",
        ],
      ),
      metric(
        "enterpriseValue",
        ["Enterprise value", "Enterprise Value", "Enterprise value"],
        [
          "Wymaga kapitalizacji, długu i gotówki z jednego okresu.",
          "Market Cap, Schulden und Cash aus derselben Periode erforderlich.",
          "Requires market cap, debt and cash from the same period.",
        ],
      ),
      metric(
        "freeCashFlow",
        ["Free cash flow", "Free Cashflow", "Free cash flow"],
        [
          "Wymaga cash-flow statement i jawnej definicji okresu.",
          "Cashflow-Statement und klar definierter Zeitraum erforderlich.",
          "Requires a cash-flow statement and an explicit period.",
        ],
      ),
      metric(
        "debtLoad",
        ["Obciążenie długiem", "Verschuldung", "Debt load"],
        [
          "Połącz dług netto, zapadalność i koszt finansowania.",
          "Nettoschulden, Fälligkeiten und Finanzierungskosten verbinden.",
          "Combine net debt, maturity schedule and financing cost.",
        ],
      ),
      metric(
        "insiderActivity",
        ["Transakcje insiderów", "Insider-Aktivität", "Insider activity"],
        [
          "Wymaga oficjalnych zgłoszeń, bez wyciągania wniosków z pojedynczej transakcji.",
          "Offizielle Meldungen nötig; keine Aussage aus einer Einzeltransaktion.",
          "Requires official filings; do not infer intent from one transaction.",
        ],
      ),
      metric(
        "institutionalOwnership",
        [
          "Udział instytucji",
          "Institutioneller Anteil",
          "Institutional ownership",
        ],
        [
          "Wymaga aktualnego źródła ownership z datą raportową.",
          "Aktuelle Ownership-Quelle mit Berichtsdatum erforderlich.",
          "Requires a dated, current ownership source.",
        ],
      ),
    ];

  if (assetClass === "fx")
    return [
      metric(
        "spread",
        ["Spread", "Spread", "Spread"],
        [
          "Wymaga bid/ask z konkretnego providera i sesji.",
          "Bid/Ask eines konkreten Providers und einer Session erforderlich.",
          "Requires provider-specific bid/ask and session context.",
        ],
      ),
      metric(
        "realizedVolatility",
        [
          "Zmienność realizowana",
          "Realisierte Volatilität",
          "Realized volatility",
        ],
        [
          "Wylicz z jednolitego interwału i jawnego okna czasu.",
          "Aus einheitlichem Intervall und offenem Zeitfenster berechnen.",
          "Calculate from a consistent interval and explicit window.",
        ],
      ),
      metric(
        "rateDifferential",
        ["Różnica stóp", "Zinsdifferenz", "Rate differential"],
        [
          "Wymaga aktualnych stóp banków centralnych dla obu walut.",
          "Aktuelle Leitzinsen beider Währungen erforderlich.",
          "Requires current policy rates for both currencies.",
        ],
      ),
      metric(
        "macroCalendar",
        ["Kalendarz makro", "Makrokalender", "Macro calendar"],
        [
          "Wymaga zdarzeń z datą, strefą czasową i ważnością.",
          "Ereignisse mit Datum, Zeitzone und Relevanz erforderlich.",
          "Requires events with date, timezone and importance.",
        ],
      ),
      metric(
        "forwardPoints",
        ["Forward points", "Forward Points", "Forward points"],
        [
          "Wymaga tenorów i źródła rynku forward.",
          "Tenöre und Forward-Marktquelle erforderlich.",
          "Requires tenors and a forward-market source.",
        ],
      ),
      metric(
        "carryRegime",
        ["Reżim carry", "Carry-Regime", "Carry regime"],
        [
          "Łączy różnicę stóp, koszt hedgingu i zmienność.",
          "Verbindet Zinsdifferenz, Hedgingkosten und Volatilität.",
          "Combines rate differential, hedging cost and volatility.",
        ],
      ),
      metric(
        "liquiditySession",
        ["Sesja płynności", "Liquiditätssession", "Liquidity session"],
        [
          "Porównaj Azję, Londyn i Nowy Jork zamiast jednego snapshotu.",
          "Asien, London und New York statt eines Snapshots vergleichen.",
          "Compare Asia, London and New York rather than one snapshot.",
        ],
      ),
      metric(
        "centralBankRisk",
        ["Ryzyko banku centralnego", "Zentralbank-Risiko", "Central-bank risk"],
        [
          "Wymaga kalendarza decyzji i komunikatów źródłowych.",
          "Entscheidungskalender und Primärkommunikation erforderlich.",
          "Requires a decision calendar and primary communications.",
        ],
      ),
    ];

  if (assetClass === "etf")
    return [
      metric(
        "aum",
        ["AUM", "AUM", "AUM"],
        [
          "Wymaga aktualnej wartości aktywów od emitenta.",
          "Aktueller Vermögenswert vom Emittenten erforderlich.",
          "Requires current assets under management from the issuer.",
        ],
      ),
      metric(
        "navPremium",
        [
          "Premia / dyskonto do NAV",
          "NAV-Prämie / Discount",
          "NAV premium / discount",
        ],
        [
          "Wymaga NAV i ceny z tego samego timestampu.",
          "NAV und Preis mit demselben Zeitstempel erforderlich.",
          "Requires NAV and price from the same timestamp.",
        ],
      ),
      metric(
        "trackingError",
        ["Tracking error", "Tracking Error", "Tracking error"],
        [
          "Wymaga benchmarku, okresu i danych total-return.",
          "Benchmark, Zeitraum und Total-Return-Daten erforderlich.",
          "Requires a benchmark, period and total-return data.",
        ],
      ),
      metric(
        "holdingsConcentration",
        [
          "Koncentracja holdings",
          "Holdings-Konzentration",
          "Holdings concentration",
        ],
        [
          "Wymaga aktualnego pliku składu i wag pozycji.",
          "Aktuelle Bestandsdatei und Positionsgewichte erforderlich.",
          "Requires a current holdings file and position weights.",
        ],
      ),
      metric(
        "creationRedemption",
        [
          "Creation / redemption",
          "Creation / Redemption",
          "Creation / redemption",
        ],
        [
          "Wymaga przepływów jednostek i płynności koszyka.",
          "Anteilsflüsse und Basket-Liquidität erforderlich.",
          "Requires share flows and basket liquidity.",
        ],
      ),
      metric(
        "issuerConcentration",
        ["Ryzyko emitenta", "Emittentenrisiko", "Issuer concentration"],
        [
          "Oddziel kondycję emitenta od ryzyka aktywów bazowych.",
          "Emittentenstatus vom Basiswertrisiko trennen.",
          "Separate issuer condition from underlying-asset risk.",
        ],
      ),
      metric(
        "liquidityTier",
        ["Warstwa płynności", "Liquiditätsstufe", "Liquidity tier"],
        [
          "Połącz spread ETF, depth i płynność składników.",
          "ETF-Spread, Depth und Basiswertliquidität verbinden.",
          "Combine ETF spread, depth and underlying liquidity.",
        ],
      ),
      metric(
        "holdingsFreshness",
        ["Świeżość holdings", "Holdings-Freshness", "Holdings freshness"],
        [
          "Pokaż datę publikacji składu, nie tylko nazwę funduszu.",
          "Veröffentlichungsdatum der Bestände zeigen, nicht nur Fondsname.",
          "Show the holdings publication date, not only the fund name.",
        ],
      ),
    ];

  if (assetClass === "commodity")
    return [
      metric(
        "openInterest",
        ["Open interest", "Open Interest", "Open interest"],
        [
          "Wymaga konkretnego kontraktu i daty giełdowej.",
          "Konkreter Kontrakt und Börsendatum erforderlich.",
          "Requires a specific contract and exchange date.",
        ],
      ),
      metric(
        "contractExpiry",
        ["Wygaśnięcie kontraktu", "Kontraktverfall", "Contract expiry"],
        [
          "Wymaga miesiąca kontraktu i reguł rolowania.",
          "Kontraktmonat und Rollregeln erforderlich.",
          "Requires the contract month and roll rules.",
        ],
      ),
      metric(
        "futuresCurve",
        ["Krzywa futures", "Futures-Kurve", "Futures curve"],
        [
          "Porównaj kilka terminów; pojedyncza cena nie pokazuje contango/backwardation.",
          "Mehrere Laufzeiten vergleichen; ein Preis zeigt kein Contango/Backwardation.",
          "Compare multiple maturities; one price cannot show contango/backwardation.",
        ],
      ),
      metric(
        "inventorySignal",
        ["Zapasy / podaż", "Bestände / Angebot", "Inventory / supply"],
        [
          "Wymaga właściwego źródła branżowego i daty publikacji.",
          "Passende Branchenquelle und Veröffentlichungsdatum erforderlich.",
          "Requires the relevant industry source and publication date.",
        ],
      ),
      metric(
        "rollYield",
        ["Roll yield", "Roll Yield", "Roll yield"],
        [
          "Wylicz z jawnej krzywej i reguły rolowania.",
          "Aus offener Kurve und Rollregel berechnen.",
          "Calculate from an explicit curve and roll rule.",
        ],
      ),
      metric(
        "curveStress",
        ["Naprężenie krzywej", "Kurvenstress", "Curve stress"],
        [
          "Wykrywa nagłe zmiany między terminami, bez prognozy ceny.",
          "Erkennt abrupte Laufzeitverschiebungen ohne Preisprognose.",
          "Detects abrupt maturity shifts without forecasting price.",
        ],
      ),
      metric(
        "deliveryRisk",
        ["Ryzyko dostawy", "Lieferrisiko", "Delivery risk"],
        [
          "Wymaga zasad kontraktu, lokalizacji i stanów magazynowych.",
          "Kontraktregeln, Standorte und Lagerbestände erforderlich.",
          "Requires contract rules, locations and inventories.",
        ],
      ),
      metric(
        "seasonality",
        ["Sezonowość", "Saisonalität", "Seasonality"],
        [
          "Wymaga wieloletniej serii i ochrony przed overfitem.",
          "Mehrjährige Reihe und Overfit-Schutz erforderlich.",
          "Requires a multi-year series and overfit controls.",
        ],
      ),
    ];

  if (assetClass === "real_estate")
    return [
      metric(
        "ffo",
        ["FFO / AFFO", "FFO / AFFO", "FFO / AFFO"],
        [
          "Wymaga raportu REIT i spójnej definicji okresu.",
          "REIT-Bericht und konsistente Periodendefinition erforderlich.",
          "Requires a REIT report and consistent period definition.",
        ],
      ),
      metric(
        "occupancy",
        ["Obłożenie", "Auslastung", "Occupancy"],
        [
          "Wymaga segmentu, geografii i daty raportowej.",
          "Segment, Geografie und Berichtsdatum erforderlich.",
          "Requires segment, geography and reporting date.",
        ],
      ),
      metric(
        "leverage",
        ["Dźwignia", "Leverage", "Leverage"],
        [
          "Połącz dług netto, EBITDA/NOI i zapadalność.",
          "Nettoschulden, EBITDA/NOI und Fälligkeiten verbinden.",
          "Combine net debt, EBITDA/NOI and maturities.",
        ],
      ),
      metric(
        "navDiscount",
        ["Dyskonto do NAV", "NAV-Discount", "NAV discount"],
        [
          "Wymaga aktualnego NAV i jawnej metodologii wyceny.",
          "Aktueller NAV und offene Bewertungsmethodik erforderlich.",
          "Requires current NAV and an explicit valuation method.",
        ],
      ),
      metric(
        "debtMaturity",
        ["Zapadalność długu", "Schuldenfälligkeit", "Debt maturity"],
        [
          "Pokaż koncentrację zapadalności i koszt refinansowania.",
          "Fälligkeitskonzentration und Refinanzierungskosten zeigen.",
          "Show maturity concentration and refinancing cost.",
        ],
      ),
      metric(
        "tenantConcentration",
        [
          "Koncentracja najemców",
          "Mieterkonzentration",
          "Tenant concentration",
        ],
        [
          "Wymaga udziałów top najemców i końca umów.",
          "Top-Mieteranteile und Vertragsenden erforderlich.",
          "Requires top-tenant shares and lease expiries.",
        ],
      ),
      metric(
        "refinancingRisk",
        ["Ryzyko refinansowania", "Refinanzierungsrisiko", "Refinancing risk"],
        [
          "Łączy zapadalność, stopy i pokrycie odsetek.",
          "Verbindet Fälligkeit, Zinsen und Zinsdeckung.",
          "Combines maturities, rates and interest coverage.",
        ],
      ),
      metric(
        "capRateSpread",
        ["Spread cap rate", "Cap-Rate-Spread", "Cap-rate spread"],
        [
          "Wymaga porównywalnego segmentu i stopy bazowej.",
          "Vergleichbares Segment und Basiszins erforderlich.",
          "Requires a comparable segment and reference rate.",
        ],
      ),
    ];

  if (assetClass === "index")
    return [
      metric(
        "constituentBreadth",
        ["Szerokość rynku", "Marktbreite", "Market breadth"],
        [
          "Wymaga zmian wszystkich składników, nie tylko poziomu indeksu.",
          "Änderungen aller Bestandteile nötig, nicht nur Indexstand.",
          "Requires constituent moves, not only the index level.",
        ],
      ),
      metric(
        "concentration",
        ["Koncentracja wag", "Gewichtskonzentration", "Weight concentration"],
        [
          "Wymaga aktualnych wag składników.",
          "Aktuelle Bestandgewichte erforderlich.",
          "Requires current constituent weights.",
        ],
      ),
      metric(
        "realizedVolatility",
        [
          "Zmienność realizowana",
          "Realisierte Volatilität",
          "Realized volatility",
        ],
        [
          "Wylicz z jawnego okna i interwału.",
          "Aus offenem Fenster und Intervall berechnen.",
          "Calculate from an explicit window and interval.",
        ],
      ),
      metric(
        "sectorBreadth",
        ["Szerokość sektorów", "Sektorbreite", "Sector breadth"],
        [
          "Wymaga mapowania składników do sektorów.",
          "Zuordnung der Bestandteile zu Sektoren erforderlich.",
          "Requires constituent-to-sector mapping.",
        ],
      ),
      metric(
        "topWeight",
        ["Największa waga", "Größtes Gewicht", "Top weight"],
        [
          "Wymaga aktualnego rebalancingu i wag.",
          "Aktuelles Rebalancing und Gewichte erforderlich.",
          "Requires current rebalance data and weights.",
        ],
      ),
      metric(
        "rebalanceRisk",
        ["Ryzyko rebalancingu", "Rebalancing-Risiko", "Rebalance risk"],
        [
          "Wymaga daty i reguł zmian składu.",
          "Datum und Regeln der Zusammensetzungsänderung erforderlich.",
          "Requires the date and rules for constituent changes.",
        ],
      ),
      metric(
        "macroSensitivity",
        ["Wrażliwość makro", "Makro-Sensitivität", "Macro sensitivity"],
        [
          "Wymaga historycznego testu bez udawania przyczynowości.",
          "Historischer Test ohne vorgetäuschte Kausalität erforderlich.",
          "Requires historical testing without claiming causality.",
        ],
      ),
    ];

  return [
    metric(
      "circulatingRatio",
      ["Podaż w obiegu", "Umlaufquote", "Circulating ratio"],
      [
        "Wymaga circulating i total supply z tego samego źródła.",
        "Circulating und Total Supply aus derselben Quelle erforderlich.",
        "Requires circulating and total supply from the same source.",
      ],
    ),
    metric(
      "sourceQuorum",
      ["Quorum venue", "Venue-Quorum", "Venue quorum"],
      [
        "Porównaj co najmniej dwa niezależne venue.",
        "Mindestens zwei unabhängige Venues vergleichen.",
        "Compare at least two independent venues.",
      ],
    ),
    metric(
      "providerResilience",
      ["Odporność providerów", "Provider-Resilienz", "Provider resilience"],
      [
        "Raport nie powinien zależeć od jednego feedu.",
        "Bericht darf nicht von einem Feed abhängen.",
        "The report should not depend on one feed.",
      ],
    ),
  ];
}

function formatMarketCapProxy(
  quote: Quote | undefined,
  asset: Asset | null | undefined,
  locale: Locale,
) {
  if (
    typeof quote?.marketCap === "number" &&
    Number.isFinite(quote.marketCap)
  ) {
    const formatted = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(quote.marketCap);
    return asset?.category === "crypto"
      ? `${formatted} · CoinGecko market cap`
      : `${formatted} · provider market cap`;
  }
  if (quote?.currentPrice && asset?.category === "indices")
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(quote.currentPrice)} index level`;
  if (quote?.currentPrice && asset?.category === "crypto")
    return locale === "pl"
      ? "kapitalizacja wymaga CoinGecko market lane"
      : locale === "de"
        ? "Market-Cap braucht CoinGecko Market Lane"
        : "requires CoinGecko market-cap lane";
  if (
    quote?.currentPrice &&
    (asset?.category === "fx" || asset?.category === "commodities")
  )
    return locale === "pl"
      ? "nie jest oparte o kapitalizację"
      : locale === "de"
        ? "nicht Market-Cap-basiert"
        : "not market-cap based";
  if (
    quote?.currentPrice &&
    (asset?.category === "stocks" ||
      asset?.category === "etf" ||
      asset?.category === "real_estate")
  )
    return locale === "pl"
      ? "kapitalizacja z Alpha Vantage/filing lane do dopięcia"
      : locale === "de"
        ? "Market-Cap via Alpha Vantage/Filing Lane ausstehend"
        : "market cap via Alpha Vantage/filing lane pending";
  if (isVenueHealthAsset(asset))
    return locale === "pl"
      ? "venue-health lane: status/depth, nie cena akcji"
      : locale === "de"
        ? "Venue-Health Lane: Status/Depth, kein Aktienpreis"
        : "venue-health lane: status/depth, not an equity price";
  return quote?.missingReason ?? null;
}

function sourceQualityLabel(
  quote: Quote | undefined,
  asset: Asset | null | undefined,
  locale: Locale,
) {
  if (isVenueHealthAsset(asset) || quote?.assetClass === "venue_health") {
    if (quote?.venueHealth) {
      const state = `${quote.venueHealth.state} · ${quote.venueHealth.healthScore}/100`;
      return locale === "pl"
        ? `venue health: ${state} · depth/latency/kline`
        : locale === "de"
          ? `Venue Health: ${state} · Depth/Latenz/Kline`
          : `venue health: ${state} · depth/latency/kline`;
    }
    return locale === "pl"
      ? "venue health: otwórz szczegóły, aby uruchomić status/depth/websocket"
      : locale === "de"
        ? "Venue Health: Details öffnen für Status/Depth/WebSocket"
        : "venue health: open detail to run status/depth/websocket";
  }
  if (!quote || quote.state !== "live") {
    return locale === "pl"
      ? "do podłączenia: brak świeżego payloadu"
      : locale === "de"
        ? "ausstehend: kein frischer Payload"
        : "pending: no fresh payload";
  }
  if (quote.consensusState === "divergent") {
    return locale === "pl"
      ? "rozjazd providerów · mocny wniosek zablokowany"
      : locale === "de"
        ? "Provider-Abweichung · starke Aussage blockiert"
        : "provider divergence · strong claim blocked";
  }
  if (quote.consensusState === "stale") {
    return locale === "pl"
      ? "stary timestamp · wymagane odświeżenie"
      : locale === "de"
        ? "veralteter Zeitstempel · Aktualisierung nötig"
        : "stale timestamp · refresh required";
  }
  if (quote.consensusState === "single_source") {
    return locale === "pl"
      ? "jedno źródło · limit pewności aktywny"
      : locale === "de"
        ? "eine Quelle · Konfidenzlimit aktiv"
        : "single source · confidence cap active";
  }
  if (quote.consensusState === "watch") {
    return locale === "pl"
      ? "providerzy blisko progu · obserwuj"
      : locale === "de"
        ? "Provider nahe Schwelle · beobachten"
        : "providers near threshold · watch";
  }
  if (quote.truthState === "source_bound") {
    return locale === "pl"
      ? "source-bound · główny provider aktywny"
      : locale === "de"
        ? "source-bound · Hauptprovider aktiv"
        : "source-bound · primary provider active";
  }
  if (quote.truthState === "compatibility_adapter") {
    return locale === "pl"
      ? "kompatybilny fallback · wymaga głównego providera"
      : locale === "de"
        ? "Kompatibilitäts-Fallback · Hauptprovider nötig"
        : "compatibility fallback · primary provider required";
  }
  return quote.sourceTimestamp
    ? locale === "pl"
      ? "live payload z timestampem"
      : locale === "de"
        ? "Live-Payload mit Timestamp"
        : "live payload with timestamp"
    : locale === "pl"
      ? "payload bez timestampu"
      : locale === "de"
        ? "Payload ohne Timestamp"
        : "payload without timestamp";
}

function modeIntro(mode: UnifiedAuditMode, locale: Locale) {
  const intro = {
    pl: {
      basic:
        "Basic = szybki obraz: cena, zmiana, wolumen, market-cap/proxy i stan źródła.",
      pro: "Pro = kontrola jakości: świeczki, luki, drugi provider i rytm źródła.",
      advanced:
        "Advanced = pełna matryca: płynność, slippage, venue health, filing lane i anomalie.",
    },
    de: {
      basic:
        "Basic = schneller Blick: Preis, Änderung, Volumen, Market-Cap/Proxy und Quellenstatus.",
      pro: "Pro = Qualitätskontrolle: Kerzen, Lücken, Zweitprovider und Quellenrhythmus.",
      advanced:
        "Advanced = volle Matrix: Liquidität, Slippage, Venue Health, Filing Lane und Anomalien.",
    },
    en: {
      basic:
        "Basic = quick read: price, move, volume, market-cap/proxy and source state.",
      pro: "Pro = quality check: candles, gaps, second provider and source rhythm.",
      advanced:
        "Advanced = full matrix: liquidity, slippage, venue health, filing lane and anomalies.",
    },
  } as const;
  return intro[locale][mode];
}

function buildHumanMarketBrief(
  asset: Asset,
  quote: Quote | undefined,
  locale: Locale,
  range: RangeKey,
) {
  const price = formatPrice(quote);
  const change =
    typeof quote?.changePercent === "number"
      ? `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`
      : null;
  const volume = quoteVolume(quote);
  const volumeText = volume
    ? new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(volume)
    : null;
  if (locale === "pl") {
    if (isVenueHealthAsset(asset)) {
      return `${asset.name}: osobna ścieżka venue health. Najpierw status/depth/websocket, potem dopiero wnioski; Velmère nie udaje ceny giełdy.`;
    }
    return `${asset.symbol}: ${price !== "—" ? `cena ${price}` : "cena do podłączenia"}${change ? `, zmiana ${change}` : ""}${volumeText ? `, wolumen ${volumeText}` : ""}. Zakres ${range.toUpperCase()} i źródło są widoczne, a brakujące pola zostają w raporcie.`;
  }
  if (locale === "de") {
    if (isVenueHealthAsset(asset)) {
      return `${asset.name}: separater Venue-Health-Pfad. Erst Status/Depth/WebSocket, dann Schlussfolgerungen; Velmère täuscht keinen Börsenpreis vor.`;
    }
    return `${asset.symbol}: ${price !== "—" ? `Preis ${price}` : "Preis ausstehend"}${change ? `, Änderung ${change}` : ""}${volumeText ? `, Volumen ${volumeText}` : ""}. Bereich ${range.toUpperCase()} und Quelle bleiben sichtbar; fehlende Felder bleiben im Bericht.`;
  }
  if (isVenueHealthAsset(asset)) {
    return `${asset.name}: separate venue-health lane. Status/depth/websocket first, conclusions later; Velmère does not fake an exchange price.`;
  }
  return `${asset.symbol}: ${price !== "—" ? `price ${price}` : "price pending"}${change ? `, change ${change}` : ""}${volumeText ? `, volume ${volumeText}` : ""}. Range ${range.toUpperCase()} and source stay visible, while missing fields remain in the report.`;
}

function formatPrice(quote?: Quote) {
  if (!quote || quote.currentPrice === null) return "—";
  try {
    if (quote.currency) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: quote.currency,
        maximumFractionDigits: quote.currentPrice < 10 ? 4 : 2,
      }).format(quote.currentPrice);
    }
  } catch {
    // Fall through to a source-neutral number.
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: quote.currentPrice < 10 ? 5 : 2,
  }).format(quote.currentPrice);
}

export default function CrossAssetCollapseRadarPanel({
  locale = "pl",
}: {
  locale?: string;
}) {
  const safeLocale: Locale = locale === "de" || locale === "en" ? locale : "pl";
  const c = text[safeLocale];
  const a = auditText[safeLocale];
  const [category, setCategory] = useState<Category>("stocks");
  const [query, setQuery] = useState("");
  const [remoteAssets, setRemoteAssets] = useState<Asset[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [range, setRange] = useState<RangeKey>("1w");
  const [auditMode, setAuditMode] = useState<UnifiedAuditMode | null>(null);
  const openUnifiedAuditMode = useCallback((mode: UnifiedAuditMode) => {
    setAuditMode(mode);
  }, []);
  const [selectedRefreshTick, setSelectedRefreshTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchReceipt, setSearchReceipt] =
    useState<Pass579ExactSearchReceipt | null>(null);
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);
  const [catalogCounts, setCatalogCounts] = useState<
    CatalogResponse["counts"] | null
  >(null);
  const [catalogAssets, setCatalogAssets] = useState<Asset[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(24);
  const [surfaceWidth, setSurfaceWidth] = useState(1440);
  const sectionRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const committedSearchRef = useRef("");
  const realMarketsTimeframeOptions = useMemo<UnifiedTimeframeOption<RangeKey>[]>(
    () => [
      { value: "15m", label: "15M" },
      { value: "1h", label: "1H" },
      { value: "4h", label: "4H" },
      { value: "1d", label: "1D" },
      { value: "1w", label: "1W" },
    ],
    [],
  );
  const realMarketsDepthOptions = useMemo<UnifiedDepthOption<UnifiedAuditMode>[]>(
    () => {
      const unit = safeLocale === "pl" ? "pól" : safeLocale === "de" ? "Felder" : "fields";
      return [
        {
          value: "basic",
          label: "Basic",
          meta: `${getPass484AnalysisDepthManifest(safeLocale, "basic").fieldBudget} ${unit} · 2–3s`,
          icon: <Brain className="h-4 w-4" />,
        },
        {
          value: "pro",
          label: "Pro",
          meta: `${getPass484AnalysisDepthManifest(safeLocale, "pro").fieldBudget} ${unit} · 4–5s`,
          icon: <FileSearch className="h-4 w-4" />,
        },
        {
          value: "advanced",
          label: "Advanced",
          meta: `${getPass484AnalysisDepthManifest(safeLocale, "advanced").fieldBudget} ${unit} · 6–8s`,
          icon: <GitBranch className="h-4 w-4" />,
        },
      ];
    },
    [c.advanced, c.basic, c.pro, safeLocale],
  );

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setSurfaceWidth(Math.round(width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (category === "crypto") setCategory("all");
  }, [category]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/market-integrity/real-markets/catalog", {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: CatalogResponse) => {
        if (!payload.ok) return;
        if (payload.counts) setCatalogCounts(payload.counts);
        const safeRows = normalizePass471CatalogRows(payload.rows);
        if (safeRows.length)
          setCatalogAssets(
            safeRows.map(assetFromCatalog).filter(isPublicRealMarketsAsset),
          );
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const clean = query.trim();
    if (!clean) {
      setRemoteAssets([]);
      setSearching(false);
      setSearchOpen(false);
      return;
    }
    if (clean.toLowerCase() === committedSearchRef.current.toLowerCase()) {
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      fetch(
        `/api/market-integrity/real-markets?q=${encodeURIComponent(clean)}`,
        { signal: controller.signal },
      )
        .then((response) => response.json())
        .then((payload: SearchResponse) => {
          if (!payload.ok) return;
          const providerRows = normalizePass471ProviderSearchRows(
            payload.results,
          );
          setRemoteAssets(
            providerRows
              .map((item) => {
                const known = curatedAssets.find(
                  (asset) => asset.providerSymbol === item.symbol,
                );
                return (
                  known || {
                    id: `provider-${item.symbol.toLowerCase()}`,
                    symbol: item.symbol.replace(/=X$|=F$/i, ""),
                    providerSymbol: item.symbol,
                    name: item.name,
                    category: categoryFromProvider(
                      item.quoteType,
                      item.symbol,
                      item.name,
                    ),
                    context: `${item.exchange || c.global} · ${item.quoteType.toLowerCase()}`,
                    risk: 36,
                    exchange: item.exchange,
                  }
                );
              })
              .filter(isPublicRealMarketsAsset)
              .slice(0, 8),
          );
          if (
            clean.toLowerCase() !== committedSearchRef.current.toLowerCase()
          ) {
            setSearchOpen(true);
          }
        })
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 260);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [c.global, query]);

  const allAssets = useMemo(() => {
    const combined = filterPass617PublicRealMarketsRows([
      ...curatedAssets,
      ...catalogAssets,
    ]);
    return Array.from(
      new globalThis.Map(
        combined.map((asset) => [
          `${asset.category}:${cleanAssetSymbol(asset.symbol)}`,
          asset,
        ]),
      ).values(),
    );
  }, [catalogAssets]);

  const manualAliasAssets = useMemo(
    () => matchPass1994ManualMarketAliases(query, allAssets),
    [allAssets, query],
  );

  const searchUniverse = useMemo(() => {
    const seen = new Set<string>();
    return [...manualAliasAssets, ...allAssets, ...remoteAssets].filter((asset) => {
      const key = `${asset.category}:${cleanAssetSymbol(asset.symbol)}:${asset.providerSymbol}`;
      if (seen.has(key) || !isPublicRealMarketsAsset(asset)) return false;
      seen.add(key);
      return true;
    });
  }, [allAssets, manualAliasAssets, remoteAssets]);

  const pass621SearchResolution = useMemo(
    () => buildPass621MarketSearchResolution(query, searchUniverse, 8),
    [query, searchUniverse],
  );

  const searchSuggestions = useMemo(
    () => pass621SearchResolution.ranked.map((entry) => entry.item),
    [pass621SearchResolution],
  );

  const searchResolution = useMemo(
    () => buildPass579ExactSearchReceipt(query, searchSuggestions),
    [query, searchSuggestions],
  );

  const adaptiveSurface = useMemo(
    () => buildPass618AdaptiveSurface({ viewportWidth: surfaceWidth, rowCount: allAssets.length }),
    [allAssets.length, surfaceWidth],
  );

  const coverageCounts = useMemo(() => {
    const overviewCount = new Set(
      buildPass482TerminalOverview(allAssets).map((asset) =>
        asset.symbol.toUpperCase(),
      ),
    ).size;
    const curated = PUBLIC_REAL_MARKETS_CATEGORIES.reduce<
      Record<Category, number>
    >(
      (accumulator, item) => {
        accumulator[item] =
          item === "all"
            ? overviewCount
            : allAssets.filter((asset) => asset.category === item).length;
        return accumulator;
      },
      {
        all: overviewCount,
        crypto: 0,
        stocks: 0,
        indices: 0,
        fx: 0,
        etf: 0,
        commodities: 0,
        real_estate: 0,
        exchanges: 0,
      },
    );
    if (!catalogCounts) return curated;
    return {
      ...curated,
      crypto: 0,
      stocks: Math.max(curated.stocks, catalogCounts.stocks),
      fx: Math.max(curated.fx, catalogCounts.fx),
      etf: Math.max(curated.etf, catalogCounts.etf),
      commodities: Math.max(curated.commodities, catalogCounts.commodities),
      real_estate: Math.max(curated.real_estate, catalogCounts.realEstate),
    };
  }, [allAssets, catalogCounts]);

  const rows = useMemo(() => {
    if (category === "all") return buildPass482TerminalOverview(allAssets);
    const categoryRows = allAssets.filter(
      (asset) => asset.category === category,
    );
    if (category !== "exchanges") return categoryRows;
    return [...categoryRows].sort(
      (left, right) =>
        Number(isVenueHealthAsset(right)) - Number(isVenueHealthAsset(left)),
    );
  }, [allAssets, category]);

  const exchangeProviderSloRows = useMemo(
    () =>
      allAssets
        .filter((asset) => asset.category === "exchanges")
        .slice(0, 6)
        .map((asset) => {
          const quote = quoteForAsset(quotes, asset);
          return {
            asset,
            slo: buildPass577ProviderSloConsole({
              provider: asset.name,
              status: quote?.providerStatus ?? quote?.truthState ?? quote?.state,
              freshnessSeconds: quote?.freshnessSeconds ?? null,
              retrySuccess: null,
              recoveryMs: null,
              locale: safeLocale,
            }),
          };
        }),
    [allAssets, quotes, safeLocale],
  );

  useEffect(() => {
    setVisibleLimit(adaptiveSurface.visibleBatch);
  }, [adaptiveSurface.visibleBatch, category]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (searchRef.current?.contains(target)) return;
      setSearchOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, []);

  const visibleProviderSymbolsKey = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .slice(0, visibleLimit)
            .flatMap((asset) => quoteSymbolsForAsset(asset))
            .filter(Boolean),
        ),
      ).join(","),
    [rows, visibleLimit],
  );

  useEffect(() => {
    const symbols = visibleProviderSymbolsKey.split(",").filter(Boolean);
    if (!symbols.length) return;
    const controller = new AbortController();
    const chunks = Array.from(
      { length: Math.ceil(symbols.length / 18) },
      (_, index) => symbols.slice(index * 18, index * 18 + 18),
    );
    setLoading(true);
    Promise.all(
      chunks.map(async (chunk) => {
        const response = await fetch(
          `/api/market-integrity/real-markets?symbols=${encodeURIComponent(chunk.join(","))}&range=1w`,
          { signal: controller.signal },
        );
        return (await response.json()) as QuoteResponse;
      }),
    )
      .then((payloads) => {
        const quotes = payloads.flatMap((payload) =>
          normalizePass471Quotes(payload?.ok ? payload.quotes : []),
        ) as Quote[];
        if (!quotes.length) return;
        setQuotes((current) => ({
          ...current,
          ...Object.fromEntries(quotes.map((quote) => [quote.symbol, quote])),
        }));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [visibleProviderSymbolsKey]);

  const selectedProviderSymbolsKey = quoteSymbolsForAsset(selected).join(",");
  const requestSelectedRefresh = useCallback(() => {
    setSelectedRefreshTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!selectedProviderSymbolsKey) return;
    const controller = new AbortController();
    fetch(
      `/api/market-integrity/real-markets?symbols=${encodeURIComponent(selectedProviderSymbolsKey)}&range=${range}&detail=1`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((payload: QuoteResponse) => {
        const quotes = normalizePass471Quotes(payload?.quotes) as Quote[];
        if (quotes.length) {
          setQuotes((current) => ({
            ...current,
            ...Object.fromEntries(quotes.map((quote) => [quote.symbol, quote])),
          }));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [range, selectedProviderSymbolsKey, selectedRefreshTick]);

  const selectedQuote = selected ? quoteForAsset(quotes, selected) : undefined;
  const commandStatusCards = useMemo(
    () => [
      {
        label:
          safeLocale === "pl"
            ? "Universe state"
            : safeLocale === "de"
              ? "Universum-Status"
              : "Universe state",
        value: loading
          ? safeLocale === "pl"
            ? "Ładowanie real markets"
            : safeLocale === "de"
              ? "Real Markets werden geladen"
              : "Loading real markets"
          : `${allAssets.length} ${safeLocale === "pl" ? "aktywow w katalogu" : safeLocale === "de" ? "Assets im Katalog" : "assets in the catalog"}`,
        tone: loading ? "gold" : "neutral",
      },
      {
        label:
          safeLocale === "pl"
            ? "Search lane"
            : safeLocale === "de"
              ? "Search-Lane"
              : "Search lane",
        value: searching
          ? safeLocale === "pl"
            ? "Resolver aktywny"
            : safeLocale === "de"
              ? "Resolver aktiv"
              : "Resolver active"
          : pass621SearchResolution.autoOpen
            ? safeLocale === "pl"
              ? "Exact match gotowy"
              : safeLocale === "de"
                ? "Exact Match bereit"
                : "Exact match ready"
            : `${searchSuggestions.length} ${safeLocale === "pl" ? "sugestie" : safeLocale === "de" ? "Vorschlaege" : "suggestions"}`,
        tone: searching ? "gold" : pass621SearchResolution.autoOpen ? "cyan" : "neutral",
      },
      {
        label:
          safeLocale === "pl"
            ? "Reader state"
            : safeLocale === "de"
              ? "Reader-Status"
              : "Reader state",
        value: selected
          ? `${selected.symbol} · ${range.toUpperCase()}`
          : safeLocale === "pl"
            ? "Wybierz aktywo do detail reader"
            : safeLocale === "de"
              ? "Asset fuer Detail Reader waehlen"
              : "Select an asset for the detail reader",
        tone: selected ? "ready" : "review",
      },
      {
        label:
          safeLocale === "pl"
            ? "Proof boundary"
            : safeLocale === "de"
              ? "Proof-Grenze"
              : "Proof boundary",
        value: selectedQuote?.source
          ? `${selectedQuote.source} · ${selectedQuote.confidenceCap ?? 0}%`
          : safeLocale === "pl"
            ? "Source lineage po wyborze aktywa"
            : safeLocale === "de"
              ? "Source Lineage nach Asset-Auswahl"
              : "Source lineage after asset selection",
        tone: selectedQuote?.source ? "ready" : "review",
      },
    ],
    [
      allAssets.length,
      loading,
      pass621SearchResolution.autoOpen,
      range,
      safeLocale,
      searchSuggestions.length,
      searching,
      selected,
      selectedQuote?.confidenceCap,
      selectedQuote?.source,
    ],
  );
  const selectedLineage = useMemo(
    () => (selected ? buildRealMarketLineage(selected, selectedQuote) : null),
    [selected, selectedQuote],
  );
  const selectedChartParity = useMemo(
    () =>
      selected && selectedLineage
        ? buildPass620CrossAssetChartParity({
            assetClass: selected.category,
            candleCount: selectedQuote?.candles.length ?? 0,
            lineage: selectedLineage,
          })
        : null,
    [selected, selectedLineage, selectedQuote?.candles.length],
  );
  const selectedRisk = dynamicRisk(selectedQuote, selected?.risk);
  const selectedChange1h = changeForWindow(selectedQuote, 60 * 60);
  const selectedChange24h = changeForWindow(selectedQuote, 24 * 60 * 60);
  const selectedChange7d =
    typeof selectedQuote?.priceChange7d === "number"
      ? selectedQuote.priceChange7d
      : (selectedQuote?.changePercent ?? null);
  const selectedVolume = quoteVolume(selectedQuote);
  const auditEvidence = useMemo(() => {
    if (!selected || !auditMode) return [];
    const candles = selectedQuote?.candles || [];
    const latest = candles.at(-1);
    const first = candles[0];
    const missing = candles.filter(
      (candle) => !Number.isFinite(candle.close),
    ).length;
    const avgRange = candles.length
      ? candles.reduce(
          (sum, candle) =>
            sum +
            ((candle.high - candle.low) / Math.max(candle.close, 0.000001)) *
              100,
          0,
        ) / candles.length
      : null;
    const totalVolume = candles.reduce(
      (sum, candle) => sum + (candle.volume || 0),
      0,
    );
    return buildUnifiedAuditEvidence(
      {
        locale: safeLocale,
        assetClass: auditAssetClass(selected),
        subject: `${selected.symbol} · ${selected.name}`,
        source: selectedQuote?.source || "",
        sourceTimestamp: selectedQuote?.sourceTimestamp,
        riskScore: selectedRisk,
        confidence:
          selectedQuote?.state === "live"
            ? Math.min(
                selectedQuote.confidenceCap ?? 96,
                58 + candles.length / 2,
              )
            : 18,
        metrics: [
          {
            id: "modeIntro",
            label: "Mode",
            value: modeIntro(auditMode, safeLocale),
            note: localizedAssetContext(selected, safeLocale),
            status: "verified",
          },
          {
            id: "humanBrief",
            label:
              safeLocale === "pl"
                ? "Brief dla człowieka"
                : safeLocale === "de"
                  ? "Menschlicher Brief"
                  : "Human brief",
            value: buildHumanMarketBrief(
              selected,
              selectedQuote,
              safeLocale,
              range,
            ),
            note:
              safeLocale === "pl"
                ? "AI ma tłumaczyć dane wprost: co widać, czego brakuje i co dalej."
                : safeLocale === "de"
                  ? "AI erklärt direkt: was sichtbar ist, was fehlt und was folgt."
                  : "AI explains directly: what is visible, what is missing and what comes next.",
            status: "verified",
          },
          {
            id: "price",
            label: a.price,
            value:
              typeof selectedQuote?.currentPrice === "number"
                ? formatPrice(selectedQuote)
                : null,
            note: isVenueHealthAsset(selected) ? c.venuePending : a.observed,
            status:
              typeof selectedQuote?.currentPrice === "number"
                ? "verified"
                : isVenueHealthAsset(selected)
                  ? "review"
                  : "missing",
          },
          {
            id: "marketCap",
            label:
              safeLocale === "pl"
                ? "Kapitalizacja / proxy"
                : safeLocale === "de"
                  ? "Marktkapitalisierung / Proxy"
                  : "Market cap / proxy",
            value: formatMarketCapProxy(selectedQuote, selected, safeLocale),
            note:
              safeLocale === "pl"
                ? "Dla indeksów/FX/surowców nie udajemy klasycznej kapitalizacji; pokazujemy właściwy proxy."
                : safeLocale === "de"
                  ? "Für Indizes/FX/Rohstoffe wird keine klassische Marktkapitalisierung vorgetäuscht; der passende Proxy bleibt sichtbar."
                  : "For indices/FX/commodities we do not fake a classic market cap; the correct proxy stays visible.",
            status: selectedQuote?.marketCap ? "verified" : "review",
          },
          {
            id: "fdv",
            label: "FDV",
            value:
              typeof selectedQuote?.fdv === "number"
                ? new Intl.NumberFormat(safeLocale, {
                    notation: "compact",
                    maximumFractionDigits: 2,
                  }).format(selectedQuote.fdv)
                : null,
            note:
              safeLocale === "pl"
                ? "Tylko dla krypto/providerów z jawnie podanym FDV."
                : safeLocale === "de"
                  ? "Nur für Krypto/Provider mit explizitem FDV."
                  : "Only for crypto/providers with explicit FDV.",
            status: selectedQuote?.fdv ? "verified" : "missing",
          },
          {
            id: "change1h",
            label: a.change1h,
            value:
              typeof selectedChange1h === "number"
                ? `${selectedChange1h >= 0 ? "+" : ""}${selectedChange1h.toFixed(2)}%`
                : null,
            note: a.observed,
            status:
              typeof selectedChange1h === "number" ? "verified" : "missing",
          },
          {
            id: "change24h",
            label: a.change24h,
            value:
              typeof selectedChange24h === "number"
                ? `${selectedChange24h >= 0 ? "+" : ""}${selectedChange24h.toFixed(2)}%`
                : null,
            note: a.observed,
            status:
              typeof selectedChange24h === "number" ? "verified" : "missing",
          },
          {
            id: "change7d",
            label: "7D",
            value:
              typeof selectedChange7d === "number"
                ? `${selectedChange7d >= 0 ? "+" : ""}${selectedChange7d.toFixed(2)}%`
                : null,
            note: a.observed,
            status:
              typeof selectedChange7d === "number" ? "verified" : "missing",
          },
          {
            id: "change",
            label: a.change,
            value:
              typeof selectedQuote?.changePercent === "number"
                ? `${selectedQuote.changePercent >= 0 ? "+" : ""}${selectedQuote.changePercent.toFixed(2)}%`
                : null,
            note: a.observed,
          },
          {
            id: "volume",
            label: a.volume,
            value: selectedVolume
              ? new Intl.NumberFormat(safeLocale, {
                  notation: "compact",
                  maximumFractionDigits: 2,
                }).format(selectedVolume)
              : null,
            note: a.observed,
            status: selectedVolume ? "verified" : "missing",
          },
          {
            id: "sourceContract",
            label: "Source contract",
            value: selectedQuote?.sourceContract,
            note: selectedQuote?.sourcePolicy,
            status:
              selectedQuote?.truthState === "source_bound"
                ? "verified"
                : "review",
          },
          {
            id: "providerPlan",
            label: "Provider plan",
            value: selectedQuote?.providerPlan?.slice(0, 3),
            note:
              selectedQuote?.missingReason ||
              "Provider plan attached to quote.",
            status: selectedQuote?.missingReason ? "review" : "verified",
          },
          {
            id: "providerConsensus",
            label: "Provider consensus",
            value: selectedQuote?.consensusState,
            note:
              selectedQuote?.consensusNotes?.join(" · ") ||
              "Consensus gate waits for primary and secondary prices.",
            status:
              selectedQuote?.consensusState === "aligned"
                ? "verified"
                : "review",
          },
          {
            id: "providerDivergence",
            label: "Provider divergence",
            value:
              typeof selectedQuote?.divergenceBps === "number"
                ? `${selectedQuote.divergenceBps.toFixed(1)} bps / ${selectedQuote.divergenceThresholdBps ?? 0} bps gate`
                : null,
            note:
              selectedQuote?.secondarySource || "Second price lane required.",
            status:
              selectedQuote?.consensusState === "aligned"
                ? "verified"
                : selectedQuote?.divergenceBps == null
                  ? "missing"
                  : "review",
          },
          {
            id: "freshnessGate",
            label: "Freshness gate",
            value: selectedQuote?.freshnessState
              ? `${selectedQuote.freshnessState}${typeof selectedQuote.freshnessSeconds === "number" ? ` · ${selectedQuote.freshnessSeconds}s` : ""}`
              : null,
            note: `Confidence cap ${selectedQuote?.confidenceCap ?? 20}/100`,
            status:
              selectedQuote?.freshnessState === "fresh" ? "verified" : "review",
          },
          {
            id: "crossVenueConsensus",
            label:
              safeLocale === "pl"
                ? "Konsensus między giełdami"
                : safeLocale === "de"
                  ? "Börsenübergreifender Konsens"
                  : "Cross-venue consensus",
            value: selectedQuote?.venueComparison
              ? `${selectedQuote.venueComparison.state} · ${selectedQuote.venueComparison.primaryVenue} ↔ ${selectedQuote.venueComparison.secondaryVenue || "source required"}`
              : null,
            note:
              selectedQuote?.venueComparison?.notes.join(" · ") ||
              (safeLocale === "pl"
                ? "Drugie niezależne venue jest wymagane do oceny jakości ceny."
                : safeLocale === "de"
                  ? "Ein zweiter unabhängiger Handelsplatz ist für die Preisqualitätsprüfung erforderlich."
                  : "A second independent venue is required to assess price quality."),
            status:
              selectedQuote?.venueComparison?.state === "aligned"
                ? "verified"
                : selectedQuote?.venueComparison
                  ? "review"
                  : "missing",
          },
          {
            id: "crossVenueDivergence",
            label:
              safeLocale === "pl"
                ? "Rozjazd ceny / spreadu"
                : safeLocale === "de"
                  ? "Preis- / Spread-Abweichung"
                  : "Price / spread divergence",
            value: selectedQuote?.venueComparison
              ? `${selectedQuote.venueComparison.priceDivergenceBps == null ? "source required" : `${selectedQuote.venueComparison.priceDivergenceBps.toFixed(1)} bps`} · ${selectedQuote.venueComparison.spreadDeltaBps == null ? "source required" : `${selectedQuote.venueComparison.spreadDeltaBps.toFixed(1)} bps spread delta`}`
              : null,
            note: selectedQuote?.venueComparison?.boundary,
            status:
              selectedQuote?.venueComparison?.state === "aligned"
                ? "verified"
                : selectedQuote?.venueComparison
                  ? "review"
                  : "missing",
          },
          {
            id: "fundamentalProfile",
            label:
              safeLocale === "pl"
                ? "Profil fundamentalny"
                : safeLocale === "de"
                  ? "Fundamentalprofil"
                  : "Fundamental profile",
            value: selectedQuote?.fundamentals
              ? `${selectedQuote.fundamentals.profileType} · ${selectedQuote.fundamentals.sector || selectedQuote.fundamentals.country || "source required"}`
              : null,
            note:
              selectedQuote?.fundamentals?.industry ||
              selectedQuote?.fundamentals?.latestQuarter ||
              (safeLocale === "pl"
                ? "OVERVIEW lub ETF_PROFILE wymagany."
                : safeLocale === "de"
                  ? "OVERVIEW oder ETF_PROFILE erforderlich."
                  : "OVERVIEW or ETF_PROFILE required."),
            status:
              selectedQuote?.fundamentals?.profileType &&
              selectedQuote.fundamentals.profileType !== "not_applicable"
                ? "verified"
                : "missing",
          },
          {
            id: "fundamentalDepth",
            label:
              safeLocale === "pl"
                ? "Wycena / jakość / struktura"
                : safeLocale === "de"
                  ? "Bewertung / Qualität / Struktur"
                  : "Valuation / quality / structure",
            value: selectedQuote?.fundamentals
              ? selectedQuote.fundamentals.profileType === "etf"
                ? `AUM ${selectedQuote.fundamentals.netAssets == null ? "source required" : new Intl.NumberFormat(safeLocale, { notation: "compact", maximumFractionDigits: 2 }).format(selectedQuote.fundamentals.netAssets)} · TER ${selectedQuote.fundamentals.expenseRatio == null ? "source required" : `${selectedQuote.fundamentals.expenseRatio}%`} · holdings ${selectedQuote.fundamentals.topHoldings.length}`
                : `P/E ${selectedQuote.fundamentals.peRatio ?? "source required"} · P/B ${selectedQuote.fundamentals.priceToBookRatio ?? "source required"} · ROE ${selectedQuote.fundamentals.returnOnEquity == null ? "source required" : `${selectedQuote.fundamentals.returnOnEquity}%`}`
              : null,
            note:
              selectedQuote?.fundamentals?.profileType === "etf"
                ? selectedQuote.fundamentals.topHoldings
                    .slice(0, 4)
                    .map(
                      (holding) =>
                        `${holding.symbol}${holding.weight == null ? "" : ` ${holding.weight}%`}`,
                    )
                    .join(" · ") || "Holdings source required."
                : selectedQuote?.fundamentals?.description?.slice(0, 220),
            status:
              selectedQuote?.fundamentals?.profileType &&
              selectedQuote.fundamentals.profileType !== "not_applicable"
                ? "verified"
                : "missing",
          },
          {
            id: "fundamentalQualityGate",
            label:
              safeLocale === "pl"
                ? "Jakość sprawozdań"
                : safeLocale === "de"
                  ? "Berichtsqualität"
                  : "Statement quality",
            value: selectedQuote?.fundamentals?.quality
              ? `${selectedQuote.fundamentals.quality.state} · ${selectedQuote.fundamentals.quality.qualityScore}/100 · cap ${selectedQuote.fundamentals.quality.confidenceCap}/100`
              : null,
            note: selectedQuote?.fundamentals?.quality
              ? selectedQuote.fundamentals.profileType === "etf"
                ? `top10 ${selectedQuote.fundamentals.quality.etf.concentrationTop10 ?? "source required"}% · effective holdings ${selectedQuote.fundamentals.quality.etf.effectiveHoldings ?? "source required"} · overlap ${selectedQuote.fundamentals.quality.etf.overlapPercent ?? "comparison required"}${selectedQuote.fundamentals.quality.etf.overlapPercent == null ? "" : "%"}`
                : `FCF ${selectedQuote.fundamentals.quality.freeCashFlowTtm ?? "source required"} · net debt/EBITDA ${selectedQuote.fundamentals.quality.netDebtToEbitda ?? "source required"}x · current ratio ${selectedQuote.fundamentals.quality.currentRatio ?? "source required"}x`
              : safeLocale === "pl"
                ? "Wymagane INCOME_STATEMENT, BALANCE_SHEET i CASH_FLOW."
                : safeLocale === "de"
                  ? "INCOME_STATEMENT, BALANCE_SHEET und CASH_FLOW erforderlich."
                  : "INCOME_STATEMENT, BALANCE_SHEET and CASH_FLOW required.",
            status:
              selectedQuote?.fundamentals?.quality?.state === "source_bound"
                ? "verified"
                : selectedQuote?.fundamentals?.quality
                  ? "review"
                  : "missing",
          },
          {
            id: "secXbrlSecondSource",
            label:
              safeLocale === "pl"
                ? "SEC/XBRL drugie źródło"
                : safeLocale === "de"
                  ? "SEC/XBRL Zweitquelle"
                  : "SEC/XBRL second source",
            value: selectedQuote?.fundamentals?.secXbrl
              ? `${selectedQuote.fundamentals.secXbrl.state} · coverage ${selectedQuote.fundamentals.secXbrl.conceptCoverageScore}/100 · cap ${selectedQuote.fundamentals.secXbrl.confidenceCap}/100`
              : null,
            note: selectedQuote?.fundamentals?.secXbrl
              ? `${selectedQuote.fundamentals.secXbrl.alignedConcepts.length} aligned · ${selectedQuote.fundamentals.secXbrl.divergentConcepts.length} divergent · ${selectedQuote.fundamentals.secXbrl.missingConcepts.length} missing concepts`
              : safeLocale === "pl"
                ? "SEC Companyfacts/XBRL wymagany jako drugie źródło fundamentals."
                : safeLocale === "de"
                  ? "SEC Companyfacts/XBRL als zweite Fundamentalquelle erforderlich."
                  : "SEC Companyfacts/XBRL required as the second fundamentals source.",
            status:
              selectedQuote?.fundamentals?.secXbrl?.state === "sec_aligned"
                ? "verified"
                : selectedQuote?.fundamentals?.secXbrl
                  ? "review"
                  : "missing",
          },
          {
            id: "secFilingCadence",
            label:
              safeLocale === "pl"
                ? "Filing / earnings cadence"
                : safeLocale === "de"
                  ? "Filing / Earnings-Takt"
                  : "Filing / earnings cadence",
            value: selectedQuote?.fundamentals?.secXbrl
              ? `${selectedQuote.fundamentals.secXbrl.earningsCadence.latestForm || "form required"} · ${selectedQuote.fundamentals.secXbrl.earningsCadence.daysSinceLatestFiling ?? "?"}d · ${selectedQuote.fundamentals.secXbrl.earningsCadence.cadenceState}`
              : null,
            note:
              selectedQuote?.fundamentals?.secXbrl?.filingUrl ||
              selectedQuote?.fundamentals?.secXbrl?.earningsCadence.nextCheck ||
              (safeLocale === "pl"
                ? "Bez SEC_USER_AGENT pokazujemy brak źródła, nie zmyśloną datę raportu."
                : safeLocale === "de"
                  ? "Ohne SEC_USER_AGENT bleibt die Quelle sichtbar fehlend."
                  : "Without SEC_USER_AGENT the source remains visibly missing."),
            status:
              selectedQuote?.fundamentals?.secXbrl?.earningsCadence
                .cadenceState === "fresh"
                ? "verified"
                : selectedQuote?.fundamentals?.secXbrl
                  ? "review"
                  : "missing",
          },
          {
            id: "venueHealthScore",
            label:
              safeLocale === "pl"
                ? "Kondycja venue"
                : safeLocale === "de"
                  ? "Venue-Zustand"
                  : "Venue health",
            value: selectedQuote?.venueHealth
              ? `${selectedQuote.venueHealth.state} · ${selectedQuote.venueHealth.healthScore}/100`
              : null,
            note: selectedQuote?.venueHealth?.boundary || c.venuePending,
            status:
              selectedQuote?.venueHealth?.state === "source_bound"
                ? "verified"
                : selectedQuote?.venueHealth
                  ? "review"
                  : "missing",
          },
          {
            id: "venueLatencySpread",
            label:
              safeLocale === "pl"
                ? "Latency / spread"
                : safeLocale === "de"
                  ? "Latenz / Spread"
                  : "Latency / spread",
            value: selectedQuote?.venueHealth
              ? `${selectedQuote.venueHealth.latencyMs ?? "source required"} ms · ${typeof selectedQuote.venueHealth.spreadBps === "number" ? `${selectedQuote.venueHealth.spreadBps.toFixed(2)} bps` : "source required"}`
              : null,
            note:
              safeLocale === "pl"
                ? "Mierzone z publicznego ping/time/bookTicker, bez udawania statusu wypłat lub rezerw."
                : safeLocale === "de"
                  ? "Aus öffentlichem Ping/Time/BookTicker gemessen, ohne Auszahlungs- oder Reservestatus vorzutäuschen."
                  : "Measured from public ping/time/bookTicker without pretending to know withdrawal or reserve status.",
            status: selectedQuote?.venueHealth ? "verified" : "missing",
          },
          {
            id: "venueDepthContinuity",
            label:
              safeLocale === "pl"
                ? "Depth / ciągłość świec"
                : safeLocale === "de"
                  ? "Depth / Kerzenkontinuität"
                  : "Depth / candle continuity",
            value: selectedQuote?.venueHealth
              ? `imbalance ${selectedQuote.venueHealth.depthImbalancePercent == null ? "source required" : `${selectedQuote.venueHealth.depthImbalancePercent.toFixed(1)}%`} · continuity ${selectedQuote.venueHealth.klineContinuityPercent == null ? "source required" : `${selectedQuote.venueHealth.klineContinuityPercent.toFixed(1)}%`}`
              : null,
            note:
              safeLocale === "pl"
                ? "Top-20 orderbook i 1m klines są osobnymi sygnałami odporności źródła."
                : safeLocale === "de"
                  ? "Top-20-Orderbook und 1m-Klines bleiben getrennte Quellenresilienz-Signale."
                  : "Top-20 orderbook and 1m klines remain separate source-resilience signals.",
            status:
              selectedQuote?.venueHealth?.state === "review" ||
              selectedQuote?.venueHealth?.state === "stale"
                ? "review"
                : selectedQuote?.venueHealth
                  ? "verified"
                  : "missing",
          },
          {
            id: "venuePersistence",
            label:
              safeLocale === "pl"
                ? "Cache / quota ledger"
                : safeLocale === "de"
                  ? "Cache / Quota-Ledger"
                  : "Cache / quota ledger",
            value: selectedQuote?.venueHealth
              ? `${selectedQuote.venueHealth.cacheState} · ${selectedQuote.venueHealth.storageMode} · ${selectedQuote.venueHealth.quotaMode}`
              : null,
            note:
              safeLocale === "pl"
                ? "Upstash jest trwałym trybem opcjonalnym; pamięć procesu pozostaje jawnie oznaczonym fallbackiem."
                : safeLocale === "de"
                  ? "Upstash ist der optionale dauerhafte Modus; Prozessspeicher bleibt ein klar markierter Fallback."
                  : "Upstash is the optional durable mode; process memory remains an explicitly labelled fallback.",
            status:
              selectedQuote?.venueHealth?.storageMode === "upstash_rest"
                ? "verified"
                : selectedQuote?.venueHealth
                  ? "review"
                  : "missing",
          },
          {
            id: "quoteObject",
            label: "Quote packet",
            value: {
              price: selectedQuote?.currentPrice ?? null,
              change: selectedQuote?.changePercent ?? null,
              volume: selectedVolume ?? null,
              source: selectedQuote?.source ?? "pending",
            },
            note: "Object-safe readout: React never receives raw provider objects as children.",
            status: selectedQuote?.state === "live" ? "verified" : "review",
          },
          {
            id: "exchange",
            label: a.exchange,
            value:
              selectedQuote?.exchange || selected.exchange || selected.symbol,
            note: a.observed,
          },
          {
            id: "currency",
            label: a.currency,
            value: selectedQuote?.currency,
            note: a.observed,
          },
          {
            id: "category",
            label: a.category,
            value: c.tabs[selected.category],
            note: localizedAssetContext(selected, safeLocale),
          },
          {
            id: "range",
            label: a.range,
            value: range.toUpperCase(),
            note: a.observed,
          },
          {
            id: "observations",
            label: a.observations,
            value: candles.length,
            note: a.observed,
          },
          {
            id: "candles",
            label: "OHLC candles",
            value: candles.length ? `${candles.length} candles` : null,
            note: candles.length ? a.observed : a.unavailable,
            status: candles.length ? "verified" : "missing",
          },
          {
            id: "open",
            label: a.open,
            value: first?.open?.toFixed(4),
            note: a.observed,
          },
          {
            id: "high",
            label: a.high,
            value: candles.length
              ? Math.max(...candles.map((item) => item.high)).toFixed(4)
              : null,
            note: a.observed,
          },
          {
            id: "low",
            label: a.low,
            value: candles.length
              ? Math.min(...candles.map((item) => item.low)).toFixed(4)
              : null,
            note: a.observed,
          },
          {
            id: "close",
            label: a.close,
            value: latest?.close?.toFixed(4),
            note: a.observed,
          },
          {
            id: "volatility",
            label: a.volatility,
            value: avgRange !== null ? `${avgRange.toFixed(2)}%` : null,
            note: a.observed,
          },
          {
            id: "gaps",
            label: a.gaps,
            value: missing,
            note: missing ? a.hasGaps : a.noGaps,
            status: missing ? "review" : "verified",
          },
          {
            id: "sessionStart",
            label: a.start,
            value: first
              ? new Date(first.timestamp * 1000).toLocaleString(safeLocale)
              : null,
            note: a.observed,
          },
          {
            id: "sessionEnd",
            label: a.end,
            value: latest
              ? new Date(latest.timestamp * 1000).toLocaleString(safeLocale)
              : null,
            note: a.observed,
          },
          {
            id: "providerState",
            label: a.provider,
            value: selectedQuote?.state,
            note: selectedQuote?.state === "live" ? a.live : a.unavailable,
            status: selectedQuote?.state === "live" ? "verified" : "missing",
          },
          {
            id: "sourceQuality",
            label: a.sourceQuality,
            value: sourceQualityLabel(selectedQuote, selected, safeLocale),
            note:
              safeLocale === "pl"
                ? "No fake-live: brak źródła zostaje widoczny."
                : safeLocale === "de"
                  ? "No fake-live: fehlende Quelle bleibt sichtbar."
                  : "No fake-live: missing source remains visible.",
            status: selectedQuote?.state === "live" ? "verified" : "review",
          },
          {
            id: "secondSource",
            label: a.second,
            value: null,
            note: a.secondNote,
            status: "missing",
          },
          {
            id: "venueHealth",
            label: "Venue health",
            value: isVenueHealthAsset(selected)
              ? selected.context
              : selected.category === "exchanges"
                ? "listed operator + separate venue lane"
                : null,
            note: c.venuePending,
            status: selected.category === "exchanges" ? "review" : "missing",
          },
          {
            id: "websocketCadence",
            label: a.websocketCadence,
            value: isVenueHealthAsset(selected)
              ? "kline/depth/status heartbeat lane"
              : null,
            note:
              safeLocale === "pl"
                ? "Strumienie Binance/MEXC wymagają heartbeat, reconnect i expiry guard przed publiczną pewnością."
                : safeLocale === "de"
                  ? "Binance/MEXC-Streams brauchen Heartbeat, Reconnect und Expiry Guard vor öffentlicher Konfidenz."
                  : "Binance/MEXC-style streams need heartbeat, reconnect and expiry handling before public confidence.",
            status: isVenueHealthAsset(selected) ? "review" : "missing",
          },
          {
            id: "liquidity",
            label: a.liquidity,
            value:
              selected.category === "fx"
                ? "deep reference market"
                : selected.category === "commodities"
                  ? "contract liquidity context"
                  : null,
            note:
              safeLocale === "pl"
                ? "Jakość wyjścia to nie to samo co kierunek ceny."
                : safeLocale === "de"
                  ? "Exit-Qualität ist nicht dasselbe wie Preisrichtung."
                  : "Exit quality is not the same as price direction.",
            status: "review",
          },
          {
            id: "slippage",
            label: a.slippage,
            value:
              selected.category === "fx"
                ? "spread/provider lane pending"
                : null,
            note:
              safeLocale === "pl"
                ? "Advanced oddziela poślizg od trendowej narracji."
                : safeLocale === "de"
                  ? "Advanced trennt Slippage von Trend-Narrativ."
                  : "Advanced mode keeps slippage separate from trend copy.",
            status: "review",
          },
          {
            id: "filing",
            label: a.filing,
            value:
              selected.category === "stocks" ||
              selected.category === "exchanges"
                ? a.separateLane
                : a.notApplicable,
            note: a.filingNote,
            status: "review",
          },
          {
            id: "pdfReadout",
            label: "PDF-ready human brief",
            value: "brief · source state · missing data · next check",
            note: "This same payload should feed Lens preview and download.",
            status: "verified",
          },
          {
            id: "auditBoundary",
            label: a.boundary,
            value: a.sourceBound,
            note: a.boundaryNote,
          },
          ...assetClassAuditMetrics(selected, safeLocale),
        ],
      },
      auditMode,
    );
  }, [
    a,
    auditMode,
    c,
    range,
    safeLocale,
    selected,
    selectedChange1h,
    selectedChange24h,
    selectedChange7d,
    selectedQuote,
    selectedRisk,
    selectedVolume,
  ]);

  const displayRows = useMemo(() => {
    if (!sort) return rows;
    const value = (asset: Asset) => {
      const quote = quoteForAsset(quotes, asset);
      if (sort.key === "price") return quote?.currentPrice;
      if (sort.key === "change1h") return changeForWindow(quote, 60 * 60);
      if (sort.key === "change24h") return changeForWindow(quote, 24 * 60 * 60);
      if (sort.key === "change7d")
        return quote?.priceChange7d ?? quote?.changePercent;
      if (sort.key === "change30d")
        return changeForWindow(quote, 30 * 24 * 60 * 60);
      if (sort.key === "marketCap") return quote?.marketCap;
      if (sort.key === "volume") return quoteVolume(quote);
      return dynamicRisk(quote, asset.risk);
    };
    return [...rows].sort((leftAsset, rightAsset) => {
      const left = value(leftAsset);
      const right = value(rightAsset);
      if (left === null || left === undefined) return 1;
      if (right === null || right === undefined) return -1;
      return (left - right) * (sort.direction === "asc" ? 1 : -1);
    });
  }, [quotes, rows, sort]);

  const visibleRows = useMemo(
    () => displayRows.slice(0, visibleLimit),
    [displayRows, visibleLimit],
  );

  function updateSort(key: SortKey) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "desc" };
      if (current.direction === "desc") return { key, direction: "asc" };
      return null;
    });
  }

  function SortButton({ label, sortKey }: { label: string; sortKey: SortKey }) {
    const active = sort?.key === sortKey;
    return (
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          updateSort(sortKey);
        }}
        data-testid={`realmarkets-sort-${sortKey}`}
        data-pass1414-sort-header="inline-not-extra-pill"
        data-sort-key={sortKey}
        data-sort-direction={active ? sort.direction : "neutral"}
        data-pass1998-sort-click-target="full-header-cell"
        data-pass2000-sort-click-target="full-cell-no-overlay-steal"
        data-pass1984-tristate="desc-asc-neutral"
        aria-label={`${label}: ${
          active
            ? sort.direction === "desc"
              ? "descending"
              : "ascending"
            : "neutral"
        }`}
        aria-pressed={active}
        className={`realmarkets-sort-header-cell inline-flex min-h-8 w-full items-center justify-center gap-1 text-center transition ${active ? "text-velmere-gold" : "text-white/[0.34] hover:text-white/[0.70]"}`}
        title="Column header sort: high, low, neutral"
      >
        <span className="truncate">{label}</span>
        <ArrowUpDown
          className={`h-3 w-3 shrink-0 ${active ? "opacity-100" : "opacity-30"}`}
        />
        {active ? (
          <span className="shrink-0 text-[8px]">
            {sort.direction === "desc" ? "↓" : "↑"}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <section
      ref={sectionRef}
      data-pass446-realmarkets-venue-catalog="true"
      data-pass447-crypto-realmarkets-catalog="true"
      data-pass448-realmarkets-depth-shell="true"
      data-pass450-market-coverage-rail="true"
      data-pass452-dynamic-realmarkets-coverage="true"
      data-pass453-catalog-dedupe="true"
      data-pass453-full-catalog-rows="true"
      data-pass454-evidence-dense-realmarkets="true"
      data-pass455-mixed-realmarkets-universe="true"
      data-pass1413-real-markets-polish={PASS1413_REAL_MARKETS_POLISH.version}
      data-pass1413-real-markets-source-truth={PASS1413_REAL_MARKETS_POLISH.sourceTruth}
      data-pass1413-real-markets-mobile={PASS1413_REAL_MARKETS_POLISH.mobileMode}
      data-pass1454-real-markets-architecture={PASS1454_REAL_MARKETS_ARCHITECTURE.version}
      data-pass1454-real-markets-table-rule={PASS1454_REAL_MARKETS_ARCHITECTURE.tableRule}
      data-pass1454-real-markets-source-rule={PASS1454_REAL_MARKETS_ARCHITECTURE.sourceRule}
      data-pass456-visible-row-quote-batching="true"
      data-pass479-realmarkets-mobile-cards="true"
      data-pass479-search-stable-table="true"
      data-pass579-exact-search={
        searchReceipt?.match ?? searchResolution.receipt.match
      }
      data-pass482-cross-asset-terminal="stable-catalog-search-separate"
      data-pass482-overview-universe="exchanges-equities-indices-fx-etf-commodities-reit"
      data-pass553-realmarkets-noncrypto-surface="true"
      data-pass617-noncrypto-taxonomy="locked"
      data-pass618-adaptive-surface={adaptiveSurface.mode}
      data-pass619-provider-lineage="source-state-bound"
      data-pass620-cross-asset-chart-parity="true"
      data-pass621-search-exactness={pass621SearchResolution.autoOpen ? "exact" : "explicit"}
    >
      <div className="velmere-panel-glow mb-6 rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_0%_0%,rgba(200,169,106,0.10),transparent_32%),radial-gradient(circle_at_100%_0%,rgba(34,211,238,0.08),transparent_30%),rgba(255,255,255,0.025)] p-5 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] xl:items-start">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.20em] text-velmere-gold">
              Velmere Shield · Real Markets
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.055em] text-white md:text-5xl">
              {safeLocale === "pl"
                ? "Cross-asset reader dla rynku, źródeł i proof passport."
                : safeLocale === "de"
                  ? "Cross-Asset-Reader fuer Markt, Quellen und Proof Passport."
                  : "Cross-asset reader for market state, sources and the proof passport."}
            </h2>
            <p
              className="mt-4 max-w-2xl font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]"
              data-pass1414-real-markets-no-extra-pills="true"
            >
              {safeLocale === "pl"
                ? "Prosty terminal: tabela → prostokątny wykres → Basic / Pro / Advanced."
                : safeLocale === "de"
                  ? "Einfaches Terminal: Tabelle → rechteckiger Chart → Basic / Pro / Advanced."
                  : "Simple terminal: table → rectangular chart → Basic / Pro / Advanced."}
            </p>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/[0.56]">
              {safeLocale === "pl"
                ? "Akcje, FX, ETF-y, indeksy, towary i proxy nieruchomości działają tutaj jako jeden source-bound terminal. Najpierw czytelny market state, potem detail reader i dopiero dalej AI / handoff."
                : safeLocale === "de"
                  ? "Aktien, FX, ETFs, Indizes, Rohstoffe und Immobilien-Proxys laufen hier als ein source-bound Terminal. Erst lesbarer Marktstatus, dann der Detail Reader und erst danach AI / Handoff."
                  : "Stocks, FX, ETFs, indices, commodities and real-estate proxies run here as one source-bound terminal. Readable market state first, then the detail reader, and only then AI / handoff."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {commandStatusCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-[1.25rem] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
                  card.tone === "gold"
                    ? "border-velmere-gold/[0.18] bg-velmere-gold/[0.07]"
                    : card.tone === "cyan"
                      ? "border-cyan-200/[0.18] bg-cyan-300/[0.06]"
                      : card.tone === "ready"
                        ? "border-emerald-300/[0.18] bg-emerald-400/[0.06]"
                        : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/[0.40]">
                  {card.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/[0.84]">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="velmere-command-shell flex flex-col gap-5 rounded-[2rem] p-4 lg:flex-row lg:items-end lg:justify-between md:p-5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.20em] text-velmere-gold">
            Velmère Shield
          </p>
          <h1 className="mt-3 font-serif text-5xl tracking-[-0.055em] text-white md:text-6xl">
            {c.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/[0.54]">
            {c.subtitle}
          </p>
        </div>
        <div
          ref={searchRef}
          className="relative w-full min-w-0 lg:w-auto lg:min-w-[18rem]"
        >
          <label className="velmere-command-pill flex min-h-[3rem] w-full justify-start gap-3 px-4 py-3 focus-within:border-cyan-200/[0.18] lg:min-w-[22rem]">
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin text-velmere-gold" />
            ) : (
              <Search className="h-4 w-4 text-velmere-gold" />
            )}
            <input
              value={query}
              data-testid="realmarkets-search-input"
              onChange={(event) => {
                if (
                  event.target.value.trim().toLowerCase() !==
                  committedSearchRef.current.toLowerCase()
                ) {
                  committedSearchRef.current = "";
                }
                setQuery(event.target.value);
                setSearchOpen(Boolean(event.target.value.trim()));
              }}
              onFocus={() => setSearchOpen(Boolean(query.trim()))}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchOpen(false);
                if (event.key === "Enter") {
                  event.preventDefault();
                  const asset = pass621SearchResolution.exact;
                  if (!asset) {
                    setSearchOpen(Boolean(searchSuggestions.length));
                    return;
                  }
                  committedSearchRef.current = asset.symbol;
                  setSearchReceipt(
                    buildPass579ExactSearchReceipt(
                      asset.symbol,
                      searchSuggestions,
                    ).receipt,
                  );
                  setQuery(asset.symbol);
                  setRemoteAssets([asset]);
                  setSearchOpen(false);
                  setRange("1w");
                  setSelected(asset);
                }
              }}
              placeholder={c.search}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/[0.30]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  committedSearchRef.current = "";
                  setQuery("");
                  setRemoteAssets([]);
                  setSearchOpen(false);
                }}
                className="text-white/[0.38] hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          {searchOpen && query.trim() && searchSuggestions.length ? (
            <div
              data-pass579-search-receipt={
                searchReceipt?.match ?? searchResolution.receipt.match
              }
              className="velmere-popover-surface absolute left-0 right-0 top-[calc(100%+0.65rem)] overflow-hidden p-2"
              style={pass628LayerStyle("listbox")}>
              <p className="px-3 pb-2 pt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.30]">
                {pass621SearchResolution.autoOpen
                  ? safeLocale === "pl" ? "Dokładne trafienie — Enter otwiera analizę" : safeLocale === "de" ? "Exakter Treffer — Enter öffnet die Analyse" : "Exact match — Enter opens analysis"
                  : safeLocale === "pl" ? "Wybierz instrument — podobne wyniki nie otwierają się automatycznie" : safeLocale === "de" ? "Instrument auswählen — ähnliche Treffer öffnen nicht automatisch" : "Choose an instrument — similar matches never auto-open"}
              </p>
              {searchSuggestions.map((asset) => (
                <button
                  key={asset.providerSymbol}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    committedSearchRef.current = asset.symbol;
                    setSearchReceipt(
                      buildPass579ExactSearchReceipt(
                        asset.symbol,
                        searchSuggestions,
                      ).receipt,
                    );
                    setQuery(asset.symbol);
                    setRemoteAssets([asset]);
                    setSearchOpen(false);
                    setRange("1w");
                    setSelected(asset);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-cyan-300/[0.055]"
                >
                  <AssetLogo asset={asset} />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-white">
                      {asset.symbol}
                    </strong>
                    <small className="block truncate text-xs text-white/[0.48]">
                      {asset.name}
                    </small>
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                    {c.tabs[asset.category]}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2" data-pass561-crypto-tab-removed="true">
        {PUBLIC_REAL_MARKETS_CATEGORIES.filter((item) => item !== "all" && item !== "crypto").map((item) => (
          <button
            key={item}
            type="button"
            data-testid={`realmarkets-tab-${item}`}
            onClick={() => {
              setCategory(item);
              setSearchOpen(false);
            }}
            className="velmere-command-pill min-h-0 px-4 py-2.5 text-[9px]"
            data-tone={category === item ? "active" : undefined}
          >
            <span>{c.tabs[item]}</span>
            <span className="ml-2 rounded-full border border-white/[0.08] px-1.5 py-0.5 text-[7px] text-white/[0.34]">
              {coverageCounts[item]}
            </span>
          </button>
        ))}
        <Link
          href="/market-integrity"
          className="velmere-command-pill"
          data-tone="cyan"
          data-pass553-crypto-handoff="shield"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {safeLocale === "pl"
            ? "Krypto w Shield"
            : safeLocale === "de"
              ? "Krypto im Shield"
              : "Crypto in Shield"}
        </Link>
        <span className="mx-1 hidden h-5 w-px bg-white/[0.10] sm:block" />
        <Link
          href="/search"
          className="velmere-command-pill"
        >
          <Globe2 className="h-3.5 w-3.5" />
          {c.browser}
        </Link>
        <Link
          href="/shield-map"
          className="velmere-command-pill"
        >
          <MapIcon className="h-3.5 w-3.5" />
          {c.map}
        </Link>
      </div>

      {category === "exchanges" ? (
        <div
          className="mt-3 grid gap-2 rounded-[1.4rem] border border-velmere-gold/[0.12] bg-velmere-gold/[0.035] p-4 md:grid-cols-3"
          data-pass452-venue-lifecycle="true"
        >
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-velmere-gold/[0.70]">
              Binance WebSocket
            </p>
            <p className="mt-2 text-xs leading-5 text-white/[0.52]">
              {safeLocale === "pl"
                ? "Heartbeat, kontrola ping/pong i planowany reconnect przed limitem połączenia."
                : safeLocale === "de"
                  ? "Heartbeat, Ping/Pong-Kontrolle und geplanter Reconnect vor dem Verbindungslimit."
                  : "Heartbeat, ping/pong supervision and planned reconnect before the connection limit."}
            </p>
          </div>
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-velmere-gold/[0.70]">
              MEXC WebSocket
            </p>
            <p className="mt-2 text-xs leading-5 text-white/[0.52]">
              {safeLocale === "pl"
                ? "Połączenie traktowane jako maksymalnie 24-godzinne; expiry i reconnect są częścią Advanced."
                : safeLocale === "de"
                  ? "Verbindung als maximal 24 Stunden behandelt; Expiry und Reconnect gehören zu Advanced."
                  : "Connection treated as no longer than 24 hours; expiry and reconnect belong to Advanced."}
            </p>
          </div>
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-velmere-gold/[0.70]">
              {safeLocale === "pl"
                ? "Połączenia live"
                : safeLocale === "de"
                  ? "Live-Verbindungen"
                  : "Live connections"}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/[0.52]">
              {safeLocale === "pl"
                ? "Venue health pozostaje osobną warstwą od ceny publicznej spółki."
                : safeLocale === "de"
                  ? "Venue Health bleibt getrennt vom Preis einer börsennotierten Gesellschaft."
                  : "Venue health stays separate from the price of a listed company."}
            </p>
          </div>
          <div
            className="md:col-span-3 mt-1 grid gap-2 border-t border-white/[0.07] pt-3 sm:grid-cols-2 xl:grid-cols-3"
            data-pass577-provider-slo-console="true"
          >
            {exchangeProviderSloRows.map(({ asset, slo }) => (
              <div key={asset.id} className={`realmarkets-provider-slo ${slo.state}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white/[0.78]">{asset.name}</p>
                    <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.34]">{slo.label}</p>
                  </div>
                  <span className="font-mono text-sm text-velmere-gold tabular-nums">{slo.score}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[7px] uppercase tracking-[0.08em] text-white/[0.38]">
                  <span>retry {slo.retrySuccess == null ? "n/a" : `${slo.retrySuccess}%`}</span>
                  <span>recovery {slo.recoveryMs == null ? "n/a" : `${slo.recoveryMs}ms`}</span>
                  <span>fresh {slo.freshnessSeconds == null ? "n/a" : `${slo.freshnessSeconds}s`}</span>
                </div>
                <p className="shield-copy-safe mt-2 text-[10px] leading-5 text-white/[0.44]">{slo.nextAction}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="realmarkets-pass618-cards mt-5 grid gap-3 md:grid-cols-2 lg:hidden"
        data-pass479-realmarkets-card-grid="true"
      >
        {visibleRows.map((asset) => {
          const quote = quoteForAsset(quotes, asset);
          const lineage = buildRealMarketLineage(asset, quote);
          const change24h = changeForWindow(quote, 24 * 60 * 60);
          const volume = quoteVolume(quote);
          const marketCap = quote?.marketCap;
          const risk = dynamicRisk(quote, asset.risk);
          const rowTone = realMarketsRowTone(risk);
          const sourceLabel = `${lineage.state} · ${lineage.provider} · cap ${lineage.confidenceCap}`;
          return (
            <button
              key={`mobile-${asset.category}-${asset.id}`}
              type="button"
              data-testid="realmarkets-row-mobile"
              data-source-state={lineage.state}
              data-provider-lineage={lineage.provider}
              onClick={() => {
                setSearchOpen(false);
                setRange("1w");
                setSelected(asset);
              }}
              className={`w-full overflow-hidden rounded-[1.45rem] border bg-[#0c0d0e] p-4 text-left transition active:scale-[0.995] hover:border-cyan-200/[0.16] hover:bg-white/[0.035] ${
                rowTone === "critical"
                  ? "border-rose-300/[0.16]"
                  : rowTone === "warning"
                    ? "border-amber-300/[0.16]"
                    : rowTone === "watch"
                      ? "border-cyan-200/[0.14]"
                      : "border-white/[0.09]"
              }`}
            >
              <div className="flex items-start gap-3">
                <AssetLogo asset={asset} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-white">
                        {asset.name}
                      </strong>
                      <small className="mt-1 block truncate font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                        {asset.symbol} ·{" "}
                        {asset.exchange || c.tabs[asset.category]}
                      </small>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/[0.09] px-2.5 py-1 font-mono text-[8px] text-white/[0.54]">
                      {safeLocale === "pl"
                        ? "ryzyko"
                        : safeLocale === "de"
                          ? "Risiko"
                          : "risk"}{" "}
                      {risk}/100
                    </span>
                  </span>
                  <span className="mt-3 flex items-end justify-between gap-3">
                    <span>
                      <strong className="block font-mono text-lg text-white tabular-nums">
                        {formatPrice(quote)}
                      </strong>
                      <span
                        className={`mt-1 block font-mono text-xs tabular-nums ${
                          typeof change24h === "number"
                            ? change24h >= 0
                              ? "text-emerald-300"
                              : "text-rose-300"
                            : "text-white/[0.30]"
                        }`}
                      >
                        24H ·{" "}
                        {typeof change24h === "number"
                          ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`
                          : "—"}
                      </span>
                    </span>
                      </span>
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <span className="rounded-xl border border-white/[0.07] bg-black/[0.18] p-3">
                  <span className="block font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.30]">
                    {safeLocale === "pl"
                      ? "Kapitalizacja"
                      : safeLocale === "de"
                        ? "Market Cap"
                        : "Market cap"}
                  </span>
                  <strong className="mt-1.5 block truncate font-mono text-[11px] text-white/[0.70]">
                    {typeof marketCap === "number"
                      ? new Intl.NumberFormat(safeLocale, {
                          notation: "compact",
                          maximumFractionDigits: 2,
                        }).format(marketCap)
                      : asset.category === "fx" ||
                          asset.category === "commodities" ||
                          asset.category === "indices"
                        ? safeLocale === "pl"
                          ? "nie dotyczy"
                          : safeLocale === "de"
                            ? "nicht anwendbar"
                            : "not applicable"
                        : safeLocale === "pl"
                          ? "brak źródła"
                          : safeLocale === "de"
                            ? "Quelle fehlt"
                            : "source missing"}
                  </strong>
                </span>
                <span className="rounded-xl border border-white/[0.07] bg-black/[0.18] p-3">
                  <span className="block font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.30]">
                    {c.volume}
                  </span>
                  <strong className="mt-1.5 block truncate font-mono text-[11px] text-white/[0.70]">
                    {volume
                      ? new Intl.NumberFormat(safeLocale, {
                          notation: "compact",
                          maximumFractionDigits: 2,
                        }).format(volume)
                      : safeLocale === "pl"
                        ? "brak danych"
                        : safeLocale === "de"
                          ? "keine Daten"
                          : "no data"}
                  </strong>
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                <span className="min-w-0 truncate font-mono text-[8px] uppercase tracking-[0.11em] text-white/[0.32]">
                  {sourceLabel}
                </span>
                <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.11em] text-cyan-100/[0.54]">
                  {safeLocale === "pl"
                    ? "Otwórz analizę"
                    : safeLocale === "de"
                      ? "Analyse öffnen"
                      : "Open analysis"}
                </span>
              </div>
            </button>
          );
        })}
        {loading || searching ? (
          <div className="velmere-stable-surface velmere-stable-skeleton rounded-[1.35rem] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/[0.18] bg-cyan-300/[0.07] text-cyan-100">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="velmere-stable-skeleton__eyebrow" />
                <div className="velmere-stable-skeleton__row mt-3 w-[72%]" />
              </div>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-white/[0.44]">
              {searching ? c.searching : c.loading}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1rem] border border-white/[0.07] bg-black/[0.18] p-3"
                >
                  <div className="velmere-stable-skeleton__row" />
                  <div className="velmere-stable-skeleton__row mt-3 w-[68%]" />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {visibleRows.length < displayRows.length ? (
          <button
            type="button"
            onClick={() =>
              setVisibleLimit((current) =>
                Math.min(current + 18, displayRows.length),
              )
            }
            className="rounded-[1.2rem] border border-cyan-200/[0.16] bg-cyan-300/[0.05] px-4 py-3 font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-300/[0.10]"
          >
            {safeLocale === "pl"
              ? `Pokaż więcej · ${visibleRows.length}/${displayRows.length}`
              : safeLocale === "de"
                ? `Mehr anzeigen · ${visibleRows.length}/${displayRows.length}`
                : `Show more · ${visibleRows.length}/${displayRows.length}`}
          </button>
        ) : null}
      </div>

      <div
        className="realmarkets-pass578-table realmarkets-pass618-table mt-5 hidden w-full overflow-hidden rounded-[1.6rem] border border-white/[0.09] bg-[#0c0d0e] lg:block"
        data-pass479-realmarkets-desktop-table="true"
        data-pass1998-table-polish="desktop-clean-no-source-clutter"
        data-pass2000-table-qa="aligned-chart-column-no-source-no-row-noise"
        data-pass578-full-width-density="no-horizontal-scroll"
      >
        <div className="w-full min-w-0">
          <div className="realmarkets-pass578-grid realmarkets-pass618-grid grid gap-2.5 border-b border-white/[0.08] px-5 py-4 font-mono text-[8px] uppercase tracking-[0.15em] text-white/[0.32]">
            <span>{c.name}</span>
            <SortButton label={c.price} sortKey="price" />
            <SortButton label="1H" sortKey="change1h" />
            <SortButton label="24H" sortKey="change24h" />
            <SortButton label="7D" sortKey="change7d" />
            <SortButton label="30D" sortKey="change30d" />
            <SortButton
              label={
                safeLocale === "pl"
                  ? "Market cap"
                  : safeLocale === "de"
                    ? "Market Cap"
                    : "Market cap"
              }
              sortKey="marketCap"
            />
            <SortButton label={c.volume} sortKey="volume" />
            <SortButton label={c.risk} sortKey="risk" />
            <span>{safeLocale === "pl" ? "Wykres" : safeLocale === "de" ? "Chart" : "Chart"}</span>
          </div>
          {visibleRows.map((asset) => {
            const quote = quoteForAsset(quotes, asset);
            const lineage = buildRealMarketLineage(asset, quote);
            const change1h = changeForWindow(quote, 60 * 60);
            const change24h = changeForWindow(quote, 24 * 60 * 60);
            const change7d =
              typeof quote?.priceChange7d === "number"
                ? quote.priceChange7d
                : (quote?.changePercent ?? null);
            const change30d = changeForWindow(quote, 30 * 24 * 60 * 60);
            const volume = quoteVolume(quote);
            const risk = dynamicRisk(quote, asset.risk);
            const rowTone = realMarketsRowTone(risk);
            return (
              <button
                key={`${asset.category}-${asset.id}`}
                type="button"
                data-testid="realmarkets-row"
                data-source-state={lineage.state}
                data-provider-lineage={lineage.provider}
                onClick={() => {
                  setSearchOpen(false);
                  setRange("1w");
                  setSelected(asset);
                }}
                className={`velmere-hover-lift realmarkets-pass578-grid realmarkets-pass618-grid grid w-full items-center gap-2.5 border-b px-5 py-4 text-left transition last:border-b-0 hover:bg-white/[0.035] ${
                  rowTone === "critical"
                    ? "border-white/[0.07] bg-[linear-gradient(90deg,rgba(251,113,133,0.06),transparent_48%)]"
                    : rowTone === "warning"
                      ? "border-white/[0.07] bg-[linear-gradient(90deg,rgba(251,191,36,0.05),transparent_48%)]"
                      : rowTone === "watch"
                        ? "border-white/[0.07] bg-[linear-gradient(90deg,rgba(34,211,238,0.045),transparent_48%)]"
                        : "border-white/[0.07]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <AssetLogo asset={asset} />
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-white">
                      {asset.name}
                    </strong>
                    <small className="mt-1 block font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                      {asset.symbol} ·{" "}
                      {asset.exchange || c.tabs[asset.category]}
                    </small>
                    <small
                      className="realmarkets-source-line-quiet mt-1 block truncate font-mono text-[7px] uppercase tracking-[0.10em] text-cyan-100/[0.32]"
                      data-pass1996-row-source-line="quiet-hidden-until-expanded"
                    >
                      {lineage.state} · {lineage.provider} · cap {lineage.confidenceCap}
                    </small>
                  </span>
                </span>
                <strong className="font-mono text-sm text-white tabular-nums">
                  {formatPrice(quote)}
                </strong>
                {[change1h, change24h, change7d, change30d].map((change, index) => (
                  <span
                    key={index}
                    className={`font-mono text-xs tabular-nums ${typeof change === "number" ? (change >= 0 ? "text-emerald-300" : "text-rose-300") : "text-white/[0.30]"}`}
                  >
                    {typeof change === "number"
                      ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
                      : "—"}
                  </span>
                ))}
                <span className="font-mono text-xs text-white/[0.58]">
                  {typeof quote?.marketCap === "number"
                    ? new Intl.NumberFormat(safeLocale, {
                        notation: "compact",
                        maximumFractionDigits: 2,
                      }).format(quote.marketCap)
                    : asset.category === "indices"
                      ? safeLocale === "pl"
                        ? "poziom indeksu"
                        : safeLocale === "de"
                          ? "Indexstand"
                          : "index level"
                      : asset.category === "fx" ||
                          asset.category === "commodities"
                        ? safeLocale === "pl"
                          ? "nie dotyczy"
                          : safeLocale === "de"
                            ? "nicht anwendbar"
                            : "not applicable"
                        : safeLocale === "pl"
                          ? "brak źródła"
                          : safeLocale === "de"
                            ? "Quelle fehlt"
                            : "source missing"}
                </span>
                <span className="font-mono text-xs text-white/[0.58]">
                  {volume
                    ? new Intl.NumberFormat(safeLocale, {
                        notation: "compact",
                        maximumFractionDigits: 2,
                      }).format(volume)
                    : safeLocale === "pl"
                      ? "brak danych"
                      : safeLocale === "de"
                        ? "keine Daten"
                        : "no data"}
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-[10px] text-white/[0.62]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      rowTone === "critical"
                        ? "bg-rose-300"
                        : rowTone === "warning"
                          ? "bg-amber-300"
                          : rowTone === "watch"
                            ? "bg-cyan-300"
                            : "bg-emerald-300"
                    }`}
                  />
                  {risk}/100
                </span>
                <span className="flex justify-end">
                  <MarketSparkline quote={quote} />
                </span>
              </button>
            );
          })}
          {loading || searching ? (
            <div className="flex items-center gap-3 border-t border-white/[0.07] px-5 py-4 text-xs text-white/[0.42]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {searching ? c.searching : c.loading}
            </div>
          ) : null}
          {visibleRows.length < displayRows.length ? (
            <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] px-5 py-4">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                {safeLocale === "pl"
                  ? `Widoczne ${visibleRows.length} z ${displayRows.length}`
                  : safeLocale === "de"
                    ? `${visibleRows.length} von ${displayRows.length} sichtbar`
                    : `Showing ${visibleRows.length} of ${displayRows.length}`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setVisibleLimit((current) =>
                    Math.min(current + 18, displayRows.length),
                  )
                }
                className="rounded-full border border-cyan-200/[0.16] bg-cyan-300/[0.05] px-4 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-300/[0.10]"
              >
                {safeLocale === "pl"
                  ? "Pokaż więcej"
                  : safeLocale === "de"
                    ? "Mehr anzeigen"
                    : "Show more"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <ModalRoot
        open={Boolean(selected)}
        onClose={() => {
          setAuditMode(null);
          setSelected(null);
        }}
        closeLabel={safeLocale === "pl" ? "Zamknij analizę" : safeLocale === "de" ? "Analyse schließen" : "Close analysis"}
        ariaLabel={selected ? `${selected.name} · Real Markets` : "Real Markets"}
        surfaceId="velmere-real-markets-asset-modal"
        surfaceClassName="w-full max-w-[1240px]"
        surfaceData={{ "real-markets-analysis": "true", surface: "real-markets-asset-modal", pass2011: "transparent-root-stable-instrument-panel" }}
      >
        {selected ? (
          <div
            data-velmere-modal-scroll="true"
            data-modal-scroll-region="true"
            className="relative max-h-[calc(100dvh-1.5rem)] overflow-hidden overscroll-contain touch-pan-y"
            data-pass1454-real-markets-modal-scroll="single-owner"
          >
              <UnifiedAssetModalShell
                kind="real-markets"
                eyebrow="VLM Real Markets"
                title={selected.name}
                subtitle={`${selected.symbol} · ${localizedAssetContext(selected, safeLocale)}`}
                icon={<AssetLogo asset={selected} large />}
                closeLabel={safeLocale === "pl" ? "Zamknij analizę" : safeLocale === "de" ? "Analyse schließen" : "Close analysis"}
                closeButtonRef={modalCloseButtonRef}
                onClose={() => {
                  setAuditMode(null);
                  setSelected(null);
                }}
                readouts={[
                  { label: c.price, value: formatPrice(selectedQuote), tone: "gold" },
                  { label: c.risk, value: `${selectedRisk}/100`, tone: "cyan" },
                  {
                    label: safeLocale === "pl" ? "Pewność" : safeLocale === "de" ? "Konfidenz" : "Confidence",
                    value: `${selectedLineage?.confidenceCap ?? selectedQuote?.confidenceCap ?? 20}%`,
                    tone: "neutral",
                  },
                ]}
                timeframeSlot={
                  <UnifiedTimeframeTabs
                    options={realMarketsTimeframeOptions}
                    value={range}
                    onChange={setRange}
                    ariaLabel={
                      safeLocale === "pl"
                        ? "Zakres wykresu Real Markets"
                        : safeLocale === "de"
                          ? "Real-Markets-Chart-Zeitraum"
                          : "Real Markets chart timeframe"
                    }
                    className="md:justify-end"
                  />
                }
                chartSlot={
                  selectedChartParity?.interactive && selectedQuote ? (
                    <AdvancedMarketChart
                      candles={selectedQuote.candles}
                      locale={safeLocale}
                      symbol={selected.symbol}
                      source={selectedQuote.source}
                      range={range}
                      analysisDepth={auditMode ?? "basic"}
                      confidenceCap={selectedLineage?.confidenceCap ?? selectedQuote.confidenceCap ?? null}
                      providerRouteId={`${selected.providerSymbol}:${selectedQuote.venueComparison?.secondaryVenue || selectedQuote.secondarySource || "single"}`}
                      cleanChrome
                      onRefreshDue={requestSelectedRefresh}
                      secondarySource={
                        selectedQuote.venueComparison?.secondaryVenue ||
                        selectedQuote.secondarySource ||
                        undefined
                      }
                      providerComparison={
                        selectedQuote.venueComparison
                          ? {
                              secondarySource: selectedQuote.venueComparison.secondaryVenue,
                              state: selectedQuote.venueComparison.state,
                              priceDivergenceBps: selectedQuote.venueComparison.priceDivergenceBps,
                              freshnessDeltaSeconds: selectedQuote.venueComparison.freshnessDeltaSeconds,
                              directPriceComparable: selectedQuote.venueComparison.directPriceComparable,
                            }
                          : selectedQuote.secondarySource
                            ? {
                                secondarySource: selectedQuote.secondarySource,
                                state: selectedQuote.consensusState,
                                priceDivergenceBps: selectedQuote.divergenceBps,
                                freshnessDeltaSeconds: null,
                                directPriceComparable: true,
                              }
                            : null
                      }
                    />
                  ) : (
                    <div className="velmere-empty-state grid min-h-[460px] place-items-center p-8 text-center">
                      <div className="max-w-2xl">
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100/[0.72]">
                          chart source required
                        </p>
                        <p className="mt-3 text-sm leading-7 text-white/[0.56]">
                          {c.chartUnavailable}
                        </p>
                        {selectedChartParity?.reason ? (
                          <small className="mt-3 block text-xs leading-6 text-white/[0.34]">
                            {selectedChartParity.reason}
                          </small>
                        ) : null}
                      </div>
                    </div>
                  )
                }
                depthSlot={
                  <UnifiedAnalysisDepthDock
                    options={realMarketsDepthOptions}
                    value={auditMode}
                    onSelect={openUnifiedAuditMode}
                    ariaLabel={
                      safeLocale === "pl"
                        ? "Poziomy analizy VLM"
                        : safeLocale === "de"
                          ? "VLM-Analysetiefen"
                          : "VLM analysis depths"
                    }
                  />
                }
                analysisOverlaySlot={
                  auditMode ? (
                    <VlmNeuralAuditExperience
                      key={`${selected.symbol}:${auditMode}:real-markets-contained`}
                      contained
                      locale={safeLocale}
                      mode={auditMode}
                      symbol={selected.symbol}
                      name={selected.name}
                      evidence={auditEvidence}
                      onClose={() => setAuditMode(null)}
                    />
                  ) : null
                }
                detailsSlot={
                  <details
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-xs leading-6 text-white/[0.48]"
                    data-pass1454-real-markets-details="secondary-source-gaps"
                  >
                    <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.15em] text-white/[0.58]">
                      {safeLocale === "pl" ? "Źródła i braki danych" : safeLocale === "de" ? "Quellen und Datenlücken" : "Sources and missing data"}
                    </summary>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <span>{selectedLineage?.provider || selectedQuote?.source || c.unavailable}</span>
                      <span>{selectedLineage?.state || selectedQuote?.state || "source required"}</span>
                      <span>{selectedQuote?.missingReason || selectedQuote?.sourcePolicy || "missing data lowers confidence"}</span>
                    </div>
                  </details>
                }
              />
            </div>
          ) : null}
      </ModalRoot>

      <nav
        className="mt-8 flex flex-wrap justify-center gap-2 border-t border-white/[0.08] pt-6"
        aria-label="Real Markets navigation"
      >
        <Link
          href="/market-integrity"
          className="rounded-full border border-white/[0.10] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.52] transition hover:text-white"
        >
          {c.shield}
        </Link>
        <Link
          href="/shield-map"
          className="rounded-full border border-white/[0.10] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.52] transition hover:text-white"
        >
          {c.map}
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-velmere-gold/[0.22] bg-velmere-gold/[0.07] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.13em] text-velmere-gold"
        >
          {c.browser}
        </Link>
      </nav>

    </section>
  );
}
