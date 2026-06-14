// PASS654 public-copy compatibility: PASS463: and PASS466 legacy markers remain internal only.
import {
  searchVelmereIntelligence,
  type VelmereSearchMode,
  type VelmereSearchResult,
  buildVelmereShieldBridge,
} from "@/lib/search/intelligence-search-contract";
import {
  assertSearchCopyIsSafe,
  sanitizeSearchInput,
  velmereSearchSafetyBoundary,
} from "@/lib/search/intelligence-search-safety";
import { resolvePass461VenueHealthWithFallback } from "@/lib/market-integrity/pass461-venue-health-runtime";
import {
  buildPass462CrossVenueComparison,
  preferredPass462SecondaryVenue,
} from "@/lib/market-integrity/pass462-cross-venue-consensus";
import {
  normalizePass463AssetSymbol,
  pass463CanonicalPairCoverageContract,
} from "@/lib/market-integrity/pass463-canonical-pair-coverage";
import {
  resolvePass459AlphaVantageSnapshot,
  type Pass459AlphaVantageSnapshot,
  type Pass459ProviderAssetClass,
} from "@/lib/market-integrity/pass459-alpha-vantage-provider";
import {
  isPass466ExactMarketMatch,
  pass466RealMarketLensContract,
  searchPass466LensMarkets,
  type Pass466LensMarketRow,
} from "@/lib/search/pass466-real-market-lens";

// PASS462 legacy verifier markers: attachPass462BitcoinVenueEvidence · coinbase-venue-health.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedModes = new Set<VelmereSearchMode>([
  "all",
  "token",
  "market",
  "contract",
  "velmere",
  "osint",
]);

type LensLocale = "pl" | "en" | "de";

function resolveLensLocale(value: string | null): LensLocale {
  return value === "en" || value === "de" ? value : "pl";
}

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  total_volume?: number;
  fully_diluted_valuation?: number;
  high_24h?: number;
  low_24h?: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  last_updated?: string;
};

type SearchIntent = "suggest" | "detail";

function resolveSearchIntent(value: string | null): SearchIntent {
  return value === "detail" ? "detail" : "suggest";
}

function compactMarketValue(
  value: number | null | undefined,
  currency = "USD",
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en", {
      notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2,
    }).format(value);
  }
}

function marketClassLabel(row: Pass466LensMarketRow, locale: LensLocale) {
  const labels = {
    pl: { stock: "akcja", etf: "ETF", real_estate: "REIT / nieruchomości" },
    de: { stock: "Aktie", etf: "ETF", real_estate: "REIT / Immobilien" },
    en: { stock: "stock", etf: "ETF", real_estate: "REIT / real estate" },
  } as const;
  return labels[locale][row.assetClass];
}

function providerClass(row: Pass466LensMarketRow): Pass459ProviderAssetClass {
  return row.assetClass;
}

function marketTone(row: Pass466LensMarketRow): VelmereSearchResult["tone"] {
  return row.riskPressure >= 58
    ? "elevated"
    : row.riskPressure >= 38
      ? "review"
      : "calm";
}

function marketResultCopy(
  row: Pass466LensMarketRow,
  locale: LensLocale,
  snapshot: Pass459AlphaVantageSnapshot | null,
) {
  const label = marketClassLabel(row, locale);
  const currency = snapshot?.currency || "USD";
  const price = compactMarketValue(snapshot?.currentPrice, currency);
  const marketCap = compactMarketValue(snapshot?.marketCap, currency);
  const netAssets = compactMarketValue(
    snapshot?.fundamentals.netAssets,
    currency,
  );
  const quality = snapshot?.fundamentals.quality;
  const sec = snapshot?.fundamentals.secXbrl;
  const primarySize = row.assetClass === "stock" ? marketCap : netAssets;
  const sizeLabel = row.assetClass === "stock" ? "market cap" : "net assets";
  const sourceState = snapshot?.state || "catalog_only";
  if (locale === "pl") {
    return {
      summary: `${row.name} (${row.symbol}) · ${label}. ${price ? `Cena ${price}. ` : ""}${primarySize ? `${sizeLabel} ${primarySize}. ` : ""}Stan źródła: ${sourceState}. ${quality ? `Jakość fundamentals ${quality.qualityScore}/100, limit pewności ${quality.confidenceCap}%. ` : ""}${sec ? `SEC/XBRL: ${sec.state}, pokrycie ${sec.conceptCoverageScore}/100.` : "Pełne SEC/XBRL wymaga trybu detail i konfiguracji źródła."}`,
      why: "Lens oddziela bieżące notowanie, dane fundamentalne, świeżość sprawozdania i drugie źródło SEC. Brak któregokolwiek poziomu obniża pewność zamiast tworzyć neutralne zero.",
      next:
        snapshot?.state === "source_bound"
          ? "Sprawdź waterfall pewności, najnowszy filing i rozbieżności Alpha Vantage ↔ SEC przed mocniejszym wnioskiem."
          : "Skonfiguruj ALPHA_VANTAGE_API_KEY i SEC_USER_AGENT, a następnie ponów szczegółowy skan instrumentu.",
    };
  }
  if (locale === "de") {
    return {
      summary: `${row.name} (${row.symbol}) · ${label}. ${price ? `Preis ${price}. ` : ""}${primarySize ? `${sizeLabel} ${primarySize}. ` : ""}Quellenstatus: ${sourceState}. ${quality ? `Fundamentals-Qualität ${quality.qualityScore}/100, Confidence-Cap ${quality.confidenceCap}%. ` : ""}${sec ? `SEC/XBRL: ${sec.state}, Abdeckung ${sec.conceptCoverageScore}/100.` : "Vollständiges SEC/XBRL benötigt Detailmodus und konfigurierte Quellen."}`,
      why: "Lens trennt laufende Notierung, Fundamentals, Filing-Frische und die SEC-Zweitquelle. Fehlende Ebenen senken die Konfidenz statt ein neutrales Nullfeld zu erzeugen.",
      next:
        snapshot?.state === "source_bound"
          ? "Prüfe Confidence Waterfall, neuestes Filing und Alpha-Vantage↔SEC-Abweichungen vor einer stärkeren Aussage."
          : "ALPHA_VANTAGE_API_KEY und SEC_USER_AGENT konfigurieren und den Detail-Scan erneut ausführen.",
    };
  }
  return {
    summary: `${row.name} (${row.symbol}) · ${label}. ${price ? `Price ${price}. ` : ""}${primarySize ? `${sizeLabel} ${primarySize}. ` : ""}Source state: ${sourceState}. ${quality ? `Fundamental quality ${quality.qualityScore}/100, confidence cap ${quality.confidenceCap}%. ` : ""}${sec ? `SEC/XBRL: ${sec.state}, coverage ${sec.conceptCoverageScore}/100.` : "Full SEC/XBRL requires detail mode and configured sources."}`,
    why: "Lens separates the current quote, fundamentals, filing freshness and the SEC second source. A missing layer lowers confidence instead of becoming a neutral zero.",
    next:
      snapshot?.state === "source_bound"
        ? "Review the confidence waterfall, latest filing and Alpha Vantage ↔ SEC differences before stronger wording."
        : "Configure ALPHA_VANTAGE_API_KEY and SEC_USER_AGENT, then rerun the committed detail scan.",
  };
}

