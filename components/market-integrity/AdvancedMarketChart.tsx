"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { buildPass498ChartInsight } from "@/lib/market-integrity/pass498-chart-insight-runtime";
import { buildPass503ProviderRuntime } from "@/lib/market-integrity/pass503-provider-state-runtime";
import {
  readPass504ChartView,
  writePass504ChartView,
} from "@/lib/market-integrity/pass504-chart-view-cache";
import {
  buildPass587ChartViewportIdentity,
  readPass587ChartViewport,
  writePass587ChartViewport,
  type Pass587ChartViewportIdentity,
} from "@/lib/market-integrity/pass587-chart-viewport-identity";
import {
  buildPass588ChartEvidenceManifest,
  type Pass588AnalysisDepth,
} from "@/lib/market-integrity/pass588-chart-evidence-manifest";
import {
  buildPass589SourceFreshnessSchedule,
  type Pass589SourceFreshnessSchedule,
} from "@/lib/market-integrity/pass589-source-freshness-scheduler";
import { buildPass590CandleContinuityLedger } from "@/lib/market-integrity/pass590-candle-continuity-ledger";
import { buildPass591ChartComparisonLens } from "@/lib/market-integrity/pass591-chart-comparison-lens";
import { buildPass511ChartRegimeLens } from "@/lib/market-integrity/pass511-chart-regime-lens";
import { buildPass517ProviderFailoverRuntime } from "@/lib/market-integrity/pass517-provider-failover-runtime";
import {
  buildPass518CrossProviderChartDiff,
  type Pass518ComparisonSummary,
} from "@/lib/market-integrity/pass518-cross-provider-chart-diff";
import { buildPass524ProviderRouteLedger } from "@/lib/market-integrity/pass524-provider-route-ledger";
import { buildPass531SecondaryCandleOverlay } from "@/lib/market-integrity/pass531-secondary-candle-overlay";
import {
  buildPass532ProviderRetryTelemetry,
  type Pass532ProviderRetryEvent,
} from "@/lib/market-integrity/pass532-provider-retry-telemetry";
import { buildPass538ProviderConsensusQuality } from "@/lib/market-integrity/pass538-provider-consensus-quality";
import { buildPass545ProviderConsensusExplainability } from "@/lib/market-integrity/pass545-provider-consensus-explainability";
import { buildPass585SharedCrosshairInspector } from "@/lib/market-integrity/pass585-shared-crosshair-inspector";
import { getPass522MobileGestureQa } from "@/lib/motion/pass522-mobile-gesture-qa";
import {
  pass586MobileChartGesturePolicy,
  resolvePass586GestureAxis,
  type Pass586GestureAxis,
} from "@/lib/motion/pass586-mobile-chart-gestures";
import {
  Activity,
  ChevronsRight,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";

export type AdvancedMarketCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  axis: Pass586GestureAxis;
  moved: boolean;
};

type PinchState = {
  distance: number;
  windowSize: number;
  centerRatio: number;
};

const MIN_WINDOW = 12;
const DEFAULT_WINDOW = 48;
const SVG_WIDTH = 980;
const SVG_HEIGHT = 520;
const LEFT = 22;
const RIGHT = 76;
const TOP = 24;
const PRICE_BOTTOM = 390;
const VOLUME_TOP = 414;
const VOLUME_BOTTOM = 482;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function compact(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function price(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits:
      Math.abs(value) < 1 ? 6 : Math.abs(value) < 10 ? 4 : 2,
  }).format(value);
}

function resolveLocale(locale: string) {
  return locale === "de" || locale === "en" ? locale : "pl";
}

