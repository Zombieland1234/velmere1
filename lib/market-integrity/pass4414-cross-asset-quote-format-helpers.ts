// PASS4414 no-visual CrossAsset / Real Markets quote-format helper extraction.
// Boundary: quote math, formatting and sparkline geometry only. No JSX, CSS, copy or visual behavior changes.

import type {
  Pass4413AssetCategory,
  Pass4413CrossAssetCandle as Candle,
  Pass4413CrossAssetQuote as Quote,
  Pass4413RealMarketsAsset as Asset,
} from "@/lib/market-integrity/pass4413-cross-asset-runtime-normalizers";
import { hasServerVerifiedQuoteLiveGate } from "@/components/market-integrity/live-truth";
import {
  pass4574QuoteDisplayState,
  pass4577CanShowPercent,
} from "@/lib/market-integrity/pass4570-market-data-sanity";

export const PASS4414_CROSS_ASSET_QUOTE_FORMAT_HELPERS_BOUNDARY = {
  passId: "PASS4414",
  mode: "no_visual_crossasset_quote_format_helper_extraction",
  visualChanges: false,
  purpose:
    "Move Real Markets quote math, table formatting and sparkline geometry helpers out of CrossAssetCollapseRadarPanel to reduce client build pressure without changing UI.",
  publicTopkaLiveAllowed: false,
} as const;

export type Pass4414Locale = "pl" | "de" | "en";

function isPass4414VenueHealthAsset(asset?: Asset | null) {
  return Boolean(asset?.providerSymbol.endsWith("VENUE") || asset?.id.endsWith("-venue") || /venue health/i.test(asset?.name ?? ""));
}

export function categoryFromProvider(
  type: string,
  symbol: string,
  name: string,
): Pass4413AssetCategory {
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

export function dynamicRisk(
  quote?: Quote,
  _legacyFallback = 36,
  asset?: Asset | null,
): number | null {
  void _legacyFallback;
  if (
    !quote
    || !asset
    || quote.state !== "live"
    || quote.truthState !== "source_bound"
    || !hasServerVerifiedQuoteLiveGate(quote)
    || typeof quote.currentPrice !== "number"
    || !Number.isFinite(quote.currentPrice)
    || quote.currentPrice <= 0
  ) {
    return null;
  }
  const measuredMoves = [
    quote.priceChange1h,
    quote.priceChange24h,
    quote.priceChange7d,
    quote.changePercent,
  ].filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value),
  );
  const candles = quote.candles.slice(-32);
  const measuredRanges = candles
    .filter((candle) =>
      Number.isFinite(candle.high)
      && Number.isFinite(candle.low)
      && Number.isFinite(candle.close)
      && candle.close > 0,
    )
    .map((candle) => ((candle.high - candle.low) / candle.close) * 100);
  const venueRisk = typeof quote.venueHealth?.healthScore === "number"
    && Number.isFinite(quote.venueHealth.healthScore)
    ? Math.max(0, 100 - quote.venueHealth.healthScore)
    : null;
  if (!measuredMoves.length && !measuredRanges.length && venueRisk === null) {
    return null;
  }
  const moveRisk = measuredMoves.length
    ? Math.min(60, Math.max(...measuredMoves.map((value) => Math.abs(value))) * 4)
    : 0;
  const rangeRisk = measuredRanges.length
    ? Math.min(
        30,
        (measuredRanges.reduce((sum, value) => sum + value, 0)
          / measuredRanges.length) * 3,
      )
    : 0;
  const conflictRisk = quote.consensusState === "divergent" ? 20 : 0;
  const score = venueRisk === null
    ? moveRisk + rangeRisk + conflictRisk
    : Math.max(venueRisk, moveRisk + rangeRisk + conflictRisk);
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
}

export function inferredCandleIntervalSeconds(candles: Candle[]) {
  if (candles.length < 2) return null;
  const deltas = candles
    .slice(1)
    .map((candle, index) => candle.timestamp - candles[index].timestamp)
    .filter((delta) => Number.isFinite(delta) && delta > 0)
    .sort((left, right) => left - right);
  if (!deltas.length) return null;
  return deltas[Math.floor(deltas.length / 2)];
}