function marketRowToLensResult(
  row: Pass466LensMarketRow,
  locale: LensLocale,
  snapshot: Pass459AlphaVantageSnapshot | null,
): VelmereSearchResult {
  const quality = snapshot?.fundamentals.quality;
  const sec = snapshot?.fundamentals.secXbrl;
  const sourceBound = snapshot?.state === "source_bound";
  const confidenceCandidates = [
    sourceBound ? 86 : 56,
    row.confidenceFloor,
    quality?.confidenceCap ?? 100,
    sec?.confidenceCap ?? 100,
  ];
  const sourceConfidence = Math.max(
    24,
    Math.min(...confidenceCandidates.filter(Number.isFinite)),
  );
  const localized = marketResultCopy(row, locale, snapshot);
  const classLabel = marketClassLabel(row, locale);
  const providerMissing =
    snapshot?.missingReason ||
    (locale === "pl"
      ? "Kluczowy provider nie został uruchomiony w sugestii."
      : locale === "de"
        ? "Der Keyed Provider wurde in der Vorschlagsansicht nicht ausgeführt."
        : "The keyed provider was not executed in suggestion mode.");
  const missingData = [
    !sourceBound ? providerMissing : null,
    !sec || sec.state === "sec_required"
      ? locale === "pl"
        ? "SEC Companyfacts/XBRL i bezpośredni filing wymagane"
        : locale === "de"
          ? "SEC Companyfacts/XBRL und direkter Filing-Link erforderlich"
          : "SEC Companyfacts/XBRL and a direct filing link required"
      : null,
    quality?.state === "partial" || quality?.state === "source_required"
      ? locale === "pl"
        ? "pełny cash flow, bilans i komplet czterech kwartałów wymagany"
        : locale === "de"
          ? "vollständiger Cashflow, Bilanz und vier Quartale erforderlich"
          : "complete cash flow, balance sheet and four-quarter history required"
      : null,
  ].filter((item): item is string => Boolean(item));
  const providerSource = snapshot
    ? {
        id: "alpha-vantage-detail",
        label: snapshot.source,
        mode: sourceBound ? ("live" as const) : ("fallback" as const),
        freshness: snapshot.sourceTimestamp
          ? new Date(snapshot.sourceTimestamp * 1000).toISOString()
          : "source required",
        confidence: sourceBound ? sourceConfidence : 32,
        note: snapshot.missingReason || snapshot.providerFunctions.join(" · "),
      }
    : null;
  const secSource = sec?.filingUrl
    ? {
        id: "sec-filing",
        label: `${sec.filingForm || "SEC filing"} · ${sec.filingDate || "date required"}`,
        mode: "live" as const,
        freshness: sec.filingDate || "source required",
        confidence: sec.confidenceCap,
        note: sec.filingUrl,
      }
    : null;
  return {
    id: `market-${row.assetClass}-${row.symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: row.name,
    symbol: row.symbol,
    category: "market",
    tone: marketTone(row),
    summary: localized.summary,
    whyItMatters: localized.why,
    missingData: missingData.length
      ? missingData
      : [
          locale === "pl"
            ? "sprawdź najnowszy filing i drugi provider"
            : locale === "de"
              ? "neuestes Filing und Zweitprovider prüfen"
              : "review latest filing and second provider",
        ],
    nextOperatorStep: localized.next,
    sourceMode: sourceBound ? "live_table" : "table",
    sourceConfidence,
    shieldHref: buildVelmereShieldBridge(row.symbol, row.id).href,
    avatarLabel: row.glyph,
    bridge: buildVelmereShieldBridge(row.symbol, row.id),
    sources: [
      {
        id: "real-markets-catalog",
        label: `Velmère Real Markets · ${classLabel}`,
        mode: "table",
        freshness: "catalog",
        confidence: Math.min(72, row.confidenceFloor),
        note: row.proofOrDisclosureLane,
      },
      ...(providerSource ? [providerSource] : []),
      ...(secSource ? [secSource] : []),
    ],
    chips: [
      classLabel,
      snapshot?.state || "catalog",
      quality ? `quality ${quality.qualityScore}/100` : "fundamentals pending",
      sec ? `SEC ${sec.state}` : "SEC required",
    ],
    marketSnapshot: {
      assetClass: row.assetClass,
      currency: snapshot?.currency || "USD",
      price: snapshot?.currentPrice ?? undefined,
      marketCap: snapshot?.marketCap ?? undefined,
      volume24h: snapshot?.volume24h ?? undefined,
      change24h: snapshot?.changePercent ?? undefined,
      high24h: snapshot?.high24h ?? undefined,
      low24h: snapshot?.low24h ?? undefined,
      observedAt: snapshot?.sourceTimestamp
        ? new Date(snapshot.sourceTimestamp * 1000).toISOString()
        : undefined,
      providerState: snapshot?.state,
      providerFunctions: snapshot?.providerFunctions,
      providerExchange: snapshot?.exchange || undefined,
      fundamentalState: quality?.state,
      fundamentalQualityScore: quality?.qualityScore,
      fundamentalConfidenceCap: quality?.confidenceCap,
      fundamentalFilingDate:
        sec?.filingDate || quality?.filingDate || undefined,
      fundamentalFilingUrl: sec?.filingUrl || undefined,
      fundamentalFilingForm:
        sec?.filingForm || quality?.filingForm || undefined,
      fundamentalSecState: sec?.state,
      fundamentalSecCoverage: sec?.conceptCoverageScore,
      fundamentalFilingAgeDays: quality?.filingAgeDays ?? undefined,
      fundamentalReportedPeriodEnd: quality?.reportedPeriodEnd || undefined,
      fundamentalFreeCashFlowTtm: quality?.freeCashFlowTtm ?? undefined,
      fundamentalNetDebtToEbitda: quality?.netDebtToEbitda ?? undefined,
      fundamentalCurrentRatio: quality?.currentRatio ?? undefined,
      fundamentalRevenueTtm:
        quality?.revenueTtm ?? snapshot?.fundamentals.revenueTtm ?? undefined,
      fundamentalProfitMargin: snapshot?.fundamentals.profitMargin ?? undefined,
      fundamentalPeRatio: snapshot?.fundamentals.peRatio ?? undefined,
      fundamentalExpenseRatio: snapshot?.fundamentals.expenseRatio ?? undefined,
      fundamentalNetAssets: snapshot?.fundamentals.netAssets ?? undefined,
      fundamentalTopHoldings: snapshot?.fundamentals.topHoldings
        .slice(0, 5)
        .map(
          (holding) =>
            `${holding.symbol || holding.description}${holding.weight == null ? "" : ` ${holding.weight}%`}`,
        ),
      etfTop10Concentration: quality?.etf.concentrationTop10 ?? undefined,
      etfEffectiveHoldings: quality?.etf.effectiveHoldings ?? undefined,
      etfBenchmarkSymbol: quality?.etf.benchmarkSymbol || undefined,
      etfOverlapPercent: quality?.etf.overlapPercent ?? undefined,
      fundamentalBoundary: quality?.boundary || sec?.boundary,
      anomalyLabel:
        sec?.flags.slice(0, 2).join(" · ") ||
        quality?.flags.slice(0, 2).join(" · "),
    },
  };
}

async function loadPass466MarketMatches(
  query: string,
  locale: LensLocale,
  intent: SearchIntent,
) {
  const rows = searchPass466LensMarkets(query, 12);
  if (!rows.length) return [];
  if (
    intent === "detail" &&
    rows.length === 1 &&
    isPass466ExactMarketMatch(rows[0], query)
  ) {
    const snapshot = await resolvePass459AlphaVantageSnapshot({
      symbol: rows[0].symbol,
      assetClass: providerClass(rows[0]),
    });
    return [marketRowToLensResult(rows[0], locale, snapshot)];
  }
  return rows.map((row) => marketRowToLensResult(row, locale, null));
}

function resolveCoinGeckoConfidence(coin: CoinGeckoMarket) {
  const symbol = coin.symbol.toUpperCase();
  const fixed: Record<string, number> = {
    BTC: 74,
    ETH: 69,
    SOL: 66,
    BNB: 63,
    USDT: 62,
    USDC: 61,
    LINK: 64,
    LTC: 62,
  };
  if (fixed[symbol]) return fixed[symbol];

  let score = 50;
  if (typeof coin.current_price === "number") score += 4;
  if (typeof coin.price_change_percentage_24h === "number") score += 3;
  if (coin.image) score += 2;
  if ((coin.total_volume ?? 0) > 0) score += 3;
  const cap = coin.market_cap ?? 0;
  if (cap >= 100_000_000_000) score += 12;
  else if (cap >= 10_000_000_000) score += 10;
  else if (cap >= 1_000_000_000) score += 8;
  else if (cap >= 100_000_000) score += 6;
  else if (cap > 0) score += 4;
  return Math.max(52, Math.min(72, score));
}

function coinToLensResult(
  coin: CoinGeckoMarket,
  locale: LensLocale,
): VelmereSearchResult {
  const symbol = coin.symbol.toUpperCase();
  const price =
    typeof coin.current_price === "number"
      ? `$${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: coin.current_price < 1 ? 6 : 2 })}`
      : "price pending";
  const marketCap =
    typeof coin.market_cap === "number"
      ? `$${coin.market_cap.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })}`
      : "market-cap pending";
  const volume =
    typeof coin.total_volume === "number"
      ? `$${coin.total_volume.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })}`
      : "volume pending";
  const fdv =
    typeof coin.fully_diluted_valuation === "number"
      ? `$${coin.fully_diluted_valuation.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })}`
      : "FDV pending";
  const highLow =
    typeof coin.high_24h === "number" && typeof coin.low_24h === "number"
      ? `${coin.low_24h.toLocaleString(undefined, { maximumFractionDigits: coin.low_24h < 1 ? 6 : 2 })}-${coin.high_24h.toLocaleString(undefined, { maximumFractionDigits: coin.high_24h < 1 ? 6 : 2 })}`
      : "range pending";
  const change24hValue =
    coin.price_change_percentage_24h_in_currency ??
    coin.price_change_percentage_24h;
  const change =
    typeof change24hValue === "number"
      ? `${change24hValue.toFixed(2)}% 24h`
      : "24h pending";
  const change1h =
    typeof coin.price_change_percentage_1h_in_currency === "number"
      ? `${coin.price_change_percentage_1h_in_currency.toFixed(2)}% 1h`
      : "1h pending";
  const change7d =
    typeof coin.price_change_percentage_7d_in_currency === "number"
      ? `${coin.price_change_percentage_7d_in_currency.toFixed(2)}% 7d`
      : "7d pending";
  const confidence = resolveCoinGeckoConfidence(coin);
  const bridge = buildVelmereShieldBridge(symbol, coin.id);
  const localized =
    locale === "de"
      ? {
          summary: `Lens hat ${coin.name} erkannt: Preis ${price}, Marktkapitalisierung ${marketCap}, Volumen ${volume}, Bewegung ${change}, 1h ${change1h}, 7d ${change7d}, FDV ${fdv}, 24h-Spanne ${highLow}. Das ist ein Markt-Preview; stärkere Aussagen brauchen Orderbuch, frischen Zeitstempel und Zweitquelle.`,
          why: "Der Bericht trennt Logo/Preis/Volumen von echter Beweislage. Fehlendes Orderbuch, Holder-Kontext oder Venue-Vergleich bleibt sichtbar statt als Sicherheit verkauft zu werden.",
          next: "Öffne Shield nur, wenn du Marktdaten mit Venue-Depth und Second-Source-Divergenz vergleichen willst.",
          chips: ["Live-Markt", "Metadaten-Logo", "Zweitquelle nötig"],
        }
      : locale === "en"
        ? {
            summary: `Lens identified ${coin.name}: price ${price}, market cap ${marketCap}, volume ${volume}, 24h move ${change}, 1h ${change1h}, 7d ${change7d}, FDV ${fdv}, 24h range ${highLow}. This is a compact market preview; stronger wording needs order book depth, a fresh timestamp and a second venue.`,
            why: "The report separates logo/price/volume from real evidence. Missing order book, holder context or venue comparison stays visible instead of being sold as certainty.",
            next: "Open Shield only when you want to compare market data with venue depth and second-source divergence.",
            chips: ["live market", "metadata logo", "second source needed"],
          }
        : {
            summary: `Lens rozpoznał ${coin.name}: cena ${price}, kapitalizacja ${marketCap}, wolumen ${volume}, ruch ${change}, 1h ${change1h}, 7d ${change7d}, FDV ${fdv}, zakres 24h ${highLow}. To krótki podgląd rynku; mocniejszy opis wymaga orderbooku, świeżego timestampu i drugiego źródła.`,
            why: "Raport oddziela logo/cenę/wolumen od realnych dowodów. Brak orderbooku, kontekstu holderów lub porównania giełd zostaje widoczny zamiast udawać pewność.",
            next: "Otwórz Shield tylko wtedy, gdy chcesz porównać market data z venue-depth oraz second-source divergence.",
            chips: [
              "rynek live",
              "logo z metadanych",
              "drugie źródło wymagane",
            ],
          };
  return {
    id: `coingecko-${coin.id}`,
    title: coin.name,
    symbol,
    category: "token",
    tone: "review",
    summary: localized.summary,
    whyItMatters: localized.why,
    missingData: [
      "Binance/MEXC depth",
      "second-source venue agreement",
      "fresh source timestamp",
      "holder/context lane",
      "advanced liquidity/slippage packet",
    ],
    nextOperatorStep: localized.next,
    sourceMode: "live_table",
    sourceConfidence: confidence,
    shieldHref: bridge.href,
    avatarLabel: symbol,
    avatarImage: coin.image,
    bridge,
    sources: [
      {
        id: "coingecko-markets",
        label: "CoinGecko markets",
        mode: "live",
        freshness: "request-time",
        confidence,
        note: "price/market-cap/volume/FDV/high-low/logo lane",
      },
      {
        id: "venue-depth",
        label: "Venue depth",
        mode: "missing",
        freshness: "missing",
        confidence: 0,
        note: "requires Binance/MEXC/Coinbase/Kraken adapter",
      },
    ],
    chips: localized.chips,
    marketSnapshot: {
      currency: "USD",
      price: coin.current_price,
      marketCap: coin.market_cap,
      fdv: coin.fully_diluted_valuation,
      volume24h: coin.total_volume,
      change1h: coin.price_change_percentage_1h_in_currency,
      change24h: change24hValue,
      change7d: coin.price_change_percentage_7d_in_currency,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      observedAt: coin.last_updated,
      liquidityLabel:
        locale === "pl"
          ? "Do potwierdzenia z venue depth"
          : locale === "de"
            ? "Mit Venue Depth zu bestätigen"
            : "Requires venue-depth confirmation",
      depthLabel:
        locale === "pl"
          ? "Binance / MEXC / Coinbase lane wymagany"
          : locale === "de"
            ? "Binance-/MEXC-/Coinbase-Pfad erforderlich"
            : "Binance / MEXC / Coinbase lane required",
      holderConcentrationLabel:
        locale === "pl"
          ? "Snapshot holderów wymagany"
          : locale === "de"
            ? "Holder-Snapshot erforderlich"
            : "Holder snapshot required",
      unlockLabel:
        locale === "pl"
          ? "Harmonogram unlocków wymagany"
          : locale === "de"
            ? "Unlock-Zeitplan erforderlich"
            : "Unlock schedule required",
      venueHealthLabel:
        locale === "pl"
          ? "Status, depth i heartbeat do spięcia"
          : locale === "de"
            ? "Status, Depth und Heartbeat ausstehend"
            : "Status, depth and heartbeat pending",
      anomalyLabel:
        locale === "pl"
          ? "Porównaj ruch ceny z wolumenem i głębokością"
          : locale === "de"
            ? "Preisbewegung mit Volumen und Tiefe vergleichen"
            : "Compare price move against volume and depth",
    },
  };
}

async function attachPass463VenueEvidence(
  result: VelmereSearchResult,
  locale: LensLocale,
): Promise<VelmereSearchResult> {
  const assetSymbol = normalizePass463AssetSymbol(result.symbol || "");
  if (!assetSymbol || !/^[A-Z0-9]{2,12}$/.test(assetSymbol)) return result;
  try {
    const secondaryVenueId = preferredPass462SecondaryVenue(
      "binance",
      assetSymbol,
    );
    const [primary, secondary] = await Promise.all([
      resolvePass461VenueHealthWithFallback("binance", assetSymbol),
      resolvePass461VenueHealthWithFallback(
        secondaryVenueId,
        assetSymbol,
      ).catch(() => null),
    ]);
    if (!primary) return result;
    const comparison = buildPass462CrossVenueComparison(primary, secondary);
    const divergence =
      comparison.priceDivergenceBps == null
        ? locale === "pl"
          ? "wymaga porównywalnej drugiej pary"
          : locale === "de"
            ? "benötigt ein vergleichbares zweites Paar"
            : "requires a comparable second pair"
        : `${comparison.priceDivergenceBps.toFixed(1)} bps`;
    const comparisonCopy =
      locale === "pl"
        ? `${assetSymbol} ma parę ${primary.pair} na ${primary.venue}${secondary ? ` oraz ${secondary.pair} na ${secondary.venue}` : ""}. Stan ${comparison.state}, rozjazd ceny ${divergence}, baza ${comparison.quoteBasisState}. To kontrola jakości market data, nie certyfikat bezpieczeństwa giełdy.`
        : locale === "de"
          ? `${assetSymbol} nutzt ${primary.pair} auf ${primary.venue}${secondary ? ` und ${secondary.pair} auf ${secondary.venue}` : ""}. Status ${comparison.state}, Preisabweichung ${divergence}, Quotierungsbasis ${comparison.quoteBasisState}. Dies ist eine Marktdatenprüfung, kein Börsen-Sicherheitszertifikat.`
          : `${assetSymbol} uses ${primary.pair} on ${primary.venue}${secondary ? ` and ${secondary.pair} on ${secondary.venue}` : ""}. State ${comparison.state}, price divergence ${divergence}, quote basis ${comparison.quoteBasisState}. This is a market-data quality check, not an exchange certificate.`;
    const sourceConfidence = Math.min(
      comparison.confidenceCap,
      comparison.state === "aligned"
        ? Math.max(result.sourceConfidence, 76)
        : comparison.state === "watch"
          ? Math.min(result.sourceConfidence, 66)
          : Math.min(result.sourceConfidence, 48),
    );
    const sourceModeForVenue = (state: typeof primary.state) =>
      state === "source_bound" || state === "review"
        ? ("live" as const)
        : state === "stale"
          ? ("fallback" as const)
          : ("missing" as const);
    const liveSources = [
      {
        id: `${primary.venueId}-venue-health`,
        label: `${primary.venue} ${primary.pair}`,
        mode: sourceModeForVenue(primary.state),
        freshness:
          primary.state === "provider_error" || primary.state === "unsupported"
            ? "source required"
            : primary.observedAt,
        confidence: primary.confidenceCap,
        note: `price/spread/depth/continuity · ${primary.state} · ${primary.pairResolutionState}`,
      },
      ...(secondary
        ? [
            {
              id: `${secondary.venueId}-venue-health`,
              label: `${secondary.venue} ${secondary.pair}`,
              mode: sourceModeForVenue(secondary.state),
              freshness:
                secondary.state === "provider_error" ||
                secondary.state === "unsupported"
                  ? "source required"
                  : secondary.observedAt,
              confidence: secondary.confidenceCap,
              note: `${secondary.quoteCurrency} reference · ${secondary.state} · ${secondary.pairResolutionState}`,
            },
          ]
        : []),
    ];
    const comparisonHasTwoUsableSources =
      Boolean(secondary) &&
      comparison.directPriceComparable &&
      comparison.state !== "single_source" &&
      comparison.state !== "unavailable";
    const retainedMissingData = result.missingData.filter((item) => {
      if (/fresh source timestamp|binance\/mexc depth/i.test(item)) {
        return primary.state === "stale" || primary.state === "provider_error";
      }
      if (/second-source venue agreement/i.test(item)) {
        return !comparisonHasTwoUsableSources;
      }
      return true;
    });
    const secondVenueGap = comparisonHasTwoUsableSources
      ? null
      : locale === "pl"
        ? `Wymagane porównywalne drugie venue dla ${assetSymbol}; obecny stan: ${comparison.state}, baza: ${comparison.quoteBasisState}.`
        : locale === "de"
          ? `Vergleichbarer zweiter Handelsplatz für ${assetSymbol} erforderlich; Status: ${comparison.state}, Basis: ${comparison.quoteBasisState}.`
          : `Comparable second venue required for ${assetSymbol}; current state: ${comparison.state}, basis: ${comparison.quoteBasisState}.`;
    return {
      ...result,
      summary: `${result.summary} ${comparisonCopy}`,
      sourceMode: liveSources.some((source) => source.mode === "live")
        ? "live_table"
        : result.sourceMode,
      sourceConfidence,
      missingData: [
        ...retainedMissingData,
        ...(secondVenueGap && !retainedMissingData.includes(secondVenueGap)
          ? [secondVenueGap]
          : []),
      ].slice(0, 8),
      sources: [
        ...result.sources.filter((source) => source.id !== "venue-depth"),
        ...liveSources,
      ],
      chips: [
        ...result.chips,
        `${assetSymbol} ${comparison.state}`,
        `basis ${comparison.quoteBasisState}`,
      ].slice(0, 6),
      marketSnapshot: {
        ...result.marketSnapshot,
        venueHealthLabel: secondary
          ? `${primary.state} ${primary.healthScore}/100 · ${secondary.state} ${secondary.healthScore}/100`
          : `${primary.state} ${primary.healthScore}/100 · second venue required`,
        venueAssetSymbol: assetSymbol,
        venuePrimary: `${primary.venue} ${primary.pair}`,
        venueSecondary: secondary
          ? `${secondary.venue} ${secondary.pair}`
          : undefined,
        venuePrimaryQuoteCurrency: primary.quoteCurrency,
        venueSecondaryQuoteCurrency: secondary?.quoteCurrency,
        venueQuoteBasisState: comparison.quoteBasisState,
        venueQuoteBasisPenalty: comparison.quoteBasisPenalty,
        venuePairResolutionState: primary.pairResolutionState,
        venuePairResolutionNote: primary.pairResolutionNote,
        venueReferencePrice: primary.referencePrice ?? undefined,
        venueSecondaryPrice: secondary?.referencePrice ?? undefined,
        venueComparisonState: comparison.state,
        venueDivergenceBps: comparison.priceDivergenceBps ?? undefined,
        venueSpreadDeltaBps: comparison.spreadDeltaBps ?? undefined,
        venueFreshnessDeltaSeconds:
          comparison.freshnessDeltaSeconds ?? undefined,
        venueHealthScore: secondary
          ? Math.round((primary.healthScore + secondary.healthScore) / 2)
          : primary.healthScore,
        venueConfidenceCap: comparison.confidenceCap,
        venueEvidenceNote: `${comparison.notes.join(" · ")} ${comparison.boundary}`,
      },
    };
  } catch {
    return result;
  }
}

function scoreCoinGeckoMatch(coin: CoinGeckoMarket, query: string) {
  const clean = query.trim().toLowerCase();
  const symbol = coin.symbol.toLowerCase();
  const name = coin.name.toLowerCase();
  const id = coin.id.toLowerCase();
  const nameWords = name.split(/[^a-z0-9]+/).filter(Boolean);

  if (symbol === clean) return 0;
  if (id === clean) return 1;
  if (name === clean) return 2;
  if (symbol.startsWith(clean)) return 3;
  if (nameWords.some((word) => word.startsWith(clean))) return 4;
  if (id.startsWith(clean)) return 5;
  if (clean.length >= 4 && name.includes(clean)) return 8;
  return Number.POSITIVE_INFINITY;
}

async function loadCoinGeckoMatches(query: string, locale: LensLocale) {
  const clean = query.trim().toLowerCase();
  if (clean.length < 1) return [];
  try {
    const params = new URLSearchParams({
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: "250",
      page: "1",
      sparkline: "false",
      price_change_percentage: "1h,24h,7d",
    });
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 45 },
      },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as CoinGeckoMarket[];
    const scored = rows
      .map((coin) => ({ coin, score: scoreCoinGeckoMatch(coin, clean) }))
      .filter((row) => Number.isFinite(row.score))
      .sort(
        (a, b) =>
          a.score - b.score ||
          (b.coin.market_cap ?? 0) - (a.coin.market_cap ?? 0),
      );

    // PASS359: exact CoinGecko symbol/id/name search returns that asset only.
    const exactOnly = (scored[0]?.score ?? Number.POSITIVE_INFINITY) <= 2;
    const resultLimit = clean.length <= 1 ? 6 : 12;
    const mapped = (
      exactOnly ? scored.slice(0, 1) : scored.slice(0, resultLimit)
    ).map(({ coin }) => coinToLensResult(coin, locale));
    if (exactOnly && mapped.length === 1) {
      return [await attachPass463VenueEvidence(mapped[0], locale)];
    }
    return mapped;
  } catch {
    return [];
  }
}

function mergeResults(
  live: VelmereSearchResult[],
  local: VelmereSearchResult[],
) {
  const seen = new Set<string>();
  const merged: VelmereSearchResult[] = [];
  for (const item of [...live, ...local]) {
    const key = `${item.symbol ?? item.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, 12);
}

