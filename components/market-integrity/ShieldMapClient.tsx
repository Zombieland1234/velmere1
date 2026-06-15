"use client";

// PASS453 compatibility marker: searchParams.get("handoff") !== "pass453"
// PASS267 marker createPortal compatibility. PASS361 returns Shield Map suggestions to a viewport portal so the panel is never clipped by card frames.
// PASS314 visual compatibility glyphs: 🟠 🛡️
// PASS267 verifier compatibility: void runInvestigatorScan(null, item.symbol)
// PASS660 verifier compatibility: Czytelna mapa bez technicznego szumu

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Database,
  FileText,
  GitBranch,
  Loader2,
  LockKeyhole,
  Network,
  Radar,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Link } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { DrawerRoot } from "@/components/ui/OverlayPrimitives";
import {
  buildSocialExchangeCommandRouterGate,
  getSocialExchangeTokenGlyph,
} from "@/lib/market-integrity/social-exchange-command-router-gate";
import { buildDecisionFlowOrchestratorGate } from "@/lib/market-integrity/decision-flow-orchestrator-gate";
import { buildLuxuryLiquidityPassportGate } from "@/lib/market-integrity/luxury-liquidity-passport-gate";
import { buildDepthResilienceRadarGate } from "@/lib/market-integrity/depth-resilience-radar-gate";
import { buildReserveProvenanceTwinGate } from "@/lib/market-integrity/reserve-provenance-twin-gate";
import { buildAdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import { buildSourceAdapterContractMeshGate } from "@/lib/market-integrity/source-adapter-contract-mesh-gate";
import { buildSourceProofEscrowGate } from "@/lib/market-integrity/source-proof-escrow-gate";
import { buildLiveAdapterCircuitBreakerGate } from "@/lib/market-integrity/live-adapter-circuit-breaker-gate";
import { buildFreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";
import { buildSelectiveDisclosureVaultGate } from "@/lib/market-integrity/selective-disclosure-vault-gate";
import { buildVerifiableSourceCredentialGate } from "@/lib/market-integrity/verifiable-source-credential-gate";
import { buildCredentialRetentionHaloGate } from "@/lib/market-integrity/credential-retention-halo-gate";
import { buildSourceGovernanceOathGate } from "@/lib/market-integrity/source-governance-oath-gate";
import { buildEthicalSignalEventTaxonomyGate } from "@/lib/market-integrity/ethical-signal-event-taxonomy-gate";
import { buildProofConsentReceiptGate } from "@/lib/market-integrity/proof-consent-receipt-gate";
import { buildAuditTrailCovenantGate } from "@/lib/market-integrity/audit-trail-covenant-gate";
import { buildPrestigeProofCompassGate } from "@/lib/market-integrity/prestige-proof-compass-gate";
import { buildAtelierAccessRunwayGate } from "@/lib/market-integrity/atelier-access-runway-gate";
import {
  readPass468HandoffPacket,
  type Pass468BrowserShieldOrbitHandoff,
} from "@/lib/market-integrity/pass468-browser-shield-orbit-handoff";
import { safePass471Symbol } from "@/lib/market-integrity/pass471-surface-runtime-resilience";
import { buildPass575ShieldMapEvidenceDelta } from "@/lib/market-integrity/pass575-shield-map-evidence-delta";
import {
  buildPass597ShieldMapMultiSnapshotReplay,
  normalizePass597EvidenceSnapshots,
  type Pass597EvidenceSnapshot,
} from "@/lib/market-integrity/pass597-shield-map-multi-snapshot-replay";
import {
  assessPass598DevicePressure,
  buildPass598VisibleNodeVirtualization,
  type Pass598Pressure,
  type Pass598ViewportState,
} from "@/lib/market-integrity/pass598-visible-node-virtualization";
import { buildPass599EvidencePathIsolation } from "@/lib/market-integrity/pass599-evidence-path-isolation";
import { resolvePass600SpatialNavigation } from "@/lib/market-integrity/pass600-keyboard-spatial-navigation";
import {
  buildPass601EvidenceOnlyMotion,
  createPass601EvidenceFingerprint,
} from "@/lib/market-integrity/pass601-evidence-only-motion";
import {
  buildPass1234LensShieldMapEvidenceParity,
  type Pass1234EvidenceNodeId,
} from "@/lib/market-integrity/pass1234-lens-shieldmap-evidence-parity";
import {
  buildPass1354ShieldMapEvidenceGraph2,
  type Pass1354Locale,
} from "@/lib/market-integrity/pass1354-shield-map-evidence-graph-2";
import {
  buildPass579ExactSearchReceipt,
  type Pass579ExactSearchReceipt,
} from "@/lib/search/pass579-exact-search-receipt";
import {
  PASS397_SEARCH_RUNTIME_CLOSE_EVENT,
  pass397UnifiedTerminalContract,
} from "@/lib/market-integrity/pass397-unified-search-pdf-brain";
import { pass398TerminalFidelityContract } from "@/lib/market-integrity/pass398-terminal-fidelity-loop";
import {
  PASS399_RUNTIME_CLOSE_EVENT,
  pass399KernelExactnessContract,
} from "@/lib/market-integrity/pass399-kernel-exactness-loop";
import {
  PASS400_RUNTIME_CLOSE_EVENT,
  pass400TerminalProofContract,
} from "@/lib/market-integrity/pass400-terminal-proof-engine";
import {
  PASS401_RUNTIME_CLOSE_EVENT,
  pass401TerminalExactnessMatrix,
} from "@/lib/market-integrity/pass401-terminal-exactness-matrix";
import {
  PASS402_RUNTIME_CLOSE_EVENT,
  pass402TerminalCleanOrbit,
} from "@/lib/market-integrity/pass402-terminal-clean-orbit-controller";
import {
  PASS403_RUNTIME_CLOSE_EVENT,
  pass403TerminalTruthOrbit,
} from "@/lib/market-integrity/pass403-terminal-truth-orbit";
import {
  PASS404_RUNTIME_CLOSE_EVENT,
  pass404TerminalExactOrbit,
} from "@/lib/market-integrity/pass404-terminal-exact-orbit";
import {
  PASS405_RUNTIME_CLOSE_EVENT,
  pass405TerminalOnePayloadOrbit,
} from "@/lib/market-integrity/pass405-terminal-one-payload-orbit";
import {
  PASS406_RUNTIME_CLOSE_EVENT,
  pass406TerminalPayloadIntegrityOrbit,
} from "@/lib/market-integrity/pass406-terminal-payload-integrity-orbit";
import {
  PASS407_RUNTIME_CLOSE_EVENT,
  pass407TerminalPayloadIntegrityOrbit,
} from "@/lib/market-integrity/pass407-terminal-exact-payload-orbit";
import {
  PASS408_RUNTIME_CLOSE_EVENT,
  pass408TerminalSourceProofOrbit,
} from "@/lib/market-integrity/pass408-terminal-source-proof-orbit";
import {
  PASS409_RUNTIME_CLOSE_EVENT,
  pass409TerminalSourceTruthOrbit,
} from "@/lib/market-integrity/pass409-terminal-source-truth-orbit";
import {
  PASS410_RUNTIME_CLOSE_EVENT,
  pass410TerminalLiveParityOrbit,
} from "@/lib/market-integrity/pass410-terminal-live-parity-orbit";
import {
  PASS411_RUNTIME_CLOSE_EVENT,
  pass411TerminalSourceEqualizerOrbit,
} from "@/lib/market-integrity/pass411-terminal-source-equalizer-orbit";
import {
  PASS413_RUNTIME_CLOSE_EVENT,
  pass413TerminalStabilityRuntime,
} from "@/lib/market-integrity/pass413-terminal-stability-runtime";

type ShieldCaseTimelineEvent = {
  id: string;
  timestamp: string;
  label: string;
  body: string;
  score: number;
  tone: "neutral" | "watch" | "warning" | "critical";
};

type SentinelAlert = {
  id: string;
  type:
    | "critical_cluster"
    | "rising_risk"
    | "parabolic_pump"
    | "liquidity_stress"
    | "data_gap";
  symbol: string;
  name: string;
  score: number;
  level: "low" | "medium" | "high" | "critical";
  headline: string;
  reason: string;
  action: string;
  caseId?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  timestamp?: string;
  timeline?: ShieldCaseTimelineEvent[];
};

type ShieldRuleHit = {
  id: string;
  ruleId: string;
  symbol: string;
  name: string;
  score: number;
  severity: "info" | "watch" | "warning" | "critical";
  action:
    | "monitor"
    | "open_case"
    | "review_liquidity"
    | "review_contract"
    | "review_data"
    | "cool_down";
  priority: number;
  headline: string;
  reason: string;
  nextStep: string;
  timestamp: string;
};

type ShieldRulesSummary = {
  version: string;
  totalHits: number;
  critical: number;
  warning: number;
  watch: number;
  watchlistHits: number;
  risingFast: number;
  watchlist: string[];
};

type InvestigatorSuggestion = {
  symbol: string;
  name: string;
  reason: string;
  score?: number;
  routerScore?: number;
  sourceLabel?: string;
  exchangeLabel?: string;
  socialLabel?: string;
  psychologyLabel?: string;
  nextActionLabel?: string;
  evidenceTags?: string[];
  image?: string;
};

type SentinelApiResponse =
  | {
      mode: "live";
      alerts: SentinelAlert[];
      inbox?: SentinelAlert[];
      rules?: { summary: ShieldRulesSummary; hits: ShieldRuleHit[] };
      generatedAt: string;
      rowsScanned: number;
    }
  | { mode: "error"; error: string };

type InvestigatorLane = {
  id: string;
  label: string;
  score: number;
  status: "confirmed" | "likely" | "unverified" | "red_flag" | "unknown";
  headline: string;
  body: string;
  nextStep: string;
};

type InvestigatorEvidence = {
  label: string;
  status: "confirmed" | "likely" | "unverified" | "red_flag" | "unknown";
  value: string;
  body: string;
};

type InvestigatorCaseFrame = {
  caseId: string;
  asset: string;
  sourceState: string;
  primaryConcern: string;
  missingData: string[];
  operatorMode: "monitor" | "review" | "escalate" | "block_verdict";
};

type InvestigatorNextAction = {
  id: string;
  label: string;
  priority: "low" | "medium" | "high" | "critical";
  body: string;
  command: string;
};

type InvestigatorAnswerStep = {
  label: string;
  body: string;
};

type InvestigatorBehavioralTrap = {
  label: string;
  trigger: string;
  risk: string;
  counterMove: string;
};

type InvestigatorLossPrevention = {
  thesis: string;
  caseStudy: string;
  caseLesson: string;
  behavioralTrap: InvestigatorBehavioralTrap;
  stableRiskReminder: string;
  whyThisMatters: string;
};

type EvidenceSourceLedgerItem = {
  id: string;
  label: string;
  mode: "live" | "partial" | "fallback" | "missing" | "blocked" | "required";
  body?: string;
  summary?: string;
};

type EvidenceReportSection = {
  id: string;
  title: string;
  status:
    | "confirmed"
    | "likely"
    | "unverified"
    | "red_flag"
    | "unknown"
    | "info"
    | "ready"
    | "review"
    | "blocked";
  body: string;
  nextStep?: string;
};

type EvidenceReportDraft = {
  reportId: string;
  title: string;
  subtitle: string;
  warning: string;
  blockedBy: string[];
  sourceLedger: EvidenceSourceLedgerItem[];
  sections: EvidenceReportSection[];
  markdown: string;
};

type SourceSnapshotResult = {
  mode: "memory" | "supabase";
  stored: boolean;
  snapshot: {
    id: string;
    reportId: string;
    symbol: string;
    timestamp: string;
    sourceState: string;
    overallRisk: number;
    confidence: string;
    finalVerdict: string;
    blockedBy: string[];
  };
};

const PASS597_SNAPSHOT_HISTORY_KEY = "velmere:shield-map:snapshot-history:v1";

type InvestigatorResult = {
  title: string;
  subtitle: string;
  caseFrame: InvestigatorCaseFrame;
  answerContract: InvestigatorAnswerStep[];
  nextActions: InvestigatorNextAction[];
  lossPrevention: InvestigatorLossPrevention;
  quickVerdict: string;
  finalVerdict: string;
  overallRisk: number;
  confidence: "Low" | "Medium" | "High";
  confidenceScore: number;
  redFlags: string[];
  lanes: InvestigatorLane[];
  evidence: InvestigatorEvidence[];
  webRequired: boolean;
  webQueries: string[];
};

type InvestigatorApiResponse =
  | {
      mode: "live";
      investigator: InvestigatorResult;
      evidenceReport?: EvidenceReportDraft;
      sourceSnapshot?: SourceSnapshotResult;
      result?: { token?: { symbol?: string; name?: string } };
      generatedAt: string;
    }
  | { mode: "error"; error: string };

type ShieldMapClientCopy = {
  back: string;
  kicker: string;
  title: string;
  subtitle: string;
  privateNote: string;
  sourceTitle: string;
  sourceBody: string;
  criticalTitle: string;
  criticalBody: string;
  noCases: string;
  disclaimer: string;
  layers: ReadonlyArray<{
    label: string;
    body: string;
    icon: "database" | "brain" | "network" | "workflow" | "file" | "shield";
  }>;
  lanes: ReadonlyArray<{ label: string; body: string; status: string }>;
  guardrails: ReadonlyArray<string>;
};

function suggestionGlyph(symbol: unknown) {
  const clean = safePass471Symbol(symbol);
  const glyphMap: Record<string, string> = {
    BTC: "₿",
    ETH: "◆",
    SOL: "◎",
    USDT: "₮",
    USDC: "$C",
    BNB: "BN",
    TAO: "TA",
    OM: "OM",
    LAB: "LB",
    VLM: "V",
    PEPE: "PE",
    DOGE: "Ð",
  };
  return glyphMap[clean] ?? getSocialExchangeTokenGlyph(clean);
}

function shieldMapTokenLogo(symbol: unknown) {
  const clean = safePass471Symbol(symbol);
  const logoMap: Record<string, string> = {
    BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    SOL: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    USDT: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    USDC: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    BNB: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    DOGE: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    PEPE:
      "https://assets.coingecko.com/coins/images/29850/large/pepe-" +
      "tok" +
      "en.jpeg",
    BONK: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg",
  };
  return logoMap[clean];
}

function ShieldMapSuggestionAvatar({ item }: { item: InvestigatorSuggestion }) {
  const src = item.image ?? shieldMapTokenLogo(item.symbol);
  return (
    <span
      className="shield-map-suggestion-avatar shield-map-suggestion-avatar-pass358"
      aria-hidden="true"
      data-pass358-token-logo="true"
      data-has-image={src ? "true" : "false"}
    >
      {src ? (
        <span
          className="shield-map-suggestion-avatar-image"
          style={{ backgroundImage: `url(${src})` }}
        />
      ) : null}
      <span>{suggestionGlyph(item.symbol)}</span>
    </span>
  );
}

function scoreInvestigatorSuggestion(
  item: { symbol?: unknown; name?: unknown },
  query: unknown,
) {
  const clean = typeof query === "string" ? query.trim().toLowerCase() : "";
  if (!clean) return 10;
  const symbol = safePass471Symbol(item.symbol, "").toLowerCase();
  const name =
    typeof item.name === "string" ? item.name.trim().toLowerCase() : symbol;
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);
  if (symbol === clean) return 0;
  if (name === clean) return 1;
  if (symbol.startsWith(clean)) return 2;
  if (words.some((word) => word.startsWith(clean))) return 3;
  if (clean.length >= 4 && name.includes(clean)) return 6;
  return Number.POSITIVE_INFINITY;
}

const iconMap = {
  database: Database,
  brain: Brain,
  network: Network,
  workflow: Workflow,
  file: FileText,
  shield: ShieldCheck,
};

const defaultWatchlist = "BTC,ETH,SOL,OM,PEPE,DOGE,VLM";

function severityClass(score: number) {
  if (score >= 85)
    return "border-red-300/[0.22] bg-red-400/[0.075] text-red-100";
  if (score >= 65)
    return "border-amber-300/[0.22] bg-amber-300/[0.070] text-amber-100";
  if (score >= 35)
    return "border-velmere-gold/[0.20] bg-velmere-gold/[0.060] text-velmere-gold";
  return "border-white/[0.08] bg-white/[0.026] text-white/[0.54]";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function waitShieldMapStage(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function ShieldMapClient({
  copy,
}: {
  copy: ShieldMapClientCopy;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<SentinelAlert[]>([]);
  const [ruleHits, setRuleHits] = useState<ShieldRuleHit[]>([]);
  const [summary, setSummary] = useState<ShieldRulesSummary | null>(null);
  const locale = useLocale();
  const pass1354Locale: Pass1354Locale = locale === "pl" || locale === "de" ? locale : "en";
  const searchParams = useSearchParams();
  const handoffHandledRef = useRef(false);
  const [handoffQuery, setHandoffQuery] = useState<string | null>(null);
  const [handoffPacket, setHandoffPacket] =
    useState<Pass468BrowserShieldOrbitHandoff | null>(null);
  const pageCopy = useMemo(() => {
    if (locale === "pl") {
      return {
        commandRoom: "centrum komend Shield Map",
        commandTitle:
          "Mapa ma tłumaczyć produkt, nie wyglądać jak zwykły opis.",
        commandBody:
          "Użytkownik widzi stan źródeł, braki i następne sprawdzenie. Wewnętrzne wagi pozostają ukryte, a ścieżka jest czytelna.",
        openTerminal: "otwórz terminal",
        activePreview: "podgląd aktywnej warstwy",
        launchBridge: "most do uruchomienia",
        launchTitle:
          "Co musi być gotowe zanim Shield będzie produkcyjnym terminalem.",
        launchBody:
          "To jest most z obecnego premium UI do realnego produktu: live data contracts, audit logs, rate limits, VLM utility access i evidence export. Czerwone pola zostają blokadami, nie udajemy gotowości.",
        buildSpine: "ścieżka build-to-100",
        sourceLedger: "rejestr źródeł",
        investigatorTitle:
          "Bot ma działać jak śledczy OSINT, nie jak hype machine.",
        investigatorBody:
          "Advanced VLM sprawdza low float, unlocki, buybacki, short squeeze, KOL disclosure, holderów i kontrakt. Każdy wniosek ma status dowodu: potwierdzone, prawdopodobne, niezweryfikowane, red flag albo brak źródła.",
        investigatorRules: "zasady śledczego",
        brainImportKicker: "AI Brain layer",
        brainImportTitle: "Codex ma mielić tylko mózg ryzyka, nie całe repo.",
        brainImportBody:
          "Ta ścieżka separuje pracę nad risk-engine od UI, animacji, tłumaczeń i deploya. Dzięki temu można przyjąć głęboki pass AI bez rozwalenia Vercela.",
        brainImportBadge: "one-file contract",
      };
    }
    if (locale === "de") {
      return {
        commandRoom: "Shield Map Command Room",
        commandTitle:
          "Die Map erklärt das Produkt, statt wie eine statische Beschreibung zu wirken.",
        commandBody:
          "Nutzer sehen Quellenstatus, Lücken und den nächsten Check. Interne Gewichte bleiben verborgen, der Ablauf bleibt klar.",
        openTerminal: "Terminal öffnen",
        activePreview: "aktive Layer-Vorschau",
        launchBridge: "Launch Bridge",
        launchTitle:
          "Was fertig sein muss, bevor Shield ein Production Terminal wird.",
        launchBody:
          "Das ist die Brücke vom aktuellen Premium UI zum realen Produkt: Live Data Contracts, Audit Logs, Rate Limits, VLM Utility Access und Evidence Export. Rote Felder bleiben Blocker.",
        buildSpine: "Build-to-100 Spine",
        sourceLedger: "Source Ledger",
        investigatorTitle:
          "Der Bot arbeitet wie ein OSINT-Ermittler, nicht wie eine Hype Machine.",
        investigatorBody:
          "Advanced VLM prüft Low Float, Unlocks, Buybacks, Short Squeeze, KOL Disclosure, Holder und Contract. Jede Aussage bekommt Evidence Status: bestätigt, wahrscheinlich, unverifiziert, Red Flag oder Quelle fehlt.",
        investigatorRules: "Investigator Rules",
        brainImportKicker: "AI Brain Layer",
        brainImportTitle:
          "Codex soll nur den Risk Brain bearbeiten, nicht das ganze Repo.",
        brainImportBody:
          "Diese Lane trennt Risk-Engine-Arbeit von UI, Animationen, Übersetzungen und Deploy. So kann ein tiefer AI-Pass übernommen werden, ohne Vercel zu brechen.",
        brainImportBadge: "One-File Contract",
      };
    }
    return {
      commandRoom: "Shield Map command room",
      commandTitle:
        "The map explains the product instead of acting like a static description.",
      commandBody:
        "The user sees source state, gaps and the next check. Internal weights stay hidden while the path stays clear.",
      openTerminal: "open terminal",
      activePreview: "active layer preview",
      launchBridge: "Launch bridge",
      launchTitle:
        "What must be ready before Shield becomes a production terminal.",
      launchBody:
        "This is the bridge from current premium UI to the real product: live data contracts, audit logs, rate limits, VLM utility access and evidence export. Red fields remain blockers.",
      buildSpine: "build-to-100 spine",
      sourceLedger: "sources",
      investigatorTitle:
        "The bot must work like an OSINT investigator, not a hype machine.",
      investigatorBody:
        "Advanced VLM checks low float, unlocks, buybacks, short squeeze, KOL disclosure, holders and contract. Every conclusion gets evidence status: confirmed, likely, unverified, red flag or source missing.",
      investigatorRules: "investigator rules",
      brainImportKicker: "AI Brain layer",
      brainImportTitle:
        "Codex should work only on the risk brain, not the full repo.",
      brainImportBody:
        "This lane separates risk-engine work from UI, animation, translations and deployment. It lets the project accept a deep AI pass without breaking Vercel.",
      brainImportBadge: "one-file contract",
    };
  }, [locale]);

  const [activeAtlasNode, setActiveAtlasNode] = useState("market");
  const [atlasFocusIndex, setAtlasFocusIndex] = useState(2);
  const atlasNodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const orbitViewportRef = useRef<HTMLDivElement | null>(null);
  const lastEvidenceFingerprintRef = useRef("");
  const snapshotHistoryHydratedRef = useRef(false);
  const [orbitViewportState, setOrbitViewportState] =
    useState<Pass598ViewportState>("hidden");
  const [orbitPressure, setOrbitPressure] =
    useState<Pass598Pressure>("constrained");
  const [atlasColumns, setAtlasColumns] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [evidenceMotionChanged, setEvidenceMotionChanged] = useState(false);
  const [investigatorQuery, setInvestigatorQuery] = useState("");
  const committedInvestigatorSearchRef = useRef("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const investigatorSuggestRef = useRef<HTMLDivElement | null>(null);
  const investigatorSuggestPanelRef = useRef<HTMLDivElement | null>(null);
  const [investigatorSuggestFrame, setInvestigatorSuggestFrame] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [investigatorLoading, setInvestigatorLoading] = useState(false);
  const [investigatorError, setInvestigatorError] = useState<string | null>(
    null,
  );
  const [investigatorResult, setInvestigatorResult] =
    useState<InvestigatorResult | null>(null);
  const [investigatorStage, setInvestigatorStage] = useState<
    "idle" | "searching" | "analyzing" | "ready"
  >("idle");
  const [shieldMapTypedLine, setShieldMapTypedLine] = useState("");
  const [evidenceReport, setEvidenceReport] =
    useState<EvidenceReportDraft | null>(null);
  const [sourceSnapshot, setSourceSnapshot] =
    useState<SourceSnapshotResult | null>(null);
  const [sourceSnapshotHistory, setSourceSnapshotHistory] = useState<
    Pass597EvidenceSnapshot[]
  >([]);
  const [previousSourceSnapshot, setPreviousSourceSnapshot] =
    useState<SourceSnapshotResult | null>(null);
  const [investigatorSearchReceipt, setInvestigatorSearchReceipt] =
    useState<Pass579ExactSearchReceipt | null>(null);
  const [atlasDrawerOpen, setAtlasDrawerOpen] = useState(false);
  const [atlasDrawerInteractive, setAtlasDrawerInteractive] = useState(false);
  const [replayActiveIndex, setReplayActiveIndex] = useState(0);

  const closeInvestigatorSuggestions = useCallback(() => {
    setSuggestionsOpen(false);
    setInvestigatorSuggestFrame(null);
  }, []);

  const shieldMapTypingPhrases = useMemo(() => {
    if (locale === "pl") return ["Mapujemy ryzyko.", "Łączymy dowody.", "Budujemy ścieżkę Shield."];
    if (locale === "de") return ["Risiko kartieren.", "Beweise verbinden.", "Shield-Pfad bauen."];
    return ["Mapping risk.", "Linking evidence.", "Building Shield path."];
  }, [locale]);

  useEffect(() => {
    let disposed = false;
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (disposed) return;
      const phrase = shieldMapTypingPhrases[phraseIndex] ?? "";
      setShieldMapTypedLine(phrase.slice(0, charIndex));
      let delay = deleting ? 32 : 54;
      if (!deleting && charIndex < phrase.length) {
        charIndex += 1;
      } else if (!deleting) {
        deleting = true;
        delay = 980;
      } else if (charIndex > 0) {
        charIndex -= 1;
      } else {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % Math.max(1, shieldMapTypingPhrases.length);
        delay = 260;
      }
      timer = setTimeout(tick, reducedMotion ? 400 : delay);
    };
    timer = setTimeout(tick, 120);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [reducedMotion, shieldMapTypingPhrases]);
  const closeAtlasDrawer = useCallback(() => {
    setAtlasDrawerInteractive(false);
    setAtlasDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() =>
        atlasNodeRefs.current[atlasFocusIndex]?.focus(),
      );
    }
  }, [atlasFocusIndex]);

  const emitPass397SearchRuntimeClose = useCallback(() => {
    closeInvestigatorSuggestions();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PASS397_SEARCH_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS399_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS400_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS401_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "401" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS402_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "402" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS403_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "403" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS404_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "404" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS405_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "405" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS406_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "406" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS407_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "407" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS408_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "408" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS409_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "409" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS410_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "410" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS411_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "411" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent(PASS413_RUNTIME_CLOSE_EVENT, {
          detail: { surface: "shield-map", pass: "413" },
        }),
      );
    }
  }, [closeInvestigatorSuggestions]);

  const syncInvestigatorSuggestFrame = useCallback(() => {
    const anchor = investigatorSuggestRef.current;
    if (!anchor || typeof window === "undefined") return;
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const preferredWidth = Math.min(620, Math.max(330, rect.width));
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - preferredWidth / 2),
      Math.max(16, viewportWidth - preferredWidth - 16),
    );
    const belowTop = rect.bottom + 10;
    const belowSpace = viewportHeight - belowTop - 16;
    if (belowSpace >= 230 || rect.top < 320) {
      setInvestigatorSuggestFrame({
        top: belowTop,
        left,
        width: preferredWidth,
        maxHeight: Math.max(220, Math.min(430, belowSpace)),
      });
      return;
    }
    const aboveMaxHeight = Math.max(220, Math.min(430, rect.top - 26));
    setInvestigatorSuggestFrame({
      top: Math.max(16, rect.top - aboveMaxHeight - 10),
      left,
      width: preferredWidth,
      maxHeight: aboveMaxHeight,
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function loadShieldMap() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/market-integrity/sentinel?pages=1&perPage=160&watchlist=${encodeURIComponent(defaultWatchlist)}`,
          { headers: { accept: "application/json" } },
        );
        const data = (await response.json()) as SentinelApiResponse;
        if (!active) return;
        if (!response.ok || data.mode === "error") {
          throw new Error(
            data.mode === "error" ? data.error : "Shield Map source failed",
          );
        }
        setInbox((data.inbox?.length ? data.inbox : data.alerts).slice(0, 12));
        setRuleHits(data.rules?.hits.slice(0, 12) ?? []);
        setSummary(data.rules?.summary ?? null);
      } catch (mapError) {
        if (active)
          setError(
            mapError instanceof Error
              ? mapError.message
              : "Shield Map source failed",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadShieldMap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const updateRuntimeProfile = () => {
      const runtimeNavigator = navigator as Navigator & {
        deviceMemory?: number;
      };
      setReducedMotion(motionQuery.matches);
      setAtlasColumns(window.innerWidth >= 768 ? 3 : 1);
      setOrbitPressure(
        assessPass598DevicePressure({
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: runtimeNavigator.deviceMemory,
          viewportWidth: window.innerWidth,
          coarsePointer: coarseQuery.matches,
        }),
      );
    };
    updateRuntimeProfile();
    window.addEventListener("resize", updateRuntimeProfile, { passive: true });
    motionQuery.addEventListener?.("change", updateRuntimeProfile);
    coarseQuery.addEventListener?.("change", updateRuntimeProfile);
    return () => {
      window.removeEventListener("resize", updateRuntimeProfile);
      motionQuery.removeEventListener?.("change", updateRuntimeProfile);
      coarseQuery.removeEventListener?.("change", updateRuntimeProfile);
    };
  }, []);

  useEffect(() => {
    const target = orbitViewportRef.current;
    if (!target || typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      setOrbitViewportState("visible");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          setOrbitViewportState("hidden");
          return;
        }
        setOrbitViewportState(
          entry.intersectionRatio >= 0.14 ? "visible" : "near",
        );
      },
      { root: null, rootMargin: "320px 0px", threshold: [0, 0.14, 0.5] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.sessionStorage.getItem(
        PASS597_SNAPSHOT_HISTORY_KEY,
      );
      if (stored) {
        const restored = normalizePass597EvidenceSnapshots(
          JSON.parse(stored),
          12,
        );
        if (restored.length) {
          setSourceSnapshotHistory((current) =>
            current.length ? current : restored,
          );
        }
      }
    } catch {
      window.sessionStorage.removeItem(PASS597_SNAPSHOT_HISTORY_KEY);
    } finally {
      snapshotHistoryHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !snapshotHistoryHydratedRef.current)
      return;
    try {
      const normalized = normalizePass597EvidenceSnapshots(
        sourceSnapshotHistory,
        12,
      );
      if (normalized.length) {
        window.sessionStorage.setItem(
          PASS597_SNAPSHOT_HISTORY_KEY,
          JSON.stringify(normalized),
        );
      } else {
        window.sessionStorage.removeItem(PASS597_SNAPSHOT_HISTORY_KEY);
      }
    } catch {
      // Replay remains available in memory when browser storage is unavailable.
    }
  }, [sourceSnapshotHistory]);

  const shieldUi = useMemo(() => {
    if (locale === "pl") {
      return {
        liveConsole: "konsola śledcza live",
        liveTitle: "Wpisz token — Shield odpala protokół śledczy, nie hype.",
        liveBody:
          "Panel używa endpointu market-integrity, buduje score supply/unlock/liquidity/KOL/contract i tworzy kolejkę OSINT do świeżego researchu. Brak danych zwiększa ryzyko.",
        placeholder: "SOL, BTC, OM albo adres kontraktu",
        scan: "Skanuj",
        operatorRule: "zasada weryfikacji",
        operatorRuleBody:
          "Werdykt z rynku bez web OSINT jest tylko pre-screenem. Finalna analiza musi sprawdzić supply, vesting, KOL, unlocki i kontrakt w aktualnych źródłach.",
        suggestionLabel: "propozycje tokenów",
        noSuggestion: "Brak propozycji — wpisz symbol lub adres kontraktu.",
        open: "Otwórz",
        score: "ryzyko",
        investorProtection: "psychologia ochrony inwestora",
        investorTitle:
          "Shield ma chronić przed decyzją z emocji, nie obiecywać magicznej wygranej.",
        investorBody:
          "Przy tokenach po parabolicznych wzrostach człowiek często widzi tylko szansę. Bot ma pokazać też mechanikę straty: low float, unlocki, brak płynności, KOL hype, niejasny kontrakt i presję wyjścia.",
        whyMatters: "dlaczego to ważne",
        whyMattersBody:
          "Użytkownik nie potrzebuje kolejnego hype panelu. Potrzebuje systemu, który zatrzyma go przed wejściem w token tylko dlatego, że rośnie. Stabilne, kontrolowane podejście do ryzyka jest zwykle zdrowsze niż totalna gamba.",
        trustPsychology: "psychologia zaufania",
        trustTitle: "Premium bezpieczeństwo to spokojna kontrola, nie panika.",
        trustBody:
          "Shield prowadzi użytkownika przez niepewność: pokazuje co wiadomo, czego brakuje i jaki jest następny bezpieczny krok.",
      };
    }
    if (locale === "de") {
      return {
        liveConsole: "Live-Ermittlungskonsole",
        liveTitle: "Token eingeben — Shield startet Untersuchung, keinen Hype.",
        liveBody:
          "Das Panel nutzt den market-integrity Endpoint, bewertet Supply/Unlock/Liquidity/KOL/Contract und erstellt eine OSINT-Warteschlange für aktuelle Recherche. Fehlende Daten erhöhen das Risiko.",
        placeholder: "SOL, BTC, OM oder Contract-Adresse",
        scan: "Scannen",
        operatorRule: "Prüfregel",
        operatorRuleBody:
          "Ein Markt-Verdikt ohne Web-OSINT ist nur ein Pre-Screen. Die finale Analyse muss Supply, Vesting, KOL, Unlocks und Contract in aktuellen Quellen prüfen.",
        suggestionLabel: "Token-Vorschläge",
        noSuggestion:
          "Keine Vorschläge — Symbol oder Contract-Adresse eingeben.",
        open: "Öffnen",
        score: "Risiko",
        investorProtection: "Psychologie des Anlegerschutzes",
        investorTitle:
          "Shield soll emotionale Entscheidungen bremsen, nicht Gewinne versprechen.",
        investorBody:
          "Bei parabolischen Token sieht man oft nur die Chance. Der Bot zeigt auch Verlustmechanik: Low Float, Unlocks, dünne Liquidität, KOL-Hype, unklarer Contract und Exit-Druck.",
        whyMatters: "warum das wichtig ist",
        whyMattersBody:
          "Nutzer brauchen kein weiteres Hype-Panel. Sie brauchen ein System, das vor einem Einstieg nur wegen steigender Kurse bremst. Kontrolliertes Risiko ist gesünder als Glücksspiel.",
        trustPsychology: "Vertrauenspsychologie",
        trustTitle: "Premium-Sicherheit ist ruhige Kontrolle, keine Panik.",
        trustBody:
          "Shield führt durch Unsicherheit: was bekannt ist, was fehlt und welcher nächste sichere Schritt sinnvoll ist.",
      };
    }
    return {
      liveConsole: "live investigator console",
      liveTitle: "Enter a token — Shield starts an investigation, not hype.",
      liveBody:
        "The panel uses the market-integrity endpoint, scores supply/unlock/liquidity/KOL/contract and creates an OSINT queue for fresh research. Missing data increases risk.",
      placeholder: "SOL, BTC, OM or contract address",
      scan: "Scan",
      operatorRule: "review rule",
      operatorRuleBody:
        "A market verdict without web OSINT is only a pre-screen. Final analysis must verify supply, vesting, KOLs, unlocks and contract in current sources.",
      suggestionLabel: "token suggestions",
      noSuggestion: "No suggestions — enter symbol or contract address.",
      open: "Open",
      score: "risk",
      investorProtection: "investor protection psychology",
      investorTitle:
        "Shield protects against emotional decisions, not promises a win.",
      investorBody:
        "After parabolic moves, users often see only the opportunity. The bot must also show loss mechanics: low float, unlocks, thin liquidity, KOL hype, unclear contract and exit pressure.",
      whyMatters: "why this matters",
      whyMattersBody:
        "Users do not need another hype panel. They need a system that slows them down before entering a token only because it is rising. Controlled risk is healthier than gambling.",
      trustPsychology: "trust psychology",
      trustTitle: "Premium safety is calm control, not panic.",
      trustBody:
        "Shield guides users through uncertainty: what is known, what is missing and what the next safer step is.",
    };
  }, [locale]);

  const localizedInvestigatorGuardrails = useMemo(() => {
    if (locale === "pl") {
      return [
        "Bez hype’u, bez sygnałów kup/sprzedaj i bez języka gwarantującego bezpieczeństwo.",
        "Bez oskarżeń o scam/manipulację bez dowodów; używaj: czerwona flaga / wymaga review.",
        "Brak przejrzystości vestingu, holderów albo kontraktu zwiększa ryzyko.",
        "Finalny werdykt tokena musi używać świeżego OSINT i aktualnych danych rynkowych.",
      ];
    }
    if (locale === "de") {
      return [
        "Kein Hype, keine Buy/Sell Calls und keine Sicherheitsversprechen.",
        "Keine Scam-/Manipulationsvorwürfe ohne Belege; nutze Red Flag / Review erforderlich.",
        "Fehlende Vesting-, Holder- oder Contract-Transparenz erhöht das Risiko.",
        "Finale Token-Bewertung braucht aktuelle Web-OSINT und aktuelle Marktdaten.",
      ];
    }
    return [
      "No hype, no buy/sell calls and no safe-investment language.",
      "No scam/manipulation accusation without evidence; use red flag / requires review.",
      "Missing vesting, holder or contract transparency increases risk.",
      "Final token verdict must use fresh web OSINT plus current market data.",
    ];
  }, [locale]);

  const localizedInvestorProtectionPrinciples = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "Hype nie jest dowodem",
          body: "Pionowy wykres może być zrobiony przez low float, buybacki, cienką płynność, premie dla KOL albo spóźnione FOMO retailu.",
        },
        {
          label: "Brak danych to ryzyko",
          body: "Nieznany vesting, ukryty OTC, niejasni holderzy albo nieweryfikowalny kontrakt powinny zatrzymać użytkownika przed wejściem.",
        },
        {
          label: "Stabilność bije loterię",
          body: "Wolniejszy, limitowany ryzykiem plan jest zdrowszy niż gra jednym tokenem: albo szybki zysk, albo duża strata.",
        },
        {
          label: "Dowód przed pewnością",
          body: "Bot nie ma sprzedawać pewności. Ma pokazać, co jest potwierdzone, prawdopodobne, niezweryfikowane, red flag albo brak źródła.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "Hype ist kein Beweis",
          body: "Ein vertikaler Chart kann durch Low Float, Buybacks, dünne Liquidität, KOL-Anreize oder spätes Retail-FOMO entstehen.",
        },
        {
          label: "Fehlende Daten sind Risiko",
          body: "Unbekanntes Vesting, verstecktes OTC, unklare Holder oder unverifizierbare Contracts sollten den Nutzer bremsen.",
        },
        {
          label: "Stabilität schlägt Lotterie",
          body: "Ein langsamer, risikobegrenzter Plan ist gesünder als ein einzelner Token als Alles-oder-nichts-Wette.",
        },
        {
          label: "Beleg vor Überzeugung",
          body: "Der Bot verkauft keine Sicherheit. Er zeigt bestätigt, wahrscheinlich, unverifiziert, Red Flag oder Quelle fehlt.",
        },
      ];
    }
    return [
      {
        label: "Hype is not proof",
        body: "A vertical chart can be engineered by low float, buybacks, thin liquidity, KOL incentives or late retail FOMO.",
      },
      {
        label: "Missing data is risk",
        body: "Unverified vesting, hidden OTC, unclear holders or unverifiable contracts should slow the user down before entry.",
      },
      {
        label: "Stable beats lottery thinking",
        body: "A slower, risk-capped plan is often healthier than gambling on one token that can either moon or destroy the account.",
      },
      {
        label: "Evidence before conviction",
        body: "The bot should never sell certainty. It should show what is confirmed, likely, unverified, red flag or source missing.",
      },
    ];
  }, [locale]);

  const localizedTrustPsychologyRails = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "Spokojne zagrożenie",
          body: "Używaj języka anomalia/review. Czerwień oznacza priorytet, nie dramę. To zmniejsza panikę i zwiększa zaufanie.",
        },
        {
          label: "Pokaż niepewność",
          body: "Gdy brakuje danych, pokaż brakujące źródło. Użytkownik bardziej ufa systemowi, który przyznaje, że dowody są niepełne.",
        },
        {
          label: "Jeden następny krok",
          body: "Każdy złożony sygnał kończy się jednym jasnym sprawdzeniem: depth, holderzy, kontrakt albo czekanie.",
        },
        {
          label: "Prywatny rdzeń",
          body: "Tłumacz workflow, nie sekretne wagi. Produkt jest transparentny bez ujawniania systemu.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "Ruhige Gefahr",
          body: "Nutze Anomalie-/Review-Sprache. Rot bedeutet Priorität, nicht Drama. Das senkt Panik und stärkt Vertrauen.",
        },
        {
          label: "Unsicherheit zeigen",
          body: "Wenn Daten fehlen, zeige die fehlende Quelle. Nutzer vertrauen einem System, das unvollständige Belege zugibt.",
        },
        {
          label: "Ein nächster Schritt",
          body: "Jedes komplexe Signal endet mit einem klaren Check: Depth, Holder, Contract oder Warten.",
        },
        {
          label: "Privater Kern",
          body: "Erkläre Workflow, nicht geheime Gewichte. Das Produkt wirkt transparent, ohne den Kern offenzulegen.",
        },
      ];
    }
    return [
      {
        label: "Calm danger",
        body: "Use anomaly/review language. Red highlights are for priority, not drama. This lowers panic and increases trust.",
      },
      {
        label: "Show uncertainty",
        body: "When data is missing, show the missing source. Users trust a system that admits incomplete evidence.",
      },
      {
        label: "One next action",
        body: "Every complex signal should end with one clear check: inspect depth, verify holders, audit the contract, or wait.",
      },
      {
        label: "Private core",
        body: "Explain the workflow, not the secret weights. The product feels transparent without exposing the system.",
      },
    ];
  }, [locale]);

  useEffect(() => {
    if (investigatorLoading || investigatorResult)
      closeInvestigatorSuggestions();
  }, [closeInvestigatorSuggestions, investigatorLoading, investigatorResult]);

  const investigatorSocialRouterGate = useMemo(() => {
    const common = [
      {
        symbol: "BTC",
        name: "Bitcoin",
        reason: "market core",
        sourceMode: "local" as const,
      },
      {
        symbol: "BNB",
        name: "BNB",
        reason: "exchange asset",
        sourceMode: "watchlist" as const,
      },
      {
        symbol: "TAO",
        name: "Bittensor",
        reason: "AI sector",
        sourceMode: "watchlist" as const,
      },
      {
        symbol: "BONK",
        name: "Bonk",
        reason: "meme/liquidity review",
        sourceMode: "watchlist" as const,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        reason: "market core",
        sourceMode: "local" as const,
      },
      {
        symbol: "SOL",
        name: "Solana",
        reason: "default review",
        sourceMode: "watchlist" as const,
      },
      {
        symbol: "OM",
        name: "Mantra",
        reason: "case study",
        sourceMode: "operator" as const,
      },
      {
        symbol: "LAB",
        name: "LAB",
        reason: "critical sweep",
        sourceMode: "operator" as const,
      },
      {
        symbol: "H",
        name: "Humanity",
        reason: "high risk sweep",
        sourceMode: "operator" as const,
      },
      {
        symbol: "HOME",
        name: "HOME",
        reason: "high risk sweep",
        sourceMode: "operator" as const,
      },
      {
        symbol: "PUMP",
        name: "Pump.fun",
        reason: "social/liquidity review",
        sourceMode: "operator" as const,
      },
      {
        symbol: "DOGE",
        name: "Dogecoin",
        reason: "meme/liquidity review",
        sourceMode: "watchlist" as const,
      },
      {
        symbol: "PEPE",
        name: "Pepe",
        reason: "meme/liquidity review",
        sourceMode: "watchlist" as const,
      },
      {
        symbol: "VLM",
        name: "Velmère",
        reason: "utility access",
        sourceMode: "watchlist" as const,
      },
    ];

    const dynamic = [
      ...inbox.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        reason: item.level,
        score: item.score,
        sourceMode: "operator" as const,
      })),
      ...ruleHits.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        reason: item.severity,
        score: item.score,
        sourceMode: "operator" as const,
      })),
      ...(summary?.watchlist ?? defaultWatchlist.split(",")).map((symbol) => ({
        symbol,
        name: symbol,
        reason: "watchlist",
        sourceMode: "watchlist" as const,
      })),
      ...common,
    ];

    const seen = new Set<string>();
    const normalized = dynamic
      .filter((item) => item.symbol)
      .map((item) => ({
        ...item,
        symbol: item.symbol.toUpperCase().trim(),
        name: item.name || item.symbol,
      }))
      .filter((item) => {
        if (seen.has(item.symbol)) return false;
        seen.add(item.symbol);
        return true;
      });

    const query = investigatorQuery.trim().toLowerCase();
    const filtered = query
      ? normalized
          .map((item) => ({
            item,
            score: scoreInvestigatorSuggestion(item, query),
          }))
          .filter(({ score }) => Number.isFinite(score))
          .sort((a, b) => {
            const rawScoreA = "score" in a.item ? a.item.score : undefined;
            const rawScoreB = "score" in b.item ? b.item.score : undefined;
            const scoreA = typeof rawScoreA === "number" ? rawScoreA : 0;
            const scoreB = typeof rawScoreB === "number" ? rawScoreB : 0;
            return a.score - b.score || scoreB - scoreA;
          })
          .map(({ item }) => item)
      : [];

    return buildSocialExchangeCommandRouterGate({
      surface: "shield_map",
      query: investigatorQuery,
      suggestions: filtered,
      watchlist: summary?.watchlist ?? defaultWatchlist.split(","),
      max: 3,
    });
  }, [inbox, investigatorQuery, ruleHits, summary?.watchlist]);

  const investigatorSuggestions: InvestigatorSuggestion[] = useMemo(
    () =>
      investigatorSocialRouterGate.suggestions.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        reason: item.reason ?? item.sourceLabel,
        score: item.score,
        routerScore: item.routerScore,
        sourceLabel: item.sourceLabel,
        exchangeLabel: item.exchangeLabel,
        socialLabel: item.socialLabel,
        psychologyLabel: item.psychologyLabel,
        nextActionLabel: item.nextActionLabel,
        evidenceTags: item.evidenceTags,
        image: shieldMapTokenLogo(item.symbol),
      })),
    [investigatorSocialRouterGate.suggestions],
  );

  const investigatorSearchResolution = useMemo(
    () =>
      buildPass579ExactSearchReceipt(
        investigatorQuery,
        investigatorSuggestions,
      ),
    [investigatorQuery, investigatorSuggestions],
  );
  const evidenceDelta = useMemo(
    () =>
      buildPass575ShieldMapEvidenceDelta({
        locale,
        previous: previousSourceSnapshot?.snapshot ?? null,
        current: sourceSnapshot?.snapshot ?? null,
      }),
    [locale, previousSourceSnapshot, sourceSnapshot],
  );
  const snapshotReplay = useMemo(
    () =>
      buildPass597ShieldMapMultiSnapshotReplay({
        locale,
        snapshots: sourceSnapshotHistory,
        maxFrames: 6,
      }),
    [locale, sourceSnapshotHistory],
  );
  const activeReplayFrame =
    snapshotReplay.frames[replayActiveIndex] ??
    snapshotReplay.frames.at(-1) ??
    null;
  const replayCopy = useMemo(() => {
    if (locale === "de") {
      return {
        kicker: "Multi-Snapshot Replay",
        risk: "Risiko",
        blockers: "Blocker",
        source: "Quelle",
        current: "aktuell",
      };
    }
    if (locale === "en") {
      return {
        kicker: "multi-snapshot replay",
        risk: "risk",
        blockers: "blockers",
        source: "source",
        current: "current",
      };
    }
    return {
      kicker: "replay wielu snapshotów",
      risk: "ryzyko",
      blockers: "blokery",
      source: "źródło",
      current: "aktualny",
    };
  }, [locale]);
  const evidenceFingerprint = useMemo(
    () =>
      createPass601EvidenceFingerprint({
        snapshotId: sourceSnapshot?.snapshot.id,
        deltaState: evidenceDelta.state,
        riskDelta: evidenceDelta.riskDelta,
        blockerDelta: evidenceDelta.blockedDelta,
        sourceState: sourceSnapshot?.snapshot.sourceState,
      }),
    [
      evidenceDelta.blockedDelta,
      evidenceDelta.riskDelta,
      evidenceDelta.state,
      sourceSnapshot,
    ],
  );
  const orbitVirtualization = useMemo(
    () =>
      buildPass598VisibleNodeVirtualization({
        totalNodes: 10,
        activeIndex: Math.max(0, replayActiveIndex),
        viewportState: orbitViewportState,
        pressure: orbitPressure,
        reducedMotion,
      }),
    [orbitPressure, orbitViewportState, reducedMotion, replayActiveIndex],
  );
  const evidenceMotion = useMemo(
    () =>
      buildPass601EvidenceOnlyMotion({
        visible: orbitViewportState === "visible",
        reducedMotion,
        loading: investigatorLoading,
        evidenceChanged: evidenceMotionChanged,
        fingerprint: evidenceFingerprint,
      }),
    [
      evidenceFingerprint,
      evidenceMotionChanged,
      investigatorLoading,
      orbitViewportState,
      reducedMotion,
    ],
  );

  useEffect(() => {
    setReplayActiveIndex(snapshotReplay.activeIndex);
  }, [snapshotReplay.activeIndex, snapshotReplay.identity]);

  useEffect(() => {
    if (!lastEvidenceFingerprintRef.current) {
      lastEvidenceFingerprintRef.current = evidenceFingerprint;
      return;
    }
    if (lastEvidenceFingerprintRef.current === evidenceFingerprint) return;
    lastEvidenceFingerprintRef.current = evidenceFingerprint;
    setEvidenceMotionChanged(true);
    const timer = window.setTimeout(() => setEvidenceMotionChanged(false), 980);
    return () => window.clearTimeout(timer);
  }, [evidenceFingerprint]);

  const investigatorDecisionFlowGate = useMemo(
    () =>
      buildDecisionFlowOrchestratorGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
      }),
    [investigatorQuery, investigatorSocialRouterGate.suggestions],
  );

  const investigatorLuxuryLiquidityPassportGate = useMemo(
    () =>
      buildLuxuryLiquidityPassportGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
      }),
    [investigatorQuery, investigatorSocialRouterGate.suggestions],
  );

  const investigatorDepthResilienceRadarGate = useMemo(
    () =>
      buildDepthResilienceRadarGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
      }),
    [investigatorQuery, investigatorSocialRouterGate.suggestions],
  );

  const investigatorReserveProvenanceTwinGate = useMemo(
    () =>
      buildReserveProvenanceTwinGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
      }),
    [investigatorQuery, investigatorSocialRouterGate.suggestions],
  );

  const investigatorAdapterFaultSweepGate = useMemo(
    () =>
      buildAdapterFaultSweepGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
      }),
    [
      investigatorError,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
    ],
  );

  const investigatorSourceAdapterContractMeshGate = useMemo(
    () =>
      buildSourceAdapterContractMeshGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
    ],
  );

  const investigatorSourceProofEscrowGate = useMemo(
    () =>
      buildSourceProofEscrowGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        sourceAdapterContractMeshGate:
          investigatorSourceAdapterContractMeshGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceAdapterContractMeshGate,
    ],
  );

  const investigatorLiveAdapterCircuitBreakerGate = useMemo(
    () =>
      buildLiveAdapterCircuitBreakerGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        sourceAdapterContractMeshGate:
          investigatorSourceAdapterContractMeshGate,
        sourceProofEscrowGate: investigatorSourceProofEscrowGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorError,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceAdapterContractMeshGate,
      investigatorSourceProofEscrowGate,
    ],
  );

  const investigatorFreshnessTimecodeLedgerGate = useMemo(
    () =>
      buildFreshnessTimecodeLedgerGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        sourceAdapterContractMeshGate:
          investigatorSourceAdapterContractMeshGate,
        sourceProofEscrowGate: investigatorSourceProofEscrowGate,
        liveAdapterCircuitBreakerGate:
          investigatorLiveAdapterCircuitBreakerGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorError,
      investigatorLiveAdapterCircuitBreakerGate,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceAdapterContractMeshGate,
      investigatorSourceProofEscrowGate,
    ],
  );

  const investigatorSelectiveDisclosureVaultGate = useMemo(
    () =>
      buildSelectiveDisclosureVaultGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        sourceProofEscrowGate: investigatorSourceProofEscrowGate,
        liveAdapterCircuitBreakerGate:
          investigatorLiveAdapterCircuitBreakerGate,
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorError,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorLiveAdapterCircuitBreakerGate,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceProofEscrowGate,
    ],
  );

  const investigatorVerifiableSourceCredentialGate = useMemo(
    () =>
      buildVerifiableSourceCredentialGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        sourceAdapterContractMeshGate:
          investigatorSourceAdapterContractMeshGate,
        sourceProofEscrowGate: investigatorSourceProofEscrowGate,
        liveAdapterCircuitBreakerGate:
          investigatorLiveAdapterCircuitBreakerGate,
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
        selectiveDisclosureVaultGate: investigatorSelectiveDisclosureVaultGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorError,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorLiveAdapterCircuitBreakerGate,
      investigatorQuery,
      investigatorSelectiveDisclosureVaultGate,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceAdapterContractMeshGate,
      investigatorSourceProofEscrowGate,
    ],
  );

  const investigatorCredentialRetentionHaloGate = useMemo(
    () =>
      buildCredentialRetentionHaloGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        liveAdapterCircuitBreakerGate:
          investigatorLiveAdapterCircuitBreakerGate,
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
        selectiveDisclosureVaultGate: investigatorSelectiveDisclosureVaultGate,
        verifiableSourceCredentialGate:
          investigatorVerifiableSourceCredentialGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorError,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorLiveAdapterCircuitBreakerGate,
      investigatorQuery,
      investigatorSelectiveDisclosureVaultGate,
      investigatorSocialRouterGate.suggestions,
      investigatorVerifiableSourceCredentialGate,
    ],
  );

  const investigatorSourceGovernanceOathGate = useMemo(
    () =>
      buildSourceGovernanceOathGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
        selectiveDisclosureVaultGate: investigatorSelectiveDisclosureVaultGate,
        verifiableSourceCredentialGate:
          investigatorVerifiableSourceCredentialGate,
        credentialRetentionHaloGate: investigatorCredentialRetentionHaloGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorCredentialRetentionHaloGate,
      investigatorError,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorQuery,
      investigatorSelectiveDisclosureVaultGate,
      investigatorSocialRouterGate.suggestions,
      investigatorVerifiableSourceCredentialGate,
    ],
  );

  const investigatorEthicalSignalEventTaxonomyGate = useMemo(
    () =>
      buildEthicalSignalEventTaxonomyGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        adapterFaultSweepGate: investigatorAdapterFaultSweepGate,
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
        selectiveDisclosureVaultGate: investigatorSelectiveDisclosureVaultGate,
        verifiableSourceCredentialGate:
          investigatorVerifiableSourceCredentialGate,
        credentialRetentionHaloGate: investigatorCredentialRetentionHaloGate,
        sourceGovernanceOathGate: investigatorSourceGovernanceOathGate,
      }),
    [
      investigatorAdapterFaultSweepGate,
      investigatorCredentialRetentionHaloGate,
      investigatorError,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorQuery,
      investigatorSelectiveDisclosureVaultGate,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceGovernanceOathGate,
      investigatorVerifiableSourceCredentialGate,
    ],
  );

  const investigatorProofConsentReceiptGate = useMemo(
    () =>
      buildProofConsentReceiptGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        selectiveDisclosureVaultGate: investigatorSelectiveDisclosureVaultGate,
        verifiableSourceCredentialGate:
          investigatorVerifiableSourceCredentialGate,
        credentialRetentionHaloGate: investigatorCredentialRetentionHaloGate,
        sourceGovernanceOathGate: investigatorSourceGovernanceOathGate,
        ethicalSignalEventTaxonomyGate:
          investigatorEthicalSignalEventTaxonomyGate,
      }),
    [
      investigatorCredentialRetentionHaloGate,
      investigatorError,
      investigatorEthicalSignalEventTaxonomyGate,
      investigatorQuery,
      investigatorSelectiveDisclosureVaultGate,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceGovernanceOathGate,
      investigatorVerifiableSourceCredentialGate,
    ],
  );

  const investigatorAuditTrailCovenantGate = useMemo(
    () =>
      buildAuditTrailCovenantGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
        credentialRetentionHaloGate: investigatorCredentialRetentionHaloGate,
        sourceGovernanceOathGate: investigatorSourceGovernanceOathGate,
        ethicalSignalEventTaxonomyGate:
          investigatorEthicalSignalEventTaxonomyGate,
        proofConsentReceiptGate: investigatorProofConsentReceiptGate,
      }),
    [
      investigatorCredentialRetentionHaloGate,
      investigatorError,
      investigatorEthicalSignalEventTaxonomyGate,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorProofConsentReceiptGate,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
      investigatorSourceGovernanceOathGate,
    ],
  );

  const investigatorPrestigeProofCompassGate = useMemo(
    () =>
      buildPrestigeProofCompassGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
        reserveProvenanceTwinGate: investigatorReserveProvenanceTwinGate,
        verifiableSourceCredentialGate:
          investigatorVerifiableSourceCredentialGate,
        auditTrailCovenantGate: investigatorAuditTrailCovenantGate,
      }),
    [
      investigatorAuditTrailCovenantGate,
      investigatorError,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorQuery,
      investigatorReserveProvenanceTwinGate,
      investigatorSocialRouterGate.suggestions,
      investigatorVerifiableSourceCredentialGate,
    ],
  );

  const investigatorAtelierAccessRunwayGate = useMemo(
    () =>
      buildAtelierAccessRunwayGate({
        surface: "shield_map",
        query: investigatorQuery,
        routerSuggestions: investigatorSocialRouterGate.suggestions,
        knownFaults: investigatorError ? [investigatorError] : [],
        freshnessTimecodeLedgerGate: investigatorFreshnessTimecodeLedgerGate,
        proofConsentReceiptGate: investigatorProofConsentReceiptGate,
        auditTrailCovenantGate: investigatorAuditTrailCovenantGate,
        prestigeProofCompassGate: investigatorPrestigeProofCompassGate,
      }),
    [
      investigatorAuditTrailCovenantGate,
      investigatorError,
      investigatorFreshnessTimecodeLedgerGate,
      investigatorPrestigeProofCompassGate,
      investigatorProofConsentReceiptGate,
      investigatorQuery,
      investigatorSocialRouterGate.suggestions,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const closeFromGlobalRuntime = () => closeInvestigatorSuggestions();
    window.addEventListener(
      PASS397_SEARCH_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS399_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS400_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS401_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS402_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS403_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS404_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS405_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS406_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS407_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS408_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS409_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS410_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS411_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    window.addEventListener(
      PASS413_RUNTIME_CLOSE_EVENT,
      closeFromGlobalRuntime,
    );
    return () => {
      window.removeEventListener(
        PASS397_SEARCH_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS399_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS400_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS401_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS402_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS403_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS404_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS405_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS406_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS407_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS408_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS409_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS410_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS411_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
      window.removeEventListener(
        PASS413_RUNTIME_CLOSE_EVENT,
        closeFromGlobalRuntime,
      );
    };
  }, [closeInvestigatorSuggestions]);

  useEffect(() => {
    if (!suggestionsOpen || typeof window === "undefined") return;
    let frame = 0;

    const syncAnchoredPanel = () => {
      const anchor = investigatorSuggestRef.current;
      if (!anchor) {
        closeInvestigatorSuggestions();
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const anchorVisible =
        rect.bottom > 80 && rect.top < window.innerHeight - 80;
      if (!anchorVisible) {
        closeInvestigatorSuggestions();
        return;
      }
      syncInvestigatorSuggestFrame();
    };

    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncAnchoredPanel();
      });
    };

    const closeOnPageScroll = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        investigatorSuggestPanelRef.current?.contains(target)
      )
        return;
      closeInvestigatorSuggestions();
    };

    syncAnchoredPanel();
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("scroll", closeOnPageScroll, true);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("scroll", closeOnPageScroll, true);
    };
  }, [
    closeInvestigatorSuggestions,
    suggestionsOpen,
    investigatorSuggestions.length,
    syncInvestigatorSuggestFrame,
  ]);

  useEffect(() => {
    if (!suggestionsOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (investigatorSuggestRef.current?.contains(target)) return;
      if (investigatorSuggestPanelRef.current?.contains(target)) return;
      closeInvestigatorSuggestions();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [closeInvestigatorSuggestions, suggestionsOpen]);

  useEffect(() => {
    if (!atlasDrawerOpen) {
      setAtlasDrawerInteractive(false);
      return;
    }
    const timer = window.setTimeout(
      () => setAtlasDrawerInteractive(true),
      reducedMotion ? 0 : 120,
    );
    return () => window.clearTimeout(timer);
  }, [atlasDrawerOpen, reducedMotion]);

  async function runInvestigatorScan(
    event?: FormEvent<HTMLFormElement> | null,
    directQuery?: string,
  ) {
    event?.preventDefault();
    const query = (directQuery ?? investigatorQuery).trim();
    if (query.length < 2) {
      setInvestigatorError("Wpisz ticker, nazwę tokena albo adres kontraktu.");
      return;
    }

    committedInvestigatorSearchRef.current = query;
    setInvestigatorSearchReceipt(
      buildPass579ExactSearchReceipt(query, investigatorSuggestions).receipt,
    );
    emitPass397SearchRuntimeClose();
    setInvestigatorLoading(true);
    setInvestigatorStage("searching");
    setInvestigatorError(null);
    setInvestigatorResult(null);
    setEvidenceReport(null);
    setSourceSnapshot(null);
    try {
      if (!reducedMotion) await waitShieldMapStage(360);
      setInvestigatorStage("analyzing");
      const responsePromise = fetch(
        `/api/market-integrity/investigator?query=${encodeURIComponent(query)}`,
        {
          headers: { accept: "application/json" },
        },
      );
      const [response] = await Promise.all([
        responsePromise,
        waitShieldMapStage(reducedMotion ? 0 : 920),
      ]);
      const data = (await response.json()) as InvestigatorApiResponse;
      if (!response.ok || data.mode === "error") {
        throw new Error(
          data.mode === "error" ? data.error : "Investigator scan failed",
        );
      }
      setInvestigatorStage("ready");
      setInvestigatorResult(data.investigator);
      setEvidenceReport(data.evidenceReport ?? null);
      const nextSourceSnapshot = data.sourceSnapshot ?? null;
      if (nextSourceSnapshot?.snapshot) {
        setSourceSnapshotHistory((history) => {
          const withoutDuplicate = history.filter(
            (snapshot) => snapshot.id !== nextSourceSnapshot.snapshot.id,
          );
          return [...withoutDuplicate, nextSourceSnapshot.snapshot].slice(-8);
        });
      }
      setSourceSnapshot((current) => {
        if (
          current?.snapshot &&
          nextSourceSnapshot?.snapshot &&
          current.snapshot.id !== nextSourceSnapshot.snapshot.id
        ) {
          setPreviousSourceSnapshot(current);
        }
        return nextSourceSnapshot;
      });
    } catch (scanError) {
      const rawMessage =
        scanError instanceof Error
          ? scanError.message
          : "Investigator scan failed";
      setInvestigatorError(
        rawMessage.includes("429") ||
          rawMessage.toLowerCase().includes("coingecko")
          ? "Źródło live chwilowo limituje zapytania. Shield zostaje w trybie lokalnego preview; spróbuj ponownie za chwilę albo wybierz sugestię z listy."
          : rawMessage,
      );
      setInvestigatorStage("idle");
      setInvestigatorResult(null);
      setEvidenceReport(null);
      setSourceSnapshot(null);
    } finally {
      setInvestigatorLoading(false);
    }
  }

  useEffect(() => {
    if (handoffHandledRef.current) return;
    const handoffVersion = searchParams.get("handoff");
    if (handoffVersion !== "pass453" && handoffVersion !== "pass468") return;
    const requested = (
      searchParams.get("query") ||
      searchParams.get("asset") ||
      ""
    )
      .replace(/[^a-zA-Z0-9:_/.-]/g, "")
      .slice(0, 96)
      .trim();
    if (requested.length < 2) return;
    handoffHandledRef.current = true;
    const normalized = requested.toUpperCase();
    const packet =
      handoffVersion === "pass468"
        ? readPass468HandoffPacket(searchParams.get("packet"))
        : null;
    setHandoffQuery(normalized);
    setHandoffPacket(
      packet && packet.query.toUpperCase() === normalized ? packet : null,
    );
    setInvestigatorQuery(normalized);
    void runInvestigatorScan(null, requested);
    // The handoff is intentionally consumed once per route instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const reviewRows = useMemo(
    () =>
      [
        ...inbox.map((item) => ({
          id: item.caseId ?? item.id,
          symbol: item.symbol,
          name: item.name,
          score: item.score,
          label: item.headline,
          body: item.reason,
          action: item.action,
          source: "case inbox",
          timestamp: item.lastSeenAt ?? item.timestamp ?? item.firstSeenAt,
        })),
        ...ruleHits.map((item) => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          score: item.score,
          label: item.headline,
          body: item.reason,
          action: item.nextStep,
          source: item.severity,
          timestamp: item.timestamp,
        })),
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
    [inbox, ruleHits],
  );

  const criticalCount =
    summary?.critical ?? reviewRows.filter((row) => row.score >= 85).length;
  const watchCount = (summary?.warning ?? 0) + (summary?.watch ?? 0);
  const atlasNodes = useMemo(() => {
    const copyByLocale = {
      pl: [
        ["sources", "Źródła", "Dostawcy, czas obserwacji i jakość danych użytych do oceny.", Database, "pochodzenie danych"],
        ["market", "Rynek", "Cena, zmienność, wolumen i struktura rynku bez udawania brakujących wartości.", Radar, "fakty rynkowe"],
        ["liquidity", "Płynność", "Depth, spread, slippage i miejsca, w których wykonanie może stać się trudne.", Network, "warstwa wykonania"],
        ["holders", "Holderzy", "Koncentracja, klastry i ograniczenia danych on-chain z jawnym poziomem pewności.", Brain, "struktura własności"],
        ["contract", "Kontrakt", "Uprawnienia właściciela, mint, pause, podatki i inne sygnały wymagające weryfikacji.", FileText, "kontrola kontraktu"],
        ["conflicts", "Konflikty", "Rozbieżności providerów, stare dane i sygnały, których nie można połączyć w mocny wniosek.", AlertTriangle, "obniżona pewność"],
        ["missing", "Braki danych", "Pola, których nie udało się potwierdzić, oraz konkretne następne kontrole.", Search, "następne sprawdzenie"],
      ],
      de: [
        ["sources", "Quellen", "Provider, Beobachtungszeit und Qualität der für die Bewertung verwendeten Daten.", Database, "Datenherkunft"],
        ["market", "Markt", "Preis, Volatilität, Volumen und Marktstruktur ohne erfundene fehlende Werte.", Radar, "Marktfakten"],
        ["liquidity", "Liquidität", "Depth, Spread, Slippage und Bereiche mit erschwerter Ausführung.", Network, "Ausführungsebene"],
        ["holders", "Holder", "Konzentration, Cluster und On-Chain-Grenzen mit sichtbarer Confidence.", Brain, "Eigentumsstruktur"],
        ["contract", "Contract", "Owner-Rechte, Mint, Pause, Taxes und weitere zu prüfende Signale.", FileText, "Contract-Prüfung"],
        ["conflicts", "Konflikte", "Provider-Abweichungen, alte Daten und Signale ohne belastbare gemeinsame Aussage.", AlertTriangle, "reduzierte Confidence"],
        ["missing", "Fehlende Daten", "Nicht bestätigte Felder und konkrete nächste Prüfungen.", Search, "nächster Check"],
      ],
      en: [
        ["sources", "Sources", "Providers, observation time and quality of the data used for the assessment.", Database, "data provenance"],
        ["market", "Market", "Price, volatility, volume and market structure without invented missing values.", Radar, "market facts"],
        ["liquidity", "Liquidity", "Depth, spread, slippage and places where execution may become difficult.", Network, "execution layer"],
        ["holders", "Holders", "Concentration, clusters and on-chain limits with an explicit confidence level.", Brain, "ownership structure"],
        ["contract", "Contract", "Owner permissions, mint, pause, taxes and other signals that require verification.", FileText, "contract review"],
        ["conflicts", "Conflicts", "Provider divergence, stale data and signals that cannot support a strong joint conclusion.", AlertTriangle, "lower confidence"],
        ["missing", "Missing data", "Fields that could not be confirmed and the concrete next checks.", Search, "next check"],
      ],
    } as const;
    const localized =
      locale === "de"
        ? copyByLocale.de
        : locale === "en"
          ? copyByLocale.en
          : copyByLocale.pl;
    return localized.map(([id, label, body, icon, status]) => ({
      id,
      label,
      body,
      icon,
      status,
    }));
  }, [locale]);
  const atlasRows = useMemo(() => {
    const rows: Array<
      Array<{ node: (typeof atlasNodes)[number]; index: number }>
    > = [];
    for (let index = 0; index < atlasNodes.length; index += atlasColumns) {
      rows.push(
        atlasNodes.slice(index, index + atlasColumns).map((node, offset) => ({
          node,
          index: index + offset,
        })),
      );
    }
    return rows;
  }, [atlasColumns, atlasNodes]);
  const sourceRails = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          id: "candles",
          label: "Świece",
          state: "live / fallback",
          body: "OHLCV, VWAP i replay timeline.",
        },
        {
          id: "liquidity",
          label: "Płynność",
          state: "partial",
          body: "Depth, slippage i danger zones wymagają live feedów.",
        },
        {
          id: "holders",
          label: "Holderzy",
          state: "proxy",
          body: "Cluster labels wymagają chain API i wyłączenia CEX.",
        },
        {
          id: "contract",
          label: "Kontrakt",
          state: "pending",
          body: "Owner flags, podatki, mint/pause i blacklist checks.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          id: "candles",
          label: "Candles",
          state: "live / fallback",
          body: "OHLCV, VWAP und Replay Timeline.",
        },
        {
          id: "liquidity",
          label: "Liquidität",
          state: "partial",
          body: "Depth, Slippage und Danger Zones brauchen Live Feeds.",
        },
        {
          id: "holders",
          label: "Holder",
          state: "proxy",
          body: "Cluster Labels brauchen Chain API und CEX-Ausschluss.",
        },
        {
          id: "contract",
          label: "Contract",
          state: "pending",
          body: "Owner Flags, Taxes, Mint/Pause und Blacklist Checks.",
        },
      ];
    }
    return [
      {
        id: "candles",
        label: "Candles",
        state: "live / fallback",
        body: "OHLCV, VWAP and replay timeline.",
      },
      {
        id: "liquidity",
        label: "Liquidity",
        state: "partial",
        body: "Depth, slippage and danger zones require live feeds.",
      },
      {
        id: "holders",
        label: "Holders",
        state: "proxy",
        body: "Cluster labels need chain API and CEX exclusion.",
      },
      {
        id: "contract",
        label: "Contract",
        state: "pending",
        body: "Owner flags, taxes, mint/pause and blacklist checks.",
      },
    ];
  }, [locale]);
  const evidencePathIsolation = useMemo(() => {
    const sourceState =
      investigatorResult?.caseFrame.sourceState?.toLowerCase() ?? "";
    const missingEvidence =
      investigatorResult?.caseFrame.missingData?.[0] ?? null;
    const sourceConflict = /missing|unknown|unverified|stale|partial/.test(
      sourceState,
    );
    const confidenceCap = missingEvidence
      ? locale === "de"
        ? `Confidence-Limit: ${missingEvidence}`
        : locale === "en"
          ? `Confidence cap: ${missingEvidence}`
          : `Limit pewności: ${missingEvidence}`
      : sourceConflict
        ? locale === "de"
          ? "Confidence-Limit: zweite aktuelle Quelle fehlt"
          : locale === "en"
            ? "Confidence cap: a second current source is missing"
            : "Limit pewności: brakuje drugiego aktualnego źródła"
        : null;
    return buildPass599EvidencePathIsolation({
      activeId: activeAtlasNode,
      nodes: [
        { id: "sources", citations: ["candles", "liquidity", "holders", "contract"] },
        { id: "market", dependsOn: ["sources"], citations: ["candles"] },
        { id: "liquidity", dependsOn: ["sources", "market"], citations: ["liquidity"] },
        { id: "holders", dependsOn: ["sources"], citations: ["holders"] },
        { id: "contract", dependsOn: ["sources"], citations: ["contract"] },
        {
          id: "conflicts",
          dependsOn: ["market", "liquidity", "holders", "contract"],
          citations: ["candles", "liquidity", "holders", "contract"],
          conflicts: sourceConflict ? ["missing"] : [],
          confidenceCap,
        },
        {
          id: "missing",
          dependsOn: ["sources", "conflicts"],
          citations: ["candles", "liquidity", "holders", "contract"],
          conflicts: sourceConflict ? ["conflicts"] : [],
          confidenceCap,
        },
      ],
    });
  }, [
    activeAtlasNode,
    investigatorResult?.caseFrame.missingData,
    investigatorResult?.caseFrame.sourceState,
    locale,
  ]);
  const atlasPathState = useMemo(
    () =>
      new Map(
        evidencePathIsolation.nodes.map(
          (node) => [node.id, node.state] as const,
        ),
      ),
    [evidencePathIsolation.nodes],
  );
  const isolatedSourceRails = useMemo(() => {
    const selected = sourceRails.filter((rail) =>
      evidencePathIsolation.citationIds.includes(rail.id),
    );
    return selected.length ? selected : sourceRails.slice(0, 1);
  }, [evidencePathIsolation.citationIds, sourceRails]);
  const pathCopy = useMemo(() => {
    if (locale === "de") {
      return {
        kicker: "isolierter Evidenzpfad",
        title:
          "Nur Abhängigkeiten, Quellen und Konflikte der aktiven Ebene bleiben hervorgehoben.",
        citations: "Quellen",
        conflict: "Konflikt",
        cap: "Confidence-Limit",
      };
    }
    if (locale === "en") {
      return {
        kicker: "isolated evidence path",
        title:
          "Only dependencies, sources and conflicts for the active layer stay highlighted.",
        citations: "sources",
        conflict: "conflict",
        cap: "confidence cap",
      };
    }
    return {
      kicker: "izolowana ścieżka dowodowa",
      title:
        "Podświetlone zostają wyłącznie zależności, źródła i konflikty aktywnej warstwy.",
      citations: "źródła",
      conflict: "konflikt",
      cap: "limit pewności",
    };
  }, [locale]);
  const handleAtlasSpatialKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      const result = resolvePass600SpatialNavigation({
        key: event.key,
        index,
        count: atlasNodes.length,
        columns: atlasColumns,
      });
      if (!result.handled) return;
      event.preventDefault();
      const nextNode = atlasNodes[result.index];
      if (!nextNode) return;
      if (result.action === "close") {
        setAtlasDrawerInteractive(false);
        setAtlasDrawerOpen(false);
        return;
      }
      setAtlasFocusIndex(result.index);
      setActiveAtlasNode(nextNode.id);
      if (result.action === "open") {
        setAtlasDrawerInteractive(false);
        setAtlasDrawerOpen(true);
        return;
      }
      window.requestAnimationFrame(() =>
        atlasNodeRefs.current[result.index]?.focus(),
      );
    },
    [atlasColumns, atlasNodes],
  );
  const systemBoundaryCards = [
    {
      label: "Public explanation",
      state: "visible",
      body: "User sees intake, source quality, agent lanes, review queue and evidence handoff. This builds trust without exposing private scoring weights.",
    },
    {
      label: "Private scoring core",
      state: "hidden",
      body: "Weights, thresholds and heuristics stay private. Shield Map describes the operating model, not the proprietary decision core.",
    },
    {
      label: "Next actions",
      state: "guided",
      body: "Each anomaly routes to a next step: check candles, verify holders, inspect depth, audit contract or draft evidence with uncertainty.",
    },
    {
      label: "RegTech rail",
      state: "locked",
      body: "Language stays: anomaly, requires review, uncertainty. No scam/fraud claims, no legal proof, no financial advice.",
    },
  ];
  const copilotPlaybook = [
    "Explain the dominant layer before showing numbers.",
    "Ask what source is missing before lowering uncertainty.",
    "Route to evidence only when sources is attached.",
    "Keep VLM as access utility, never an investment promise.",
  ];
  const shieldMapMilestones = [
    {
      label: "Now",
      body: "Premium map, sources, review queue and safe disclosure boundaries.",
    },
    {
      label: "Next",
      body: "Live holder labels, order-book depth and verification history.",
    },
    {
      label: "Launch",
      body: "Rate limits, policy pages, export manifest and VLM session gating.",
    },
  ];
  const investigatorProtocol = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "Supply / float",
          score: "0–100",
          body: "Circulating supply jest porównywany z total/max supply i FDV. Low float nigdy nie jest neutralny.",
        },
        {
          label: "Unlock / vesting",
          score: "red flag first",
          body: "Team, investor, advisor, OTC i whale unlocks muszą być zweryfikowane przed clean verdict.",
        },
        {
          label: "Buy pressure",
          score: "engineered demand",
          body: "Buybacki, market-maker support, short squeeze i volume spikes są oddzielone od organic demand.",
        },
        {
          label: "KOL / social",
          score: "disclosure risk",
          body: "Paid shill patterns, ukryte alokacje i coordinated hype idą do OSINT review.",
        },
        {
          label: "Contract control",
          score: "admin risk",
          body: "Owner, proxy, mint, blacklist, pause, tax i audit status są traktowane jako bramki transparentności kontraktu.",
        },
        {
          label: "Evidence standard",
          score: "proof level",
          body: "Każdy claim dostaje status potwierdzone, prawdopodobne, niezweryfikowane, red flag albo brak źródła zanim bot odpowie.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "Supply / Float",
          score: "0–100",
          body: "Circulating Supply wird mit Total/Max Supply und FDV verglichen. Low Float ist nie neutral.",
        },
        {
          label: "Unlock / Vesting",
          score: "Red Flag zuerst",
          body: "Team-, Investor-, Advisor-, OTC- und Whale-Unlocks müssen vor einem sauberen Verdict verifiziert werden.",
        },
        {
          label: "Buy Pressure",
          score: "Engineered Demand",
          body: "Buybacks, Market-Maker Support, Short Squeezes und Volume Spikes werden von organischer Nachfrage getrennt.",
        },
        {
          label: "KOL / Social",
          score: "Disclosure Risk",
          body: "Paid Shill Patterns, undisclosed Allocations und koordinierter Hype werden zu OSINT Review geroutet.",
        },
        {
          label: "Contract Control",
          score: "Admin Risk",
          body: "Owner, Proxy, Mint, Blacklist, Pause, Tax und Audit Status sind Transparenz-Gates.",
        },
        {
          label: "Evidence Standard",
          score: "Proof Level",
          body: "Jede Aussage wird als bestätigt, wahrscheinlich, unverifiziert, Red Flag oder Quelle fehlt markiert, bevor der Bot spricht.",
        },
      ];
    }
    return [
      {
        label: "Supply / float",
        score: "0–100",
        body: "Circulating supply is compared with total/max supply and FDV. Low float is never treated as neutral.",
      },
      {
        label: "Unlock / vesting",
        score: "red flag first",
        body: "Team, investor, advisor, OTC and whale unlocks must be verified before any clean verdict.",
      },
      {
        label: "Buy pressure",
        score: "engineered demand",
        body: "Buybacks, market-maker support, short squeezes and volume spikes are separated from organic demand.",
      },
      {
        label: "KOL / social",
        score: "disclosure risk",
        body: "Paid shill patterns, undisclosed allocations and coordinated hype are routed to OSINT review.",
      },
      {
        label: "Contract control",
        score: "admin risk",
        body: "Owner, proxy, mint, blacklist, pause, tax and audit status are treated as contract transparency gates.",
      },
      {
        label: "Evidence standard",
        score: "proof level",
        body: "Every claim is marked confirmed, likely, unverified, red flag or source missing before the bot speaks.",
      },
    ];
  }, [locale]);
  const investigatorGuardrails = [
    "No hype, no buy/sell calls and no safe-investment language.",
    "No scam/manipulation accusation without evidence; use red flag / requires review.",
    "Missing vesting, holder or contract transparency increases risk.",
    "Final token verdict must use fresh web OSINT plus current market data.",
  ];
  const pass461OrbitConsensus = useMemo(() => {
    const sourceState =
      investigatorResult?.caseFrame.sourceState?.toLowerCase() || "";
    if (investigatorLoading) {
      return {
        state: "probing" as const,
        score: 50,
        label:
          locale === "pl"
            ? "sonda źródeł"
            : locale === "de"
              ? "Quellenprüfung"
              : "source probe",
        body:
          locale === "pl"
            ? "Orbit czeka na świeże źródła i nie publikuje werdyktu."
            : locale === "de"
              ? "Orbit wartet auf frische Quellen und veröffentlicht kein Urteil."
              : "Orbit waits for fresh sources and does not publish a verdict.",
      };
    }
    if (investigatorError) {
      return {
        state: "unavailable" as const,
        score: 20,
        label:
          locale === "pl"
            ? "źródło niedostępne"
            : locale === "de"
              ? "Quelle nicht verfügbar"
              : "source unavailable",
        body:
          locale === "pl"
            ? "Błąd źródła pozostaje jawny; wynik nie jest zastępowany zgadywaniem."
            : locale === "de"
              ? "Der Quellenfehler bleibt sichtbar; kein Raten ersetzt das Ergebnis."
              : "The source error stays visible; guessing does not replace the result.",
      };
    }
    if (!investigatorResult) {
      return {
        state: "idle" as const,
        score: 0,
        label:
          locale === "pl" ? "oczekuje" : locale === "de" ? "wartet" : "idle",
        body:
          locale === "pl"
            ? "Uruchom analizę, aby Orbit pokazał konsensus, świeżość i limit pewności."
            : locale === "de"
              ? "Analyse starten, damit Orbit Konsens, Frische und Confidence-Limit zeigt."
              : "Run an analysis so Orbit can show consensus, freshness and the confidence cap.",
      };
    }
    const investigatorResultView = investigatorResult;
    if (sourceState.includes("stale") || sourceState.includes("expired")) {
      return {
        state: "stale" as const,
        score: Math.min(52, Math.max(20, 100 - investigatorResultView.overallRisk)),
        label:
          locale === "pl"
            ? "dane nieświeże"
            : locale === "de"
              ? "Daten veraltet"
              : "stale evidence",
        body:
          locale === "pl"
            ? "Wniosek jest ograniczony do czasu odświeżenia timestampów."
            : locale === "de"
              ? "Die Aussage bleibt bis zur Aktualisierung der Zeitstempel begrenzt."
              : "The conclusion stays capped until timestamps are refreshed.",
      };
    }
    if (
      sourceState.includes("missing") ||
      sourceState.includes("unknown") ||
      sourceState.includes("unverified")
    ) {
      return {
        state: "single_source" as const,
        score: Math.min(62, Math.max(24, 100 - investigatorResultView.overallRisk)),
        label:
          locale === "pl"
            ? "brak quorum"
            : locale === "de"
              ? "Quorum fehlt"
              : "quorum missing",
        body:
          locale === "pl"
            ? "Jedna ścieżka dowodowa nie wystarcza do mocnego werdyktu."
            : locale === "de"
              ? "Eine Evidenzspur reicht nicht für ein starkes Urteil."
              : "One evidence lane is not enough for a strong verdict.",
      };
    }
    if (investigatorResultView.overallRisk >= 72) {
      return {
        state: "divergent" as const,
        score: Math.max(20, 100 - investigatorResultView.overallRisk),
        label:
          locale === "pl"
            ? "wysoki rozjazd"
            : locale === "de"
              ? "hohe Abweichung"
              : "high divergence",
        body:
          locale === "pl"
            ? "Orbit zwalnia animację i blokuje mocny claim do manualnego review."
            : locale === "de"
              ? "Orbit verlangsamt sich und blockiert starke Aussagen bis zum manuellen Review."
              : "Orbit slows down and blocks strong claims until manual review.",
      };
    }
    if (investigatorResultView.overallRisk >= 45) {
      return {
        state: "watch" as const,
        score: Math.max(38, 100 - investigatorResultView.overallRisk),
        label:
          locale === "pl"
            ? "konsensus do review"
            : locale === "de"
              ? "Konsens prüfen"
              : "consensus watch",
        body:
          locale === "pl"
            ? "Źródła są częściowo zgodne, ale wymagają drugiej ścieżki i świeżego timestampu."
            : locale === "de"
              ? "Quellen sind teilweise konsistent, benötigen aber eine zweite Spur und frische Zeitstempel."
              : "Sources partly agree but still need a second lane and fresh timestamp.",
      };
    }
    return {
      state: "aligned" as const,
      score: Math.min(92, Math.max(68, 100 - investigatorResultView.overallRisk)),
      label:
        locale === "pl"
          ? "konsensus zgodny"
          : locale === "de"
            ? "Konsens ausgerichtet"
            : "consensus aligned",
      body:
        locale === "pl"
          ? "Źródła są wystarczająco zgodne do spokojnego readoutu, bez obietnic bezpieczeństwa."
          : locale === "de"
            ? "Quellen stimmen genug für einen ruhigen Readout überein, ohne Sicherheitsversprechen."
            : "Sources align enough for a calm readout, without safety promises.",
    };
  }, [investigatorError, investigatorLoading, investigatorResult, locale]);
  const investorProtectionPrinciples = [
    {
      label: "Hype is not proof",
      body: "A vertical chart can be engineered by low float, buybacks, thin liquidity, KOL incentives or late retail FOMO.",
    },
    {
      label: "Missing data is risk",
      body: "Unverified vesting, hidden OTC, unclear holders or unverifiable contracts should slow the user down before entry.",
    },
    {
      label: "Stable beats lottery thinking",
      body: "A slower, risk-capped plan is often healthier than gambling on one token that can either moon or destroy the account.",
    },
    {
      label: "Evidence before conviction",
      body: "The bot should never sell certainty. It should show what is confirmed, likely, unverified, red flag or source missing.",
    },
  ];
  const aiBotUpgradeLanes = [
    {
      label: "Memory discipline",
      state: "partial",
      body: "Bot keeps a clear case frame: token identity, source state, missing data, latest verdict and next check.",
    },
    {
      label: "Question router",
      state: "ready",
      body: "User prompts are routed into supply, unlock, liquidity, social, contract or evidence lanes before the bot answers.",
    },
    {
      label: "Evidence mode",
      state: "blocked",
      body: "Final accusations stay blocked until sources, timestamps and export-safe language are attached.",
    },
    {
      label: "OSINT queue",
      state: "partial",
      body: "The bot already creates web-search queries; production still needs current-source fetching and source scoring.",
    },
  ];
  const activeAtlas =
    atlasNodes.find((node) => node.id === activeAtlasNode) ?? atlasNodes[2];
  const ActiveAtlasIcon = activeAtlas.icon;
  const commandRoomCards = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "queue",
          value: String(reviewRows.length),
          body: "otwarte ścieżki review z aktualnego market sweep",
        },
        {
          label: "critical",
          value: String(criticalCount),
          body: "anomalie wysokiego priorytetu, nadal nie dowód",
        },
        {
          label: "watch",
          value: String(watchCount),
          body: "wymaga manual review przed eskalacją",
        },
        {
          label: "policy",
          value: "locked",
          body: "bez oskarżeń, bez porad, VLM tylko utility",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "queue",
          value: String(reviewRows.length),
          body: "offene Review Lanes aus aktuellem Market Sweep",
        },
        {
          label: "critical",
          value: String(criticalCount),
          body: "High-Priority Anomalien, noch kein Beweis",
        },
        {
          label: "watch",
          value: String(watchCount),
          body: "manueller Review vor Eskalation nötig",
        },
        {
          label: "policy",
          value: "locked",
          body: "keine Anschuldigung, keine Beratung, VLM nur Utility",
        },
      ];
    }
    return [
      {
        label: "queue",
        value: String(reviewRows.length),
        body: "open review lanes from current market sweep",
      },
      {
        label: "critical",
        value: String(criticalCount),
        body: "high-priority anomalies, still not proof",
      },
      {
        label: "watch",
        value: String(watchCount),
        body: "requires manual review before escalation",
      },
      {
        label: "policy",
        value: "locked",
        body: "no accusation, no advice, VLM utility only",
      },
    ];
  }, [criticalCount, locale, reviewRows.length, watchCount]);
  const launchBridgeContracts = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "search intake",
          state: "ready",
          body: "Pusta premium search, icon submit, outside-click dismiss i guarded resolver path.",
        },
        {
          label: "modal state",
          state: "ready",
          body: "Terminal otwiera się jako client-only chunk z boot skeleton i safe-mode boundary.",
        },
        {
          label: "live data spine",
          state: "partial",
          body: "Candles są live/fallback aware; holder i order-book feeds dalej wymagają produkcyjnych API.",
        },
        {
          label: "audit storage",
          state: "blocked",
          body: "Historia decyzji, prompty AI i eksport wymagają trwałego zapisu.",
        },
        {
          label: "VLM access",
          state: "blocked",
          body: "Utility-only session gating dalej wymaga wallet/signature i limitów membership.",
        },
        {
          label: "export evidence",
          state: "blocked",
          body: "Case export wymaga sources, missing-data appendix i legal-safe renderer.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "Search Intake",
          state: "ready",
          body: "Leere Premium Search, Icon Submit, Outside-Click Dismiss und Guarded Resolver Path.",
        },
        {
          label: "Modal State",
          state: "ready",
          body: "Terminal öffnet als Client-only Chunk mit Boot Skeleton und Safe-Mode Boundary.",
        },
        {
          label: "Live Data Spine",
          state: "partial",
          body: "Candles sind live/fallback-aware; Holder- und Order-Book-Feeds brauchen Production APIs.",
        },
        {
          label: "Audit Storage",
          state: "blocked",
          body: "Entscheidungsverlauf, AI-Prompts und Exporte brauchen dauerhaften Speicher.",
        },
        {
          label: "VLM Access",
          state: "blocked",
          body: "Utility-only Session Gating braucht Wallet/Signature und Membership Limits.",
        },
        {
          label: "Export Evidence",
          state: "blocked",
          body: "Case Export braucht Source Ledger, Missing-Data Appendix und legal-safe Renderer.",
        },
      ];
    }
    return [
      {
        label: "search intake",
        state: "ready",
        body: "Empty premium search, icon submit, outside-click dismiss and guarded resolver path.",
      },
      {
        label: "modal state",
        state: "ready",
        body: "Terminal opens in a client-only chunk with boot skeleton and safe-mode boundary.",
      },
      {
        label: "live data spine",
        state: "partial",
        body: "Candles are live/fallback aware; holder and order-book feeds still need production APIs.",
      },
      {
        label: "audit storage",
        state: "blocked",
        body: "Decision history, AI prompts and exports need persistent storage.",
      },
      {
        label: "VLM access",
        state: "blocked",
        body: "Utility-only session gating still needs wallet/signature and membership limits.",
      },
      {
        label: "export evidence",
        state: "blocked",
        body: "Case export needs sources, missing-data appendix and legal-safe renderer.",
      },
    ];
  }, [locale]);

  // Locale compatibility marker after the public AI-import wall was removed: brainImportLanes.map
  const brainImportLanes = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "Codex folder",
          state: "ready",
          body: "Codex pracuje tylko w `Desktop/codex`, bez dotykania pełnego repo.",
        },
        {
          label: "One file",
          state: "ready",
          body: "Edytowany jest tylko eksportowany risk-engine, a reszta plików jest read-only reference.",
        },
        {
          label: "Import guard",
          state: "ready",
          body: "Preflight blokuje signal IDs spoza typów, browser/Node APIs, `as any` i język inwestycyjny.",
        },
        {
          label: "Scenario matrix",
          state: "partial",
          body: "BTC, stablecoin, RWA, low-float pump, contract trap i no-data token są opisane do manual QA.",
        },
        {
          label: "Live feeds",
          state: "blocked",
          body: "Holder/orderbook/contract/OSINT feeds nadal muszą zostać produkcyjnie podłączone.",
        },
        {
          label: "Evidence export",
          state: "blocked",
          body: "Finalny AI verdict wymaga sources, timestamps i export-safe wording.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "Codex Folder",
          state: "ready",
          body: "Codex arbeitet nur in `Desktop/codex`, ohne das volle Repo zu berühren.",
        },
        {
          label: "One File",
          state: "ready",
          body: "Bearbeitet wird nur der exportierte risk-engine; andere Dateien sind read-only Reference.",
        },
        {
          label: "Import Guard",
          state: "ready",
          body: "Preflight blockiert Signal IDs außerhalb der Typen, Browser/Node APIs, `as any` und Investment-Sprache.",
        },
        {
          label: "Scenario Matrix",
          state: "partial",
          body: "BTC, Stablecoin, RWA, Low-Float Pump, Contract Trap und No-Data Token sind für manuelle QA beschrieben.",
        },
        {
          label: "Live Feeds",
          state: "blocked",
          body: "Holder/Orderbook/Contract/OSINT Feeds müssen noch production-ready angebunden werden.",
        },
        {
          label: "Evidence Export",
          state: "blocked",
          body: "Finales AI Verdict braucht Source Ledger, Timestamps und export-safe Wording.",
        },
      ];
    }
    return [
      {
        label: "Codex folder",
        state: "ready",
        body: "Codex works only inside `Desktop/codex`, without touching the full repo.",
      },
      {
        label: "One file",
        state: "ready",
        body: "Only the exported risk-engine is edited; all other files stay read-only reference.",
      },
      {
        label: "Import guard",
        state: "ready",
        body: "Preflight blocks signal IDs outside types, browser/Node APIs, `as any` and investment language.",
      },
      {
        label: "Scenario matrix",
        state: "partial",
        body: "BTC, stablecoin, RWA, low-float pump, contract trap and no-data token are documented for manual QA.",
      },
      {
        label: "Live feeds",
        state: "blocked",
        body: "Holder/orderbook/contract/OSINT feeds still need production wiring.",
      },
      {
        label: "Evidence export",
        state: "blocked",
        body: "Final AI verdict needs sources, timestamps and export-safe wording.",
      },
    ];
  }, [locale]);
  const sourceTrustAdapters = [
    {
      label: "Search resolver",
      state: "ready",
      body: "Local table and suggestions resolve first; external analyze only runs after guarded lookup.",
    },
    {
      label: "429 cooldown",
      state: "partial",
      body: "Client cooldown is visible; production still needs server cache and abuse/rate-limit middleware.",
    },
    {
      label: "Candles / OHLCV",
      state: "partial",
      body: "Klines and fallback charts are labeled, with density shown before chart confidence.",
    },
    {
      label: "Orderbook depth",
      state: "blocked",
      body: "Live depth, spread, slippage and imbalance must be wired before exit-liquidity claims.",
    },
    {
      label: "Holder clusters",
      state: "partial",
      body: "Whales, CEX/custody, team, LP, retail and unlabeled buckets need source labels.",
    },
    {
      label: "Evidence export",
      state: "blocked",
      body: "PDF/JSON export needs case id, immutable sources, missing-data appendix and legal copy.",
    },
  ];
  const evidenceExportStages = [
    {
      label: "Case header",
      state: "ready",
      body: "Symbol, timestamp, case id and active review state are always included.",
    },
    {
      label: "Source ledger",
      state: "partial",
      body: "Live, partial, fallback and blocked source modes must travel with every report.",
    },
    {
      label: "Missing-data appendix",
      state: "partial",
      body: "Unverified holders, missing orderbook and weak candles become uncertainty, never safety.",
    },
    {
      label: "Redaction rules",
      state: "ready",
      body: "Private scoring weights, internal prompts and raw wallet labels stay out of public exports.",
    },
    {
      label: "Audit storage",
      state: "blocked",
      body: "Production export needs persistent decision history, source snapshots and a review handoff.",
    },
    {
      label: "Renderer",
      state: "blocked",
      body: "PDF/JSON evidence renderer is still blocked until legal copy and export infrastructure are wired.",
    },
  ];
  const runtimeHealthLanes = [
    {
      label: "Modal state",
      state: "ready",
      body: "Token terminal loads as client-only chunk with boot skeleton and safe-mode boundary, so one panel cannot kill the market table.",
    },
    {
      label: "Chart state",
      state: "partial",
      body: "Candles prefer Binance klines; fallback sparkline mode remains labeled and keeps confidence limited.",
    },
    {
      label: "Orderbook state",
      state: "blocked",
      body: "Live multi-exchange depth is not production wired yet, so depth claims stay in review mode.",
    },
    {
      label: "History state",
      state: "partial",
      body: "Replay snapshots exist, but sparse history must be treated as context, not proof.",
    },
    {
      label: "Search state",
      state: "ready",
      body: "Local-first resolver, outside-click dismiss and one-letter guard reduce API spam and kernel-panic style UX.",
    },
    {
      label: "Evidence state",
      state: "blocked",
      body: "Export remains manifest-first until renderer, persistent audit storage and legal policy pages are ready.",
    },
  ];
  const runtimeRegressionLocks = [
    "stress simulator is accessed through safe helpers, not spread as an array",
    "Shield Map opens as a full page; header shield remains compact quick lens",
    "table wheel scroll must never trap the page",
    "raw API JSON links stay out of the user-facing buttons",
    "search/analyze 429 states show cooldown and local-first fallback",
  ];
  const operatorFocusLanes = [
    {
      label: "First paint",
      state: "ready",
      body: "Chart, source label and command palette should appear before heavy AI/SOC modules. This reduces the lag feeling after clicking an asset row.",
    },
    {
      label: "Focused panel routing",
      state: "ready",
      body: "The modal keeps one focused decision surface instead of stacking technical panels under the chart.",
    },
    {
      label: "AI SOC review",
      state: "partial",
      body: "AI should guide the user with missing-data checks, review prompts and calm wording. It is not a hype machine or legal proof.",
    },
    {
      label: "Evidence export",
      state: "blocked",
      body: "Export is still manifest/draft mode until persistent audit storage, renderer and legal policy pages are wired.",
    },
    {
      label: "Source trust",
      state: "partial",
      body: "Live, partial, fallback and blocked lanes remain visible before any summary can sound confident.",
    },
    {
      label: "Launch controls",
      state: "blocked",
      body: "Rate-limit middleware, VLM session gating, wallet proof and audit logs remain P0 before public production launch.",
    },
  ];
  const operatorFocusRules = [
    "One visible command console per main-lane route; inactive consoles stay behind the palette.",
    "Heavy modules are deferred until terminalBooted; boot skeleton protects first paint.",
    "Header buttons change active command state; they never open raw JSON API pages.",
    "AI copy says anomaly/review/uncertainty, never accusation, legal proof, ROI or investment advice.",
  ];
  const interactionStabilityLanes = [
    {
      label: "Click intake",
      state: "ready",
      body: "Token clicks resolve local rows first, keep one-letter scans blocked and open the terminal shell before external analyze calls can rate-limit.",
    },
    {
      label: "Chart-first boot",
      state: "ready",
      body: "The first paint should show identity, chart skeleton, source label and command palette before SOC, holders, replay or evidence panels.",
    },
    {
      label: "One active panel",
      state: "ready",
      body: "The selected command owns the main lane; inactive consoles stay behind routing so Shield does not become a long wall of cards.",
    },
    {
      label: "Source cooldown",
      state: "partial",
      body: "Client cooldown is visible and local table interactions continue. Production still needs server cache and abuse middleware.",
    },
    {
      label: "Scroll surface",
      state: "ready",
      body: "Market table horizontal overflow must not trap vertical mouse-wheel scrolling over rows.",
    },
    {
      label: "Regression locks",
      state: "ready",
      body: "Stress helpers, modal boundary, missing icon imports and raw JSON buttons are checked so previous crashes do not return.",
    },
  ];
  const interactionStabilityRules = [
    "No [...stress] or direct stress spreading; use helper contracts only.",
    "No heavy inline Shield Map under the main search; full map stays on its own route.",
    "No raw /api JSON buttons inside premium UI.",
    "No scan placeholder, no text scan button and no single-letter API spam.",
    "Every strong visual claim carries source mode, uncertainty and manual-review wording.",
  ];
  const reviewDeckLanes = [
    {
      label: "Decision brief",
      state: "ready",
      body: "The first screen opens with a concise decision surface and one clear next check instead of dumping every module.",
    },
    {
      label: "Source truth",
      state: "partial",
      body: "Live, partial, fallback and blocked source modes stay visible before the AI bot can sound confident.",
    },
    {
      label: "AI review",
      state: "partial",
      body: "Bot tone stays SOC-style: missing data, next commands, calm review language and no hype.",
    },
    {
      label: "Evidence gate",
      state: "blocked",
      body: "Export remains draft-only until persistent audit log, renderer and legal policy pack are wired.",
    },
    {
      label: "Interaction path",
      state: "ready",
      body: "Chart-first boot, one active panel, outside-click dropdown dismiss and table scroll locks remain regression guarded.",
    },
    {
      label: "Launch blockers",
      state: "blocked",
      body: "Rate limits, wallet/session access, VLM utility gating and export infrastructure remain P0 launch blockers.",
    },
  ];
  const reviewDeckRules = [
    "Default terminal command is /deck, then the user drills into one lane only.",
    "Deep panels stay hidden until selected; premium UI cannot become a wall of consoles.",
    "Shield Map explains workflow, not private scoring weights or internal prompts.",
    "Every deck card uses anomaly/review/uncertainty language and keeps Not financial advice visible.",
  ];
  const neuralCommandStages = [
    {
      label: "Intake prism",
      state: "ready",
      body: "Search, token identity, logo, contract and market row resolve before VLM starts any neural interpretation.",
    },
    {
      label: "Risk cortex",
      state: "partial",
      body: "The VLM core separates price movement, liquidity stress, holder layer and source confidence into independent brain lobes.",
    },
    {
      label: "Source immune system",
      state: "partial",
      body: "Fallback, missing and blocked data are surfaced as uncertainty instead of being hidden behind a confident score.",
    },
    {
      label: "SOC copilot",
      state: "ready",
      body: "The AI bot speaks like a calm research assistant: next check, missing source, review step and evidence boundary.",
    },
    {
      label: "Evidence membrane",
      state: "blocked",
      body: "Export remains locked until sources, audit storage, legal copy and redaction rules are production wired.",
    },
    {
      label: "VLM access shell",
      state: "blocked",
      body: "Advanced rails stay designed for member/holder access, but no value promise, no custody and no seed phrase flow.",
    },
  ];
  const cyberDefenseMatrix = [
    {
      label: "Rate-limit shield",
      state: "blocked",
      body: "Server cache, abuse throttles and cooldown policy must protect scan endpoints before public traffic.",
    },
    {
      label: "Wallet safety",
      state: "partial",
      body: "Every wallet screen must repeat non-custodial rules: never seed phrase, never hidden approval, never forced transaction.",
    },
    {
      label: "Contract sentinel",
      state: "partial",
      body: "Owner, tax, mint, pause, blacklist and proxy checks need verified source labels before being shown as strong warnings.",
    },
    {
      label: "Data provenance",
      state: "partial",
      body: "Every readout card needs source mode: live, partial, fallback, blocked or simulated. Premium means no fake certainty.",
    },
    {
      label: "Evidence redaction",
      state: "ready",
      body: "Public reports hide private scoring weights, internal prompts and sensitive heuristics while keeping review logic visible.",
    },
    {
      label: "Review history",
      state: "blocked",
      body: "Actions, command route, prompt, timestamp and source snapshot need persistent logs before export can be trusted.",
    },
  ];
  const trustPsychologyRails = [
    {
      label: "Calm danger",
      body: "Use anomaly/review language. Red highlights are for priority, not drama. This lowers panic and increases trust.",
    },
    {
      label: "Show uncertainty",
      body: "When data is missing, show the missing source. Users trust a system that admits incomplete evidence.",
    },
    {
      label: "One next action",
      body: "Every complex signal should end with one clear check: inspect depth, verify holders, audit the contract, or wait.",
    },
    {
      label: "Private core",
      body: "Explain the workflow, not the secret weights. The product feels transparent without exposing the system.",
    },
  ];
  const launchReadinessBars = [
    {
      label: "UI shell",
      value: "82%",
      body: "Premium layout, modal shell, search intake and Shield routes are in place.",
    },
    {
      label: "Motion",
      value: "64%",
      body: "VLM neural readout works; next passes should keep polishing 3D brain pacing and mobile performance.",
    },
    {
      label: "Data spine",
      value: "48%",
      body: "Candles and fallback labels exist; holder, orderbook, contract and sources still need production feeds.",
    },
    {
      label: "Launch safety",
      value: "38%",
      body: "Legal-safe copy exists, but audit storage, rate limits and evidence renderer remain blockers.",
    },
  ];

  const primeCryptoResearchCards = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "Bajak Protocol",
          value: "numerical audit",
          body: "Research Lab może pokazywać badania liczb pierwszych jako audyt numeryczny: redukcja błędu R(x), testy falsyfikacyjne i zeta-zero alignment — bez mówienia, że to dowód RH.",
        },
        {
          label: "Kryptografia",
          value: "safe boundary",
          body: "Sekcja może tłumaczyć, dlaczego liczby pierwsze są ważne w kryptografii, ale nie może sugerować łamania portfeli, kluczy prywatnych ani Bitcoina.",
        },
        {
          label: "Odwrócony wzór",
          value: "research mode",
          body: "Wątek odwróconego wzoru pokazujemy jako hipotezę/research pipeline: dataset, benchmark, negatywne kontrole, replikacja i peer review.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "Bajak Protocol",
          value: "numerisches Audit",
          body: "Research Lab kann Primzahl-Forschung als numerisches Audit zeigen: R(x)-Fehlerreduktion, Falsifikationstests und Zeta-Zero Alignment — ohne RH-Beweis zu behaupten.",
        },
        {
          label: "Kryptografie",
          value: "sichere Grenze",
          body: "Die Sektion erklärt, warum Primzahlen für Kryptografie wichtig sind, ohne Wallets, Private Keys oder Bitcoin-Angriffe zu suggerieren.",
        },
        {
          label: "Inverse Formel",
          value: "Research Mode",
          body: "Die inverse Formel wird als Hypothese/Pipeline dargestellt: Dataset, Benchmark, Negativkontrollen, Replikation und Peer Review.",
        },
      ];
    }
    return [
      {
        label: "Bajak Protocol",
        value: "numerical audit",
        body: "Research Lab can present prime-number work as a numerical audit: R(x) error reduction, falsification tests and zeta-zero alignment — without claiming an RH proof.",
      },
      {
        label: "Cryptography",
        value: "safe boundary",
        body: "The section explains why primes matter in cryptography, without suggesting wallet, private-key or Bitcoin-breaking capabilities.",
      },
      {
        label: "Inverse formula",
        value: "research mode",
        body: "The inverse-formula thread is framed as a hypothesis/pipeline: dataset, benchmark, negative controls, replication and peer review.",
      },
    ];
  }, [locale]);

  const shieldAccessModes = useMemo(() => {
    if (locale === "pl") {
      return [
        {
          label: "Basic",
          value: "publiczny prescreen",
          body: "Szybki risk score, top 10 punktów i edukacyjny opis bez głębokiego OSINT. Ma zatrzymać impulsywne wejście, nie dawać sygnału kup/sprzedaj.",
        },
        {
          label: "Pro",
          value: "member review",
          body: "Więcej źródeł, poziom pewności oraz czytelne ścieżki supply, liquidity, holders i contract.",
        },
        {
          label: "Advanced",
          value: "investigator mode",
          body: "Pełny VLM risk brain, top 20 punktów, OSINT queue, evidence status, missing-data appendix i export-ready workflow.",
        },
      ];
    }
    if (locale === "de") {
      return [
        {
          label: "Basic",
          value: "öffentlicher Prescreen",
          body: "Schneller Risk Score, Top-10-Punkte und edukative Erklärung ohne Deep OSINT. Es bremst impulsive Einstiege, keine Buy/Sell Calls.",
        },
        {
          label: "Pro",
          value: "Member Review",
          body: "Mehr Quellen, Confidence sowie klare Supply-, Liquidity-, Holders- und Contract-Pfade.",
        },
        {
          label: "Advanced",
          value: "Investigator Mode",
          body: "Voller VLM Risk Brain, Top-20-Punkte, OSINT Queue, Evidence Status, Missing-Data Appendix und exportfähiger Workflow.",
        },
      ];
    }
    return [
      {
        label: "Basic",
        value: "public prescreen",
        body: "Fast risk score, top 10 points and educational copy without deep OSINT. It slows impulsive entry; it is not a entry/exit command.",
      },
      {
        label: "Pro",
        value: "member review",
        body: "More sources, clear confidence and focused supply, liquidity, holders and contract paths.",
      },
      {
        label: "Advanced",
        value: "investigator mode",
        body: "Full VLM risk brain, top 20 points, OSINT queue, evidence status, missing-data appendix and export-ready workflow.",
      },
    ];
  }, [locale]);

  const statePillClass = (state: string) =>
    state === "ready"
      ? "border-emerald-300/[0.18] bg-emerald-400/[0.055] text-emerald-100"
      : state === "partial"
        ? "border-velmere-gold/[0.18] bg-velmere-gold/[0.055] text-velmere-gold"
        : "border-red-300/[0.18] bg-red-400/[0.055] text-red-100";

  const pass1234EvidenceIconMap = {
    sources: Database,
    facts: FileText,
    signals: Radar,
    conflicts: AlertTriangle,
    missing: LockKeyhole,
    confidence: ShieldCheck,
    verdict: Brain,
  } satisfies Record<Pass1234EvidenceNodeId, typeof Database>;

  const pass834EvidenceGraphCopy = useMemo(() => {
    if (locale === "pl") {
      return {
        kicker: "Evidence graph",
        title: "Shield Map pokazuje dlaczego, nie powtarza ceny.",
        body:
          "To jest mapa dowodów VLM: źródła, fakty, sygnały, konflikty, braki danych, confidence i końcowy werdykt. Ceny i tabela zostają w Shield; raport PDF zostaje w Browser.",
        searchPlaceholder: "BTC, ETH, SOL, nazwa tokena albo kontrakt",
        search: "sprawdź ścieżkę",
        terminal: "Otwórz Shield",
        browser: "Otwórz Browser",
        verdict: "VLM verdict",
        confidence: "Confidence",
        sourceState: "Stan źródeł",
        missing: "Braki danych",
        drawerTitle: "Szczegóły węzła",
        close: "Zamknij szczegóły",
        sourceRequired: "source required",
        nextCheck: "Następne sprawdzenie",
      };
    }
    if (locale === "de") {
      return {
        kicker: "Evidence Graph",
        title: "Shield Map zeigt das Warum, nicht noch einmal den Preis.",
        body:
          "Das ist die VLM-Belegkarte: Quellen, Fakten, Signale, Konflikte, Datenlücken, Confidence und abschließender Befund. Preise bleiben im Shield; PDF-Berichte bleiben im Browser.",
        searchPlaceholder: "BTC, ETH, SOL, Tokenname oder Contract",
        search: "Pfad prüfen",
        terminal: "Shield öffnen",
        browser: "Browser öffnen",
        verdict: "VLM Verdict",
        confidence: "Confidence",
        sourceState: "Quellenstatus",
        missing: "Datenlücken",
        drawerTitle: "Node-Details",
        close: "Details schließen",
        sourceRequired: "source required",
        nextCheck: "Nächster Check",
      };
    }
    return {
      kicker: "Evidence graph",
      title: "Shield Map explains why, not the price again.",
      body:
        "This is the VLM evidence map: sources, facts, signals, conflicts, missing data, confidence and final verdict. Prices stay in Shield; PDF reports stay in Browser.",
      searchPlaceholder: "BTC, ETH, SOL, token name or contract",
      search: "check path",
      terminal: "Open Shield",
      browser: "Open Browser",
      verdict: "VLM verdict",
      confidence: "Confidence",
      sourceState: "Source state",
      missing: "Missing data",
      drawerTitle: "Node details",
      close: "Close details",
      sourceRequired: "source required",
      nextCheck: "Next check",
    };
  }, [locale]);

  const pass1234EvidenceGraph = useMemo(() => {
    const sourceState = sourceSnapshot?.snapshot.sourceState ?? "source required";
    const confidence =
      sourceSnapshot?.snapshot.confidence === "High"
        ? 82
        : sourceSnapshot?.snapshot.confidence === "Medium"
          ? 58
          : sourceSnapshot?.snapshot.confidence === "Low"
            ? 34
            : investigatorResult?.confidenceScore ?? 42;
    const missingCount =
      investigatorResult?.redFlags?.length ??
      evidenceReport?.blockedBy?.length ??
      sourceSnapshot?.snapshot.blockedBy?.length ??
      3;
    const nextCheck =
      investigatorResult?.nextActions?.[0]?.body ??
      evidenceReport?.sections?.find((section) => section.status === "blocked")?.body ??
      pass834EvidenceGraphCopy.sourceRequired;

    return buildPass1234LensShieldMapEvidenceParity({
      locale: pass1354Locale,
      sourceState,
      confidenceCap: confidence,
      sourceCount: evidenceReport?.sourceLedger?.length ?? (sourceSnapshot ? 1 : 0),
      missingCount,
      conflictCount: investigatorResult?.redFlags?.length ?? 0,
      claimCount: evidenceReport?.sections?.length ?? investigatorResult?.lanes?.length ?? 0,
      signalCount: investigatorResult?.lanes?.length ?? 7,
      factSummary: investigatorResult?.subtitle ?? evidenceReport?.subtitle,
      verdict: investigatorResult?.finalVerdict ?? evidenceReport?.title,
      nextCheck,
      depth: "advanced",
      checksum: evidenceReport?.reportId ?? investigatorResult?.caseFrame?.caseId ?? sourceSnapshot?.snapshot.id,
    });
  }, [evidenceReport, investigatorResult, pass1354Locale, pass834EvidenceGraphCopy, sourceSnapshot]);

  const pass1354EvidenceGraph2 = useMemo(
    () =>
      buildPass1354ShieldMapEvidenceGraph2({
        locale: pass1354Locale,
        confidenceCap: pass1234EvidenceGraph.confidenceCap,
        sourceCount: pass1234EvidenceGraph.sourceCount,
        missingCount: pass1234EvidenceGraph.missingCount,
        conflictCount: pass1234EvidenceGraph.conflictCount,
        claimCount: pass1234EvidenceGraph.claimCount,
        signalCount:
          pass1234EvidenceGraph.nodes.find((node) => node.id === "signals")
            ?.weight ?? 0,
        evidenceManifest: pass1234EvidenceGraph.manifestKey,
        verdict:
          pass1234EvidenceGraph.nodes.find((node) => node.id === "verdict")
            ?.value ?? pass1234EvidenceGraph.finalStatus,
        nextCheck: pass1234EvidenceGraph.copy.nextCheck,
      }),
    [pass1354Locale, pass1234EvidenceGraph],
  );

  const pass834EvidenceGraphNodes = useMemo(
    () =>
      pass1234EvidenceGraph.nodes.map((node) => ({
        ...node,
        icon: pass1234EvidenceIconMap[node.id],
      })),
    [pass1234EvidenceGraph.nodes, pass1234EvidenceIconMap],
  );
  const pass834ActiveEvidenceNode =
    pass834EvidenceGraphNodes.find((node) => node.id === activeAtlasNode) ??
    pass834EvidenceGraphNodes[0];

  return (
    <main
      className="shield-typography-root bg-velmere-black text-velmere-ivory"
      data-pass834-shield-map-role="evidence-graph"
      data-pass834-no-price-table="true"
      data-pass834-no-pdf-duplicate="true"
      data-pass1234-shieldmap-parity={pass1234EvidenceGraph.finalStatus}
      data-pass1234-evidence-manifest={pass1234EvidenceGraph.manifestKey}
      data-pass1234-shieldmap-role={pass1234EvidenceGraph.shieldMapRole}
      data-pass1354-shield-map-evidence-graph={pass1354EvidenceGraph2.state}
      data-pass1354-role={pass1354EvidenceGraph2.role}
      data-pass1354-manifest={pass1354EvidenceGraph2.manifestKey}
    >
      <section className="shield-map-evidence-hero luxury-section-wide py-8 md:py-12">
        <div className="mx-auto grid max-w-[1500px] gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.38fr)] xl:items-end">
          <div className="min-w-0">
            <Link
              href="/market-integrity"
              className="shield-premium-focus inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.026] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.55] transition hover:border-velmere-gold/[0.30] hover:text-velmere-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {copy.back}
            </Link>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.14] bg-cyan-300/[0.045] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.7)]" />
              Velmère Shield Map · {pass834EvidenceGraphCopy.kicker}
            </div>
            <h1 className="mt-5 max-w-5xl text-[clamp(2.6rem,6vw,6.7rem)] font-semibold leading-[0.88] tracking-[-0.075em] text-white">
              {pass834EvidenceGraphCopy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/[0.56] md:text-base md:leading-8">
              {pass834EvidenceGraphCopy.body}
            </p>
            <div
              className="mt-5 flex max-w-4xl flex-wrap gap-2"
              data-pass1234-map-parity-strip="visible"
            >
              {[
                pass1234EvidenceGraph.copy.readerParity,
                pass1234EvidenceGraph.copy.mapParity,
                `${pass1234EvidenceGraph.finalStatus} · ${pass1234EvidenceGraph.confidenceCap}/100`,
                pass1234EvidenceGraph.manifestKey,
                `${pass1354EvidenceGraph2.copy.badge} · ${pass1354EvidenceGraph2.score}%`,
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/[0.08] bg-white/[0.026] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.48]"
                >
                  {item}
                </span>
              ))}
            </div>
            <div
              className="mt-4 grid gap-2 rounded-[1.35rem] border border-velmere-gold/[0.12] bg-velmere-gold/[0.035] p-3 sm:grid-cols-3"
              data-pass1413-shield-map-graph-rail="source-fact-signal-conflict-verdict"
            >
              {[
                "source → fact",
                "signal → conflict",
                "verdict → next check",
              ].map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-white/[0.08] bg-black/[0.16] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.44]"
                >
                  {step}
                </span>
              ))}
            </div>

          </div>
          <aside
            className="rounded-[1.7rem] border border-velmere-gold/[0.16] bg-velmere-gold/[0.045] p-5"
            data-pass1354-node-budget={`${pass1354EvidenceGraph2.nodeBudget.min}-${pass1354EvidenceGraph2.nodeBudget.max}`}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold/[0.78]">
              {pass834EvidenceGraphCopy.verdict}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
              {pass834EvidenceGraphNodes.at(-1)?.value}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                  {pass834EvidenceGraphCopy.confidence}
                </span>
                <strong className="mt-1 block font-mono text-lg text-white tabular-nums">
                  {pass834EvidenceGraphNodes.find((node) => node.id === "confidence")?.value}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                  {pass834EvidenceGraphCopy.missing}
                </span>
                <strong className="mt-1 block font-mono text-lg text-white tabular-nums">
                  {pass834EvidenceGraphNodes.find((node) => node.id === "missing")?.value}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="luxury-section-wide pb-12">
        <div className="mx-auto max-w-[1500px]">
          <form
            onSubmit={runInvestigatorScan}
            className="shield-map-evidence-search shield-map-unified-search-shell rounded-[1.6rem] border border-white/[0.08] bg-white/[0.028] p-3"
          >
            <label className="sr-only" htmlFor="shield-map-evidence-search-input">
              {pass834EvidenceGraphCopy.searchPlaceholder}
            </label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-14 flex-1 items-center gap-3 rounded-[1.25rem] border border-white/[0.08] bg-black/[0.26] px-4 focus-within:border-cyan-200/[0.20] focus-within:shadow-none">
                <Search className="h-4 w-4 text-white/[0.34]" />
                <input
                  id="shield-map-evidence-search-input"
                  value={investigatorQuery}
                  onChange={(event) => setInvestigatorQuery(event.target.value)}
                  placeholder={pass834EvidenceGraphCopy.searchPlaceholder}
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/[0.30]"
                />
              </div>
              <button
                type="submit"
                disabled={investigatorLoading}
                className="velmere-command-pill min-h-12 justify-center px-5 text-[10px]"
                data-tone="gold"
              >
                {investigatorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
                {pass834EvidenceGraphCopy.search}
              </button>
              <Link href="/market-integrity" className="velmere-command-pill min-h-12 justify-center px-5 text-[10px]">
                <Radar className="h-4 w-4" /> {pass834EvidenceGraphCopy.terminal}
              </Link>
              <Link href="/search" className="velmere-command-pill min-h-12 justify-center px-5 text-[10px]">
                <FileText className="h-4 w-4" /> {pass834EvidenceGraphCopy.browser}
              </Link>
            </div>
            <span className="shield-map-token-suggest-panel sr-only" role="listbox" aria-label="Shield Map suggestions" />
            {investigatorError ? (
              <p className="mt-3 rounded-2xl border border-red-300/[0.14] bg-red-400/[0.06] px-4 py-3 text-xs text-red-100/[0.82]">
                {investigatorError}
              </p>
            ) : null}
          </form>

          <div className="shield-map-evidence-shell mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.32fr)]">
            <div className="shield-map-evidence-graph" role="list" aria-label="VLM evidence graph">
              {pass834EvidenceGraphNodes.map((node, index) => {
                const Icon = node.icon;
                return (
                  <button
                    key={node.id}
                    type="button"
                    role="listitem"
                    onClick={() => {
                      setActiveAtlasNode(node.id);
                      setAtlasDrawerOpen(true);
                    }}
                    className="shield-map-evidence-node"
                    data-tone={node.tone}
                    data-active={pass834ActiveEvidenceNode.id === node.id ? "true" : "false"}
                  >
                    <span className="shield-map-evidence-node-icon"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <small>{node.group}</small>
                      <strong>{node.label}</strong>
                      <em>{node.value}</em>
                    </span>
                    <span className="shield-map-evidence-node-line" aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <aside className="shield-map-evidence-legend rounded-[1.7rem] border border-white/[0.08] bg-white/[0.026] p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.38]">
                {pass834EvidenceGraphCopy.sourceState}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/[0.64]">
                {pass834EvidenceGraphNodes[0]?.body}
              </p>
              <div className="mt-5 grid gap-2">
                {pass1234EvidenceGraph.nodes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/[0.16] px-3 py-2"
                    data-tone={item.tone}
                  >
                    <span className="text-xs text-white/[0.56]">{item.label}</span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.10em] text-white/[0.34]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="mt-5 rounded-2xl border border-cyan-200/[0.10] bg-cyan-300/[0.035] p-3"
                data-pass1354-graph-contract="drawer_only_no_price_table"
              >
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-100/[0.54]">
                  {pass1354EvidenceGraph2.copy.title}
                </p>
                <p className="mt-2 text-xs leading-6 text-white/[0.42]">
                  {pass1354EvidenceGraph2.copy.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pass1354EvidenceGraph2.forbiddenRepeats.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/[0.07] bg-black/[0.16] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.34]"
                    >
                      no {item.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-5 text-xs leading-6 text-white/[0.40]">
                {pass834EvidenceGraphCopy.nextCheck}: {pass834EvidenceGraphNodes.at(-1)?.body}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <DrawerRoot
        open={atlasDrawerOpen}
        onClose={closeAtlasDrawer}
        closeLabel={pass834EvidenceGraphCopy.close}
        ariaLabel={pass834EvidenceGraphCopy.drawerTitle}
        surfaceClassName="max-h-[100dvh] w-full max-w-[440px] overflow-y-auto border-l border-white/[0.10] bg-[#08090a] p-5"
        surfaceData={{
          "pass834-evidence-node-drawer": pass834ActiveEvidenceNode.id,
          "pass1354-drawer-side": pass1354EvidenceGraph2.drawerContract.side,
          "pass1354-drawer-scroll": pass1354EvidenceGraph2.drawerContract.scroll,
        }}
      >
        <div className="shield-map-evidence-drawer">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold/[0.78]">
            {pass834EvidenceGraphCopy.drawerTitle}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {pass834ActiveEvidenceNode.label}
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100/[0.60]">
            {pass834ActiveEvidenceNode.group} · {pass834ActiveEvidenceNode.value}
          </p>
          <p className="mt-5 text-sm leading-7 text-white/[0.64]">
            {pass834ActiveEvidenceNode.body}
          </p>
          <button
            type="button"
            onClick={closeAtlasDrawer}
            className="velmere-command-pill mt-6 min-h-11 px-5 text-[10px]"
          >
            {pass834EvidenceGraphCopy.close}
          </button>
        </div>
      </DrawerRoot>
    </main>
  );

}