export function changeForWindow(quote: Quote | undefined, seconds: number) {
  if (!quote) return null;
  const hourlyReceipt = quote.realMarketsHourlyMetricsReceipt;
  if (hourlyReceipt) {
    if (hourlyReceipt.status !== "source_bound") return null;
    if (seconds === 60 * 60)
      return typeof quote.priceChange1h === "number" && Number.isFinite(quote.priceChange1h)
        ? quote.priceChange1h
        : null;
    if (seconds === 24 * 60 * 60)
      return typeof quote.priceChange24h === "number" && Number.isFinite(quote.priceChange24h)
        ? quote.priceChange24h
        : null;
    if (seconds === 7 * 24 * 60 * 60)
      return typeof quote.priceChange7d === "number" && Number.isFinite(quote.priceChange7d)
        ? quote.priceChange7d
        : null;
  }
  if (quote.state !== "live") return null;
  if (seconds === 60 * 60 && typeof quote.priceChange1h === "number" && Number.isFinite(quote.priceChange1h))
    return quote.priceChange1h;
  if (seconds === 24 * 60 * 60 && typeof quote.priceChange24h === "number" && Number.isFinite(quote.priceChange24h))
    return quote.priceChange24h;
  if (quote.candles.length < 2) return null;
  const inferredInterval = inferredCandleIntervalSeconds(quote.candles);
  if (inferredInterval == null || inferredInterval > seconds) return null;
  const latest = quote.candles.at(-1);
  if (!latest) return null;
  const target = latest.timestamp - seconds;
  const reference =
    [...quote.candles].reverse().find((candle) => candle.timestamp <= target) ??
    quote.candles[0];
  if (!reference?.close) return null;
  return ((latest.close - reference.close) / reference.close) * 100;
}

export function quoteMarketCap(quote: Quote | undefined, asset: Asset | null | undefined) {
  void asset;
  if (
    !quote
    || quote.state !== "live"
    || quote.truthState !== "source_bound"
    || !hasServerVerifiedQuoteLiveGate(quote)
    || typeof quote.sourceTimestamp !== "number"
    || !Number.isFinite(quote.sourceTimestamp)
    || quote.sourceTimestamp <= 0
  ) {
    return null;
  }
  if (
    typeof quote.marketCap === "number"
    && Number.isFinite(quote.marketCap)
    && quote.marketCap > 0
  ) return quote.marketCap;
  const sharesOutstanding = quote?.fundamentals?.sharesOutstanding;
  if (
    typeof sharesOutstanding === "number" &&
    Number.isFinite(sharesOutstanding) &&
    sharesOutstanding > 0 &&
    typeof quote?.currentPrice === "number" &&
    Number.isFinite(quote.currentPrice) &&
    quote.currentPrice > 0
  ) {
    return sharesOutstanding * quote.currentPrice;
  }
  return null;
}

export function quoteVolume(quote?: Quote) {
  if (
    !quote
    || quote.state !== "live"
    || quote.truthState !== "source_bound"
    || !hasServerVerifiedQuoteLiveGate(quote)
    || quote.realMarketsHourlyMetricsReceipt?.status !== "source_bound"
  ) return null;
  return typeof quote.volume24h === "number"
    && Number.isFinite(quote.volume24h)
    && quote.volume24h >= 0
    ? quote.volume24h
    : null;
}