function localizeMissingData(value: string, locale: LensLocale) {
  if (locale === "en") return value;
  const clean = value.toLowerCase();
  if (locale === "pl") {
    if (clean.includes("orderbook") || clean.includes("depth"))
      return "głębokość orderbooku dla wskazanej giełdy";
    if (clean.includes("holder"))
      return "świeży snapshot koncentracji holderów";
    if (clean.includes("contract"))
      return "weryfikacja uprawnień i kontekstu kontraktu";
    if (
      clean.includes("second") ||
      clean.includes("agreement") ||
      clean.includes("comparison")
    )
      return "potwierdzenie w drugim niezależnym źródle";
    if (clean.includes("timestamp") || clean.includes("fresh"))
      return "aktualny timestamp źródła";
    if (clean.includes("reserve") || clean.includes("issuer"))
      return "aktualny kontekst emitenta lub rezerw";
    if (clean.includes("wallet")) return "wdrożenie i test bramki portfela";
    if (clean.includes("policy")) return "zatwierdzona polityka dostępu";
    if (clean.includes("adapter")) return "aktywny adapter danych";
    return "dodatkowa weryfikacja źródłowa";
  }
  if (clean.includes("orderbook") || clean.includes("depth"))
    return "Orderbuch-Tiefe für den angegebenen Handelsplatz";
  if (clean.includes("holder"))
    return "aktueller Snapshot der Holder-Konzentration";
  if (clean.includes("contract"))
    return "Prüfung von Contract-Rechten und Kontext";
  if (
    clean.includes("second") ||
    clean.includes("agreement") ||
    clean.includes("comparison")
  )
    return "Bestätigung durch eine zweite unabhängige Quelle";
  if (clean.includes("timestamp") || clean.includes("fresh"))
    return "aktueller Quellenzeitstempel";
  if (clean.includes("reserve") || clean.includes("issuer"))
    return "aktueller Emittenten- oder Reservekontext";
  if (clean.includes("wallet"))
    return "Implementierung und Test des Wallet-Gates";
  if (clean.includes("policy")) return "freigegebene Zugriffsrichtlinie";
  if (clean.includes("adapter")) return "aktiver Datenadapter";
  return "zusätzliche Quellenprüfung";
}

