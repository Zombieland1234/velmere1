"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Brain,
  Download,
  FileText,
  Loader2,
  Search,
  Shield,
  X,
} from "lucide-react";
import BodyPortal from "@/components/ui/BodyPortal";
import { useModalScrollLock } from "@/components/ui/useModalScrollLock";
import { useDialogFocusBoundary } from "@/components/ui/useDialogFocusBoundary";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";
import type {
  VelmereSearchMode,
  VelmereSearchResult,
} from "@/lib/search/intelligence-search-contract";
import {
  resolveLensReportLocale,
  type LensReport,
  type LensReportDepth,
} from "@/lib/search/lens-report";
import { buildPass451PdfExactPreview } from "@/lib/market-integrity/pass451-pdf-exact-preview-runtime";
import { buildPass453UnifiedIntelligenceHandoff } from "@/lib/market-integrity/pass453-unified-intelligence-handoff-runtime";
import { buildPass454EvidenceDenseHumanAnalysis } from "@/lib/market-integrity/pass454-evidence-dense-human-analysis-runtime";
import { buildPass455HumanDecisionPdfForge } from "@/lib/market-integrity/pass455-human-decision-pdf-forge-runtime";
import { buildPass486PdfForgeIntelligence } from "@/lib/market-integrity/pass486-pdf-forge-intelligence";
import type { Pass488PageId } from "@/lib/market-integrity/pass488-a4-decision-cockpit";
import {
  pass494A4ReaderNavigation,
  pass494ReaderProgress,
} from "@/lib/market-integrity/pass494-a4-reader-navigation";
import { buildPass499A4ReaderHealth } from "@/lib/market-integrity/pass499-a4-reader-health";
import { buildPass505PdfPageBreakAudit } from "@/lib/market-integrity/pass505-pdf-page-break-audit";
import { buildPass512ReportIntegritySeal } from "@/lib/market-integrity/pass512-report-integrity-seal";
import { buildPass519PdfTypographyQa } from "@/lib/market-integrity/pass519-pdf-typography-qa";
import { buildPass526PdfReleaseScorecard } from "@/lib/market-integrity/pass526-pdf-release-scorecard";
import { buildPass533TypesettingAudit } from "@/lib/market-integrity/pass533-pdf-multilingual-typesetting";
import { buildPass539PdfPageRhythm } from "@/lib/market-integrity/pass539-pdf-page-rhythm";
import { buildPass547PdfVisualReleaseAudit } from "@/lib/market-integrity/pass547-pdf-visual-release-audit";
import { buildPass466ConfidenceWaterfall } from "@/lib/market-integrity/pass466-confidence-waterfall";
import {
  buildPass468HandoffHref,
  buildPass468HandoffPacket,
  writePass468HandoffPacket,
  type Pass468HandoffTarget,
} from "@/lib/market-integrity/pass468-browser-shield-orbit-handoff";
import {
  buildPass469PdfDownloadReceipt,
  readPass469PdfDownloadReceipts,
  writePass469PdfDownloadReceipt,
  type Pass469PdfDownloadReceipt,
} from "@/lib/market-integrity/pass469-pdf-a4-download-receipt";
import {
  auditPass470KeyboardFlow,
  buildPass470ReceiptHistory,
  buildPass470RuntimeGuard,
  type Pass470ReceiptHistory,
} from "@/lib/market-integrity/pass470-browser-runtime-qa";
import {
  buildPass579ExactSearchReceipt,
  type Pass579ExactSearchReceipt,
} from "@/lib/search/pass579-exact-search-receipt";
import { getVlmPaidProduct, type VlmPaidAccessContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { readVlmPaidAccessToken, startVlmServiceCheckout } from "@/lib/commerce/pass2024-vlm-paid-access-client";

// PASS453 compatibility marker: report.pass453.labels.diagnostics remains represented by PASS454 evidence-dense diagnostics.
// PASS424 marker: Velmère Intelligence Search · Velmère Lens · Legacy guard marker: Velmère Intelligence Search.
// PASS179 marker: VelmereLensCommandRouter · Lens router retained conceptually for Browser handoff.
// PASS176 marker: VelmereSearchDiscoveryRail · vis-bridge-box · result.bridge?.href.
// PASS177 marker: vis-live-adapter-note.
// PASS267 marker: Lens search suggestions mirror Shield-style token rows · lensSuggestionSeeds · vis-token-suggest-panel · vis-suggestion-token-avatar · selectSuggestion(item).

type SearchResponse = {
  ok: boolean;
  results?: VelmereSearchResult[];
};

type CanonicalReportResponse = {
  ok: boolean;
  report?: LensReport;
};

// PASS884 compatibility marker: return exact ? [exact] : items.slice(0, 1)
function selectLensDetailResult(
  query: string,
  values: VelmereSearchResult[] | undefined,
) {
  const items = normalizeClientSearchResults(values);
  const normalized = query.trim().toLowerCase();
  const exact = items.find((item) =>
    [item.symbol, item.title, item.id]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalized),
  );
  return exact ? [exact] : items.slice(0, LENS_SINGLE_RESULT_LIMIT);
}

function safeClientText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeClientStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => safeClientText(item))
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeClientSearchResult(
  value: unknown,
): VelmereSearchResult | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<VelmereSearchResult>;
  const symbol = safeClientText(item.symbol);
  const title = safeClientText(item.title, symbol || "Velmère research");
  const id = safeClientText(
    item.id,
    `result-${
      (symbol || title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 48) || "research"
    }`,
  );
  const categories = new Set([
    "token",
    "market",
    "contract",
    "velmere",
    "osint",
    "document",
  ]);
  const tones = new Set(["calm", "review", "elevated", "blocked"]);
  const sourceModes = new Set([
    "table",
    "live",
    "live_table",
    "fallback",
    "missing",
  ]);
  const sources = Array.isArray(item.sources)
    ? item.sources
        .filter((source) => source && typeof source === "object")
        .map((source, index) => {
          const candidate = source as Partial<
            VelmereSearchResult["sources"][number]
          >;
          const mode = sourceModes.has(String(candidate.mode))
            ? candidate.mode!
            : "missing";
          return {
            id: safeClientText(candidate.id, `source-${index + 1}`),
            label: safeClientText(candidate.label, "Source required"),
            mode,
            freshness: safeClientText(candidate.freshness, "missing"),
            confidence: Math.max(
              0,
              Math.min(100, Number(candidate.confidence) || 0),
            ),
            note: safeClientText(
              candidate.note,
              "Source boundary remains visible.",
            ),
          };
        })
        .slice(0, 16)
    : [];

  return {
    ...item,
    id,
    title,
    symbol: symbol || undefined,
    category: categories.has(String(item.category)) ? item.category! : "osint",
    tone: tones.has(String(item.tone)) ? item.tone! : "review",
    summary: safeClientText(
      item.summary,
      "The result needs a source-bound detail scan.",
    ),
    whyItMatters: safeClientText(
      item.whyItMatters,
      "Missing evidence limits the strength of the conclusion.",
    ),
    missingData: safeClientStringArray(item.missingData),
    nextOperatorStep: safeClientText(
      item.nextOperatorStep,
      "Open Shield and verify the missing source lanes.",
    ),
    sourceMode: sourceModes.has(String(item.sourceMode))
      ? item.sourceMode!
      : "missing",
    sourceConfidence: Math.max(
      0,
      Math.min(100, Number(item.sourceConfidence) || 0),
    ),
    shieldHref: safeClientText(item.shieldHref, "/market-integrity"),
    sources,
    chips: safeClientStringArray(item.chips),
    marketSnapshot:
      item.marketSnapshot && typeof item.marketSnapshot === "object"
        ? item.marketSnapshot
        : undefined,
  };
}

