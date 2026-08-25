"use client";
import { readJsonResponseBounded } from "@/lib/network/fetch-with-deadline";
import { clearShieldMarketCatalogClientCache, fetchShieldProFullCatalog } from "@/lib/market-integrity/shield-pro-full-catalog-client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  BarChart3,
  Crosshair,
  Droplets,
  FileCheck2,
  Globe2,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import BodyPortal from "@/components/ui/BodyPortal";
import AssetDetailModal, { type VlmAssetDetailModalData } from "@/components/market-integrity/AssetDetailModal";
import AssetLogo from "@/components/market-integrity/AssetLogo";
import ShieldProMonochromeGlobe from "@/components/market-integrity/ShieldProMonochromeGlobe";
import { VShieldPulse } from "@/components/motion/VelmereAnalysisMarks";
import { normalizeConfidencePercent } from "@/lib/market-integrity/confidence-calibration";
import {
  dedupeMarketInstruments,
  filterMarketInstruments,
} from "@/lib/market-integrity/market-instrument-search";
import {
  shieldProAggregateMetricsAvailable,
  shieldProCalibratedRiskConfidence,
  shieldProFieldVerified,
  shieldProModalMarketDataState,
  shieldProModeAfterRefreshFailure,
  shieldProPrimaryMarketSourceAsOf,
  shieldProRiskVerified,
  shieldProSourceLabel,
  shieldProVerifiedProviders,
  type ShieldProFeedMode,
  type ShieldProPublicDelivery,
} from "@/lib/market-integrity/shield-pro-customer-truth";
import {
  projectShieldProTableRow,
  type ShieldProTableCustomerProjection,
  type ShieldProTableProjectedField,
} from "@/lib/market-integrity/shield-pro-table-customer-projection";

type Locale = "pl" | "en" | "de";

type RiskResult = {
  score?: number;
  confidence?: number;
  dataSources?: string[];
  dataQuality?: "demo" | "partial" | "live";
  limitations?: string[];
  customerTruth?: {
    confidenceClass?: "NOT_CALIBRATED" | "NO_BOUND_EVIDENCE" | "LIMITED_EVIDENCE" | "EVIDENCE_BOUND";
  };
};

type MarketRow = {
  id: string;
  rank?: number;
  symbol: string;
  name: string;
  image?: string;
  price?: number;
  priceChange1h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  marketCap?: number;
  volume24h?: number;
  observedAt?: string;
  sparkline7d?: number[];
  result?: RiskResult;
  delivery?: ShieldProPublicDelivery;
};


type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};

type KlinePayload = {
  mode: "live_verified" | "live_partial" | "last_known_good" | "local_reference" | "conflict" | "live" | "stale" | "error";
  freshness?: "source_timestamped" | "partial_not_live" | "last_known_good" | "local_reference_not_live" | "withheld" | "live";
  source?: string;
  generatedAt?: string;
  staleAgeMs?: number;
  candles?: Candle[];
  error?: string;
};

type Timeframe = "15m" | "1h" | "4h" | "1d" | "1w" | "1mo";
type Tier = "Basic" | "Pro" | "Advanced";
type ShieldProSortKey = "price" | "hour" | "day" | "week" | "marketCap" | "volume" | "risk" | "evidence" | "trend";
type ShieldProSortState = { key: ShieldProSortKey; direction: "asc" | "desc" } | null;
type ShieldProCustomerRow = {
  row: MarketRow;
  projection: ShieldProTableCustomerProjection;
  id: string;
  symbol: string;
  name: string;
};

const TIMEFRAMES: Array<{ key: Timeframe; label: string; api: string }> = [
  { key: "15m", label: "15m", api: "15m" },
  { key: "1h", label: "1H", api: "1h" },
  { key: "4h", label: "4H", api: "4h" },
  { key: "1d", label: "1D", api: "1d" },
  { key: "1w", label: "1W", api: "7d" },
  { key: "1mo", label: "1M", api: "1mo" },
];

const TIER_ORDER: Tier[] = ["Basic", "Pro", "Advanced"];

const SHIELD_PRO_FEATURE_ICONS = [BarChart3, ShieldCheck, Droplets, Crosshair, TrendingUp, FileCheck2] as const;