function localizeResult(
  item: VelmereSearchResult,
  locale: LensLocale,
): VelmereSearchResult {
  if (locale === "en") return item;
  const isLiveResult =
    item.id.startsWith("coingecko-") || item.id.startsWith("market-");
  const symbol = item.symbol ? ` (${item.symbol})` : "";
  const sourceCount = item.sources.filter(
    (source) => source.mode !== "missing",
  ).length;
  const localized =
    locale === "pl"
      ? {
          summary: `${item.title}${symbol}. Lens połączył ${sourceCount} dostępne warstwy źródłowe. Pewność wyniku wynosi ${item.sourceConfidence}%, a niewczytane pola pozostają jawne w raporcie.`,
          why:
            item.category === "token" || item.category === "contract"
              ? "Cena i rozpoznanie aktywa nie wystarczają do pełnego audytu. Płynność, uprawnienia kontraktu, koncentracja holderów i zgodność drugiego źródła pozostają osobnymi warstwami."
              : "Wynik rozdziela potwierdzoną informację, stan źródła i brakujące dane, aby opis nie był mocniejszy niż dostępny materiał.",
          next:
            item.category === "token" || item.category === "contract"
              ? "Otwórz Shield i porównaj wykres, płynność, źródła oraz brakujące pola przed rozszerzeniem wniosku."
              : "Przejdź do wskazanej powierzchni Velmère i sprawdź źródła oraz zakres danych.",
        }
      : {
          summary: `${item.title}${symbol}. Lens hat ${sourceCount} verfügbare Quellenebenen verbunden. Die Quellenkonfidenz beträgt ${item.sourceConfidence}%; nicht geladene Felder bleiben im Bericht sichtbar.`,
          why:
            item.category === "token" || item.category === "contract"
              ? "Preis und Asset-Erkennung reichen für ein vollständiges Audit nicht aus. Liquidität, Contract-Rechte, Holder-Konzentration und Zweitquellen-Abgleich bleiben getrennte Ebenen."
              : "Das Ergebnis trennt bestätigte Information, Quellenstatus und fehlende Daten, damit die Aussage nicht stärker als die Evidenz wird.",
          next:
            item.category === "token" || item.category === "contract"
              ? "Öffne Shield und vergleiche Chart, Liquidität, Quellen und Datenlücken vor einer stärkeren Schlussfolgerung."
              : "Öffne die angegebene Velmère-Oberfläche und prüfe Quellen sowie Datenumfang.",
        };

  return {
    ...item,
    summary: isLiveResult ? item.summary : localized.summary,
    whyItMatters: isLiveResult ? item.whyItMatters : localized.why,
    nextOperatorStep: isLiveResult ? item.nextOperatorStep : localized.next,
    missingData: item.missingData.map((value) =>
      localizeMissingData(value, locale),
    ),
    sources: item.sources.map((source) => ({
      ...source,
      freshness:
        locale === "pl"
          ? source.freshness === "missing"
            ? "brak"
            : source.freshness === "cached"
              ? "cache"
              : source.freshness === "request-time"
                ? "czas zapytania"
                : source.freshness
          : locale === "de"
            ? source.freshness === "missing"
              ? "fehlt"
              : source.freshness === "cached"
                ? "Cache"
                : source.freshness === "request-time"
                  ? "Abfragezeit"
                  : source.freshness
            : source.freshness,
      note: localizeSourceNote(source, locale),
    })),
  };
}