export function formatCompactAmount(locale: string, value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function pass2334RiskStatusLabel(score: number, locale: Pass4414Locale) {
  if (!score) return locale === "pl" ? "Oczekuje" : locale === "de" ? "Wartet" : "Pending";
  if (score <= 28) return locale === "pl" ? "Niskie" : locale === "de" ? "Niedrig" : "Low";
  if (score <= 58) return locale === "pl" ? "Umiarkowane" : locale === "de" ? "Moderat" : "Moderate";
  return locale === "pl" ? "Wysokie" : locale === "de" ? "Hoch" : "High";
}

export function buildFallbackMarketSparkline(_asset?: Asset | null) {
  // PASS4619: synthetic/seeded market motion is forbidden. Keep the legacy
  // export for compatibility, but return no series when provider candles are absent.
  return [] as number[];
}

export function buildSparklineSeries(quote?: Quote, _asset?: Asset | null) {
  // PASS4619: mini charts are source-candle-only. Percent anchors may label the
  // table, but they must never be expanded into a visually invented price path.
  return (quote?.candles ?? [])
    .map((candle) => candle.close)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    .slice(-56);
}

export function buildPass4388SparklinePolyline(values: number[], width = 120, height = 34) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length < 2) return "";
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const span = Math.max(0.000001, max - min);
  return finiteValues
    .map((value, index) => {
      const x = (index / Math.max(1, finiteValues.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function formatMarketCapProxy(
  quote: Quote | undefined,
  asset: Asset | null | undefined,
  locale: Pass4414Locale,
) {
  const resolvedMarketCap = quoteMarketCap(quote, asset);
  if (typeof resolvedMarketCap === "number") {
    const formatted = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(resolvedMarketCap);
    return asset?.category === "crypto"
      ? `${formatted} · CoinGecko market cap`
      : `${formatted} · source-bound market cap`;
  }
  const displayPrice = displayTrustedPrice(quote, asset?.category);
  if (displayPrice !== null && asset?.category === "indices")
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(displayPrice)} index level`;
  if (displayPrice !== null && asset?.category === "crypto")
    return locale === "pl"
      ? "kapitalizacja wymaga CoinGecko market lane"
      : locale === "de"
        ? "Market-Cap braucht CoinGecko Market Lane"
        : "requires CoinGecko market-cap lane";
  if (
    displayPrice !== null &&
    (asset?.category === "fx" ||
      asset?.category === "commodities" ||
      asset?.category === "real_estate")
  )
    return locale === "pl"
      ? "proxy / nie klasyczna kapitalizacja"
      : locale === "de"
        ? "Proxy / keine klassische Market Cap"
        : "proxy / not a classic market cap";
  return null;
}

export function formatSignedPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function sourceQualityLabel(
  quote: Quote | undefined,
  asset: Asset | null | undefined,
  locale: Pass4414Locale,
) {
  if (isPass4414VenueHealthAsset(asset) || quote?.assetClass === "venue_health") {
    if (quote?.venueHealth) {
      const state = `${quote.venueHealth.state} · ${quote.venueHealth.healthScore}/100`;
      return locale === "pl"
        ? `Kondycja rynku: ${state} · płynność i opóźnienie`
        : locale === "de"
          ? `Marktstatus: ${state} · Liquidität und Latenz`
          : `Market health: ${state} · liquidity and latency`;
    }
    return locale === "pl"
      ? "Kondycja rynku będzie dostępna w szczegółach"
      : locale === "de"
        ? "Der Marktstatus ist in den Details verfügbar"
        : "Market health is available in the details";
  }
  if (!quote || quote.state !== "live") {
    return locale === "pl"
      ? "Oczekiwanie na świeże dane rynkowe"
      : locale === "de"
        ? "Warten auf aktuelle Marktdaten"
        : "Waiting for fresh market data";
  }
  if (quote.consensusState === "divergent") {
    return locale === "pl"
      ? "Źródła wymagają dodatkowej weryfikacji"
      : locale === "de"
        ? "Quellen erfordern eine zusätzliche Prüfung"
        : "Sources require additional verification";
  }
  if (quote.consensusState === "stale") {
    return locale === "pl"
      ? "Dane wymagają odświeżenia"
      : locale === "de"
        ? "Daten müssen aktualisiert werden"
        : "Data refresh required";
  }
  if (quote.consensusState === "single_source") {
    return locale === "pl"
      ? "Jedno aktywne źródło · ograniczona pewność"
      : locale === "de"
        ? "Eine aktive Quelle · begrenzte Sicherheit"
        : "One active source · limited confidence";
  }
  if (quote.consensusState === "watch") {
    return locale === "pl"
      ? "Źródła blisko progu · wymagana obserwacja"
      : locale === "de"
        ? "Quellen nahe am Schwellenwert · beobachten"
        : "Sources near the threshold · monitor";
  }
  if (quote.truthState === "source_bound") {
    return locale === "pl"
      ? "Główne źródło aktywne"
      : locale === "de"
        ? "Hauptquelle aktiv"
        : "Primary source active";
  }
  if (quote.truthState === "compatibility_adapter") {
    return locale === "pl"
      ? "Źródło zapasowe aktywne"
      : locale === "de"
        ? "Ersatzquelle aktiv"
        : "Fallback source active";
  }
  return quote.sourceTimestamp
    ? locale === "pl"
      ? "Dane na żywo · czas potwierdzony"
      : locale === "de"
        ? "Live-Daten · Zeit bestätigt"
        : "Live data · timestamp verified"
    : locale === "pl"
      ? "Dane na żywo · synchronizacja czasu w toku"
      : locale === "de"
        ? "Live-Daten · Zeitsynchronisierung läuft"
        : "Live data · time synchronization pending";
}

export function compactProviderLabel(value?: string | null) {
  return (value ?? "Yahoo Finance")
    .split(" · ")[0]
    .replace(/\s+(chart|quote|spot)\s+adapter$/i, "")
    .replace(/\s+chart\s+adapter$/i, "")
    .trim() || "Yahoo Finance";
}

export function inferMarketSession(asset: Asset, locale: Pass4414Locale) {
  void asset;
  return locale === "pl"
    ? "Sesja niedostępna"
    : locale === "de"
      ? "Sitzung nicht verfügbar"
      : "Session unavailable";
}

export function displayTrustedPrice(
  quote?: Quote,
  category?: Pass4413AssetCategory | null,
): number | null {
  if (
    !quote
    || typeof quote.currentPrice !== "number"
    || !Number.isFinite(quote.currentPrice)
    || quote.currentPrice <= 0
  ) {
    return null;
  }
  if (category) {
    return pass4577CanShowPercent(quote, category) ? quote.currentPrice : null;
  }
  return pass4574QuoteDisplayState(quote) === "live" ? quote.currentPrice : null;
}

export function formatPrice(quote?: Quote, category?: Pass4413AssetCategory | null) {
  const price = displayTrustedPrice(quote, category);
  if (price === null) return "—";
  try {
    if (quote?.currency) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: quote.currency,
        maximumFractionDigits: price < 10 ? 4 : 2,
      }).format(price);
    }
  } catch {
    // Fall through to a source-neutral number.
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: price < 10 ? 5 : 2,
  }).format(price);
}

export function formatAssetDetailQuotePrice(
  quote?: Quote,
  category?: Pass4413AssetCategory | null,
) {
  const price = displayTrustedPrice(quote, category);
  if (price === null) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(price) < 10 ? 4 : 2,
  }).format(price);
  return `${formatted} ${quote?.currency ?? "USD"}`;
}

export function formatAssetDetailTimestamp(quote?: Quote) {
  if (!quote?.sourceTimestamp) return null;
  const raw = quote.sourceTimestamp > 10_000_000_000
    ? quote.sourceTimestamp
    : quote.sourceTimestamp * 1000;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(raw));
}

export function formatRelativeFreshness(timestamp?: number | null, locale: Pass4414Locale = "en", referenceMs = 1_735_689_600_000) {
  if (!timestamp) {
    return locale === "pl"
      ? "świeżość oczekuje na timestamp"
      : locale === "de"
        ? "Freshness wartet auf Timestamp"
        : "freshness awaiting timestamp";
  }
  const raw = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  const ageMs = Math.max(0, referenceMs - raw);
  const minutes = Math.round(ageMs / 60000);
  if (minutes < 2) return locale === "pl" ? "teraz" : locale === "de" ? "jetzt" : "now";
  if (minutes < 120) {
    return locale === "pl"
      ? `${minutes} min temu`
      : locale === "de"
        ? `vor ${minutes} Min.`
        : `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return locale === "pl"
      ? `${hours} godz. temu`
      : locale === "de"
        ? `vor ${hours} Std.`
        : `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return locale === "pl"
    ? `${days} dni temu`
    : locale === "de"
      ? `vor ${days} Tagen`
      : `${days}d ago`;
}