const copy = {
  pl: {
    title: "Shield Pro",
    subtitle: "Dane rynkowe wyłącznie z ujawnionego źródła, opisowy status ryzyka i jeden terminal bez panelu technicznego.",
    referenceSubtitle: "Lokalne dane ilustracyjne służą wyłącznie do sprawdzenia interfejsu. Nie są LIVE, nie są rankingiem i nie publikują wyniku ryzyka.",
    context: "Roboczy terminal analityczny",
    tagline: "Integralność rynku · transparentność · dowody",
    proofs: ["Nazwane źródła", "Wyjaśnialna punktacja", "Dane ilustracyjne zawsze jawnie oznaczone"],
    referenceProofs: ["Tylko podgląd interfejsu", "Wynik ryzyka wyłączony", "Prawa providera nadal zablokowane"],
    marketScope: "Rynki globalne",
    features: [
      { title: "Analityka", description: "Wiele źródeł i kontekst rynkowy" },
      { title: "Integralność", description: "Struktura rynku i analiza zachowań" },
      { title: "Płynność", description: "Głębokość, przepływ i kondycja rynku" },
      { title: "Manipulacja", description: "Wzorce i anomalie behawioralne" },
      { title: "Presja rynku", description: "Presja, pozycjonowanie i potencjał" },
      { title: "Najpierw dowody", description: "Jawne źródła, założenia i braki" },
    ],
    metrics: {
      markets: "Monitorowane rynki",
      integrity: "Integralność (średnia)",
      marketCap: "Kapitalizacja w feedzie",
      risk: "Ryzyko manipulacji (średnia)",
      coverage: "Pokrycie dowodami",
      confidence: "Pewność dowodów (średnia)",
    },
    search: "Szukaj aktywa",
    shield: "Shield",
    realMarkets: "Real Markets",
    source: "Źródło",
    rows: "Instrumenty",
    verified: "Status ryzyka oparty na dostępnych danych",
    asset: "Aktywo",
    price: "Cena",
    hour: "1H",
    day: "24H",
    week: "7D",
    cap: "Kapitalizacja",
    volume: "Wolumen 24H",
    risk: "Ryzyko",
    evidence: "Dowody",
    trend: "7D",
    noData: "Brak danych spełniających wymagania źródła i świeżości",
    noSearchResults: "Brak instrumentów pasujących do wyszukiwania",
    clearSearch: "Wyczyść wyszukiwanie",
    showMore: "Pokaż kolejne rynki",
    unavailable: "Źródło chwilowo niedostępne",
    close: "Zamknij",
    chart: "Wykres OHLC",
    loading: "Pobieranie świec ze wskazanego źródła…",
    chartMissing: "Brak wykresu ze wskazanego źródła dla tego interwału.",
    confidence: "Pewność",
    updated: "Aktualizacja",
    analysis: "Poziom analizy",
    analysisNote: "Wynik analizy pozostaje wyłączony, dopóki źródło, znacznik czasu i prawa użycia nie przejdą wymaganych bramek.",
    live: "LIVE",
    snapshot: "OSTATNI DOSTĘPNY SNAPSHOT",
    reference: "DANE ILUSTRACYJNE · NIE LIVE",
    partial: "CZĘŚCIOWE · NIE LIVE",
    marketOverview: "Przegląd rynku",
    sourceBoundOnly: "tylko dane powiązane ze źródłami",
    sourceBoundScale: "/100 · oparte na źródłach",
    providerRows: "wierszy od dostawcy",
    lowerBetter: "/100 · niżej oznacza lepiej",
    verifiedRows: "zweryfikowanych",
    verifiedSourcesOnly: "tylko źródła spełniające aktywne bramki",
    normalized: "/100 · znormalizowane",
    syncing: "SYNCHRONIZACJA DANYCH ZE WSKAZANEGO ŹRÓDŁA…",
    refreshing: "Odświeżanie bez ukrywania ostatniego dostępnego widoku…",
    referenceMetric: "wartość zagregowana wstrzymana dla danych ilustracyjnych",
    sortNone: "bez sortowania",
    sortAscending: "rosnąco",
    sortDescending: "malejąco",
  },
  en: {
    title: "Shield Pro",
    subtitle: "Market data only when its source, timestamp and usage state are disclosed; descriptive risk in one terminal.",
    referenceSubtitle: "Local illustrative rows are only for interface verification. They are not LIVE, not a ranking and publish no risk score.",
    context: "Evidence-bound analytical terminal",
    tagline: "Market integrity · transparency · evidence",
    proofs: ["Named sources", "Explainable scoring", "Illustrative rows are always disclosed"],
    referenceProofs: ["Interface preview only", "Risk score disabled", "Provider rights still blocked"],
    marketScope: "Global markets",
    features: [
      { title: "Analytics", description: "Multi-source market intelligence" },
      { title: "Integrity", description: "Market structure and conduct analysis" },
      { title: "Liquidity", description: "Depth, flow and liquidity health" },
      { title: "Manipulation", description: "Pattern detection and anomalies" },
      { title: "Squeeze analysis", description: "Pressure, positioning and potential" },
      { title: "Evidence-first", description: "Explicit sources, assumptions and missing proof" },
    ],
    metrics: {
      markets: "Markets monitored",
      integrity: "Integrity score (avg)",
      marketCap: "Market cap in feed",
      risk: "Manipulation risk (avg)",
      coverage: "Evidence coverage",
      confidence: "Evidence confidence (avg)",
    },
    search: "Search asset",
    shield: "Shield",
    realMarkets: "Real Markets",
    source: "Source",
    rows: "Instruments",
    verified: "Risk status from available evidence",
    asset: "Asset",
    price: "Price",
    hour: "1H",
    day: "24H",
    week: "7D",
    cap: "Market cap",
    volume: "Volume 24H",
    risk: "Risk",
    evidence: "Evidence",
    trend: "7D",
    noData: "No market data meeting the active source and freshness gates",
    noSearchResults: "No instruments match your search",
    clearSearch: "Clear search",
    showMore: "Show more markets",
    unavailable: "Source temporarily unavailable",
    close: "Close",
    chart: "OHLC chart",
    loading: "Loading candles from the disclosed source…",
    chartMissing: "No chart from the disclosed source is available for this interval.",
    confidence: "Confidence",
    updated: "Updated",
    analysis: "Analysis tier",
    analysisNote: "Analysis stays disabled until source, timestamp and usage-right gates are satisfied.",
    live: "LIVE",
    snapshot: "LAST AVAILABLE SNAPSHOT",
    reference: "ILLUSTRATIVE DATA · NOT LIVE",
    partial: "PARTIAL · NOT LIVE",
    marketOverview: "Market overview",
    sourceBoundOnly: "source-bound only",
    sourceBoundScale: "/100 · source-bound",
    providerRows: "provider rows",
    lowerBetter: "/100 · lower is better",
    verifiedRows: "verified",
    verifiedSourcesOnly: "sources passing the active gates only",
    normalized: "/100 · normalized",
    syncing: "SYNCING THE DISCLOSED MARKET SOURCE…",
    refreshing: "Refreshing without hiding the last available view…",
    referenceMetric: "aggregate withheld for illustrative rows",
    sortNone: "not sorted",
    sortAscending: "ascending",
    sortDescending: "descending",
  },
  de: {
    title: "Shield Pro",
    subtitle: "Marktdaten nur mit offengelegter Quelle, Zeitstempel und Nutzungsstatus; beschreibendes Risiko in einem Terminal.",
    referenceSubtitle: "Lokale illustrative Zeilen dienen nur der UI-Prüfung. Sie sind nicht LIVE, kein Ranking und veröffentlichen keinen Risikoscore.",
    context: "Evidenzgebundenes Analyse-Terminal",
    tagline: "Marktintegrität · Transparenz · Evidenz",
    proofs: ["Benannte Quellen", "Erklärbares Scoring", "Illustrative Zeilen werden immer offengelegt"],
    referenceProofs: ["Nur UI-Vorschau", "Risikowert deaktiviert", "Provider-Rechte weiterhin blockiert"],
    marketScope: "Globale Märkte",
    features: [
      { title: "Analytik", description: "Marktintelligenz aus mehreren Quellen" },
      { title: "Integrität", description: "Marktstruktur und Verhaltensanalyse" },
      { title: "Liquidität", description: "Tiefe, Fluss und Marktgesundheit" },
      { title: "Manipulation", description: "Mustererkennung und Anomalien" },
      { title: "Squeeze-Analyse", description: "Druck, Positionierung und Potenzial" },
      { title: "Evidenz zuerst", description: "Offene Quellen, Annahmen und fehlende Nachweise" },
    ],
    metrics: {
      markets: "Beobachtete Märkte",
      integrity: "Integrität (Durchschnitt)",
      marketCap: "Marktkapitalisierung im Feed",
      risk: "Manipulationsrisiko (Durchschnitt)",
      coverage: "Evidenzabdeckung",
      confidence: "Evidenz-Konfidenz (Durchschnitt)",
    },
    search: "Asset suchen",
    shield: "Shield",
    realMarkets: "Real Markets",
    source: "Quelle",
    rows: "Instrumente",
    verified: "Risikostatus aus verfügbaren Nachweisen",
    asset: "Asset",
    price: "Preis",
    hour: "1H",
    day: "24H",
    week: "7D",
    cap: "Marktkapitalisierung",
    volume: "Volumen 24H",
    risk: "Risiko",
    evidence: "Evidenz",
    trend: "7D",
    noData: "Keine Marktdaten erfüllen die aktiven Quellen- und Frische-Gates",
    noSearchResults: "Keine Instrumente entsprechen der Suche",
    clearSearch: "Suche löschen",
    showMore: "Weitere Märkte anzeigen",
    unavailable: "Quelle vorübergehend nicht verfügbar",
    close: "Schließen",
    chart: "OHLC-Chart",
    loading: "Kerzen aus der offengelegten Quelle werden geladen…",
    chartMissing: "Für dieses Intervall ist kein Chart aus der offengelegten Quelle verfügbar.",
    confidence: "Konfidenz",
    updated: "Aktualisiert",
    analysis: "Analyse-Stufe",
    analysisNote: "Die Analyse bleibt deaktiviert, bis Quelle, Zeitstempel und Nutzungsrechte die Gates erfüllen.",
    live: "LIVE",
    snapshot: "LETZTER VERFÜGBARER SNAPSHOT",
    reference: "ILLUSTRATIVE DATEN · NICHT LIVE",
    partial: "TEILWEISE · NICHT LIVE",
    marketOverview: "Marktübersicht",
    sourceBoundOnly: "nur quellengebundene Daten",
    sourceBoundScale: "/100 · quellengebunden",
    providerRows: "Anbieterzeilen",
    lowerBetter: "/100 · niedriger ist besser",
    verifiedRows: "verifiziert",
    verifiedSourcesOnly: "nur Quellen, die die aktiven Gates erfüllen",
    normalized: "/100 · normalisiert",
    syncing: "DATEN AUS DER OFFENGELEGTEN QUELLE WERDEN SYNCHRONISIERT…",
    refreshing: "Aktualisierung ohne den letzten verfügbaren Stand auszublenden…",
    referenceMetric: "Aggregat für illustrative Zeilen zurückgehalten",
    sortNone: "nicht sortiert",
    sortAscending: "aufsteigend",
    sortDescending: "absteigend",
  },
} as const;