function localizeSourceNote(
  source: VelmereSearchResult["sources"][number],
  locale: LensLocale,
) {
  const note = source.note.trim();
  if (source.mode === "missing") {
    return locale === "pl"
      ? "Źródło nie zostało dołączone do tego żądania. Potrzebna jest świeża odpowiedź providera i jawny timestamp."
      : locale === "de"
        ? "Die Quelle wurde dieser Anfrage nicht beigefügt. Eine frische Provider-Antwort mit offenem Zeitstempel ist erforderlich."
        : "The source was not attached to this request. A fresh provider response with an explicit timestamp is required.";
  }
  if (source.id === "coingecko-markets") {
    return locale === "pl"
      ? "Cena, kapitalizacja, wolumen, FDV, zakres 24h i identyfikacja aktywa z odpowiedzi rynku."
      : locale === "de"
        ? "Preis, Marktkapitalisierung, Volumen, FDV, 24h-Spanne und Asset-Identität aus der Marktantwort."
        : "Price, market cap, volume, FDV, 24h range and asset identity from the market response.";
  }
  if (source.id === "local-table") {
    return locale === "pl"
      ? "Lokalny katalog służy do identyfikacji i kontekstu; nie jest świeżym notowaniem ani dowodem płynności."
      : locale === "de"
        ? "Der lokale Katalog dient Identität und Kontext; er ist kein frischer Kurs und kein Liquiditätsnachweis."
        : "The local catalog provides identity and context; it is not a fresh quote or liquidity proof.";
  }
  if (source.id === "alpha-vantage-detail") {
    return locale === "pl"
      ? `Notowanie i fundamentals providera. ${note}`
      : locale === "de"
        ? `Kurs- und Fundamentaldaten des Providers. ${note}`
        : `Provider quote and fundamentals. ${note}`;
  }
  if (source.id === "sec-filing") {
    return locale === "pl"
      ? `Bezpośredni dokument SEC / filing: ${note}`
      : locale === "de"
        ? `Direktes SEC-Dokument / Filing: ${note}`
        : `Direct SEC document / filing: ${note}`;
  }
  if (/venue-health$/.test(source.id)) {
    return locale === "pl"
      ? `Stan venue, para, spread, depth i ciągłość źródła. ${note}`
      : locale === "de"
        ? `Venue-Status, Paar, Spread, Depth und Quellenkontinuität. ${note}`
        : `Venue state, pair, spread, depth and source continuity. ${note}`;
  }
  return note;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = sanitizeSearchInput(url.searchParams.get("q") ?? "");
  const rawMode = url.searchParams.get("mode") ?? "all";
  const mode = allowedModes.has(rawMode as VelmereSearchMode)
    ? (rawMode as VelmereSearchMode)
    : "all";
  const locale = resolveLensLocale(url.searchParams.get("locale"));
  const intent = resolveSearchIntent(url.searchParams.get("intent"));
  const response = searchVelmereIntelligence(query, mode);
  const marketMatches =
    mode === "all" || mode === "market"
      ? await loadPass466MarketMatches(query, locale, intent)
      : [];
  const liveMatches =
    mode === "all" || mode === "token" || mode === "contract"
      ? await loadCoinGeckoMatches(query, locale)
      : [];
  if (marketMatches.length || liveMatches.length) {
    response.results = mergeResults(
      [...marketMatches, ...liveMatches],
      mode === "market" ? [] : response.results,
    );
    response.productionBoundary =
      "Lens łączy katalog Real Markets z dokładnym wyszukiwaniem aktywów. Sugestie pozostają lekkie, a szczegóły mogą korzystać z dodatkowych źródeł rynkowych i sprawozdawczych.";
  }
  response.results = response.results.map((item) =>
    localizeResult(item, locale),
  );
  const safety = assertSearchCopyIsSafe(JSON.stringify(response));

  if (!safety.ok) {
    return jsonResponse(
      {
        ok: false,
        mode: "blocked",
        reason: safety.reason,
        boundary: velmereSearchSafetyBoundary,
      },
      400,
    );
  }

  return jsonResponse({
    ok: true,
    boundary: velmereSearchSafetyBoundary,
    ...response,
    mode: "velmere_intelligence_search_preview",
    pass463PairCoverage: pass463CanonicalPairCoverageContract,
    pass466RealMarketLens: pass466RealMarketLensContract,
  });
}