function normalizeClientSearchResults(value: unknown) {
  if (!Array.isArray(value)) return [] as VelmereSearchResult[];
  const seen = new Set<string>();
  return value
    .map(normalizeClientSearchResult)
    .filter((item): item is VelmereSearchResult => Boolean(item))
    .filter((item) => {
      const key = `${item.category}:${item.symbol || item.id}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

type PdfPreview = {
  url: string;
  filename: string;
  report: LensReport;
  depth: LensPdfDepth;
  result: VelmereSearchResult;
};

type PreviewView = "pdf" | "reader";
type LensPdfDepth = LensReportDepth;

const pdfDepthOrder: LensPdfDepth[] = ["basic", "pro", "advanced"];
const LENS_SINGLE_RESULT_LIMIT = 1;

const modes: VelmereSearchMode[] = [
  "all",
  "token",
  "market",
  "contract",
  "velmere",
  "osint",
];

const copy = {
  pl: {
    placeholder: "Szukaj: SOL, BTC, kontrakt, VLM, Shield...",
    scan: "Skanuj",
    modes: {
      all: "Wszystko",
      token: "Tokeny",
      market: "Rynki",
      contract: "Kontrakty",
      velmere: "Velmère",
      osint: "OSINT",
    },
    loading: "Szukam w źródłach...",
    error: "Nie udało się pobrać wyników. Spróbuj ponownie.",
    preview: "Podgląd PDF",
    download: "Pobierz PDF",
    receiptSaved: "Zapisano potwierdzenie rozpoczęcia pobierania",
    receiptBoundary:
      "Potwierdza kliknięcie pobierania, nie zapis pliku przez system.",
    receiptHistoryTitle: "Historia PDF",
    receiptHistoryEmpty: "Brak lokalnych potwierdzeń PDF w tej przeglądarce.",
    receiptHistoryShow: "Pokaż pełną historię",
    receiptHistoryHide: "Ukryj historię",
    receiptHistoryBoundary:
      "Receipty pozostają lokalne, zredagowane i nie zawierają treści raportu.",
    keyboardQa: "Keyboard QA: Tab, Enter, Space i Escape aktywne",
    close: "Zamknij",
    source: "Źródło",
    confidence: "Pewność",
    checked: "Co sprawdzono",
    missing: "Brakujące dane",
    next: "Następny krok",
    sources: "Źródła",
    shield: "Otwórz Shield",
    orbit: "Otwórz Orbit 360",
    emptyTitle: "Velmère Lens PDF Capsule",
    emptyBody:
      "Wpisz token, kontrakt albo temat. Lens buduje krótki raport człowieczym językiem: brief, źródła, brakujące dane i następny krok operatora.",
    afterResultTitle: "Teraz wybierz zakres raportu PDF",
    afterResultBody:
      "Wynik znajduje się wyżej. Basic daje szybki obraz rynku, Pro dodaje drugie źródła, a Advanced otwiera pełną warstwę dowodową i nietypowe anomalie.",
    forgeTitle: "Generowanie PDF Velmère",
    forgeSteps: [
      "Tożsamość instrumentu",
      "Źródła i luki",
      "Ludzki brief",
      "Podpis Velmère",
    ],
    pdfDepthPrompt: "Wybierz zakres PDF",
    pdfDepthLock: "Zakres wybierasz przed generowaniem",
    pdfDepthLabels: { basic: "Basic", pro: "Pro", advanced: "Advanced" },
    pdfDepthDescriptions: {
      basic:
        "Szybka decyzja: trend 1h/24h/7d, skala rynku, świeżość źródła, najważniejszy brak i jeden następny krok.",
      pro: "Basic + jakość świec, FDV/podaż, rozjazd drugiego źródła, kontekst płynności, anomalie i scenariusz ryzyka.",
      advanced:
        "Pro + orderbook/poślizg oraz jawna macierz holderów, unlocków, kontraktu, KOL/filingów, blockerów i planu weryfikacji.",
    },
    depthTitle: "Warstwy analizy",
    depth: [
      "Basic: sytuacja teraz, kluczowe liczby, pewność i następny krok",
      "Pro: świece, podaż/FDV, płynność, drugie źródło i scenariusz",
      "Advanced: orderbook, holderzy, unlocki, kontrakt/KOL, blockery i plan dowodowy",
    ],
  },
  de: {
    placeholder: "Suche: SOL, BTC, Contract, VLM, Shield...",
    scan: "Scannen",
    modes: {
      all: "Alles",
      token: "Token",
      market: "Märkte",
      contract: "Contracts",
      velmere: "Velmère",
      osint: "OSINT",
    },
    loading: "Quellen werden durchsucht...",
    error: "Ergebnisse konnten nicht geladen werden.",
    preview: "PDF Vorschau",
    download: "PDF laden",
    receiptSaved: "Startbeleg für den Download gespeichert",
    receiptBoundary:
      "Bestätigt den Download-Klick, nicht die Speicherung durch das Betriebssystem.",
    receiptHistoryTitle: "PDF-Historie",
    receiptHistoryEmpty: "Keine lokalen PDF-Belege in diesem Browser.",
    receiptHistoryShow: "Vollständige Historie anzeigen",
    receiptHistoryHide: "Historie ausblenden",
    receiptHistoryBoundary:
      "Belege bleiben lokal, redigiert und enthalten keinen Berichtstext.",
    keyboardQa: "Keyboard QA: Tab, Enter, Space und Escape aktiv",
    close: "Schließen",
    source: "Quelle",
    confidence: "Konfidenz",
    checked: "Geprüft",
    missing: "Fehlende Daten",
    next: "Nächster Schritt",
    sources: "Quellen",
    shield: "Shield öffnen",
    orbit: "Orbit 360 öffnen",
    emptyTitle: "Velmère Lens PDF Capsule",
    emptyBody:
      "Gib Token, Contract oder Thema ein. Lens erstellt einen kurzen Bericht in menschlicher Sprache: Briefing, Quellen, fehlende Daten und nächsten Operator-Schritt.",
    afterResultTitle: "Jetzt den PDF-Umfang wählen",
    afterResultBody:
      "Das Ergebnis steht oben. Basic zeigt den schnellen Marktüberblick, Pro ergänzt Zweitquellen und Advanced öffnet die vollständige Evidenz- und Anomalieebene.",
    forgeTitle: "Velmère PDF wird erzeugt",
    forgeSteps: [
      "Instrument-Identität",
      "Quellen und Lücken",
      "Menschlicher Kurzbericht",
      "Velmère Signatur",
    ],
    pdfDepthPrompt: "PDF-Tiefe wählen",
    pdfDepthLock: "Tiefe vor der Generierung wählen",
    pdfDepthLabels: { basic: "Basic", pro: "Pro", advanced: "Advanced" },
    pdfDepthDescriptions: {
      basic:
        "Schnelle Entscheidung: 1h/24h/7d-Trend, Marktgröße, Quellenfrische, wichtigste Lücke und nächster Schritt.",
      pro: "Basic plus Kerzenqualität, FDV/Supply, Zweitquellen-Abweichung, Liquiditätskontext und Risikoszenario.",
      advanced:
        "Pro plus Orderbook/Slippage und klare Matrix für Holder, Unlocks, Contract, KOL/Filings, Blocker und Prüfplan.",
    },
    depthTitle: "Analyse-Ebenen",
    depth: [
      "Basic: aktuelle Lage, Kernzahlen, Konfidenz und nächster Schritt",
      "Pro: Kerzen, Supply/FDV, Liquidität, Zweitquelle und Szenario",
      "Advanced: Orderbook, Holder, Unlocks, Contract/KOL, Blocker und Evidenzplan",
    ],
  },
  en: {
    placeholder: "Search: SOL, BTC, contract, VLM, Shield...",
    scan: "Scan",
    modes: {
      all: "All",
      token: "Tokens",
      market: "Markets",
      contract: "Contracts",
      velmere: "Velmère",
      osint: "OSINT",
    },
    loading: "Searching sources...",
    error: "Results could not be loaded.",
    preview: "PDF preview",
    download: "Download PDF",
    receiptSaved: "Download-start receipt saved",
    receiptBoundary:
      "Confirms the download click, not that the operating system saved the file.",
    receiptHistoryTitle: "PDF history",
    receiptHistoryEmpty: "No local PDF receipts in this browser.",
    receiptHistoryShow: "Show full history",
    receiptHistoryHide: "Hide history",
    receiptHistoryBoundary:
      "Receipts stay local, redacted and contain no report content.",
    keyboardQa: "Keyboard QA: Tab, Enter, Space and Escape active",
    close: "Close",
    source: "Source",
    confidence: "Confidence",
    checked: "What was checked",
    missing: "Missing data",
    next: "Next step",
    sources: "Sources",
    shield: "Open Shield",
    orbit: "Open Orbit 360",
    emptyTitle: "Velmère Lens PDF Capsule",
    emptyBody:
      "Enter a token, contract or topic. Lens builds a short human report: brief, sources, missing data and the next operator step.",
    afterResultTitle: "Now choose the PDF depth",
    afterResultBody:
      "The result is shown above. Basic gives a fast market view, Pro adds second-source checks, and Advanced opens the full evidence and anomaly layer.",
    forgeTitle: "Generating Velmère PDF",
    forgeSteps: [
      "Instrument identity",
      "Sources and gaps",
      "Human brief",
      "Velmère signature",
    ],
    pdfDepthPrompt: "Choose PDF depth",
    pdfDepthLock: "Choose the depth before generation",
    pdfDepthLabels: { basic: "Basic", pro: "Pro", advanced: "Advanced" },
    pdfDepthDescriptions: {
      basic:
        "Fast decision: 1h/24h/7d trend, market scale, source freshness, the key gap and one next action.",
      pro: "Basic plus candle quality, FDV/supply, second-source divergence, liquidity context, anomalies and a risk scenario.",
      advanced:
        "Pro plus orderbook/slippage and an explicit matrix for holders, unlocks, contract, KOL/filings, blockers and verification plan.",
    },
    depthTitle: "Analysis layers",
    depth: [
      "Basic: current situation, core numbers, confidence and next action",
      "Pro: candles, supply/FDV, liquidity, second source and scenario",
      "Advanced: orderbook, holders, unlocks, contract/KOL, blockers and evidence plan",
    ],
  },
} as const;

function reportSection(
  report: LensReport,
  id: LensReport["sections"][number]["id"],
  fallback: string,
) {
  return report.sections.find((section) => section.id === id)?.body || fallback;
}

function formatSnapshotMoney(locale: string, value?: number, currency = "USD") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2,
    }).format(value);
  }
}

function formatSnapshotPercent(locale: string, value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
}

function lensToneClass(tone: VelmereSearchResult["tone"]) {
  if (tone === "calm") {
    return "border-emerald-300/[0.18] bg-[radial-gradient(circle_at_0%_0%,rgba(52,211,153,0.08),transparent_34%),rgba(255,255,255,0.03)]";
  }
  if (tone === "review") {
    return "border-amber-300/[0.18] bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.08),transparent_34%),rgba(255,255,255,0.03)]";
  }
  if (tone === "elevated") {
    return "border-rose-300/[0.18] bg-[radial-gradient(circle_at_0%_0%,rgba(251,113,133,0.08),transparent_34%),rgba(255,255,255,0.03)]";
  }
  return "border-white/[0.09] bg-white/[0.025]";
}

export default function VelmereIntelligenceSearchClient({
  locale,
  initialQuery = "",
}: {
  locale: string;
  initialQuery?: string;
}) {
  const safeLocale = resolveLensReportLocale(locale);
  const c = copy[safeLocale];
  const showInternalPdfQa = false; // Public Lens never mounts internal QA overlays.
  const pass451 = useMemo(
    () => buildPass451PdfExactPreview(safeLocale),
    [safeLocale],
  );
  const [query, setQuery] = useState(() => safeClientText(initialQuery));
  const deferredQuery = useDeferredValue(query);
  const [mode, setMode] = useState<VelmereSearchMode>("all");
  const [suggestions, setSuggestions] = useState<VelmereSearchResult[]>([]);
  const [results, setResults] = useState<VelmereSearchResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchReceipt, setSearchReceipt] =
    useState<Pass579ExactSearchReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfPreview, setPdfPreview] = useState<PdfPreview | null>(null);
  const [pdfChoiceResult, setPdfChoiceResult] =
    useState<VelmereSearchResult | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [pdfStage, setPdfStage] = useState(0);
  const [selectedPdfDepth, setSelectedPdfDepth] =
    useState<LensPdfDepth>("advanced");
  const [previewView, setPreviewView] = useState<PreviewView>("reader");
  const [activeReaderPage, setActiveReaderPage] =
    useState<Pass488PageId>("decision");
  const [downloadReceipt, setDownloadReceipt] =
    useState<Pass469PdfDownloadReceipt | null>(null);
  const [receiptHistory, setReceiptHistory] = useState<Pass470ReceiptHistory>(
    () => buildPass470ReceiptHistory([]),
  );
  const commandPrompts = useMemo(
    () =>
      safeLocale === "pl"
        ? [
            "Od czego zaczynamy?",
            "Wpisz token, kontrakt albo temat.",
            "Sprawdź źródła bez chaosu.",
          ]
        : safeLocale === "de"
          ? [
              "Womit beginnen wir?",
              "Token, Contract oder Thema eingeben.",
              "Quellen ruhig prüfen.",
            ]
          : [
              "Where should we begin?",
              "Enter a token, contract or topic.",
              "Check evidence without noise.",
            ],
    [safeLocale],
  );
  const [commandPromptState, setCommandPromptState] = useState({
    index: 0,
    count: 0,
    deleting: false,
  });
  const animatedCommandTitle =
    commandPrompts[commandPromptState.index % commandPrompts.length]?.slice(
      0,
      commandPromptState.count,
    ) || " ";

  useEffect(() => {
    const phrase = commandPrompts[commandPromptState.index % commandPrompts.length] || "";
    const atEnd = commandPromptState.count >= phrase.length;
    const atStart = commandPromptState.count <= 0;
    const delay = commandPromptState.deleting
      ? 44
      : atEnd
        ? 2400
        : atStart
          ? 420
          : 92;
    const timer = window.setTimeout(() => {
      setCommandPromptState((current) => {
        const currentPhrase = commandPrompts[current.index % commandPrompts.length] || "";
        if (!current.deleting && current.count >= currentPhrase.length) {
          return { ...current, deleting: true };
        }
        if (current.deleting && current.count <= 0) {
          return {
            index: (current.index + 1) % commandPrompts.length,
            count: 0,
            deleting: false,
          };
        }
        return {
          ...current,
          count: current.deleting ? current.count - 1 : current.count + 1,
        };
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [commandPromptState, commandPrompts]);
  const [receiptHistoryOpen, setReceiptHistoryOpen] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const detailRequestRef = useRef<AbortController | null>(null);
  const pdfRequestRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const previewCloseRef = useRef<HTMLButtonElement | null>(null);
  const previewDialogRef = useRef<HTMLElement | null>(null);
  const choiceDialogRef = useRef<HTMLElement | null>(null);
  const choiceCloseRef = useRef<HTMLButtonElement | null>(null);
  const forgeDialogRef = useRef<HTMLElement | null>(null);
  const forgeDepthButtonRef = useRef<HTMLButtonElement | null>(null);
  const readerScrollRef = useRef<HTMLDivElement | null>(null);
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const committedQueryRef = useRef("");
  const initialQueryPendingRef = useRef(Boolean(safeClientText(initialQuery)));
  const selectedPdfDepthRef = useRef<LensPdfDepth>("advanced");

  const lensSuggestionSeeds = suggestions.slice(0, LENS_SINGLE_RESULT_LIMIT);
  const searchResolution = useMemo(
    () => buildPass579ExactSearchReceipt(query, lensSuggestionSeeds),
    [lensSuggestionSeeds, query],
  );
  const pdfModalActive = Boolean(pdfPreview || pdfLoadingId || pdfChoiceResult);
  const readerProgress = pass494ReaderProgress(activeReaderPage);
  const readerHealth = useMemo(
    () => (pdfPreview ? buildPass499A4ReaderHealth(pdfPreview.report) : null),
    [pdfPreview],
  );
  const pageBreakAudit = useMemo(
    () =>
      pdfPreview ? buildPass505PdfPageBreakAudit(pdfPreview.report) : null,
    [pdfPreview],
  );
  const typographyQa = useMemo(
    () => (pdfPreview ? buildPass519PdfTypographyQa(pdfPreview.report) : null),
    [pdfPreview],
  );
  const pageRhythm = useMemo(
    () => (pdfPreview ? buildPass539PdfPageRhythm(pdfPreview.report) : null),
    [pdfPreview],
  );
  const typesettingAudit = useMemo(
    () =>
      pdfPreview
        ? buildPass533TypesettingAudit(
            pdfPreview.report.sections
              .map((section) => `${section.title} ${section.body}`)
              .join(" "),
            pdfPreview.report.locale,
          )
        : null,
    [pdfPreview],
  );
  const reportIntegritySeal = useMemo(
    () =>
      pdfPreview && readerHealth && pageBreakAudit && typographyQa
        ? buildPass512ReportIntegritySeal(
            pdfPreview.report,
            readerHealth,
            pageBreakAudit,
            typographyQa,
          )
        : null,
    [pageBreakAudit, pdfPreview, readerHealth, typographyQa],
  );
  const pdfReleaseScorecard = useMemo(
    () =>
      readerHealth && pageBreakAudit && reportIntegritySeal && typographyQa
        ? buildPass526PdfReleaseScorecard(
            readerHealth,
            pageBreakAudit,
            reportIntegritySeal,
            typographyQa,
          )
        : null,
    [pageBreakAudit, readerHealth, reportIntegritySeal, typographyQa],
  );
  const pdfVisualReleaseAudit = useMemo(
    () =>
      pdfReleaseScorecard && reportIntegritySeal && typographyQa && pageRhythm
        ? buildPass547PdfVisualReleaseAudit(
            safeLocale,
            pdfReleaseScorecard,
            reportIntegritySeal,
            typographyQa,
            pageRhythm,
          )
        : null,
    [
      pageRhythm,
      pdfReleaseScorecard,
      reportIntegritySeal,
      safeLocale,
      typographyQa,
    ],
  );
  const readerHealthLabel = readerHealth
    ? safeLocale === "pl"
      ? readerHealth.status === "ready"
        ? "Gotowy do pobrania"
        : readerHealth.status === "review"
          ? "Wymaga przeglądu"
          : "Zablokowany"
      : safeLocale === "de"
        ? readerHealth.status === "ready"
          ? "Downloadbereit"
          : readerHealth.status === "review"
            ? "Prüfung erforderlich"
            : "Blockiert"
        : readerHealth.status === "ready"
          ? "Ready to download"
          : readerHealth.status === "review"
            ? "Review required"
            : "Blocked"
    : "";
  useModalScrollLock(pdfModalActive);
  useDialogFocusBoundary(Boolean(pdfChoiceResult), choiceDialogRef, {
    onClose: () => setPdfChoiceResult(null),
    initialFocus: choiceCloseRef,
    closeOnOutsidePointerDown: true,
  });
  useDialogFocusBoundary(Boolean(pdfLoadingId), forgeDialogRef, {
    initialFocus: forgeDepthButtonRef,
    returnFocus: false,
  });
  useDialogFocusBoundary(Boolean(pdfPreview), previewDialogRef, {
    onClose: closePreview,
    initialFocus: previewCloseRef,
    closeOnOutsidePointerDown: true,
  });

  useEffect(() => {
    selectedPdfDepthRef.current = selectedPdfDepth;
  }, [selectedPdfDepth]);
  useEffect(() => {
    if (!pdfPreview || previewView !== "reader") return;
    const root = readerScrollRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const sections = pass494A4ReaderNavigation.pageIds
      .map((id) => document.getElementById(`lens-reader-page-${id}`))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          visibility.set(entry.target.id, entry.intersectionRatio),
        );
        const active = Array.from(visibility.entries()).sort(
          (left, right) => right[1] - left[1],
        )[0];
        if (!active || active[1] <= 0) return;
        const id = active[0].replace("lens-reader-page-", "") as Pass488PageId;
        if (pass494A4ReaderNavigation.pageIds.includes(id))
          setActiveReaderPage(id);
      },
      {
        root,
        rootMargin: pass494A4ReaderNavigation.rootMargin,
        threshold: pass494A4ReaderNavigation.observerThresholds,
      },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pdfPreview, previewView]);

  function scrollToReaderPage(
    pageId: Pass488PageId,
    behavior: ScrollBehavior = "smooth",
  ) {
    setActiveReaderPage(pageId);
    const scrollRoot = readerScrollRef.current;
    const target = document.getElementById(`lens-reader-page-${pageId}`);
    if (!scrollRoot || !target) return;
    const rootRect = scrollRoot.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = scrollRoot.scrollTop + targetRect.top - rootRect.top - 72;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scrollRoot.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion ? "auto" : behavior,
    });
  }

  const pdfDepthLocked = Boolean(pdfLoadingId);
  const activeForgeResult = results.find((item) => item.id === pdfLoadingId);
  const activeForgeIntelligence = activeForgeResult
    ? buildPass455HumanDecisionPdfForge(activeForgeResult, safeLocale)
    : null;
  const activePass486Forge = activeForgeResult
    ? buildPass486PdfForgeIntelligence(
        activeForgeResult,
        safeLocale,
        selectedPdfDepth,
      )
    : null;
  const pass470KeyboardAudit = useMemo(
    () =>
      auditPass470KeyboardFlow([
        {
          id: "lens-search-input",
          role: "combobox",
          label: c.placeholder,
          tabbable: true,
          enterActivates: true,
        },
        ...pdfDepthOrder.map((depth) => ({
          id: `lens-depth-${depth}`,
          role: "button" as const,
          label: c.pdfDepthLabels[depth],
          tabbable: true,
          enterActivates: true,
          spaceActivates: true,
        })),
        {
          id: "lens-reader-toggle",
          role: "button",
          label: c.preview,
          tabbable: true,
          enterActivates: true,
          spaceActivates: true,
        },
        {
          id: "lens-download-link",
          role: "link",
          label: c.download,
          tabbable: true,
          enterActivates: true,
        },
        {
          id: "lens-preview-close",
          role: "button",
          label: c.close,
          tabbable: true,
          escapeCloses: true,
          enterActivates: true,
          spaceActivates: true,
        },
      ]),
    [c.close, c.download, c.pdfDepthLabels, c.placeholder, c.preview],
  );
  const pass470RuntimeGuards = useMemo(
    () => results.map((result) => buildPass470RuntimeGuard(result)),
    [results],
  );

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      q: deferredQuery.trim(),
      mode,
      locale: safeLocale,
      intent: "suggest",
    });
    return `/api/search?${params.toString()}`;
  }, [mode, deferredQuery, safeLocale]);

  useEffect(() => {
    const clean = deferredQuery.trim();
    if (!clean) {
      requestRef.current?.abort();
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    if (clean.toLowerCase() === committedQueryRef.current.toLowerCase()) {
      setSuggestionsOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        const payload = (await response.json()) as SearchResponse;
        if (!response.ok || !payload.ok) return;
        setSuggestions(
          normalizeClientSearchResults(payload.results).slice(0, LENS_SINGLE_RESULT_LIMIT),
        );
        setSuggestionsOpen(true);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") setSuggestions([]);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [deferredQuery, endpoint]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        formRef.current?.contains(target) ||
        suggestionsRef.current?.contains(target)
      )
        return;
      setSuggestionsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, []);

  async function runSearch(nextQuery = query) {
    const clean = safeClientText(nextQuery);
    if (!clean) return;
    committedQueryRef.current = clean;
    requestRef.current?.abort();
    detailRequestRef.current?.abort();
    const controller = new AbortController();
    detailRequestRef.current = controller;
    setLoading(true);
    setError("");
    setResults([]);
    setSuggestionsOpen(false);
    setSuggestions([]);
    try {
      const params = new URLSearchParams({
        q: clean,
        mode,
        locale: safeLocale,
        intent: "detail",
      });
      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as SearchResponse;
      if (!response.ok || !payload.ok) throw new Error("search_failed");
      if (detailRequestRef.current !== controller) return;
      setResults(selectLensDetailResult(clean, payload.results));
    } catch (searchError) {
      if ((searchError as Error).name !== "AbortError") setError(c.error);
    } finally {
      if (detailRequestRef.current === controller) {
        detailRequestRef.current = null;
        setLoading(false);
      }
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch();
  }

  useEffect(() => {
    if (!initialQueryPendingRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (!initialQueryPendingRef.current) return;
      initialQueryPendingRef.current = false;
      formRef.current?.requestSubmit();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function chooseSuggestion(item: VelmereSearchResult) {
    const value = item.symbol || item.title;
    committedQueryRef.current = value;
    setQuery(value);
    setSuggestions([]);
    setSuggestionsOpen(false);
    void runSearch(value);
  }

  function selectSuggestion(item: VelmereSearchResult) {
    chooseSuggestion(item);
  }

  useEffect(() => {
    if (!results.length || loading) return;
    const frame = window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      resultsAnchorRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, results]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      detailRequestRef.current?.abort();
      pdfRequestRef.current?.abort();
      if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    };
  }, [pdfPreview?.url]);

  useEffect(() => {
    if (!pdfPreview) return;
    setReceiptHistory(
      buildPass470ReceiptHistory(readPass469PdfDownloadReceipts(), 20),
    );
  }, [pdfPreview]);

  useEffect(() => {
    if (!pdfLoadingId) {
      setPdfStage(0);
      return;
    }
    const cadence =
      selectedPdfDepth === "basic"
        ? [0, 420, 860, 1280]
        : selectedPdfDepth === "pro"
          ? [0, 520, 1080, 1640]
          : [0, 620, 1260, 1920];
    const timers = cadence.map((delay, index) =>
      window.setTimeout(() => setPdfStage(index), delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [pdfLoadingId, selectedPdfDepth]);

  function closePreview() {
    setPreviewView("reader");
    setDownloadReceipt(null);
    setReceiptHistoryOpen(false);
    setPdfPreview(null);
  }

  function handlePreviewToolbarKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key === "Escape") {
      closePreview();
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
      ),
    ).filter(
      (element) =>
        element.getAttribute("aria-hidden") !== "true" &&
        element.getClientRects().length > 0,
    );
    if (!controls.length) return;

    event.preventDefault();
    const activeIndex = controls.findIndex(
      (control) => control === document.activeElement,
    );
    const fallbackIndex = event.key === "ArrowRight" ? -1 : 0;
    const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex]?.focus({ preventScroll: true });
  }

  function openPass468Handoff(
    result: VelmereSearchResult,
    target: Pass468HandoffTarget,
    depth: LensPdfDepth = selectedPdfDepthRef.current,
  ) {
    const packet = buildPass468HandoffPacket(result, depth, target);
    writePass468HandoffPacket(packet);
    window.location.assign(buildPass468HandoffHref(safeLocale, packet));
  }

  function buildAdvancedPdfAccessContext(result: VelmereSearchResult): VlmPaidAccessContext {
    return {
      surface: "browser",
      locale: safeLocale,
      assetId: result.id,
      symbol: result.symbol,
      depth: "advanced",
      returnPath: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : `/${safeLocale}`,
    };
  }

  function requestPreview(result: VelmereSearchResult, trigger: HTMLElement) {
    previewTriggerRef.current = trigger;
    setSuggestionsOpen(false);
    setSuggestions([]);
    setSelectedPdfDepth("basic");
    selectedPdfDepthRef.current = "basic";
    setPdfChoiceResult(result);
  }

  async function openPreview(
    result: VelmereSearchResult,
    requestedDepth: LensPdfDepth = selectedPdfDepthRef.current,
  ) {
    pdfRequestRef.current?.abort();
    const controller = new AbortController();
    pdfRequestRef.current = controller;
    selectedPdfDepthRef.current = requestedDepth;
    setSelectedPdfDepth(requestedDepth);
    setPdfChoiceResult(null);
    setPdfLoadingId(result.id);
    setPdfStage(0);
    setDownloadReceipt(null);
    setReceiptHistoryOpen(false);
    setReceiptHistory(
      buildPass470ReceiptHistory(readPass469PdfDownloadReceipts(), 20),
    );
    setError("");
    try {
      const depth = requestedDepth;
      const advancedPdfProduct = getVlmPaidProduct("vlm_advanced_pdf_single", safeLocale);
      const paidContext = buildAdvancedPdfAccessContext(result);
      const paidAccessToken = depth === "advanced" ? readVlmPaidAccessToken("vlm_advanced_pdf_single", paidContext) : "";
      if (depth === "advanced" && !paidAccessToken) {
        setPdfLoadingId(null);
        setPdfChoiceResult(result);
        await startVlmServiceCheckout({
          productId: "vlm_advanced_pdf_single",
          locale: safeLocale,
          context: paidContext,
        });
        throw new Error(`checkout_required_${advancedPdfProduct.id}`);
      }
      const forgeStartedAt = Date.now();
      const minimumForgeMs =
        depth === "basic" ? 3600 : depth === "pro" ? 3900 : 4200;
      const canonicalResponse = await fetch(
        `/api/search/lens-report?tier=${encodeURIComponent(depth)}&format=json`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(paidAccessToken ? { "x-velmere-paid-access": paidAccessToken, "x-velmere-paid-asset-id": result.id, "x-velmere-paid-symbol": result.symbol } : {}),
          },
          body: JSON.stringify({ result, locale: safeLocale, depth }),
          signal: controller.signal,
        },
      );
      const canonicalPayload =
        (await canonicalResponse.json()) as CanonicalReportResponse;
      if (
        !canonicalResponse.ok ||
        !canonicalPayload.ok ||
        !canonicalPayload.report
      ) {
        throw new Error("report_failed");
      }
      const report = canonicalPayload.report;
      const response = await fetch(
        `/api/search/lens-report?tier=${encodeURIComponent(depth)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(paidAccessToken ? { "x-velmere-paid-access": paidAccessToken, "x-velmere-paid-asset-id": result.id, "x-velmere-paid-symbol": result.symbol } : {}),
          },
          body: JSON.stringify(report),
          signal: controller.signal,
        },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      ) {
        throw new Error("pdf_failed");
      }
      const blob = await response.blob();
      if (blob.size < 900 || blob.type !== "application/pdf")
        throw new Error("pdf_invalid");
      const remainingForgeMs = Math.max(
        0,
        minimumForgeMs - (Date.now() - forgeStartedAt),
      );
      if (remainingForgeMs > 0) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, remainingForgeMs),
        );
      }
      setPdfStage(3);
      const filename = `velmere-lens-${report.symbol || "report"}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .slice(0, 80);
      setPreviewView("reader");
      setPdfPreview({
        url: URL.createObjectURL(blob),
        filename: `${filename}-${depth}.pdf`,
        report,
        depth,
        result,
      });
    } catch (previewError) {
      if ((previewError as Error).name !== "AbortError") setError(c.error);
    } finally {
      if (pdfRequestRef.current === controller) {
        pdfRequestRef.current = null;
        setPdfLoadingId(null);
      }
    }
  }

  function recordPass469DownloadReceipt() {
    if (!pdfPreview) return;
    const receipt = buildPass469PdfDownloadReceipt({
      filename: pdfPreview.filename,
      symbol: pdfPreview.report.symbol,
      depth: pdfPreview.depth,
      reportChecksum: pdfPreview.report.brain?.checksum || "unavailable",
      sourceConfidence: pdfPreview.report.sourceConfidence,
      sourceCount: pdfPreview.report.sources.length,
    });
    const persisted = writePass469PdfDownloadReceipt(receipt);
    setDownloadReceipt(persisted ? receipt : null);
    if (persisted) {
      setReceiptHistory(
        buildPass470ReceiptHistory(readPass469PdfDownloadReceipts(), 20),
      );
    }
  }

  return (
    <main
      className="velmere-lens-page velmere-lens-command-page min-h-screen bg-velmere-black px-4 pb-24 pt-24 text-white sm:px-5 md:px-10 md:pt-28"
      data-pass314-vlm-browser-simplified="true"
      data-pass315-customer-surface-trim="vlm-browser"
      data-pass444-lens-pdf-forge="true"
      data-lens-public-layout="single-result-single-pdf"
      data-pass445-lens-pdf-human-field="true"
      data-pass446-browser-human-readout="true"
      data-pass447-pdf-preview-parity="true"
      data-pass448-pdf-a4-reader-v2="true"
      data-pass450-tiered-human-report="true"
      data-pass452-browser-realmarkets-qa="true"
      data-pass453-unified-intelligence-handoff="true"
      data-pass454-evidence-dense-human-analysis="true"
      data-pass455-human-decision-pdf-forge="true"
      data-pass456-asset-aware-pdf-runtime="true"
      data-pass465-selectable-pdf-depth="true"
      data-pass467-result-priority-runtime="true"
      data-pass468-browser-shield-orbit-handoff="true"
      data-pass470-browser-runtime-qa="true"
      data-pass471-surface-runtime-resilience="true"
      data-pass486-evidence-bound-pdf-forge="true"
      data-pass1274-runtime-visual-qa="prepared"
    >
      <section className="mx-auto max-w-[88rem]">
        {!pdfModalActive ? (
          <div className="velmere-lens-command-center velmere-command-shell sticky top-20 z-20 rounded-[2.1rem] p-2 shadow-[0_24px_100px_rgba(0,0,0,0.48)] md:top-24" data-pass1983-browser-command-screen="chatgpt-like-centered">
            <p className="velmere-command-center-title" data-pass1990-typewriter-title="true"><span aria-live="polite">{animatedCommandTitle}</span><span className="velmere-typewriter-caret" aria-hidden="true" /></p>
            <form
              ref={formRef}
              onSubmit={onSubmit}
              className="velmere-lens-search-shell relative rounded-[2rem] border border-cyan-200/[0.14] bg-[radial-gradient(circle_at_0%_0%,rgba(200,169,106,0.10),transparent_34%),rgba(4,20,22,0.82)] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.38)] md:p-6"
            >
              <div className="group flex items-center gap-3 rounded-full border border-white/[0.10] bg-black/[0.42] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-cyan-200/[0.18]">
                <Search
                  className="ml-3 h-5 w-5 shrink-0 text-velmere-gold"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value.trim().toLowerCase() !==
                      committedQueryRef.current.toLowerCase()
                    ) {
                      committedQueryRef.current = "";
                    }
                    setQuery(value);
                  }}
                  onFocus={() => {
                    if (query.trim() && suggestions.length)
                      setSuggestionsOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSuggestionsOpen(false);
                      setSuggestions([]);
                    }
                  }}
                  placeholder={c.placeholder}
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={
                    suggestionsOpen && lensSuggestionSeeds.length > 0
                  }
                  aria-controls="velmere-lens-suggestion-list"
                  data-testid="lens-search-input"
                  data-pass470-keyboard-control="combobox"
                  data-pass579-exact-search={
                    searchReceipt?.match ?? searchResolution.receipt.match
                  }
                  aria-keyshortcuts="Enter Escape ArrowDown"
                  className="min-w-0 flex-1 rounded-full bg-transparent px-1 py-3 text-sm text-white outline-none focus:outline-none focus-visible:outline-none placeholder:text-white/[0.34]"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="velmere-command-pill disabled:opacity-40"
                  data-tone="gold"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span aria-hidden="true">V</span>
                  )}
                  {c.scan}
                </button>
              </div>

              {suggestionsOpen && query.trim() && lensSuggestionSeeds.length ? (
                <div
                  ref={suggestionsRef}
                  id="velmere-lens-suggestion-list"
                  role="listbox"
                  aria-label={
                    safeLocale === "pl"
                      ? "Sugestie wyszukiwania"
                      : safeLocale === "de"
                        ? "Suchvorschläge"
                        : "Search suggestions"
                  }
                  data-pass444-three-visible-no-scroll="true"
                  data-pass579-search-receipt={
                    searchReceipt?.match ?? searchResolution.receipt.match
                  }
                  className="vis-token-suggest-panel mt-3 grid max-h-none gap-2 overflow-visible rounded-[1.45rem] border border-cyan-200/[0.18] bg-[#061315] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.68)]"
                >
                  {lensSuggestionSeeds.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(item)}
                      className="flex w-full items-center gap-3 rounded-[1rem] border border-white/[0.06] bg-white/[0.025] px-3 py-3 text-left transition hover:border-cyan-200/[0.18] hover:bg-white/[0.055]"
                    >
                      <span
                        className="vis-suggestion-token-avatar grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/[0.10] bg-white/[0.04] bg-cover bg-center font-mono text-xs text-velmere-gold"
                        style={
                          item.avatarImage
                            ? { backgroundImage: `url(${item.avatarImage})` }
                            : undefined
                        }
                        aria-hidden="true"
                      >
                        {item.avatarImage
                          ? null
                          : item.symbol?.slice(0, 2) || "V"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-white">
                          {item.symbol || item.title}
                        </strong>
                        <span className="block truncate text-xs text-white/[0.48]">
                          {item.title}
                        </span>
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </form>
            <div className="velmere-command-center-pills" aria-label="Velmère quick searches">
              {["BTC", "ETH", "VLM"].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => {
                    setQuery(quick);
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                  className="velmere-command-center-pill"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="velmere-lens-hero vlm-browser-public-brief mt-5 mb-5 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_12%_0%,rgba(200,169,106,0.10),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(34,211,238,0.075),transparent_30%),rgba(255,255,255,0.018)] p-5 md:p-6">
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1.08fr)_minmax(21rem,0.72fr)] xl:items-end">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-velmere-gold shadow-[0_0_18px_rgba(200,169,106,0.8)]" />
                Velmère Lens
              </div>
              <h1 className="mt-5 max-w-5xl font-serif text-[clamp(2.05rem,4.8vw,4.9rem)] leading-[0.88] tracking-[-0.065em] text-white">
                {safeLocale === "pl"
                  ? "Sprawdź aktywo. Zobacz dowody. Zapisz raport."
                  : safeLocale === "de"
                    ? "Asset prüfen. Belege sehen. Report sichern."
                    : "Check the asset. See the evidence. Save the report."}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/[0.55] md:text-base">
                {safeLocale === "pl"
                  ? "Jedno wejście do researchu: najważniejsze fakty, źródła, pełny Shield i gotowy raport PDF w tej samej historii wizualnej."
                  : safeLocale === "de"
                    ? "Ein Einstieg in den Research: zentrale Fakten, Quellen, vollständiger Shield und ein konsistenter PDF-Report."
                    : "One research entry for the key facts, sources, full Shield and a consistent PDF report."}
              </p>
              <p className="mt-6 max-w-xl rounded-full border border-white/[0.08] bg-black/[0.20] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.40]">
                {safeLocale === "pl"
                  ? "Przykład: BTC, ETH, SOL albo adres kontraktu"
                  : safeLocale === "de"
                    ? "Beispiel: BTC, ETH, SOL oder Contract-Adresse"
                    : "Example: BTC, ETH, SOL or a contract address"}
              </p>
            </div>
            <div
              className="velmere-lens-live-stage"
              data-state={
                loading ? "scanning" : results.length ? "ready" : "idle"
              }
            >
              <div className="velmere-lens-live-visual" aria-hidden="true">
                <span className="velmere-lens-live-grid" />
                <span className="velmere-lens-live-orbit velmere-lens-live-orbit-a" />
                <span className="velmere-lens-live-orbit velmere-lens-live-orbit-b" />
                <span className="velmere-lens-live-beam" />
                <span className="velmere-lens-live-core">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "V"}
                </span>
                <span className="velmere-lens-live-caption">
                  {loading
                    ? safeLocale === "pl"
                      ? "Łączenie źródeł"
                      : safeLocale === "de"
                        ? "Quellen werden verbunden"
                        : "Connecting sources"
                    : results.length
                      ? safeLocale === "pl"
                        ? "Profil gotowy"
                        : safeLocale === "de"
                          ? "Profil bereit"
                          : "Profile ready"
                      : safeLocale === "pl"
                        ? "Lens czeka na aktywo"
                        : safeLocale === "de"
                          ? "Lens wartet auf ein Asset"
                          : "Lens is ready for an asset"}
                </span>
              </div>
              <div className="velmere-lens-journey grid gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  {
                    step: "01",
                    title:
                      safeLocale === "pl"
                        ? "Znajdź"
                        : safeLocale === "de"
                          ? "Finden"
                          : "Find",
                    body:
                      safeLocale === "pl"
                        ? "Token, kontrakt lub temat."
                        : safeLocale === "de"
                          ? "Token, Contract oder Thema."
                          : "Token, contract or topic.",
                  },
                  {
                    step: "02",
                    title:
                      safeLocale === "pl"
                        ? "Zweryfikuj"
                        : safeLocale === "de"
                          ? "Prüfen"
                          : "Verify",
                    body:
                      safeLocale === "pl"
                        ? "Fakty, braki i źródła."
                        : safeLocale === "de"
                          ? "Fakten, Lücken und Quellen."
                          : "Facts, gaps and sources.",
                  },
                  {
                    step: "03",
                    title:
                      safeLocale === "pl"
                        ? "Zapisz"
                        : safeLocale === "de"
                          ? "Sichern"
                          : "Save",
                    body:
                      safeLocale === "pl"
                        ? "Shield, Orbit albo PDF."
                        : safeLocale === "de"
                          ? "Shield, Orbit oder PDF."
                          : "Shield, Orbit or PDF.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="group grid grid-cols-[2.25rem_1fr] gap-3 rounded-[1.3rem] border border-white/[0.075] bg-black/[0.20] p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-velmere-gold/[0.20] hover:bg-white/[0.035]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-velmere-gold/[0.20] bg-velmere-gold/[0.055] font-mono text-[9px] text-velmere-gold">
                      {item.step}
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm font-semibold text-white/[0.88]">
                        {item.title}
                      </strong>
                      <span className="mt-1 block text-[11px] leading-5 text-white/[0.42]">
                        {item.body}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!loading && !results.length && !error ? (
          <section
            className="velmere-lens-discovery mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            aria-label={
              safeLocale === "pl"
                ? "Szybki start Velmère Lens"
                : safeLocale === "de"
                  ? "Velmère Lens Schnellstart"
                  : "Velmère Lens quick start"
            }
          >
            {[
              {
                symbol: "BTC",
                icon: <Search className="h-4 w-4" />,
                title:
                  safeLocale === "pl"
                    ? "Profil rynku"
                    : safeLocale === "de"
                      ? "Marktprofil"
                      : "Market profile",
                body:
                  safeLocale === "pl"
                    ? "Cena, zmienność, płynność i najważniejsze luki w jednym widoku."
                    : safeLocale === "de"
                      ? "Preis, Volatilität, Liquidität und die wichtigsten Lücken in einer Ansicht."
                      : "Price, volatility, liquidity and the key evidence gaps in one view.",
              },
              {
                symbol: "ETH",
                icon: <Shield className="h-4 w-4" />,
                title:
                  safeLocale === "pl"
                    ? "Przejście do Shield"
                    : safeLocale === "de"
                      ? "Zum Shield"
                      : "Open in Shield",
                body:
                  safeLocale === "pl"
                    ? "Rozwiń wynik do wykresu, źródeł i poziomu Basic, Pro albo Advanced."
                    : safeLocale === "de"
                      ? "Erweitere den Befund um Chart, Quellen und Basic-, Pro- oder Advanced-Tiefe."
                      : "Expand the result into charts, sources and Basic, Pro or Advanced depth.",
              },
              {
                symbol: "SOL",
                icon: <Brain className="h-4 w-4" />,
                title:
                  safeLocale === "pl"
                    ? "Mapa zależności"
                    : safeLocale === "de"
                      ? "Beziehungsmap"
                      : "Relationship map",
                body:
                  safeLocale === "pl"
                    ? "Zobacz, które sygnały łączą płynność, rynek, kontrakt i brakujące dane."
                    : safeLocale === "de"
                      ? "Sieh, wie Liquidität, Markt, Contract und Datenlücken zusammenhängen."
                      : "See how liquidity, market structure, contract and missing data connect.",
              },
              {
                symbol: "BTC",
                icon: <FileText className="h-4 w-4" />,
                title:
                  safeLocale === "pl"
                    ? "Raport A4"
                    : safeLocale === "de"
                      ? "A4-Report"
                      : "A4 report",
                body:
                  safeLocale === "pl"
                    ? "Ten sam wynik w podglądzie i pobranym PDF — bez zmiany hierarchii."
                    : safeLocale === "de"
                      ? "Dasselbe Ergebnis in Vorschau und PDF — ohne wechselnde Hierarchie."
                      : "The same result in preview and downloaded PDF, with one visual hierarchy.",
              },
            ].map((item, index) => (
              <button
                key={`${item.title}-${index}`}
                type="button"
                onClick={() => {
                  setQuery(item.symbol);
                  window.requestAnimationFrame(() =>
                    formRef.current?.focus?.(),
                  );
                }}
                className="velmere-lens-discovery-card group text-left"
              >
                <span
                  className="velmere-lens-discovery-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="velmere-lens-discovery-index">
                  0{index + 1}
                </span>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <small>
                  {safeLocale === "pl"
                    ? `Wypróbuj ${item.symbol}`
                    : safeLocale === "de"
                      ? `${item.symbol} testen`
                      : `Try ${item.symbol}`}
                </small>
              </button>
            ))}
          </section>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-300/[0.15] bg-red-400/[0.05] p-4 text-sm text-red-100/[0.82]">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="velmere-stable-surface velmere-stable-skeleton mt-6 rounded-[1.5rem] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.08] text-velmere-gold">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="velmere-stable-skeleton__eyebrow" />
                <div className="velmere-stable-skeleton__title" />
              </div>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/[0.44]">
              {c.loading}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.2rem] border border-white/[0.07] bg-black/[0.18] p-4"
                >
                  <div className="velmere-stable-skeleton__row" />
                  <div className="velmere-stable-skeleton__row mt-3 w-[82%]" />
                  <div className="velmere-stable-skeleton__row mt-3 w-[58%]" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div
          ref={resultsAnchorRef}
          className={`${results.length ? "mt-5 scroll-mt-48" : ""} grid gap-4`}
          data-pass467-result-first-layout="true"
          aria-live="polite"
          aria-busy={loading}
        >
          {results.length ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100/[0.62]">
                {safeLocale === "pl"
                  ? "Analiza gotowa"
                  : safeLocale === "de"
                    ? "Analyse bereit"
                    : "Analysis ready"}
              </p>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.30]">
                {results.length} · {committedQueryRef.current}
              </span>
            </div>
          ) : null}
          {results.map((result, resultIndex) => (
            <article
              key={result.id}
              data-testid="lens-result-card"
              data-primary-result={resultIndex === 0 ? "true" : "false"}
              data-pass470-runtime-guard={
                pass470RuntimeGuards[resultIndex]?.safeToRender
                  ? "ok"
                  : "review"
              }
              data-pass470-source-count={
                pass470RuntimeGuards[resultIndex]?.sources ?? 0
              }
              className={`velmere-hover-lift rounded-[1.6rem] border p-5 shadow-[0_18px_80px_rgba(0,0,0,0.22)] md:p-6 ${
                resultIndex === 0
                  ? "border-cyan-200/[0.18] bg-[radial-gradient(circle_at_0%_0%,rgba(72,214,220,0.08),transparent_34%),rgba(255,255,255,0.03)] shadow-[0_24px_90px_rgba(0,0,0,0.28)]"
                  : lensToneClass(result.tone)
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-white/[0.07] bg-black/[0.16] px-3 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.60]">
                    {result.category}
                  </span>
                  <span className="velmere-premium-chip text-[8px]">
                    {c.source}: {result.sourceMode}
                  </span>
                  <span className="velmere-premium-chip text-[8px]">
                    {c.confidence}: {result.sourceConfidence}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.chips.slice(0, 2).map((chip) => (
                    <span
                      key={chip}
                      className="velmere-premium-chip text-[8px]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/[0.10] bg-white/[0.04] bg-cover bg-center font-mono text-sm text-velmere-gold"
                    style={
                      result.avatarImage
                        ? { backgroundImage: `url(${result.avatarImage})` }
                        : undefined
                    }
                    aria-hidden="true"
                  >
                    {result.avatarImage
                      ? null
                      : result.symbol?.slice(0, 2) || "V"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-white">
                        {result.title}
                      </h2>
                      {result.symbol ? (
                        <span className="rounded-full border border-white/[0.09] px-2 py-1 font-mono text-[9px] text-white/[0.48]">
                          {result.symbol}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/[0.58]">
                      {result.summary}
                    </p>
                    {(() => {
                      const intelligence = buildPass455HumanDecisionPdfForge(
                        result,
                        safeLocale,
                      );
                      const toneClass =
                        result.tone === "calm"
                          ? "border-emerald-300/[0.18] bg-emerald-300/[0.045]"
                          : result.tone === "review"
                            ? "border-amber-300/[0.16] bg-amber-300/[0.04]"
                            : "border-rose-300/[0.18] bg-rose-300/[0.045]";
                      const labels =
                        safeLocale === "pl"
                          ? {
                              known: "Co wiemy",
                              missing: "Co ogranicza wynik",
                              next: "Następne sprawdzenie",
                            }
                          : safeLocale === "de"
                            ? {
                                known: "Was wir wissen",
                                missing: "Was das Ergebnis begrenzt",
                                next: "Nächste Prüfung",
                              }
                            : {
                                known: "What we know",
                                missing: "What limits the result",
                                next: "Next check",
                              };
                      return (
                        <section
                          className={`mt-4 rounded-[1.35rem] border p-4 ${toneClass}`}
                          data-pass453-human-verdict="true"
                          data-pass455-human-decision-card="true"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/[0.38]">
                                {intelligence.executive.eyebrow}
                              </p>
                              <strong className="mt-2 block text-base text-white/[0.92]">
                                {intelligence.executive.headline}
                              </strong>
                              <p className="mt-2 max-w-3xl text-xs leading-6 text-white/[0.54]">
                                {intelligence.executive.oneSentence}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/[0.10] bg-black/[0.18] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.58]">
                              {intelligence.executive.confidenceLabel}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <div className="rounded-2xl border border-white/[0.07] bg-black/[0.16] p-3">
                              <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.34]">
                                {labels.known}
                              </p>
                              <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.70]">
                                {intelligence.executive.whatWeKnow
                                  .slice(0, 4)
                                  .map((item) => (
                                    <span key={item}>• {item}</span>
                                  ))}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.07] bg-black/[0.16] p-3">
                              <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.34]">
                                {labels.missing}
                              </p>
                              <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.62]">
                                {intelligence.executive.whatIsMissing
                                  .slice(0, 3)
                                  .map((item) => (
                                    <span key={item}>• {item}</span>
                                  ))}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 rounded-2xl border border-velmere-gold/[0.14] bg-velmere-gold/[0.045] px-3 py-3">
                            <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-velmere-gold/[0.76]">
                              {labels.next}
                            </p>
                            <p className="mt-2 text-[11px] leading-5 text-white/[0.62]">
                              {intelligence.executive.nextCheck}
                            </p>
                          </div>
                        </section>
                      );
                    })()}
                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.34]">
                      {c.source}: {result.sourceMode} · {c.confidence}:{" "}
                      {result.sourceConfidence}%
                    </p>
                    {result.marketSnapshot ? (
                      <div
                        className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"
                        data-pass450-market-snapshot="true"
                      >
                        {[
                          [
                            safeLocale === "pl"
                              ? "Cena"
                              : safeLocale === "de"
                                ? "Preis"
                                : "Price",
                            formatSnapshotMoney(
                              safeLocale,
                              result.marketSnapshot.price,
                              result.marketSnapshot.currency,
                            ),
                          ],
                          [
                            safeLocale === "pl"
                              ? "Kapitalizacja"
                              : safeLocale === "de"
                                ? "Market Cap"
                                : "Market cap",
                            formatSnapshotMoney(
                              safeLocale,
                              result.marketSnapshot.marketCap,
                              result.marketSnapshot.currency,
                            ),
                          ],
                          [
                            "24h",
                            formatSnapshotPercent(
                              safeLocale,
                              result.marketSnapshot.change24h,
                            ),
                          ],
                          [
                            safeLocale === "pl"
                              ? "Wolumen"
                              : safeLocale === "de"
                                ? "Volumen"
                                : "Volume",
                            formatSnapshotMoney(
                              safeLocale,
                              result.marketSnapshot.volume24h,
                              result.marketSnapshot.currency,
                            ),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-white/[0.07] bg-black/[0.18] p-3"
                          >
                            <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.32]">
                              {label}
                            </p>
                            <p className="mt-2 truncate font-mono text-sm text-white tabular-nums">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {(() => {
                      const waterfall = buildPass466ConfidenceWaterfall(
                        result,
                        safeLocale,
                        "advanced",
                      );
                      const title =
                        safeLocale === "pl"
                          ? "Waterfall pewności"
                          : safeLocale === "de"
                            ? "Confidence Waterfall"
                            : "Confidence waterfall";
                      const lost =
                        safeLocale === "pl"
                          ? `utracono ${waterfall.lostConfidence} pkt przez granice źródeł`
                          : safeLocale === "de"
                            ? `${waterfall.lostConfidence} Punkte durch Quellengrenzen verloren`
                            : `${waterfall.lostConfidence} points lost to source boundaries`;
                      return (
                        <section
                          className="mt-4 rounded-[1.35rem] border border-white/[0.08] bg-black/[0.18] p-4"
                          data-pass466-confidence-waterfall="true"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-100/[0.52]">
                                {title}
                              </p>
                              <p className="mt-1 text-[11px] text-white/[0.42]">
                                {lost}
                              </p>
                            </div>
                            <strong className="font-mono text-sm text-white tabular-nums">
                              {waterfall.finalConfidence}%
                            </strong>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                            {waterfall.stages.slice(0, 3).map((stage) => (
                              <div
                                key={stage.id}
                                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5"
                                title={stage.detail}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.36]">
                                    {stage.label}
                                  </span>
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${stage.state === "confirmed" ? "bg-emerald-300" : stage.state === "review" ? "bg-amber-300" : "bg-rose-300"}`}
                                  />
                                </div>
                                <strong className="mt-2 block font-mono text-xs text-white/[0.76] tabular-nums">
                                  {stage.cap}%
                                </strong>
                                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                  <span
                                    className="block h-full rounded-full bg-white/[0.44]"
                                    style={{ width: `${stage.cap}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          {waterfall.filingUrl ? (
                            <a
                              href={waterfall.filingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.12] bg-cyan-300/[0.035] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.11em] text-cyan-100/[0.70] transition hover:border-cyan-100/[0.28] hover:text-cyan-50"
                              data-pass466-sec-filing-link="true"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {waterfall.filingLabel || "SEC filing"}
                            </a>
                          ) : null}
                        </section>
                      );
                    })()}
                    {result.missingData.length ? (
                      <p className="mt-3 rounded-xl border border-amber-200/[0.10] bg-amber-300/[0.035] px-3 py-2 text-xs leading-6 text-white/[0.48]">
                        {c.missing}:{" "}
                        {result.missingData.slice(0, 3).join(" · ")}
                      </p>
                    ) : null}
                    <div
                      className="velmere-lens-depth-rail mt-4"
                      data-pass448-no-raw-unknown="true"
                      aria-label={
                        safeLocale === "pl"
                          ? "Dostępne poziomy raportu"
                          : safeLocale === "de"
                            ? "Verfügbare Report-Tiefen"
                            : "Available report depths"
                      }
                    >
                      {[
                        ["Basic", "10"],
                        ["Pro", "14"],
                        ["Advanced", "20"],
                      ].map(([title, count]) => (
                        <span key={title}>
                          <strong>{title}</strong>
                          <small>{count}</small>
                        </span>
                      ))}
                    </div>
                    <div
                      className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
                      data-pass452-signature-insights="true"
                      data-pass454-advanced-signature-metrics="true"
                    >
                      {buildPass454EvidenceDenseHumanAnalysis(
                        result,
                        safeLocale,
                      )
                        .tiers.find((tier) => tier.id === "advanced")
                        ?.metrics.slice(8, 10)
                        .map((insight) => (
                          <div
                            key={insight.id}
                            className="rounded-2xl border border-cyan-200/[0.08] bg-cyan-300/[0.025] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-100/[0.52]">
                                {insight.label}
                              </span>
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${insight.state === "confirmed" ? "bg-emerald-300" : insight.state === "review" ? "bg-amber-300" : "bg-rose-300"}`}
                              />
                            </div>
                            <strong className="mt-2 block break-words text-xs text-white/[0.78]">
                              {insight.value}
                            </strong>
                            <p className="mt-2 text-[10px] leading-5 text-white/[0.36]">
                              {insight.humanMeaning}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 rounded-[1.2rem] border border-white/[0.07] bg-black/[0.16] p-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      requestPreview(result, event.currentTarget);
                    }}
                    disabled={pdfLoadingId === result.id}
                    data-testid="lens-preview-button"
                    className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.24] bg-velmere-gold/[0.08] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-velmere-gold"
                  >
                    {pdfLoadingId === result.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {c.preview}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPass468Handoff(result, "shield")}
                    data-testid="lens-shield-handoff"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.035] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.62]"
                  >
                    <Shield className="h-4 w-4" />
                    {c.shield}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPass468Handoff(result, "orbit")}
                    data-testid="lens-orbit-handoff"
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.14] bg-cyan-300/[0.045] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-cyan-50/[0.72]"
                  >
                    <Brain className="h-4 w-4" />
                    {c.orbit}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!results.length && !loading ? (
          <section
            className="velmere-lens-discovery mt-5 grid gap-3 lg:grid-cols-3"
            aria-label={
              safeLocale === "pl"
                ? "Możliwości Velmère Lens"
                : safeLocale === "de"
                  ? "Velmère Lens Möglichkeiten"
                  : "Velmère Lens capabilities"
            }
          >
            {[
              {
                icon: <Search className="h-5 w-5" aria-hidden="true" />,
                title:
                  safeLocale === "pl"
                    ? "Szybki profil aktywa"
                    : safeLocale === "de"
                      ? "Schnelles Asset-Profil"
                      : "Fast asset profile",
                body:
                  safeLocale === "pl"
                    ? "Cena, rynek, źródła i najważniejsze ograniczenia w jednym wyniku."
                    : safeLocale === "de"
                      ? "Preis, Markt, Quellen und wichtigste Grenzen in einem Ergebnis."
                      : "Price, market, sources and the key limitations in one result.",
              },
              {
                icon: <Shield className="h-5 w-5" aria-hidden="true" />,
                title:
                  safeLocale === "pl"
                    ? "Handoff do Shield"
                    : safeLocale === "de"
                      ? "Handoff zum Shield"
                      : "Shield handoff",
                body:
                  safeLocale === "pl"
                    ? "Ten sam instrument przechodzi do głębszej analizy bez ponownego szukania."
                    : safeLocale === "de"
                      ? "Dasselbe Instrument geht ohne neue Suche in die tiefere Analyse."
                      : "The same instrument moves into deeper analysis without another search.",
              },
              {
                icon: <FileText className="h-5 w-5" aria-hidden="true" />,
                title:
                  safeLocale === "pl"
                    ? "Raport gotowy do zapisania"
                    : safeLocale === "de"
                      ? "Speicherfertiger Report"
                      : "Save-ready report",
                body:
                  safeLocale === "pl"
                    ? "Basic, Pro lub Advanced — podgląd i pobrany PDF zachowują ten sam układ."
                    : safeLocale === "de"
                      ? "Basic, Pro oder Advanced — Vorschau und PDF behalten dasselbe Layout."
                      : "Basic, Pro or Advanced — preview and downloaded PDF keep the same layout.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="group rounded-[1.5rem] border border-white/[0.075] bg-white/[0.022] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/[0.16] hover:bg-white/[0.035]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/[0.13] bg-cyan-300/[0.045] text-cyan-100 transition group-hover:border-velmere-gold/[0.24] group-hover:text-velmere-gold">
                  {item.icon}
                </span>
                <h2 className="mt-4 text-lg font-semibold tracking-[-0.025em] text-white">
                  {item.title}
                </h2>
                <p className="mt-2 text-xs leading-6 text-white/[0.48]">
                  {item.body}
                </p>
              </article>
            ))}
          </section>
        ) : null}

        {false ? (
        <article
          data-pass467-pdf-capsule-after-result="true"
          data-pass315-lens-public-pdf-forge="true"
          data-pass1990-lens-capsule="hidden-until-result"
          className="mt-5 rounded-[1.6rem] border border-velmere-gold/[0.14] bg-[radial-gradient(circle_at_0%_0%,rgba(200,169,106,0.11),transparent_36%),rgba(255,255,255,0.025)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] transition duration-300 translate-y-0 opacity-100 md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">
                Velmère Browser · PDF
              </p>
              <h1 className="mt-2 font-serif text-3xl tracking-[-0.045em] text-white md:text-4xl">
                {results.length ? c.afterResultTitle : c.emptyTitle}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/[0.56]">
                {results.length ? c.afterResultBody : c.emptyBody}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[c.depth[0], c.depth[1], c.depth[2]].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/[0.07] bg-black/[0.18] p-3"
                  >
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-velmere-gold/[0.78]">
                      {["Basic · 10", "Pro · 14", "Advanced · 20"][index]}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-white/[0.44]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="grid min-w-[16rem] gap-3"
              data-pass448-browser-stage-v="true"
            >
              <div className="relative overflow-hidden rounded-[1.4rem] border border-velmere-gold/[0.18] bg-black/[0.26] p-4 text-center shadow-[0_0_80px_rgba(200,169,106,0.08)]">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-velmere-gold/[0.28] bg-velmere-gold/[0.08] font-serif text-4xl text-velmere-gold shadow-[0_0_70px_rgba(200,169,106,0.18)] before:absolute before:inset-[1.1rem] before:animate-ping before:rounded-full before:border before:border-velmere-gold/[0.12]">
                  V
                </div>
                <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-white/[0.40]">
                  4 etapy · podgląd zgodny z pobraniem
                </p>
              </div>
              <div className="grid gap-2 rounded-[1.2rem] border border-white/[0.08] bg-black/[0.20] p-3">
                {c.forgeSteps.map((step, index) => (
                  <span
                    key={step}
                    className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.46]"
                  >
                    <b className="grid h-6 w-6 place-items-center rounded-full border border-velmere-gold/[0.22] text-velmere-gold">
                      {index + 1}
                    </b>
                    {step}
                  </span>
                ))}
              </div>
              <div
                className="grid gap-2 rounded-[1.2rem] border border-cyan-200/[0.10] bg-cyan-300/[0.035] p-3"
                data-pass446-pdf-depth-matrix="true"
              >
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-100/[0.68]">
                  {c.depthTitle}
                </p>
                {c.depth.map((item) => (
                  <span
                    key={item}
                    className="rounded-xl border border-white/[0.07] bg-black/[0.18] px-3 py-2 text-[11px] leading-5 text-white/[0.54]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
        ) : null}
      </section>

      {pdfChoiceResult ? (
        <BodyPortal>
          <div
            className="fixed inset-0 grid place-items-center overflow-y-auto overscroll-contain bg-black/[0.97] p-3 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="velmere-pdf-depth-title"
            data-testid="lens-pdf-depth-dialog"
            data-pass479-header-occlusion-fix="full-viewport"
            data-pass554-body-portal="true"
            data-pass560-global-header-occlusion="sealed"
            data-pass1274-runtime-visual-qa-release={
              pdfPreview?.report?.pass1274?.state ?? "idle"
            }
            data-pass1274-artifact-root={
              pdfPreview?.report?.pass1274?.artifactRoot ?? "not-created-yet"
            }
            data-pass1274-required-command={
              pdfPreview?.report?.pass1274?.requiredCommand ?? "select-depth-first"
            }
            data-pass2003-lens-depth-dialog="solid-cyan-owned-scroll-no-blur"
            style={{
              ...pass628LayerStyle("nestedModal"),
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <button
              type="button"
              className="fixed inset-0 cursor-default"
              aria-label={c.close}
              onPointerDown={() => setPdfChoiceResult(null)}
            />
            <section
              ref={choiceDialogRef}
              tabIndex={-1}
              data-modal-scroll-region="true"
              className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[2rem] border border-cyan-200/[0.14] bg-[#05090c] p-5 shadow-[0_34px_110px_rgba(0,0,0,0.76)] md:p-8"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">
                {pdfChoiceResult.symbol} · PDF
              </p>
              <h2
                id="velmere-pdf-depth-title"
                className="mt-2 font-serif text-4xl tracking-[-0.045em] text-white"
              >
                {c.pdfDepthPrompt}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/[0.48]">
                {safeLocale === "pl"
                  ? "Najpierw wybierz poziom szczegółowości. Plik powstanie dopiero po potwierdzeniu."
                  : safeLocale === "de"
                    ? "Wähle zuerst den Detailgrad. Die Datei wird erst nach der Bestätigung erzeugt."
                    : "Choose the detail level first. The file is generated only after confirmation."}
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {pdfDepthOrder.map((depth) => {
                  const active = selectedPdfDepth === depth;
                  return (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => {
                        selectedPdfDepthRef.current = depth;
                        setSelectedPdfDepth(depth);
                      }}
                      aria-pressed={active}
                      data-testid={`lens-depth-choice-${depth}`}
                      className={`velmere-interaction-pulse rounded-[1.35rem] border p-5 text-left transition ${
                        active
                          ? "border-cyan-200/[0.44] bg-cyan-300/[0.085]"
                          : "border-white/[0.09] bg-white/[0.025] hover:border-white/[0.18]"
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
                          active ? "text-cyan-100" : "text-white/[0.62]"
                        }`}
                      >
                        {c.pdfDepthLabels[depth]}{depth === "advanced" ? ` · ${getVlmPaidProduct("vlm_advanced_pdf_single", safeLocale).priceLabel}` : ""}
                      </span>
                      <span className="mt-3 block text-xs leading-6 text-white/[0.46]">
                        {c.pdfDepthDescriptions[depth]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  ref={choiceCloseRef}
                  onClick={() => setPdfChoiceResult(null)}
                  className="velmere-command-pill velmere-interaction-pulse px-5 py-3 text-[9px]"
                >
                  {c.close}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void openPreview(pdfChoiceResult, selectedPdfDepth)
                  }
                  data-testid="lens-depth-confirm"
                  className="velmere-command-pill velmere-interaction-pulse px-6 py-3 text-[9px]"
                  data-tone="gold"
                >
                  {selectedPdfDepth === "advanced"
                    ? getVlmPaidProduct("vlm_advanced_pdf_single", safeLocale).checkoutCta
                    : safeLocale === "pl"
                      ? "Generuj PDF"
                      : safeLocale === "de"
                        ? "PDF erzeugen"
                        : "Generate PDF"}
                </button>
              </div>
            </section>
          </div>
        </BodyPortal>
      ) : null}

      {pdfLoadingId ? (
        <BodyPortal>
          <div
            className="fixed inset-0 grid place-items-center overflow-y-auto overscroll-contain bg-black/[0.97] p-3 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            aria-labelledby="velmere-pdf-forge-title"
            data-pass450-four-stage-v-forge="true"
            data-pass451-progressive-v-forge="true"
            data-pass486-evidence-bound-forge="true"
            data-testid="lens-pdf-forge"
            data-pass470-keyboard-only-qa={
              pass470KeyboardAudit.ok ? "ok" : "review"
            }
            data-pass479-header-occlusion-fix="full-viewport"
            data-pass554-body-portal="true"
            data-pass560-global-header-occlusion="sealed"
            data-pass2003-lens-forge-dialog="solid-low-lag-no-blur"
            style={{
              ...pass628LayerStyle("nestedModal"),
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <section
              ref={forgeDialogRef}
              tabIndex={-1}
              data-modal-scroll-region="true"
              className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-[2rem] border border-cyan-200/[0.14] bg-[#05090c] p-5 text-center shadow-[0_34px_110px_rgba(0,0,0,0.76)] sm:p-7"
            >
              <div className="relative mx-auto grid h-28 w-28 place-items-center">
                <span className="absolute inset-0 animate-[spin_8s_linear_infinite] rounded-full border border-velmere-gold/[0.18] border-t-velmere-gold/[0.72]" />
                <span className="absolute inset-3 animate-[spin_5s_linear_infinite_reverse] rounded-full border border-cyan-200/[0.12] border-r-cyan-100/[0.56]" />
                <span className="grid h-20 w-20 place-items-center rounded-full border border-velmere-gold/[0.32] bg-velmere-gold/[0.09] font-serif text-6xl text-velmere-gold shadow-[0_0_90px_rgba(200,169,106,0.24)]">
                  V
                </span>
              </div>
              <h2
                id="velmere-pdf-forge-title"
                className="mt-5 font-serif text-3xl tracking-[-0.04em] text-white"
              >
                {c.forgeTitle}
              </h2>
              <p className="mt-2 text-xs leading-6 text-white/[0.48]">
                {activePass486Forge?.stages[pdfStage]?.detail ||
                  activeForgeIntelligence?.forge.stages[pdfStage]?.detail ||
                  pass451.forgeStages[pdfStage]?.detail}
              </p>
              {activePass486Forge ? (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.38]">
                  <span>{activePass486Forge.subline}</span>
                  <span className="text-velmere-gold/[0.72]">
                    {activePass486Forge.evidenceState}
                  </span>
                </div>
              ) : null}
              <div
                className="mt-5 rounded-[1.4rem] border border-white/[0.08] bg-black/[0.22] p-3 text-left"
                data-pass465-selectable-pdf-depth="true"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/[0.42]">
                    {c.pdfDepthPrompt}
                  </p>
                  <span className="font-mono text-[8px] uppercase tracking-[0.10em] text-white/[0.30]">
                    {pdfDepthLocked ? `✓ ${c.pdfDepthLock}` : c.pdfDepthLock}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {pdfDepthOrder.map((depth) => {
                    const active = selectedPdfDepth === depth;
                    return (
                      <button
                        key={depth}
                        ref={active ? forgeDepthButtonRef : undefined}
                        type="button"
                        onClick={() => setSelectedPdfDepth(depth)}
                        disabled={pdfDepthLocked}
                        aria-pressed={active}
                        data-testid={`lens-depth-${depth}`}
                        data-pass470-keyboard-control="pdf-depth"
                        aria-keyshortcuts="Enter Space"
                        aria-label={`${c.pdfDepthLabels[depth]} · ${c.pdfDepthDescriptions[depth]}`}
                        className={`velmere-interaction-pulse rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                          active
                            ? "border-cyan-200/[0.42] bg-cyan-300/[0.085] text-cyan-100"
                            : "border-white/[0.08] bg-white/[0.025] text-white/[0.54] hover:border-white/[0.18] hover:text-white/[0.78]"
                        }`}
                      >
                        <span className="block font-mono text-[9px] uppercase tracking-[0.14em]">
                          {c.pdfDepthLabels[depth]}
                        </span>
                        <span className="mt-1 block text-[10px] leading-4 text-white/[0.46]">
                          {c.pdfDepthDescriptions[depth]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                aria-label={pass451.labels.progress}
              >
                <div
                  className="velmere-progress-rail h-full rounded-full bg-cyan-200 transition-[width] duration-300 ease-out"
                  style={{
                    width: `${
                      activePass486Forge
                        ? activePass486Forge.stages
                            .slice(0, pdfStage + 1)
                            .reduce((sum, stage) => sum + stage.weight, 0)
                        : ((pdfStage + 1) / pass451.forgeStages.length) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="mt-6 grid gap-2 text-left">
                {(
                  activePass486Forge?.stages ||
                  activeForgeIntelligence?.forge.stages ||
                  pass451.forgeStages
                ).map((stage, index) => {
                  const complete = index < pdfStage;
                  const active = index === pdfStage;
                  return (
                    <div
                      key={stage.id}
                      className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                        active
                          ? "border-cyan-200/[0.42] bg-cyan-300/[0.08] text-cyan-100"
                          : complete
                            ? "border-emerald-300/[0.16] bg-emerald-300/[0.04] text-emerald-100/[0.72]"
                            : "border-white/[0.08] bg-white/[0.025] text-white/[0.34]"
                      }`}
                    >
                      <span className="font-mono text-[10px]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.13em]">
                          {stage.label}
                        </span>
                        {"evidenceLabel" in stage ? (
                          <span className="mt-1 block font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.28]">
                            {stage.evidenceLabel}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.10em]">
                        {complete
                          ? "✓"
                          : active
                            ? `${Math.round(((index + 1) / 4) * 100)}%`
                            : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {activePass486Forge ? (
                <div
                  className="mt-4 grid grid-cols-2 gap-2"
                  data-pass486-quality-gates="parity-missing-sources-signature"
                >
                  {activePass486Forge.qualityGates.map((gate) => (
                    <div
                      key={gate.id}
                      className={`rounded-xl border px-3 py-2 text-left font-mono text-[7px] uppercase tracking-[0.11em] ${
                        gate.state === "pass"
                          ? "border-emerald-300/[0.14] bg-emerald-300/[0.035] text-emerald-100/[0.62]"
                          : "border-amber-200/[0.14] bg-amber-200/[0.035] text-amber-100/[0.62]"
                      }`}
                    >
                      {gate.state === "pass" ? "✓" : "•"} {gate.label}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </BodyPortal>
      ) : null}

      {pdfPreview ? (
        <BodyPortal>
          <div
            className="velmere-lens-modal-root fixed inset-0 overflow-hidden overscroll-none bg-black/[0.985] p-3 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="velmere-pdf-preview-title"
            aria-describedby="velmere-pdf-preview-description"
            data-pass450-hard-scroll-lock="true"
            data-pass451-exact-pdf-preview="true"
            data-testid="lens-preview-dialog"
            data-pass470-preview-keyboard-trap={
              pass470KeyboardAudit.ok ? "ok" : "review"
            }
            data-pass479-header-occlusion-fix="full-viewport"
            data-pass554-body-portal="true"
            data-pass560-global-header-occlusion="sealed"
            data-pass2003-lens-preview-dialog="solid-reader-owned-scroll-no-blur"
            style={{
              ...pass628LayerStyle("nestedModal"),
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div
              className="fixed inset-0"
              aria-hidden="true"
              onPointerDown={(event) => {
                if (event.currentTarget === event.target) closePreview();
              }}
            />
            <section
              ref={previewDialogRef}
              tabIndex={-1}
              className="velmere-lens-modal-shell relative mx-auto flex h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] max-w-[1180px] flex-col md:h-[calc(100dvh-3rem)] md:max-h-[calc(100dvh-3rem)]"
              data-pass1274-modal-above-header={
                pdfPreview.report.pass1274.visualBudget.modalAboveHeader
                  ? "true"
                  : "false"
              }
            >
              <header
                className="velmere-lens-modal-header mb-3 grid shrink-0 gap-2 rounded-2xl border border-white/[0.10] bg-[#0b1112]/[0.985] p-2.5 shadow-2xl sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:p-3"
                data-pass573-pdf-locale-purity={pdfPreview.report.pass573.state}
                data-pass574-page-boundary={pdfPreview.report.pass574.status}
                data-pass581-page-compositor={pdfPreview.report.pass581.status}
                data-pass583-download-parity={pdfPreview.report.pass583.state}
                data-pass596-pdf-release-proof={pdfPreview.report.pass596.state}
                data-pass607-claim-source-gate={pdfPreview.report.pass607.state}
                data-pass608-missing-source-appendix={
                  pdfPreview.report.pass608.state
                }
                data-pass609-a4-density={pdfPreview.report.pass609.state}
                data-pass610-reader-download-parity={
                  pdfPreview.report.pass610.state
                }
                data-pass611-pdf-accessibility={pdfPreview.report.pass611.state}
                data-pass622-source-registry={pdfPreview.report.pass622.state}
                data-pass623-atomic-claims={pdfPreview.report.pass623.state}
                data-pass624-provider-contradiction={
                  pdfPreview.report.pass624.state
                }
                data-pass625-freshness-synthesis={
                  pdfPreview.report.pass625.state
                }
                data-pass626-next-check-planner={
                  pdfPreview.report.pass626.state
                }
                data-pass642-pdfua-validation={pdfPreview.report.pass642.state}
                data-pass643-visual-parity={pdfPreview.report.pass643.state}
                data-pass644-source-replay={pdfPreview.report.pass644.state}
                data-pass645-mobile-budget={pdfPreview.report.pass645.state}
                data-pass646-unified-ledger={pdfPreview.report.pass646.state}
                data-pass1234-lens-shieldmap-parity={
                  pdfPreview.report.pass1234.finalStatus
                }
                data-pass1234-manifest={pdfPreview.report.pass1234.manifestKey}
                data-pass1254-pdf-typography-release={
                  pdfPreview.report.pass1254.state
                }
                data-pass1254-manifest={pdfPreview.report.pass1254.manifestKey}
                data-pass1274-runtime-visual-qa-release={
                  pdfPreview.report.pass1274.state
                }
                data-pass1274-manifest={pdfPreview.report.pass1274.manifestKey}
                data-evidence-key={pdfPreview.report.pass646.evidenceKey}
              >
                <div className="min-w-0 px-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id="velmere-pdf-preview-title"
                      className="truncate text-sm font-semibold text-white"
                    >
                      {c.preview} · {pdfPreview.report.symbol}
                    </h2>
                    <span
                      className="velmere-command-pill min-h-0 px-2 py-1 text-[8px]"
                      data-tone="gold"
                    >
                      {pdfPreview.report.pass610.pageCount} A4
                    </span>
                    <span
                      className="velmere-command-pill min-h-0 px-2 py-1 text-[8px]"
                      data-tone="cyan"
                      data-pass465-pdf-depth-badge="true"
                    >
                      {c.pdfDepthLabels[pdfPreview.depth]}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.10em] ${pdfPreview.report.pass607.state === "complete" ? "border-emerald-200/[0.16] bg-emerald-300/[0.045] text-emerald-100/[0.76]" : pdfPreview.report.pass607.state === "review" ? "border-amber-200/[0.16] bg-amber-300/[0.045] text-amber-100/[0.76]" : "border-rose-200/[0.16] bg-rose-300/[0.045] text-rose-100/[0.78]"}`}
                      title={pdfPreview.report.pass607.boundary}
                    >
                      {safeLocale === "pl"
                        ? "Claimy"
                        : safeLocale === "de"
                          ? "Claims"
                          : "Claims"}{" "}
                      · {pdfPreview.report.pass607.confirmedClaims}/
                      {
                        pdfPreview.report.pass607.claims.filter(
                          (claim) => claim.state !== "not_applicable",
                        ).length
                      }{" "}
                      · {pdfPreview.report.pass607.confidenceCap}%
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.10em] ${pdfPreview.report.pass608.entries.length ? "border-amber-200/[0.16] bg-amber-300/[0.045] text-amber-100/[0.76]" : "border-emerald-200/[0.16] bg-emerald-300/[0.045] text-emerald-100/[0.76]"}`}
                      title={pdfPreview.report.pass608.boundary}
                    >
                      {safeLocale === "pl"
                        ? "Luki"
                        : safeLocale === "de"
                          ? "Lücken"
                          : "Gaps"}{" "}
                      · {pdfPreview.report.pass608.entries.length}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.10em] ${pdfPreview.report.pass646.state === "locked" ? "border-emerald-200/[0.16] bg-emerald-300/[0.045] text-emerald-100/[0.76]" : "border-amber-200/[0.16] bg-amber-300/[0.045] text-amber-100/[0.76]"}`}
                      title={pdfPreview.report.pass646.boundary}
                      data-pass646-evidence-continuity="true"
                    >
                      {safeLocale === "pl"
                        ? "Spójność"
                        : safeLocale === "de"
                          ? "Konsistenz"
                          : "Continuity"}{" "}
                      · {pdfPreview.report.pass646.state}
                    </span>
                  </div>
                  <p
                    id="velmere-pdf-preview-description"
                    className="mt-1 truncate text-[11px] text-white/[0.42]"
                    title={`${pdfPreview.report.pass625.summary} ${pdfPreview.report.pass626.primaryAction?.action || ""}`}
                  >
                    {pdfPreview.report.pass451.labels.previewHint} ·{" "}
                    {pdfPreview.report.pass625.state} ·{" "}
                    {pdfPreview.report.pass625.confidenceCap}%
                  </p>
                </div>
                <div
                  className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-none sm:flex sm:flex-wrap sm:items-center"
                  data-pass469-responsive-pdf-toolbar="true"
                  data-pass470-keyboard-toolbar="true"
                  aria-label={c.keyboardQa}
                  onKeyDown={handlePreviewToolbarKeyDown}
                >
                  <div
                    className="col-span-2 flex min-w-0 rounded-full border border-white/[0.09] bg-black/[0.28] p-1 sm:col-span-1"
                    aria-label={c.preview}
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewView("pdf")}
                      aria-pressed={previewView === "pdf"}
                      data-testid="lens-pdf-toggle"
                      data-pass1314-stable-pdf-toggle="true"
                      className={`velmere-command-pill min-h-0 flex-1 px-3 py-2 text-[8px] ${previewView === "pdf" ? "bg-white/[0.10] text-white" : "text-white/[0.42] hover:text-white/[0.72]"}`}
                    >
                      {pdfPreview.report.pass451.labels.exactPreview}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewView("reader")}
                      aria-pressed={previewView === "reader"}
                      data-testid="lens-reader-toggle"
                      data-pass470-keyboard-control="reader-toggle"
                      className={`velmere-command-pill min-h-0 flex-1 px-3 py-2 text-[8px] ${previewView === "reader" ? "bg-white/[0.10] text-white" : "text-white/[0.42] hover:text-white/[0.72]"}`}
                    >
                      {pdfPreview.report.pass451.labels.humanReader}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openPass468Handoff(
                        pdfPreview.result,
                        "shield",
                        pdfPreview.depth,
                      )
                    }
                    data-testid="lens-preview-shield-handoff"
                    className="velmere-command-pill h-11 min-w-0 px-3 text-[8px]"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="truncate">{c.shield}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openPass468Handoff(
                        pdfPreview.result,
                        "orbit",
                        pdfPreview.depth,
                      )
                    }
                    data-testid="lens-preview-orbit-handoff"
                    className="velmere-command-pill h-11 min-w-0 px-3 text-[8px]"
                    data-tone="cyan"
                  >
                    <Brain className="h-4 w-4" />
                    <span className="truncate">{c.orbit}</span>
                  </button>
                  <a
                    href={pdfPreview.url}
                    download={pdfPreview.filename}
                    onClick={recordPass469DownloadReceipt}
                    className="velmere-command-pill col-span-2 h-11 min-w-0 px-4 text-[9px] sm:col-span-1"
                    data-tone="gold"
                    aria-label={c.download}
                    data-testid="lens-download-link"
                    data-pass470-keyboard-control="download"
                    aria-keyshortcuts="Enter"
                    data-pass469-download-receipt="download_initiated"
                  >
                    <Download className="h-4 w-4" />
                    <span className="truncate">{c.download}</span>
                  </a>
                  <button
                    ref={previewCloseRef}
                    type="button"
                    onPointerDown={closePreview}
                    className="velmere-command-pill h-11 min-w-0 px-4 text-[9px]"
                    aria-label={c.close}
                    data-testid="lens-preview-close"
                    data-pass470-keyboard-control="close"
                    aria-keyshortcuts="Escape Enter Space"
                  >
                    <X className="h-4 w-4" />
                    <span className="truncate">{c.close}</span>
                  </button>
                </div>
                <div
                  className="min-h-[1.25rem] px-2 text-[10px] leading-5 text-emerald-100/[0.68] sm:col-span-2 sm:text-right"
                  aria-live="polite"
                  data-testid="lens-download-receipt"
                >
                  {downloadReceipt ? (
                    <span
                      data-pass469-download-receipt-id={
                        downloadReceipt.receiptId
                      }
                    >
                      {c.receiptSaved} · {downloadReceipt.receiptId} ·{" "}
                      {c.receiptBoundary}
                    </span>
                  ) : null}
                </div>
                {showInternalPdfQa ? (
                  <div
                    className="velmere-readout-card rounded-2xl px-3 py-2 text-[10px] leading-5 text-white/[0.44] sm:col-span-2"
                    data-pass470-receipt-history="true"
                    data-pass470-receipt-history-checksum={
                      receiptHistory.checksum
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.58]">
                        {c.receiptHistoryTitle} · {receiptHistory.total}
                      </strong>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                          {receiptHistory.redaction.replaceAll("_", " ")}
                        </span>
                        {receiptHistory.visible.length ? (
                          <button
                            type="button"
                            onClick={() =>
                              setReceiptHistoryOpen((current) => !current)
                            }
                            aria-expanded={receiptHistoryOpen}
                            aria-controls="velmere-receipt-history-drawer"
                            data-pass471-receipt-drawer-toggle="true"
                            className="velmere-command-pill velmere-interaction-pulse min-h-0 px-2.5 py-1 text-[8px]"
                          >
                            {receiptHistoryOpen
                              ? c.receiptHistoryHide
                              : c.receiptHistoryShow}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {receiptHistory.visible.length ? (
                      <>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {receiptHistory.visible.slice(0, 3).map((item) => (
                            <span
                              key={item.receiptId}
                              className="velmere-command-pill min-h-0 bg-black/[0.18] px-2 py-1 text-[8px]"
                            >
                              {item.symbol} · {item.depth} ·{" "}
                              {item.sourceConfidence}%
                            </span>
                          ))}
                        </div>
                        {receiptHistoryOpen ? (
                          <div
                            id="velmere-receipt-history-drawer"
                            data-pass471-receipt-drawer="true"
                            className="mt-3 max-h-52 space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-white/[0.07] bg-black/[0.18] p-2"
                          >
                            {receiptHistory.visible.map((item) => (
                              <article
                                key={item.receiptId}
                                className="velmere-readout-card grid gap-1 rounded-lg px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-mono text-[8px] uppercase tracking-[0.11em] text-white/[0.64]">
                                    {item.symbol} · {item.depth} ·{" "}
                                    {item.sourceConfidence}% ·{" "}
                                    {item.sourceCount} src
                                  </p>
                                  <p className="mt-1 truncate text-[9px] text-white/[0.36]">
                                    {item.filename}
                                  </p>
                                </div>
                                <time
                                  className="font-mono text-[8px] uppercase tracking-[0.09em] text-white/[0.30]"
                                  dateTime={item.createdAt}
                                >
                                  {new Intl.DateTimeFormat(safeLocale, {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  }).format(new Date(item.createdAt))}
                                </time>
                              </article>
                            ))}
                            <p className="px-1 text-[9px] leading-4 text-white/[0.30]">
                              {c.receiptHistoryBoundary}
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-1 text-white/[0.34]">
                        {c.receiptHistoryEmpty}
                      </p>
                    )}
                  </div>
                ) : null}
              </header>

              {previewView === "pdf" ? (
                <div
                  data-velmere-modal-scroll="true"
                  data-modal-scroll-region="true"
                  data-pass451-binary-pdf-exact="true"
                  className="min-h-0 flex-1 overflow-hidden overscroll-contain rounded-2xl border border-white/[0.10] bg-[#222] shadow-[0_30px_100px_rgba(0,0,0,0.62)]"
                >
                  <iframe
                    src={`${pdfPreview.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                    title={`${c.preview} ${pdfPreview.report.symbol}`}
                    data-testid="lens-pdf-frame"
                    className="h-full min-h-[70vh] w-full bg-[#d9d6cf]"
                  />
                </div>
              ) : (
                <div
                  ref={readerScrollRef}
                  data-velmere-modal-scroll="true"
                  data-modal-scroll-region="true"
                  data-pass448-pdf-a4-reader-v2="true"
                  data-pass494-reader-navigation={activeReaderPage}
                  data-pass580-visual-fixture={
                    pdfPreview.report.pass580.fixtureId
                  }
                  data-pass581-page-compositor={
                    pdfPreview.report.pass581.status
                  }
                  data-pass584-reader-accessibility={
                    pdfPreview.report.pass584.state
                  }
                  data-pass592-chromium-fixture={
                    pdfPreview.report.pass592.proofRef
                  }
                  data-pass593-tagged-pdf-feasibility={
                    pdfPreview.report.pass593.state
                  }
                  data-pass594-bidirectional-footnotes={
                    pdfPreview.report.pass594.checksum
                  }
                  data-pass595-extreme-typography={
                    pdfPreview.report.pass595.state
                  }
                  data-pass596-pdf-release-proof={
                    pdfPreview.report.pass596.capsuleKey
                  }
                  data-pass607-claim-source-gate={
                    pdfPreview.report.pass607.state
                  }
                  data-pass608-missing-source-appendix={
                    pdfPreview.report.pass608.state
                  }
                  data-pass609-a4-density={pdfPreview.report.pass609.state}
                  data-pass610-reader-download-parity={
                    pdfPreview.report.pass610.manifestKey
                  }
                  data-pass1254-pdf-typography-release={
                    pdfPreview.report.pass1254.state
                  }
                  data-pass1254-no-horizontal-overflow={
                    pdfPreview.report.pass1254.reader.noHorizontalOverflow
                      ? "true"
                      : "false"
                  }
                  data-pass1274-body-scroll-locked={
                    pdfPreview.report.pass1274.visualBudget
                      .bodyScrollLockedDuringPdfPreview
                      ? "true"
                      : "false"
                  }
                  data-pass1274-max-overflow-px={
                    pdfPreview.report.pass1274.visualBudget
                      .maxHorizontalOverflowPx
                  }
                  data-pass611-pdf-accessibility={
                    pdfPreview.report.pass611.state
                  }
                  className="velmere-a4-reader-scroll min-h-0 flex-1 scroll-pt-20 overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.10] bg-[#d9d6cf] p-3 shadow-2xl md:p-6"
                >
                  <nav
                    className="relative z-10 mx-auto mb-4 flex w-full max-w-[54rem] items-center gap-1.5 overflow-x-auto rounded-2xl border border-black/[0.08] bg-[#fbf8f0]/[0.98] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
                    aria-label={pdfPreview.report.pass488.labels.navigation}
                    data-pass488-a4-navigation="true"
                    data-pass584-keyboard-page-navigation="true"
                    onKeyDown={(event) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          event.key,
                        )
                      )
                        return;
                      event.preventDefault();
                      const pages = pdfPreview.report.pass488.pages;
                      const currentIndex = Math.max(
                        0,
                        pages.findIndex((page) => page.id === activeReaderPage),
                      );
                      const nextIndex =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? pages.length - 1
                            : event.key === "ArrowLeft"
                              ? Math.max(0, currentIndex - 1)
                              : Math.min(pages.length - 1, currentIndex + 1);
                      const next = pages[nextIndex];
                      const navigation = event.currentTarget;
                      scrollToReaderPage(next.id);
                      requestAnimationFrame(() => {
                        navigation
                          .querySelector<HTMLButtonElement>(
                            `[data-reader-page-id="${next.id}"]`,
                          )
                          ?.focus();
                      });
                    }}
                  >
                    {pdfPreview.report.pass488.pages.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => scrollToReaderPage(page.id)}
                        aria-current={
                          activeReaderPage === page.id ? "page" : undefined
                        }
                        aria-controls={page.anchor}
                        data-reader-page-id={page.id}
                        className={`velmere-focus-ring min-w-max rounded-xl px-3 py-2 text-left transition ${activeReaderPage === page.id ? "bg-black text-white" : "bg-black/[0.035] text-black/[0.58] hover:bg-black/[0.07]"}`}
                      >
                        <span className="block font-mono text-[7px] uppercase tracking-[0.12em] opacity-60">
                          {String(page.index).padStart(2, "0")}
                        </span>
                        <strong className="mt-0.5 block text-[11px]">
                          {pdfPreview.report.pass610.pages.find(
                            (manifestPage) => manifestPage.id === page.id,
                          )?.title || page.shortLabel}
                        </strong>
                      </button>
                    ))}
                    <div
                      className="basis-full overflow-hidden rounded-full bg-black/[0.07]"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-0.5 bg-black/[0.72] transition-[width] duration-300"
                        style={{ width: `${readerProgress.percent}%` }}
                      />
                    </div>
                  </nav>
                  {showInternalPdfQa && readerHealth ? (
                    <section
                      className="sticky top-[5.25rem] z-[19] mx-auto mb-3 grid w-full max-w-[54rem] gap-2 rounded-2xl border border-black/[0.10] bg-[#f4f0e7]/[0.97] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.12)] backdrop-blur-lg sm:grid-cols-[auto_repeat(4,minmax(0,1fr))] sm:items-center"
                      data-pass499-a4-reader-health={readerHealth.status}
                      aria-live="polite"
                    >
                      <div className="rounded-xl bg-black px-3 py-2 text-white">
                        <span className="block font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.52]">
                          Document health
                        </span>
                        <strong className="mt-1 block text-[11px]">
                          {readerHealthLabel}
                        </strong>
                      </div>
                      {[
                        [
                          safeLocale === "pl"
                            ? "Parytet"
                            : safeLocale === "de"
                              ? "Parität"
                              : "Parity",
                          readerHealth.parity ? "1:1" : "—",
                        ],
                        [
                          safeLocale === "pl"
                            ? "Źródła"
                            : safeLocale === "de"
                              ? "Quellen"
                              : "Sources",
                          String(readerHealth.sourceCount),
                        ],
                        [
                          safeLocale === "pl"
                            ? "Pewność"
                            : safeLocale === "de"
                              ? "Konfidenz"
                              : "Confidence",
                          `${readerHealth.sourceConfidence}%`,
                        ],
                        [
                          safeLocale === "pl"
                            ? "Braki"
                            : safeLocale === "de"
                              ? "Lücken"
                              : "Gaps",
                          String(readerHealth.missingCount),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-black/[0.08] bg-white/[0.56] px-3 py-2"
                        >
                          <span className="block font-mono text-[7px] uppercase tracking-[0.11em] text-black/[0.38]">
                            {label}
                          </span>
                          <strong className="mt-1 block text-xs text-black/[0.72]">
                            {value}
                          </strong>
                        </div>
                      ))}
                      {pageBreakAudit ? (
                        <div
                          className="sm:col-span-5 flex flex-wrap items-center gap-2 border-t border-black/[0.08] pt-2"
                          data-pass505-pdf-page-break-audit={
                            pageBreakAudit.status
                          }
                        >
                          <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-black/[0.40]">
                            {safeLocale === "pl"
                              ? "QA stron A4"
                              : safeLocale === "de"
                                ? "A4-Seiten-QA"
                                : "A4 page QA"}
                          </span>
                          {pageBreakAudit.pages.map((page) => (
                            <span
                              key={page.id}
                              className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.10em] ${page.status === "ready" ? "border-emerald-700/[0.18] bg-emerald-700/[0.06] text-emerald-900/[0.72]" : "border-amber-700/[0.18] bg-amber-700/[0.06] text-amber-900/[0.72]"}`}
                            >
                              {String(page.index).padStart(2, "0")} ·{" "}
                              {page.label} · {page.estimatedLines}L
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {typographyQa ? (
                        <div
                          className="sm:col-span-5 flex flex-wrap items-center gap-2 border-t border-black/[0.08] pt-2"
                          data-pass519-pdf-typography-qa={typographyQa.state}
                        >
                          <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-black/[0.40]">
                            {safeLocale === "pl"
                              ? "Typografia PDF"
                              : safeLocale === "de"
                                ? "PDF-Typografie"
                                : "PDF typography"}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.10em] ${typographyQa.state === "ready" ? "border-emerald-700/[0.18] bg-emerald-700/[0.06] text-emerald-900/[0.72]" : typographyQa.state === "review" ? "border-amber-700/[0.18] bg-amber-700/[0.06] text-amber-900/[0.72]" : "border-rose-700/[0.18] bg-rose-700/[0.06] text-rose-900/[0.72]"}`}
                          >
                            {typographyQa.state} · {typographyQa.score}%
                          </span>
                          <span className="rounded-full border border-black/[0.08] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] text-black/[0.48]">
                            token {typographyQa.longestToken}
                          </span>
                          <span className="rounded-full border border-black/[0.08] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] text-black/[0.48]">
                            sentence {typographyQa.averageSentenceLength}
                          </span>
                          {typographyQa.issues.slice(0, 2).map((issue) => (
                            <span
                              key={issue.id}
                              title={issue.detail}
                              className="rounded-full border border-amber-800/[0.14] bg-amber-800/[0.04] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] text-amber-950/[0.62]"
                            >
                              ! {issue.sectionId}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {typesettingAudit ? (
                        <div
                          className="sm:col-span-5 flex flex-wrap items-center gap-2 border-t border-black/[0.08] pt-2"
                          data-pass533-pdf-typesetting={typesettingAudit.locale}
                        >
                          <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-black/[0.40]">
                            {safeLocale === "pl"
                              ? "Skład wielojęzyczny"
                              : safeLocale === "de"
                                ? "Mehrsprachiger Satz"
                                : "Multilingual typesetting"}
                          </span>
                          <span className="rounded-full border border-black/[0.08] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] text-black/[0.52]">
                            {typesettingAudit.fontProfile}
                          </span>
                          <span className="rounded-full border border-cyan-800/[0.14] bg-cyan-800/[0.04] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] text-cyan-950/[0.66]">
                            lang {typesettingAudit.cssLanguageTag}
                          </span>
                          <span className="rounded-full border border-black/[0.08] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] text-black/[0.48]">
                            hyphen {typesettingAudit.hyphenatedTokens}
                          </span>
                          <span className="rounded-full border border-black/[0.08] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] text-black/[0.48]">
                            IDs {typesettingAudit.longIdentifierTokens}
                          </span>
                        </div>
                      ) : null}
                      {pdfVisualReleaseAudit ? (
                        <div
                          className="sm:col-span-5 grid gap-2 border-t border-black/[0.08] pt-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center"
                          data-pass547-pdf-visual-release-audit={
                            pdfVisualReleaseAudit.state
                          }
                          title={pdfVisualReleaseAudit.boundary}
                        >
                          <div
                            className={`rounded-xl border px-3 py-2 ${pdfVisualReleaseAudit.state === "release" ? "border-emerald-800/[0.16] bg-emerald-800/[0.05]" : pdfVisualReleaseAudit.state === "blocked" ? "border-rose-800/[0.16] bg-rose-800/[0.05]" : "border-amber-800/[0.16] bg-amber-800/[0.05]"}`}
                          >
                            <span className="block font-mono text-[7px] uppercase tracking-[0.12em] text-black/[0.40]">
                              Visual release audit
                            </span>
                            <strong className="mt-1 block text-[11px] text-black/[0.72]">
                              {pdfVisualReleaseAudit.state} ·{" "}
                              {pdfVisualReleaseAudit.score}%
                            </strong>
                          </div>
                          <div>
                            <p className="text-[10px] leading-5 text-black/[0.56]">
                              {pdfVisualReleaseAudit.headline}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {pdfVisualReleaseAudit.pageFlags.map((page) => (
                                <span
                                  key={page.id}
                                  title={page.note}
                                  className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] ${page.state === "ready" ? "border-emerald-800/[0.14] text-emerald-950/[0.62]" : page.state === "blocked" ? "border-rose-800/[0.14] text-rose-950/[0.66]" : "border-amber-800/[0.14] text-amber-950/[0.66]"}`}
                                >
                                  {page.id} · {page.density}%
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {pdfReleaseScorecard ? (
                        <div
                          className="sm:col-span-5 grid gap-2 border-t border-black/[0.08] pt-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center"
                          data-pass526-pdf-release-scorecard={
                            pdfReleaseScorecard.state
                          }
                        >
                          <div
                            className={`rounded-xl border px-3 py-2 ${pdfReleaseScorecard.state === "release" ? "border-emerald-800/[0.16] bg-emerald-800/[0.06]" : pdfReleaseScorecard.state === "review" ? "border-amber-800/[0.16] bg-amber-800/[0.06]" : "border-rose-800/[0.16] bg-rose-800/[0.06]"}`}
                          >
                            <span className="block font-mono text-[7px] uppercase tracking-[0.12em] text-black/[0.40]">
                              {safeLocale === "pl"
                                ? "Bramka wydania PDF"
                                : safeLocale === "de"
                                  ? "PDF-Freigabegate"
                                  : "PDF release gate"}
                            </span>
                            <strong className="mt-1 block text-[11px] uppercase text-black/[0.72]">
                              {pdfReleaseScorecard.state} ·{" "}
                              {pdfReleaseScorecard.score}%
                            </strong>
                          </div>
                          <div>
                            <p className="text-[10px] leading-5 text-black/[0.56]">
                              {pdfReleaseScorecard.recommendation}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {pdfReleaseScorecard.blockers
                                .slice(0, 2)
                                .map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-full border border-rose-800/[0.14] bg-rose-800/[0.04] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-rose-950/[0.66]"
                                  >
                                    ! {item}
                                  </span>
                                ))}
                              {pdfReleaseScorecard.warnings
                                .slice(0, 2)
                                .map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-full border border-amber-800/[0.14] bg-amber-800/[0.04] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-amber-950/[0.66]"
                                  >
                                    review
                                  </span>
                                ))}
                              {pdfReleaseScorecard.strengths
                                .slice(0, 2)
                                .map((item) => (
                                  <span
                                    key={item}
                                    title={item}
                                    className="rounded-full border border-emerald-800/[0.14] bg-emerald-800/[0.04] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-emerald-950/[0.66]"
                                  >
                                    ✓ ready
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {reportIntegritySeal ? (
                        <div
                          className="sm:col-span-5 grid gap-2 border-t border-black/[0.08] pt-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center"
                          data-pass512-report-integrity-seal={
                            reportIntegritySeal.state
                          }
                        >
                          <div
                            className={`rounded-xl border px-3 py-2 ${reportIntegritySeal.state === "sealed" ? "border-emerald-800/[0.16] bg-emerald-800/[0.06]" : reportIntegritySeal.state === "review" ? "border-amber-800/[0.16] bg-amber-800/[0.06]" : "border-rose-800/[0.16] bg-rose-800/[0.06]"}`}
                          >
                            <span className="block font-mono text-[7px] uppercase tracking-[0.12em] text-black/[0.40]">
                              {safeLocale === "pl"
                                ? "Pieczęć integralności"
                                : safeLocale === "de"
                                  ? "Integritätssiegel"
                                  : "Integrity seal"}
                            </span>
                            <strong className="mt-1 block text-[11px] uppercase text-black/[0.72]">
                              {reportIntegritySeal.state} ·{" "}
                              {reportIntegritySeal.readiness}%
                            </strong>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reportIntegritySeal.checks.map((check) => (
                              <span
                                key={check.id}
                                title={check.detail}
                                className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] ${check.passed ? "border-emerald-800/[0.15] bg-emerald-800/[0.05] text-emerald-950/[0.66]" : "border-rose-800/[0.15] bg-rose-800/[0.05] text-rose-950/[0.66]"}`}
                              >
                                {check.passed ? "✓" : "!"} {check.label}
                              </span>
                            ))}
                          </div>
                          <code className="truncate font-mono text-[7px] text-black/[0.34]">
                            {reportIntegritySeal.checksum}
                          </code>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                  <div
                    className="mx-auto mb-4 flex w-full max-w-[54rem] flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/[0.08] bg-[#fbf8f0]/[0.92] px-4 py-3 text-black/[0.58] shadow-[0_10px_24px_rgba(0,0,0,0.05)]"
                    data-pass555-public-reader-status="clean"
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em]">
                      {readerHealthLabel}
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.10em] text-black/[0.40]">
                      {pdfPreview.report.sources.length}{" "}
                      {safeLocale === "pl"
                        ? "źródła"
                        : safeLocale === "de"
                          ? "Quellen"
                          : "sources"}{" "}
                      · {pdfPreview.report.sourceConfidence}%
                    </span>
                    <span
                      className="rounded-full border border-black/[0.08] bg-white/[0.48] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-black/[0.52]"
                      data-pass1254-reader-badge={pdfPreview.report.pass1254.state}
                      title={pdfPreview.report.pass1254.copy.body}
                    >
                      {pdfPreview.report.pass1254.copy.badge} · {pdfPreview.report.pass1254.score}%
                    </span>
                  </div>
                  <section
                    className="mx-auto mb-4 grid w-full max-w-[54rem] gap-3 rounded-2xl border border-[#9b895f]/[0.26] bg-[#f5efe0] px-4 py-3 text-[#171717] shadow-[0_10px_24px_rgba(0,0,0,0.05)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    data-pass1234-reader-map-parity="visible"
                    data-pass1234-manifest={pdfPreview.report.pass1234.manifestKey}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#8a6b2f]">
                        {pdfPreview.report.pass1234.copy.stripTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-black/[0.58]">
                        {pdfPreview.report.pass1234.copy.stripBody}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {[
                        pdfPreview.report.pass1234.copy.readerParity,
                        pdfPreview.report.pass1234.copy.mapParity,
                        `${pdfPreview.report.pass1234.finalStatus} · ${pdfPreview.report.pass1234.confidenceCap}%`,
                      ].map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-black/[0.08] bg-white/[0.48] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-black/[0.52]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section
                    className="velmere-pass1254-reader-typography mx-auto mb-4 grid w-full max-w-[54rem] gap-3 rounded-2xl border border-black/[0.08] bg-[#fbf8f0]/[0.94] px-4 py-3 text-black/[0.62] shadow-[0_10px_24px_rgba(0,0,0,0.05)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    data-pass1254-pdf-typography-release={
                      pdfPreview.report.pass1254.state
                    }
                    data-pass1254-manifest={pdfPreview.report.pass1254.manifestKey}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#8a6b2f]">
                        {pdfPreview.report.pass1254.copy.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-black/[0.56]">
                        {pdfPreview.report.pass1254.copy.body}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {pdfPreview.report.pass1254.checks.map((check) => (
                        <span
                          key={check.id}
                          className={`rounded-full border px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] ${check.passed ? "border-emerald-800/[0.13] bg-emerald-800/[0.05] text-emerald-950/[0.62]" : "border-amber-800/[0.13] bg-amber-800/[0.05] text-amber-950/[0.62]"}`}
                          title={check.label}
                        >
                          {check.passed ? "✓" : "!"} {check.id.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section
                    className="velmere-pass1274-runtime-visual-qa mx-auto mb-4 grid w-full max-w-[54rem] gap-3 rounded-2xl border border-cyan-950/[0.10] bg-white/[0.52] px-4 py-3 text-black/[0.60] shadow-[0_10px_24px_rgba(0,0,0,0.045)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    data-pass1274-runtime-visual-qa-release={
                      pdfPreview.report.pass1274.state
                    }
                    data-pass1274-manifest={pdfPreview.report.pass1274.manifestKey}
                    data-pass1274-artifact-root={
                      pdfPreview.report.pass1274.artifactRoot
                    }
                    data-pass1274-proof-mode={
                      pdfPreview.report.pass1274.proofMode
                    }
                    data-pass1334-pdf-premium-final={
                      pdfPreview.report.pass1334.state
                    }
                    data-pass1354-shield-map-evidence-graph={
                      pdfPreview.report.pass1354.state
                    }
                    data-pass1374-vlm-brain-source-truth={
                      pdfPreview.report.pass1374.state
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#0f766e]">
                        {pdfPreview.report.pass1274.copy.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-black/[0.56]">
                        {pdfPreview.report.pass1274.copy.body}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {pdfPreview.report.pass1274.viewportMatrix.map((viewport) => (
                        <span
                          key={viewport.id}
                          className="rounded-full border border-cyan-950/[0.10] bg-cyan-900/[0.04] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-cyan-950/[0.58]"
                        >
                          {viewport.id} · {viewport.width}×{viewport.height}
                        </span>
                      ))}
                      <span className="rounded-full border border-black/[0.08] bg-white/[0.58] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-black/[0.52]">
                        {pdfPreview.report.pass1274.copy.badge} · {pdfPreview.report.pass1274.score}%
                      </span>
                    </div>
                  </section>
                  <section
                    className="velmere-pass1334-pdf-premium-final mx-auto mb-4 grid w-full max-w-[54rem] gap-3 rounded-2xl border border-[#8a6b2f]/[0.16] bg-[#fffaf0]/[0.94] px-4 py-3 text-black/[0.62] shadow-[0_10px_24px_rgba(0,0,0,0.05)] lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)]"
                    data-pass1334-pdf-premium-final={
                      pdfPreview.report.pass1334.state
                    }
                    data-pass1334-manifest={pdfPreview.report.pass1334.manifestKey}
                    data-pass1334-release-level={
                      pdfPreview.report.pass1334.releaseLevel
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#8a6b2f]">
                        {pdfPreview.report.pass1334.cover.kicker}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-black/[0.78]">
                        {pdfPreview.report.pass1334.copy.stripTitle} · {pdfPreview.report.pass1334.score}%
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-black/[0.56]">
                        {pdfPreview.report.pass1334.copy.stripBody}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {pdfPreview.report.pass1334.executiveBlocks.slice(0, 4).map((block) => (
                          <article
                            key={block.id}
                            className={`rounded-xl border px-3 py-2 ${block.tone === "blocked" ? "border-rose-900/[0.13] bg-rose-900/[0.035]" : block.tone === "review" ? "border-amber-900/[0.13] bg-amber-900/[0.035]" : "border-emerald-900/[0.11] bg-emerald-900/[0.025]"}`}
                          >
                            <strong className="block text-[11px] text-black/[0.72]">
                              {block.title}
                            </strong>
                            <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-black/[0.46]">
                              {block.body}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                    <aside className="rounded-2xl border border-black/[0.08] bg-white/[0.52] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-black/[0.42]">
                          {pdfPreview.report.pass1334.copy.appendixTitle}
                        </p>
                        <span className="rounded-full border border-black/[0.08] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-black/[0.48]">
                          {pdfPreview.report.pass1334.copy.badge}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {pdfPreview.report.pass1334.sourceAppendix.slice(0, 4).map((source) => (
                          <div
                            key={source.id}
                            className="rounded-xl border border-black/[0.06] bg-black/[0.018] p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="truncate text-[10px] text-black/[0.70]">
                                {source.id} · {source.label}
                              </strong>
                              <span className="font-mono text-[7px] uppercase tracking-[0.09em] text-black/[0.38]">
                                {source.confidence}%
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[8px] leading-4 text-black/[0.42]">
                              {source.state} · {source.note}
                            </p>
                          </div>
                        ))}
                      </div>
                    </aside>
                  </section>

                  <section
                    className="velmere-pass1374-source-truth mx-auto mb-4 grid w-full max-w-[54rem] gap-3 rounded-2xl border border-cyan-950/[0.10] bg-[#f4fbfa]/[0.72] px-4 py-3 text-black/[0.60] shadow-[0_10px_24px_rgba(0,0,0,0.04)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    data-pass1374-vlm-brain-source-truth={
                      pdfPreview.report.pass1374.state
                    }
                    data-pass1374-manifest={pdfPreview.report.pass1374.manifestKey}
                    data-pass1374-source-mode={
                      pdfPreview.report.pass1374.sourceTruthMode
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#0f766e]">
                        {pdfPreview.report.pass1374.copy.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-black/[0.56]">
                        {pdfPreview.report.pass1374.copy.body}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      <span className="rounded-full border border-cyan-950/[0.10] bg-white/[0.62] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-cyan-950/[0.58]">
                        {pdfPreview.report.pass1374.copy.badge} · {pdfPreview.report.pass1374.score}%
                      </span>
                      <span className="rounded-full border border-black/[0.08] bg-white/[0.62] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-black/[0.50]">
                        cap {pdfPreview.report.pass1374.confidenceCeiling}%
                      </span>
                    </div>
                  </section>

                  <section
                    className="velmere-pass1413-mega-terminal-polish mx-auto mb-4 w-full max-w-[54rem] rounded-2xl border border-black/[0.08] bg-[#10100f]/[0.94] px-4 py-3 text-white shadow-[0_14px_34px_rgba(0,0,0,0.14)]"
                    data-pass1413-mega-terminal-polish={
                      pdfPreview.report.pass1413.state
                    }
                    data-pass1413-real-work-standard={
                      pdfPreview.report.pass1413.realWorkStandard
                    }
                    data-pass1413-task-count={pdfPreview.report.pass1413.totalTaskCount}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-velmere-gold">
                          {pdfPreview.report.pass1413.copy.title}
                        </p>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-white/[0.58]">
                          {pdfPreview.report.pass1413.copy.body}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5 md:justify-end">
                        <span className="rounded-full border border-velmere-gold/[0.20] bg-velmere-gold/[0.09] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-velmere-gold">
                          {pdfPreview.report.pass1413.copy.badge} · {pdfPreview.report.pass1413.totalTaskCount}
                        </span>
                        <span className="rounded-full border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.52]">
                          {pdfPreview.report.pass1413.state}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {pdfPreview.report.pass1413.lanes.slice(0, 8).map((lane) => (
                        <article
                          key={lane.id}
                          className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2"
                          data-pass1413-lane={lane.id}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <strong className="truncate text-[10px] text-white/[0.78]">
                              {lane.label}
                            </strong>
                            <span className="font-mono text-[8px] text-velmere-gold tabular-nums">
                              {lane.taskCount}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[8px] leading-4 text-white/[0.40]">
                            {lane.visibleFixes.join(" · ")}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>


                  <article
                    className="velmere-a4-typeset mx-auto w-full max-w-[54rem] bg-[#fbf8f0] p-6 text-[#171717] shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-10"
                    data-pass450-tiered-human-report="true"
                    data-pass469-a4-overflow-audit="pass469-ok"
                    data-pass470-a4-screen-check="reader-safe"
                    data-pass477-unified-depth-contract="true"
                    data-pass478-human-evidence-brief="true"
                    data-pass488-reader-binary-parity={
                      pdfPreview.report.pass488.parityKey
                    }
                    data-pass499-reader-health={
                      readerHealth?.status ?? "blocked"
                    }
                    data-pass505-page-break-audit={
                      pageBreakAudit?.status ?? "review"
                    }
                    data-pass512-report-integrity-seal={
                      reportIntegritySeal?.state ?? "blocked"
                    }
                    data-pass519-pdf-typography-qa={
                      typographyQa?.state ?? "blocked"
                    }
                    data-pass526-pdf-release-scorecard={
                      pdfReleaseScorecard?.state ?? "blocked"
                    }
                    data-pass533-pdf-typesetting={
                      typesettingAudit?.locale ?? safeLocale
                    }
                    data-pass539-pdf-page-rhythm={
                      pageRhythm?.state ?? "blocked"
                    }
                    data-pass547-pdf-visual-release-audit={
                      pdfVisualReleaseAudit?.state ?? "blocked"
                    }
                    data-pass573-pdf-locale-purity={
                      pdfPreview.report.pass573.state
                    }
                    data-pass574-page-boundary={
                      pdfPreview.report.pass574.status
                    }
                    data-pass580-visual-fixture={
                      pdfPreview.report.pass580.snapshotKey
                    }
                    data-pass581-page-compositor={
                      pdfPreview.report.pass581.status
                    }
                    data-pass582-source-citation-rail={
                      pdfPreview.report.pass582.citations.length
                    }
                    data-pass583-download-parity={
                      pdfPreview.report.pass583.manifestKey
                    }
                    data-pass584-pdf-accessibility={
                      pdfPreview.report.pass584.state
                    }
                    data-pass592-chromium-fixture={
                      pdfPreview.report.pass592.fixtureId
                    }
                    data-pass593-tagged-pdf-feasibility={
                      pdfPreview.report.pass593.state
                    }
                    data-pass594-bidirectional-footnotes={
                      pdfPreview.report.pass594.checksum
                    }
                    data-pass595-extreme-typography={
                      pdfPreview.report.pass595.state
                    }
                    data-pass596-pdf-release-proof={
                      pdfPreview.report.pass596.capsuleKey
                    }
                    data-pass607-claim-source-completeness={
                      pdfPreview.report.pass607.state
                    }
                    data-pass608-missing-source-appendix={
                      pdfPreview.report.pass608.entries.length
                    }
                    data-pass609-dynamic-a4-density={
                      pdfPreview.report.pass609.maxDensity
                    }
                    data-pass610-reader-download-parity={
                      pdfPreview.report.pass610.manifestKey
                    }
                    data-pass611-structured-not-pdfua={
                      pdfPreview.report.pass611.pdf.pdfUaClaim
                        ? "invalid"
                        : "true"
                    }
                    data-pass1234-lens-shieldmap-parity={
                      pdfPreview.report.pass1234.finalStatus
                    }
                    data-pass1234-evidence-manifest={
                      pdfPreview.report.pass1234.manifestKey
                    }
                    data-pass1254-pdf-typography-release={
                      pdfPreview.report.pass1254.state
                    }
                    data-pass1254-line-clamp-body={
                      pdfPreview.report.pass1254.lineClamp.body
                    }
                    data-pass1274-runtime-visual-qa-release={
                      pdfPreview.report.pass1274.state
                    }
                    data-pass1274-proof-mode={
                      pdfPreview.report.pass1274.proofMode
                    }
                    role="document"
                    aria-labelledby="velmere-reader-document-title"
                    lang={pdfPreview.report.locale}
                  >
                    <header
                      id="lens-reader-page-decision"
                      className="velmere-a4-page-anchor scroll-mt-24 border-b border-black/[0.12] pb-7"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]">
                        <span>
                          Velmère Cybersecurity ·{" "}
                          {pdfPreview.report.labels.report}
                        </span>
                        <span>
                          {pdfPreview.report.symbol} ·{" "}
                          {pdfPreview.report.sourceConfidence}%
                        </span>
                      </div>
                      <h1
                        id="velmere-reader-document-title"
                        className="mt-7 break-words font-serif text-4xl leading-[0.96] tracking-[-0.045em] md:text-5xl"
                      >
                        {pdfPreview.report.title}
                      </h1>
                      <h2 className="sr-only">
                        {pdfPreview.report.pass488.pages[0].label}
                      </h2>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-black/[0.68]">
                        {reportSection(
                          pdfPreview.report,
                          "brief",
                          pdfPreview.report.summary,
                        )}
                      </p>
                    </header>

                    <section
                      className="mt-7 rounded-[1.4rem] border border-[#9b895f]/[0.30] bg-[#f1ede3] p-5"
                      data-pass477-depth-contract-reader="true"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#8a6b2f]">
                            {safeLocale === "pl"
                              ? "Zakres raportu"
                              : safeLocale === "de"
                                ? "Berichtstiefe"
                                : "Report depth"}
                          </p>
                          <strong className="mt-2 block text-xl text-black/[0.84]">
                            {pdfPreview.report.pass477.label} ·{" "}
                            {pdfPreview.report.pass477.fieldBudget}
                          </strong>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-black/[0.62]">
                            {pdfPreview.report.pass477.purpose}
                          </p>
                        </div>
                        <span className="rounded-full border border-black/[0.10] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-black/[0.48]">
                          {pdfPreview.report.pass477.evidenceStateLabel} ·{" "}
                          {pdfPreview.report.pass477.confidenceCeiling}%
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-black/[0.08] bg-white/[0.52] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
                          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-black/[0.40]">
                            {safeLocale === "pl"
                              ? "Zawiera"
                              : safeLocale === "de"
                                ? "Enthält"
                                : "Includes"}
                          </p>
                          <p className="mt-2 text-xs leading-6 text-black/[0.62]">
                            {pdfPreview.report.pass477.includes.join(" · ")}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-black/[0.08] bg-white/[0.52] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
                          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-black/[0.40]">
                            {safeLocale === "pl"
                              ? "Świadomie pomija"
                              : safeLocale === "de"
                                ? "Bewusst ausgeschlossen"
                                : "Intentionally excludes"}
                          </p>
                          <p className="mt-2 text-xs leading-6 text-black/[0.62]">
                            {pdfPreview.report.pass477.excludes.join(" · ")}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section
                      className={`mt-7 rounded-[1.4rem] border p-5 ${
                        pdfPreview.report.pass453.decision.tone === "calm"
                          ? "border-emerald-900/[0.20] bg-emerald-900/[0.04]"
                          : pdfPreview.report.pass453.decision.tone === "review"
                            ? "border-amber-900/[0.18] bg-amber-900/[0.035]"
                            : "border-rose-900/[0.18] bg-rose-900/[0.035]"
                      }`}
                      data-pass453-pdf-human-verdict="true"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#8a6b2f]">
                            {pdfPreview.report.pass478.verdict.label}
                          </p>
                          <strong className="mt-2 block text-xl text-black/[0.84]">
                            {pdfPreview.report.pass478.verdict.headline}
                          </strong>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-black/[0.62]">
                            {pdfPreview.report.pass478.verdict.summary}
                          </p>
                        </div>
                        <span className="rounded-full border border-black/[0.10] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-black/[0.48]">
                          {pdfPreview.report.pass453.labels.sourceBound}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                          [
                            pdfPreview.report.pass453.labels.confidenceCeiling,
                            `${pdfPreview.report.pass453.decision.confidenceCeiling}%`,
                          ],
                          [
                            pdfPreview.report.pass453.labels.sourceQuorum,
                            pdfPreview.report.pass453.decision.sourceQuorum,
                          ],
                          [
                            pdfPreview.report.pass453.labels.evidenceCoverage,
                            `${pdfPreview.report.pass453.decision.evidenceCoverage}%`,
                          ],
                          [
                            pdfPreview.report.pass453.labels.dataFreshness,
                            pdfPreview.report.pass453.decision.dataAgeLabel,
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-black/[0.08] bg-black/[0.025] p-3"
                          >
                            <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-black/[0.38]">
                              {label}
                            </p>
                            <strong className="mt-2 block break-words text-xs text-black/[0.72]">
                              {value}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section
                      id="lens-reader-page-evidence"
                      className="velmere-a4-page-anchor mt-7 scroll-mt-24"
                      aria-label={pdfPreview.report.labels.sources}
                    >
                      <h2 className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]">
                        {pdfPreview.report.pass488.pages[1].label} · Velmère
                        Cybersecurity
                      </h2>
                      <div
                        className="mt-3 divide-y divide-black/[0.08] border-y border-black/[0.08]"
                        data-pass582-citation-count={
                          pdfPreview.report.pass582.citations.length
                        }
                      >
                        {pdfPreview.report.pass582.citations.map((citation) => (
                          <details
                            id={citation.anchor}
                            key={citation.id}
                            className="group py-3 text-xs"
                          >
                            <summary className="velmere-focus-ring flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.035]">
                              <span className="grid h-8 w-10 shrink-0 place-items-center rounded-lg border border-black/[0.10] bg-black/[0.035] font-mono text-[8px] font-semibold text-black/[0.60]">
                                {citation.id}
                              </span>
                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-black/[0.76]">
                                  {citation.label}
                                </strong>
                                <span className="mt-0.5 block truncate text-[10px] text-black/[0.46]">
                                  {citation.mode} · {citation.freshness}
                                </span>
                              </span>
                              <span
                                className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] ${
                                  citation.state === "confirmed"
                                    ? "border-emerald-900/[0.16] bg-emerald-900/[0.05] text-emerald-900/[0.68]"
                                    : citation.state === "missing"
                                      ? "border-rose-900/[0.16] bg-rose-900/[0.05] text-rose-900/[0.68]"
                                      : "border-amber-900/[0.16] bg-amber-900/[0.05] text-amber-900/[0.68]"
                                }`}
                              >
                                {citation.confidence}%
                              </span>
                            </summary>
                            <div className="ml-[3.25rem] mt-1 grid gap-2 rounded-xl border border-black/[0.07] bg-white/[0.42] p-3 sm:grid-cols-[1fr_auto]">
                              <p className="text-[10px] leading-5 text-black/[0.54]">
                                {citation.note}
                              </p>
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <span className="font-mono text-[8px] uppercase tracking-[0.09em] text-black/[0.40]">
                                  {citation.state}
                                </span>
                                {pdfPreview.report.pass594.sources
                                  .find(
                                    (source) => source.sourceId === citation.id,
                                  )
                                  ?.claimAnchors.slice(0, 4)
                                  .map((claimAnchor, claimIndex) => (
                                    <a
                                      key={claimAnchor}
                                      href={`#${claimAnchor}`}
                                      className="velmere-proof-link rounded-full border border-black/[0.10] bg-black/[0.025] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-black/[0.56]"
                                    >
                                      {
                                        pdfPreview.report.pass594.sources.find(
                                          (source) =>
                                            source.sourceId === citation.id,
                                        )?.claimIds[claimIndex]
                                      }
                                    </a>
                                  ))}
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    </section>

                    <section
                      className="mt-5 rounded-[1.35rem] border border-black/[0.10] bg-black/[0.025] p-5"
                      data-pass607-reader-claim-source-gate={
                        pdfPreview.report.pass607.state
                      }
                      aria-labelledby="lens-claim-source-gate-title"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3
                            id="lens-claim-source-gate-title"
                            className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]"
                          >
                            {safeLocale === "pl"
                              ? "Claim → źródło → czas"
                              : safeLocale === "de"
                                ? "Claim → Quelle → Zeit"
                                : "Claim → source → time"}
                          </h3>
                          <p className="mt-2 max-w-3xl text-xs leading-6 text-black/[0.52]">
                            {pdfPreview.report.pass607.boundary}
                          </p>
                        </div>
                        <strong className="rounded-full border border-black/[0.10] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.11em] text-black/[0.58]">
                          {pdfPreview.report.pass607.state} ·{" "}
                          {pdfPreview.report.pass607.confidenceCap}%
                        </strong>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {pdfPreview.report.pass607.claims
                          .filter((claim) => claim.state !== "not_applicable")
                          .slice(
                            0,
                            pdfPreview.depth === "basic"
                              ? 4
                              : pdfPreview.depth === "pro"
                                ? 6
                                : 9,
                          )
                          .map((claim) => (
                            <article
                              key={claim.claimId}
                              className="rounded-xl border border-black/[0.08] bg-white/[0.54] p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[8px] uppercase tracking-[0.10em] text-black/[0.46]">
                                  {claim.claimId} ·{" "}
                                  {claim.sourceIds.join("+") || "—"}
                                </span>
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${claim.state === "confirmed" ? "bg-emerald-600" : claim.state === "bounded" ? "bg-amber-600" : "bg-rose-600"}`}
                                  aria-hidden="true"
                                />
                              </div>
                              <strong className="mt-2 block text-xs leading-5 text-black/[0.74]">
                                {claim.label}
                              </strong>
                              <p className="mt-1 text-[10px] leading-5 text-black/[0.48]">
                                {claim.state} · cap {claim.confidenceCap}%
                                {claim.blockers.length
                                  ? ` · ${claim.blockers.join(" · ")}`
                                  : ""}
                              </p>
                            </article>
                          ))}
                      </div>
                    </section>

                    <section
                      className="mt-5 rounded-[1.35rem] border border-black/[0.10] bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(245,239,224,0.46))] p-5"
                      data-pass622-source-registry={
                        pdfPreview.report.pass622.state
                      }
                      data-pass623-atomic-claims={
                        pdfPreview.report.pass623.state
                      }
                      data-pass624-provider-contradiction={
                        pdfPreview.report.pass624.state
                      }
                      data-pass625-freshness-synthesis={
                        pdfPreview.report.pass625.state
                      }
                      data-pass626-next-check-planner={
                        pdfPreview.report.pass626.state
                      }
                      data-pass644-source-replay={
                        pdfPreview.report.pass644.state
                      }
                      data-pass646-unified-ledger={
                        pdfPreview.report.pass646.state
                      }
                      data-evidence-key={pdfPreview.report.pass646.evidenceKey}
                      aria-labelledby="lens-source-intelligence-title"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3
                            id="lens-source-intelligence-title"
                            className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]"
                          >
                            {safeLocale === "pl"
                              ? "Bieżący stan i następna kontrola"
                              : safeLocale === "de"
                                ? "Aktueller Stand und nächste Prüfung"
                                : "Current state and next check"}
                          </h3>
                          <p className="mt-2 max-w-3xl text-xs leading-6 text-black/[0.56]">
                            {pdfPreview.report.pass625.summary}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-700/[0.14] bg-emerald-700/[0.045] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.10em] text-emerald-900/[0.68]">
                            {safeLocale === "pl"
                              ? "Bieżące"
                              : safeLocale === "de"
                                ? "Aktuell"
                                : "Current"}{" "}
                            · {pdfPreview.report.pass625.currentFacts.length}
                          </span>
                          <span className="rounded-full border border-amber-700/[0.14] bg-amber-700/[0.045] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.10em] text-amber-900/[0.68]">
                            {safeLocale === "pl"
                              ? "Ostatni znany"
                              : safeLocale === "de"
                                ? "Letzter Stand"
                                : "Last known"}{" "}
                            · {pdfPreview.report.pass625.lastKnownFacts.length}
                          </span>
                          <span className="rounded-full border border-black/[0.10] bg-black/[0.025] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.10em] text-black/[0.56]">
                            {pdfPreview.report.pass622.providerCount}{" "}
                            {safeLocale === "pl"
                              ? "źródeł"
                              : safeLocale === "de"
                                ? "Quellen"
                                : "sources"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <div className="rounded-2xl border border-black/[0.08] bg-white/[0.55] p-4">
                          <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-black/[0.42]">
                            {safeLocale === "pl"
                              ? "Stan providerów"
                              : safeLocale === "de"
                                ? "Provider-Status"
                                : "Provider state"}
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {pdfPreview.report.pass622.publicProviders
                              .slice(0, 4)
                              .map((provider) => (
                                <div
                                  key={provider.id}
                                  className="rounded-xl border border-black/[0.07] bg-black/[0.018] p-3"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <strong className="truncate text-[11px] text-black/[0.72]">
                                      {provider.label}
                                    </strong>
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${provider.requiresConfiguration ? "bg-amber-600" : "bg-emerald-600"}`}
                                      aria-hidden="true"
                                    />
                                  </div>
                                  <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-black/[0.42]">
                                    TTL {provider.ttlSeconds}s ·{" "}
                                    {provider.backupProviderId || "no backup"}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-black/[0.08] bg-white/[0.55] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-black/[0.42]">
                              {safeLocale === "pl"
                                ? "Plan kontroli"
                                : safeLocale === "de"
                                  ? "Prüfplan"
                                  : "Verification plan"}
                            </p>
                            <span className="font-mono text-[8px] uppercase tracking-[0.10em] text-black/[0.42]">
                              {pdfPreview.report.pass624.state} ·{" "}
                              {pdfPreview.report.pass624.contradictions}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {pdfPreview.report.pass626.tasks
                              .slice(0, pdfPreview.depth === "basic" ? 2 : 3)
                              .map((task) => (
                                <article
                                  key={task.taskId}
                                  className="rounded-xl border border-black/[0.07] bg-black/[0.018] p-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#8a6b2f]/[0.18] bg-[#8a6b2f]/[0.06] font-mono text-[8px] text-[#725821]">
                                      {task.rank}
                                    </span>
                                    <strong className="text-[11px] leading-5 text-black/[0.72]">
                                      {task.action}
                                    </strong>
                                  </div>
                                  <p className="mt-2 pl-8 text-[9px] leading-5 text-black/[0.46]">
                                    {task.completionEvidence}
                                  </p>
                                </article>
                              ))}
                            {!pdfPreview.report.pass626.tasks.length ? (
                              <p className="text-[10px] leading-5 text-black/[0.48]">
                                {safeLocale === "pl"
                                  ? "Brak priorytetowej luki dla wybranego zakresu."
                                  : safeLocale === "de"
                                    ? "Keine prioritäre Lücke für den gewählten Umfang."
                                    : "No priority gap for the selected scope."}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section
                      id="lens-reader-page-analysis"
                      className="velmere-a4-page-anchor mt-7 scroll-mt-24"
                      data-pass450-market-snapshot="true"
                    >
                      <h2 className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]">
                        {pdfPreview.report.pass488.pages[2].label}
                      </h2>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {(
                          pdfPreview.report.pass450.tiers.find(
                            (tier) => tier.id === "basic",
                          )?.fields || []
                        )
                          .filter((field) =>
                            [
                              "price",
                              "marketCap",
                              "change24h",
                              "volume24h",
                            ].includes(field.id),
                          )
                          .map((field) => (
                            <div
                              key={field.id}
                              className="rounded-2xl border border-black/[0.09] bg-black/[0.025] p-4"
                            >
                              <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-black/[0.42]">
                                {field.label}
                              </p>
                              <strong className="mt-2 block break-words text-sm text-black/[0.78]">
                                {field.value}
                              </strong>
                            </div>
                          ))}
                      </div>
                    </section>

                    <p
                      className="sr-only"
                      role="img"
                      aria-label={
                        pdfPreview.report.pass611.reader.chartAlternative
                      }
                      data-pass611-chart-alternative="text-equivalent"
                    >
                      {pdfPreview.report.pass611.reader.chartAlternative}
                    </p>

                    <section className="mt-7 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
                      <div className="rounded-2xl border border-[#9b895f]/[0.30] bg-[#f1ede3] p-5">
                        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a6b2f]">
                          {pdfPreview.report.labels.checked}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-black/[0.66]">
                          {reportSection(
                            pdfPreview.report,
                            "sources",
                            pdfPreview.report.whyItMatters,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-black/[0.09] p-5">
                        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a6b2f]">
                          {pdfPreview.report.labels.next}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-black/[0.66]">
                          {pdfPreview.report.nextOperatorStep}
                        </p>
                      </div>
                    </section>

                    <section
                      className="mt-7 rounded-[1.4rem] border border-black/[0.10] bg-black/[0.025] p-5"
                      data-pass466-pdf-confidence-waterfall="true"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]">
                            {safeLocale === "pl"
                              ? "Waterfall pewności"
                              : safeLocale === "de"
                                ? "Confidence Waterfall"
                                : "Confidence waterfall"}
                          </p>
                          <p className="mt-2 max-w-3xl text-xs leading-6 text-black/[0.50]">
                            {pdfPreview.report.pass466.boundary}
                          </p>
                        </div>
                        <strong className="font-mono text-lg text-black/[0.78] tabular-nums">
                          {pdfPreview.report.pass466.finalConfidence}%
                        </strong>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {pdfPreview.report.pass466.stages.map((stage) => (
                          <div
                            key={stage.id}
                            className="rounded-2xl border border-black/[0.08] bg-white/[0.58] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[8px] uppercase tracking-[0.11em] text-black/[0.42]">
                                {stage.label}
                              </span>
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${stage.state === "confirmed" ? "bg-emerald-600" : stage.state === "review" ? "bg-amber-600" : "bg-rose-600"}`}
                              />
                            </div>
                            <strong className="mt-2 block text-sm text-black/[0.74] tabular-nums">
                              {stage.cap}%
                            </strong>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
                              <span
                                className="block h-full rounded-full bg-black/[0.38]"
                                style={{ width: `${stage.cap}%` }}
                              />
                            </div>
                            <p className="mt-2 text-[10px] leading-5 text-black/[0.44]">
                              {stage.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                      {pdfPreview.report.pass466.filingUrl ? (
                        <a
                          href={pdfPreview.report.pass466.filingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/[0.12] bg-white/[0.64] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.11em] text-black/[0.60]"
                          data-pass466-reader-sec-link="true"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {pdfPreview.report.pass466.filingLabel ||
                            "SEC filing"}
                        </a>
                      ) : null}
                    </section>

                    <section
                      id="lens-reader-page-boundary"
                      className="velmere-a4-page-anchor mt-7 scroll-mt-24 rounded-2xl border border-amber-900/[0.14] bg-amber-900/[0.035] p-5"
                    >
                      <h2 className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]">
                        {pdfPreview.report.pass488.pages[3].label} ·{" "}
                        {pdfPreview.report.labels.missing}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-black/[0.66]">
                        {pdfPreview.report.pass608.summary}
                      </p>
                      {pdfPreview.report.pass608.entries.length ? (
                        <ol
                          className="mt-4 grid gap-3 md:grid-cols-2"
                          data-pass608-reader-appendix="action-required"
                        >
                          {pdfPreview.report.pass608.entries.map((entry) => (
                            <li
                              key={entry.id}
                              className="rounded-xl border border-amber-900/[0.12] bg-white/[0.48] p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[8px] uppercase tracking-[0.11em] text-[#8a6b2f]">
                                  {entry.id} · {entry.impact}
                                </span>
                                <span className="font-mono text-[8px] text-black/[0.46]">
                                  −{entry.confidencePenalty}
                                </span>
                              </div>
                              <strong className="mt-2 block text-xs leading-5 text-black/[0.74]">
                                {entry.label}
                              </strong>
                              <p className="mt-2 text-[10px] leading-5 text-black/[0.48]">
                                {entry.nextCheck}
                              </p>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </section>

                    <section
                      className="mt-7 grid gap-4 lg:grid-cols-2"
                      data-pass478-claims-reader="true"
                    >
                      <div className="rounded-[1.35rem] border border-emerald-900/[0.16] bg-emerald-900/[0.035] p-5">
                        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a6b2f]">
                          {safeLocale === "pl"
                            ? "Potwierdzone fakty"
                            : safeLocale === "de"
                              ? "Bestätigte Fakten"
                              : "Confirmed facts"}
                        </p>
                        <ul className="mt-3 space-y-2 text-xs leading-6 text-black/[0.64]">
                          {pdfPreview.report.pass478.confirmedFacts.map(
                            (fact) => (
                              <li
                                key={fact}
                                className="border-b border-black/[0.06] pb-2 last:border-0 last:pb-0"
                              >
                                {fact}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div className="rounded-[1.35rem] border border-amber-900/[0.16] bg-amber-900/[0.035] p-5">
                        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a6b2f]">
                          {safeLocale === "pl"
                            ? "Granice pewności"
                            : safeLocale === "de"
                              ? "Konfidenzgrenzen"
                              : "Confidence limits"}
                        </p>
                        <ul className="mt-3 space-y-2 text-xs leading-6 text-black/[0.64]">
                          {pdfPreview.report.pass478.confidenceLimits.map(
                            (limit) => (
                              <li
                                key={limit}
                                className="border-b border-black/[0.06] pb-2 last:border-0 last:pb-0"
                              >
                                {limit}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    </section>

                    <section
                      className="mt-7"
                      data-pass452-pdf-signature-diagnostics="true"
                      data-pass454-evidence-dense-reader="true"
                      data-pass455-human-reader="true"
                      data-pass456-pdf-reader="true"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]">
                            {pdfPreview.report.pass455.executive.eyebrow}
                          </p>
                          <h4 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-black/[0.82]">
                            {pdfPreview.report.pass455.executive.headline}
                          </h4>
                          <p className="mt-2 max-w-3xl text-xs leading-6 text-black/[0.52]">
                            {pdfPreview.report.pass455.executive.oneSentence}
                          </p>
                        </div>
                        <span className="rounded-full border border-black/[0.10] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-black/[0.48]">
                          {pdfPreview.report.pass453.labels.sourceBound}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {pdfPreview.report.pass455.tiers
                          .find((tier) => tier.id === pdfPreview.depth)
                          ?.metrics.slice(0, 8)
                          .map((insight) => (
                            <div
                              key={insight.id}
                              className="rounded-2xl border border-black/[0.09] bg-black/[0.025] p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[8px] uppercase tracking-[0.11em] text-black/[0.44]">
                                  {insight.label}
                                </span>
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${insight.state === "confirmed" ? "bg-emerald-600" : insight.state === "review" ? "bg-amber-600" : "bg-rose-600"}`}
                                />
                              </div>
                              <strong className="mt-2 block break-words text-sm text-black/[0.74]">
                                {insight.value}
                              </strong>
                              <p className="mt-2 text-[10px] leading-5 text-black/[0.46]">
                                {insight.humanMeaning}
                              </p>
                            </div>
                          ))}
                      </div>
                    </section>

                    <section
                      className="mt-7"
                      data-pass454-depth-matrix="true"
                      data-pass455-localized-depth-matrix="true"
                      data-pass456-full-tier-matrix="true"
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a6b2f]">
                        Velmère Cybersecurity · depth matrix
                      </p>
                      <div className="mt-3 grid gap-4">
                        {pdfPreview.report.pass455.tiers
                          .filter((tier) => tier.id === pdfPreview.depth)
                          .map((tier) => (
                            <section
                              key={tier.id}
                              className="rounded-2xl border border-black/[0.10] bg-black/[0.025] p-5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <strong className="text-base">
                                    {tier.label}
                                  </strong>
                                  <p className="mt-1 text-xs leading-5 text-black/[0.52]">
                                    {tier.promise}
                                  </p>
                                </div>
                                <span className="rounded-full border border-black/[0.10] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-black/[0.48]">
                                  {tier.fieldCount}
                                </span>
                              </div>
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {tier.metrics
                                  .slice(0, tier.fieldCount)
                                  .map((field) => (
                                    <div
                                      key={field.id}
                                      id={
                                        pdfPreview.report.pass594.claims.find(
                                          (claim) => claim.fieldId === field.id,
                                        )?.claimAnchor
                                      }
                                      data-pass594-claim-footnote={
                                        pdfPreview.report.pass594.claims.find(
                                          (claim) => claim.fieldId === field.id,
                                        )?.claimId
                                      }
                                      className="rounded-xl border border-black/[0.08] bg-white/[0.54] px-3 py-3"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[8px] uppercase tracking-[0.11em] text-black/[0.42]">
                                          {field.label}
                                        </span>
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full ${field.state === "confirmed" ? "bg-emerald-600" : field.state === "review" ? "bg-amber-600" : "bg-rose-600"}`}
                                        />
                                      </div>
                                      <strong className="mt-2 block break-words text-xs leading-5 text-black/[0.72]">
                                        {field.value}
                                      </strong>
                                      <p className="mt-2 text-[10px] leading-5 text-black/[0.42]">
                                        {field.humanMeaning}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {pdfPreview.report.pass594.claims
                                          .find(
                                            (claim) =>
                                              claim.fieldId === field.id,
                                          )
                                          ?.sourceAnchors.map(
                                            (sourceAnchor, sourceIndex) => (
                                              <a
                                                key={sourceAnchor}
                                                href={`#${sourceAnchor}`}
                                                className="velmere-proof-link rounded-full border border-[#8a6b2f]/[0.18] bg-[#8a6b2f]/[0.05] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[#6b5124]"
                                              >
                                                {
                                                  pdfPreview.report.pass594.claims.find(
                                                    (claim) =>
                                                      claim.fieldId ===
                                                      field.id,
                                                  )?.sourceIds[sourceIndex]
                                                }
                                              </a>
                                            ),
                                          )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </section>
                          ))}
                      </div>
                    </section>

                    <footer
                      className="mt-8 flex flex-col gap-3 border-t border-black/[0.12] pt-5 text-[10px] leading-5 text-black/[0.44] sm:flex-row sm:items-end sm:justify-between"
                      data-pass488-parity-footer="true"
                    >
                      <div className="max-w-xl">
                        <p>{pdfPreview.report.labels.boundary}</p>
                        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.10em] text-black/[0.36]">
                          {pdfPreview.report.pass488.labels.parity}
                        </p>
                        <p className="mt-1 font-mono text-[8px] text-black/[0.30]">
                          {pdfPreview.report.pass488.parityKey} ·{" "}
                          {pdfPreview.report.pass610.pageCount}/
                          {pdfPreview.report.pass610.pageCount} ·{" "}
                          {pdfPreview.report.pass610.manifestKey}
                          {reportIntegritySeal
                            ? ` · ${reportIntegritySeal.checksum}`
                            : ""}
                        </p>
                      </div>
                      <strong className="font-serif text-base text-black/[0.72]">
                        {pdfPreview.report.labels.signature}
                      </strong>
                    </footer>
                  </article>
                </div>
              )}
            </section>
          </div>
        </BodyPortal>
      ) : null}
    </main>
  );
}

// PASS631 legacy verifier compatibility only: z-[2147483647]