function safeLocale(value: string): Locale {
  return value === "en" || value === "de" ? value : "pl";
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMoney(value: number | undefined, locale: Locale, compact = false) {
  if (!finite(value)) return "—";
  return new Intl.NumberFormat(locale === "pl" ? "pl-PL" : locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : value >= 1000 ? 0 : value >= 1 ? 2 : 6,
  }).format(value);
}

function formatPercent(value: number | undefined) {
  if (!finite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function sourceBoundRisk(row: MarketRow) {
  const score = row.result?.score;
  const sources = shieldProVerifiedProviders(row);
  if (!shieldProRiskVerified(row) || !finite(score) || !sources.length || row.result?.dataQuality === "demo") return null;
  return Math.max(0, Math.min(100, score));
}

function evidenceLabel(row: MarketRow) {
  const sources = shieldProVerifiedProviders(row);
  const confidence = shieldProCalibratedRiskConfidence(row);
  if (confidence !== null) {
    return `${normalizeConfidencePercent(confidence, 0).toFixed(0)}% · ${sources.length}`;
  }
  const receipts = row.delivery?.sourceReceiptCount;
  return typeof receipts === "number" && Number.isFinite(receipts) && receipts > 0
    ? `${Math.trunc(receipts)} receipt${Math.trunc(receipts) === 1 ? "" : "s"}`
    : "—";
}

function shieldProSortValue(row: MarketRow, projection: ShieldProTableCustomerProjection, key: ShieldProSortKey) {
  switch (key) {
    case "price": return projection.price;
    case "hour": return projection.priceChange1h;
    case "day": return projection.priceChange24h;
    case "week":
    case "trend": return projection.priceChange7d;
    case "marketCap": return projection.marketCap;
    case "volume": return projection.volume24h;
    case "risk": return sourceBoundRisk(row);
    case "evidence": {
      const confidence = shieldProCalibratedRiskConfidence(row);
      if (confidence !== null) return normalizeConfidencePercent(confidence, 0);
      const receipts = row.delivery?.sourceReceiptCount;
      return typeof receipts === "number" && Number.isFinite(receipts) && receipts > 0 ? receipts : null;
    }
  }
}

function shieldProFieldCellProps(field: ShieldProTableProjectedField<unknown>) {
  const observed = field.sourceAsOf ? ` · as of ${field.sourceAsOf}` : "";
  const receipt = field.receiptId ? ` · receipt ${field.receiptId}` : "";
  return {
    "data-field-id": field.fieldId,
    "data-field-state": field.state,
    "data-semantic-class": field.semanticClass,
    "data-unit": field.unit,
    title: `${field.fieldId} · ${field.state} · ${field.semanticClass} · ${field.unit}${observed}${receipt}`,
  };
}

function Sparkline({ values }: { values?: number[] }) {
  const clean = (values ?? []).filter(finite).slice(-84);
  if (clean.length < 2) return <span className="shield-pro-v4608-empty-spark">—</span>;
  const width = 118;
  const height = 34;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = Math.max(max - min, Math.abs(max) * 0.0001, 1e-9);
  const d = clean
    .map((value, index) => {
      const x = (index / (clean.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const direction = clean.at(-1)! >= clean[0]! ? "positive" : "negative";
  return (
    <svg className="shield-pro-v4608-spark" viewBox={`0 0 ${width} ${height}`} data-direction={direction} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CandleChart({ candles }: { candles: Candle[] }) {
  const clean = candles.filter((candle) =>
    finite(candle.timestamp) && finite(candle.open) && finite(candle.high) && finite(candle.low) && finite(candle.close) &&
    candle.timestamp > 0 && candle.low > 0 && candle.high >= Math.max(candle.open, candle.close) && candle.low <= Math.min(candle.open, candle.close),
  ).slice(-180);
  if (clean.length < 8) return null;

  const width = 980;
  const height = 340;
  const left = 14;
  const right = 76;
  const top = 18;
  const bottom = 34;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const low = Math.min(...clean.map((candle) => candle.low));
  const high = Math.max(...clean.map((candle) => candle.high));
  const range = Math.max(high - low, high * 0.0001, 1e-8);
  const y = (value: number) => top + ((high - value) / range) * plotH;
  const slot = plotW / clean.length;
  const bodyW = Math.max(1.25, Math.min(5.5, slot * 0.62));
  const last = clean.at(-1)!;
  const lastY = y(last.close);
  const priceTicks = Array.from({ length: 5 }, (_, index) => high - (range * index) / 4);

  return (
    <svg className="shield-pro-v4608-candle-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monochrome OHLC chart from the disclosed source">
      {priceTicks.map((value) => {
        const py = y(value);
        return (
          <g key={value}>
            <line x1={left} y1={py} x2={width - right} y2={py} stroke="rgba(255,255,255,0.055)" strokeDasharray="3 7" />
            <text x={width - right + 10} y={py + 4} fill="rgba(255,255,255,0.42)" fontSize="10" fontFamily="monospace">
              {value >= 1000 ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : value.toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </text>
          </g>
        );
      })}
      <line x1={left} y1={lastY} x2={width - right} y2={lastY} stroke="rgba(255,255,255,0.32)" strokeDasharray="5 6" />
      {clean.map((candle, index) => {
        const cx = left + index * slot + slot / 2;
        const openY = y(candle.open);
        const closeY = y(candle.close);
        const highY = y(candle.high);
        const lowY = y(candle.low);
        const rising = candle.close >= candle.open;
        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(1.1, Math.abs(closeY - openY));
        return (
          <g key={`${candle.timestamp}-${index}`}>
            <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={rising ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.38)"} strokeWidth="1" />
            <rect
              x={cx - bodyW / 2}
              y={bodyY}
              width={bodyW}
              height={bodyH}
              fill={rising ? "rgba(255,255,255,0.88)" : "rgba(5,7,8,0.96)"}
              stroke={rising ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.48)"}
              strokeWidth="0.8"
            />
          </g>
        );
      })}
      <rect x={width - right + 2} y={lastY - 10} width="70" height="20" rx="3" fill="rgba(255,255,255,0.9)" />
      <text x={width - right + 8} y={lastY + 4} fill="#050607" fontSize="10" fontWeight="700" fontFamily="monospace">
        {last.close >= 1000 ? last.close.toLocaleString("en-US", { maximumFractionDigits: 0 }) : last.close.toLocaleString("en-US", { maximumFractionDigits: 4 })}
      </text>
    </svg>
  );
}

function ShieldProEvidenceField() {
  return <ShieldProMonochromeGlobe />;
}


function ShieldProMiniVisual({ values, mode = "line", percent }: { values?: Array<number | null | undefined>; mode?: "line" | "bars" | "gauge"; percent?: number | null }) {
  const clean = (values ?? []).filter((value): value is number => finite(value));
  if (mode === "gauge") {
    const safe = finite(percent) ? Math.max(0, Math.min(100, percent)) : null;
    return (
      <span className="shield-pro-v4629-mini shield-pro-v4629-mini--gauge" data-available={safe === null ? "false" : "true"} aria-hidden="true">
        <i style={safe === null ? undefined : { width: `${safe}%` }} />
      </span>
    );
  }
  if (clean.length < 2) return <span className="shield-pro-v4629-mini shield-pro-v4629-mini--missing" aria-hidden="true" />;
  const width = 116;
  const height = 34;
  const sample = clean.slice(-32);
  if (mode === "bars") {
    const sorted = [...sample].sort((left, right) => left - right);
    const capIndex = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * 0.92)));
    const cap = Math.max(sorted[capIndex] ?? 0, 1);
    const visualSample = sample.map((value) => Math.min(value, cap));
    return (
      <svg className="shield-pro-v4629-mini shield-pro-v4629-mini--bars" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {visualSample.map((value, index) => {
          const barWidth = Math.max(1.4, width / visualSample.length - 1.15);
          const barHeight = Math.max(1, (value / cap) * (height - 2));
          return <rect key={`${index}-${value}`} x={(index / sample.length) * width} y={height - barHeight} width={barWidth} height={barHeight} rx=".7" />;
        })}
      </svg>
    );
  }
  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const span = Math.max(max - min, Math.abs(max) * 0.002, 1e-9);
  const points = sample.map((value, index) => {
    const x = (index / Math.max(1, sample.length - 1)) * width;
    const y = height - 1 - ((value - min) / span) * (height - 3);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return (
    <svg className="shield-pro-v4629-mini shield-pro-v4629-mini--line" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

export function ShieldProLegacyModal({ row, locale, onClose }: { row: MarketRow; locale: Locale; onClose: () => void }) {
  const t = copy[locale];
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [tier, setTier] = useState<Tier>("Basic");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartMode, setChartMode] = useState<"loading" | "live" | "partial" | "stale" | "reference" | "error">("loading");
  const [chartSource, setChartSource] = useState<string>("—");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => modalRef.current?.focus({ preventScroll: true }));
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    const config = TIMEFRAMES.find((item) => item.key === timeframe)!;
    const klineParams = new URLSearchParams({
      symbol: row.symbol,
      assetClass: "crypto",
      marketId: row.id,
      quote: "USD",
      range: config.api,
    });
    fetch(`/api/market-integrity/klines?${klineParams.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => await readJsonResponseBounded<KlinePayload>(response, 2 * 1024 * 1024))
      .then((payload) => {
        const safeCandles = (payload.candles ?? []).filter((candle) =>
          finite(candle.timestamp) && finite(candle.open) && finite(candle.high) && finite(candle.low) && finite(candle.close),
        );
        const normalizedMode = payload.mode === "live_verified" || payload.mode === "live"
          ? "live"
          : payload.mode === "live_partial"
            ? "partial"
            : payload.mode === "last_known_good" || payload.mode === "stale"
              ? "stale"
              : payload.mode === "local_reference"
                ? "reference"
                : "error";
        if (normalizedMode !== "error" && safeCandles.length) {
          setCandles(safeCandles);
          setChartMode(normalizedMode);
          setChartSource(payload.source || "disclosed OHLC source");
          setGeneratedAt(payload.generatedAt || null);
          return;
        }
        setCandles([]);
        setChartMode("error");
        setChartSource(payload.error || t.chartMissing);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setChartMode("error");
        setChartSource(t.chartMissing);
      });
    return () => controller.abort();
  }, [row.id, row.symbol, timeframe, t.chartMissing]);

  const risk = sourceBoundRisk(row);
  const confidence = shieldProCalibratedRiskConfidence(row);
  const confidenceValue = confidence === null ? "—" : `${normalizeConfidencePercent(confidence, 0).toFixed(0)}%`;
  const sourceCount = shieldProVerifiedProviders(row).length;
  const chartStatusLabel = chartMode === "live"
    ? t.live
    : chartMode === "stale"
      ? t.snapshot
      : chartMode === "reference"
        ? t.reference
        : chartMode === "partial"
          ? t.partial
          : chartMode === "loading"
            ? t.loading
            : t.unavailable;

  return (
    <BodyPortal>
      <div className="shield-pro-v4608-modal-layer" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section
          ref={modalRef}
          tabIndex={-1}
          className="shield-pro-v4608-modal shield-pro-v4608-modal--pass4633-geometry-owner shield-pro-v4608-modal--pass4634-reference-detail-owner shield-pro-v4608-modal--pass4637-content-scale-owner shield-pro-v4608-modal--pass4638-adaptive-fit-owner"
          data-pass4629-shield-pro-modal="shared-measured-geometry-no-expand-monochrome-reference-cards"
          data-pass4630-shield-pro-modal="one-screen-fit-first-paint-logo-reference-rhythm-lock"
          data-pass4631-shield-pro-modal="real-eighty-two-vw-eighty-four-vh-visible-geometry-lock"
          data-pass4632-shield-pro-modal="viewport-height-gate-removed-seventy-eight-vw-eighty-nine-vh"
          data-pass4633-shield-pro-modal="unconditional-root-class-reference-footprint-owner"
          data-pass4634-shield-pro-modal="reference-hierarchy-balanced-cards-monochrome-owner"
          data-pass4637-shield-pro-modal="large-shell-content-scale-chart-card-footer-rhythm"
          data-pass4638-shield-pro-modal="adaptive-height-fit-no-chart-card-footer-clipping"
          role="dialog"
          aria-modal="true"
          aria-label={`${row.name} Shield Pro`}
        >
          <header className="shield-pro-v4608-modal-brandbar">
            <span>VELMÈRE SHIELD PRO</span>
            <small>MARKET INTELLIGENCE</small>
            <button type="button" onClick={onClose} aria-label={t.close}><X /></button>
          </header>

          <div className="shield-pro-v4608-modal-summary">
            <div className="shield-pro-v4608-modal-identity">
              <AssetLogo key={`${row.symbol}:${row.image ?? "badge"}`} assetClass="crypto" id={row.id} symbol={row.symbol} name={row.name} imageUrl={row.image} large eager />
              <div>
                <h2>{row.name} <small>{row.symbol}</small></h2>
                <p><i /> {chartStatusLabel}</p>
              </div>
            </div>
            <dl>
              <span><dt>{t.price}</dt><dd>{formatMoney(row.price, locale)}</dd><small>{formatPercent(row.priceChange24h)}</small></span>
              <span><dt>{t.risk}</dt><dd>{risk === null ? "—" : `${risk.toFixed(1)}%`}</dd><small>{risk === null ? t.noData : `${sourceCount} source${sourceCount === 1 ? "" : "s"}`}</small></span>
              <span><dt>{t.cap}</dt><dd>{formatMoney(row.marketCap, locale, true)}</dd><small>Rank {finite(row.rank) ? `#${row.rank}` : "—"}</small></span>
            </dl>
          </div>

          <div className="shield-pro-v4608-chart-toolbar">
            <div><i /> <strong>{chartStatusLabel}</strong><span>{row.symbol} / USD</span><span>{chartSource}</span></div>
            <div role="toolbar" aria-label="Chart timeframe">
              {TIMEFRAMES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  data-active={timeframe === item.key ? "true" : undefined}
                  onClick={() => {
                    setChartMode("loading");
                    setCandles([]);
                    setTimeframe(item.key);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="shield-pro-v4608-chart-stage" data-state={chartMode}>
            {chartMode === "loading" ? <p>{t.loading}</p> : null}
            {chartMode === "error" ? <p>{t.chartMissing}</p> : null}
            {chartMode === "live" || chartMode === "partial" || chartMode === "stale" || chartMode === "reference" ? <CandleChart candles={candles} /> : null}
          </div>

          <div className="shield-pro-v4608-modal-cards" data-pass4629-shield-pro-reference-cards="source-only-line-bars-gauge">
            <article>
              <small>{t.day}</small><strong>{formatPercent(row.priceChange24h)}</strong><span>provider-bound</span>
              <ShieldProMiniVisual values={candles.map((candle) => candle.close)} />
            </article>
            <article>
              <small>{t.volume}</small><strong>{formatMoney(row.volume24h, locale, true)}</strong><span>24h source value</span>
              <ShieldProMiniVisual values={candles.map((candle) => candle.volume)} mode="bars" />
            </article>
            <article>
              <small>{t.confidence}</small><strong>{confidenceValue}</strong><span>{sourceCount ? `${sourceCount} named source${sourceCount === 1 ? "" : "s"}` : t.noData}</span>
              <ShieldProMiniVisual mode="gauge" percent={confidence === null ? null : normalizeConfidencePercent(confidence, 0)} />
            </article>
            <article>
              <small>{t.week}</small><strong>{formatPercent(row.priceChange7d)}</strong><span>{row.result?.dataQuality ?? "—"}</span>
              <ShieldProMiniVisual values={row.sparkline7d} />
            </article>
          </div>

          <footer className="shield-pro-v4608-modal-footer">
            <div>
              <span>{t.updated}: {generatedAt ? new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : locale === "de" ? "de-DE" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(generatedAt)) : "—"}</span>
              <span>{t.source}: {chartSource}</span>
            </div>
            <div className="shield-pro-v4608-tier-block">
              <span><strong>{t.analysis}</strong><small>{t.analysisNote}</small></span>
              <div>
                {TIER_ORDER.map((item) => <button key={item} type="button" data-active={tier === item ? "true" : undefined} onClick={() => setTier(item)}>{item}</button>)}
              </div>
            </div>
          </footer>
        </section>
      </div>
    </BodyPortal>
  );
}

function shieldProModalData(
  row: MarketRow,
  locale: Locale,
  feedSource: string,
  feedMode: ShieldProFeedMode,
): VlmAssetDetailModalData {
  const risk = sourceBoundRisk(row);
  const confidence = shieldProCalibratedRiskConfidence(row);
  const normalizedConfidence = confidence === null ? null : normalizeConfidencePercent(confidence, 0);
  const sources = shieldProVerifiedProviders(row);
  const primarySource = shieldProSourceLabel(row, feedSource);
  const sourceAsOf = shieldProPrimaryMarketSourceAsOf(row);
  const observedAt = sourceAsOf
    ? new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : locale === "de" ? "de-DE" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(sourceAsOf))
    : null;
  const change = shieldProFieldVerified(row, "market.change_24h") && finite(row.priceChange24h) ? row.priceChange24h : null;
  const priceLabel = shieldProFieldVerified(row, "market.price") && finite(row.price)
    ? `${row.price.toLocaleString("en-US", {
        minimumFractionDigits: Math.abs(row.price) < 1 ? 5 : 2,
        maximumFractionDigits: Math.abs(row.price) < 1 ? 5 : 2,
      })} USD`
    : "—";
  const dataState = shieldProModalMarketDataState(row, feedMode);
  const marketStatusLabel = dataState === "live_verified"
    ? "LIVE VERIFIED"
    : dataState === "last_known_good"
      ? "LAST KNOWN GOOD"
      : dataState === "local_reference"
        ? "REFERENCE · NOT LIVE"
        : dataState === "unverified"
          ? "UNVERIFIED"
          : "PARTIAL · NOT LIVE";

  const detailMetrics: NonNullable<VlmAssetDetailModalData["detailMetrics"]> = [];
  if (shieldProFieldVerified(row, "market.market_cap") && finite(row.marketCap)) {
    detailMetrics.push({
      label: "Market cap",
      value: formatMoney(row.marketCap, locale, true),
      caption: shieldProFieldVerified(row, "market.rank") && finite(row.rank) ? `Rank #${row.rank}` : primarySource,
      tone: "evidence",
    });
  }
  if (shieldProFieldVerified(row, "market.volume_24h") && finite(row.volume24h)) {
    detailMetrics.push({
      label: "Volume (24H)",
      value: formatMoney(row.volume24h, locale, true),
      caption: primarySource,
      tone: "evidence",
    });
  }
  if (normalizedConfidence !== null) {
    detailMetrics.push({
      label: "Evidence confidence",
      value: `${normalizedConfidence.toFixed(0)}%`,
      caption: sources.length ? `${sources.length} verified source${sources.length === 1 ? "" : "s"}` : primarySource,
      tone: "evidence",
    });
  }
  if (shieldProFieldVerified(row, "market.change_1h") && finite(row.priceChange1h)) {
    detailMetrics.push({ label: "1H move", value: formatPercent(row.priceChange1h), caption: primarySource, tone: row.priceChange1h >= 0 ? "positive" : "danger" });
  }
  if (shieldProFieldVerified(row, "market.change_7d") && finite(row.priceChange7d)) {
    detailMetrics.push({ label: "7D move", value: formatPercent(row.priceChange7d), caption: primarySource, tone: row.priceChange7d >= 0 ? "positive" : "danger" });
  }

  return {
    symbol: row.symbol,
    name: row.name,
    analysisSurface: "shield-pro",
    providerSymbol: row.symbol,
    marketId: row.id,
    quote: "USD",
    imageUrl: shieldProFieldVerified(row, "market.image") ? row.image : undefined,
    assetClass: "crypto",
    venue: primarySource,
    assetClassLabel: "Crypto · Shield Pro",
    exchangeLabel: primarySource,
    priceLabel,
    changeLabel: change === null ? null : formatPercent(change),
    changeTone: change === null ? "neutral" : change > 0 ? "up" : change < 0 ? "down" : "neutral",
    sourceLabel: primarySource,
    sourceVerified: sources.length > 0,
    sourceTimeLabel: observedAt,
    currencyLabel: "USD",
    marketStatusLabel,
    confidenceLabel: normalizedConfidence === null ? null : `${normalizedConfidence.toFixed(0)}%`,
    confidenceCalibrated: normalizedConfidence !== null,
    riskLabel: risk === null ? null : `${risk.toFixed(2)}%`,
    sparkline: shieldProFieldVerified(row, "market.sparkline_7d") ? row.sparkline7d : [],
    detailMetrics,
    evidenceNotes: row.result?.limitations?.filter((item) => item.trim()),
    marketDataState: dataState,
  };
}

function ShieldProCleanModal({ row, locale, source, mode, onClose }: { row: MarketRow; locale: Locale; source: string; mode: ShieldProFeedMode; onClose: () => void }) {
  return (
    <AssetDetailModal
      data={shieldProModalData(row, locale, source, mode)}
      onClose={onClose}
      appearance="monochrome"
      productLabel="Velmère Shield Pro"
    />
  );
}

export default function ShieldProCleanTerminalClient({ locale }: { locale: string }) {
  const safe = safeLocale(locale);
  const t = copy[safe];
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [mode, setMode] = useState<"loading" | "live" | "stale" | "partial" | "reference" | "error">("loading");
  const [source, setSource] = useState("—");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const rowsAvailableRef = useRef(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<MarketRow | null>(null);
  const [sort, setSort] = useState<ShieldProSortState>({ key: "marketCap", direction: "desc" });
  const [compactLayout, setCompactLayout] = useState(false);
  const [mobileLimit, setMobileLimit] = useState(24);

  useEffect(() => {
    const controller = new AbortController();
    const hadRows = rowsAvailableRef.current;
    setRefreshing(hadRows);
    if (!hadRows) setMode("loading");
    fetchShieldProFullCatalog<MarketRow>({ signal: controller.signal })
      .then((catalog) => {
        if (catalog.rows.length) {
          const nextRows = dedupeMarketInstruments(catalog.rows);
          const reference = nextRows.every((row) => row.result?.dataQuality === "demo");
          rowsAvailableRef.current = true;
          setRows(nextRows);
          setMode(reference ? "reference" : catalog.complete ? catalog.mode : "partial");
          setSource(catalog.complete
            ? catalog.source
            : `${catalog.source} · bounded partial catalog (${catalog.pagesFetched} page${catalog.pagesFetched === 1 ? "" : "s"})`);
          return;
        }
        if (!rowsAvailableRef.current) {
          setRows([]);
          setMode("error");
          setSource(catalog.blocker || t.unavailable);
        } else {
          setMode((current) => shieldProModeAfterRefreshFailure(current));
          setSource((current) => current.includes("refresh unavailable")
            ? current
            : `${current} · REFRESH_UNAVAILABLE · refresh unavailable (${catalog.blocker || "provider_unavailable"})`);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!rowsAvailableRef.current) {
          setRows([]);
          setMode("error");
          setSource(t.unavailable);
        } else {
          setMode((current) => shieldProModeAfterRefreshFailure(current));
          setSource((current) => current.includes("refresh unavailable")
            ? current
            : `${current} · REFRESH_UNAVAILABLE · refresh unavailable (request_failed)`);
        }
      })
      .finally(() => setRefreshing(false));
    return () => controller.abort();
  }, [reloadNonce, t.unavailable]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const syncLayout = () => setCompactLayout(media.matches);
    syncLayout();
    media.addEventListener("change", syncLayout);
    return () => media.removeEventListener("change", syncLayout);
  }, []);

  const customerRows = useMemo<ShieldProCustomerRow[]>(() => rows.flatMap((row) => {
    const projection = projectShieldProTableRow(row, mode);
    return projection
      ? [{
          row,
          projection,
          id: projection.marketId,
          symbol: projection.symbol,
          name: projection.name,
        }]
      : [];
  }), [mode, rows]);

  const visible = useMemo(() => {
    const filtered = filterMarketInstruments(customerRows, debouncedQuery);
    return [...filtered].sort((a, b) => {
      const leftRank = a.projection.rank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = b.projection.rank ?? Number.MAX_SAFE_INTEGER;
      if (!sort) return leftRank - rightRank;
      const left = shieldProSortValue(a.row, a.projection, sort.key);
      const right = shieldProSortValue(b.row, b.projection, sort.key);
      if (left === null && right === null) return leftRank - rightRank;
      if (left === null) return 1;
      if (right === null) return -1;
      const delta = left - right;
      if (delta !== 0) return sort.direction === "desc" ? -delta : delta;
      return leftRank - rightRank;
    });
  }, [customerRows, debouncedQuery, sort]);

  const cycleSort = (key: ShieldProSortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "desc" };
      if (current.direction === "desc") return { key, direction: "asc" };
      return null;
    });
  };

  const sortHeader = (key: ShieldProSortKey, label: string) => (
    <button
      type="button"
      className="shield-pro-v4608-sort"
      data-active={sort?.key === key ? "true" : "false"}
      data-direction={sort?.key === key ? sort.direction : "none"}
      onClick={() => cycleSort(key)}
      aria-label={`${label}: ${sort?.key !== key ? t.sortNone : sort.direction === "desc" ? t.sortDescending : t.sortAscending}`}
    >
      <span>{label}</span><ArrowUpDown aria-hidden="true" />
    </button>
  );

  const verifiedCount = useMemo(() => customerRows.filter(({ row }) => sourceBoundRisk(row) !== null).length, [customerRows]);
  const referenceMode = mode === "reference" || (rows.length > 0 && rows.every((row) => row.result?.dataQuality === "demo"));
  const statusLabel = mode === "live" ? t.live : mode === "stale" ? t.snapshot : referenceMode ? t.reference : mode === "partial" ? t.partial : mode === "error" ? t.unavailable : "SYNC";
  const heroSubtitle = referenceMode ? t.referenceSubtitle : t.subtitle;
  const heroProofs = referenceMode ? t.referenceProofs : t.proofs;
  const aggregateMetricsAvailable = !referenceMode && shieldProAggregateMetricsAvailable(mode);

  const dashboardStats = useMemo(() => {
    const risks = customerRows.map(({ row }) => sourceBoundRisk(row)).filter((value): value is number => finite(value));
    const confidence = customerRows
      .map(({ row }) => shieldProCalibratedRiskConfidence(row))
      .filter((value): value is number => value !== null)
      .map((value) => normalizeConfidencePercent(value, 0));
    const marketCaps = customerRows.map(({ projection }) => projection.marketCap).filter((value): value is number => finite(value) && value > 0);
    const volumes = customerRows.map(({ projection }) => projection.volume24h).filter((value): value is number => finite(value) && value > 0);
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const averageRisk = average(risks);
    return {
      risks,
      confidence,
      marketCaps,
      volumes,
      averageRisk,
      integrity: averageRisk === null ? null : 100 - averageRisk,
      averageConfidence: average(confidence),
      coverage: customerRows.length ? (verifiedCount / customerRows.length) * 100 : null,
      totalMarketCap: marketCaps.reduce((sum, value) => sum + value, 0),
    };
  }, [customerRows, verifiedCount]);

  const metricCards = [
    {
      id: "markets",
      label: t.metrics.markets,
      value: customerRows.length ? customerRows.length.toLocaleString(safe === "pl" ? "pl-PL" : safe === "de" ? "de-DE" : "en-US") : "—",
      detail: statusLabel,
      values: aggregateMetricsAvailable ? dashboardStats.marketCaps : [],
      percent: undefined,
      mode: "line" as const,
      tone: "teal",
    },
    {
      id: "integrity",
      label: t.metrics.integrity,
      value: !aggregateMetricsAvailable || dashboardStats.integrity === null ? "—" : dashboardStats.integrity.toFixed(1),
      detail: referenceMode ? t.referenceMetric : !aggregateMetricsAvailable ? statusLabel : dashboardStats.integrity === null ? t.sourceBoundOnly : t.sourceBoundScale,
      values: aggregateMetricsAvailable ? dashboardStats.risks.map((value) => 100 - value) : [],
      percent: undefined,
      mode: "line" as const,
      tone: "teal",
    },
    {
      id: "market-cap",
      label: t.metrics.marketCap,
      value: aggregateMetricsAvailable && dashboardStats.totalMarketCap ? formatMoney(dashboardStats.totalMarketCap, safe, true) : "—",
      detail: referenceMode ? t.referenceMetric : !aggregateMetricsAvailable ? statusLabel : `${customerRows.length || 0} ${t.providerRows}`,
      values: aggregateMetricsAvailable ? dashboardStats.marketCaps : [],
      percent: undefined,
      mode: "bars" as const,
      tone: "gold",
    },
    {
      id: "risk",
      label: t.metrics.risk,
      value: !aggregateMetricsAvailable || dashboardStats.averageRisk === null ? "—" : dashboardStats.averageRisk.toFixed(1),
      detail: referenceMode ? t.referenceMetric : !aggregateMetricsAvailable ? statusLabel : dashboardStats.averageRisk === null ? t.sourceBoundOnly : t.lowerBetter,
      values: dashboardStats.risks,
      percent: undefined,
      mode: "line" as const,
      tone: dashboardStats.averageRisk !== null && dashboardStats.averageRisk >= 60 ? "coral" : "gold",
    },
    {
      id: "coverage",
      label: t.metrics.coverage,
      value: !aggregateMetricsAvailable || dashboardStats.coverage === null ? "—" : `${dashboardStats.coverage.toFixed(0)}%`,
      detail: referenceMode ? t.referenceMetric : !aggregateMetricsAvailable ? statusLabel : `${verifiedCount}/${customerRows.length || 0} ${t.verifiedRows}`,
      values: undefined,
      percent: aggregateMetricsAvailable ? dashboardStats.coverage ?? undefined : undefined,
      mode: "gauge" as const,
      tone: "teal",
    },
    {
      id: "confidence",
      label: t.metrics.confidence,
      value: !aggregateMetricsAvailable || dashboardStats.averageConfidence === null ? "—" : dashboardStats.averageConfidence.toFixed(1),
      detail: referenceMode ? t.referenceMetric : !aggregateMetricsAvailable ? statusLabel : dashboardStats.averageConfidence === null ? t.verifiedSourcesOnly : t.normalized,
      values: aggregateMetricsAvailable ? dashboardStats.confidence : [],
      percent: undefined,
      mode: "line" as const,
      tone: "teal",
    },
  ];

  return (
    <main
      className="shield-pro-v4608"
      data-pass4608-shield-pro="clean-live-provider-terminal-monochrome-globe-modal"
      data-velmere-critical-loading={mode === "loading" ? "true" : "false"}
    >
      <header className="shield-pro-v4608-topbar">
        <div className="shield-pro-v4608-topbar-brand">
          <Link href={`/${safe}`} aria-label="Velmère home">
            <span>VELMÈRE</span>
          </Link>
          <em>{t.context}</em>
        </div>
        <div className="shield-pro-v4608-topbar-meta">
          <span className="shield-pro-v4608-live-pill"><Activity aria-hidden="true" /> {statusLabel}</span>
          <span className="shield-pro-v4608-source-pill" title={source}>{t.source}: {source}</span>
          <span className="shield-pro-v4608-market-pill"><Globe2 aria-hidden="true" /> {t.marketScope}</span>
          <nav aria-label="Market products">
            <Link href={`/${safe}/market-integrity`}>{t.shield}</Link>
            <Link href={`/${safe}/real-markets`}>{t.realMarkets}</Link>
          </nav>
        </div>
      </header>

      <ShieldProEvidenceField />
      <section className="shield-pro-v4608-shell">
        <header className="shield-pro-v4608-hero">
          <div>
            <div className="shield-pro-v4608-hero-title-row">
              <span className="shield-pro-v4608-hero-mark"><VShieldPulse monochrome size={52} /></span>
              <h1>{t.title}</h1>
            </div>
            <small>{t.tagline}</small>
            <span>{heroSubtitle}</span>
            <div className="shield-pro-v4608-hero-proofline" aria-label="Shield Pro evidence standard">
              {heroProofs.map((proof) => <span key={proof}><i aria-hidden="true" />{proof}</span>)}
            </div>
          </div>
        </header>

        <section className="shield-pro-v4608-feature-grid" aria-label="Shield Pro capabilities">
          {t.features.map((feature, index) => {
            const Icon = SHIELD_PRO_FEATURE_ICONS[index] ?? Activity;
            return (
              <article key={feature.title}>
                <Icon aria-hidden="true" />
                <div><strong>{feature.title}</strong><span>{feature.description}</span></div>
              </article>
            );
          })}
        </section>

        <section className="shield-pro-v4608-status-grid">
          {metricCards.map((card) => (
            <article key={card.id} data-tone={card.tone}>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
              <ShieldProMiniVisual values={card.values} mode={card.mode} percent={card.percent} />
            </article>
          ))}
        </section>

        <section className="shield-pro-v4608-table-card">
          <div className="shield-pro-v4608-table-head">
            <div>
              <p>{t.marketOverview}</p>
              <span>{statusLabel} · {visible.length}/{customerRows.length || 0}</span>
            </div>
            <div className="shield-pro-v4608-table-tools">
              <label>
                <Search />
                <input value={query} onChange={(event) => { setQuery(event.target.value); setMobileLimit(24); }} placeholder={t.search} />
              </label>
              <span><Globe2 aria-hidden="true" /> {t.marketScope}</span>
            </div>
          </div>

          {!compactLayout ? (
            <div className="shield-pro-v4608-table-scroll">
              <table>
              <thead>
                <tr>
                  <th>{t.asset}</th>
                  <th aria-sort={sort?.key === "price" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("price", t.price)}</th>
                  <th aria-sort={sort?.key === "hour" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("hour", t.hour)}</th>
                  <th aria-sort={sort?.key === "day" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("day", t.day)}</th>
                  <th aria-sort={sort?.key === "week" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("week", t.week)}</th>
                  <th aria-sort={sort?.key === "marketCap" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("marketCap", t.cap)}</th>
                  <th aria-sort={sort?.key === "volume" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("volume", t.volume)}</th>
                  <th aria-sort={sort?.key === "risk" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("risk", t.risk)}</th>
                  <th aria-sort={sort?.key === "evidence" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("evidence", t.evidence)}</th>
                  <th aria-sort={sort?.key === "trend" ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>{sortHeader("trend", t.trend)}</th>
                </tr>
              </thead>
              <tbody>
                {!visible.length && debouncedQuery.trim() ? (
                  <tr className="shield-pro-v4608-empty-row">
                    <td colSpan={10}>
                      <p>{t.noSearchResults}</p>
                      <button type="button" onClick={() => setQuery("")}>{t.clearSearch}</button>
                    </td>
                  </tr>
                ) : null}
                {visible.map(({ row, projection }) => {
                  const risk = sourceBoundRisk(row);
                  return (
                    <tr
                      key={projection.marketId}
                      tabIndex={0}
                      onPointerDown={(event) => {
                        if (event.pointerType === "mouse") event.preventDefault();
                      }}
                      onClick={() => setSelected(row)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(row); } }}
                    >
                      <td {...shieldProFieldCellProps(projection.fields.name)}><span><AssetLogo assetClass="crypto" id={projection.marketId} symbol={projection.symbol} name={projection.name} imageUrl={projection.image ?? undefined} compact /><b>{projection.name}<small>{projection.symbol} {projection.rank !== null ? `· #${projection.rank}` : ""}</small></b></span></td>
                      <td {...shieldProFieldCellProps(projection.fields.price)}>{formatMoney(projection.price ?? undefined, safe)}</td>
                      <td {...shieldProFieldCellProps(projection.fields.priceChange1h)} data-tone={projection.priceChange1h === null ? undefined : projection.priceChange1h > 0 ? "positive" : projection.priceChange1h < 0 ? "negative" : "neutral"}>{formatPercent(projection.priceChange1h ?? undefined)}</td>
                      <td {...shieldProFieldCellProps(projection.fields.priceChange24h)} data-tone={projection.priceChange24h === null ? undefined : projection.priceChange24h > 0 ? "positive" : projection.priceChange24h < 0 ? "negative" : "neutral"}>{formatPercent(projection.priceChange24h ?? undefined)}</td>
                      <td {...shieldProFieldCellProps(projection.fields.priceChange7d)} data-tone={projection.priceChange7d === null ? undefined : projection.priceChange7d > 0 ? "positive" : projection.priceChange7d < 0 ? "negative" : "neutral"}>{formatPercent(projection.priceChange7d ?? undefined)}</td>
                      <td {...shieldProFieldCellProps(projection.fields.marketCap)}>{formatMoney(projection.marketCap ?? undefined, safe, true)}</td>
                      <td {...shieldProFieldCellProps(projection.fields.volume24h)}>{formatMoney(projection.volume24h ?? undefined, safe, true)}</td>
                      <td>
                        <span className="shield-pro-v4608-risk-score" data-tone={risk === null ? undefined : risk >= 60 ? "high" : risk >= 40 ? "medium" : "low"}>
                          <strong>{risk === null ? "—" : risk.toFixed(1)}</strong>
                          <i>{risk === null ? null : <b style={{ width: `${risk}%` }} />}</i>
                        </span>
                      </td>
                      <td>{evidenceLabel(row)}</td>
                      <td {...shieldProFieldCellProps(projection.fields.sparkline7d)}><Sparkline values={projection.sparkline7d ?? undefined} /></td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          ) : (
            <ul className="shield-pro-v4608-mobile-market-list" aria-label={t.marketOverview}>
              {!visible.length && debouncedQuery.trim() ? (
                <li className="shield-pro-v4608-mobile-empty">
                  <p>{t.noSearchResults}</p>
                  <button type="button" onClick={() => setQuery("")}>{t.clearSearch}</button>
                </li>
              ) : null}
              {visible.slice(0, mobileLimit).map(({ row, projection }) => {
                const risk = sourceBoundRisk(row);
                const dayTone = projection.priceChange24h === null ? undefined : projection.priceChange24h > 0 ? "positive" : projection.priceChange24h < 0 ? "negative" : "neutral";
                return (
                  <li key={projection.marketId}>
                    <button type="button" onClick={() => setSelected(row)} aria-label={`${projection.name} Shield Pro`}>
                      <span className="shield-pro-v4608-mobile-identity">
                        <AssetLogo assetClass="crypto" id={projection.marketId} symbol={projection.symbol} name={projection.name} imageUrl={projection.image ?? undefined} compact />
                        <span {...shieldProFieldCellProps(projection.fields.name)}><strong>{projection.name}</strong><small>{projection.symbol} {projection.rank !== null ? `· #${projection.rank}` : ""}</small></span>
                      </span>
                      <span className="shield-pro-v4608-mobile-price"><strong {...shieldProFieldCellProps(projection.fields.price)}>{formatMoney(projection.price ?? undefined, safe)}</strong><small {...shieldProFieldCellProps(projection.fields.marketCap)}>{formatMoney(projection.marketCap ?? undefined, safe, true)}</small></span>
                      <span className="shield-pro-v4608-mobile-facts">
                        <span><small>{t.day}</small><strong {...shieldProFieldCellProps(projection.fields.priceChange24h)} data-tone={dayTone}>{formatPercent(projection.priceChange24h ?? undefined)}</strong></span>
                        <span><small>{t.risk}</small><strong>{risk === null ? "—" : risk.toFixed(1)}</strong></span>
                        <span><small>{t.evidence}</small><strong>{evidenceLabel(row)}</strong></span>
                        <span {...shieldProFieldCellProps(projection.fields.sparkline7d)}><Sparkline values={projection.sparkline7d ?? undefined} /></span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {visible.length > mobileLimit ? (
                <li className="shield-pro-v4608-mobile-more">
                  <button type="button" onClick={() => setMobileLimit((current) => current + 24)}>
                    <span>{t.showMore}</span>
                    <small>{mobileLimit}/{visible.length}</small>
                  </button>
                </li>
              ) : null}
            </ul>
          )}
          {mode === "loading" ? <div className="shield-pro-v4608-empty">{t.syncing}</div> : null}
          {refreshing && mode !== "loading" ? <div className="shield-pro-v4608-refreshing" role="status">{t.refreshing}</div> : null}
          {mode === "error" || (!visible.length && mode !== "loading") ? (
            <div className="shield-pro-v4608-empty" role="alert">
              <span>{t.noData}</span>
              {mode === "error" ? (
                <button
                  type="button"
                  onClick={() => {
                    clearShieldMarketCatalogClientCache();
                    if (!rowsAvailableRef.current) setMode("loading");
                    setReloadNonce((value) => value + 1);
                  }}
                >
                  {safe === "pl" ? "Ponów pobieranie" : safe === "de" ? "Daten erneut laden" : "Retry loading"}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </section>
      {selected ? <ShieldProCleanModal row={selected} locale={safe} source={source} mode={mode} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