const copy = {
  pl: {
    chart: "Interaktywny wykres świecowy oparty wyłącznie na danych źródłowych",
    reset: "Resetuj widok",
    zoomIn: "Przybliż",
    zoomOut: "Oddal",
    fullscreen: "Dopasuj wykres",
    controls:
      "Przeciągnij · kółko/pinch zoom · strzałki wskazują · Shift+strzałki przesuwają · 0 resetuje",
    sourceOnly: "Świece źródłowe · bez danych zastępczych",
    latest: "Przejdź do najnowszych danych",
    visibleRange: "Zakres widoku",
    versusPrevious: "vs poprzednia świeca",
    volumePulse: "Impuls wolumenu",
    provider: "Stan dostawcy",
    history: "Pokrycie historii",
    cadence: "Kadencja",
    regime: "Reżim świecy",
    trend: "Trend widoku",
    body: "Udział korpusu",
    volumeRank: "Percentyl wolumenu",
    regimes: {
      expansion: "ekspansja",
      compression: "kompresja",
      balanced: "równowaga",
    },
    trends: { up: "wzrostowy", down: "spadkowy", flat: "neutralny" },
    state: {
      live: "na żywo",
      stale: "nieświeże",
      partial: "częściowe",
      offline: "offline",
    },
    failover: "Trasa awaryjna",
    consensus: "Zgodność providerów",
    secondary: "Drugie źródło",
    divergence: "Rozbieżność",
    matched: "Dopasowane świece",
    failoverModes: {
      primary_live: "primary live",
      failover_ready: "failover gotowy",
      degraded: "tryb ograniczony",
      blocked: "zablokowany",
    },
    diffStates: {
      aligned: "zgodne",
      watch: "obserwuj",
      divergent: "rozbieżne",
      single_source: "jedno źródło",
      unavailable: "brak porównania",
    },
    routeLedger: "Rejestr trasy",
    routeCap: "Limit pewności",
    routeNext: "Następny krok",
    overlay: "Overlay drugiego feedu",
    overlayOn: "pokaż",
    overlayOff: "ukryj",
    retryTelemetry: "Historia retry/backoff",
    retryNext: "zalecana kolejna próba",
    retryEmpty: "Brak zdarzeń retry od adaptera",
    evidence: "Dowody wykresu",
    fields: "pól",
    confirmed: "potwierdzone",
    limited: "ograniczone",
    missing: "braki",
    continuity: "ciągłość",
    comparison: "porównanie",
    refresh: "odświeżenie",
    route: "trasa źródła",
    details: "Pokaż źródła i granice",
    gaps: "luki",
    duplicates: "duplikaty",
    cadenceShifts: "zmiany kadencji",
    preserved: "Potwierdzone dane pozostają widoczne do czasu następnej kontroli źródła.",
    normalizedPath: "znormalizowana ścieżka",
    routeBoundary: "Limit pewności pozostaje związany z jakością aktywnego źródła.",
  },
  de: {
    chart: "Interaktiver Kerzenchart ausschließlich aus Quelldaten",
    reset: "Ansicht zurücksetzen",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    fullscreen: "Chart anpassen",
    controls:
      "Ziehen · Rad/Pinch-Zoom · Pfeile prüfen · Shift+Pfeile verschieben · 0 setzt zurück",
    sourceOnly: "Quellenkerzen · keine Ersatzdaten",
    latest: "Zu den neuesten Daten",
    visibleRange: "Sichtbarer Bereich",
    versusPrevious: "vs. vorherige Kerze",
    volumePulse: "Volumenimpuls",
    provider: "Provider-Status",
    history: "Historienabdeckung",
    cadence: "Kadenz",
    regime: "Kerzenregime",
    trend: "Sichttrend",
    body: "Körperanteil",
    volumeRank: "Volumenperzentil",
    regimes: {
      expansion: "Expansion",
      compression: "Kompression",
      balanced: "ausgeglichen",
    },
    trends: { up: "steigend", down: "fallend", flat: "neutral" },
    state: {
      live: "live",
      stale: "veraltet",
      partial: "teilweise",
      offline: "offline",
    },
    failover: "Ausweichroute",
    consensus: "Provider-Abgleich",
    secondary: "Zweitquelle",
    divergence: "Abweichung",
    matched: "Gematchte Kerzen",
    failoverModes: {
      primary_live: "Primary live",
      failover_ready: "Failover bereit",
      degraded: "eingeschränkt",
      blocked: "blockiert",
    },
    diffStates: {
      aligned: "abgeglichen",
      watch: "beobachten",
      divergent: "abweichend",
      single_source: "Einzelquelle",
      unavailable: "kein Vergleich",
    },
    routeLedger: "Routenprotokoll",
    routeCap: "Konfidenzgrenze",
    routeNext: "Nächster Schritt",
    overlay: "Zweitfeed-Overlay",
    overlayOn: "anzeigen",
    overlayOff: "ausblenden",
    retryTelemetry: "Retry/Backoff-Verlauf",
    retryNext: "empfohlener nächster Versuch",
    retryEmpty: "Keine Retry-Ereignisse vom Adapter",
    evidence: "Chart-Evidenz",
    fields: "Felder",
    confirmed: "bestätigt",
    limited: "begrenzt",
    missing: "fehlend",
    continuity: "Kontinuität",
    comparison: "Vergleich",
    refresh: "Aktualisierung",
    route: "Quellenroute",
    details: "Quellen und Grenzen öffnen",
    gaps: "Lücken",
    duplicates: "Duplikate",
    cadenceShifts: "Kadenzwechsel",
    preserved: "Bestätigte Daten bleiben bis zur nächsten Quellenprüfung sichtbar.",
    normalizedPath: "normalisierter Pfad",
    routeBoundary: "Das Konfidenzlimit bleibt an die Qualität der aktiven Quelle gebunden.",
  },
  en: {
    chart: "Interactive candlestick chart built only from source data",
    reset: "Reset view",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fullscreen: "Fit chart",
    controls:
      "Drag · wheel/pinch zoom · arrows inspect · Shift+arrows pan · 0 resets",
    sourceOnly: "Source candles · no substitute data",
    latest: "Jump to latest data",
    visibleRange: "Visible range",
    versusPrevious: "vs previous candle",
    volumePulse: "Volume pulse",
    provider: "Provider state",
    history: "History coverage",
    cadence: "Cadence",
    regime: "Candle regime",
    trend: "View trend",
    body: "Body share",
    volumeRank: "Volume percentile",
    regimes: {
      expansion: "expansion",
      compression: "compression",
      balanced: "balanced",
    },
    trends: { up: "up", down: "down", flat: "flat" },
    state: {
      live: "live",
      stale: "stale",
      partial: "partial",
      offline: "offline",
    },
    failover: "Failover route",
    consensus: "Provider consensus",
    secondary: "Second source",
    divergence: "Divergence",
    matched: "Matched candles",
    failoverModes: {
      primary_live: "primary live",
      failover_ready: "failover ready",
      degraded: "degraded",
      blocked: "blocked",
    },
    diffStates: {
      aligned: "aligned",
      watch: "watch",
      divergent: "divergent",
      single_source: "single source",
      unavailable: "no comparison",
    },
    routeLedger: "Route ledger",
    routeCap: "Confidence cap",
    routeNext: "Next action",
    overlay: "Second-feed overlay",
    overlayOn: "show",
    overlayOff: "hide",
    retryTelemetry: "Retry/backoff history",
    retryNext: "recommended next attempt",
    retryEmpty: "No adapter retry events",
    evidence: "Chart evidence",
    fields: "fields",
    confirmed: "confirmed",
    limited: "limited",
    missing: "missing",
    continuity: "continuity",
    comparison: "comparison",
    refresh: "refresh",
    route: "source route",
    details: "Open sources and boundaries",
    gaps: "gaps",
    duplicates: "duplicates",
    cadenceShifts: "cadence shifts",
    preserved: "Confirmed values remain visible until the next source check.",
    normalizedPath: "normalized path",
    routeBoundary: "The confidence cap remains bound to the quality of the active source.",
  },
} as const;

const statusCopy = {
  pl: {
    ready: "gotowe", limited: "ograniczone", blocked: "zablokowane",
    healthy: "spójne", watch: "do kontroli",
    cadence_follow: "zgodnie z kadencją", stale_recovery: "odzyskiwanie świeżości",
    partial_fill: "uzupełnianie historii", offline_backoff: "zwolnione próby",
    aligned: "zgodne", divergent: "rozbieżne", unavailable: "niedostępne",
    normalized_return: "znormalizowana ścieżka",
  },
  de: {
    ready: "bereit", limited: "begrenzt", blocked: "gesperrt",
    healthy: "konsistent", watch: "prüfen",
    cadence_follow: "nach Kadenz", stale_recovery: "Freshness-Wiederherstellung",
    partial_fill: "Historie ergänzen", offline_backoff: "verlangsamte Versuche",
    aligned: "abgeglichen", divergent: "abweichend", unavailable: "nicht verfügbar",
    normalized_return: "normalisierter Pfad",
  },
  en: {
    ready: "ready", limited: "limited", blocked: "blocked",
    healthy: "consistent", watch: "review",
    cadence_follow: "cadence follow", stale_recovery: "freshness recovery",
    partial_fill: "history fill", offline_backoff: "retry backoff",
    aligned: "aligned", divergent: "divergent", unavailable: "unavailable",
    normalized_return: "normalized path",
  },
} as const;

function localizedStatus(locale: keyof typeof statusCopy, value: string) {
  const dictionary = statusCopy[locale] as Record<string, string>;
  return dictionary[value] || value.replaceAll("_", " ");
}

const routeActionCopy = {
  pl: {
    resilient: "Monitoruj świeżość i rozbieżność przed zmianą trasy.",
    single_route: "Dołącz drugie źródło świec z zgodnym timestampem.",
    degraded: "Odśwież aktywne źródło i potwierdź providera zapasowego.",
    blocked: "Wstrzymaj bieżące claimy do czasu powrotu zweryfikowanego źródła.",
  },
  de: {
    resilient: "Freshness und Abweichung vor einem Routenwechsel weiter prüfen.",
    single_route: "Einen zweiten Kerzenfeed mit kompatiblem Zeitstempel anbinden.",
    degraded: "Aktive Quelle aktualisieren und Standby-Provider verifizieren.",
    blocked: "Live-Claims pausieren, bis eine verifizierte Quelle zurückkehrt.",
  },
  en: {
    resilient: "Keep monitoring freshness and divergence before switching routes.",
    single_route: "Attach a timestamp-compatible secondary candle stream.",
    degraded: "Refresh the active source and verify a standby provider.",
    blocked: "Stop live chart claims until a verified source returns.",
  },
} as const;

function localizedRouteAction(
  locale: keyof typeof routeActionCopy,
  state: keyof (typeof routeActionCopy)["en"],
  fallback: string,
) {
  return routeActionCopy[locale][state] || fallback;
}

export default function AdvancedMarketChart({
  candles,
  locale,
  symbol,
  source,
  range,
  secondaryCandles,
  secondarySource,
  providerComparison,
  providerRetryEvents,
  analysisDepth = "basic",
  confidenceCap,
  providerRouteId,
  onRefreshDue,
  cleanChrome = false,
}: {
  candles: AdvancedMarketCandle[];
  locale: string;
  symbol?: string;
  source?: string;
  range?: string;
  secondaryCandles?: AdvancedMarketCandle[];
  secondarySource?: string;
  providerComparison?: Pass518ComparisonSummary | null;
  providerRetryEvents?: Pass532ProviderRetryEvent[];
  analysisDepth?: Pass588AnalysisDepth;
  confidenceCap?: number | null;
  providerRouteId?: string;
  cleanChrome?: boolean;
  onRefreshDue?: (payload: {
    reason: "freshness_schedule";
    schedule: Pass589SourceFreshnessSchedule;
    viewportIdentity: Pass587ChartViewportIdentity;
  }) => void;
}) {
  const safeLocale = resolveLocale(locale);
  const c = copy[safeLocale];
  const crosshairStatusId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<PinchState | null>(null);
  const pendingPanOffsetRef = useRef<number | null>(null);
  const panFrameRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);
  const [panOffset, setPanOffset] = useState(0);
  const [windowSize, setWindowSize] = useState(() =>
    clamp(
      Math.min(DEFAULT_WINDOW, candles.length),
      Math.min(MIN_WINDOW, candles.length),
      Math.max(1, candles.length),
    ),
  );
  const [showSecondaryOverlay, setShowSecondaryOverlay] = useState(true);
  const [freshnessObservedAt, setFreshnessObservedAt] = useState(() =>
    Math.floor(Date.now() / 1000),
  );
  const refreshCallbackRef = useRef(onRefreshDue);
  const [observedRetryEvents, setObservedRetryEvents] = useState<
    Pass532ProviderRetryEvent[]
  >([]);
  const previousProviderStateRef = useRef<{
    state: string;
    source: string;
  } | null>(null);


  useEffect(() => {
    return () => {
      if (panFrameRef.current !== null) {
        window.cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
      }
    };
  }, []);

  function commitPanOffset(nextOffset: number) {
    pendingPanOffsetRef.current = nextOffset;
    if (panFrameRef.current !== null) return;
    panFrameRef.current = window.requestAnimationFrame(() => {
      panFrameRef.current = null;
      const pending = pendingPanOffsetRef.current;
      pendingPanOffsetRef.current = null;
      if (pending !== null) setPanOffset(pending);
    });
  }

  const primaryContinuity = useMemo(
    () => buildPass590CandleContinuityLedger(candles, range),
    [candles, range],
  );
  const cleanCandles = primaryContinuity.candles;
  const viewportIdentity = useMemo(
    () =>
      buildPass587ChartViewportIdentity({
        symbol,
        range,
        source,
        secondarySource:
          secondarySource || providerComparison?.secondarySource || undefined,
        providerRouteId:
          providerRouteId ||
          `${providerComparison?.directPriceComparable === false ? "normalized" : "direct"}:${providerComparison?.state || "unknown"}`,
      }),
    [
      providerComparison?.directPriceComparable,
      providerComparison?.secondarySource,
      providerComparison?.state,
      providerRouteId,
      range,
      secondarySource,
      source,
      symbol,
    ],
  );
  const minWindow = Math.min(MIN_WINDOW, Math.max(1, cleanCandles.length));
  const maxWindow = Math.max(1, cleanCandles.length);
  const safeWindowSize = clamp(windowSize, minWindow, maxWindow);
  const maxOffset = Math.max(0, cleanCandles.length - safeWindowSize);
  const safeOffset = clamp(panOffset, 0, maxOffset);
  const visibleEnd = cleanCandles.length - safeOffset;
  const visibleStart = Math.max(0, visibleEnd - safeWindowSize);
  const visible = cleanCandles.slice(visibleStart, visibleEnd);
  const dataKey = `${cleanCandles.length}:${cleanCandles.at(-1)?.timestamp ?? 0}`;

  useEffect(() => {
    // Migrate the historical symbol/range cache into the provider-aware identity.
    const cached =
      readPass587ChartViewport(viewportIdentity) ??
      readPass504ChartView(symbol, range);
    const nextWindow = cached
      ? clamp(cached.windowSize, minWindow, maxWindow)
      : clamp(
          Math.min(DEFAULT_WINDOW, cleanCandles.length),
          minWindow,
          maxWindow,
        );
    const nextMaxOffset = Math.max(0, cleanCandles.length - nextWindow);
    setWindowSize(nextWindow);
    setPanOffset(cached ? clamp(cached.panOffset, 0, nextMaxOffset) : 0);
    setHovered(null);
    setInspectedIndex(null);
  }, [
    dataKey,
    cleanCandles.length,
    maxWindow,
    minWindow,
    range,
    symbol,
    viewportIdentity,
  ]);

  useEffect(() => {
    setPanOffset((current) => clamp(current, 0, maxOffset));
    setWindowSize((current) => clamp(current, minWindow, maxWindow));
  }, [maxOffset, maxWindow, minWindow]);

  useEffect(() => {
    setInspectedIndex((current) =>
      current === null
        ? null
        : clamp(current, 0, Math.max(0, visible.length - 1)),
    );
  }, [visible.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writePass587ChartViewport(
        viewportIdentity,
        safeWindowSize,
        safeOffset,
      );
      // Keep PASS504 readable during the migration window so existing sessions
      // retain their viewport after the provider-aware upgrade.
      writePass504ChartView(symbol, range, safeWindowSize, safeOffset);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [range, safeOffset, safeWindowSize, symbol, viewportIdentity]);

  useEffect(() => {
    refreshCallbackRef.current = onRefreshDue;
  }, [onRefreshDue]);

  const providerRuntime = useMemo(
    () =>
      buildPass503ProviderRuntime(
        cleanCandles,
        source,
        range,
        freshnessObservedAt,
      ),
    [cleanCandles, freshnessObservedAt, range, source],
  );
  const secondaryContinuity = useMemo(
    () => buildPass590CandleContinuityLedger(secondaryCandles || [], range),
    [range, secondaryCandles],
  );
  const cleanSecondaryCandles = secondaryContinuity.candles;
  const secondaryRuntime = useMemo(
    () =>
      cleanSecondaryCandles.length > 1
        ? buildPass503ProviderRuntime(
            cleanSecondaryCandles,
            secondarySource || providerComparison?.secondarySource || undefined,
            range,
            freshnessObservedAt,
          )
        : null,
    [
      cleanSecondaryCandles,
      freshnessObservedAt,
      providerComparison?.secondarySource,
      range,
      secondarySource,
    ],
  );
  const failoverRuntime = useMemo(
    () =>
      buildPass517ProviderFailoverRuntime(
        providerRuntime,
        secondaryRuntime
          ? {
              sourceLabel: secondaryRuntime.sourceLabel,
              state: secondaryRuntime.state,
              ageSeconds: secondaryRuntime.ageSeconds,
              coverageScore: secondaryRuntime.coverageScore,
            }
          : null,
      ),
    [providerRuntime, secondaryRuntime],
  );
  const crossProviderDiff = useMemo(
    () =>
      buildPass518CrossProviderChartDiff(
        cleanCandles,
        cleanSecondaryCandles,
        providerComparison,
      ),
    [cleanCandles, cleanSecondaryCandles, providerComparison],
  );
  const chartComparisonLens = useMemo(
    () =>
      buildPass591ChartComparisonLens({
        primary: cleanCandles,
        secondary: cleanSecondaryCandles,
        primaryLabel: providerRuntime.sourceLabel,
        secondaryLabel:
          secondaryRuntime?.sourceLabel ||
          secondarySource ||
          providerComparison?.secondarySource ||
          null,
        directPriceComparable:
          providerComparison?.directPriceComparable !== false,
        locale: safeLocale,
      }),
    [
      cleanCandles,
      cleanSecondaryCandles,
      providerComparison?.directPriceComparable,
      providerComparison?.secondarySource,
      providerRuntime.sourceLabel,
      safeLocale,
      secondaryRuntime?.sourceLabel,
      secondarySource,
    ],
  );
  const freshnessSchedule = useMemo(
    () =>
      buildPass589SourceFreshnessSchedule({
        state: providerRuntime.state,
        ageSeconds: providerRuntime.ageSeconds,
        cadenceSeconds: providerRuntime.cadenceSeconds,
        range,
        locale: safeLocale,
      }),
    [
      providerRuntime.ageSeconds,
      providerRuntime.cadenceSeconds,
      providerRuntime.state,
      range,
      safeLocale,
    ],
  );
  const providerRouteLedger = useMemo(
    () => buildPass524ProviderRouteLedger(failoverRuntime, crossProviderDiff),
    [crossProviderDiff, failoverRuntime],
  );
  const providerRouteNextAction = localizedRouteAction(
    safeLocale,
    providerRouteLedger.state,
    providerRouteLedger.nextAction,
  );
  const secondaryOverlay = useMemo(
    () =>
      buildPass531SecondaryCandleOverlay(
        visible,
        cleanSecondaryCandles,
        secondaryRuntime?.sourceLabel ||
          secondarySource ||
          providerComparison?.secondarySource,
        providerComparison?.directPriceComparable !== false,
      ),
    [
      cleanSecondaryCandles,
      providerComparison?.directPriceComparable,
      providerComparison?.secondarySource,
      secondaryRuntime?.sourceLabel,
      secondarySource,
      visible,
    ],
  );
  const retryTelemetry = useMemo(
    () =>
      buildPass532ProviderRetryTelemetry(
        providerRuntime.sourceLabel,
        providerRuntime.state,
        [...(providerRetryEvents || []), ...observedRetryEvents],
      ),
    [
      observedRetryEvents,
      providerRetryEvents,
      providerRuntime.sourceLabel,
      providerRuntime.state,
    ],
  );
  const consensusQuality = useMemo(
    () =>
      buildPass538ProviderConsensusQuality(
        safeLocale,
        failoverRuntime,
        crossProviderDiff,
        secondaryOverlay,
        retryTelemetry,
      ),
    [
      crossProviderDiff,
      failoverRuntime,
      retryTelemetry,
      safeLocale,
      secondaryOverlay,
    ],
  );
  const consensusExplainability = useMemo(
    () =>
      buildPass545ProviderConsensusExplainability(
        safeLocale,
        consensusQuality,
        crossProviderDiff,
        secondaryOverlay,
      ),
    [consensusQuality, crossProviderDiff, safeLocale, secondaryOverlay],
  );
  const gestureQa = useMemo(() => getPass522MobileGestureQa("chart"), []);

  useEffect(() => {
    const next = {
      state: providerRuntime.state,
      source: providerRuntime.sourceLabel,
    };
    const previous = previousProviderStateRef.current;
    previousProviderStateRef.current = next;
    if (
      previous &&
      previous.state === next.state &&
      previous.source === next.source
    )
      return;
    const observedAt = Date.now();
    const recovered =
      providerRuntime.state === "live" && previous && previous.state !== "live";
    setObservedRetryEvents((current) =>
      [
        {
          id: `${providerRuntime.sourceLabel}:${providerRuntime.state}:${observedAt}`,
          sourceLabel: providerRuntime.sourceLabel,
          observedAt,
          state: providerRuntime.state,
          attempt: current.length + 1,
          delayMs: null,
          outcome: recovered ? ("recovered" as const) : ("observed" as const),
          detail: recovered
            ? "The runtime observed a return to the live freshness budget."
            : `Provider state changed to ${providerRuntime.state}.`,
        },
        ...current,
      ].slice(0, 8),
    );
  }, [providerRuntime.sourceLabel, providerRuntime.state]);

  useEffect(() => {
    if (secondaryOverlay.state !== "unavailable") setShowSecondaryOverlay(true);
  }, [secondaryOverlay.sourceLabel, secondaryOverlay.state]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFreshnessObservedAt(Math.floor(Date.now() / 1000));
      refreshCallbackRef.current?.({
        reason: "freshness_schedule",
        schedule: freshnessSchedule,
        viewportIdentity,
      });
    }, freshnessSchedule.delayMs);
    return () => window.clearTimeout(timer);
  }, [freshnessSchedule, viewportIdentity]);

  const model = useMemo(() => {
    if (visible.length < 2) return null;
    const lowValue = Math.min(...visible.map((candle) => candle.low));
    const highValue = Math.max(...visible.map((candle) => candle.high));
    const padding = Math.max(
      (highValue - lowValue) * 0.07,
      Math.abs(highValue) * 0.001,
      0.000001,
    );
    const low = lowValue - padding;
    const high = highValue + padding;
    const span = Math.max(high - low, 0.000001);
    const plotWidth = SVG_WIDTH - LEFT - RIGHT;
    const step = plotWidth / visible.length;
    const y = (value: number) =>
      TOP + ((high - value) / span) * (PRICE_BOTTOM - TOP);
    const maxVolume = Math.max(
      ...visible.map((candle) => candle.volume || 0),
      1,
    );
    const movingAverage = visible.map((_, index) => {
      const start = Math.max(0, index - 8);
      const slice = visible.slice(start, index + 1);
      return (
        slice.reduce((sum, candle) => sum + candle.close, 0) / slice.length
      );
    });
    const movingPath = movingAverage
      .map(
        (value, index) =>
          `${index ? "L" : "M"} ${LEFT + index * step + step / 2} ${y(value)}`,
      )
      .join(" ");
    return { low, high, step, y, maxVolume, movingPath };
  }, [visible]);

  const secondaryOverlayModel = useMemo(() => {
    if (
      !model ||
      secondaryOverlay.points.length < 2 ||
      secondaryOverlay.lowerBound === null ||
      secondaryOverlay.upperBound === null
    )
      return null;
    const span = Math.max(
      secondaryOverlay.upperBound - secondaryOverlay.lowerBound,
      0.000001,
    );
    const y = (value: number) =>
      TOP +
      ((secondaryOverlay.upperBound! - value) / span) * (PRICE_BOTTOM - TOP);
    const path = secondaryOverlay.points
      .map(
        (point, index) =>
          `${index ? "L" : "M"} ${LEFT + point.primaryIndex * model.step + model.step / 2} ${y(point.plotValue)}`,
      )
      .join(" ");
    return { path, y };
  }, [model, secondaryOverlay]);

  function resetView() {
    setWindowSize(
      clamp(
        Math.min(DEFAULT_WINDOW, cleanCandles.length),
        minWindow,
        maxWindow,
      ),
    );
    setPanOffset(0);
    setHovered(null);
    setInspectedIndex(null);
  }

  function setZoom(nextWindow: number, anchorRatio = 0.5) {
    const currentWindow = safeWindowSize;
    const next = clamp(Math.round(nextWindow), minWindow, maxWindow);
    if (next === currentWindow) return;
    const currentStart = cleanCandles.length - safeOffset - currentWindow;
    const anchorIndex = currentStart + currentWindow * clamp(anchorRatio, 0, 1);
    const nextStart = clamp(
      Math.round(anchorIndex - next * clamp(anchorRatio, 0, 1)),
      0,
      Math.max(0, cleanCandles.length - next),
    );
    const nextOffset = cleanCandles.length - (nextStart + next);
    setWindowSize(next);
    setPanOffset(clamp(nextOffset, 0, Math.max(0, cleanCandles.length - next)));
    setHovered(null);
  }

  function onMove(event: MouseEvent<SVGSVGElement>) {
    if (dragRef.current || pointersRef.current.size > 0 || !model) return;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x =
      ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * SVG_WIDTH;
    const index = clamp(
      Math.floor((x - LEFT) / model.step),
      0,
      visible.length - 1,
    );
    setHovered(index);
  }

  function indexFromClientX(clientX: number) {
    if (!model) return null;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const x = ((clientX - bounds.left) / Math.max(bounds.width, 1)) * SVG_WIDTH;
    return clamp(
      Math.floor((x - LEFT) / model.step),
      0,
      Math.max(0, visible.length - 1),
    );
  }

  function beginPointer(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length >= 2) {
      const distance = Math.hypot(
        pointers[0].x - pointers[1].x,
        pointers[0].y - pointers[1].y,
      );
      const bounds = svgRef.current?.getBoundingClientRect();
      const centerRatio = bounds
        ? clamp(
            ((pointers[0].x + pointers[1].x) / 2 - bounds.left) /
              Math.max(bounds.width, 1),
            0,
            1,
          )
        : 0.5;
      pinchRef.current = {
        distance: Math.max(distance, 1),
        windowSize: safeWindowSize,
        centerRatio,
      };
      dragRef.current = null;
    } else {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: safeOffset,
        axis: event.pointerType === "mouse" ? "horizontal" : "pending",
        moved: false,
      };
    }
    setHovered(null);
  }

  function movePointer(event: PointerEvent<SVGSVGElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length >= 2 && pinchRef.current) {
      const distance = Math.max(
        Math.hypot(
          pointers[0].x - pointers[1].x,
          pointers[0].y - pointers[1].y,
        ),
        1,
      );
      setZoom(
        pinchRef.current.windowSize * (pinchRef.current.distance / distance),
        pinchRef.current.centerRatio,
      );
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    drag.axis = resolvePass586GestureAxis(deltaX, deltaY, drag.axis);
    drag.moved =
      drag.moved ||
      Math.hypot(deltaX, deltaY) >=
        pass586MobileChartGesturePolicy.axisLockThresholdPx;
    if (drag.axis !== "horizontal" || maxOffset === 0) return;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const deltaBars = Math.round(
      (deltaX / Math.max(bounds.width, 1)) * safeWindowSize,
    );
    // Direct manipulation: the rendered history follows the hand/cursor.
    commitPanOffset(clamp(drag.startOffset + deltaBars, 0, maxOffset));
  }

  function endPointer(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    const cancelled = event.type === "pointercancel";
    if (
      !cancelled &&
      drag?.pointerId === event.pointerId &&
      !drag.moved &&
      pointersRef.current.size === 1
    ) {
      const nextIndex = indexFromClientX(event.clientX);
      if (nextIndex !== null) setInspectedIndex(nextIndex);
    }
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    const remaining = Array.from(pointersRef.current.entries());
    if (remaining.length === 1) {
      const [pointerId, point] = remaining[0];
      dragRef.current = {
        pointerId,
        startX: point.x,
        startY: point.y,
        startOffset: safeOffset,
        axis: "pending",
        moved: false,
      };
    }
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    event.stopPropagation();
    const bounds = svgRef.current?.getBoundingClientRect();
    const anchorRatio = bounds
      ? clamp((event.clientX - bounds.left) / Math.max(bounds.width, 1), 0, 1)
      : 0.5;
    const intensity = Math.max(1, Math.min(8, Math.abs(event.deltaY) / 30));
    setZoom(
      safeWindowSize + (event.deltaY > 0 ? intensity : -intensity),
      anchorRatio,
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (event.shiftKey) {
        setPanOffset((current) =>
          clamp(current + (event.key === "ArrowLeft" ? 3 : -3), 0, maxOffset),
        );
        return;
      }
      setInspectedIndex((current) => {
        const base = current ?? visible.length - 1;
        return clamp(
          base + (event.key === "ArrowLeft" ? -1 : 1),
          0,
          visible.length - 1,
        );
      });
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const step = Math.max(3, Math.round(safeWindowSize / 2));
      setPanOffset((current) =>
        clamp(current + (event.key === "PageUp" ? step : -step), 0, maxOffset),
      );
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(safeWindowSize - 5);
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom(safeWindowSize + 5);
    } else if (event.key === "0") {
      event.preventDefault();
      resetView();
    } else if (event.key === "Home") {
      event.preventDefault();
      setPanOffset(0);
      setInspectedIndex(visible.length - 1);
    } else if (event.key === "End") {
      event.preventDefault();
      setPanOffset(maxOffset);
      setInspectedIndex(0);
    }
  }

  if (!model || visible.length < 2) return null;
  const selectedIndex = clamp(
    hovered ?? inspectedIndex ?? visible.length - 1,
    0,
    visible.length - 1,
  );
  const selected = visible[selectedIndex];
  const previous = cleanCandles[visibleStart + selectedIndex - 1];
  const insight = buildPass498ChartInsight(selected, previous, visible);
  const regimeLens = buildPass511ChartRegimeLens(
    visible,
    selected,
    providerRuntime.state,
  );
  const selectedX = LEFT + selectedIndex * model.step + model.step / 2;
  const selectedY = model.y(selected.close);
  const selectedOverlayPoint =
    secondaryOverlay.points.find(
      (point) => point.timestamp === selected.timestamp,
    ) ?? null;
  const changeTone =
    insight.direction === "up"
      ? "text-emerald-200"
      : insight.direction === "down"
        ? "text-rose-200"
        : "text-white/[0.62]";
  const crosshairInspector = buildPass585SharedCrosshairInspector({
    candle: selected,
    previous,
    locale: safeLocale,
    symbol,
    source,
    range,
  });
  const evidenceManifest = buildPass588ChartEvidenceManifest({
    locale: safeLocale,
    depth: analysisDepth,
    closeLabel: price(selected.close, safeLocale),
    timestampLabel: new Date(selected.timestamp * 1000).toLocaleString(
      safeLocale,
    ),
    range,
    providerState: providerRuntime.state,
    ageSeconds: providerRuntime.ageSeconds,
    coverageScore: providerRuntime.coverageScore,
    cadenceSeconds: providerRuntime.cadenceSeconds,
    visibleRangePercent: insight.rangePercent,
    volumeRatio: insight.volumeRatio,
    continuityState: primaryContinuity.state,
    continuityScore: primaryContinuity.continuityScore,
    failoverMode: failoverRuntime.mode,
    comparisonState: chartComparisonLens.state,
    matchRate:
      chartComparisonLens.points.length > 1
        ? chartComparisonLens.matchRate
        : crossProviderDiff.matchRate || null,
    medianDivergenceBps:
      chartComparisonLens.medianSpreadBps ??
      crossProviderDiff.medianCloseDivergenceBps,
    directionAgreement: crossProviderDiff.directionAgreement,
    maximumDivergenceBps:
      chartComparisonLens.maximumSpreadBps ??
      crossProviderDiff.maximumCloseDivergenceBps,
    gapCount: primaryContinuity.gapCount,
    duplicateCount: primaryContinuity.duplicateCount,
    cadenceShiftCount: primaryContinuity.cadenceShiftCount,
    confidenceCap:
      confidenceCap ?? providerRouteLedger.confidenceCap ?? null,
  });

  return (
    <div
      className="overflow-hidden rounded-[1.4rem] border border-white/[0.08] bg-[#06090a] outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/[0.30]"
      data-chart-clean-chrome={cleanChrome ? "true" : "false"}
      data-pass480-unified-chart-runtime="pan-pinch-wheel-keyboard"
      data-pass498-chart-insight="crosshair-range-volume"
      data-pass503-provider-state={providerRuntime.state}
      data-pass504-chart-view-cache={`${symbol || "unknown"}:${range || "default"}`}
      data-pass511-chart-regime-lens={`${regimeLens.regime}:${regimeLens.trend}`}
      data-pass517-provider-failover={failoverRuntime.mode}
      data-pass518-cross-provider-diff={crossProviderDiff.state}
      data-pass524-provider-route-ledger={providerRouteLedger.state}
      data-pass531-secondary-overlay={secondaryOverlay.state}
      data-pass532-provider-retry-telemetry={retryTelemetry.state}
      data-pass538-provider-consensus-quality={`${consensusQuality.state}:${consensusQuality.score}`}
      data-pass545-provider-consensus-explainability={`${consensusExplainability.state}:${consensusExplainability.score}`}
      data-pass522-mobile-gesture-qa={gestureQa.status}
      data-pass585-shared-crosshair-inspector="ohlcv-time-volume"
      data-pass586-mobile-chart-gestures={
        pass586MobileChartGesturePolicy.touchAction
      }
      data-pass587-chart-viewport-identity={viewportIdentity.storageKey}
      data-pass588-chart-evidence-budget={evidenceManifest.fieldBudget}
      data-pass588-chart-evidence-manifest={`${analysisDepth}:${evidenceManifest.status}`}
      data-pass589-freshness-mode={freshnessSchedule.mode}
      data-pass590-continuity-state={primaryContinuity.state}
      data-pass591-comparison-state={chartComparisonLens.state}
      data-chart-source-policy="source-candles-only"
      tabIndex={0}
      role="region"
      aria-label={c.chart}
      aria-describedby={crosshairStatusId}
      aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight PageUp PageDown + - 0 Home End"
      onKeyDown={onKeyDown}
    >
      {!cleanChrome ? (
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/[0.07] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.11em] text-white/[0.42]"
          aria-hidden="true"
        >
          {symbol ? (
            <strong className="text-cyan-100/[0.82]">{symbol}</strong>
          ) : null}
          {crosshairInspector.items.map((item) => (
            <span key={item.id} title={item.label}>
              {item.shortLabel}{" "}
              <b
                className={
                  item.id === "high"
                    ? "text-emerald-200/[0.76]"
                    : item.id === "low"
                      ? "text-rose-200/[0.76]"
                      : item.id === "close"
                        ? "text-cyan-100/[0.82]"
                        : "text-white/[0.72]"
                }
              >
                {item.value}
              </b>
            </span>
          ))}
          <span className={changeTone}>
            {crosshairInspector.changeLabel}{" "}
            <span className="text-white/[0.28]">{c.versusPrevious}</span>
          </span>
          <time className="ml-auto">{crosshairInspector.timestampLabel}</time>
        </div>
      ) : null}
      <p
        id={crosshairStatusId}
        className="sr-only"
        aria-live="polite"
      >
        {crosshairInspector.accessibleLabel}
      </p>
      {!cleanChrome ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.11em] text-white/[0.30]">
          <span>
            {[range?.toUpperCase(), source].filter(Boolean).join(" · ") ||
              c.sourceOnly}
          </span>
          <span
            className={`rounded-full border px-2 py-1 ${providerRuntime.state === "live" ? "border-emerald-200/[0.18] bg-emerald-300/[0.05] text-emerald-100/[0.72]" : providerRuntime.state === "stale" ? "border-amber-200/[0.18] bg-amber-300/[0.05] text-amber-100/[0.72]" : "border-rose-200/[0.18] bg-rose-300/[0.05] text-rose-100/[0.72]"}`}
          >
            {c.provider}: {c.state[providerRuntime.state]}
          </span>
          <span>
            {c.history}:{" "}
            <b className="text-white/[0.58]">
              {providerRuntime.coverageScore}%
            </b>
          </span>
          <span>
            {c.cadence}:{" "}
            <b className="text-white/[0.58]">
              {providerRuntime.cadenceSeconds
                ? `${Math.round(providerRuntime.cadenceSeconds / 60)}m`
                : "—"}
            </b>
          </span>
          <span>
            {c.visibleRange}:{" "}
            <b className="text-white/[0.58]">
              {insight.rangePercent.toFixed(2)}%
            </b>
          </span>
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {c.volumePulse}:{" "}
            <b className="text-white/[0.58]">
              {insight.volumeRatio ? `${insight.volumeRatio.toFixed(2)}×` : "—"}
            </b>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {secondaryOverlay.state !== "unavailable" ? (
            <button
              type="button"
              onClick={() => setShowSecondaryOverlay((current) => !current)}
              className={`min-h-11 rounded-full border px-3 font-mono text-[7px] uppercase tracking-[0.09em] transition ${showSecondaryOverlay ? "border-cyan-200/[0.22] bg-cyan-300/[0.06] text-cyan-100/[0.78]" : "border-white/[0.09] text-white/[0.38] hover:text-white"}`}
              aria-pressed={showSecondaryOverlay}
              title={secondaryOverlay.boundary}
            >
              {c.overlay} · {showSecondaryOverlay ? c.overlayOff : c.overlayOn}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setZoom(safeWindowSize + 6)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.09] text-white/[0.45] transition hover:text-white"
            aria-label={c.zoomOut}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(safeWindowSize - 6)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.09] text-white/[0.45] transition hover:text-white"
            aria-label={c.zoomIn}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPanOffset(0)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.09] text-white/[0.45] transition hover:text-white"
            aria-label={c.latest}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.09] text-white/[0.45] transition hover:text-white"
            aria-label={c.reset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(maxWindow)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.09] text-white/[0.45] transition hover:text-white"
            aria-label={c.fullscreen}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        </div>
      ) : null}
      {!cleanChrome ? (
        <details
          className="group border-b border-white/[0.06] bg-[linear-gradient(120deg,rgba(66,220,255,.045),transparent_42%),#040809]"
        data-pass511-regime-strip={
          regimeLens.trustworthy ? "source-bound" : "limited"
        }
        data-pass517-failover-strip={failoverRuntime.mode}
        data-pass518-provider-consensus={crossProviderDiff.source}
        data-pass524-route-truth-dock={providerRouteLedger.state}
        data-pass532-retry-history={retryTelemetry.events.length}
        data-pass588-evidence-manifest={`${analysisDepth}:${evidenceManifest.fieldBudget}`}
        data-pass589-source-freshness-scheduler={freshnessSchedule.mode}
        data-pass590-candle-continuity-ledger={primaryContinuity.state}
        data-pass591-chart-comparison-lens={chartComparisonLens.state}
      >
        <summary title={c.details} className="flex min-h-12 cursor-pointer list-none flex-col gap-2 px-4 py-3 outline-none transition hover:bg-white/[0.018] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200/[0.22] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.13em] text-cyan-100/[0.66]">
              {c.evidence} · {analysisDepth} · {evidenceManifest.fieldBudget} {c.fields}
            </span>
            <span
              className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] ${primaryContinuity.state === "healthy" ? "border-emerald-200/[0.16] text-emerald-100/[0.66]" : primaryContinuity.state === "blocked" ? "border-rose-200/[0.16] text-rose-100/[0.70]" : "border-amber-200/[0.16] text-amber-100/[0.66]"}`}
            >
              {c.continuity} {primaryContinuity.continuityScore}%
            </span>
            <span
              className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] ${chartComparisonLens.state === "ready" ? "border-emerald-200/[0.16] text-emerald-100/[0.66]" : chartComparisonLens.state === "blocked" ? "border-white/[0.10] text-white/[0.36]" : "border-amber-200/[0.16] text-amber-100/[0.66]"}`}
            >
              {c.comparison} {localizedStatus(safeLocale, chartComparisonLens.state)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[7px] uppercase tracking-[0.09em] text-white/[0.34]">
            <span>{evidenceManifest.confirmedCount} {c.confirmed}</span>
            <span>{evidenceManifest.limitedCount} {c.limited}</span>
            <span>{evidenceManifest.missingCount} {c.missing}</span>
            <span className="text-cyan-100/[0.52]">
              {c.refresh} {Math.max(1, Math.round(freshnessSchedule.delayMs / 1000))}s
            </span>
            <span className="text-white/[0.24] transition-transform duration-200 group-open:rotate-180" aria-hidden="true">⌄</span>
          </div>
        </summary>

        <div className="border-t border-white/[0.06] p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {evidenceManifest.fields.map((item) => (
              <div
                key={item.id}
                className="min-w-0 rounded-xl border border-white/[0.07] bg-black/[0.20] px-3 py-2.5"
                data-evidence-state={item.state}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.30]">
                    {item.label}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.state === "confirmed" ? "bg-emerald-300/[0.75]" : item.state === "limited" ? "bg-amber-300/[0.75]" : "bg-white/[0.18]"}`}
                    aria-hidden="true"
                  />
                </div>
                <strong className="mt-1.5 block break-words font-mono text-[10px] text-white/[0.70]">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[0.07] bg-black/[0.16] p-3">
              <span className="font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.30]">
                {c.route}
              </span>
              <strong className="mt-1.5 block text-[11px] text-white/[0.68]">
                {providerRuntime.sourceLabel} · {providerRouteLedger.confidenceCap}%
              </strong>
              <p className="mt-1 text-[9px] leading-4 text-white/[0.42]">
                <span className="text-white/[0.28]">{c.routeNext}: </span>
                {providerRouteNextAction}
              </p>
              <p className="mt-1 text-[8px] leading-4 text-white/[0.26]">
                {c.routeBoundary}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-black/[0.16] p-3">
              <span className="font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.30]">
                {c.continuity}
              </span>
              <strong className="mt-1.5 block text-[11px] text-white/[0.68]">
                {primaryContinuity.validCount}/{primaryContinuity.inputCount} · {localizedStatus(safeLocale, primaryContinuity.state)}
              </strong>
              <p className="mt-1 text-[9px] leading-4 text-white/[0.32]">
                {c.gaps} {primaryContinuity.gapCount} · {c.duplicates} {primaryContinuity.duplicateCount} · {c.cadenceShifts} {primaryContinuity.cadenceShiftCount}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-black/[0.16] p-3">
              <span className="font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.30]">
                {c.comparison}
              </span>
              <strong className="mt-1.5 block text-[11px] text-white/[0.68]">
                {chartComparisonLens.matchRate}% · {localizedStatus(safeLocale, chartComparisonLens.scaleMode)}
              </strong>
              <p className="mt-1 text-[9px] leading-4 text-white/[0.32]">
                {chartComparisonLens.boundary}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-black/[0.16] p-3">
              <span className="font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.30]">
                {c.refresh}
              </span>
              <strong className="mt-1.5 block text-[11px] text-white/[0.68]">
                {localizedStatus(safeLocale, freshnessSchedule.mode)}
              </strong>
              <p className="mt-1 text-[9px] leading-4 text-white/[0.32]">
                {freshnessSchedule.preserveConfirmedValues
                  ? freshnessSchedule.headline || c.preserved
                  : retryTelemetry.headline}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <p className="max-w-3xl text-[9px] leading-4 text-white/[0.30]">
              {chartComparisonLens.headline} · {consensusExplainability.visibleClaim}
            </p>
            <span
              className="rounded-full border border-white/[0.08] px-2.5 py-1.5 font-mono text-[7px] uppercase tracking-[0.09em] text-white/[0.36]"
              title={retryTelemetry.boundary}
            >
              {localizedStatus(safeLocale, retryTelemetry.state)} · {c.regimes[regimeLens.regime]} · {c.trends[regimeLens.trend]}
            </span>
          </div>
        </div>
        </details>
      ) : null}
      <svg
        data-modal-wheel-owner="true"
        data-chart-gesture-surface="pan-pinch-wheel"
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="h-auto w-full cursor-grab touch-none active:cursor-grabbing"
        style={{
          touchAction: pass586MobileChartGesturePolicy.touchAction,
          overscrollBehavior:
            pass586MobileChartGesturePolicy.overscrollBehavior,
        }}
        role="img"
        aria-label={c.chart}
        onMouseMove={onMove}
        onMouseLeave={() => setHovered(null)}
        onPointerDown={beginPointer}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        onDoubleClick={resetView}
        onContextMenu={(event) => event.preventDefault()}
      >
        <defs>
          <filter id="market-chart-glow">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#06090a" />
        {[0, 1, 2, 3, 4].map((line) => {
          const lineY = TOP + ((PRICE_BOTTOM - TOP) / 4) * line;
          const value = model.high - ((model.high - model.low) / 4) * line;
          return (
            <g key={line}>
              <line
                x1={LEFT}
                x2={SVG_WIDTH - RIGHT}
                y1={lineY}
                y2={lineY}
                stroke="rgba(255,255,255,.065)"
                strokeDasharray="4 7"
              />
              <text
                x={SVG_WIDTH - RIGHT + 12}
                y={lineY + 4}
                fill="rgba(255,255,255,.34)"
                fontSize="11"
                fontFamily="monospace"
              >
                {price(value, safeLocale)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: 8 }, (_, index) => {
          const x = LEFT + ((SVG_WIDTH - LEFT - RIGHT) / 8) * index;
          return (
            <line
              key={x}
              x1={x}
              x2={x}
              y1={TOP}
              y2={VOLUME_BOTTOM}
              stroke="rgba(255,255,255,.035)"
            />
          );
        })}
        <path
          d={model.movingPath}
          fill="none"
          stroke="rgba(200,169,106,.65)"
          strokeWidth="1.5"
        />
        {showSecondaryOverlay && secondaryOverlayModel ? (
          <g
            data-pass531-overlay-scale={secondaryOverlay.scaleMode}
            aria-label={`${c.overlay}: ${secondaryOverlay.sourceLabel || "secondary"}`}
          >
            <path
              d={secondaryOverlayModel.path}
              fill="none"
              stroke="rgba(98,217,255,.86)"
              strokeWidth="2"
              strokeDasharray="7 5"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={LEFT + 8}
              y={TOP + 16}
              fill="rgba(160,235,255,.72)"
              fontSize="9"
              fontFamily="monospace"
            >{`${secondaryOverlay.sourceLabel || "SECONDARY"} · ${secondaryOverlay.selectedUnit} · ${secondaryOverlay.matchRate}%`}</text>
            <text
              x={SVG_WIDTH - RIGHT - 8}
              y={TOP + 15}
              textAnchor="end"
              fill="rgba(160,235,255,.46)"
              fontSize="8"
              fontFamily="monospace"
            >
              {secondaryOverlay.upperBound?.toFixed(
                secondaryOverlay.scaleMode === "normalized_index" ? 2 : 4,
              )}
            </text>
            <text
              x={SVG_WIDTH - RIGHT - 8}
              y={PRICE_BOTTOM - 6}
              textAnchor="end"
              fill="rgba(160,235,255,.46)"
              fontSize="8"
              fontFamily="monospace"
            >
              {secondaryOverlay.lowerBound?.toFixed(
                secondaryOverlay.scaleMode === "normalized_index" ? 2 : 4,
              )}
            </text>
          </g>
        ) : null}
        {visible.map((candle, index) => {
          const x = LEFT + index * model.step + model.step / 2;
          const rising = candle.close >= candle.open;
          const color = rising ? "#25dbb1" : "#ff4e78";
          const bodyTop = model.y(Math.max(candle.open, candle.close));
          const bodyBottom = model.y(Math.min(candle.open, candle.close));
          const volumeHeight =
            ((candle.volume || 0) / model.maxVolume) *
            (VOLUME_BOTTOM - VOLUME_TOP);
          return (
            <g
              key={`${candle.timestamp}-${index}`}
              opacity={hovered === null || hovered === index ? 1 : 0.72}
            >
              <line
                x1={x}
                x2={x}
                y1={model.y(candle.high)}
                y2={model.y(candle.low)}
                stroke={color}
                strokeWidth="1"
              />
              <rect
                x={x - Math.max(1.5, model.step * 0.3)}
                y={bodyTop}
                width={Math.max(2.6, model.step * 0.6)}
                height={Math.max(1.8, bodyBottom - bodyTop)}
                fill={rising ? color : "#090c0d"}
                stroke={color}
                strokeWidth="1"
                rx=".8"
              />
              <rect
                x={x - Math.max(1.5, model.step * 0.3)}
                y={VOLUME_BOTTOM - volumeHeight}
                width={Math.max(2.6, model.step * 0.6)}
                height={volumeHeight}
                fill={rising ? "rgba(37,219,177,.34)" : "rgba(255,78,120,.34)"}
              />
            </g>
          );
        })}
        <line
          x1={LEFT}
          x2={SVG_WIDTH - RIGHT}
          y1={selectedY}
          y2={selectedY}
          stroke="rgba(104,221,255,.35)"
          strokeDasharray="3 5"
        />
        <line
          x1={selectedX}
          x2={selectedX}
          y1={TOP}
          y2={VOLUME_BOTTOM}
          stroke="rgba(104,221,255,.42)"
          strokeDasharray="3 5"
        />
        <g aria-hidden="true">
          <rect
            x={SVG_WIDTH - RIGHT + 5}
            y={selectedY - 10}
            width="66"
            height="20"
            rx="5"
            fill="rgba(6,9,10,.96)"
            stroke="rgba(104,221,255,.42)"
          />
          <text
            x={SVG_WIDTH - RIGHT + 38}
            y={selectedY + 4}
            textAnchor="middle"
            fill="rgba(180,242,255,.92)"
            fontSize="10"
            fontFamily="monospace"
          >
            {price(selected.close, safeLocale)}
          </text>
          <rect
            x={Math.max(LEFT, Math.min(selectedX - 48, SVG_WIDTH - RIGHT - 96))}
            y={VOLUME_BOTTOM + 4}
            width="96"
            height="18"
            rx="5"
            fill="rgba(6,9,10,.96)"
            stroke="rgba(104,221,255,.26)"
          />
          <text
            x={Math.max(LEFT + 48, Math.min(selectedX, SVG_WIDTH - RIGHT - 48))}
            y={VOLUME_BOTTOM + 17}
            textAnchor="middle"
            fill="rgba(255,255,255,.54)"
            fontSize="9"
            fontFamily="monospace"
          >
            {new Date(selected.timestamp * 1000).toLocaleDateString(safeLocale)}
          </text>
        </g>
        {showSecondaryOverlay &&
        secondaryOverlayModel &&
        selectedOverlayPoint ? (
          <g aria-hidden="true">
            <circle
              cx={selectedX}
              cy={secondaryOverlayModel.y(selectedOverlayPoint.plotValue)}
              r="4"
              fill="#62d9ff"
              stroke="#061014"
              strokeWidth="1.5"
            />
            <text
              x={Math.min(selectedX + 8, SVG_WIDTH - RIGHT - 76)}
              y={Math.max(
                TOP + 28,
                secondaryOverlayModel.y(selectedOverlayPoint.plotValue) - 8,
              )}
              fill="rgba(160,235,255,.80)"
              fontSize="8"
              fontFamily="monospace"
            >
              {selectedOverlayPoint.secondaryClose.toFixed(
                Math.abs(selectedOverlayPoint.secondaryClose) < 1 ? 6 : 2,
              )}
            </text>
          </g>
        ) : null}
        <circle
          cx={selectedX}
          cy={selectedY}
          r="3.5"
          fill="#b4f2ff"
          filter="url(#market-chart-glow)"
        />
        <text
          x={LEFT}
          y={507}
          fill="rgba(255,255,255,.28)"
          fontSize="10"
          fontFamily="monospace"
        >
          {c.controls.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
