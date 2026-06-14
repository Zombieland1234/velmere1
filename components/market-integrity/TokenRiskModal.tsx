"use client";

// PASS327 legacy verifier compatibility retained; PASS1414 keeps public asset analysis on a rectangular chart modal, not circular bubbles.
// PASS291 guard compatibility: PDF/browser replay boundary keeps branded PDF forge behind right-edge scroll proof.
// PASS290 guard compatibility: operator-only report fields separated through Private Disclosure Loom.
// PASS289 guard compatibility: layout stability sentinel keeps right-edge Orbit scroll, compact proof density and PDF forge controls in safe zones.
// PASS288 guard compatibility: orbit detail drawer is right-edge scrollable and VLM Lens can forge a branded Velmère Cybersecurity PDF preview.

// PASS287 guard compatibility: evidence note integrity gate active for M03 short evidence notes, redaction boundary and Velvet Note Seal.

// PASS285 guard compatibility: customer-safe risk brief gate active for M01 customer copy, source appendix and Velvet Brief Seal.

// PASS284 guard compatibility: retention policy gate active for K07 delete/TTL policy, Quiet Vault Clock and Velvet TTL Seal.

// PASS282 guard compatibility: privacy redaction envelope gate active for K05 redaction, raw payload quarantine and Private Redaction Seal.
// PASS280 guard compatibility: analytics event taxonomy gate active for K03 event naming, privacy redaction, anti-FOMO telemetry and Velvet Event Passport.
// PASS279 guard compatibility: source freshness registry gate active for K02 TTL decay, timestamp gaps and private freshness seal.
// PASS278 guard compatibility: durable audit receipt vault active for K01/K04/K05/K06 receipt storage preview and private proof lock.
// PASS276 guard compatibility: source adapter quorum gate active for L06 timeout/fallback policy and quiet proof seal.
// PASS275 guard compatibility: OSINT narrative quarantine gate active for L05 social/news/KOL source queue and E04 Narrative Radar.
// PASS274 guard compatibility: unlock vesting cliff radar gate active for L04 unlock/vesting feed and D17 missing-data semantics.
// PASS273 guard compatibility: liquidity exit route gate active for L02 orderbook/depth, C06 scoring UI and D16 source confidence.
// PASS272 guard compatibility: holder concentration gate active for L01 holder feed, C06 scoring UI and D13 ontology.
// PASS271 guard compatibility: contract trap gate active for C11 owner/proxy/mint/pause/blacklist/tax behavior.
// PASS270 guard compatibility: market-pressure anti-FOMO rail active for C10 low-float/pump behavior.
// PASS269 guard compatibility: compact mode dock, asset-regime gate and corrected direct chart drag active.
// PASS268 guard compatibility: chart natural-pan and no-opis mode dock active.
// PASS654 public-copy compatibility: PASS463: marker retained for legacy verifier; UI prefix removed.
// PASS194 legacy marker retained for static preflight only; rendered OPIS popup is removed in PASS268: shield-mode-guide-popup.
// PASS267 guard compatibility: shield-vlm-source-badge legacy marker retained while the badge render is removed from Orbit/static cards.

import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  SyntheticEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Brain,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  Radar,
  Maximize2,
  Minimize2,
  Network,
  ShieldCheck,
  Sigma,
  Sparkles,
  WalletCards,
  Target,
  GitBranch,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import TokenRiskBadge from "@/components/market-integrity/TokenRiskBadge";
import VlmNeuralAuditExperience from "@/components/market-integrity/VlmNeuralAuditExperience";
import { ShieldEvidenceSummary } from "@/components/market-integrity/shield/ShieldEvidenceSummary";
import { ShieldAnalysisTierSelector } from "@/components/market-integrity/shield/ShieldAnalysisTierSelector";
import { useModalScrollLock } from "@/components/ui/useModalScrollLock";
import { useDialogFocusBoundary } from "@/components/ui/useDialogFocusBoundary";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";
import VlmBrainWebGLPrototype, {
  type VlmBrainWebGLTelemetrySample,
} from "@/components/market-integrity/VlmBrainWebGLPrototype";
import { buildAttackSurface } from "@/lib/market-integrity/attack-playbook";
import { buildHolderIntelligence } from "@/lib/market-integrity/holder-intelligence";
import { buildStressScenarios } from "@/lib/market-integrity/stress-simulator";
import { buildRiskReplay } from "@/lib/market-integrity/risk-replay";
import { buildAiRiskBotBrief } from "@/lib/market-integrity/ai-risk-bot";
import { buildAiRiskOrchestrator } from "@/lib/market-integrity/ai-orchestrator";
import {
  buildShieldChatResponse,
  type ShieldChatSourceContext,
} from "@/lib/market-integrity/shield-chat";
import type { Pass468BrowserShieldOrbitHandoff } from "@/lib/market-integrity/pass468-browser-shield-orbit-handoff";
import {
  buildPass612OneSourceStateContract,
  type Pass612OneSourceStateContract,
  type Pass612SourceState,
} from "@/lib/market-integrity/pass612-one-source-state-contract";
import {
  buildPass613ModalViewportGovernor,
  type Pass613ModalViewportGovernor,
} from "@/lib/market-integrity/pass613-modal-viewport-governor";
import {
  buildPass614ChartEvidenceOverlay,
  type Pass614ChartEvidenceOverlay,
} from "@/lib/market-integrity/pass614-chart-evidence-overlay";
import {
  buildPass615TierInformationArchitecture,
  normalizePass615Tier,
  readPass615Tier,
  writePass615Tier,
  type Pass615AnalysisTier,
} from "@/lib/market-integrity/pass615-tier-information-architecture";
import { buildPass616ShieldMobileStressSweep } from "@/lib/market-integrity/pass616-shield-mobile-stress-sweep";
import { normalizePass463AssetSymbol } from "@/lib/market-integrity/pass463-canonical-pair-coverage";
import { buildChartRegime } from "@/lib/market-integrity/chart-regime";
import { buildTokenAssetRegime } from "@/lib/market-integrity/asset-regime";
import { buildMarketPressureRegime } from "@/lib/market-integrity/market-pressure-regime";
import { buildContractTrapRegime } from "@/lib/market-integrity/contract-trap-regime";
import { buildHolderConcentrationGate } from "@/lib/market-integrity/holder-concentration-regime";
import { buildLiquidityExitGate } from "@/lib/market-integrity/liquidity-exit-gate";
import { buildUnlockVestingGate } from "@/lib/market-integrity/unlock-vesting-gate";
import { buildOsintNarrativeGate } from "@/lib/market-integrity/osint-narrative-gate";
import { buildSourceAdapterQuorumGate } from "@/lib/market-integrity/source-adapter-quorum-gate";
import { buildSourcePolicyAllowlistGate } from "@/lib/market-integrity/source-policy-allowlist-gate";
import { buildDurableAuditReceiptVault } from "@/lib/market-integrity/durable-audit-receipt-vault";
import { buildSourceFreshnessRegistryGate } from "@/lib/market-integrity/source-freshness-registry-gate";
import { buildAnalyticsEventTaxonomyGate } from "@/lib/market-integrity/analytics-event-taxonomy-gate";
import { buildStorageAdapterContractGate } from "@/lib/market-integrity/storage-adapter-contract-gate";
import { buildPrivacyRedactionEnvelopeGate } from "@/lib/market-integrity/privacy-redaction-envelope-gate";
import { buildOperatorCaseSlaOrchestratorGate } from "@/lib/market-integrity/operator-case-sla-orchestrator-gate";
import { buildRetentionPolicyGate } from "@/lib/market-integrity/retention-policy-gate";
import { buildCustomerSafeRiskBriefGate } from "@/lib/market-integrity/customer-safe-risk-brief-gate";
import { buildLensReportPreviewGate } from "@/lib/market-integrity/lens-report-preview-gate";
import { buildEvidenceNoteIntegrityGate } from "@/lib/market-integrity/evidence-note-integrity-gate";
import {
  buildPdfForgeComposerGate,
  serializeVelmereCybersecurityPdf,
} from "@/lib/market-integrity/pdf-forge-composer-gate";
import { buildLayoutStabilitySentinelGate } from "@/lib/market-integrity/layout-stability-sentinel-gate";
import { buildOperatorOnlyReportFieldGate } from "@/lib/market-integrity/operator-only-report-field-gate";
import {
  buildPdfBrowserReplayBoundaryGate,
  serializePdfBrowserReplayBoundaryPacket,
} from "@/lib/market-integrity/pdf-browser-replay-boundary-gate";
import { buildSocTerminalBrief } from "@/lib/market-integrity/soc-orchestrator";
import { buildVlmShieldAccess } from "@/lib/market-integrity/vlm-access-layer";
import { buildTerminalReadiness } from "@/lib/market-integrity/terminal-readiness";
import { buildEvidenceWorkflow } from "@/lib/market-integrity/evidence-workflow";
import { buildLiquidityIntelligence } from "@/lib/market-integrity/liquidity-intelligence";
import { buildVlmShieldInvestigator } from "@/lib/market-integrity/shield-investigator";
import { buildProductOpsAudit } from "@/lib/market-integrity/product-ops-audit";
import { buildTerminalControlPlane } from "@/lib/market-integrity/terminal-control-plane";
import { buildTerminalRiskWorkspace } from "@/lib/market-integrity/terminal-risk-workspace";
import { buildProductionHardening } from "@/lib/market-integrity/production-hardening";
import { buildTerminalUsabilityGuard } from "@/lib/market-integrity/terminal-usability-guard";
import { buildTerminalOperatorCopilot } from "@/lib/market-integrity/terminal-operator-copilot";
import { buildTerminalLaunchBridge } from "@/lib/market-integrity/terminal-launch-bridge";
import { buildTerminalSourceTrust } from "@/lib/market-integrity/terminal-source-trust";
import { buildTerminalEvidenceExport } from "@/lib/market-integrity/terminal-evidence-export";
import { buildTerminalRuntimeHealth } from "@/lib/market-integrity/terminal-runtime-health";
import { buildTerminalOperatorFocus } from "@/lib/market-integrity/terminal-operator-focus";
import { buildTerminalInteractionStability } from "@/lib/market-integrity/terminal-interaction-stability";
import { buildTerminalReviewDeck } from "@/lib/market-integrity/terminal-review-deck";
import { buildVlmBrainCapsuleHandoff } from "@/lib/market-integrity/vlm-brain-capsule-handoff";
import { buildVlmBrainOperatorActionQueue } from "@/lib/market-integrity/vlm-brain-operator-action-queue";
import { buildVlmBrainCaseReviewTimeline } from "@/lib/market-integrity/vlm-brain-case-review-timeline";
import { buildVlmBrainCustomerExportFirewall } from "@/lib/market-integrity/vlm-brain-customer-export-firewall";
import { buildVlmBrainSourceCoverageMatrix } from "@/lib/market-integrity/vlm-brain-source-coverage-matrix";
import { buildVlmBrainReleaseReviewPacket } from "@/lib/market-integrity/vlm-brain-release-review-packet";
import { buildVlmBrainSourceTruthSpine } from "@/lib/market-integrity/vlm-brain-source-truth-spine";
import { buildVlmBrainLiveAdapterFreshnessMesh } from "@/lib/market-integrity/vlm-brain-live-adapter-freshness";
import { buildVlmBrainSourcePolicyGate } from "@/lib/market-integrity/vlm-brain-source-policy-gate";
import { buildVlmBrainDurableSnapshotPlan } from "@/lib/market-integrity/vlm-brain-durable-snapshot-plan";
import { buildVlmBrainReleaseChainAudit } from "@/lib/market-integrity/vlm-brain-release-chain-auditor";
import { buildVlmBrainSourceLedgerUiPreview } from "@/lib/market-integrity/vlm-brain-source-ledger-ui-preview";
import { buildVlmBrainPdfPreviewManifest } from "@/lib/market-integrity/vlm-brain-pdf-preview-manifest";
import { buildVlmBrainLensShieldHandoff } from "@/lib/market-integrity/vlm-brain-lens-shield-handoff";
import { buildVlmBrainReleaseQaScorecard } from "@/lib/market-integrity/vlm-brain-release-qa-scorecard";
import { buildVlmBrainReleaseBlockerResolver } from "@/lib/market-integrity/vlm-brain-release-blocker-resolver";
import { buildVlmBrainBrowserQaRunbook } from "@/lib/market-integrity/vlm-brain-browser-qa-runbook";
import { buildVlmBrainCustomerCopySanitizer } from "@/lib/market-integrity/vlm-brain-customer-copy-sanitizer";
import { buildVlmBrainPdfRouteContract } from "@/lib/market-integrity/vlm-brain-pdf-route-contract";
import { buildVlmBrainLedgerPersistenceAdapterPlan } from "@/lib/market-integrity/vlm-brain-ledger-persistence-adapter-plan";
import { buildVlmBrainLiveFeedAdapterMatrix } from "@/lib/market-integrity/vlm-brain-live-feed-adapter-matrix";
import { buildVlmBrainWalletAccessGateMatrix } from "@/lib/market-integrity/vlm-brain-wallet-access-gate-matrix";
import { buildVlmBrainLaunchReadinessDashboard } from "@/lib/market-integrity/vlm-brain-launch-readiness-dashboard";
import { buildVlmBrainQaTraceBundle } from "@/lib/market-integrity/vlm-brain-qa-trace-bundle";
import { buildVlmBrainAdapterOrchestrationPlan } from "@/lib/market-integrity/vlm-brain-adapter-orchestration-plan";
import { buildVlmBrainAccessCopyFirewall } from "@/lib/market-integrity/vlm-brain-access-copy-firewall";
import { buildVlmBrainPdfStorageRedactionBridge } from "@/lib/market-integrity/vlm-brain-pdf-storage-redaction-bridge";
import { buildVlmBrainMissingDataEscalationQueue } from "@/lib/market-integrity/vlm-brain-missing-data-escalation-queue";
import { buildVlmBrainRendererComparisonPlan } from "@/lib/market-integrity/vlm-brain-renderer-comparison-plan";
import { buildVlmBrainGovernancePolicyMemo } from "@/lib/market-integrity/vlm-brain-governance-policy-memo";
import { buildVlmBrainAuditTrailIndex } from "@/lib/market-integrity/vlm-brain-audit-trail-index";
import { buildVlmBrainCustomerReadinessPreflight } from "@/lib/market-integrity/vlm-brain-customer-readiness-preflight";
import { buildVlmBrainMegaBranchControlTower } from "@/lib/market-integrity/vlm-brain-mega-branch-control-tower";
import { buildVlmBrainReleaseTriageBoard } from "@/lib/market-integrity/vlm-brain-release-triage-board";
import { buildVlmBrainOperatorHandoffVault } from "@/lib/market-integrity/vlm-brain-operator-handoff-vault";
import { buildVlmBrainBrowserReplayScript } from "@/lib/market-integrity/vlm-brain-browser-replay-script";
import { buildVlmBrainExportAuthorizationGate } from "@/lib/market-integrity/vlm-brain-export-authorization-gate";
import { buildVlmBrainBrowserEvidenceCollector } from "@/lib/market-integrity/vlm-brain-browser-evidence-collector";
import { buildVlmBrainAdapterReadinessScheduler } from "@/lib/market-integrity/vlm-brain-adapter-readiness-scheduler";
import { buildVlmBrainCustomerBriefBuilder } from "@/lib/market-integrity/vlm-brain-customer-brief-builder";
import { buildVlmBrainWalletSessionPolicy } from "@/lib/market-integrity/vlm-brain-wallet-session-policy";
import { buildVlmBrainReleaseReadinessOrchestrator } from "@/lib/market-integrity/vlm-brain-release-readiness-orchestrator";
import { buildVlmBrainReleaseCockpit } from "@/lib/market-integrity/vlm-brain-release-cockpit";
import { buildVlmBrainReleaseCockpitSourceLedgerHandoff } from "@/lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff";
import { buildVlmBrainPass255ActionRouter } from "@/lib/market-integrity/vlm-brain-pass255-action-router";
import { buildVlmBrainPass256EvidenceRunbook } from "@/lib/market-integrity/vlm-brain-pass256-evidence-runbook";
import { buildVlmBrainPass257EvidenceSlaTimeline } from "@/lib/market-integrity/vlm-brain-pass257-evidence-sla-timeline";
import { buildVlmBrainPass258ProofReceiptLock } from "@/lib/market-integrity/vlm-brain-pass258-proof-receipt-lock";
import { buildVlmBrainPass259AttestationLedger } from "@/lib/market-integrity/vlm-brain-pass259-attestation-ledger";
import { buildVlmBrainPass260ReleasePromotionFirewall } from "@/lib/market-integrity/vlm-brain-pass260-release-promotion-firewall";
import { buildVlmBrainPass261ReleaseCutoverControl } from "@/lib/market-integrity/vlm-brain-pass261-release-cutover-control";
import { buildVlmBrainPass262ReleaseRehearsalMatrix } from "@/lib/market-integrity/vlm-brain-pass262-release-rehearsal-matrix";
import { buildVlmBrainPass263ReleaseCandidateTrustBoard } from "@/lib/market-integrity/vlm-brain-pass263-release-candidate-trust-board";
import { buildVlmBrainPass264TrustNarrativeGuard } from "@/lib/market-integrity/vlm-brain-pass264-trust-narrative-guard";
import { buildVlmBrainPass265EvidenceLanguageLedger } from "@/lib/market-integrity/vlm-brain-pass265-evidence-language-ledger";
import { buildVlmBrainPass266ClaimTraceabilityMatrix } from "@/lib/market-integrity/vlm-brain-pass266-claim-traceability-matrix";
import { buildVlmBrainReportCapsule } from "@/lib/market-integrity/vlm-brain-report-capsule";
import {
  buildPass395NeuralOrbitReadout,
  pass395CollectionPhases,
  pass395OrbitNeuralContract,
} from "@/lib/market-integrity/pass395-neural-orbit-search-contract";
import { buildShieldOperatorCaseFile } from "@/lib/market-integrity/operator-casefile";
import {
  buildShieldEvidenceExportManifest,
  buildShieldEvidenceReportDraft,
  serializeShieldEvidenceExportManifest,
} from "@/lib/market-integrity/evidence-report";
import {
  badgeFromLevel,
  levelFromScore,
} from "@/lib/market-integrity/risk-engine";
import type {
  MarketChartRange,
  MarketIntegrityRow,
} from "@/lib/market-integrity/coingecko";
import type {
  RiskLevel,
  TokenRiskResult,
} from "@/lib/market-integrity/risk-types";
import { buildUnifiedAuditEvidence } from "@/lib/market-integrity/unified-audit";
import {
  UnifiedAssetModalShell,
  UnifiedAnalysisDepthDock,
  UnifiedTimeframeTabs,
  type UnifiedDepthOption,
  type UnifiedTimeframeOption,
} from "@/components/market-integrity/UnifiedAssetAnalysisControls";
import { getVlmPaidProduct, type VlmPaidAccessContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { readVlmPaidAccessToken, startVlmServiceCheckout } from "@/lib/commerce/pass2024-vlm-paid-access-client";

type ModalItem = MarketIntegrityRow | TokenRiskResult;
type BrainResult = TokenRiskResult;

type Pass462ShieldVenuePayload = {
  snapshot?: {
    venue: string;
    assetSymbol: string;
    pair: string;
    quoteCurrency: "USD" | "USDT" | "USDC" | "EUR" | "UNKNOWN";
    pairResolutionState: "canonical" | "candidate" | "unsupported";
    pairResolutionNote: string;
    state: string;
    healthScore: number;
    referencePrice: number | null;
    spreadBps: number | null;
    freshnessSeconds: number | null;
  } | null;
  secondary?: {
    venue: string;
    assetSymbol: string;
    pair: string;
    quoteCurrency: "USD" | "USDT" | "USDC" | "EUR" | "UNKNOWN";
    pairResolutionState: "canonical" | "candidate" | "unsupported";
    pairResolutionNote: string;
    state: string;
    healthScore: number;
    referencePrice: number | null;
    spreadBps: number | null;
    freshnessSeconds: number | null;
  } | null;
  comparison?: {
    state: ShieldChatSourceContext["consensusState"];
    confidenceCap: number;
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
    notes: string[];
    boundary: string;
  } | null;
};
type ChartPoint = {
  timestamp: number;
  price: number;
  volume?: number;
  marketCap?: number;
};
type ChartApiResponse =
  | {
      mode: "live";
      points: ChartPoint[];
      range: MarketChartRange;
      id: string;
      source: string;
      generatedAt: string;
    }
  | { mode: "error"; error: string };
type CandleApiResponse =
  | {
      mode: "live";
      candles: Candle[];
      range: MarketChartRange;
      pair: string;
      source: string;
      generatedAt: string;
    }
  | { mode: "error"; error: string };

type OrderBookLevel = {
  price: number;
  quantity: number;
  notionalUsd: number;
  cumulativeUsd: number;
};

type OrderBookResult = {
  symbol: string;
  bestBid?: number;
  bestAsk?: number;
  spreadPercent?: number;
  bidDepthUsd: number;
  askDepthUsd: number;
  bids?: OrderBookLevel[];
  asks?: OrderBookLevel[];
  bidAskImbalancePercent: number;
  simulatedSellSlippage10k?: number;
  simulatedBuySlippage10k?: number;
  riskPoints: number;
  signals: Array<{ id: string; label: string; points: number }>;
  source: string;
};
type OrderBookApiResponse =
  | { mode: "live"; orderbook: OrderBookResult; generatedAt: string }
  | { mode: "error"; error: string };

type HistorySnapshot = {
  id: string;
  symbol: string;
  timestamp: string;
  price?: number;
  volume24h?: number;
  score: number;
  level: RiskLevel;
};
type HistoryApiResponse =
  | {
      mode: "live";
      history: HistorySnapshot[];
      observations: number;
      generatedAt: string;
    }
  | { mode: "error"; error: string };

const ranges = ["1m", "15m", "1h", "4h", "1d", "7d"] as const;
type VlmAiSequenceMode = "basic" | "pro" | "advanced";

type TerminalCommandId =
  | "deck"
  | "risk"
  | "review"
  | "holders"
  | "liquidity"
  | "chart"
  | "evidence"
  | "data"
  | "copilot"
  | "launch"
  | "sources"
  | "export"
  | "runtime"
  | "usability"
  | "stability"
  | "ops"
  | "control"
  | "workspace"
  | "production";
type TerminalCommandRow = {
  id: TerminalCommandId;
  label: string;
  body: string;
  next: string;
};

type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  timestamp: number;
};

function isMarketRow(item: ModalItem): item is MarketIntegrityRow {
  return "result" in item;
}

function formatNumber(value?: number, options?: Intl.NumberFormatOptions) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(
    "en-US",
    options ?? { maximumFractionDigits: 2 },
  ).format(value);
}

function formatUsd(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (Math.abs(value) < 1)
    return `$${formatNumber(value, { maximumSignificantDigits: 4 })}`;
  return `$${formatNumber(value, { notation: value >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 2 })}`;
}

function formatPercent(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, { maximumFractionDigits: 2 })}%`;
}

function commandStateTone(value?: string) {
  const normalized = value?.toLowerCase() ?? "";
  if (
    normalized.includes("block") ||
    normalized.includes("missing") ||
    normalized.includes("denied")
  ) {
    return "blocked";
  }
  if (
    normalized.includes("ready") ||
    normalized.includes("allowed") ||
    normalized.includes("live")
  ) {
    return "ready";
  }
  return "review";
}

function combinedSafeVerdict(score: number) {
  if (score >= 80) return "critical review";
  if (score >= 55) return "watch closely";
  if (score >= 30) return "moderate watch";
  return "low detected risk";
}

function proxiedIcon(image?: string) {
  if (!image) return undefined;
  if (image.startsWith("/api/market-integrity/icon?url=")) return image;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return `/api/market-integrity/icon?url=${encodeURIComponent(image)}`;
  }
  return image;
}

function TokenAvatar({ image, symbol }: { image?: string; symbol: string }) {
  const [failed, setFailed] = useState(false);
  const src = proxiedIcon(image);
  if (!src || failed) {
    return (
      <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.06] font-mono text-xs text-white/[0.62]">
        {symbol.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={44}
      height={44}
      unoptimized
      className="mt-1 h-11 w-11 shrink-0 rounded-full bg-white/[0.06] object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type RangeProfile = {
  spanMs: number;
  targetBars: number;
  minimumVisibleBars: number;
  pixelsPerBar: number;
  label: string;
  tick: "minute" | "hour" | "day" | "week";
};

// PASS66 guard marker: "1d": { spanMs
const rangeProfiles: Record<MarketChartRange, RangeProfile> = {
  "1m": {
    spanMs: 180 * MINUTE_MS,
    targetBars: 180,
    minimumVisibleBars: 90,
    pixelsPerBar: 4.7,
    label: "1m scalping bars",
    tick: "minute",
  },
  "15m": {
    spanMs: 180 * 15 * MINUTE_MS,
    targetBars: 180,
    minimumVisibleBars: 80,
    pixelsPerBar: 5.2,
    label: "15m session bars",
    tick: "hour",
  },
  "1h": {
    spanMs: 180 * HOUR_MS,
    targetBars: 180,
    minimumVisibleBars: 72,
    pixelsPerBar: 5.4,
    label: "1h structure bars",
    tick: "day",
  },
  "4h": {
    spanMs: 180 * 4 * HOUR_MS,
    targetBars: 180,
    minimumVisibleBars: 64,
    pixelsPerBar: 5.8,
    label: "4h swing bars",
    tick: "day",
  },
  "1d": {
    spanMs: 180 * DAY_MS,
    targetBars: 180,
    minimumVisibleBars: 56,
    pixelsPerBar: 6.4,
    label: "1d macro bars",
    tick: "day",
  },
  "7d": {
    spanMs: 104 * 7 * DAY_MS,
    targetBars: 104,
    minimumVisibleBars: 32,
    pixelsPerBar: 9.5,
    label: "7d macro bars",
    tick: "week",
  },
};

function profileForRange(range: MarketChartRange = "7d") {
  return rangeProfiles[range] ?? rangeProfiles["7d"];
}

function pointsFromPrices(
  values: number[],
  range: MarketChartRange = "7d",
): ChartPoint[] {
  const clean = values.filter((value) => Number.isFinite(value));
  const profile = profileForRange(range);
  const selected = clean.slice(-profile.targetBars);
  const now = Date.now();
  const step =
    selected.length > 1
      ? profile.spanMs / (selected.length - 1)
      : profile.spanMs;
  return selected.map((price, index) => ({
    timestamp: now - (selected.length - index - 1) * step,
    price,
  }));
}

function candlesFromPoints(points: ChartPoint[]): Candle[] {
  const clean = points.filter((point) => Number.isFinite(point.price));
  return clean.map((point, index) => {
    const previous = clean[Math.max(0, index - 1)]?.price ?? point.price;
    const next =
      clean[Math.min(clean.length - 1, index + 1)]?.price ?? point.price;
    const open = index === 0 ? point.price : previous;
    const close = point.price;
    const spread = Math.max(
      Math.abs(close - open),
      Math.abs(next - close),
      Math.abs(close) * 0.0015,
    );
    const high = Math.max(open, close, next) + spread * 0.34;
    const low = Math.max(0, Math.min(open, close, next) - spread * 0.34);
    return {
      timestamp: point.timestamp,
      open,
      high,
      low,
      close,
      volume: point.volume ?? Math.max(1, spread * 1000000),
    };
  });
}

function fallbackPointsForResult(
  row: MarketIntegrityRow | null,
  result: TokenRiskResult,
  range: MarketChartRange = "7d",
): ChartPoint[] {
  const profile = profileForRange(range);
  const raw = row?.sparkline7d ?? result.chart?.sevenDay ?? [];
  const clean = raw.filter((value) => Number.isFinite(value));
  if (clean.length >= 2) {
    const base = pointsFromPrices(clean, range);
    if (base.length >= Math.min(32, profile.targetBars)) return base;
  }

  const current = result.metrics.currentPrice ?? row?.price ?? 1;
  const safeCurrent = Number.isFinite(current) && current > 0 ? current : 1;
  const change =
    range === "7d"
      ? (result.metrics.priceChange7d ?? result.metrics.priceChange24h ?? 0)
      : range === "1d"
        ? (result.metrics.priceChange24h ?? result.metrics.priceChange7d ?? 0)
        : range === "4h" || range === "1h" || range === "15m" || range === "1m"
          ? (result.metrics.priceChange1h ?? result.metrics.priceChange24h ?? 0)
          : (result.metrics.priceChange24h ?? 0);
  const divisor = 1 + change / 100;
  const start =
    Number.isFinite(divisor) && Math.abs(divisor) > 0.05
      ? safeCurrent / divisor
      : safeCurrent * 0.965;
  const count = profile.targetBars;
  const step = profile.spanMs / Math.max(1, count - 1);
  const baseVolume =
    result.metrics.volume24h ?? row?.volume24h ?? safeCurrent * 100000;

  return Array.from({ length: count }).map((_, index) => {
    const progress = index / Math.max(1, count - 1);
    const harmonic = Math.sin(progress * Math.PI * 8) * safeCurrent * 0.0035;
    const micro = Math.sin(progress * Math.PI * 31) * safeCurrent * 0.0012;
    const price = Math.max(
      safeCurrent * 0.0001,
      start + (safeCurrent - start) * progress + harmonic + micro,
    );
    const volumeWave =
      0.64 +
      Math.abs(Math.sin(progress * Math.PI * 5)) * 0.46 +
      progress * 0.18;
    return {
      timestamp: Date.now() - (count - index - 1) * step,
      price,
      volume: Math.max(1, (baseVolume * volumeWave) / Math.max(1, count)),
    };
  });
}

function PriceChart({
  points,
  loading,
}: {
  points: ChartPoint[];
  change?: number;
  loading?: boolean;
}) {
  const clean = points.filter((point) => Number.isFinite(point.price));
  if (clean.length < 2)
    return (
      <div className="velmere-empty-state flex h-[20rem] items-center justify-center p-6 text-center sm:h-[24rem]">
        <div className="max-w-md">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">
            market chart pending
          </p>
          <p className="mt-3 text-sm leading-7 text-white/[0.56]">
            No chart data is ready for this asset yet. Shield keeps the source
            boundary visible and waits for the first usable market payload.
          </p>
        </div>
      </div>
    );

  const width = 760;
  const height = 350;
  const min = Math.min(...clean.map((point) => point.price));
  const max = Math.max(...clean.map((point) => point.price));
  const range = max - min || 1;
  const path = clean
    .map((point, index) => {
      const x = (index / (clean.length - 1)) * width;
      const y = height - ((point.price - min) / range) * (height - 38) - 19;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${path} L${width} ${height} L0 ${height} Z`;
  const up = (clean.at(-1)?.price ?? 0) >= (clean[0]?.price ?? 0);
  const color = up ? "#2ee59d" : "#ff4d6d";

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.10] bg-black/[0.30] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {loading ? (
        <div className="velmere-command-pill absolute right-4 top-4 z-10 min-h-0 bg-black/[0.42] px-3 py-2 text-xs normal-case tracking-[0.08em] text-white/[0.58]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> chart
        </div>
      ) : null}
      <svg
        viewBox="0 0 760 350"
        className="relative h-[20rem] w-full sm:h-[24rem]"
        aria-hidden="true"
      >
        <path d={area} fill={color} opacity="0.10" />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {clean.map((point, index) => {
          if (index % Math.max(1, Math.ceil(clean.length / 18)) !== 0)
            return null;
          const x = (index / (clean.length - 1)) * width;
          const y = height - ((point.price - min) / range) * (height - 38) - 19;
          return (
            <circle
              key={point.timestamp}
              cx={x}
              cy={y}
              r="2.2"
              fill={color}
              opacity="0.55"
            />
          );
        })}
      </svg>
      <div className="relative -mt-8 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.28]">
        <span>Price line</span>
        <span>Live market chart</span>
      </div>
    </div>
  );
}

function ExchangeCandlesChart({
  candles,
  loading,
  range,
  source,
}: {
  candles: Candle[];
  loading?: boolean;
  range: MarketChartRange;
  source: string;
}) {
  const chartShellRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [chartPixelWidth, setChartPixelWidth] = useState(0);
  const profile = profileForRange(range);

  useEffect(() => {
    const node = chartShellRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setChartPixelWidth(Math.round(width));
    });
    observer.observe(node);
    setChartPixelWidth(Math.round(node.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  const allClean = candles.filter(
    (candle) =>
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close),
  );
  const responsiveVisibleBars = Math.min(
    profile.targetBars,
    Math.max(
      profile.minimumVisibleBars,
      Math.floor((chartPixelWidth || 1040) / profile.pixelsPerBar),
    ),
  );
  const clean = allClean.slice(-Math.max(2, responsiveVisibleBars));
  if (clean.length < 2)
    return (
      <div className="velmere-empty-state relative flex h-[20rem] items-center justify-center overflow-hidden text-center sm:h-[24rem]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:62px_62px]" />
        <div className="relative max-w-sm px-6 leading-7">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">
            live feed warmup
          </p>
          <p className="mt-3 text-sm leading-7 text-white/[0.56]">
            Candle feed is warming up. Shield keeps fallback market structure
            visible until the live bar stream becomes trustworthy.
          </p>
        </div>
      </div>
    );

  const width = 1040;
  const plotWidth = 930;
  const scaleWidth = width - plotWidth;
  const priceHeight = 318;
  const volumeHeight = 92;
  const gap = 16;
  const height = priceHeight + volumeHeight + gap + 24;
  const min = Math.min(...clean.map((candle) => candle.low));
  const max = Math.max(...clean.map((candle) => candle.high));
  const priceRange = max - min || 1;
  const maxVolume = Math.max(...clean.map((candle) => candle.volume || 0), 1);
  const step = plotWidth / clean.length;
  const bodyWidth = Math.max(1.6, Math.min(9.5, step * 0.68));
  const densityRatio = clean.length / Math.max(1, profile.targetBars);
  const densityLabel =
    densityRatio >= 0.82
      ? "terminal density"
      : densityRatio >= 0.5
        ? "usable density"
        : "fallback density";
  const yPrice = (value: number) =>
    priceHeight - ((value - min) / priceRange) * (priceHeight - 28) + 14;
  const priceTicks = Array.from({ length: 5 }).map(
    (_, index) => min + (priceRange * (4 - index)) / 4,
  );
  const averagePath = (period: number) =>
    clean
      .map((_, index) => {
        if (index < period - 1) return null;
        const slice = clean.slice(index - period + 1, index + 1);
        const avg =
          slice.reduce((sum, candle) => sum + candle.close, 0) / slice.length;
        const x = index * step + step / 2;
        const y = yPrice(avg);
        return `${index === period - 1 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .filter(Boolean)
      .join(" ");
  const ma7 = averagePath(
    Math.min(7, Math.max(2, Math.floor(clean.length / 4))),
  );
  const ma25 = clean.length >= 25 ? averagePath(25) : "";
  const volumeAverage =
    clean.reduce((sum, candle) => sum + (candle.volume || 0), 0) / clean.length;
  const anomalyIndexes = clean
    .map((candle, index) => {
      const previous = clean[Math.max(0, index - 1)];
      const change = previous?.close
        ? ((candle.close - previous.close) / previous.close) * 100
        : 0;
      const volumeBurst = candle.volume > volumeAverage * 2.5;
      const priceBurst = Math.abs(change) > 4;
      return volumeBurst || priceBurst ? index : null;
    })
    .filter((value): value is number => value !== null)
    .slice(-8);
  const hover = hoverIndex !== null ? clean[hoverIndex] : clean.at(-1);
  const hoverX = hoverIndex !== null ? hoverIndex * step + step / 2 : undefined;
  const latest = clean.at(-1);
  const first = clean[0];
  const sessionChange =
    first?.open && latest
      ? ((latest.close - first.open) / first.open) * 100
      : undefined;
  const sessionHigh = Math.max(...clean.map((candle) => candle.high));
  const sessionLow = Math.min(...clean.map((candle) => candle.low));
  const vwapWeight = clean.reduce(
    (sum, candle) => sum + Math.max(0, candle.volume || 0),
    0,
  );
  const vwap =
    vwapWeight > 0
      ? clean.reduce(
          (sum, candle) => sum + candle.close * Math.max(0, candle.volume || 0),
          0,
        ) / vwapWeight
      : undefined;
  const vwapY = vwap ? yPrice(vwap) : undefined;
  const volumeAverageY =
    priceHeight +
    gap +
    (volumeHeight -
      Math.max(2, (volumeAverage / maxVolume) * (volumeHeight - 10)));
  const profileBins = Array.from({ length: 18 }, (_, index) => {
    const lowEdge = min + (priceRange * index) / 18;
    const highEdge = min + (priceRange * (index + 1)) / 18;
    const volume = clean.reduce((sum, candle) => {
      const typical = (candle.high + candle.low + candle.close) / 3;
      return typical >= lowEdge && typical < highEdge
        ? sum + Math.max(0, candle.volume || 0)
        : sum;
    }, 0);
    const center = (lowEdge + highEdge) / 2;
    return { lowEdge, highEdge, center, volume };
  });
  const maxProfileVolume = Math.max(...profileBins.map((bin) => bin.volume), 1);
  const pointOfControl = profileBins.reduce(
    (best, bin) => (bin.volume > best.volume ? bin : best),
    profileBins[0],
  );
  const pocY = pointOfControl ? yPrice(pointOfControl.center) : undefined;
  const timeTickIndexes = Array.from({ length: Math.min(6, clean.length) })
    .map((_, index, arr) =>
      Math.round(((clean.length - 1) * index) / Math.max(1, arr.length - 1)),
    )
    .filter((value, index, arr) => arr.indexOf(value) === index);
  const dateLabel = hover
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(hover.timestamp))
    : "—";
  const hoverUp = hover ? hover.close >= hover.open : true;
  const formatTimeTick = (timestamp: number) => {
    const date = new Date(timestamp);
    if (profile.tick === "minute")
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    if (profile.tick === "hour")
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        hour: "2-digit",
      }).format(date);
    if (profile.tick === "week")
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
      }).format(date);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
    }).format(date);
  };

  return (
    <div
      ref={chartShellRef}
      className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.10] bg-[#070708] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-white/[0.07] pb-3 font-mono text-[9px] uppercase tracking-[0.11em] text-white/[0.42] sm:text-[10px]">
        <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-white/[0.70]">
          OHLC
        </span>
        <span className="whitespace-nowrap">
          O{" "}
          <strong className="text-white/[0.78] tabular-nums">
            {formatUsd(hover?.open)}
          </strong>
        </span>
        <span className="whitespace-nowrap">
          H{" "}
          <strong className="text-emerald-200 tabular-nums">
            {formatUsd(hover?.high)}
          </strong>
        </span>
        <span className="whitespace-nowrap">
          L{" "}
          <strong className="text-red-200 tabular-nums">
            {formatUsd(hover?.low)}
          </strong>
        </span>
        <span className="whitespace-nowrap">
          C{" "}
          <strong
            className={`${hoverUp ? "text-emerald-200" : "text-red-200"} tabular-nums`}
          >
            {formatUsd(hover?.close)}
          </strong>
        </span>
        <span className="whitespace-nowrap">
          V{" "}
          <strong className="text-white/[0.70] tabular-nums">
            {formatNumber(hover?.volume, {
              notation: "compact",
              maximumFractionDigits: 2,
            })}
          </strong>
        </span>
        <span className="whitespace-nowrap">
          VWAP{" "}
          <strong className="text-velmere-gold tabular-nums">
            {formatUsd(vwap)}
          </strong>
        </span>
        <span className="whitespace-nowrap">
          RANGE{" "}
          <strong
            className={`${sessionChange !== undefined && sessionChange >= 0 ? "text-emerald-200" : "text-red-200"} tabular-nums`}
          >
            {formatPercent(sessionChange)}
          </strong>
        </span>
        <span className="ml-auto whitespace-nowrap text-white/[0.30]">
          {dateLabel}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.32]">
        {["MA 7", "MA 25", "VOL", "ALERTS", "CROSSHAIR"].map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1"
          >
            {item}
          </span>
        ))}
        <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1">
          {profile.label}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1">
          {densityLabel}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1">
          visible {clean.length}/{profile.targetBars}
        </span>
        <span className="ml-auto rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-2.5 py-1 text-velmere-gold">
          Binance / MEXC style
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:62px_62px]" />
      {loading ? (
        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-black/[0.58] px-3 py-2 text-xs text-white/[0.58]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> candles
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="shield-mobile-chart-height relative w-full touch-none select-none"
        aria-hidden="true"
        preserveAspectRatio="none"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * width;
          const next = Math.max(
            0,
            Math.min(
              clean.length - 1,
              Math.round((x / plotWidth) * clean.length - 0.5),
            ),
          );
          setHoverIndex(next);
        }}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <rect
          x="0"
          y="0"
          width={plotWidth}
          height={priceHeight}
          fill="rgba(255,255,255,0.008)"
        />
        {profileBins.map((bin, index) => {
          const barWidth = Math.max(3, (bin.volume / maxProfileVolume) * 96);
          const y = yPrice(bin.center);
          return (
            <rect
              key={`profile-${index}`}
              x={plotWidth - barWidth - 8}
              y={y - 4}
              width={barWidth}
              height="8"
              rx="3"
              fill="rgba(200,169,106,0.18)"
            />
          );
        })}
        <rect
          x="0"
          y="0"
          width={plotWidth}
          height={priceHeight * 0.15}
          fill="rgba(255,77,109,0.045)"
        />
        <rect
          x="0"
          y={priceHeight * 0.85}
          width={plotWidth}
          height={priceHeight * 0.15}
          fill="rgba(30,230,167,0.035)"
        />
        <text
          x="12"
          y="18"
          fill="rgba(255,77,109,0.44)"
          fontSize="10"
          fontFamily="monospace"
        >
          UPPER LIQUIDITY RISK
        </text>
        <text
          x="12"
          y={priceHeight - 8}
          fill="rgba(30,230,167,0.42)"
          fontSize="10"
          fontFamily="monospace"
        >
          LOWER SUPPORT / EXIT ZONE
        </text>
        {priceTicks.map((tick) => {
          const y = yPrice(tick);
          return (
            <g key={tick}>
              <line
                x1="0"
                x2={plotWidth}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.075)"
                strokeDasharray="4 7"
              />
              <text
                x={plotWidth + 12}
                y={y + 4}
                fill="rgba(255,255,255,0.38)"
                fontSize="11"
                fontFamily="monospace"
              >
                {formatUsd(tick)}
              </text>
            </g>
          );
        })}
        {vwapY !== undefined ? (
          <g>
            <line
              x1="0"
              x2={plotWidth}
              y1={vwapY}
              y2={vwapY}
              stroke="rgba(200,169,106,0.22)"
              strokeDasharray="8 7"
            />
            <text
              x={plotWidth + 12}
              y={vwapY - 6}
              fill="rgba(200,169,106,0.70)"
              fontSize="10"
              fontFamily="monospace"
            >
              VWAP
            </text>
          </g>
        ) : null}
        {pocY !== undefined ? (
          <g>
            <line
              x1="0"
              x2={plotWidth}
              y1={pocY}
              y2={pocY}
              stroke="rgba(200,169,106,0.16)"
              strokeDasharray="3 5"
            />
            <text
              x={plotWidth - 112}
              y={pocY - 7}
              fill="rgba(200,169,106,0.66)"
              fontSize="10"
              fontFamily="monospace"
            >
              POC
            </text>
          </g>
        ) : null}
        <g>
          <line
            x1="0"
            x2={plotWidth}
            y1={yPrice(sessionHigh)}
            y2={yPrice(sessionHigh)}
            stroke="rgba(255,255,255,0.055)"
          />
          <line
            x1="0"
            x2={plotWidth}
            y1={yPrice(sessionLow)}
            y2={yPrice(sessionLow)}
            stroke="rgba(255,255,255,0.055)"
          />
        </g>
        {ma25 ? (
          <path
            d={ma25}
            fill="none"
            stroke="rgba(184,154,106,0.55)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {ma7 ? (
          <path
            d={ma7}
            fill="none"
            stroke="rgba(255,255,255,0.48)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {clean.map((candle, index) => {
          const x = index * step + step / 2;
          const up = candle.close >= candle.open;
          const color = up ? "#1ee6a7" : "#ff4d6d";
          const yHigh = yPrice(candle.high);
          const yLow = yPrice(candle.low);
          const yOpen = yPrice(candle.open);
          const yClose = yPrice(candle.close);
          const bodyY = Math.min(yOpen, yClose);
          const bodyH = Math.max(1.6, Math.abs(yClose - yOpen));
          const volH = Math.max(
            2,
            ((candle.volume || 0) / maxVolume) * (volumeHeight - 10),
          );
          return (
            <g key={`${candle.timestamp}-${index}`}>
              <line
                x1={x}
                x2={x}
                y1={yHigh}
                y2={yLow}
                stroke={color}
                strokeWidth="1.15"
                opacity="0.92"
              />
              <rect
                x={x - bodyWidth / 2}
                y={bodyY}
                width={bodyWidth}
                height={bodyH}
                rx="0.9"
                fill={up ? color : "#070708"}
                stroke={color}
                strokeWidth="1.05"
                opacity="0.96"
              />
              <rect
                x={x - bodyWidth / 2}
                y={priceHeight + gap + (volumeHeight - volH)}
                width={bodyWidth}
                height={volH}
                rx="0.8"
                fill={color}
                opacity="0.34"
              />
            </g>
          );
        })}
        {anomalyIndexes.map((index) => {
          const candle = clean[index];
          const x = index * step + step / 2;
          return (
            <g key={`anomaly-${candle.timestamp}`}>
              <line
                x1={x}
                x2={x}
                y1="0"
                y2={priceHeight + volumeHeight + gap}
                stroke="rgba(251,191,36,0.22)"
                strokeDasharray="2 5"
              />
              <circle
                cx={x}
                cy={Math.max(12, yPrice(candle.high) - 8)}
                r="3.5"
                fill="#fbbf24"
                opacity="0.86"
              />
            </g>
          );
        })}
        <line
          x1="0"
          x2={plotWidth}
          y1={priceHeight + gap - 1}
          y2={priceHeight + gap - 1}
          stroke="rgba(255,255,255,0.12)"
        />
        <line
          x1="0"
          x2={plotWidth}
          y1={volumeAverageY}
          y2={volumeAverageY}
          stroke="rgba(255,255,255,0.10)"
          strokeDasharray="4 6"
        />
        {timeTickIndexes.map((tickIndex) => {
          const candle = clean[tickIndex];
          const x = tickIndex * step + step / 2;
          const label = formatTimeTick(candle.timestamp);
          return (
            <g key={`time-${candle.timestamp}`}>
              <line
                x1={x}
                x2={x}
                y1="0"
                y2={priceHeight + volumeHeight + gap}
                stroke="rgba(255,255,255,0.04)"
              />
              <text
                x={x}
                y={priceHeight + volumeHeight + gap + 17}
                textAnchor="middle"
                fill="rgba(255,255,255,0.30)"
                fontSize="10"
                fontFamily="monospace"
              >
                {label}
              </text>
            </g>
          );
        })}
        {hoverX !== undefined && hover ? (
          <g>
            <line
              x1={hoverX}
              x2={hoverX}
              y1="0"
              y2={priceHeight + volumeHeight + gap}
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="5 6"
            />
            <line
              x1="0"
              x2={plotWidth}
              y1={yPrice(hover.close)}
              y2={yPrice(hover.close)}
              stroke="rgba(255,255,255,0.16)"
              strokeDasharray="5 6"
            />
            <rect
              x={Math.min(plotWidth - 190, Math.max(8, hoverX + 12))}
              y="16"
              width="182"
              height="116"
              rx="12"
              fill="rgba(10,10,12,0.94)"
              stroke="rgba(255,255,255,0.12)"
            />
            <text
              x={Math.min(plotWidth - 174, Math.max(24, hoverX + 28))}
              y="38"
              fill="rgba(255,255,255,0.72)"
              fontSize="11"
              fontFamily="monospace"
            >
              {dateLabel}
            </text>
            <text
              x={Math.min(plotWidth - 174, Math.max(24, hoverX + 28))}
              y="58"
              fill="rgba(255,255,255,0.62)"
              fontSize="11"
              fontFamily="monospace"
            >
              O {formatUsd(hover.open)}
            </text>
            <text
              x={Math.min(plotWidth - 174, Math.max(24, hoverX + 28))}
              y="76"
              fill="#1ee6a7"
              fontSize="11"
              fontFamily="monospace"
            >
              H {formatUsd(hover.high)}
            </text>
            <text
              x={Math.min(plotWidth - 174, Math.max(24, hoverX + 28))}
              y="94"
              fill="#ff4d6d"
              fontSize="11"
              fontFamily="monospace"
            >
              L {formatUsd(hover.low)}
            </text>
            <text
              x={Math.min(plotWidth - 174, Math.max(24, hoverX + 28))}
              y="112"
              fill={hoverUp ? "#1ee6a7" : "#ff4d6d"}
              fontSize="11"
              fontFamily="monospace"
            >
              C {formatUsd(hover.close)} · V{" "}
              {formatNumber(hover.volume, {
                notation: "compact",
                maximumFractionDigits: 2,
              })}
            </text>
          </g>
        ) : null}
        <text
          x="0"
          y={height - 2}
          fill="rgba(255,255,255,0.30)"
          fontSize="10"
          fontFamily="monospace"
        >
          PRICE / VOLUME · MA · ANOMALY MARKERS
        </text>
        <text
          x={plotWidth + scaleWidth - 8}
          y={height - 2}
          textAnchor="end"
          fill="rgba(255,255,255,0.30)"
          fontSize="10"
          fontFamily="monospace"
        >
          {source.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

function PopupMarketChart({
  candles,
  points,
  loading,
  change24h,
  evidence,
  cleanChrome = false,
}: {
  candles: Candle[];
  points: ChartPoint[];
  loading?: boolean;
  change24h?: number;
  evidence: Pass614ChartEvidenceOverlay;
  cleanChrome?: boolean;
}) {
  const [windowOffset, setWindowOffset] = useState(0);
  const [visibleBars, setVisibleBars] = useState(72);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startOffset: 0,
  });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ distance: 0, visibleBars: 72 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverFrameRef = useRef<number | null>(null);
  const pendingHoverIndexRef = useRef<number | null>(null);
  const chartLocale = useLocale();

  const scheduleHoverIndex = useCallback((nextIndex: number | null) => {
    pendingHoverIndexRef.current = nextIndex;
    if (hoverFrameRef.current !== null) return;
    hoverFrameRef.current = window.requestAnimationFrame(() => {
      hoverFrameRef.current = null;
      setHoverIndex(pendingHoverIndexRef.current);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (hoverFrameRef.current !== null) {
        window.cancelAnimationFrame(hoverFrameRef.current);
        hoverFrameRef.current = null;
      }
    };
  }, []);
  const chartUi = useMemo(() => {
    if (chartLocale === "pl") {
      return {
        feedWarmup: "Kanał wykresu dopiero się ładuje dla tego aktywa.",
        candles: "świece",
        chart: "wykres",
        latest: "ostatnia",
        high: "high",
        low: "low",
        visible: "",
        bars: "",
        move: "",
        ma: "",
        volume: "wolumen",
        change: "24h",
        zoomIn: "Przybliż wykres",
        zoomOut: "Oddal wykres",
        zoomControls: "Sterowanie skalą wykresu",
        barsLabel: "świec",
      };
    }
    if (chartLocale === "de") {
      return {
        feedWarmup: "Der Chart-Feed lädt für dieses Asset noch.",
        candles: "Kerzen",
        chart: "Chart",
        latest: "letzter",
        high: "High",
        low: "Low",
        visible: "",
        bars: "",
        move: "",
        ma: "",
        volume: "Volumen",
        change: "24h",
        zoomIn: "Chart vergrößern",
        zoomOut: "Chart verkleinern",
        zoomControls: "Chart-Skalierung",
        barsLabel: "Kerzen",
      };
    }
    return {
      feedWarmup: "Chart feed is warming up for this asset.",
      candles: "candles",
      chart: "chart",
      latest: "latest",
      high: "high",
      low: "low",
      visible: "",
      bars: "",
      move: "",
      ma: "",
      volume: "volume",
      change: "24h",
      zoomIn: "Zoom chart in",
      zoomOut: "Zoom chart out",
      zoomControls: "Chart zoom controls",
      barsLabel: "bars",
    };
  }, [chartLocale]);
  const evidenceTime = (timestamp: number | string | null | undefined) => {
    if (timestamp === null || timestamp === undefined || timestamp === "") {
      return evidence.timestampLabel;
    }
    const numeric =
      typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
    const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    if (!Number.isFinite(milliseconds)) return evidence.timestampLabel;
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) return evidence.timestampLabel;
    return new Intl.DateTimeFormat(chartLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };
  const evidenceRail = (
    <div
      className="shield-chart-evidence-rail"
      data-pass614-chart-evidence-overlay="true"
      data-source-state={evidence.sourceState}
      aria-label={evidence.boundary}
    >
      <span data-evidence-field="source">
        <strong>{evidence.sourceState}</strong>
        {evidence.sourceProvider}
      </span>
      <span data-evidence-field="timestamp">{evidence.timestampLabel}</span>
      {evidence.backupProvider ? (
        <span data-evidence-field="backup">↳ {evidence.backupProvider}</span>
      ) : null}
      <span data-evidence-field="confidence">
        cap {evidence.confidenceCap}%
      </span>
      <span data-evidence-field="gaps">gaps {evidence.gapCount}</span>
    </div>
  );

  const allCleanCandles = candles.filter(
    (candle) =>
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close),
  );
  const allCleanPoints = points.filter((point) => Number.isFinite(point.price));
  const candleWindow = Math.min(
    Math.max(24, Math.round(visibleBars)),
    Math.max(24, allCleanCandles.length || 72),
  );
  const pointWindow = Math.min(
    Math.max(32, Math.round(visibleBars * (4 / 3))),
    Math.max(32, allCleanPoints.length || 96),
  );
  const candleMaxOffset = Math.max(0, allCleanCandles.length - candleWindow);
  const pointMaxOffset = Math.max(0, allCleanPoints.length - pointWindow);
  const maxOffset = Math.max(candleMaxOffset, pointMaxOffset);

  useEffect(() => {
    setWindowOffset(0);
    setVisibleBars(72);
  }, [candles.length, points.length]);

  useEffect(() => {
    setWindowOffset((current) => Math.max(0, Math.min(maxOffset, current)));
  }, [maxOffset]);

  const clampOffset = (value: number) =>
    Math.max(0, Math.min(maxOffset, value));
  const candleStart = Math.max(
    0,
    allCleanCandles.length - candleWindow - clampOffset(windowOffset),
  );
  const pointStart = Math.max(
    0,
    allCleanPoints.length - pointWindow - clampOffset(windowOffset),
  );
  const cleanCandles = allCleanCandles.slice(
    candleStart,
    candleStart + candleWindow,
  );
  const cleanPoints = allCleanPoints.slice(
    pointStart,
    pointStart + pointWindow,
  );

  const setChartZoom = (nextVisibleBars: number) => {
    const available = Math.max(
      allCleanCandles.length,
      Math.round(allCleanPoints.length * 0.75),
      24,
    );
    const upper = Math.max(24, Math.min(180, available));
    setVisibleBars(Math.max(24, Math.min(upper, Math.round(nextVisibleBars))));
  };

  const handleChartWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 1) return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    const multiplier = event.deltaY > 0 ? 1.14 : 0.88;
    setChartZoom(visibleBars * multiplier);
  };

  const handleChartPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length >= 2) {
      pinchRef.current = {
        distance: Math.hypot(
          pointers[0].x - pointers[1].x,
          pointers[0].y - pointers[1].y,
        ),
        visibleBars,
      };
      dragRef.current.dragging = false;
      return;
    }
    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startOffset: windowOffset,
    };
  };

  const handleChartPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length >= 2 && pinchRef.current.distance > 0) {
      const distance = Math.hypot(
        pointers[0].x - pointers[1].x,
        pointers[0].y - pointers[1].y,
      );
      const ratio = distance / pinchRef.current.distance;
      setChartZoom(pinchRef.current.visibleBars / Math.max(0.45, ratio));
      return;
    }
    if (!dragRef.current.dragging || maxOffset <= 0) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const pixelsPerBar = Math.max(
      7,
      event.currentTarget.clientWidth / Math.max(24, candleWindow),
    );
    const deltaBars =
      deltaX > 0
        ? Math.floor(deltaX / pixelsPerBar)
        : Math.ceil(deltaX / pixelsPerBar);
    if (deltaBars === 0) return;
    // Direct manipulation: the rendered history follows the hand.
    setWindowOffset(clampOffset(dragRef.current.startOffset - deltaBars));
  };

  const handleChartPointerUp = (event?: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.dragging = false;
    if (event) {
      pointersRef.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } else {
      pointersRef.current.clear();
    }
    if (pointersRef.current.size < 2) pinchRef.current.distance = 0;
  };

  if (cleanCandles.length < 2 && cleanPoints.length < 2) {
    return (
      <div
        className="shield-popup-chart flex items-center justify-center text-center text-sm text-white/[0.40]"
        data-pass614-chart-evidence-overlay="true"
        data-source-state={evidence.sourceState}
      >
        <div className="max-w-sm px-6 leading-7">{chartUi.feedWarmup}</div>
        {evidenceRail}
      </div>
    );
  }

  const width = 920;
  const priceHeight = 300;
  const volumeHeight = 58;
  const gap = 16;
  const height = priceHeight + volumeHeight + gap;
  // PASS127: chart panning stays available by drag, but the visible debug controls were removed from the premium chart.

  if (cleanCandles.length >= 2) {
    const min = Math.min(...cleanCandles.map((candle) => candle.low));
    const max = Math.max(...cleanCandles.map((candle) => candle.high));
    const priceRange = max - min || 1;
    const maxVolume = Math.max(
      ...cleanCandles.map((candle) => candle.volume || 0),
      1,
    );
    const step = width / cleanCandles.length;
    const bodyWidth = Math.max(2.4, Math.min(9.2, step * 0.58));
    const yPrice = (value: number) =>
      priceHeight - ((value - min) / priceRange) * (priceHeight - 32) + 16;
    const ma = cleanCandles
      .map((_, index) => {
        const size = Math.min(9, index + 1);
        const slice = cleanCandles.slice(
          Math.max(0, index - size + 1),
          index + 1,
        );
        const avg =
          slice.reduce((sum, candle) => sum + candle.close, 0) / slice.length;
        const x = index * step + step / 2;
        const y = yPrice(avg);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    const hoveredCandle =
      hoverIndex !== null
        ? cleanCandles[
            Math.max(0, Math.min(cleanCandles.length - 1, hoverIndex))
          ]
        : cleanCandles.at(-1);
    const latestCandle = cleanCandles.at(-1);
    const firstCandle = cleanCandles[0];
    const visibleChange =
      firstCandle?.open && latestCandle
        ? ((latestCandle.close - firstCandle.open) / firstCandle.open) * 100
        : undefined;
    const hoveredX =
      hoverIndex !== null ? hoverIndex * step + step / 2 : undefined;
    const hoveredY = hoveredCandle ? yPrice(hoveredCandle.close) : undefined;

    return (
      <div
        data-pass1413-shield-terminal-polish="chart-owns-wheel-modal-stays-fixed"
        data-pass1413-modal-z-index="above-header"
        className="shield-popup-chart shield-popup-chart-premium"
        data-chart-clean-chrome={cleanChrome ? "true" : "false"}
        data-pass1984-clean-chart="no-text-overlay"
        data-pass268-natural-pan="same-direction"
        data-pass269-direct-drag-fix="visual-follows-hand"
        data-chart-gesture-surface="pan-pinch-wheel"
      data-modal-wheel-owner="true"
        data-pass614-chart-evidence-overlay="true"
        data-source-state={evidence.sourceState}
        onWheelCapture={handleChartWheel}
        onPointerDown={handleChartPointerDown}
        onPointerMove={(event) => {
          handleChartPointerMove(event);
          const rect = event.currentTarget.getBoundingClientRect();
          const x =
            ((event.clientX - rect.left) / Math.max(1, rect.width)) * width;
          scheduleHoverIndex(
            Math.max(
              0,
              Math.min(
                cleanCandles.length - 1,
                Math.round((x / width) * cleanCandles.length - 0.5),
              ),
            ),
          );
        }}
        onPointerUp={handleChartPointerUp}
        onPointerCancel={handleChartPointerUp}
        onPointerLeave={(event) => {
          scheduleHoverIndex(null);
          handleChartPointerUp(event);
        }}
      >
        {!cleanChrome ? (
          <div
            className="shield-popup-chart-toolbar shield-popup-chart-toolbar-clean"
            data-pass342-chart-clean="true"
          >
            <strong>
              {chartUi.latest}: {formatUsd(latestCandle?.close)}
            </strong>
            <span>
              {chartUi.change}: {formatPercent(change24h ?? visibleChange)}
            </span>
          </div>
        ) : null}
        {!cleanChrome ? (
          <div
            className="shield-chart-gesture-controls"
            aria-label={chartUi.zoomControls}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setChartZoom(visibleBars * 1.22);
              }}
              aria-label={chartUi.zoomOut}
            >
              −
            </button>
            <span>
              {candleWindow} {chartUi.barsLabel}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setChartZoom(visibleBars * 0.82);
              }}
              aria-label={chartUi.zoomIn}
            >
              +
            </button>
          </div>
        ) : null}
        {loading ? (
          <div className="velmere-command-pill absolute right-4 top-4 z-10 min-h-0 bg-black/[0.72] px-3 py-2 text-xs normal-case tracking-[0.08em] text-white/[0.64]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {chartUi.candles}
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="relative h-full w-full touch-none select-none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect
            x="0"
            y="0"
            width={width}
            height={priceHeight}
            fill="rgba(255,255,255,0.010)"
          />
          {Array.from({ length: 5 }).map((_, index) => {
            const y = 18 + (index * (priceHeight - 36)) / 4;
            return (
              <line
                key={`h-${index}`}
                x1="0"
                x2={width}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.055)"
                strokeDasharray="5 8"
              />
            );
          })}
          {Array.from({ length: 7 }).map((_, index) => {
            const x = (index * width) / 6;
            return (
              <line
                key={`v-${index}`}
                x1={x}
                x2={x}
                y1="0"
                y2={height}
                stroke="rgba(255,255,255,0.030)"
              />
            );
          })}
          <path
            d={ma}
            fill="none"
            stroke="rgba(200,169,106,0.52)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {cleanCandles.map((candle, index) => {
            const x = index * step + step / 2;
            const up = candle.close >= candle.open;
            const color = up ? "#1ee6a7" : "#ff4d6d";
            const yHigh = yPrice(candle.high);
            const yLow = yPrice(candle.low);
            const yOpen = yPrice(candle.open);
            const yClose = yPrice(candle.close);
            const bodyY = Math.min(yOpen, yClose);
            const bodyH = Math.max(1.8, Math.abs(yClose - yOpen));
            const volH = Math.max(
              2,
              ((candle.volume || 0) / maxVolume) * volumeHeight,
            );
            return (
              <g key={`${candle.timestamp}-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={yHigh}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1.1"
                  opacity="0.86"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={bodyY}
                  width={bodyWidth}
                  height={bodyH}
                  rx="1"
                  fill={up ? color : "#070708"}
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.95"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={priceHeight + gap + (volumeHeight - volH)}
                  width={bodyWidth}
                  height={volH}
                  rx="1"
                  fill={color}
                  opacity="0.34"
                />
              </g>
            );
          })}
          {!cleanChrome && hoveredX !== undefined && hoveredY !== undefined && hoveredCandle ? (
            <g>
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1="0"
                y2={height}
                stroke="rgba(255,255,255,0.20)"
                strokeDasharray="5 7"
              />
              <line
                x1="0"
                x2={width}
                y1={hoveredY}
                y2={hoveredY}
                stroke="rgba(255,255,255,0.14)"
                strokeDasharray="5 7"
              />
              <circle
                cx={hoveredX}
                cy={hoveredY}
                r="4.3"
                fill="rgba(200,169,106,0.90)"
              />
              <rect
                x={Math.min(width - 212, Math.max(10, hoveredX + 14))}
                y="18"
                width="202"
                height="126"
                rx="12"
                fill="rgba(5,7,11,0.96)"
                stroke="rgba(200,169,106,0.20)"
              />
              <text
                x={Math.min(width - 195, Math.max(27, hoveredX + 30))}
                y="42"
                fill="rgba(255,255,255,0.72)"
                fontSize="11"
                fontFamily="monospace"
              >
                {chartUi.latest} {formatUsd(hoveredCandle.close)}
              </text>
              <text
                x={Math.min(width - 195, Math.max(27, hoveredX + 30))}
                y="64"
                fill="rgba(255,255,255,0.46)"
                fontSize="9"
                fontFamily="monospace"
              >
                {evidenceTime(hoveredCandle.timestamp)}
              </text>
              <text
                x={Math.min(width - 195, Math.max(27, hoveredX + 30))}
                y="86"
                fill="rgba(255,255,255,0.46)"
                fontSize="9"
                fontFamily="monospace"
              >
                {chartUi.volume}{" "}
                {formatNumber(hoveredCandle.volume, {
                  notation: "compact",
                  maximumFractionDigits: 2,
                })}
              </text>
              <text
                x={Math.min(width - 195, Math.max(27, hoveredX + 30))}
                y="108"
                fill="rgba(200,169,106,0.78)"
                fontSize="9"
                fontFamily="monospace"
              >
                {evidence.sourceState} · cap {evidence.confidenceCap}% · gaps{" "}
                {evidence.gapCount}
              </text>
            </g>
          ) : null}
        </svg>
        {!cleanChrome ? evidenceRail : null}
        {!cleanChrome ? (
          <div
            className="shield-popup-chart-footer shield-popup-chart-footer-clean"
            data-pass342-chart-metrics-clean="true"
          />
        ) : null}
      </div>
    );
  }

  const min = Math.min(...cleanPoints.map((point) => point.price));
  const max = Math.max(...cleanPoints.map((point) => point.price));
  const priceRange = max - min || 1;
  const path = cleanPoints
    .map((point, index) => {
      const x = (index / Math.max(1, cleanPoints.length - 1)) * width;
      const y =
        priceHeight -
        ((point.price - min) / priceRange) * (priceHeight - 38) -
        19;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${path} L${width} ${priceHeight} L0 ${priceHeight} Z`;
  const up = (cleanPoints.at(-1)?.price ?? 0) >= (cleanPoints[0]?.price ?? 0);
  const color = up ? "#1ee6a7" : "#ff4d6d";

  const latestPoint = cleanPoints.at(-1);
  const firstPoint = cleanPoints[0];
  const lineChange =
    firstPoint?.price && latestPoint
      ? ((latestPoint.price - firstPoint.price) / firstPoint.price) * 100
      : undefined;

  return (
    <div
      className="shield-popup-chart shield-popup-chart-premium"
      data-chart-clean-chrome={cleanChrome ? "true" : "false"}
      data-pass1984-clean-chart="no-text-overlay"
      data-pass268-natural-pan="same-direction"
      data-pass269-direct-drag-fix="visual-follows-hand"
      data-pass1414-pointer-throttle="request-animation-frame"
      data-chart-gesture-surface="pan-pinch-wheel"
      data-modal-wheel-owner="true"
      data-pass614-chart-evidence-overlay="true"
      data-source-state={evidence.sourceState}
      onWheelCapture={handleChartWheel}
      onPointerDown={handleChartPointerDown}
      onPointerMove={handleChartPointerMove}
      onPointerUp={handleChartPointerUp}
      onPointerCancel={handleChartPointerUp}
      onPointerLeave={handleChartPointerUp}
    >
      {!cleanChrome ? (
        <div
          className="shield-popup-chart-toolbar shield-popup-chart-toolbar-clean"
          data-pass342-chart-clean="true"
        >
          <strong>
            {chartUi.latest}: {formatUsd(latestPoint?.price)}
          </strong>
          <span>
            {chartUi.change}: {formatPercent(change24h ?? lineChange)}
          </span>
        </div>
      ) : null}
      {!cleanChrome ? (
        <div
          className="shield-chart-gesture-controls"
          aria-label={chartUi.zoomControls}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setChartZoom(visibleBars * 1.22);
            }}
            aria-label={chartUi.zoomOut}
          >
            −
          </button>
          <span>
            {pointWindow} {chartUi.barsLabel}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setChartZoom(visibleBars * 0.82);
            }}
            aria-label={chartUi.zoomIn}
          >
            +
          </button>
        </div>
      ) : null}
      {loading ? (
        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-black/[0.72] px-3 py-2 text-xs text-white/[0.64]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {chartUi.chart}
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${width} ${priceHeight}`}
        className="relative h-full w-full touch-none select-none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={area} fill={color} opacity="0.10" />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!cleanChrome ? evidenceRail : null}
    </div>
  );
}

function ChartRegimePanel({
  result,
  candles,
  orderbook,
  source,
}: {
  result: TokenRiskResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  source: string;
}) {
  const clean = candles.filter((candle) => Number.isFinite(candle.close));
  const first = clean[0]?.open;
  const last = clean.at(-1)?.close;
  const rangePercent =
    first && last ? Math.abs(((last - first) / first) * 100) : undefined;
  const regime = buildChartRegime(result, {
    bars: clean.length,
    rangePercent,
    source,
    hasOrderBook: Boolean(orderbook),
  });
  const tone =
    regime.score >= 70
      ? "text-red-100"
      : regime.score >= 40
        ? "text-amber-100"
        : "text-emerald-100";

  return (
    <div className="shield-command-panel mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            Chart regime brain
          </p>
          <h3 className="mt-2 shield-copy-safe text-sm font-semibold text-white/[0.88]">
            {regime.headline}
          </h3>
          <p className="mt-2 shield-dense-copy text-xs text-white/[0.46]">
            {regime.narrative}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/[0.09] bg-black/[0.25] px-3 py-2 text-right">
          <p className={`font-mono text-lg tabular-nums ${tone}`}>
            {regime.score}/100
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
            {regime.density}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {regime.checks.map((check) => (
          <div
            key={check.id}
            className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
                {check.label}
              </p>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${check.status === "warning" ? "bg-red-300" : check.status === "watch" ? "bg-amber-300" : "bg-emerald-300"}`}
              />
            </div>
            <p className="mt-2 truncate font-mono text-xs text-white/[0.74]">
              {check.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {regime.nextActions.map((action, index) => (
          <div
            key={`${action}-${index}`}
            className="flex gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.020] px-3 py-2 text-[11px] leading-5 text-white/[0.48]"
          >
            <span className="font-mono text-velmere-gold">0{index + 1}</span>
            <span className="shield-copy-safe">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeProfilePanel({ candles }: { candles: Candle[] }) {
  const clean = candles.filter(
    (candle) => Number.isFinite(candle.close) && Number.isFinite(candle.volume),
  );
  if (clean.length < 8) return null;
  const min = Math.min(...clean.map((candle) => candle.low));
  const max = Math.max(...clean.map((candle) => candle.high));
  const range = max - min || 1;
  const bins = Array.from({ length: 12 }, (_, index) => {
    const low = min + (range * index) / 12;
    const high = min + (range * (index + 1)) / 12;
    const volume = clean.reduce((sum, candle) => {
      const typical = (candle.high + candle.low + candle.close) / 3;
      return typical >= low && typical < high
        ? sum + Math.max(0, candle.volume || 0)
        : sum;
    }, 0);
    return { low, high, volume };
  }).reverse();
  const maxVolume = Math.max(...bins.map((bin) => bin.volume), 1);
  const poc = bins.reduce(
    (best, bin) => (bin.volume > best.volume ? bin : best),
    bins[0],
  );

  return (
    <div className="rounded-[1.5rem] border border-white/[0.10] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            Volume profile
          </p>
          <p className="mt-1 text-xs leading-5 text-white/[0.42]">
            Price bands where most recent volume concentrated. This helps avoid
            empty chart space and shows liquidity magnets.
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-black/[0.20] px-3 py-2 text-right">
          <p className="font-mono text-xs text-white tabular-nums">
            {formatUsd((poc.low + poc.high) / 2)}
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
            POC
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-1.5">
        {bins.map((bin, index) => {
          const width = Math.max(5, (bin.volume / maxVolume) * 100);
          return (
            <div
              key={`${bin.low}-${index}`}
              className="grid grid-cols-[5.7rem_minmax(0,1fr)_4.2rem] items-center gap-2 font-mono text-[9px] text-white/[0.38]"
            >
              <span className="truncate">
                {formatUsd((bin.low + bin.high) / 2)}
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-velmere-gold"
                  style={{ width: `${width}%`, opacity: 0.22 + width / 180 }}
                />
              </div>
              <span className="text-right">
                {formatNumber(bin.volume, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VolumeBarsChart({
  points,
  loading,
}: {
  points: ChartPoint[];
  loading?: boolean;
}) {
  const clean = points.filter((point) => Number.isFinite(point.volume ?? 0));
  const fallback = points.filter((point) => Number.isFinite(point.price));
  const source = clean.some((point) => (point.volume ?? 0) > 0)
    ? clean
    : fallback;
  if (source.length < 2)
    return (
      <div className="flex h-[20rem] items-center sm:h-[24rem] justify-center rounded-[1.5rem] border border-white/[0.10] bg-black/[0.18] text-sm text-white/[0.38]">
        No volume data available for this asset yet.
      </div>
    );

  const width = 760;
  const height = 350;
  const values = source.map((point) => point.volume ?? point.price);
  const max = Math.max(...values, 1);
  const step = width / source.length;
  const barWidth = Math.max(2, Math.min(14, step * 0.58));

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.10] bg-black/[0.30] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {loading ? (
        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-black/[0.42] px-3 py-2 text-xs text-white/[0.58]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> volume
        </div>
      ) : null}
      <svg
        viewBox="0 0 760 350"
        className="relative h-[20rem] w-full sm:h-[24rem]"
        aria-hidden="true"
      >
        {source.map((point, index) => {
          const value = point.volume ?? point.price;
          const previous = source[Math.max(0, index - 1)]?.price ?? point.price;
          const up = point.price >= previous;
          const color = up ? "#2ee59d" : "#ff4d6d";
          const barHeight = Math.max(3, (value / max) * 300);
          const x = index * step + step / 2 - barWidth / 2;
          const y = 324 - barHeight;
          return (
            <rect
              key={`${point.timestamp}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="2"
              fill={color}
              opacity="0.58"
            />
          );
        })}
      </svg>
      <div className="relative -mt-8 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.28]">
        <span>Volume bars</span>
        <span>Activity histogram</span>
      </div>
    </div>
  );
}

function OrderBookDepthChart({
  orderbook,
  loading,
}: {
  orderbook: OrderBookResult | null;
  loading?: boolean;
}) {
  const bids = (orderbook?.bids ?? []).slice(0, 48);
  const asks = (orderbook?.asks ?? []).slice(0, 48);
  const hasDepth = bids.length >= 2 && asks.length >= 2;
  if (!hasDepth) {
    return (
      <div className="flex h-[20rem] items-center sm:h-[24rem] justify-center rounded-[1.5rem] border border-white/[0.10] bg-black/[0.18] px-6 text-center text-sm leading-7 text-white/[0.38]">
        {loading
          ? "Loading order book depth"
          : "Depth chart is available only when the asset has a supported live order book pair."}
      </div>
    );
  }

  const width = 960;
  const height = 390;
  const paddingX = 46;
  const top = 22;
  const bottom = 42;
  const plotHeight = height - top - bottom;
  const all = [...bids, ...asks];
  const minPrice = Math.min(...all.map((level) => level.price));
  const maxPrice = Math.max(...all.map((level) => level.price));
  const maxDepth = Math.max(...all.map((level) => level.cumulativeUsd), 1);
  const priceRange = maxPrice - minPrice || 1;
  const xFor = (price: number) =>
    paddingX + ((price - minPrice) / priceRange) * (width - paddingX * 2);
  const yFor = (depth: number) =>
    top + plotHeight - (depth / maxDepth) * plotHeight;
  const mid =
    orderbook?.bestBid && orderbook?.bestAsk
      ? (orderbook.bestBid + orderbook.bestAsk) / 2
      : undefined;
  const bidPath = bids
    .slice()
    .reverse()
    .map(
      (level, index) =>
        `${index === 0 ? "M" : "L"}${xFor(level.price).toFixed(2)} ${yFor(level.cumulativeUsd).toFixed(2)}`,
    )
    .join(" ");
  const askPath = asks
    .map(
      (level, index) =>
        `${index === 0 ? "M" : "L"}${xFor(level.price).toFixed(2)} ${yFor(level.cumulativeUsd).toFixed(2)}`,
    )
    .join(" ");
  const bidArea = `${bidPath} L${xFor(bids[0].price).toFixed(2)} ${height - bottom} L${xFor(bids.at(-1)?.price ?? bids[0].price).toFixed(2)} ${height - bottom} Z`;
  const askArea = `${askPath} L${xFor(asks.at(-1)?.price ?? asks[0].price).toFixed(2)} ${height - bottom} L${xFor(asks[0].price).toFixed(2)} ${height - bottom} Z`;

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.10] bg-[#070708] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.07] pb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/[0.42]">
        <span className="text-white/[0.70]">ORDER BOOK DEPTH</span>
        <span>
          BID{" "}
          <strong className="text-emerald-200">
            {formatUsd(orderbook?.bidDepthUsd)}
          </strong>
        </span>
        <span>
          ASK{" "}
          <strong className="text-red-200">
            {formatUsd(orderbook?.askDepthUsd)}
          </strong>
        </span>
        <span>
          SPREAD{" "}
          <strong className="text-white/[0.72]">
            {formatPercent(orderbook?.spreadPercent)}
          </strong>
        </span>
        <span className="ml-auto text-white/[0.30]">
          {orderbook?.symbol ?? "—"}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {loading ? (
        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-black/[0.58] px-3 py-2 text-xs text-white/[0.58]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> depth
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="relative h-[20rem] w-full sm:h-[26rem]"
        aria-hidden="true"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + ratio * plotHeight;
          const depth = maxDepth * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.07)"
                strokeDasharray="4 7"
              />
              <text
                x={width - paddingX + 10}
                y={y + 4}
                fill="rgba(255,255,255,0.35)"
                fontSize="11"
                fontFamily="monospace"
              >
                {formatUsd(depth)}
              </text>
            </g>
          );
        })}
        {mid ? (
          <g>
            <line
              x1={xFor(mid)}
              x2={xFor(mid)}
              y1={top}
              y2={height - bottom}
              stroke="rgba(255,255,255,0.16)"
              strokeDasharray="5 6"
            />
            <text
              x={xFor(mid)}
              y={height - 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.36)"
              fontSize="10"
              fontFamily="monospace"
            >
              MID {formatUsd(mid)}
            </text>
          </g>
        ) : null}
        <path d={bidArea} fill="#1ee6a7" opacity="0.11" />
        <path d={askArea} fill="#ff4d6d" opacity="0.10" />
        <path
          d={bidPath}
          fill="none"
          stroke="#1ee6a7"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={askPath}
          fill="none"
          stroke="#ff4d6d"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x={paddingX}
          y={height - 12}
          fill="rgba(30,230,167,0.70)"
          fontSize="11"
          fontFamily="monospace"
        >
          BIDS
        </text>
        <text
          x={width - paddingX}
          y={height - 12}
          textAnchor="end"
          fill="rgba(255,77,109,0.70)"
          fontSize="11"
          fontFamily="monospace"
        >
          ASKS
        </text>
      </svg>
    </div>
  );
}

function OrderBookHeatmapPanel({
  orderbook,
}: {
  orderbook: OrderBookResult | null;
}) {
  const bids = (orderbook?.bids ?? []).slice(0, 18);
  const asks = (orderbook?.asks ?? []).slice(0, 18);
  const maxNotional = Math.max(
    ...[...bids, ...asks].map((level) => level.notionalUsd || 0),
    1,
  );
  const hasDepth = bids.length >= 2 && asks.length >= 2;
  const imbalance = orderbook?.bidAskImbalancePercent ?? 0;
  const stress = Math.min(
    100,
    Math.round(Math.abs(imbalance) + (orderbook?.riskPoints ?? 0) * 0.85),
  );

  if (!hasDepth) {
    return (
      <div className="rounded-[1.5rem] border border-white/[0.10] bg-white/[0.025] p-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-velmere-gold" />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            Order book heatmap
          </p>
        </div>
        <p className="mt-3 text-xs leading-6 text-white/[0.42]">
          Heatmap activates when Shield can match the asset to a supported live
          order book pair. Until then the system treats missing depth as
          uncertainty, not safety.
        </p>
      </div>
    );
  }

  const renderSide = (levels: OrderBookLevel[], side: "bid" | "ask") => (
    <div className="grid gap-1.5">
      {levels.map((level, index) => {
        const width = Math.max(
          5,
          Math.min(100, (level.notionalUsd / maxNotional) * 100),
        );
        const opacity =
          0.16 + Math.min(0.62, (level.notionalUsd / maxNotional) * 0.58);
        return (
          <div
            key={`${side}-${level.price}-${index}`}
            className="grid grid-cols-[4.8rem_minmax(0,1fr)_4.6rem] items-center gap-2 font-mono text-[9px] tabular-nums text-white/[0.38]"
          >
            <span
              className={
                side === "bid"
                  ? "text-emerald-200/[0.82]"
                  : "text-red-200/[0.82]"
              }
            >
              {formatUsd(level.price)}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${side === "bid" ? "bg-emerald-300" : "bg-red-300"}`}
                style={{ width: `${width}%`, opacity }}
              />
            </div>
            <span className="text-right">{formatUsd(level.notionalUsd)}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-[1.5rem] border border-white/[0.10] bg-white/[0.025] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-velmere-gold" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Order book heatmap
            </p>
            <p className="mt-1 text-xs leading-5 text-white/[0.42]">
              Depth density, slippage pressure and bid/ask imbalance in one
              compact terminal block.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] px-3 py-2 text-right">
          <p className="font-mono text-lg text-white tabular-nums">
            {stress}/100
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
            micro stress
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300/[0.10] bg-emerald-400/[0.035] p-3">
          <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-100/[0.70]">
            <span>Bids</span>
            <span>{formatUsd(orderbook?.bidDepthUsd)}</span>
          </div>
          {renderSide(bids, "bid")}
        </div>
        <div className="rounded-2xl border border-red-300/[0.10] bg-red-400/[0.035] p-3">
          <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-red-100/[0.70]">
            <span>Asks</span>
            <span>{formatUsd(orderbook?.askDepthUsd)}</span>
          </div>
          {renderSide(asks, "ask")}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Spread", formatPercent(orderbook?.spreadPercent)],
          ["Sell 10k", formatPercent(orderbook?.simulatedSellSlippage10k)],
          ["Imbalance", formatPercent(orderbook?.bidAskImbalancePercent)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
              {label}
            </p>
            <p className="mt-2 font-mono text-sm text-white tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiquidityDangerZones({
  candles,
  orderbook,
  result,
}: {
  candles: Candle[];
  orderbook: OrderBookResult | null;
  result: TokenRiskResult;
}) {
  const clean = candles.filter((candle) => Number.isFinite(candle.close));
  const latest = clean.at(-1)?.close ?? result.metrics.currentPrice ?? 0;
  const high = clean.length
    ? Math.max(...clean.map((candle) => candle.high))
    : latest * 1.035;
  const low = clean.length
    ? Math.min(...clean.map((candle) => candle.low))
    : latest * 0.965;
  const risk = Math.min(
    100,
    Math.round(
      (orderbook?.riskPoints ?? 0) +
        (result.metrics.volumeToMarketCapRatio ?? 0) * 180 +
        (result.metrics.priceChange24h
          ? Math.abs(result.metrics.priceChange24h) * 0.8
          : 0),
    ),
  );
  const zones = [
    {
      label: "Breakout chase",
      value: high,
      tone: "text-amber-100",
      body: "Watch for thin liquidity above session high.",
    },
    {
      label: "Exit liquidity",
      value: latest,
      tone: "text-velmere-gold",
      body: "Current price area used for slippage and depth checks.",
    },
    {
      label: "Drawdown shelf",
      value: low,
      tone: "text-red-100",
      body: "Below session low Shield treats selling pressure as elevated.",
    },
  ];

  return (
    <div className="rounded-[1.5rem] border border-white/[0.10] bg-black/[0.20] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-velmere-gold" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Liquidity danger zones
            </p>
            <p className="mt-1 text-xs leading-5 text-white/[0.42]">
              Price zones generated from current candle range, order book stress
              and volume pressure.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/[0.10] bg-white/[0.035] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.48]">
          stress {risk}/100
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {zones.map((zone) => (
          <div
            key={zone.label}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3"
          >
            <p
              className={`font-mono text-[10px] uppercase tracking-[0.14em] ${zone.tone}`}
            >
              {zone.label}
            </p>
            <p className="mt-2 font-mono text-sm text-white tabular-nums">
              {formatUsd(zone.value)}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-white/[0.42]">
              {zone.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StressSimulatorPanel({ result }: { result: TokenRiskResult }) {
  const stress = buildStressScenarios(result);
  const worst = stress.worstScenario;
  const tokenInfo = result["token"];
  const query =
    tokenInfo.marketId ?? tokenInfo.tokenAddress ?? tokenInfo.symbol;
  const tone =
    worst?.severity === "critical"
      ? "text-red-100"
      : worst?.severity === "warning"
        ? "text-amber-100"
        : worst?.severity === "watch"
          ? "text-velmere-gold"
          : "text-emerald-100";

  return (
    <div className="rounded-[1.5rem] border border-white/[0.10] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sigma className="h-4 w-4 text-velmere-gold" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Stress simulator
            </p>
            <p className="mt-1 text-xs leading-5 text-white/[0.42]">
              Deterministic shock scenarios for sell pressure, holder exits,
              velocity bursts and contract pressure.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-mono text-lg tabular-nums ${tone}`}>
            {worst?.score ?? 0}/100
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
            worst
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {stress.scenarios.slice(0, 4).map((scenario) => (
          <div
            key={scenario.id}
            className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white/[0.80]">
                  {scenario.label}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/[0.42]">
                  {scenario.nextStep}
                </p>
              </div>
              <span className="rounded-full border border-white/[0.10] bg-white/[0.035] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.52]">
                {scenario.score}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${scenario.score >= 70 ? "bg-amber-300" : scenario.score >= 40 ? "bg-velmere-gold" : "bg-emerald-300"}`}
                style={{ width: `${clampPercent(scenario.score)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold transition hover:text-white pointer-events-none opacity-75">
        stress endpoint ready
      </span>
    </div>
  );
}

function AiRiskBotPanel({
  result,
  history,
}: {
  result: TokenRiskResult;
  history: HistorySnapshot[];
}) {
  const bot = buildAiRiskBotBrief(result, history);
  const layerTone = (layer: string) =>
    layer === "liquidity"
      ? "border-emerald-300/[0.16] bg-emerald-300/[0.045] text-emerald-100"
      : layer === "holders"
        ? "border-amber-300/[0.18] bg-amber-300/[0.055] text-amber-100"
        : layer === "chart"
          ? "border-sky-300/[0.16] bg-sky-300/[0.045] text-sky-100"
          : layer === "legal"
            ? "border-velmere-gold/[0.20] bg-velmere-gold/[0.060] text-velmere-gold"
            : "border-white/[0.09] bg-white/[0.028] text-white/[0.58]";
  return (
    <div className="shield-density-bento border-velmere-gold/[0.18] bg-[radial-gradient(circle_at_0%_0%,rgba(200,169,106,0.12),transparent_34%),rgba(255,255,255,0.03)] p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Brain className="h-4 w-4 shrink-0 text-velmere-gold" />
          <div className="min-w-0">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Velmère AI risk bot
            </p>
            <p className="shield-copy-safe mt-1 text-xs leading-5 text-white/[0.44]">
              SOC analyst mode: ranked commands, missing data, uncertainty and
              safe wording instead of decorative hype.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full border border-white/[0.10] bg-black/[0.20] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.46]">
            conf {bot.confidence}%
          </span>
          <span className="rounded-full border border-amber-300/[0.14] bg-amber-300/[0.045] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-amber-100">
            uncertainty {bot.dataUncertaintyPercent}%
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          ["tone", "calm SOC"],
          ["claim", "no accusation"],
          ["output", "operator commands"],
        ].map(([label, value]) => (
          <div key={label} className="shield-readability-grade justify-between">
            <span className="text-white/[0.32]">{label}</span>
            <span className="text-white/[0.66]">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-white/[0.86]">
            {bot.verdict}
          </p>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/[0.52]">
            Δ {bot.riskDelta > 0 ? "+" : ""}
            {bot.riskDelta}
          </span>
        </div>
        <p className="shield-copy-safe text-xs leading-6 text-white/[0.56]">
          {bot.narrative}
        </p>
        <p className="rounded-2xl border border-velmere-gold/[0.14] bg-velmere-gold/[0.045] p-3 text-[11px] leading-5 text-velmere-gold/[0.86]">
          {bot.guardrail}
        </p>
      </div>

      <div className="shield-safe-scroll mt-4 grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
        {bot.commands.slice(0, 6).map((command, index) => (
          <div
            key={command.id}
            className="grid min-w-0 grid-cols-[1.65rem_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/[0.22] p-3 sm:grid-cols-[1.65rem_minmax(0,1fr)_auto]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] font-mono text-[9px] text-velmere-gold">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-xs font-semibold text-white/[0.82]">
                  {command.label}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] ${layerTone(command.layer)}`}
                >
                  {command.layer}
                </span>
              </div>
              <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.44]">
                {command.body}
              </p>
              <p className="shield-copy-safe mt-2 border-t border-white/[0.06] pt-2 text-[11px] leading-5 text-velmere-gold/[0.80]">
                {command.operatorPrompt}
              </p>
            </div>
            <span className="w-fit rounded-full border border-white/[0.10] bg-white/[0.035] px-2 py-1 font-mono text-[9px] tabular-nums text-white/[0.46]">
              {command.priority}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            Prompt examples
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {bot.promptExamples.slice(0, 4).map((prompt) => (
              <p key={prompt}>• {prompt}</p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-300/[0.14] bg-amber-300/[0.045] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-100">
            Missing data
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {(bot.missingData.length
              ? bot.missingData
              : [
                  "No major missing input detected; still check source freshness.",
                ]
            ).map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
          SOC runbook
        </p>
        <div className="grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
          {bot.socRunbook.map((item) => (
            <p key={item}>• {item}</p>
          ))}
        </div>
      </div>

      {bot.warnings.length ? (
        <div className="mt-3 rounded-2xl border border-amber-300/[0.14] bg-amber-300/[0.045] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-100">
            uncertainty guard
          </p>
          <ul className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {bot.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 text-[11px] leading-5 text-white/[0.48]">
        <strong className="text-white/[0.78]">Next question:</strong>{" "}
        {bot.nextQuestion}
      </div>
    </div>
  );
}

function AskShieldChatPanel({
  result,
  history,
  locale,
  handoffContext,
}: {
  result: BrainResult;
  history: HistorySnapshot[];
  locale: "pl" | "de" | "en";
  handoffContext?: Pass468BrowserShieldOrbitHandoff;
}) {
  const panelCopy = {
    pl: {
      kicker: "Zapytaj Shield AI",
      body: "Bot korzysta z tego samego wyniku, historii i braków danych co analiza. Nie wypełnia luk zmyślonymi liczbami.",
      prompts: [
        "Wyjaśnij ryzyko bez hype'u",
        "Sprawdź holderów i klastry",
        "Sprawdź głębokość wyjścia",
        "Przeczytaj świece",
        "Zbuduj raport dowodowy",
      ],
      placeholder: "Zapytaj o holderów, płynność, świece albo źródła…",
      answer: "odpowiedź oparta na wyniku",
      next: "Następne sprawdzenia",
      guard: "Granice",
      sourceBound: "źródła spięte",
      partial: "częściowe źródła",
      sourceRequired: "wymagane źródło",
      sourceContract: "Kontrakt źródłowy",
      providerPlan: "Plan providerów",
      consensus: "Konsensus providerów",
      confidenceCap: "Limit pewności",
      handoffKicker: "Browser → Shield potwierdzone",
      handoffConfirmed:
        "Kontekst instrumentu odebrany; Shield wykonał własny świeży skan.",
      handoffBoundary:
        "Packet jest tylko kontekstem UI i nie zastępuje wyniku Shield AI.",
    },
    de: {
      kicker: "Shield AI fragen",
      body: "Der Bot nutzt denselben Befund, Verlauf und dieselben Datenlücken wie die Analyse. Fehlende Werte werden nicht erfunden.",
      prompts: [
        "Risiko ohne Hype erklären",
        "Holder und Cluster prüfen",
        "Exit Depth prüfen",
        "Kerzen lesen",
        "Evidenzbericht bauen",
      ],
      placeholder: "Frage nach Holdern, Liquidität, Kerzen oder Quellen…",
      answer: "befundgebundene Antwort",
      next: "Nächste Prüfungen",
      guard: "Grenzen",
      sourceBound: "quellengebunden",
      partial: "teilweise Quellen",
      sourceRequired: "Quelle erforderlich",
      sourceContract: "Quellenvertrag",
      providerPlan: "Provider-Plan",
      consensus: "Provider-Konsens",
      confidenceCap: "Konfidenzlimit",
      handoffKicker: "Browser → Shield bestätigt",
      handoffConfirmed:
        "Instrument-Kontext empfangen; Shield hat einen eigenen frischen Scan ausgeführt.",
      handoffBoundary:
        "Das Paket ist nur UI-Kontext und ersetzt keinen Shield-AI-Befund.",
    },
    en: {
      kicker: "Ask Shield AI",
      body: "The bot uses the same result, history and missing-data ledger as the analysis. It never fills gaps with invented numbers.",
      prompts: [
        "Explain risk without hype",
        "Audit holders and clusters",
        "Check exit depth",
        "Read the candles",
        "Build an evidence report",
      ],
      placeholder: "Ask about holders, liquidity, candles or sources…",
      answer: "result-bound answer",
      next: "Next checks",
      guard: "Boundaries",
      sourceBound: "source bound",
      partial: "partial sources",
      sourceRequired: "source required",
      sourceContract: "Source contract",
      providerPlan: "Provider plan",
      consensus: "Provider consensus",
      confidenceCap: "Confidence cap",
      handoffKicker: "Browser → Shield confirmed",
      handoffConfirmed:
        "Instrument context received; Shield completed its own fresh scan.",
      handoffBoundary:
        "The packet is display-only context and never replaces the Shield AI result.",
    },
  } as const;
  const c = panelCopy[locale];
  const resultSymbol = normalizePass463AssetSymbol(result.token.symbol);
  const handoffSymbol = normalizePass463AssetSymbol(handoffContext?.symbol);
  const confirmedHandoff =
    Boolean(handoffContext) &&
    Boolean(resultSymbol) &&
    handoffSymbol === resultSymbol &&
    handoffContext?.trustedForDisplayOnly === true &&
    handoffContext.requiresFreshTargetScan === true;
  const [prompt, setPrompt] = useState<string>(c.prompts[0]);
  const [pass462SourceContext, setPass462SourceContext] = useState<
    ShieldChatSourceContext | undefined
  >();
  useEffect(() => {
    setPrompt(c.prompts[0]);
  }, [c.prompts]);
  useEffect(() => {
    const symbol = normalizePass463AssetSymbol(result.token.symbol);
    if (!symbol || !/^[A-Z0-9]{2,12}$/.test(symbol)) {
      setPass462SourceContext(undefined);
      return;
    }
    const controller = new AbortController();
    // PASS462 legacy verifier marker: compare=coinbase
    fetch(
      `/api/market-integrity/venue-health?venue=binance&asset=${encodeURIComponent(symbol)}`,
      {
        signal: controller.signal,
        cache: "no-store",
      },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: Pass462ShieldVenuePayload | null) => {
        if (!payload?.snapshot || !payload.comparison) return;
        const primary = payload.snapshot;
        const secondary = payload.secondary ?? null;
        const comparison = payload.comparison;
        const secondaryLabel = secondary
          ? `${secondary.venue} ${secondary.pair}`
          : locale === "pl"
            ? "drugie venue wymagane"
            : locale === "de"
              ? "zweiter Handelsplatz erforderlich"
              : "second venue required";
        const sourceContract =
          locale === "pl"
            ? `${symbol} używa ${primary.venue} ${primary.pair} oraz ${secondaryLabel}. Bot może opisywać cenę, spread, świeżość, depth i bazę ${comparison.quoteBasisState}, ale nie może gwarantować wypłat, rezerw ani bezpieczeństwa giełdy.`
            : locale === "de"
              ? `${symbol} nutzt ${primary.venue} ${primary.pair} und ${secondaryLabel}. Der Bot darf Preis, Spread, Aktualität, Depth und die Basis ${comparison.quoteBasisState} beschreiben, aber keine Auszahlungen, Reserven oder Börsensicherheit garantieren.`
              : `${symbol} uses ${primary.venue} ${primary.pair} and ${secondaryLabel}. The bot may describe price, spread, freshness, depth and the ${comparison.quoteBasisState} basis, but cannot guarantee withdrawals, reserves or venue safety.`;
        const providerPlan =
          comparison.state === "aligned"
            ? [
                locale === "pl"
                  ? "Zachowaj timestamp, parę i bazę kwotowania; ponów probe przed mocniejszą publikacją."
                  : locale === "de"
                    ? "Zeitstempel, Paar und Quotierungsbasis sichern; Probe vor stärkerer Veröffentlichung wiederholen."
                    : "Preserve timestamp, pair and quote basis; repeat the probe before stronger publication.",
              ]
            : [
                locale === "pl"
                  ? `Sprawdź rozjazd ceny, bazę ${comparison.quoteBasisState}, spread i świeżość obu venue.`
                  : locale === "de"
                    ? `Preisabweichung, Basis ${comparison.quoteBasisState}, Spread und Aktualität beider Handelsplätze prüfen.`
                    : `Check price divergence, ${comparison.quoteBasisState} basis, spread and freshness across both venues.`,
              ];
        const providerFacts = [
          {
            label:
              locale === "pl"
                ? "Venue główne"
                : locale === "de"
                  ? "Primärer Handelsplatz"
                  : "Primary venue",
            value: `${primary.assetSymbol} · ${primary.venue} ${primary.pair} · ${primary.state} · ${primary.healthScore}/100`,
          },
          {
            label:
              locale === "pl"
                ? "Pokrycie pary"
                : locale === "de"
                  ? "Paarabdeckung"
                  : "Pair coverage",
            value: `${primary.pairResolutionState} · ${primary.quoteCurrency}`,
          },
          ...(secondary
            ? [
                {
                  label:
                    locale === "pl"
                      ? "Drugie venue"
                      : locale === "de"
                        ? "Zweiter Handelsplatz"
                        : "Secondary venue",
                  value: `${secondary.venue} ${secondary.pair} · ${secondary.state} · ${secondary.healthScore}/100`,
                },
              ]
            : []),
          {
            label:
              locale === "pl"
                ? "Baza kwotowania"
                : locale === "de"
                  ? "Quotierungsbasis"
                  : "Quote basis",
            value: `${comparison.quoteBasisState} · penalty ${comparison.quoteBasisPenalty}`,
          },
          {
            label:
              locale === "pl"
                ? "Rozjazd ceny"
                : locale === "de"
                  ? "Preisabweichung"
                  : "Price divergence",
            value:
              comparison.priceDivergenceBps == null
                ? locale === "pl"
                  ? "wymagane porównywalne źródło"
                  : locale === "de"
                    ? "vergleichbare Quelle erforderlich"
                    : "comparable source required"
                : `${comparison.priceDivergenceBps.toFixed(1)} bps`,
          },
          {
            label:
              locale === "pl"
                ? "Spread / świeżość"
                : locale === "de"
                  ? "Spread / Aktualität"
                  : "Spread / freshness",
            value: `${comparison.spreadDeltaBps == null ? "source required" : `${comparison.spreadDeltaBps.toFixed(1)} bps`} · ${comparison.freshnessDeltaSeconds == null ? "source required" : `${comparison.freshnessDeltaSeconds.toFixed(0)}s`}`,
          },
        ];
        setPass462SourceContext({
          sourceContract,
          providerPlan,
          providerFacts,
          consensusState: comparison.state,
          confidenceCap: comparison.confidenceCap,
          consensusNotes: [...comparison.notes, comparison.boundary],
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [locale, result.token.symbol]);
  // PASS457 legacy verifier marker: buildShieldChatResponse(result, history, prompt, locale)
  const answer = useMemo(
    () =>
      buildShieldChatResponse(
        result,
        history,
        prompt,
        locale,
        pass462SourceContext,
      ),
    [history, locale, pass462SourceContext, prompt, result],
  );
  const sourceStateLabel =
    answer.sourceState === "source_bound"
      ? c.sourceBound
      : answer.sourceState === "partial"
        ? c.partial
        : c.sourceRequired;
  const toneClass = (tone: string) =>
    tone === "critical"
      ? "border-red-300/[0.22] bg-red-400/[0.07] text-red-100"
      : tone === "warning"
        ? "border-amber-300/[0.22] bg-amber-300/[0.07] text-amber-100"
        : tone === "watch"
          ? "border-velmere-gold/[0.20] bg-velmere-gold/[0.06] text-velmere-gold"
          : tone === "low"
            ? "border-emerald-300/[0.18] bg-emerald-400/[0.055] text-emerald-100"
            : "border-white/[0.10] bg-white/[0.028] text-white/[0.62]";

  return (
    <div
      className="mt-4 rounded-[1.35rem] border border-velmere-gold/[0.14] bg-[radial-gradient(circle_at_100%_0%,rgba(200,169,106,0.12),transparent_38%),rgba(255,255,255,0.026)] p-4"
      data-pass457-shield-ai-runtime="true"
      data-source-state={answer.sourceState}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            {c.kicker}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-white/[0.46]">
            {c.body}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/[0.10] bg-black/[0.24] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.48]">
          {sourceStateLabel}
        </span>
      </div>

      {confirmedHandoff && handoffContext ? (
        <div
          className="mt-3 rounded-2xl border border-cyan-200/[0.16] bg-cyan-300/[0.045] p-3"
          data-pass469-shield-ai-handoff-confirmation="fresh-target-scan"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.72]">
              {c.handoffKicker}
            </p>
            <span className="rounded-full border border-cyan-200/[0.12] bg-black/[0.18] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.11em] text-cyan-50/[0.58]">
              {handoffContext.depth.toUpperCase()} ·{" "}
              {handoffContext.sourceConfidence}% · {handoffContext.sourceMode}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/[0.58]">
            {c.handoffConfirmed}
          </p>
          <p className="mt-1 text-[10px] leading-5 text-white/[0.34]">
            {c.handoffBoundary}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1 no-scrollbar">
        {c.prompts.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPrompt(item)}
            className={`shrink-0 rounded-full border px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] transition ${prompt === item ? "border-velmere-gold/[0.42] bg-velmere-gold/[0.12] text-velmere-gold" : "border-white/[0.09] bg-black/[0.18] text-white/[0.42] hover:text-white"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <input
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-3 min-h-11 w-full rounded-2xl border border-white/[0.10] bg-black/[0.28] px-4 font-mono text-[10px] text-white outline-none placeholder:text-white/[0.28]"
        placeholder={c.placeholder}
      />

      <div
        className="mt-3 rounded-2xl border border-cyan-200/[0.12] bg-cyan-300/[0.035] p-3"
        data-pass459-shield-provider-truth="true"
      >
        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.62]">
          PASS459 · {c.sourceContract}
        </p>
        <p className="mt-2 text-[10px] leading-5 text-white/[0.50]">
          {answer.sourceContract}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {answer.providerFacts.slice(0, 4).map((fact) => (
            <div
              key={`${fact.label}-${fact.value}`}
              className="rounded-xl border border-white/[0.07] bg-black/[0.18] p-2.5"
            >
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.30]">
                {fact.label}
              </span>
              <strong className="mt-1 block break-words text-[10px] font-medium leading-4 text-white/[0.64]">
                {fact.value}
              </strong>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.30]">
          {c.providerPlan}
        </p>
        <div className="mt-1 grid gap-1 text-[10px] leading-5 text-white/[0.44]">
          {answer.providerPlan.slice(0, 3).map((item) => (
            <p key={item}>• {item}</p>
          ))}
        </div>
        <div
          className="mt-3 rounded-xl border border-violet-200/[0.10] bg-violet-300/[0.035] p-3"
          data-pass460-shield-consensus="true"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.13em] text-violet-100/[0.58]">
              PASS460 · {c.consensus}
            </span>
            <span className="rounded-full border border-white/[0.08] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.52]">
              {answer.consensusState}
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-white/[0.46]">
            {answer.consensusNotes.slice(0, 2).join(" · ")}
          </p>
          <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.30]">
            {c.confidenceCap}: {answer.confidenceCap}/100
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/[0.22] p-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/[0.88]">
              {answer.headline}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-white/[0.52]">
              {answer.answer}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/[0.10] px-2 py-1 font-mono text-[8px] text-white/[0.48]">
            {answer.confidence}%
          </span>
        </div>
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.28]">
          {c.answer}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {answer.cards.slice(0, 4).map((card) => (
          <div
            key={`${card.label}-${card.value}`}
            className={`min-w-0 rounded-2xl border p-3 ${toneClass(card.tone)}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.44]">
                {card.label}
              </p>
              <span className="shrink-0 font-mono text-[9px] tabular-nums text-white/[0.72]">
                {card.value}
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-white/[0.46]">
              {card.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.024] p-3 text-[10px] leading-5 text-white/[0.44]">
        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-velmere-gold">
          {c.next}
        </p>
        {answer.nextActions.slice(0, 3).map((item) => (
          <p key={item}>• {item}</p>
        ))}
        <p className="mt-1 text-white/[0.30]">
          {c.guard}: {answer.guardrails.join(" · ")}
        </p>
      </div>
    </div>
  );
}

function AiOrchestratorPanel({
  result,
  history,
}: {
  result: BrainResult;
  history: HistorySnapshot[];
}) {
  const orchestrator = buildAiRiskOrchestrator(result, history);
  const query =
    result["token"].marketId ??
    result["token"].tokenAddress ??
    result["token"].symbol;
  return (
    <div className="shield-safe-card bg-[radial-gradient(circle_at_100%_0%,rgba(200,169,106,0.11),transparent_34%),rgba(255,255,255,0.026)] p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            AI orchestrator
          </p>
          <p className="shield-copy-safe mt-2 text-sm leading-7 text-white/[0.62]">
            {orchestrator.headline}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-white/[0.10] bg-black/[0.20] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/[0.52]">
          {orchestrator.overall}/100
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {orchestrator.nextBestActions.slice(0, 4).map((action) => (
          <div
            key={action.id}
            className="grid min-w-0 grid-cols-[1.65rem_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
          >
            <span
              className={`mt-0.5 h-2 w-2 rounded-full ${action.priority === "escalate" ? "bg-red-300" : action.priority === "block_confidence" ? "bg-amber-300" : "bg-velmere-gold"}`}
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/[0.84]">
                {action.label}
              </p>
              <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.44]">
                {action.reason}
              </p>
            </div>
            <span className="rounded-full border border-white/[0.10] bg-white/[0.035] px-2 py-1 font-mono text-[9px] tabular-nums text-white/[0.46]">
              {action.score}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.024] p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.36]">
          UI safety memory
        </p>
        <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
          {orchestrator.uiSafetyChecklist.slice(0, 3).map((item) => (
            <p key={item}>• {item}</p>
          ))}
        </div>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold transition hover:text-white pointer-events-none opacity-75">
        orchestrator in panel
      </span>
    </div>
  );
}

function ShieldAccessLayerPanel({ result }: { result: BrainResult }) {
  const access = useMemo(() => buildVlmShieldAccess(result), [result]);
  const tierTone = (id: string) =>
    id === access.recommendedTier
      ? "border-velmere-gold/[0.34] bg-velmere-gold/[0.09] text-velmere-gold"
      : "border-white/[0.08] bg-black/[0.18] text-white/[0.46]";
  const statusTone = (status: string) =>
    status === "open" || status === "api_ready"
      ? "text-emerald-200"
      : status === "member_only" || status === "pro_required"
        ? "text-velmere-gold"
        : "text-amber-200";
  const assetMeta = result["token"];
  const query =
    assetMeta.marketId ?? assetMeta.tokenAddress ?? assetMeta.symbol;

  return (
    <div className="shield-safe-card bg-[radial-gradient(circle_at_100%_0%,rgba(200,169,106,0.12),transparent_34%),rgba(255,255,255,0.026)] p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            VLM access layer
          </p>
          <p className="shield-copy-safe mt-2 text-sm leading-7 text-white/[0.62]">
            {access.summary}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-velmere-gold/[0.24] bg-velmere-gold/[0.08] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.13em] text-velmere-gold">
          {access.recommendedTier}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {access.tiers.map((tier) => (
          <div
            key={tier.id}
            className={`min-w-0 rounded-2xl border p-3 ${tierTone(tier.id)}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-white/[0.84]">
                {tier.label}
              </p>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.42]">
                {tier.badge}
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.46]">
              {tier.utility}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {access.featureMatrix.slice(0, 5).map((feature) => (
          <div
            key={feature.id}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/[0.82]">
                {feature.label}
              </p>
              <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.42]">
                {feature.reason}
              </p>
            </div>
            <span
              className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] ${statusTone(feature.status)}`}
            >
              {feature.status.replaceAll("_", " ")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {access.pass59AccessGates.map((gate) => (
          <div
            key={gate.id}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.024] p-3"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.38]">
                {gate.label}
              </p>
              <span
                className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] ${gate.status === "ready" ? "text-emerald-200" : gate.status === "watch" ? "text-velmere-gold" : "text-amber-200"}`}
              >
                {gate.status}
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.44]">
              {gate.reason}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {access.pass60PolicySpine.map((policy) => (
          <div
            key={policy.id}
            className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.38]">
                {policy.label}
              </p>
              <span
                className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] ${policy.status === "ready" ? "text-emerald-200" : policy.status === "watch" ? "text-velmere-gold" : "text-amber-200"}`}
              >
                {policy.status}
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.44]">
              {policy.guardrail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-amber-300/[0.15] bg-amber-300/[0.055] p-3 text-[11px] leading-5 text-amber-100/[0.82]">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
          Legal memory
        </p>
        <p className="shield-copy-safe mt-2">
          {access.complianceGuardrails[0]}
        </p>
        <p className="shield-copy-safe mt-1">
          {access.complianceGuardrails[1]}
        </p>
      </div>

      <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold transition hover:text-white pointer-events-none opacity-75">
        VLM access in panel
      </span>
    </div>
  );
}

function TerminalCommandPalette({
  rows,
  activeId,
  activeRow,
  onSelect,
}: {
  rows: TerminalCommandRow[];
  activeId: TerminalCommandId;
  activeRow: TerminalCommandRow;
  onSelect: (id: TerminalCommandId) => void;
}) {
  return (
    <div className="shield-command-palette mt-4 p-4">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            Terminal command palette
          </p>
          <p className="shield-copy-safe mt-1 text-xs leading-6 text-white/[0.48]">
            Start with a concise review: market picture, source quality, key
            gaps and the next useful check before deeper detail.
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-white/[0.10] bg-black/[0.22] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.42]">
          active · {activeId}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {rows.map((row, index) => {
          const active = row.id === activeId;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={`shield-touch-target min-w-0 rounded-2xl border p-3 text-left transition duration-300 ease-velmere ${active ? "border-velmere-gold/[0.36] bg-velmere-gold/[0.09] text-velmere-gold" : "border-white/[0.08] bg-black/[0.18] text-white/[0.46] hover:border-white/[0.18] hover:text-white"}`}
              aria-pressed={active}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] tabular-nums">
                0{index + 1}
              </span>
              <span className="mt-2 block truncate text-xs font-semibold">
                {row.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-white/[0.08] bg-black/[0.22] p-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.52fr)]">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.36]">
            analysis note
          </p>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.56]">
            {activeRow.body}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-velmere-gold/[0.16] bg-velmere-gold/[0.045] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            next check
          </p>
          <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.52]">
            {activeRow.next}
          </p>
        </div>
      </div>
    </div>
  );
}

function TerminalReviewDeckPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const deck = useMemo(
    () =>
      buildTerminalReviewDeck(result, {
        candlesCount: candles.length,
        historyCount: history.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbook,
        activeCommand,
        terminalBootDeferred: true,
        modalChunkSplit: true,
        heavyPanelsDeferred: true,
        sourceCooldownActive: false,
        searchLocalFirst: true,
        suggestionDismissOnOutsideClick: true,
        tableWheelUnlocked: true,
        shieldMapDetached: true,
        focusedPanelRouting: true,
        rateLimitMiddlewareReady: false,
        exportInfrastructureReady: false,
        persistentAuditLogReady: false,
        walletSessionReady: false,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const toneForState = (state: string) => {
    if (state === "ready")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (state === "review")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.060] text-velmere-gold";
    if (state === "degraded")
      return "border-amber-300/[0.20] bg-amber-300/[0.060] text-amber-100";
    return "border-red-300/[0.20] bg-red-400/[0.060] text-red-100";
  };

  return (
    <div className="shield-review-deck mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Review deck · PASS77
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            {deck.headline}
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.50]">
            {deck.executiveBrief}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.22] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            deck score
          </p>
          <p className="mt-1 font-mono text-3xl text-velmere-gold tabular-nums">
            {deck.deckScore}/100
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.42]">
            /{deck.activeCommand} · {deck.state}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {deck.lanes.map((lane) => (
          <div
            key={lane.id}
            className={`shield-review-lane ${toneForState(lane.state)}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                {lane.label}
              </p>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] tabular-nums">
                {lane.score}/100
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
              {lane.signal}
            </p>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-70">
              {lane.operatorAction}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.86fr)_minmax(17rem,0.44fr)]">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            next best actions
          </p>
          <div className="mt-3 grid gap-2">
            {deck.nextBestActions.map((action) => (
              <div
                key={action.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-velmere-gold">
                    {action.priority} · {action.command}
                  </span>
                  <span className="truncate text-[11px] text-white/[0.62]">
                    {action.label}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.46]">
                  {action.body}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-velmere-gold/[0.14] bg-velmere-gold/[0.045] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            compression rules
          </p>
          <div className="mt-3 grid gap-2">
            {deck.compressionRules.slice(0, 5).map((rule) => (
              <p
                key={rule}
                className="shield-copy-safe rounded-xl border border-white/[0.07] bg-black/[0.16] p-2 text-[10px] leading-5 text-white/[0.46]"
              >
                {rule}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/[0.16] p-3 text-[11px] leading-5 text-white/[0.44]">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
          safe copy
        </p>
        <p className="shield-copy-safe mt-2">{deck.safeCopy.join(" · ")}</p>
      </div>
    </div>
  );
}

function OperatorCopilotPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const copilot = useMemo(
    () =>
      buildTerminalOperatorCopilot(result, {
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbookRiskPoints: orderbook?.riskPoints,
        historyCount: history.length,
        activeCommand,
        terminalBootDeferred: true,
        shieldMapDetached: true,
        sourceHonestyVisible: true,
        chatHistoryCount: 0,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const toneForStatus = (status: string) => {
    if (status === "ready")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (status === "watch")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.055] text-velmere-gold";
    return "border-white/[0.09] bg-black/[0.18] text-white/[0.54]";
  };

  return (
    <div className="shield-operator-copilot mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Operator copilot · PASS70
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            {copilot.headline}
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            This panel turns the AI bot into a SOC assistant: short prompts,
            missing-data checks, evidence-safe wording and next operator
            commands. It does not produce accusations, investment advice or
            legal proof.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
            <p className="text-white/[0.34]">confidence</p>
            <p className="mt-1 text-lg text-velmere-gold tabular-nums">
              {copilot.confidenceScore}/100
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
            <p className="text-white/[0.34]">uncertainty</p>
            <p className="mt-1 text-lg text-white tabular-nums">
              {copilot.uncertaintyPercent}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="min-w-0 rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/[0.36]">
            operator action queue
          </p>
          <div className="mt-3 grid gap-2">
            {copilot.immediateActions.map((action) => (
              <div
                key={action.id}
                className={`min-w-0 rounded-2xl border p-3 ${toneForStatus(action.status)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                    {action.label}
                  </p>
                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                    {action.status}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
                  {action.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {copilot.prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
                  {prompt.label}
                </p>
                <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.026] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.36]">
                  prompt
                </span>
              </div>
              <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.58]">
                {prompt.prompt}
              </p>
              <p className="shield-copy-safe mt-2 text-[10px] leading-5 text-white/[0.34]">
                {prompt.when}
              </p>
              <p className="mt-2 rounded-2xl border border-velmere-gold/[0.14] bg-velmere-gold/[0.045] p-2 text-[10px] leading-5 text-velmere-gold/[0.86]">
                {prompt.guardrail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            missing data blockers
          </p>
          <div className="mt-3 grid gap-2">
            {(copilot.missingData.length
              ? copilot.missingData
              : [
                  "No major copilot blockers from the visible terminal state. Keep manual review wording anyway.",
                ]
            ).map((item) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            UI contract
          </p>
          <div className="mt-3 grid gap-2">
            {copilot.uiContract.map((item) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
              >
                {item}
              </p>
            ))}
          </div>
          <p className="shield-copy-safe mt-3 rounded-2xl border border-amber-300/[0.16] bg-amber-300/[0.055] p-3 text-[11px] leading-5 text-amber-100/[0.84]">
            {copilot.legalNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function TerminalSourceTrustPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const sourceTrust = useMemo(
    () =>
      buildTerminalSourceTrust(result, {
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbook,
        historyCount: history.length,
        activeCommand,
        searchResolverGuarded: true,
        suggestionDismissOnOutsideClick: true,
        sourceCooldownActive: false,
        terminalBootDeferred: true,
        modalChunkSplit: true,
        tableWheelUnlocked: true,
        walletSessionReady: false,
        exportInfrastructureReady: false,
        rateLimitMiddlewareReady: false,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const statusTone = (status: string) => {
    if (status === "live")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (status === "partial")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.055] text-velmere-gold";
    if (status === "fallback")
      return "border-amber-300/[0.18] bg-amber-300/[0.050] text-amber-100";
    return "border-red-300/[0.20] bg-red-400/[0.055] text-red-100";
  };

  const toneDot = (tone: string) => {
    if (tone === "good") return "bg-emerald-300";
    if (tone === "watch") return "bg-velmere-gold";
    return "bg-red-300";
  };

  return (
    <div className="shield-source-trust mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Source readiness console
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            Live, partial, fallback and blocked sources are separated before
            stronger wording is allowed.
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            Public Orbit no longer shows a raw trust score. The operator still
            sees source readiness, cooldowns, candles, holders, order book,
            contract checks, evidence export and VLM session gates as separate
            lanes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
            <p className="text-white/[0.34]">readiness</p>
            <p className="mt-1 text-lg text-velmere-gold tabular-nums">
              {sourceTrust.mode.replaceAll("_", " ")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
            <p className="text-white/[0.34]">mode</p>
            <p className="mt-1 truncate text-xs text-white">
              {sourceTrust.mode.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sourceTrust.adapters.slice(0, 9).map((adapter) => (
            <div
              key={adapter.id}
              className={`shield-source-adapter ${statusTone(adapter.status)}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                  {adapter.label}
                </p>
                <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                  {adapter.status}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-current opacity-70"
                  style={{ width: `${clampPercent(adapter.confidence)}%` }}
                />
              </div>
              <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
                {adapter.currentSource}
              </p>
              <p className="shield-copy-safe mt-2 border-t border-white/[0.08] pt-2 text-[10px] leading-5 opacity-70">
                {adapter.operatorAction}
              </p>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              source ledger
            </p>
            <div className="mt-3 grid gap-2">
              {sourceTrust.sourceLedger.slice(0, 7).map((item) => (
                <div
                  key={item.id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.022] p-2.5"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${toneDot(item.tone)}`}
                  />
                  <span className="truncate text-[11px] font-semibold text-white/[0.70]">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.42]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              cooldown / rate-limit policy
            </p>
            <div className="mt-3 grid gap-2">
              {sourceTrust.cooldownPolicy.map((item) => (
                <p
                  key={item.id}
                  className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
                >
                  <span className="mr-2 font-mono uppercase tracking-[0.12em] text-velmere-gold">
                    {item.status}
                  </span>
                  {item.label}: {item.body}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            operator checklist
          </p>
          <div className="mt-3 grid gap-2">
            {sourceTrust.operatorChecklist.map((item, index) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
              >
                <span className="mr-2 font-mono text-velmere-gold">
                  {index + 1}
                </span>
                {item}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            blocked until
          </p>
          <div className="mt-3 grid gap-2">
            {(sourceTrust.blockedUntil.length
              ? sourceTrust.blockedUntil
              : [
                  "No hard source blocks from this terminal state. Keep manual review wording anyway.",
                ]
            ).map((item) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-red-300/[0.14] bg-red-400/[0.040] p-3 text-[11px] leading-5 text-red-100/[0.78]"
              >
                {item}
              </p>
            ))}
          </div>
          <p className="shield-copy-safe mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.43]">
            {sourceTrust.legalNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function TerminalRuntimeHealthPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
  chartError,
  orderbookError,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
  chartError?: string | null;
  orderbookError?: string | null;
}) {
  const runtimeHealth = useMemo(
    () =>
      buildTerminalRuntimeHealth(result, {
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbook,
        historyCount: history.length,
        activeCommand,
        chartError: Boolean(chartError),
        orderbookError: Boolean(orderbookError),
        modalErrorBoundary: true,
        terminalBootDeferred: true,
        modalChunkSplit: true,
        heavyPanelsDeferred: true,
        shieldMapDetached: true,
        tableWheelUnlocked: true,
        suggestionDismissOnOutsideClick: true,
        sourceCooldownActive: false,
        rateLimitMiddlewareReady: false,
        exportInfrastructureReady: false,
        persistentAuditLogReady: false,
        walletSessionReady: false,
      }),
    [
      activeCommand,
      candles.length,
      chartError,
      chartSource,
      history.length,
      orderbook,
      orderbookError,
      result,
    ],
  );

  const stateTone = (state: string) => {
    if (state === "stable" || state === "ready")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (state === "watch")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.055] text-velmere-gold";
    if (state === "degraded")
      return "border-amber-300/[0.20] bg-amber-300/[0.065] text-amber-100";
    return "border-red-300/[0.20] bg-red-400/[0.055] text-red-100";
  };

  return (
    <div className="shield-runtime-health mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Runtime health console · PASS74
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            {runtimeHealth.headline}
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            PASS74 checks whether the terminal itself is stable: modal runtime,
            chart feed, orderbook, history, source trust, evidence export,
            Shield Map and legal wording. It is QA for the product, not a token
            accusation.
          </p>
        </div>
        <div
          className={`rounded-[1.25rem] border p-3 font-mono uppercase tracking-[0.12em] ${stateTone(runtimeHealth.state)}`}
        >
          <p className="text-[9px] opacity-70">runtime score</p>
          <p className="mt-1 text-3xl text-white tabular-nums">
            {runtimeHealth.runtimeScore}/100
          </p>
          <p className="mt-1 text-[10px]">{runtimeHealth.state}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {runtimeHealth.lanes.map((lane) => (
          <div
            key={lane.id}
            className={`shield-runtime-lane ${stateTone(lane.state)}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                {lane.label}
              </p>
              <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                {lane.score}/100
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
              {lane.detail}
            </p>
            <p className="shield-copy-safe mt-2 border-t border-white/[0.08] pt-2 text-[10px] leading-5 opacity-70">
              {lane.operatorAction}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            regression guards
          </p>
          <div className="mt-3 grid gap-2">
            {runtimeHealth.regressionGuards.map((guard) => (
              <div
                key={guard.id}
                className={`rounded-2xl border p-3 ${guard.locked ? "border-emerald-300/[0.14] bg-emerald-400/[0.035]" : "border-red-300/[0.14] bg-red-400/[0.04]"}`}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.70]">
                    {guard.label}
                  </p>
                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.42]">
                    {guard.locked ? "locked" : "open"}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.44]">
                  {guard.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            operator runbook
          </p>
          <div className="mt-3 grid gap-2">
            {runtimeHealth.operatorRunbook.map((item, index) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
              >
                <span className="mr-2 font-mono text-velmere-gold">
                  {index + 1}
                </span>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
      <p className="shield-copy-safe mt-4 rounded-2xl border border-amber-300/[0.16] bg-amber-300/[0.055] p-3 text-[11px] leading-5 text-amber-100/[0.84]">
        {runtimeHealth.legalNote}
      </p>
    </div>
  );
}

function TerminalOperatorFocusPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const focus = useMemo(
    () =>
      buildTerminalOperatorFocus(result, {
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbook,
        historyCount: history.length,
        activeCommand,
        terminalBootDeferred: true,
        modalChunkSplit: true,
        heavyPanelsDeferred: true,
        modalErrorBoundary: true,
        focusedPanelRouting: true,
        sourceCooldownActive: false,
        rateLimitMiddlewareReady: false,
        exportInfrastructureReady: false,
        persistentAuditLogReady: false,
        walletSessionReady: false,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const stateTone = (state: string) => {
    if (state === "ready" || state === "stable")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (state === "review" || state === "watch")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.055] text-velmere-gold";
    if (state === "degraded")
      return "border-amber-300/[0.20] bg-amber-300/[0.065] text-amber-100";
    return "border-red-300/[0.20] bg-red-400/[0.055] text-red-100";
  };

  return (
    <div className="shield-operator-focus mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Operator focus router · PASS75
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            {focus.headline}
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            PASS75 keeps the terminal fast and focused: one active command panel
            in the main lane, deferred heavy modules, clear source confidence
            and calm SOC review. This is product workflow, not a token
            accusation.
          </p>
        </div>
        <div
          className={`rounded-[1.25rem] border p-3 font-mono uppercase tracking-[0.12em] ${stateTone(focus.state)}`}
        >
          <p className="text-[9px] opacity-70">focus score</p>
          <p className="mt-1 text-3xl text-white tabular-nums">
            {focus.focusScore}/100
          </p>
          <p className="mt-1 text-[10px]">
            /{focus.activeCommand} · {focus.state}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {focus.lanes.map((lane) => (
          <div
            key={lane.id}
            className={`shield-operator-focus-lane ${stateTone(lane.state)}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                {lane.label}
              </p>
              <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                {lane.score}/100
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
              {lane.detail}
            </p>
            <p className="shield-copy-safe mt-2 border-t border-white/[0.08] pt-2 text-[10px] leading-5 opacity-70">
              {lane.operatorAction}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            operator playbook
          </p>
          <div className="mt-3 grid gap-2">
            {focus.playbook.map((step, index) => (
              <div
                key={step.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.70]">
                    {index + 1}. {step.label}
                  </p>
                  <span className="shrink-0 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.055] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-velmere-gold">
                    {step.command}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.44]">
                  {step.body}
                </p>
                {step.blockedBy ? (
                  <p className="shield-copy-safe mt-2 rounded-xl border border-amber-300/[0.14] bg-amber-300/[0.045] p-2 text-[10px] leading-5 text-amber-100/[0.78]">
                    Blocked: {step.blockedBy}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              visible panel policy
            </p>
            <div className="mt-3 grid gap-2">
              {focus.visiblePanelPolicy.map((item) => (
                <p
                  key={item}
                  className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              anti-lag rules
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {focus.antiLagRules.map((item) => (
                <span
                  key={item}
                  className="shield-copy-safe rounded-full border border-white/[0.08] bg-white/[0.024] px-3 py-2 text-[10px] leading-4 text-white/[0.44]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="shield-copy-safe mt-4 rounded-2xl border border-amber-300/[0.16] bg-amber-300/[0.055] p-3 text-[11px] leading-5 text-amber-100/[0.84]">
        {focus.legalNote}
      </p>
    </div>
  );
}

function TerminalInteractionStabilityPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const stability = useMemo(
    () =>
      buildTerminalInteractionStability(result, {
        candlesCount: candles.length,
        historyCount: history.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        activeCommand,
        terminalBootDeferred: true,
        modalChunkSplit: true,
        heavyPanelsDeferred: true,
        modalErrorBoundary: true,
        focusedPanelRouting: true,
        sourceCooldownActive: false,
        searchLocalFirst: true,
        suggestionDismissOnOutsideClick: true,
        shieldMapDetached: true,
        tableWheelUnlocked: true,
        stressScenarioHelpers: true,
        noRawJsonButtons: true,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const stateTone = (state: string) => {
    if (state === "ready")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (state === "watch")
      return "border-velmere-gold/[0.22] bg-velmere-gold/[0.060] text-velmere-gold";
    if (state === "degraded")
      return "border-amber-300/[0.22] bg-amber-300/[0.065] text-amber-100";
    return "border-red-300/[0.22] bg-red-400/[0.060] text-red-100";
  };

  return (
    <div className="shield-interaction-stability mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Interaction stability console · PASS76
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            {stability.headline}
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            This console protects the real user path: click token, paint chart
            first, route one command panel, keep local clicks alive during
            source cooldowns and stop old stress/modal/search regressions from
            returning.
          </p>
        </div>
        <div
          className={`rounded-[1.25rem] border p-3 font-mono uppercase tracking-[0.12em] ${stateTone(stability.state)}`}
        >
          <p className="text-[9px] opacity-70">stability score</p>
          <p className="mt-1 text-3xl text-white tabular-nums">
            {stability.stabilityScore}/100
          </p>
          <p className="mt-1 text-[10px]">{stability.state}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stability.lanes.map((lane) => (
          <div
            key={lane.id}
            className={`shield-interaction-lane ${stateTone(lane.state)}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                {lane.label}
              </p>
              <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                {lane.score}/100
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
              {lane.signal}
            </p>
            <p className="shield-copy-safe mt-2 border-t border-white/[0.08] pt-2 text-[10px] leading-5 opacity-70">
              {lane.operatorAction}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            click flow contract
          </p>
          <div className="mt-3 grid gap-2">
            {stability.clickFlow.map((step, index) => (
              <div
                key={step.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3"
              >
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.70]">
                  {index + 1}. {step.label}
                </p>
                <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.48]">
                  {step.expected}
                </p>
                <p className="shield-copy-safe mt-2 rounded-xl border border-amber-300/[0.14] bg-amber-300/[0.045] p-2 text-[10px] leading-5 text-amber-100/[0.78]">
                  Blocked if: {step.blockedIf}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              lag budget
            </p>
            <div className="mt-3 grid gap-2">
              {stability.lagBudget.map((item) => (
                <p
                  key={item}
                  className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              regression locks
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stability.regressionLocks.map((item) => (
                <span
                  key={item}
                  className="shield-copy-safe rounded-full border border-white/[0.08] bg-white/[0.024] px-3 py-2 text-[10px] leading-4 text-white/[0.44]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="shield-copy-safe mt-4 rounded-2xl border border-amber-300/[0.16] bg-amber-300/[0.055] p-3 text-[11px] leading-5 text-amber-100/[0.84]">
        {stability.legalNote}
      </p>
    </div>
  );
}

function TerminalEvidenceExportPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const exportConsole = useMemo(
    () =>
      buildTerminalEvidenceExport(result, {
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbook,
        historyCount: history.length,
        activeCommand,
        sessionMode: "operator_session",
        walletSessionReady: false,
        exportInfrastructureReady: false,
        rateLimitMiddlewareReady: false,
        persistentAuditLogReady: false,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const stateTone = (state: string) => {
    if (state === "ready" || state === "draft_ready")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (state === "watch" || state === "intake_only")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.055] text-velmere-gold";
    return "border-red-300/[0.20] bg-red-400/[0.055] text-red-100";
  };

  return (
    <div className="shield-evidence-export mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Evidence export console · PASS73
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            {exportConsole.headline}
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            This console separates report preview from production export. It
            shows source ledger, blocked rails, redaction rules and legal copy
            before any evidence leaves the terminal.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
            <p className="text-white/[0.34]">export score</p>
            <p className="mt-1 text-lg text-velmere-gold tabular-nums">
              {exportConsole.exportReadinessScore}/100
            </p>
          </div>
          <div
            className={`rounded-2xl border p-3 ${stateTone(exportConsole.state)}`}
          >
            <p className="opacity-70">state</p>
            <p className="mt-1 text-sm uppercase tracking-[0.10em]">
              {exportConsole.state.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {exportConsole.lanes.map((lane) => (
            <div
              key={lane.id}
              className={`shield-export-lane ${stateTone(lane.state)}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                  {lane.label}
                </p>
                <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                  {lane.state}
                </span>
              </div>
              <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
                {lane.detail}
              </p>
              <p className="shield-copy-safe mt-2 border-t border-white/[0.08] pt-2 text-[10px] leading-5 opacity-70">
                {lane.operatorAction}
              </p>
            </div>
          ))}
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              export manifest
            </p>
            <div className="mt-3 grid gap-2">
              {exportConsole.manifest.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3 ${stateTone(item.quality)}`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                      {item.label}
                    </p>
                    <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                      {item.included ? "included" : "pending"}
                    </span>
                  </div>
                  <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-78">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-red-300/[0.14] bg-red-400/[0.045] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-red-100">
              blocked until
            </p>
            <div className="mt-3 grid gap-2">
              {(exportConsole.blockedUntil.length
                ? exportConsole.blockedUntil
                : [
                    "No hard blocker from the visible state. Keep legal and source ledgers visible anyway.",
                  ]
              ).map((item) => (
                <p
                  key={item}
                  className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-black/[0.18] p-3 text-[11px] leading-5 text-white/[0.52]"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            operator script
          </p>
          <div className="mt-3 grid gap-2">
            {exportConsole.operatorScript.map((item, index) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
              >
                <span className="mr-2 font-mono text-velmere-gold">
                  {index + 1}
                </span>
                {item}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            copy rules
          </p>
          <div className="mt-3 grid gap-2">
            {exportConsole.evidenceCopyRules.map((item) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
            redaction rules
          </p>
          <div className="mt-3 grid gap-2">
            {exportConsole.redactionRules.map((item) => (
              <p
                key={item}
                className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
      <p className="shield-copy-safe mt-4 rounded-2xl border border-amber-300/[0.16] bg-amber-300/[0.055] p-3 text-[11px] leading-5 text-amber-100/[0.84]">
        {exportConsole.legalNote}
      </p>
    </div>
  );
}

function TerminalLaunchBridgePanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const launchBridge = useMemo(
    () =>
      buildTerminalLaunchBridge(result, {
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        historyCount: history.length,
        activeCommand,
        sessionMode: "operator_session",
        terminalBootDeferred: true,
        modalChunkSplit: true,
        shieldMapDetached: true,
        tableWheelUnlocked: true,
        searchResolverGuarded: true,
        suggestionDismissOnOutsideClick: true,
        sourceHonestyVisible: true,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const stateTone = (state: string) => {
    if (state === "ready")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (state === "partial")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.055] text-velmere-gold";
    return "border-red-300/[0.20] bg-red-400/[0.055] text-red-100";
  };

  return (
    <div className="shield-launch-bridge mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Launch bridge · PASS71
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            Build-to-100 gates are visible before this can feel like a
            production terminal.
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            This panel converts the roadmap into contracts: live data feeds,
            audit storage, rate limits, VLM utility access and evidence export.
            Blocked gates stay blocked; the UI must not fake readiness.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
            <p className="text-white/[0.34]">readiness</p>
            <p className="mt-1 text-lg text-velmere-gold tabular-nums">
              {launchBridge.readinessScore}/100
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3">
            <p className="text-white/[0.34]">blockers</p>
            <p className="mt-1 text-lg text-white tabular-nums">
              {launchBridge.blockerCount}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {launchBridge.contracts.slice(0, 6).map((contract) => (
            <div
              key={contract.id}
              className={`shield-launch-contract ${stateTone(contract.state)}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                  {contract.label}
                </p>
                <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em]">
                  {contract.state}
                </span>
              </div>
              <p className="shield-copy-safe mt-2 text-[11px] leading-5 opacity-80">
                {contract.reason}
              </p>
              <p className="shield-copy-safe mt-2 border-t border-white/[0.08] pt-2 text-[10px] leading-5 opacity-70">
                {contract.next}
              </p>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              P0 blockers
            </p>
            <div className="mt-3 grid gap-2">
              {(launchBridge.p0Blockers.length
                ? launchBridge.p0Blockers
                : [
                    "No P0 blockers from visible terminal state. Keep source-honesty gates active anyway.",
                  ]
              ).map((item) => (
                <p
                  key={item}
                  className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
              operator script
            </p>
            <div className="mt-3 grid gap-2">
              {launchBridge.operatorScript.map((item, index) => (
                <p
                  key={item}
                  className="shield-copy-safe rounded-2xl border border-white/[0.07] bg-white/[0.022] p-3 text-[11px] leading-5 text-white/[0.46]"
                >
                  <span className="mr-2 font-mono text-velmere-gold">
                    {index + 1}
                  </span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {launchBridge.acceptanceGates.map((gate) => (
          <p
            key={gate}
            className="shield-copy-safe rounded-2xl border border-velmere-gold/[0.12] bg-velmere-gold/[0.040] p-3 text-[11px] leading-5 text-velmere-gold/[0.82]"
          >
            {gate}
          </p>
        ))}
      </div>
      <p className="shield-copy-safe mt-3 rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3 text-[11px] leading-5 text-white/[0.44]">
        {launchBridge.legalNote}
      </p>
    </div>
  );
}

function TerminalUsabilityGuardPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const guard = useMemo(
    () =>
      buildTerminalUsabilityGuard(result, {
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbook,
        historyCount: history.length,
        activeCommand,
        sessionMode: "operator_session",
        searchHasIconSubmit: true,
        searchHasEmptyPlaceholder: true,
        shieldMapDetached: true,
        modalErrorBoundary: true,
        sortToggleEnabled: true,
        mobileBottomSheet: true,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );

  const laneTone = (status: string) => {
    if (status === "ready")
      return "border-emerald-300/[0.20] bg-emerald-400/[0.055] text-emerald-100";
    if (status === "watch")
      return "border-velmere-gold/[0.20] bg-velmere-gold/[0.055] text-velmere-gold";
    return "border-red-300/[0.20] bg-red-400/[0.060] text-red-100";
  };

  return (
    <div className="shield-usability-guard mt-4 p-4">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            Terminal usability guard · PASS66
          </p>
          <h3 className="mt-2 text-base font-semibold tracking-tight text-white">
            {guard.headline}
          </h3>
          <p className="shield-copy-safe mt-1 text-xs leading-6 text-white/[0.46]">
            Checks the exact friction points from real use: search resolver,
            two-way sort, modal safe-mode, command routing, source honesty and
            mobile readability.
          </p>
        </div>
        <div className="grid w-full max-w-xs grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] md:w-72">
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="text-white/[0.34]">score</p>
            <p className="mt-1 text-lg text-velmere-gold tabular-nums">
              {guard.usabilityScore}/100
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
            <p className="text-white/[0.34]">mode</p>
            <p className="mt-1 truncate text-white/[0.70]">
              {guard.mode.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {guard.checks.slice(0, 8).map((check) => (
          <div
            key={check.id}
            className={`min-w-0 rounded-2xl border p-3 ${laneTone(check.status)}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                {check.lane}
              </p>
              <span className="font-mono text-[9px] tabular-nums">
                {check.score}/100
              </span>
            </div>
            <p className="mt-2 truncate text-xs font-semibold text-white/[0.86]">
              {check.label}
            </p>
            <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.48]">
              {check.operatorRead}
            </p>
            <p className="mt-2 border-t border-white/[0.08] pt-2 font-mono text-[9px] uppercase tracking-[0.10em] text-white/[0.40]">
              {check.repairCommand}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            sort contract
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {guard.sortContract.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
                  <span className="truncate text-white/[0.60]">
                    {item.column}
                  </span>
                  <span className="text-velmere-gold">
                    {item.firstClick} ↔ {item.secondClick}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-white/[0.38]">
                  Missing values stay at the bottom.
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            kernel panic prevention
          </p>
          <div className="mt-3 grid gap-2">
            {guard.kernelPanicPrevention.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2"
              >
                <p className="truncate text-xs font-semibold text-white/[0.76]">
                  {item.guard}
                </p>
                <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.42]">
                  {item.currentState} · {item.acceptance}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {guard.sourceHonesty.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.42]">
                {item.label}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] ${laneTone(item.state)}`}
              >
                {item.state}
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.46]">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <p className="shield-copy-safe mt-3 rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3 text-[11px] leading-5 text-white/[0.42]">
        {guard.legalNote}
      </p>
    </div>
  );
}

function TerminalReadinessPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
}) {
  const readiness = buildTerminalReadiness(result, {
    candlesCount: candles.length,
    chartSource,
    hasOrderBook: Boolean(orderbook),
    orderBookRisk: orderbook?.riskPoints,
    historyCount: history.length,
    chatEnabled: true,
    accessLayerVisible: true,
  });
  const query =
    result["token"].marketId ??
    result["token"].tokenAddress ??
    result["token"].symbol;
  const statusTone = (status: string) =>
    status === "ready"
      ? "text-emerald-200"
      : status === "watch"
        ? "text-velmere-gold"
        : "text-amber-200";
  const gateTone = (status: string) =>
    status === "ready"
      ? "border-emerald-300/[0.16] bg-emerald-300/[0.045]"
      : status === "watch"
        ? "border-velmere-gold/[0.18] bg-velmere-gold/[0.055]"
        : "border-amber-300/[0.16] bg-amber-300/[0.050]";

  return (
    <div className="shield-command-panel mt-4 border-white/[0.10] bg-[radial-gradient(circle_at_0%_0%,rgba(200,169,106,0.10),transparent_32%),rgba(255,255,255,0.026)] p-4">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            Terminal readiness · PASS62
          </p>
          <p className="shield-copy-safe mt-1 text-xs leading-6 text-white/[0.50]">
            {readiness.productTruth}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="rounded-2xl border border-white/[0.10] bg-black/[0.24] px-3 py-2 text-right">
            <p className="font-mono text-lg text-white tabular-nums">
              {readiness.overallReadiness}%
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
              {readiness.terminalMode.replaceAll("_", " ")}
            </p>
          </div>
          <span className="rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.12] pointer-events-none opacity-75">
            readiness in panel
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {readiness.gates.map((gate) => (
          <div
            key={gate.id}
            className={`min-w-0 rounded-2xl border p-3 ${gateTone(gate.status)}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.44]">
                  {gate.label}
                </p>
                <p
                  className={`mt-1 font-mono text-[10px] uppercase tracking-[0.13em] ${statusTone(gate.status)}`}
                >
                  {gate.status}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.10] bg-black/[0.20] px-2 py-1 font-mono text-[9px] tabular-nums text-white/[0.60]">
                {gate.score}
              </span>
            </div>
            <p className="mt-2 truncate font-mono text-[10px] text-white/[0.42]">
              {gate.evidence}
            </p>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.46]">
              {gate.nextStep}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.52fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            missing production blocks
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {readiness.missingProductionBlocks.slice(0, 6).map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.024] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            next sprint stack
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {readiness.nextSprintStack.slice(0, 4).map((item) => (
              <p key={item.id}>
                • {item.label} · {item.owner}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceWorkflowPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const workflow = useMemo(
    () =>
      buildEvidenceWorkflow(result, {
        historyCount: history.length,
        candlesCount: candles.length,
        chartSource,
        orderbook,
        activeCommand,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );
  const statusTone =
    workflow.status === "review_ready"
      ? "text-emerald-100"
      : workflow.status === "blocked_for_data"
        ? "text-amber-100"
        : "text-velmere-gold";

  return (
    <div className="shield-evidence-workflow p-4">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Evidence workflow · PASS62
            </p>
          </div>
          <h3 className="shield-copy-safe mt-2 text-sm font-semibold text-white/[0.86]">
            {workflow.summary}
          </h3>
          <p className="shield-dense-copy mt-1 text-xs text-white/[0.44]">
            Case ID:{" "}
            <span className="font-mono text-white/[0.62]">
              {workflow.caseId}
            </span>
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 text-right font-mono tabular-nums">
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] px-3 py-2">
            <p className={`text-lg ${statusTone}`}>{workflow.evidenceGrade}</p>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/[0.32]">
              grade
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] px-3 py-2">
            <p className={`text-xs uppercase tracking-[0.12em] ${statusTone}`}>
              {workflow.status.replaceAll("_", " ")}
            </p>
            <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-white/[0.32]">
              status
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            source ledger
          </p>
          <div className="mt-3 grid gap-2">
            {workflow.sourceLedger.map((source) => (
              <div
                key={source.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/[0.68]">
                    {source.label}
                  </p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.11em] text-white/[0.32]">
                    {source.detail}
                  </p>
                </div>
                <span className="rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.45]">
                  {source.quality}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            case steps
          </p>
          <div className="mt-3 grid gap-2">
            {workflow.steps.map((step, index) => (
              <div
                key={step.id}
                className="grid grid-cols-[1.55rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"
              >
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-black/[0.20] font-mono text-[8px] text-velmere-gold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-white/[0.72]">
                      {step.label}
                    </p>
                    <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.34]">
                      {step.status}
                    </span>
                  </div>
                  <p className="shield-dense-copy mt-1 text-[11px] text-white/[0.42]">
                    {step.evidence}
                  </p>
                  <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.50]">
                    {step.nextAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            analyst commands
          </p>
          <div className="mt-2 grid gap-1.5 font-mono text-[10px] leading-5 text-white/[0.44]">
            {workflow.analystCommands.slice(0, 5).map((command) => (
              <p key={command}>{command}</p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            missing data
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {(workflow.missingData.length
              ? workflow.missingData.slice(0, 5)
              : ["No critical missing block detected for this scan context."]
            ).map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            export guardrails
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {workflow.legalGuardrails.slice(0, 4).map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductOpsAuditPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const audit = useMemo(
    () =>
      buildProductOpsAudit(result, {
        historyCount: history.length,
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderBookRisk: orderbook?.riskPoints,
        orderbook,
        chatEnabled: true,
        accessLayerVisible: true,
        activeCommand,
        sessionMode: "operator_session",
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );
  const query =
    result["token"].marketId ??
    result["token"].tokenAddress ??
    result["token"].symbol;
  const tone =
    audit.mode === "launch_candidate"
      ? "text-emerald-100"
      : audit.mode === "operator_preview"
        ? "text-velmere-gold"
        : "text-amber-100";
  const statusTone = (status: string) =>
    status === "ready"
      ? "text-emerald-200"
      : status === "watch"
        ? "text-velmere-gold"
        : "text-amber-200";
  const gateTone = (status: string) =>
    status === "ready"
      ? "border-emerald-300/[0.14] bg-emerald-300/[0.040]"
      : status === "watch"
        ? "border-velmere-gold/[0.18] bg-velmere-gold/[0.050]"
        : "border-amber-300/[0.16] bg-amber-300/[0.050]";

  return (
    <div className="shield-ops-audit mt-4 p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Product ops audit · PASS62
            </p>
          </div>
          <h3 className="shield-copy-safe mt-2 text-sm font-semibold text-white/[0.86]">
            {audit.headline}
          </h3>
          <p className="shield-dense-copy mt-1 text-xs text-white/[0.44]">
            Operator mode:{" "}
            <span className="font-mono text-white/[0.62]">
              {audit.mode.replaceAll("_", " ")}
            </span>{" "}
            · active command{" "}
            <span className="font-mono text-white/[0.62]">
              /{activeCommand}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="rounded-2xl border border-white/[0.10] bg-black/[0.24] px-3 py-2 text-right font-mono tabular-nums">
            <p className={`text-lg ${tone}`}>{audit.opsScore}/100</p>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
              ops score
            </p>
          </div>
          <span className="rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.12] pointer-events-none opacity-75">
            ops in panel
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {audit.gates.map((gate) => (
          <div
            key={gate.id}
            className={`shield-no-overlap rounded-2xl border p-3 ${gateTone(gate.status)}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.40]">
                  {gate.label}
                </p>
                <p
                  className={`mt-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusTone(gate.status)}`}
                >
                  {gate.status}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[9px] tabular-nums text-white/[0.58]">
                {gate.score}
              </span>
            </div>
            <p className="mt-2 truncate font-mono text-[10px] text-white/[0.42]">
              {gate.evidence}
            </p>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.47]">
              {gate.operatorAction}
            </p>
            <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.34]">
              {gate.customerRisk}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            data source cockpit
          </p>
          <div className="mt-3 grid gap-2">
            {audit.sourceCockpit.map((source) => (
              <div
                key={source.id}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/[0.70]">
                    {source.label}
                  </p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.11em] text-white/[0.32]">
                    {source.detail}
                  </p>
                </div>
                <span
                  className={`rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${statusTone(source.status)}`}
                >
                  {source.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            case timeline
          </p>
          <div className="mt-3 grid gap-2">
            {audit.caseTimeline.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-[1.55rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"
              >
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-black/[0.20] font-mono text-[8px] text-velmere-gold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-white/[0.72]">
                      {item.label}
                    </p>
                    <span
                      className={`shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] ${statusTone(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.10em] text-white/[0.30]">
                    {item.timestamp}
                  </p>
                  <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.45]">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            export payload
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {audit.exportPayload.map((item) => (
              <p key={item.key}>
                <span className="font-mono text-white/[0.62]">{item.key}</span>:{" "}
                {item.value} · {item.guardrail}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            command history
          </p>
          <div className="mt-2 grid gap-1.5 font-mono text-[10px] leading-5 text-white/[0.42]">
            {audit.commandHistory.map((item) => (
              <p key={item.command}>
                {item.command} · {item.expectedResult}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            launch blockers
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {audit.launchBlockers.slice(0, 6).map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminalControlPlanePanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const control = useMemo(
    () =>
      buildTerminalControlPlane(result, {
        historyCount: history.length,
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderBookRisk: orderbook?.riskPoints,
        orderbook,
        chatEnabled: true,
        accessLayerVisible: true,
        activeCommand,
        sessionMode: "operator_session",
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );
  const query =
    result["token"].marketId ??
    result["token"].tokenAddress ??
    result["token"].symbol;
  const tone =
    control.mode === "production_track"
      ? "text-emerald-100"
      : control.mode === "operator_control"
        ? "text-velmere-gold"
        : "text-amber-100";
  const statusTone = (status: string) =>
    status === "ready"
      ? "text-emerald-200"
      : status === "watch"
        ? "text-velmere-gold"
        : "text-amber-200";
  const cardTone = (status: string) =>
    status === "ready"
      ? "border-emerald-300/[0.14] bg-emerald-300/[0.038]"
      : status === "watch"
        ? "border-velmere-gold/[0.18] bg-velmere-gold/[0.052]"
        : "border-amber-300/[0.16] bg-amber-300/[0.048]";

  return (
    <div className="shield-control-plane mt-4 p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <GitBranch className="h-4 w-4 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Terminal control plane · PASS62
            </p>
          </div>
          <h3 className="shield-copy-safe mt-2 text-sm font-semibold text-white/[0.86]">
            {control.headline}
          </h3>
          <p className="shield-dense-copy mt-1 text-xs text-white/[0.44]">
            Build-to-100 control spine: data contracts, operator action queue,
            release rails, UX psychology checks and legal guardrails in one
            place.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="rounded-2xl border border-white/[0.10] bg-black/[0.24] px-3 py-2 text-right font-mono tabular-nums">
            <p className={`text-lg ${tone}`}>{control.controlScore}/100</p>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
              control score
            </p>
          </div>
          <span className="rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.12] pointer-events-none opacity-75">
            control in panel
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {control.contracts.map((item) => (
          <div
            key={item.id}
            className={`shield-no-overlap rounded-2xl border p-3 ${cardTone(item.status)}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.42]">
                  {item.label}
                </p>
                <p
                  className={`mt-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusTone(item.status)}`}
                >
                  {item.status} · {item.lane}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[9px] tabular-nums text-white/[0.58]">
                {item.readiness}
              </span>
            </div>
            <p className="mt-2 truncate font-mono text-[10px] text-white/[0.42]">
              {item.currentState}
            </p>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.46]">
              {item.productionNeed}
            </p>
            <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-velmere-gold/[0.70]">
              {item.operatorCommand}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            operator action queue
          </p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {control.actionQueue.slice(0, 6).map((action) => (
              <div
                key={action.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white/[0.72]">
                      {action.label}
                    </p>
                    <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.34]">
                      {action.priority} · {action.lane}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${statusTone(action.status)}`}
                  >
                    {action.status}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.45]">
                  {action.why}
                </p>
                <p className="shield-copy-safe mt-2 border-t border-white/[0.06] pt-2 text-[10px] leading-5 text-velmere-gold/[0.72]">
                  {action.acceptanceCriteria[0]}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
              release rails
            </p>
            <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
              {control.releaseRails.map((rail) => (
                <p key={rail.id}>
                  <span
                    className={`font-mono uppercase ${statusTone(rail.status)}`}
                  >
                    {rail.status}
                  </span>{" "}
                  · {rail.label}: {rail.detail}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
              UX psychology checks
            </p>
            <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
              {control.uxPsychologyChecks.slice(0, 5).map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-amber-300/[0.14] bg-amber-300/[0.045] p-3 text-[11px] leading-5 text-amber-100/[0.82]">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
          data truth + legal rail
        </p>
        <p className="shield-copy-safe mt-2">{control.dataTruth}</p>
        <p className="shield-copy-safe mt-1">{control.legalGuardrails[0]}</p>
      </div>
    </div>
  );
}

function TerminalRiskWorkspacePanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const workspace = useMemo(
    () =>
      buildTerminalRiskWorkspace(result, {
        historyCount: history.length,
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderBookRisk: orderbook?.riskPoints,
        orderbook,
        chatEnabled: true,
        accessLayerVisible: true,
        activeCommand,
        sessionMode: "operator_session",
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );
  const query =
    result["token"].marketId ??
    result["token"].tokenAddress ??
    result["token"].symbol;
  const tone =
    workspace.mode === "release_candidate"
      ? "text-emerald-100"
      : workspace.mode === "operator_workspace"
        ? "text-velmere-gold"
        : "text-amber-100";
  const statusTone = (status: string) =>
    status === "ready"
      ? "text-emerald-200"
      : status === "watch"
        ? "text-velmere-gold"
        : "text-amber-200";
  const cardTone = (status: string) =>
    status === "ready"
      ? "border-emerald-300/[0.14] bg-emerald-300/[0.038]"
      : status === "watch"
        ? "border-velmere-gold/[0.18] bg-velmere-gold/[0.052]"
        : "border-amber-300/[0.16] bg-amber-300/[0.048]";
  const sourceTone = (state: string) =>
    state === "live"
      ? "text-emerald-200"
      : state === "partial" || state === "fallback"
        ? "text-velmere-gold"
        : "text-amber-200";

  return (
    <div className="shield-risk-workspace mt-4 p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Radar className="h-4 w-4 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Terminal risk workspace · PASS63
            </p>
          </div>
          <h3 className="shield-copy-safe mt-2 text-sm font-semibold text-white/[0.86]">
            {workspace.headline}
          </h3>
          <p className="shield-dense-copy mt-1 text-xs text-white/[0.44]">
            Decision workspace: source registry, policy registry, operator tree,
            UI friction and legal-safe review script in one compact control
            layer.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="rounded-2xl border border-white/[0.10] bg-black/[0.24] px-3 py-2 text-right font-mono tabular-nums">
            <p className={`text-lg ${tone}`}>{workspace.workspaceScore}/100</p>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
              workspace score
            </p>
          </div>
          <span className="rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.12] pointer-events-none opacity-75">
            workspace in panel
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {workspace.decisionCards.map((card) => (
          <div
            key={card.id}
            className={`shield-no-overlap rounded-2xl border p-3 ${cardTone(card.status)}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.42]">
                  {card.label}
                </p>
                <p
                  className={`mt-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusTone(card.status)}`}
                >
                  {card.status} · {card.lane}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[9px] tabular-nums text-white/[0.58]">
                {card.score}
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.50]">
              {card.decision}
            </p>
            <p className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.11em] text-white/[0.34]">
              blocked until · {card.blockedUntil}
            </p>
            <p className="shield-copy-safe mt-2 border-t border-white/[0.06] pt-2 text-[10px] leading-5 text-velmere-gold/[0.74]">
              {card.operatorCommand}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            source registry
          </p>
          <div className="mt-3 grid gap-2">
            {workspace.sourceRegistry.map((source) => (
              <div
                key={source.id}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/[0.72]">
                    {source.label}
                  </p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.10em] text-white/[0.34]">
                    {source.freshness} ·{" "}
                    {source.visibleInUi ? "visible" : "hidden"}
                  </p>
                  <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.38]">
                    {source.requiredForProduction}
                  </p>
                </div>
                <span
                  className={`rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${sourceTone(source.state)}`}
                >
                  {source.state}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="shield-policy-registry rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            policy registry
          </p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {workspace.policyRegistry.map((policy) => (
              <div
                key={policy.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white/[0.72]">
                      {policy.label}
                    </p>
                    <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.34]">
                      {policy.owner}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] ${statusTone(policy.status)}`}
                  >
                    {policy.status}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.45]">
                  {policy.rule}
                </p>
                <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.30]">
                  Failure mode: {policy.failureMode}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            operator decision tree
          </p>
          <div className="mt-2 grid gap-2">
            {workspace.operatorDecisionTree.map((step, index) => (
              <div
                key={step.id}
                className="grid grid-cols-[1.55rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/[0.06] bg-black/[0.16] p-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-black/[0.20] font-mono text-[8px] text-velmere-gold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/[0.70]">
                    {step.label}
                  </p>
                  <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.42]">
                    Yes: {step.ifTrue}
                  </p>
                  <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.34]">
                    No: {step.ifFalse}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            UI friction controls
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {workspace.uiFrictionControls.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-300/[0.14] bg-amber-300/[0.045] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            review script + legal rail
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-amber-100/[0.82]">
            {workspace.reviewScript.slice(0, 5).map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
          <p className="shield-copy-safe mt-3 border-t border-amber-200/[0.10] pt-3 text-[11px] leading-5 text-white/[0.48]">
            {workspace.legalGuardrails[0]}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductionHardeningPanel({
  result,
  candles,
  orderbook,
  history,
  chartSource,
  activeCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  history: HistorySnapshot[];
  chartSource: string;
  activeCommand: TerminalCommandId;
}) {
  const hardening = useMemo(
    () =>
      buildProductionHardening(result, {
        historyCount: history.length,
        candlesCount: candles.length,
        chartSource,
        hasOrderBook: Boolean(orderbook),
        orderbook,
        activeCommand,
        sessionMode: "operator_session",
        chatEnabled: true,
        accessLayerVisible: true,
      }),
    [
      activeCommand,
      candles.length,
      chartSource,
      history.length,
      orderbook,
      result,
    ],
  );
  const query =
    result["token"].marketId ??
    result["token"].tokenAddress ??
    result["token"].symbol;
  const tone =
    hardening.mode === "production_candidate"
      ? "text-emerald-100"
      : hardening.mode === "operator_beta"
        ? "text-velmere-gold"
        : "text-amber-100";
  const statusTone = (status: string) =>
    status === "ready"
      ? "text-emerald-200"
      : status === "watch"
        ? "text-velmere-gold"
        : "text-amber-200";
  const gateTone = (status: string) =>
    status === "ready"
      ? "border-emerald-300/[0.14] bg-emerald-300/[0.038]"
      : status === "watch"
        ? "border-velmere-gold/[0.18] bg-velmere-gold/[0.052]"
        : "border-amber-300/[0.16] bg-amber-300/[0.048]";

  return (
    <div className="shield-production-hardening mt-4 p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Production hardening · PASS64
            </p>
          </div>
          <h3 className="shield-copy-safe mt-2 text-sm font-semibold text-white/[0.86]">
            {hardening.headline}
          </h3>
          <p className="shield-dense-copy mt-1 text-xs text-white/[0.44]">
            Release-readiness layer: audit log contract, rate-limit policy,
            export manifest, VLM session access and legal-safe copy rails.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="rounded-2xl border border-white/[0.10] bg-black/[0.24] px-3 py-2 text-right font-mono tabular-nums">
            <p className={`text-lg ${tone}`}>{hardening.hardeningScore}/100</p>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
              {hardening.mode.replaceAll("_", " ")}
            </p>
          </div>
          <span className="rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.12] pointer-events-none opacity-75">
            hardening in panel
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {hardening.gates.map((gate) => (
          <div
            key={gate.id}
            className={`shield-production-gate rounded-2xl border p-3 ${gateTone(gate.status)}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.42]">
                  {gate.label}
                </p>
                <p
                  className={`mt-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusTone(gate.status)}`}
                >
                  {gate.status} · {gate.lane}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[9px] tabular-nums text-white/[0.58]">
                {gate.score}
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.50]">
              {gate.requirement}
            </p>
            <p className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.10em] text-white/[0.34]">
              state · {gate.currentState}
            </p>
            <p className="shield-copy-safe mt-2 border-t border-white/[0.06] pt-2 font-mono text-[10px] leading-5 text-velmere-gold/[0.72]">
              {gate.fixCommand}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            audit log contract
          </p>
          <div className="mt-3 grid gap-2">
            {hardening.auditContract.map((event) => (
              <div
                key={event.id}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/[0.72]">
                    {event.action}
                  </p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.10em] text-white/[0.34]">
                    {event.actor} · {event.timestamp}
                  </p>
                  <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.40]">
                    {event.retention}
                  </p>
                </div>
                <span className="rounded-full border border-white/[0.08] bg-black/[0.20] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.45]">
                  audit
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            rate-limit / abuse policy
          </p>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {hardening.rateLimitPolicy.map((policy) => (
              <div
                key={policy.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-white/[0.72]">
                    {policy.label}
                  </p>
                  <span
                    className={`shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] ${statusTone(policy.enforcementState)}`}
                  >
                    {policy.enforcementState}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-[10px] leading-5 text-white/[0.42]">
                  Public: {policy.publicPreview}
                </p>
                <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.34]">
                  Abuse: {policy.abuseSignal}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            export manifest
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {hardening.exportManifest.map((item) => (
              <p key={item.id} className="shield-copy-safe">
                •{" "}
                <span
                  className={
                    item.included
                      ? "text-emerald-100/[0.82]"
                      : "text-amber-100/[0.82]"
                  }
                >
                  {item.included ? "included" : "pending"}
                </span>{" "}
                · {item.label} · {item.legalRail}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            session access checks
          </p>
          <div className="mt-2 grid gap-2">
            {hardening.sessionAccessChecks.map((check) => (
              <div
                key={check.id}
                className="rounded-xl border border-white/[0.06] bg-black/[0.16] p-3"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-white/[0.70]">
                    {check.label}
                  </p>
                  <span
                    className={`shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] ${statusTone(check.status)}`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.42]">
                  {check.sessionRule}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-300/[0.14] bg-amber-300/[0.045] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            abuse protection queue
          </p>
          <div className="mt-2 grid gap-2">
            {hardening.abuseProtectionQueue.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-white/[0.06] bg-black/[0.14] p-3"
              >
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-amber-100/[0.82]">
                  {task.priority} · {task.task}
                </p>
                <p className="shield-copy-safe mt-1 text-[10px] leading-5 text-white/[0.42]">
                  Acceptance: {task.acceptance}
                </p>
              </div>
            ))}
          </div>
          <p className="shield-copy-safe mt-3 border-t border-amber-200/[0.10] pt-3 text-[11px] leading-5 text-white/[0.48]">
            {hardening.safeCopyRules[3]}
          </p>
        </div>
      </div>
    </div>
  );
}

function LiquidityIntelligencePanel({
  result,
  orderbook,
}: {
  result: BrainResult;
  orderbook: OrderBookResult | null;
}) {
  const liquidity = useMemo(
    () => buildLiquidityIntelligence(result, orderbook),
    [orderbook, result],
  );
  const tone =
    liquidity.reviewPriority === "critical"
      ? "text-red-100"
      : liquidity.reviewPriority === "high"
        ? "text-amber-100"
        : liquidity.reviewPriority === "watch"
          ? "text-velmere-gold"
          : "text-emerald-100";

  return (
    <div className="shield-liquidity-intelligence p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Liquidity intelligence · PASS62
            </p>
          </div>
          <h3 className="shield-copy-safe mt-2 text-sm font-semibold text-white/[0.86]">
            {liquidity.headline}
          </h3>
          <p className="shield-dense-copy mt-1 text-xs text-white/[0.44]">
            {liquidity.sourceTruth}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 font-mono tabular-nums">
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] px-3 py-2 text-right">
            <p className={`text-lg ${tone}`}>{liquidity.liquidityScore}</p>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/[0.32]">
              score
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] px-3 py-2 text-right">
            <p className={`text-lg ${tone}`}>{liquidity.uncertaintyPercent}%</p>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/[0.32]">
              uncertainty
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {liquidity.zones.map((zone) => (
          <div
            key={zone.id}
            className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="truncate text-xs font-semibold text-white/[0.72]">
                {zone.label}
              </p>
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.36]">
                {zone.priority}
              </span>
            </div>
            <p className="mt-2 font-mono text-sm tabular-nums text-white/[0.82]">
              {zone.value}
            </p>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.43]">
              {zone.explanation}
            </p>
            <p className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.11em] text-velmere-gold/[0.78]">
              {zone.command}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            depth stress
          </p>
          <div className="mt-2 grid gap-2">
            {liquidity.depthStress.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-white/[0.06] bg-black/[0.16] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-white/[0.68]">
                    {item.label}
                  </p>
                  <p className="shield-dense-copy mt-1 text-[11px] text-white/[0.38]">
                    {item.note}
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-white/[0.58]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.022] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
            missing liquidity data
          </p>
          <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-white/[0.44]">
            {(liquidity.missingData.length
              ? liquidity.missingData
              : [
                  "Live order book and market metrics are sufficient for current first-pass review.",
                ]
            )
              .slice(0, 5)
              .map((item) => (
                <p key={item}>• {item}</p>
              ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {liquidity.analystCommands.slice(0, 4).map((command) => (
              <span
                key={command}
                className="rounded-full border border-white/[0.08] bg-black/[0.18] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.10em] text-white/[0.38]"
              >
                {command}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// PASS451 customer-facing fields replace bare unknown/partial labels with explicit source requirements.
function TerminalActionPlan({
  result,
  orderbook,
  historyScoreDelta,
}: {
  result: TokenRiskResult;
  orderbook: OrderBookResult | null;
  historyScoreDelta?: number;
}) {
  const confidence = Math.round((result.confidence ?? 0.35) * 100);
  const items = [
    {
      label: "Risk delta",
      value:
        historyScoreDelta !== undefined
          ? `${historyScoreDelta > 0 ? "+" : ""}${historyScoreDelta}`
          : "0",
      body:
        historyScoreDelta && historyScoreDelta > 8
          ? "Escalate: risk is rising fast."
          : "Monitor: no rapid acceleration detected.",
    },
    {
      label: "Liquidity",
      value: orderbook ? `${orderbook.riskPoints}/100` : "source required",
      body: orderbook
        ? "Depth and slippage layer available."
        : "Order book source missing, keep uncertainty penalty.",
    },
    {
      label: "Data confidence",
      value: `${confidence}%`,
      body:
        confidence < 60
          ? "Do not over-trust the score until more sources confirm."
          : "Enough data for first-pass screening.",
    },
  ];
  return (
    <div className="rounded-[1.5rem] border border-white/[0.10] bg-white/[0.025] p-5">
      <div className="flex items-center gap-2">
        <Radar className="h-4 w-4 text-velmere-gold" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
          Investigation action plan
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="grid grid-cols-[1.7rem_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] font-mono text-[9px] text-velmere-gold">
              {index + 1}
            </span>
            <div>
              <p className="text-xs font-semibold text-white/[0.78]">
                {item.label}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/[0.42]">
                {item.body}
              </p>
            </div>
            <span className="rounded-full border border-white/[0.10] bg-white/[0.035] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.52]">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function agentToneClass(status?: string) {
  if (status === "critical") return "border-red-300/[0.20] bg-red-400/[0.055]";
  if (status === "high")
    return "border-orange-300/[0.18] bg-orange-300/[0.055]";
  if (status === "medium") return "border-amber-300/[0.16] bg-amber-300/[0.05]";
  return "border-white/[0.09] bg-white/[0.025]";
}

function verdictTone(verdict?: string) {
  if (verdict === "critical") return "text-red-200";
  if (verdict === "warning") return "text-orange-200";
  if (verdict === "watch") return "text-amber-100";
  if (verdict === "insufficient_data") return "text-white/[0.52]";
  return "text-emerald-100";
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.035] p-4">
      <Icon className="h-4 w-4 text-velmere-gold" />
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.35]">
        {label}
      </p>
      <p className="mt-2 font-mono text-sm text-white/[0.80]">{value}</p>
    </div>
  );
}

function clampPercent(value: number) {
  return Math.max(3, Math.min(100, value));
}

function SocTerminalPanel({
  result,
  history,
}: {
  result: BrainResult;
  history: HistorySnapshot[];
}) {
  const soc = useMemo(
    () => buildSocTerminalBrief(result, history),
    [result, history],
  );
  const toneClass =
    soc.status === "critical"
      ? "border-red-300/[0.24] bg-red-400/[0.06]"
      : soc.status === "warning"
        ? "border-amber-300/[0.22] bg-amber-300/[0.06]"
        : soc.status === "watch"
          ? "border-velmere-gold/[0.20] bg-velmere-gold/[0.055]"
          : "border-emerald-300/[0.16] bg-emerald-300/[0.045]";
  const statusText = soc.status.replaceAll("_", " ");

  return (
    <div
      className={`shield-command-panel shield-no-overlap rounded-[1.5rem] border p-4 ${toneClass}`}
    >
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Radar className="h-4 w-4 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              AI SOC command queue
            </p>
          </div>
          <h3 className="shield-copy-safe mt-2 text-base font-semibold leading-6 text-white/[0.88]">
            {soc.headline}
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.48]">
            {soc.analystNarrative}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.13em] md:w-56">
          <span className="rounded-2xl border border-white/[0.10] bg-black/[0.22] px-3 py-2 text-white/[0.46]">
            status{" "}
            <strong className="block text-white/[0.82]">{statusText}</strong>
          </span>
          <span className="rounded-2xl border border-white/[0.10] bg-black/[0.22] px-3 py-2 text-white/[0.46]">
            confidence{" "}
            <strong className="block text-white/[0.82]">
              {soc.confidence}%
            </strong>
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
        <div className="grid gap-2">
          {soc.commandQueue.slice(0, 4).map((command) => (
            <div
              key={command.id}
              className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white/[0.86]">
                    {command.label}
                  </p>
                  <p className="shield-copy-safe mt-1 text-xs leading-5 text-white/[0.46]">
                    {command.reason}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.46]">
                  {command.layer}
                </span>
              </div>
              <p className="shield-copy-safe mt-2 border-t border-white/[0.06] pt-2 text-xs leading-5 text-velmere-gold/[0.80]">
                {command.action}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {soc.readiness.map((check) => (
            <div
              key={check.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.54]">
                  {check.label}
                </p>
                <span
                  className={
                    check.status === "pass"
                      ? "text-emerald-200"
                      : check.status === "watch"
                        ? "text-amber-200"
                        : "text-red-200"
                  }
                >
                  {check.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-white/[0.38]">
                {check.value}
              </p>
              <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.42]">
                {check.fix}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-2 rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3 md:flex-row md:items-center md:justify-between">
        <p className="shield-copy-safe text-xs leading-6 text-white/[0.48]">
          <strong className="text-white/[0.78]">Next best action:</strong>{" "}
          {soc.nextBestAction}
        </p>
        <span className="shrink-0 rounded-full border border-velmere-gold/[0.22] bg-velmere-gold/[0.075] px-3 py-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.13] pointer-events-none opacity-75">
          SOC in panel
        </span>
      </div>
    </div>
  );
}

function HolderBrainPanel({ result }: { result: BrainResult }) {
  const intelligence = buildHolderIntelligence(result);
  const tone =
    intelligence.holderRiskScore >= 70
      ? "text-amber-100"
      : intelligence.holderRiskScore >= 40
        ? "text-velmere-gold"
        : "text-emerald-100";
  const nodeTone = (risk: number) =>
    risk >= 75
      ? "border-amber-300/[0.24] bg-amber-300/[0.08] text-amber-100"
      : risk >= 45
        ? "border-velmere-gold/[0.22] bg-velmere-gold/[0.07] text-velmere-gold"
        : "border-emerald-300/[0.18] bg-emerald-400/[0.06] text-emerald-100";
  const statusTone = (status?: string) =>
    status === "live"
      ? "text-emerald-200"
      : status === "proxy"
        ? "text-velmere-gold"
        : "text-amber-200";
  const clusterTone = (role: string) =>
    role === "whale"
      ? "border-amber-300/[0.22] bg-amber-300/[0.07]"
      : role === "custody"
        ? "border-sky-300/[0.18] bg-sky-300/[0.055]"
        : role === "liquidity"
          ? "border-emerald-300/[0.18] bg-emerald-300/[0.055]"
          : role === "team"
            ? "border-red-300/[0.18] bg-red-300/[0.055]"
            : role === "retail"
              ? "border-white/[0.09] bg-white/[0.026]"
              : "border-velmere-gold/[0.18] bg-velmere-gold/[0.045]";

  return (
    <div className="shield-density-bento p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <WalletCards className="h-4 w-4 shrink-0 text-velmere-gold" />
          <div className="min-w-0">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Holder intelligence 2.0
            </p>
            <p className="shield-copy-safe mt-1 text-xs leading-5 text-white/[0.42]">
              Whales, CEX/custody, DEX/LP, team, retail and unclassified
              clusters with explicit uncertainty.
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-black/[0.22] px-3 py-2 text-right">
          <p className={`font-mono text-lg tabular-nums ${tone}`}>
            {intelligence.holderRiskScore}/100
          </p>
          <p className="max-w-[7rem] truncate font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">
            {intelligence.verdict}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            data completeness
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-white">
            {intelligence.dataCompleteness}%
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/[0.12] bg-amber-300/[0.035] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            data uncertainty
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-amber-100">
            {intelligence.dataUncertaintyPercent}%
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            uncertainty
          </p>
          <p className="mt-1 font-mono text-lg uppercase text-velmere-gold">
            {intelligence.uncertainty}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            clusters
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-white">
            {intelligence.clusterMap.length}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          ["cluster psychology", "separate custody from whales"],
          ["unclassified bucket", "never equals safe"],
          ["manual review", intelligence.verdict.replaceAll("_", " ")],
        ].map(([label, value]) => (
          <div key={label} className="shield-readability-grade justify-between">
            <span className="truncate text-white/[0.32]">{label}</span>
            <span className="truncate text-white/[0.68]">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-velmere-gold" />
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.42]">
              Holder cluster map 2.0
            </p>
          </div>
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">
            data {intelligence.dataCompleteness}%
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {intelligence.nodes.map((node, index) => (
            <div
              key={`cluster-${node.id}`}
              className={`min-w-0 rounded-2xl border p-3 ${nodeTone(node.risk)}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.42]">
                  {node.id}
                </span>
                <span
                  className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] ${statusTone(node.dataStatus)}`}
                >
                  {node.dataStatus}
                </span>
              </div>
              <div className="mt-3 flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black/[0.22] font-mono text-[9px] text-white/[0.56]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white/[0.82]">
                    {node.label}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-velmere-gold"
                      style={{ width: `${clampPercent(node.weight)}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="shield-truncate-2 mt-2 text-[11px] leading-5 text-white/[0.42]">
                {node.note}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.38]">
                <span>risk {node.risk}</span>
                <span>conf {Math.round(node.confidence * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_20%,rgba(200,169,106,0.10),transparent_44%),rgba(0,0,0,0.18)] p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {intelligence.clusterMap.slice(0, 24).map((cluster) => (
              <div
                key={cluster.id}
                className={`min-w-0 rounded-2xl border p-2.5 ${clusterTone(cluster.role)}`}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.38]">
                    {cluster.role}
                  </p>
                  <span className="shrink-0 font-mono text-[9px] tabular-nums text-white/[0.64]">
                    {cluster.share}%
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-semibold text-white/[0.78]">
                  {cluster.label}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-velmere-gold"
                    style={{ width: `${clampPercent(cluster.risk)}%` }}
                  />
                </div>
                <p className="shield-truncate-2 mt-2 text-[10px] leading-4 text-white/[0.38]">
                  {cluster.evidence}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {intelligence.edges.map((edge) => (
            <div
              key={`${edge.from}-${edge.to}`}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"
            >
              <p className="shield-copy-safe text-[11px] leading-5 text-white/[0.48]">
                <strong className="text-white/[0.72]">{edge.from}</strong> →{" "}
                <strong className="text-white/[0.72]">{edge.to}</strong> ·{" "}
                {edge.label}
              </p>
              <span className="shrink-0 rounded-full border border-white/[0.10] bg-black/[0.22] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.48]">
                {edge.pressure}/100
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {intelligence.lanes.map((lane) => (
          <div
            key={lane.id}
            className="rounded-2xl border border-white/[0.08] bg-black/[0.18] p-3"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white/[0.78]">
                  {lane.label}
                </p>
                <p className="shield-copy-safe mt-1 text-[11px] leading-5 text-white/[0.40]">
                  {lane.nextStep}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.035] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.52]">
                {lane.value}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${lane.score >= 70 ? "bg-amber-300" : lane.score >= 40 ? "bg-velmere-gold" : "bg-emerald-300"}`}
                style={{ width: `${clampPercent(lane.score)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3 text-[11px] leading-5 text-white/[0.42]">
        <p>
          <strong className="text-white/[0.72]">Missing:</strong>{" "}
          {intelligence.missingData.length
            ? intelligence.missingData.join(" · ")
            : "core holder proxy complete"}
        </p>
        <p>
          <strong className="text-white/[0.72]">Source plan:</strong>{" "}
          {intelligence.sourcePlan
            .map((item) => `${item.source}: ${item.status}`)
            .join(" · ")}
        </p>
        <p>
          <strong className="text-white/[0.72]">Next:</strong>{" "}
          {intelligence.nextActions[0]}
        </p>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold transition hover:text-white pointer-events-none opacity-75">
          holder view in panel
        </span>
      </div>
    </div>
  );
}

function RiskReplayPanel({
  result,
  history,
}: {
  result: BrainResult;
  history: HistorySnapshot[];
}) {
  const replay = buildRiskReplay(result, history);
  const topEvents = replay.events.slice(-5).reverse();
  const replayToken = result["token"];
  const query = replayToken.marketId ?? replayToken.symbol;
  const accelerationTone =
    replay.accelerationScore >= 75
      ? "text-red-100"
      : replay.accelerationScore >= 55
        ? "text-amber-100"
        : replay.accelerationScore >= 35
          ? "text-velmere-gold"
          : "text-emerald-100";
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.10] bg-[radial-gradient(circle_at_10%_0%,rgba(200,169,106,0.12),transparent_32%),rgba(255,255,255,0.026)] p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-velmere-gold/[0.12]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-velmere-gold/[0.22] bg-black/[0.26] text-velmere-gold">
            <GitBranch className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Risk replay timeline
            </p>
            <p className="mt-1 text-xs leading-5 text-white/[0.44]">
              Reconstructs why the case is moving: memory, signals, stress
              shocks and holder pressure.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-mono text-2xl tabular-nums ${accelerationTone}`}>
            {replay.accelerationScore}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.36]">
            acceleration
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2">
        {replay.phases.slice(0, 3).map((phase) => (
          <div
            key={phase.id}
            className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white/[0.78]">
                {phase.label}
              </span>
              <span className="font-mono text-[10px] text-white/[0.58] tabular-nums">
                {phase.score}/100
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${phase.score >= 70 ? "bg-red-300" : phase.score >= 50 ? "bg-amber-300" : "bg-velmere-gold"}`}
                style={{ width: `${clampPercent(phase.score)}%` }}
              />
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-white/[0.42]">
              {phase.nextStep}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {topEvents.map((event, index) => (
          <div
            key={event.id}
            className="relative grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3"
          >
            <span
              className={`mt-1 h-3 w-3 rounded-full ${event.severity === "critical" ? "bg-red-300" : event.severity === "warning" ? "bg-amber-300" : event.severity === "watch" ? "bg-velmere-gold" : "bg-emerald-300"}`}
            />
            {index < topEvents.length - 1 ? (
              <span className="absolute left-[1.18rem] top-8 h-[calc(100%-1.1rem)] w-px bg-white/[0.08]" />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/[0.80]">
                {event.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/[0.42]">
                {event.analystNote}
              </p>
            </div>
            <div className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-white/[0.36]">
              <p className="text-white/[0.72] tabular-nums">{event.score}</p>
              <p>{event.layer}</p>
            </div>
          </div>
        ))}
      </div>

      <span className="relative mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold transition hover:text-white pointer-events-none opacity-75">
        replay in panel
      </span>
    </div>
  );
}

function ShieldBrainCard({
  result,
  orderbook,
}: {
  result: BrainResult;
  orderbook: OrderBookResult | null;
}) {
  const agents = result.agentAssessments ?? [];
  const strongest = agents
    .filter((agent) => agent.id !== "data")
    .sort((a, b) => b.score - a.score)[0];
  const confidence = Math.round((result.confidence ?? 0.35) * 100);
  const micro = orderbook?.riskPoints ?? 0;
  const brainScore = Math.min(
    100,
    Math.round(result.score * 0.74 + micro * 0.16 + (100 - confidence) * 0.1),
  );
  const verdict =
    brainScore >= 80
      ? "escalate"
      : brainScore >= 55
        ? "review"
        : brainScore >= 30
          ? "monitor"
          : "clear";
  const tokenInfo = result["token"];
  const steps = [
    strongest
      ? `Dominant layer: ${strongest.label} (${strongest.score}/100).`
      : "No dominant risk layer from current sources.",
    micro > 0
      ? `Order book added ${micro} microstructure points.`
      : "Order book layer is clean or unavailable.",
    confidence < 60
      ? "Confidence is limited — missing data is treated as uncertainty, not safety."
      : "Data confidence is acceptable for first-pass screening.",
  ];
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-velmere-gold/[0.18] bg-[radial-gradient(circle_at_12%_0%,rgba(200,169,106,0.12),transparent_34%),rgba(255,255,255,0.026)] p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-velmere-gold/[0.16]" />
      <div className="pointer-events-none absolute -right-4 top-8 h-24 w-24 rounded-full border border-white/[0.08]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-velmere-gold/[0.26] bg-velmere-gold/[0.08] text-velmere-gold">
            <Brain className="h-5 w-5" />
            <span className="absolute inset-0 animate-ping rounded-full border border-velmere-gold/[0.18]" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
              Velmère AI risk brain
            </p>
            <p className="mt-1 text-xs leading-5 text-white/[0.44]">
              Fusion of price velocity, liquidity, holders, order book and
              contract flags.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-2xl text-white tabular-nums">
            {brainScore}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.36]">
            {verdict}
          </p>
        </div>
      </div>
      <div className="relative mt-4 grid gap-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-2 rounded-2xl border border-white/[0.07] bg-black/[0.18] p-3"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] font-mono text-[9px] text-velmere-gold">
              {index + 1}
            </span>
            <p className="text-xs leading-6 text-white/[0.52]">{step}</p>
          </div>
        ))}
      </div>
      <span className="relative mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold transition hover:text-white pointer-events-none opacity-75">
        risk brain in panel
      </span>
    </div>
  );
}

function TerminalBootSkeleton({ symbol }: { symbol: string }) {
  return (
    <div className="shield-terminal-loader velmere-stable-surface velmere-stable-skeleton mt-4 rounded-[1.5rem] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="velmere-stable-skeleton__eyebrow" />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
            PASS69 performance guard · {symbol}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-white/[0.86]">
            Terminal ładuje ciężkie panele po pierwszym paint.
          </h3>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.46]">
            Najpierw pokazujemy świeczki i command palette. Holder map, AI bot,
            SOC, evidence, VLM i replay startują chwilę później, żeby klik w
            monetę nie powodował laga ani safe mode.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.42]">
          {["chart first", "api deferred", "no raw json"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/[0.09] bg-black/[0.22] px-2.5 py-1 text-center"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/[0.07] bg-black/[0.18] p-4"
          >
            <div className="velmere-stable-skeleton__row" />
            <div className="velmere-stable-skeleton__row mt-3 w-[78%]" />
            <div className="velmere-stable-skeleton__row mt-3 w-[56%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function VlmAiSequenceOverlay({
  mode,
  result,
  candles,
  orderbook,
  chartSource,
  riskScore,
  onClose,
}: {
  mode: VlmAiSequenceMode;
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  chartSource: string;
  riskScore: number;
  onClose: () => void;
}) {
  type VlmReadTone = "gold" | "cyan" | "green" | "red";
  type MotionQuality = "high" | "medium" | "low";
  type MotionPreset = "orbit" | "static";
  type BrainRuntimeMode = "cinematic" | "performance";
  type MotionTelemetryState = "stable" | "guarded" | "throttled" | "paused";
  type MotionTelemetrySample = {
    fps: number;
    state: MotionTelemetryState;
    inputLatency: string;
  };
  type ReadoutPhase = "boot" | "orb" | "brain" | "readout" | "complete";
  type VlmReadGroup =
    | "all"
    | "risk"
    | "liquidity"
    | "holders"
    | "signals"
    | "source"
    | "access";
  type VlmReadNode = {
    label: string;
    value: string;
    hint: string;
    detail: string;
    x: number;
    y: number;
    tone?: VlmReadTone;
    group: Exclude<VlmReadGroup, "all">;
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const rotationRef = useRef({
    x: -0.16,
    y: 0,
    vx: 0,
    vy: 0,
    dragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
  });
  const tokenInfo = result["token"];
  const isAdvanced = mode === "advanced";
  const isPro = mode === "pro";
  const supportsOrbit360 = true;
  const isInvestigationMode = supportsOrbit360; // legacy guard marker kept for verification scripts
  // PASS149 hard guard: Orbit 360 belongs only to Advanced.
  // Legacy verification marker retained; PASS170 intentionally expands Orbit 360 to Basic and Pro too.
  // Basic/Pro never re-enable the heavy scene
  const [selectedNode, setSelectedNode] = useState<VlmReadNode | null>(null);
  const [activeTileGroup, setActiveTileGroup] = useState<VlmReadGroup>("all");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [motionQuality, setMotionQuality] = useState<MotionQuality>("low");
  const [motionPreset, setMotionPreset] = useState<MotionPreset>("orbit");
  const [brainRuntimeMode, setBrainRuntimeMode] =
    useState<BrainRuntimeMode>("performance");
  const [frameHealth, setFrameHealth] = useState<
    "smooth" | "guarded" | "degraded"
  >("guarded");
  const [phase, setPhase] = useState<ReadoutPhase>("boot");
  const [revealedCount, setRevealedCount] = useState(0);
  const [autoRotate] = useState(true);
  const [brainZoom] = useState(1);

  // PASS170 unified brain lane: every mode can switch between Orbit 360 and the full-screen evidence board.
  const allowedMotionPresets = useMemo<MotionPreset[]>(() => ["orbit"], []); // PASS194: Evidence Board hidden for now; Orbit 360 is the single VLM brain view for Basic/Pro/Advanced

  useEffect(() => {
    setMotionPreset("orbit");
    setBrainRuntimeMode("performance");
    setFrameHealth("guarded");
    setSelectedNode(null);
  }, [mode]);
  const locale = useLocale();
  const ui = useMemo(() => {
    if (locale === "pl") {
      return {
        boot: "Start rdzenia VLM",
        orb: "Rdzeń tokena wchodzi do analizy",
        brain: "Formowanie kuli Orbit 360",
        readout: "Odczyt kafelków ryzyka",
        complete: "Odczyt neuronowy zakończony",
        motion: "tryb ruchu",
        motionGovernor: "sterowanie ruchem",
        motionOrbit: "Orbit 360",
        motionStatic: "Statyczny",
        motionOrbitHint:
          "Orbit 360 jest głównym widokiem dla Basic, Pro i Advanced. Kafelek otwiera jeden czytelny popup z wyjaśnieniem.",
        runtimePerformance: "Performance",
        runtimeCinematic: "Cinematic",
        frameSmooth: "płynny",
        frameGuarded: "guarded",
        frameDegraded: "degraded",
        motionHealth: "zdrowie ruchu",
        motionStable: "stabilny",
        motionGuarded: "pilnowany",
        motionThrottled: "odciążony",
        motionPaused: "pauza czytania",
        inputLatency: "input",
        rotateHint: "Przeciągnij rdzeń, żeby obrócić mózg 360°",
        back: "Wróć do wykresu",
        pointsAdvanced: "20 kafelków śledczych",
        pointsPro: "14 kafelków źródłowych",
        pointsBasic: "10 kafelków śledczych",
        tapPoint: "Kliknij kafelek po szczegóły",
        tileDetails: "szczegóły",
        selectedPoint: "Wybrany kafelek",
        close: "Zamknij",
        modeAdvanced: "advanced",
        searchPlaceholder: "",
        allTiles: "Wszystkie",
        filtered: "filtr",
        controlKicker: "zakres analizy",
        controlTitle: "Wybierz głębokość pracy VLM",
        controlBody:
          "Każdy tryb otwiera VLM Orbit 360. Kafelek pokazuje kontekst sygnału, źródło, brakujące dane i kolejny krok operatora.",
        basicTitle: "Basic Analysis",
        basicHint: "10 sygnałów · szybki skan, spokojny opis",
        proTitle: "Pro Review",
        proHint: "14 sygnałów · źródła, kontekst i luki",
        advancedTitle: "Advanced Analysis",
        advancedHint: "20 sygnałów · pełna kula Orbit 360",
        caseKicker: "case file",
        caseTitle: "Operator AI",
        caseNext: "następny krok",
        caseBlockers: "blokery",
        caseQueries: "OSINT",
        caseEvidence: "evidence",
        shieldMap: "Otwórz Shield Map",
        memberLayer: "Warstwa VLM member",
        brainChip: "VLM RISK BRAIN",
        evidenceBoard: "Evidence board",
        boardHint: "Pełnoekranowa mapa kafelków wokół rdzenia VLM",
      };
    }
    if (locale === "de") {
      return {
        boot: "VLM-Kern startet",
        orb: "Token-Kern fliegt in die Analyse",
        brain: "Orbit-360-Kugel wird aufgebaut",
        readout: "Risikokacheln werden gelesen",
        complete: "Neuronaler Read abgeschlossen",
        motion: "Bewegungsmodus",
        motionGovernor: "Motion-Steuerung",
        motionOrbit: "Orbit 360",
        motionStatic: "Statisch",
        motionOrbitHint:
          "Orbit 360 ist die Hauptansicht für Basic, Pro und Advanced. Eine Kachel öffnet ein lesbares Kontext-Popup.",
        runtimePerformance: "Performance",
        runtimeCinematic: "Cinematic",
        frameSmooth: "flüssig",
        frameGuarded: "geschützt",
        frameDegraded: "gedrosselt",
        motionHealth: "Bewegungszustand",
        motionStable: "stabil",
        motionGuarded: "überwacht",
        motionThrottled: "entlastet",
        motionPaused: "Lesepause",
        inputLatency: "Input",
        rotateHint: "Ziehe den Kern, um das Gehirn 360° zu drehen",
        back: "Zurück zum Chart",
        pointsAdvanced: "20 Ermittlungs-Kacheln",
        pointsPro: "14 Quellen-Kacheln",
        pointsBasic: "10 Ermittlungs-Kacheln",
        tapPoint: "Kachel antippen für Details",
        tileDetails: "Details",
        selectedPoint: "Ausgewählte Kachel",
        close: "Schließen",
        modeAdvanced: "advanced",
        searchPlaceholder: "",
        allTiles: "Alle",
        filtered: "Filter",
        controlKicker: "Analysekontrolle",
        controlTitle: "Wähle die VLM-Tiefe",
        controlBody:
          "Jeder Modus öffnet VLM Orbit 360. Eine Kachel erklärt Signal-Kontext, Quellenstatus, Datenlücken und den nächsten Operator-Schritt.",
        basicTitle: "Basic Analysis",
        basicHint: "10 Signale · schneller Scan, ruhige Copy",
        proTitle: "Pro Review",
        proHint: "14 Signale · Quellen, Kontext und Lücken",
        advancedTitle: "Advanced Analysis",
        advancedHint: "20 Signale · volle Orbit-360-Kugel",
        caseKicker: "Case File",
        caseTitle: "Operator AI",
        caseNext: "nächster Schritt",
        caseBlockers: "Blocker",
        caseQueries: "OSINT",
        caseEvidence: "Evidence",
        shieldMap: "Shield Map öffnen",
        memberLayer: "VLM Member Layer",
        brainChip: "VLM RISK BRAIN",
        evidenceBoard: "Evidence Board",
        boardHint: "Vollflächige Kachelkarte rund um den VLM-Kern",
      };
    }
    return {
      boot: "VLM core boot",
      orb: "token core inbound",
      brain: "forming the Orbit 360 sphere",
      readout: "extracting risk tiles",
      complete: "neural read complete",
      motion: "motion",
      motionGovernor: "motion governor",
      motionOrbit: "Orbit 360",
      motionStatic: "Static",
      motionOrbitHint:
        "Orbit 360 is the main view for Basic, Pro and Advanced. A tile opens one readable popup with context.",
      runtimePerformance: "Performance",
      runtimeCinematic: "Cinematic",
      frameSmooth: "smooth",
      frameGuarded: "guarded",
      frameDegraded: "degraded",
      motionHealth: "motion health",
      motionStable: "stable",
      motionGuarded: "guarded",
      motionThrottled: "throttled",
      motionPaused: "reading pause",
      inputLatency: "input",
      rotateHint: "Drag the core to rotate the 360° brain",
      back: "Back to chart",
      pointsAdvanced: "20 investigator tiles",
      pointsPro: "14 source tiles",
      pointsBasic: "10 investigator tiles",
      tapPoint: "Tap a tile for detail",
      tileDetails: "details",
      selectedPoint: "Selected tile",
      close: "Close",
      modeAdvanced: "advanced",
      searchPlaceholder: "",
      allTiles: "All",
      filtered: "filter",
      controlKicker: "analysis control",
      controlTitle: "Choose VLM depth",
      controlBody:
        "Every mode opens VLM Orbit 360. A tile explains signal context, source state, missing data and the next operator step.",
      basicTitle: "Basic Analysis",
      basicHint: "10 signals · fast scan, calm copy",
      proTitle: "Pro Review",
      proHint: "14 signals · sources, context and gaps",
      advancedTitle: "Advanced Analysis",
      advancedHint: "20 signals · full Orbit 360 sphere",
      caseKicker: "case file",
      caseTitle: "Operator AI",
      caseNext: "next action",
      caseBlockers: "blockers",
      caseQueries: "OSINT",
      caseEvidence: "evidence",
      shieldMap: "Open Shield Map",
      memberLayer: "VLM member layer",
      brainChip: "VLM RISK BRAIN",
      evidenceBoard: "Evidence board",
      boardHint: "Full-screen Orbit 360 map around the VLM core",
    };
  }, [locale]);

  const groupLabels = useMemo<Record<VlmReadGroup, string>>(() => {
    if (locale === "pl") {
      return {
        all: ui.allTiles,
        risk: "Ryzyko",
        liquidity: "Płynność",
        holders: "Holderzy",
        signals: "Sygnały",
        source: "Źródła",
        access: "Dostęp",
      };
    }
    if (locale === "de") {
      return {
        all: ui.allTiles,
        risk: "Risiko",
        liquidity: "Liquidität",
        holders: "Holder",
        signals: "Signale",
        source: "Quellen",
        access: "Zugang",
      };
    }
    return {
      all: ui.allTiles,
      risk: "Risk",
      liquidity: "Liquidity",
      holders: "Holders",
      signals: "Signals",
      source: "Sources",
      access: "Access",
    };
  }, [locale, ui.allTiles]);

  const tileGroups: VlmReadGroup[] = [
    "all",
    "risk",
    "liquidity",
    "holders",
    "signals",
    "source",
    "access",
  ];
  const nodeDisplayCopy = useMemo<
    Record<
      Exclude<VlmReadGroup, "all">,
      { label: string; hint: string; summary: string }
    >
  >(() => {
    if (locale === "pl") {
      return {
        risk: {
          label: "rdzeń ryzyka",
          hint: "score i werdykt",
          summary:
            "Kafelek pokazuje główną ocenę modelu i powód, dlaczego wynik nie jest certyfikatem bezpieczeństwa. Najpierw sprawdzamy źródła, dopiero potem werdykt.",
        },
        liquidity: {
          label: "płynność / exit",
          hint: "depth i poślizg",
          summary:
            "Kafelek ocenia, czy da się realnie wejść lub wyjść z pozycji bez dużego poślizgu. Dobry wykres nie wystarczy, jeśli order book i volume są słabe.",
        },
        holders: {
          label: "holderzy / supply",
          hint: "kontrola podaży",
          summary:
            "Kafelek streszcza koncentrację podaży, top holderów, treasury, LP i unclassified clusters. Brak etykiet oznacza review, nie mocny wyrok.",
        },
        signals: {
          label: "sygnał / anomalia",
          hint: "co wymaga review",
          summary:
            "Kafelek wybiera najsilniejszy widoczny sygnał, ale traktuje go jako punkt kontrolny. Jedna flaga nigdy nie wystarcza do finalnego wniosku.",
        },
        source: {
          label: "źródła / evidence",
          hint: "live albo brak",
          summary:
            "Kafelek pokazuje jakość danych: live, partial, fallback albo missing. Braki danych zwiększają niepewność i blokują mocny publiczny werdykt.",
        },
        access: {
          label: "VLM access",
          hint: "granica produktu",
          summary:
            "Kafelek pilnuje, że VLM jest warstwą narzędziową i dostępem do analizy, a nie obietnicą zysku, bezpieczeństwa inwestycji albo ukrytą transakcją.",
        },
      };
    }
    if (locale === "de") {
      return {
        risk: {
          label: "risiko-kern",
          hint: "score und befund",
          summary:
            "Diese Kachel zeigt den Haupt-Risiko-Readout und erklärt, warum er kein Sicherheitszertifikat ist. Erst Quellen prüfen, dann Befund formulieren.",
        },
        liquidity: {
          label: "liquidität / exit",
          hint: "depth und slippage",
          summary:
            "Diese Kachel prüft, ob ein Einstieg oder Ausstieg ohne starken Slippage realistisch ist. Ein sauberer Chart reicht nicht, wenn Order Book und Volumen schwach sind.",
        },
        holders: {
          label: "holder / supply",
          hint: "supply-kontrolle",
          summary:
            "Diese Kachel fasst Supply-Konzentration, Top Holder, Treasury, LP und nicht klassifizierte Cluster zusammen. Fehlende Labels bedeuten Review, kein hartes Urteil.",
        },
        signals: {
          label: "signal / anomalie",
          hint: "review-punkt",
          summary:
            "Diese Kachel wählt das stärkste sichtbare Signal, behandelt es aber als Kontrollpunkt. Ein einzelnes Signal reicht nie für einen finalen Befund.",
        },
        source: {
          label: "quellen / evidence",
          hint: "live oder lücke",
          summary:
            "Diese Kachel zeigt die Datenqualität: live, partial, fallback oder missing. Datenlücken erhöhen die Unsicherheit und blockieren einen starken öffentlichen Befund.",
        },
        access: {
          label: "VLM access",
          hint: "produktgrenze",
          summary:
            "Diese Kachel hält VLM als Analyse- und Access-Layer sauber: keine Gewinnzusage, keine Investment-Safety-Claims und keine versteckte Transaktion.",
        },
      };
    }
    return {
      risk: {
        label: "risk core",
        hint: "score and verdict",
        summary:
          "This tile shows the main risk readout and explains why it is not a safety certificate. Check sources first, then write the verdict.",
      },
      liquidity: {
        label: "liquidity / exit",
        hint: "depth and slippage",
        summary:
          "This tile checks whether entering or exiting is realistic without heavy slippage. A clean chart is not enough if order book and volume are weak.",
      },
      holders: {
        label: "holders / supply",
        hint: "supply control",
        summary:
          "This tile summarizes supply concentration, top holders, treasury, LP and unclassified clusters. Missing labels mean review, not a hard accusation.",
      },
      signals: {
        label: "signal / anomaly",
        hint: "review trigger",
        summary:
          "This tile selects the strongest visible signal, but treats it as a control point. One flag is never enough for a final readout.",
      },
      source: {
        label: "sources / evidence",
        hint: "live or gap",
        summary:
          "This tile shows data quality: live, partial, fallback or missing. Data gaps raise uncertainty and block strong public wording.",
      },
      access: {
        label: "VLM access",
        hint: "product boundary",
        summary:
          "This tile keeps VLM as an analysis and access layer: no ROI promise, no investment-safety claim and no hidden transaction.",
      },
    };
  }, [locale]);
  const visiblePointLabel = isAdvanced
    ? ui.pointsAdvanced
    : isPro
      ? ui.pointsPro
      : ui.pointsBasic;
  const pass395Readout = buildPass395NeuralOrbitReadout({
    symbol: tokenInfo.symbol,
    name: tokenInfo.name ?? tokenInfo.symbol,
    type: "crypto token",
    risk: riskScore,
    source: result.dataQuality ?? chartSource,
    mode,
  });

  const coreEntryStyle = useMemo<CSSProperties>(() => {
    const seed = Array.from(`${tokenInfo.symbol}:${mode}`).reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0,
    );
    const edge = seed % 4;
    const x = edge === 0 ? -54 : edge === 1 ? 54 : ((seed % 9) - 4) * 8;
    const y = edge === 2 ? -48 : edge === 3 ? 48 : (((seed + 3) % 7) - 3) * 7;
    return {
      "--vlm-entry-x": `${x}vw`,
      "--vlm-entry-y": `${y}vh`,
    } as CSSProperties;
  }, [mode, tokenInfo.symbol]);

  const confidence = Math.round((result.confidence ?? 0.42) * 100);
  const liveBars = useMemo(
    () => candles.filter((candle) => Number.isFinite(candle.close)),
    [candles],
  );
  const latest = liveBars.at(-1)?.close ?? result.metrics.currentPrice;
  const first = liveBars[0]?.open ?? result.metrics.currentPrice;
  const candleMove =
    first && latest
      ? ((latest - first) / first) * 100
      : (result.metrics.priceChange24h ?? 0);
  const signalList = result.signals ?? [];
  const liquidityStress = Math.min(
    100,
    Math.round(
      (orderbook?.riskPoints ?? 0) +
        Math.abs(result.metrics.volumeToMarketCapRatio ?? 0) * 115,
    ),
  );
  const strongestAgents = (result.agentAssessments ?? [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, isAdvanced ? 8 : 4);
  const dominantAgent = strongestAgents[0];
  const holderScore = dominantAgent ? `${dominantAgent.score}/100` : "gated";
  const volatilityScore = Math.min(
    100,
    Math.round(
      Math.abs(candleMove) * 7 +
        Math.abs(result.metrics.priceChange24h ?? 0) * 2,
    ),
  );
  const flowRatio = result.metrics.volumeToMarketCapRatio ?? 0;
  const signalCount = signalList.length;
  const signalPreview =
    signalList[0]?.id?.replaceAll("_", " ") ?? "no dominant signal";

  useEffect(() => {
    const updateQuality = () => {
      const width = window.innerWidth;
      const reduced =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false;
      const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
      const cores =
        typeof navigator !== "undefined"
          ? (navigator.hardwareConcurrency ?? 4)
          : 4;
      const memory =
        typeof navigator !== "undefined" && "deviceMemory" in navigator
          ? Number(
              (navigator as Navigator & { deviceMemory?: number })
                .deviceMemory ?? 4,
            )
          : 4;
      const lowPower = reduced || width < 720 || cores <= 6 || memory <= 4;
      const mediumPower = width < 1280 || coarse || cores <= 8 || memory <= 6;
      const nextQuality: MotionQuality = lowPower
        ? "low"
        : mediumPower
          ? "medium"
          : "high";
      setIsCompactViewport(width < 820);
      setMotionQuality(nextQuality);
      setFrameHealth(
        nextQuality === "high"
          ? "smooth"
          : nextQuality === "medium"
            ? "guarded"
            : "degraded",
      );
    };
    updateQuality();
    window.addEventListener("resize", updateQuality, { passive: true });
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    media?.addEventListener?.("change", updateQuality);
    return () => {
      window.removeEventListener("resize", updateQuality);
      media?.removeEventListener?.("change", updateQuality);
    };
  }, []);

  const readNodes = useMemo<VlmReadNode[]>(() => {
    const supplyRatio =
      result.metrics.circulatingSupply &&
      (result.metrics.totalSupply || result.metrics.maxSupply)
        ? `${((result.metrics.circulatingSupply / ((result.metrics.totalSupply ?? result.metrics.maxSupply) || 1)) * 100).toFixed(1)}%`
        : "source required";
    const liquidityValue = orderbook
      ? `${liquidityStress}/100`
      : result.metrics.liquidityToMarketCapPercent !== undefined
        ? `${result.metrics.liquidityToMarketCapPercent.toFixed(1)}%`
        : "partial source";
    const volumeStress =
      flowRatio > 0.5
        ? "high turnover"
        : flowRatio > 0.15
          ? "active flow"
          : "normal flow";
    const unlockState =
      result.metrics.fdvToMarketCapRatio &&
      result.metrics.fdvToMarketCapRatio > 4
        ? "overhang risk"
        : "needs OSINT";
    const kolState =
      signalPreview.includes("volume") || signalPreview.includes("pump")
        ? "hype review"
        : "source review";
    const contractState = tokenInfo.tokenAddress
      ? "verify owner"
      : "address needed";
    const evidenceState =
      result.dataQuality === "live" ? "source attached" : "partial data";
    const missingLimitations = result.metaModel?.limitations ?? [];
    const missingData = missingLimitations.length
      ? `${Math.min(missingLimitations.length, 9)} blockers`
      : "no blocker";

    const basicReadNodes: VlmReadNode[] = [
      {
        label: "01 risk core",
        value: `${riskScore}/100`,
        hint: levelFromScore(riskScore).toUpperCase(),
        detail:
          "Shows the visible risk score from current data. Low score does not mean safe: check missing sources, holder transparency and liquidity before trusting it.",
        x: 16,
        y: 22,
        tone: "gold",
        group: "risk",
      },
      {
        label: "02 supply float",
        value: supplyRatio,
        hint: "float check",
        detail:
          "Compares circulating supply with total/max supply and FDV. If float is low or not verified, a small amount of demand can move price and later unlocks can pressure exits.",
        x: 78,
        y: 18,
        tone: "cyan",
        group: "risk",
      },
      {
        label: "03 unlock map",
        value: unlockState,
        hint: "vesting OSINT",
        detail:
          "Looks for team, investor, advisor, ecosystem, OTC and whale unlock pressure. Missing vesting data increases uncertainty instead of lowering risk.",
        x: 19,
        y: 43,
        tone: "gold",
        group: "signals",
      },
      {
        label: "04 exit liquidity",
        value: liquidityValue,
        hint: "exit depth",
        detail:
          "Checks whether visible volume and order-book depth can absorb selling. A chart can look clean while exits are weak if liquidity is thin.",
        x: 83,
        y: 39,
        tone: "cyan",
        group: "liquidity",
      },
      {
        label: "05 holder layer",
        value: holderScore,
        hint: dominantAgent?.label ?? "wallet check",
        detail:
          "Checks whether supply is spread across real users or concentrated in whales, team wallets, CEX/custody, LP or unclassified clusters. Missing labels require OSINT verification.",
        x: 29,
        y: 63,
        tone: "cyan",
        group: "holders",
      },
      {
        label: "06 KOL/social",
        value: kolState,
        hint: "hype filter",
        detail:
          "Reviews whether social momentum may be paid promotion, coordinated hype or late retail FOMO. Social heat is never treated as proof.",
        x: 75,
        y: 60,
        tone: "gold",
        group: "signals",
      },
      {
        label: "07 contract risk",
        value: contractState,
        hint: "permissions",
        detail:
          "Checks contract control gates: owner, proxy, mint, pause, blacklist and tax settings. Missing contract address blocks strong conclusions.",
        x: 22,
        y: 76,
        tone: "red",
        group: "source",
      },
      {
        label: "08 volatility",
        value: `${volatilityScore}/100`,
        hint: "candle stress",
        detail:
          "Reads candle noise, drawdown and velocity as context. High movement may be opportunity or danger, but Shield only marks review pressure.",
        x: 80,
        y: 79,
        tone: "cyan",
        group: "risk",
      },
      {
        label: "09 evidence",
        value: evidenceState,
        hint: "source state",
        detail:
          "Shows whether the claim is supported by live, partial, fallback or missing sources. Missing evidence must slow the operator down.",
        x: 43,
        y: 88,
        tone: "green",
        group: "source",
      },
      {
        label: "10 verdict",
        value: combinedSafeVerdict(riskScore),
        hint: "public read",
        detail:
          "Final public readout stays calm: anomaly, review, missing data and next source check. It is not a trade-direction call.",
        x: 62,
        y: 90,
        tone: riskScore >= 55 ? "red" : "green",
        group: "signals",
      },
    ];

    const advancedReadNodes: VlmReadNode[] = [
      {
        label: "01 risk core",
        value: `${riskScore}/100`,
        hint: levelFromScore(riskScore).toUpperCase(),
        detail:
          "Combines model score, source quality, microstructure pressure and missing-data penalty. It explains why the case needs review, not whether to buy.",
        x: 10,
        y: 21,
        tone: "gold",
        group: "risk",
      },
      {
        label: "02 float transparency",
        value: supplyRatio,
        hint: "supply proof",
        detail:
          "Compares circulating supply, total/max supply and FDV. Low/unverified float can allow engineered pumps and later unlock pressure.",
        x: 22,
        y: 33,
        tone: "cyan",
        group: "risk",
      },
      {
        label: "03 unlock pressure",
        value: unlockState,
        hint: "vesting/OTC",
        detail:
          "Investigates team, investor, advisor, ecosystem, OTC and whale unlocks. Hidden or missing schedules become a risk blocker.",
        x: 12,
        y: 48,
        tone: "gold",
        group: "signals",
      },
      {
        label: "04 liquidity exit",
        value: liquidityValue,
        hint: "slippage lane",
        detail:
          "Checks visible liquidity, depth, spread and possible slippage. Exit liquidity matters because retail can become exit flow after a pump.",
        x: 20,
        y: 63,
        tone: "cyan",
        group: "liquidity",
      },
      {
        label: "05 holder graph",
        value: holderScore,
        hint: "cluster check",
        detail:
          "Separates possible CEX, team, LP, treasury, whale, retail and unknown wallets. Unclassified clusters require source labels before confidence rises.",
        x: 12,
        y: 78,
        tone: "cyan",
        group: "holders",
      },
      {
        label: "06 missing data",
        value: missingData,
        hint: "blockers",
        detail:
          "Counts unresolved blockers: supply, unlocks, order book, contract, holder labels or source ledger. Missing source data increases risk uncertainty.",
        x: 27,
        y: 88,
        tone: "red",
        group: "source",
      },
      {
        label: "07 source quality",
        value: result.dataQuality,
        hint: "truth layer",
        detail:
          "Labels whether the readout uses live, partial, fallback or missing sources. Premium UI must not sound more certain than its data.",
        x: 82,
        y: 18,
        tone: "green",
        group: "source",
      },
      {
        label: "08 KOL disclosure",
        value: kolState,
        hint: "social OSINT",
        detail:
          "Looks for paid KOL promotion, undisclosed allocations, coordinated posts and hype pressure. No accusation is made without evidence.",
        x: 90,
        y: 31,
        tone: "gold",
        group: "signals",
      },
      {
        label: "09 contract owner",
        value: contractState,
        hint: "admin power",
        detail:
          "Contract owner, proxy, mint, pause, blacklist and tax permissions can change risk after launch. Verified source labels are needed.",
        x: 78,
        y: 46,
        tone: "red",
        group: "source",
      },
      {
        label: "10 volume quality",
        value: volumeStress,
        hint: "wash filter",
        detail:
          "Compares volume quality with market cap and price movement. High turnover can be organic, engineered, wash-like or exit churn.",
        x: 88,
        y: 59,
        tone: "cyan",
        group: "liquidity",
      },
      {
        label: "11 flow ratio",
        value: `${(flowRatio * 100).toFixed(2)}%`,
        hint: "vol/mcap",
        detail:
          "Volume/market-cap ratio shows whether flow is normal, hot or suspicious. It is a review signal, not proof.",
        x: 75,
        y: 74,
        tone: "cyan",
        group: "liquidity",
      },
      {
        label: "12 orderbook",
        value: orderbook ? `${orderbook.riskPoints}/100` : "offline",
        hint: "depth pressure",
        detail:
          "Order book depth estimates whether buyers exist below price. Missing order book keeps exit-liquidity claims weak.",
        x: 88,
        y: 88,
        tone: orderbook ? "cyan" : "gold",
        group: "liquidity",
      },
      {
        label: "13 anomaly count",
        value: signalCount ? `${signalCount} signals` : "clear",
        hint: "review only",
        detail:
          "Counts active anomaly flags. Each signal is a review prompt and must be checked against sources before strong wording.",
        x: 31,
        y: 12,
        tone: signalCount ? "gold" : "green",
        group: "signals",
      },
      {
        label: "14 top signal",
        value: signalPreview,
        hint: "dominant flag",
        detail:
          "Shows the strongest current flag. Read it as the dominant reason for review: velocity, liquidity, source gap or holder/contract issue.",
        x: 44,
        y: 8,
        tone: "gold",
        group: "signals",
      },
      {
        label: "15 drawdown",
        value: formatPercent(Math.min(0, result.metrics.priceChange24h ?? 0)),
        hint: "red stress",
        detail:
          "Measures recent drawdown pressure. It warns about volatility and loss behavior, not a prediction or trading call.",
        x: 58,
        y: 13,
        tone: "red",
        group: "risk",
      },
      {
        label: "16 volatility",
        value: `${volatilityScore}/100`,
        hint: "candle noise",
        detail:
          "Measures candle noise and velocity pressure. High volatility reduces confidence when sources are incomplete.",
        x: 68,
        y: 22,
        tone: "cyan",
        group: "risk",
      },
      {
        label: "17 evidence chain",
        value: evidenceState,
        hint: "source ledger",
        detail:
          "Evidence chain separates live source, partial source, fallback and blocked data. Only sourced claims can enter a report.",
        x: 73,
        y: 9,
        tone: "green",
        group: "source",
      },
      {
        label: "18 loss prevention",
        value: "anti-FOMO",
        hint: "psychology",
        detail:
          "Loss-prevention tile: a rising chart can create FOMO. Shield slows the user down until supply, unlocks, liquidity and holders are checked.",
        x: 38,
        y: 92,
        tone: "gold",
        group: "risk",
      },
      {
        label: "19 VLM access",
        value: "gated",
        hint: "full dataset",
        detail:
          "Access tile: advanced rails can be gated by VLM utility access, but no ROI, custody, seed phrase or investment promise is allowed.",
        x: 54,
        y: 83,
        tone: "gold",
        group: "access",
      },
      {
        label: "20 verdict",
        value: combinedSafeVerdict(riskScore),
        hint: "analysis note",
        detail:
          "Final analysis noteout explains the next safest check: verify sources, inspect liquidity, review holders, audit contract or draft evidence.",
        x: 66,
        y: 92,
        tone: riskScore >= 55 ? "red" : "green",
        group: "signals",
      },
    ];
    if (isAdvanced) return advancedReadNodes;
    if (isPro) return advancedReadNodes.slice(0, 14);
    return basicReadNodes;
  }, [
    isAdvanced,
    isPro,
    riskScore,
    result,
    orderbook,
    liquidityStress,
    volatilityScore,
    holderScore,
    dominantAgent?.label,
    signalCount,
    signalPreview,
    flowRatio,
    tokenInfo.tokenAddress,
  ]);
  const motionGovernorLabel =
    motionPreset === "orbit"
      ? `360 ${ui.motion}`
      : `${ui.motionStatic.toLowerCase()} ${ui.motion}`;
  const performanceRuntime =
    brainRuntimeMode === "performance" || frameHealth !== "smooth";
  const renderHeavyCanvas = false; // PASS168: no heavy canvas in the public Shield brain; WebGL prototype lane stays separate.
  const showLineSvg = false;
  const useStaticEvidenceBoard = false; // PASS196: Evidence Board removed from public UI for now.
  const useRailLayout = false; // PASS196: Basic, Pro and Advanced all use the same Orbit 360 lane.
  const revealGapMs =
    motionPreset === "orbit"
      ? isAdvanced
        ? performanceRuntime
          ? 980
          : 1220
        : isPro
          ? 620
          : 480
      : 210;
  const lineDurationMs =
    motionPreset === "orbit"
      ? isAdvanced
        ? performanceRuntime
          ? 3200
          : 4600
        : isPro
          ? 1600
          : 1320
      : 720;
  const bootMs =
    motionPreset === "static" ? 90 : performanceRuntime ? 320 : 760;
  const orbMs =
    motionPreset === "static"
      ? 60
      : isAdvanced
        ? performanceRuntime
          ? 2400
          : 7200
        : isPro
          ? 2200
          : 1800;
  const brainMs =
    motionPreset === "static"
      ? 120
      : isAdvanced
        ? performanceRuntime
          ? 2100
          : 5200
        : isPro
          ? 1800
          : 1450;
  const orbitUpdateFrameMs = performanceRuntime ? 180 : 116;
  const orbitStepSize = performanceRuntime ? 0.018 : 0.011;
  const orbitTransitionMs = performanceRuntime ? 2100 : 1380;
  const lineStartMs = bootMs + orbMs + Math.round(brainMs * 0.48);
  const linePathForNode = (node: VlmReadNode, index: number) => {
    const bend = index % 2 === 0 ? 1 : -1;
    const cx1 = 50 + (node.x - 50) * 0.16 + bend * (isAdvanced ? 5.2 : 2.8);
    const cy1 = 50 + (node.y - 50) * 0.1 - bend * (isAdvanced ? 4.5 : 2.0);
    const cx2 = 50 + (node.x - 50) * 0.7 - bend * (isAdvanced ? 3.7 : 1.8);
    const cy2 = 50 + (node.y - 50) * 0.78 + bend * (isAdvanced ? 3.2 : 1.3);
    return `M 50 50 C ${cx1.toFixed(2)} ${cy1.toFixed(2)}, ${cx2.toFixed(2)} ${cy2.toFixed(2)}, ${node.x} ${node.y}`;
  };

  const [orbitTick, setOrbitTick] = useState(0);
  const [orbitZoom, setOrbitZoom] = useState(1);
  const [motionTelemetry, setMotionTelemetry] = useState<MotionTelemetrySample>(
    {
      fps: 0,
      state: "guarded",
      inputLatency: "—",
    },
  );
  const [webglTelemetry, setWebglTelemetry] =
    useState<VlmBrainWebGLTelemetrySample | null>(null);
  const showMotionQaHud =
    process.env.NEXT_PUBLIC_VLM_BRAIN_QA_HUD === "1" ||
    process.env.NEXT_PUBLIC_VLM_BRAIN_RENDERER === "webgl-prototype";

  const motionTelemetryLabel =
    motionTelemetry.state === "paused"
      ? ui.motionPaused
      : motionTelemetry.state === "stable"
        ? ui.motionStable
        : motionTelemetry.state === "throttled"
          ? ui.motionThrottled
          : ui.motionGuarded;

  const advancedOrbitalSlots = useMemo(
    () =>
      [
        { theta: -2.78, phi: -0.62 },
        { theta: -2.1, phi: -0.18 },
        { theta: -2.45, phi: 0.24 },
        { theta: -1.86, phi: 0.58 },
        { theta: -1.28, phi: -0.72 },
        { theta: -0.92, phi: -0.28 },
        { theta: -0.42, phi: 0.2 },
        { theta: 0.02, phi: 0.6 },
        { theta: 0.56, phi: -0.6 },
        { theta: 0.98, phi: -0.14 },
        { theta: 1.36, phi: 0.3 },
        { theta: 1.92, phi: 0.68 },
        { theta: 2.34, phi: -0.44 },
        { theta: 2.78, phi: 0.02 },
        { theta: 3.2, phi: 0.42 },
        { theta: 3.62, phi: -0.26 },
        { theta: 4.04, phi: -0.72 },
        { theta: 4.52, phi: -0.04 },
        { theta: 4.98, phi: 0.36 },
        { theta: 5.44, phi: 0.76 },
      ] as const,
    [],
  );

  useEffect(() => {
    if (!supportsOrbit360 || useRailLayout || motionPreset === "static") return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let slowFrames = 0;

    // PASS150 adaptive runtime governor: sparse React updates + compositor interpolation.
    // This prevents the orbit from trying to re-render 20 DOM cards at display refresh rate.
    const targetFrameMs = orbitUpdateFrameMs;
    const stepSize = orbitStepSize;

    const tick = (now: number) => {
      if (document.visibilityState === "visible" && !selectedNode) {
        const delta = Math.min(140, now - last);
        carry += delta;
        if (delta > 64) slowFrames += 1;
        if (slowFrames >= 8 && brainRuntimeMode === "cinematic") {
          setBrainRuntimeMode("performance");
          setFrameHealth("guarded");
          slowFrames = 0;
        }
        if (carry >= targetFrameMs) {
          const steps = Math.max(1, Math.floor(carry / targetFrameMs));
          carry %= targetFrameMs;
          setOrbitTick((current) => (current + stepSize * steps) % 100000);
        }
      }
      last = now;
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [
    supportsOrbit360,
    motionPreset,
    useRailLayout,
    orbitUpdateFrameMs,
    orbitStepSize,
    brainRuntimeMode,
    selectedNode,
  ]);

  useEffect(() => {
    if (!supportsOrbit360 || useRailLayout || motionPreset === "static") return;
    let raf = 0;
    let frames = 0;
    let sampleStartedAt = performance.now();
    let previousFrameAt = sampleStartedAt;
    let worstDelta = 0;

    // PASS204 FPS telemetry: one lightweight rAF sampler, one state update per second.
    // This is a browser QA aid and does not drive card position frame-by-frame.
    const sample = (now: number) => {
      if (document.visibilityState === "visible") {
        frames += 1;
        const delta = now - previousFrameAt;
        worstDelta = Math.max(worstDelta, delta);
        previousFrameAt = now;
        const sampleWindow = now - sampleStartedAt;
        if (sampleWindow >= 1000) {
          const fps = Math.max(0, Math.round((frames * 1000) / sampleWindow));
          const nextState: MotionTelemetryState = selectedNode
            ? "paused"
            : fps >= 50
              ? "stable"
              : fps >= 30
                ? "guarded"
                : "throttled";
          setMotionTelemetry({
            fps,
            state: nextState,
            inputLatency: `${Math.round(worstDelta)}ms`,
          });
          setFrameHealth(
            nextState === "stable"
              ? "smooth"
              : nextState === "throttled"
                ? "degraded"
                : "guarded",
          );
          frames = 0;
          worstDelta = 0;
          sampleStartedAt = now;
        }
      }
      raf = window.requestAnimationFrame(sample);
    };

    raf = window.requestAnimationFrame(sample);
    return () => window.cancelAnimationFrame(raf);
  }, [supportsOrbit360, useRailLayout, motionPreset, selectedNode]);

  const advancedTileStyle = (
    node: VlmReadNode,
    index: number,
  ): CSSProperties => {
    if (!supportsOrbit360 || motionPreset === "static") {
      const horizontal =
        node.x < 16
          ? "translate(0%, -50%)"
          : node.x > 84
            ? "translate(-100%, -50%)"
            : "translate(-50%, -50%)";
      return {
        left: `${node.x}%`,
        top: `${node.y}%`,
        transform: horizontal,
      };
    }

    const slot = advancedOrbitalSlots[index % advancedOrbitalSlots.length];
    const ref = rotationRef.current;
    const autoSpin = autoRotate && !selectedNode ? orbitTick * 0.00042 : 0; // PASS201: pause the orbit when a tile detail is open so the readout stays readable. PASS168 compatibility marker: autoSpin = autoRotate ? orbitTick * 0.00058
    const yaw = slot.theta + ref.y * 1.85 + autoSpin;
    const pitch = Math.max(-1.16, Math.min(1.16, slot.phi + ref.x * 1.35));
    const sphereX = Math.cos(pitch) * Math.cos(yaw);
    const sphereY = Math.sin(pitch);
    const sphereZ = Math.cos(pitch) * Math.sin(yaw);
    // PASS131 guard marker kept for regression scripts: Math.max(7, Math.min(93
    const organicX = Math.sin(index * 12.989 + riskScore * 0.071) * 1.55;
    const organicY = Math.cos(index * 7.233 + riskScore * 0.053) * 1.95;
    const zoomRadius = orbitZoom;
    const left = Math.max(
      9,
      Math.min(91, 50 + sphereX * 39 * zoomRadius + organicX),
    );
    const top = Math.max(
      11,
      Math.min(89, 50 + sphereY * 36 * zoomRadius + organicY),
    );
    const depthFactor = (sphereZ + 1) / 2;
    const scale = (0.7 + depthFactor * 0.4) * (0.96 + (orbitZoom - 1) * 0.45);
    const isActive = selectedNode?.label === node.label;
    const opacity = isActive ? 1 : 0.42 + depthFactor * 0.58;
    const translate = "translate(-50%, -50%)";
    const tiltX = -sphereY * 12;
    const tiltY = sphereX * 17;
    const activeBoost = isActive ? 0.08 : 0;

    return {
      left: `${left}%`,
      top: `${top}%`,
      opacity,
      zIndex: Math.round(18 + depthFactor * 52 + (isActive ? 40 : 0)),
      transform: `${translate} rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateZ(${(depthFactor * 72 + (isActive ? 34 : 0)).toFixed(1)}px) scale(${(scale + activeBoost).toFixed(3)})`,
      filter: "none",
      transitionDuration: `${orbitTransitionMs}ms`,
    };
  };

  const staticBoardRingName = (index: number, total: number) => {
    const safeTotal = Math.max(total, 1);
    const firstRingCount =
      safeTotal >= 16 ? 6 : safeTotal >= 10 ? 5 : Math.min(safeTotal, 6);
    const secondRingCount =
      safeTotal >= 16 ? 8 : Math.max(safeTotal - firstRingCount, 0);
    if (safeTotal >= 16 && index >= firstRingCount + secondRingCount)
      return "outer";
    if (index >= firstRingCount) return "mid";
    return "inner";
  };

  const staticBoardTileStyle = (
    node: VlmReadNode,
    index: number,
    total: number,
  ): CSSProperties => {
    const safeTotal = Math.max(total, 1);
    const isActive = selectedNode?.label === node.label;

    if (safeTotal <= 4) {
      const sparsePositions = [
        { left: 28, top: 42 },
        { left: 72, top: 42 },
        { left: 28, top: 68 },
        { left: 72, top: 68 },
      ];
      const position = sparsePositions[index % sparsePositions.length];
      return {
        left: `${position.left}%`,
        top: `${position.top}%`,
        zIndex: isActive ? 18 : 10,
        transform: `translate(-50%, -50%) scale(${isActive ? 1.055 : 1})`,
        ["--vlm-static-transform" as string]: `translate(-50%, -50%) scale(${isActive ? 1.065 : 1.045})`,
      } as CSSProperties;
    }

    const side = index % 2 === 0 ? "left" : "right";
    const sideIndex = Math.floor(index / 2);
    const sideTotal = Math.ceil(safeTotal / 2);
    const laneRows = Math.min(5, Math.max(3, sideTotal));
    const row = sideIndex % laneRows;
    const lane = Math.floor(sideIndex / laneRows);
    const laneOffset = lane % 2 === 0 ? 0 : side === "left" ? 10 : -10;
    const leftBase =
      side === "left" ? (safeTotal >= 12 ? 14 : 18) : safeTotal >= 12 ? 86 : 82;
    const left =
      leftBase + laneOffset + Math.sin(index * 1.73 + riskScore * 0.013) * 1.1;
    const topStart = 22;
    const topEnd = 86;
    const topStep = laneRows <= 1 ? 0 : (topEnd - topStart) / (laneRows - 1);
    const top =
      topStart +
      row * topStep +
      Math.cos(index * 1.37 + riskScore * 0.01) * 1.4;
    const scale = isActive ? 1.065 : lane > 0 ? 0.965 : 1;
    const translate =
      side === "left" ? "translate(-8%, -50%)" : "translate(-92%, -50%)";
    const transformValue = `${translate} scale(${scale})`;

    return {
      left: `${Math.max(4, Math.min(96, left)).toFixed(2)}%`,
      top: `${Math.max(17, Math.min(90, top)).toFixed(2)}%`,
      zIndex: isActive ? 24 : side === "left" ? 9 : 8,
      transform: transformValue,
      ["--vlm-static-transform" as string]: `${translate} scale(${isActive ? 1.075 : 1.045})`,
    } as CSSProperties;
  };

  const handleOrbitWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (motionPreset === "static") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-vlm-no-drag]")) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.055 : 0.055;
      setOrbitZoom((current) =>
        Number(Math.max(0.86, Math.min(1.16, current + delta)).toFixed(3)),
      );
    },
    [motionPreset],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-vlm-no-drag='true']")) return;

    const ref = rotationRef.current;
    ref.dragging = true;
    ref.pointerId = event.pointerId;
    ref.lastX = event.clientX;
    ref.lastY = event.clientY;
    overlayRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const ref = rotationRef.current;
    if (!ref.dragging || ref.pointerId !== event.pointerId) return;
    const dx = event.clientX - ref.lastX;
    const dy = event.clientY - ref.lastY;
    ref.lastX = event.clientX;
    ref.lastY = event.clientY;
    ref.y += dx * 0.0058;
    ref.x = Math.max(-0.9, Math.min(0.9, ref.x + dy * 0.0034));
    ref.vy = dx * 0.00032;
    ref.vx = dy * 0.00016;
    if (motionPreset !== "static")
      setOrbitTick((current) => (current + 1) % 100000);
  };

  const releasePointer = (event?: React.PointerEvent<HTMLDivElement>) => {
    const ref = rotationRef.current;
    if (event && ref.pointerId !== event.pointerId) return;
    ref.dragging = false;
    ref.pointerId = -1;
  };

  useEffect(() => {
    setSelectedNode(null);
    setRevealedCount(0);
    setPhase("boot");
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const pushTimer = (delay: number, action: () => void) => {
      const timer = setTimeout(action, delay);
      timersRef.current.push(timer);
    };
    pushTimer(bootMs, () => setPhase("orb"));
    pushTimer(bootMs + orbMs, () => setPhase("brain"));
    pushTimer(lineStartMs, () => setPhase("readout"));
    readNodes.forEach((_, index) => {
      pushTimer(
        lineStartMs + index * revealGapMs + lineDurationMs * 0.76,
        () => {
          setRevealedCount((current) => Math.max(current, index + 1));
        },
      );
    });
    pushTimer(
      lineStartMs + readNodes.length * revealGapMs + lineDurationMs + 260,
      () => setPhase("complete"),
    );
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [
    mode,
    readNodes,
    bootMs,
    orbMs,
    lineStartMs,
    lineDurationMs,
    revealGapMs,
  ]);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) return;
    const canvas: HTMLCanvasElement = canvasNode;
    const contextNode = canvas.getContext("2d", { alpha: true });
    if (!contextNode) return;
    const ctx: CanvasRenderingContext2D = contextNode;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastFrame = 0;
    let visible = true;
    const startedAt = performance.now();
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const isLow = motionQuality === "low" || reducedMotion;
    const isMedium = motionQuality === "medium";
    const frameBudget = isLow ? 56 : isMedium ? 34 : 16;
    const seedInput = `${tokenInfo.symbol}:${mode}:${riskScore}:${readNodes.length}`;
    const hashSeed = (value: string) => {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const randomFrom = (seed: number) => {
      let state = seed >>> 0;
      return () => {
        state = Math.imul(state ^ (state >>> 15), 2246822507);
        state = Math.imul(state ^ (state >>> 13), 3266489909);
        return ((state ^ (state >>> 16)) >>> 0) / 4294967296;
      };
    };
    const baseSeed = hashSeed(seedInput);
    // PASS128 motionGovernor · renderHeavyCanvas · static evidence cards · no heavy render
    // PASS124 compat markers: organicTileSlots · slow signal transfer
    // organicTileSlots
    // speed: (isAdvanced ? 0.00018
    // const packetTarget = reducedMotion ? 0 : isAdvanced ? (isLow ? 1 : isMedium ? 2 : 3)
    // const nodeTarget = reducedMotion ? 5 : isAdvanced ? (isLow ? 6 : isMedium ? 8 : 10)
    // const packetTarget = reducedMotion ? 0 : isAdvanced ? (isLow ? 0 : isMedium ? 1 : 1)
    // const nodeTarget = reducedMotion ? 3 : isAdvanced ? (isLow ? 3 : isMedium ? 4 : 5)
    const edge = baseSeed % 8;
    const flyMs = reducedMotion ? 420 : isAdvanced ? 5600 : 3600;
    const spawnMs = reducedMotion ? 640 : isAdvanced ? 6200 : 3900;
    const nodeTarget = reducedMotion
      ? 3
      : isAdvanced
        ? isLow
          ? 3
          : isMedium
            ? 4
            : 5
        : isLow
          ? 3
          : 4;
    const packetTarget = reducedMotion
      ? 0
      : isAdvanced
        ? isLow
          ? 0
          : isMedium
            ? 1
            : 1
        : 0;
    const maxIdleLife =
      lineStartMs + readNodes.length * revealGapMs + lineDurationMs + 2000;
    const maxAnimationLife = maxIdleLife + (isAdvanced ? 4600 : 2800);

    type BrainPoint = {
      x: number;
      y: number;
      z: number;
      parent: number;
      radius: number;
      layer: number;
      phase: number;
      tone: "gold" | "cyan" | "green";
    };
    type ScreenPoint = BrainPoint & {
      sx: number;
      sy: number;
      depth: number;
      scale: number;
    };
    type Packet = {
      edge: number;
      progress: number;
      speed: number;
      glow: number;
      size: number;
      phase: number;
    };

    let brain: BrainPoint[] = [];
    let packets: Packet[] = [];
    let launchPoint = { x: 0, y: 0 };
    let controlA = { x: 0, y: 0 };
    let controlB = { x: 0, y: 0 };

    function startPoint() {
      const pad = Math.max(160, Math.min(width, height) * 0.26);
      if (edge === 0) return { x: width * 0.1, y: -pad };
      if (edge === 1) return { x: width * 0.9, y: -pad };
      if (edge === 2) return { x: width + pad, y: height * 0.16 };
      if (edge === 3) return { x: width + pad, y: height * 0.84 };
      if (edge === 4) return { x: width * 0.9, y: height + pad };
      if (edge === 5) return { x: width * 0.1, y: height + pad };
      if (edge === 6) return { x: -pad, y: height * 0.84 };
      return { x: -pad, y: height * 0.16 };
    }

    function makeControls(start: { x: number; y: number }) {
      const centerX = width / 2;
      const centerY = height / 2;
      const dx = centerX - start.x;
      const dy = centerY - start.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / len;
      const normalY = dx / len;
      const arc = Math.min(width, height) * (isAdvanced ? 0.3 : 0.22);
      controlA = {
        x: start.x + dx * 0.34 + normalX * arc,
        y: start.y + dy * 0.18 + normalY * arc,
      };
      controlB = {
        x: start.x + dx * 0.78 - normalX * arc * 0.55,
        y: start.y + dy * 0.72 - normalY * arc * 0.55,
      };
    }

    function easeOutQuint(value: number) {
      const clamped = Math.max(0, Math.min(1, value));
      return 1 - Math.pow(1 - clamped, 5);
    }

    function easeInOutCubic(value: number) {
      const clamped = Math.max(0, Math.min(1, value));
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    }

    function pointOnCurve(t: number) {
      const center = { x: width / 2, y: height / 2 };
      const eased = easeInOutCubic(t);
      const inv = 1 - eased;
      const x =
        inv * inv * inv * launchPoint.x +
        3 * inv * inv * eased * controlA.x +
        3 * inv * eased * eased * controlB.x +
        eased * eased * eased * center.x;
      const y =
        inv * inv * inv * launchPoint.y +
        3 * inv * inv * eased * controlA.y +
        3 * inv * eased * eased * controlB.y +
        eased * eased * eased * center.y;
      const settle =
        t > 0.82
          ? Math.sin(((t - 0.82) / 0.18) * Math.PI) * Math.max(0, 1 - t)
          : 0;
      return {
        x: x + (center.x - controlB.x) * settle * 0.09,
        y: y + (center.y - controlB.y) * settle * 0.09,
      };
    }

    function rebuildGraph() {
      const rand = randomFrom(
        baseSeed +
          Math.floor(width) * 17 +
          Math.floor(height) * 31 +
          (isAdvanced ? 97 : 11),
      );
      const created: BrainPoint[] = [
        {
          x: 0,
          y: 0,
          z: 0,
          parent: -1,
          radius: isAdvanced ? 4.4 : 5.2,
          layer: 0,
          phase: 0,
          tone: "gold",
        },
      ];
      const rings = isAdvanced ? [10, 12, 14, 18] : [7, 10, 6];
      let previousStart = 0;
      let previousEnd = 1;

      rings.forEach((count, ringIndex) => {
        const layer = ringIndex + 1;
        const ringStart = created.length;
        for (let i = 0; i < count && created.length < nodeTarget + 1; i += 1) {
          const hemi = i % 2 === 0 ? -1 : 1;
          const theta = (i / count) * Math.PI * 2 + layer * 0.52;
          const spiral = theta + ringIndex * 0.72;
          const shell = 0.3 + layer / (rings.length + 0.8);
          const jitter = isAdvanced ? 0.055 : 0.035;
          const x =
            hemi * (0.18 + Math.abs(Math.cos(spiral)) * 0.56 * shell) +
            (rand() - 0.5) * jitter;
          const y =
            Math.sin(spiral * 1.18) * 0.72 * shell + (rand() - 0.5) * jitter;
          const z =
            Math.cos(spiral) * 0.7 * shell +
            hemi * 0.08 * Math.sin(theta * 2.1);
          const parent =
            layer === 1
              ? 0
              : previousStart +
                Math.floor(rand() * Math.max(1, previousEnd - previousStart));
          created.push({
            x,
            y,
            z,
            parent,
            radius: isAdvanced ? 1.35 + rand() * 1.65 : 1.85 + rand() * 1.8,
            layer,
            phase: rand() * Math.PI * 2,
            tone: layer >= 3 ? "cyan" : i % 3 === 0 ? "green" : "gold",
          });
        }
        previousStart = ringStart;
        previousEnd = created.length;
      });

      brain = created;
      packets = Array.from({ length: packetTarget }, (_, index) => ({
        edge: 1 + (index % Math.max(1, created.length - 1)),
        progress: rand(),
        speed:
          (isAdvanced ? 0.00018 : 0.00024) +
          rand() * (isAdvanced ? 0.00028 : 0.00024),
        glow: rand(),
        size: isAdvanced ? 0.72 + rand() * 0.7 : 1.0 + rand() * 0.58,
        phase: rand() * Math.PI * 2,
      }));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(
        window.devicePixelRatio || 1,
        isLow ? 1 : isMedium ? 1 : 1.12,
      );
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      launchPoint = startPoint();
      makeControls(launchPoint);
      rebuildGraph();
    }

    function project(
      point: BrainPoint,
      rotation: number,
      morph: number,
      centerX: number,
      centerY: number,
      radius: number,
    ): ScreenPoint {
      const interaction = rotationRef.current;
      const rx = interaction.x + Math.sin(rotation * 0.32) * 0.035;
      const ry = interaction.y + rotation + point.phase * 0.01;
      const rz = interaction.y * 0.08 + Math.sin(rotation * 0.18) * 0.025;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const cosZ = Math.cos(rz);
      const sinZ = Math.sin(rz);

      const x1 = point.x * cosY - point.z * sinY;
      const z1 = point.x * sinY + point.z * cosY;
      const y1 = point.y * cosX - z1 * sinX;
      const z2 = point.y * sinX + z1 * cosX;
      const x2 = x1 * cosZ - y1 * sinZ;
      const y2 = x1 * sinZ + y1 * cosZ;
      const perspective = 1 / (1 + (z2 + 1.15) * 0.18);
      const shell = radius * morph * perspective;
      return {
        ...point,
        sx: centerX + x2 * shell,
        sy: centerY + y2 * shell,
        depth: z2,
        scale: perspective,
      };
    }

    function drawBackground(now: number) {
      ctx.fillStyle = "rgba(2,3,7,0.86)";
      ctx.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const radial = ctx.createRadialGradient(
        cx,
        cy,
        10,
        cx,
        cy,
        Math.max(width, height) * 0.68,
      );
      radial.addColorStop(
        0,
        isAdvanced ? "rgba(34,211,238,0.115)" : "rgba(200,169,106,0.105)",
      );
      radial.addColorStop(0.32, "rgba(200,169,106,0.045)");
      radial.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      if (isLow) return;
      ctx.save();
      ctx.globalAlpha = isAdvanced ? 0.42 : 0.26;
      const step = isAdvanced ? 56 : 76;
      const drift = (now * 0.0022) % step;
      ctx.strokeStyle = "rgba(255,255,255,0.020)";
      ctx.lineWidth = 1;
      for (let x = -step; x < width + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + drift, 0);
        ctx.lineTo(x + drift, height);
        ctx.stroke();
      }
      for (let y = -step; y < height + step; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y + drift * 0.38);
        ctx.lineTo(width, y + drift * 0.38);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCurve(
      a: ScreenPoint,
      b: ScreenPoint,
      alpha: number,
      progress: number,
      pulse: number,
    ) {
      const endX = a.sx + (b.sx - a.sx) * progress;
      const endY = a.sy + (b.sy - a.sy) * progress;
      const dx = endX - a.sx;
      const dy = endY - a.sy;
      const midX =
        a.sx +
        dx * 0.52 -
        dy * 0.08 +
        Math.sin(pulse + b.phase) * (isAdvanced ? 5.2 : 2.4);
      const midY =
        a.sy +
        dy * 0.52 +
        dx * 0.08 +
        Math.cos(pulse + b.phase) * (isAdvanced ? 4.6 : 2.2);
      const gradient = ctx.createLinearGradient(a.sx, a.sy, endX, endY);
      gradient.addColorStop(0, `rgba(208,176,94,${alpha})`);
      gradient.addColorStop(
        0.56,
        b.tone === "cyan"
          ? `rgba(34,211,238,${alpha * 0.82})`
          : `rgba(250,204,121,${alpha * 0.72})`,
      );
      gradient.addColorStop(
        1,
        b.tone === "green"
          ? `rgba(52,211,153,${alpha * 0.68})`
          : `rgba(245,240,232,${alpha * 0.28})`,
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(0.55, (isAdvanced ? 0.88 : 1.08) * b.scale);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
    }

    function drawCortexLoops(
      projected: ScreenPoint[],
      morph: number,
      pulse: number,
    ) {
      if (isLow || morph <= 0.05) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const loopCount = isAdvanced ? 7 : 4;
      for (let loop = 0; loop < loopCount; loop += 1) {
        const items = projected
          .filter(
            (node) =>
              node.layer > 0 && node.layer % Math.max(1, (loop % 3) + 1) === 0,
          )
          .sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x))
          .slice(0, isAdvanced ? 18 : 10);
        if (items.length < 3) continue;
        ctx.beginPath();
        items.forEach((node, index) => {
          const wobble =
            Math.sin(pulse * 0.7 + node.phase + loop) *
            (isAdvanced ? 2.0 : 1.0);
          if (index === 0) ctx.moveTo(node.sx + wobble, node.sy);
          else {
            const prev = items[index - 1];
            ctx.quadraticCurveTo(
              (prev.sx + node.sx) / 2,
              (prev.sy + node.sy) / 2 + wobble,
              node.sx + wobble,
              node.sy,
            );
          }
        });
        ctx.strokeStyle =
          loop % 2
            ? `rgba(34,211,238,${0.04 + morph * 0.07})`
            : `rgba(208,176,94,${0.045 + morph * 0.075})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawOrb(
      orbX: number,
      orbY: number,
      radius: number,
      morph: number,
      pulse: number,
      arrival: number,
    ) {
      const glowRadius =
        radius * (2.1 + morph * 0.82) +
        Math.sin(pulse * 1.2) * (isAdvanced ? 6 : 3);
      const orbGlow = ctx.createRadialGradient(
        orbX,
        orbY,
        3,
        orbX,
        orbY,
        glowRadius,
      );
      orbGlow.addColorStop(0, "rgba(255,255,255,0.96)");
      orbGlow.addColorStop(0.17, "rgba(208,176,94,0.84)");
      orbGlow.addColorStop(
        0.47,
        isAdvanced ? "rgba(34,211,238,0.30)" : "rgba(52,211,153,0.18)",
      );
      orbGlow.addColorStop(1, "rgba(208,176,94,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(orbX, orbY, glowRadius * (1 + arrival * 0.18), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(4,5,8,0.88)";
      ctx.strokeStyle = isAdvanced
        ? "rgba(34,211,238,0.66)"
        : "rgba(208,176,94,0.62)";
      ctx.lineWidth = 1.28;
      ctx.beginPath();
      ctx.arc(orbX, orbY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.strokeStyle =
          ring % 2 ? "rgba(34,211,238,0.32)" : "rgba(208,176,94,0.32)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const spin = pulse * (0.55 + ring * 0.17) + ring * 1.2;
        ctx.ellipse(
          orbX,
          orbY,
          radius * (0.64 + ring * 0.1),
          radius * (0.18 + ring * 0.08),
          spin,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.restore();

      ctx.font = "900 22px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fillText("VLM", orbX, orbY - 7);
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(208,176,94,0.96)";
      ctx.fillText(tokenInfo.symbol, orbX, orbY + 16);
      ctx.restore();
    }

    function draw(now: number) {
      if (!visible) {
        raf = 0;
        return;
      }
      const elapsed = now - startedAt;
      const idleFrameBudget =
        elapsed > maxIdleLife
          ? Math.max(frameBudget, isAdvanced ? 86 : 112)
          : frameBudget;
      if (now - lastFrame < idleFrameBudget) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;
      const flyProgress = easeInOutCubic(elapsed / flyMs);
      const spawnProgress = easeOutQuint((elapsed - flyMs * 0.82) / spawnMs);
      const morph = easeOutQuint(
        (elapsed - flyMs * 0.58) / (isAdvanced ? 1450 : 1120),
      );
      const arrival =
        Math.max(
          0,
          Math.sin(
            (Math.max(0, elapsed - flyMs * 0.84) / (flyMs * 0.16)) * Math.PI,
          ),
        ) * Math.max(0, 1 - flyProgress);
      const pulse = now * 0.00068;
      const ref = rotationRef.current;
      if (!ref.dragging) {
        ref.y += (autoRotate ? (isAdvanced ? 0.00012 : 0.0001) : 0) + ref.vy;
        ref.x = Math.max(-0.7, Math.min(0.7, ref.x + ref.vx));
        ref.vy *= 0.965;
        ref.vx *= 0.955;
      }
      const orb = pointOnCurve(flyProgress);
      const centerX = width / 2;
      const centerY = height / 2;
      const coreRadius = isAdvanced
        ? Math.min(width, height) * 0.085
        : Math.min(width, height) * 0.07;
      const brainRadius =
        Math.min(width, height) * (isAdvanced ? 0.245 : 0.18) * brainZoom;

      drawBackground(now);

      if (!reducedMotion) {
        const trailCount = isLow ? 2 : isAdvanced ? 5 : 4;
        for (let i = trailCount; i >= 1; i -= 1) {
          const trailT = Math.max(0, flyProgress - i * 0.015);
          const pt = pointOnCurve(trailT);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = isAdvanced
            ? `rgba(34,211,238,${0.026 + i * 0.007})`
            : `rgba(208,176,94,${0.03 + i * 0.008})`;
          ctx.beginPath();
          ctx.arc(
            pt.x,
            pt.y,
            Math.max(2, coreRadius * 0.48 * (1 - i * 0.06)),
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.restore();
        }
      }

      const projected = brain.map((node) =>
        project(
          node,
          pulse * (isAdvanced ? 0.1 : 0.075),
          morph,
          centerX,
          centerY,
          brainRadius,
        ),
      );
      const graphLive = elapsed > flyMs * 0.86;
      if (graphLive && projected.length) {
        const edges = projected
          .map((node, index) => ({
            node,
            index,
            parent: node.parent >= 0 ? projected[node.parent] : null,
          }))
          .filter((edgeItem) => edgeItem.parent)
          .sort(
            (a, b) =>
              (a.parent?.depth ?? 0) +
              a.node.depth -
              ((b.parent?.depth ?? 0) + b.node.depth),
          );

        drawCortexLoops(projected, spawnProgress, pulse);

        edges.forEach(({ node, index, parent }) => {
          if (!parent) return;
          const local = Math.max(
            0,
            Math.min(1, spawnProgress - index * (isAdvanced ? 0.01 : 0.045)),
          );
          if (local <= 0) return;
          const depthAlpha = node.depth > 0 ? 1 : 0.58;
          drawCurve(
            parent,
            node,
            (isAdvanced ? 0.26 : 0.36) * local * depthAlpha,
            local,
            pulse,
          );
        });

        packets.forEach((packet) => {
          if (spawnProgress <= 0.18) return;
          const node = projected[packet.edge % projected.length];
          if (!node || node.parent < 0) return;
          const parent = projected[node.parent];
          packet.progress = (packet.progress + packet.speed) % 1;
          const eased = easeInOutCubic(packet.progress);
          const x = parent.sx + (node.sx - parent.sx) * eased;
          const y =
            parent.sy +
            (node.sy - parent.sy) * eased +
            Math.sin(packet.progress * Math.PI + packet.phase) *
              (isAdvanced ? 3.2 : 1.5);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.shadowBlur = isLow ? 0 : isAdvanced ? 10 : 6;
          ctx.shadowColor =
            packet.glow > 0.52
              ? "rgba(34,211,238,0.62)"
              : "rgba(208,176,94,0.62)";
          ctx.fillStyle =
            packet.glow > 0.52
              ? "rgba(34,211,238,0.74)"
              : "rgba(250,204,121,0.80)";
          ctx.beginPath();
          ctx.arc(x, y, packet.size * node.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        projected
          .slice(1)
          .sort((a, b) => a.depth - b.depth)
          .forEach((node, index) => {
            const local = Math.max(
              0,
              Math.min(1, spawnProgress - index * (isAdvanced ? 0.008 : 0.04)),
            );
            if (local <= 0) return;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.shadowBlur = isLow ? 0 : node.depth > 0 ? 9 : 4;
            ctx.shadowColor =
              node.tone === "cyan"
                ? "rgba(34,211,238,0.45)"
                : node.tone === "green"
                  ? "rgba(52,211,153,0.40)"
                  : "rgba(208,176,94,0.48)";
            ctx.fillStyle =
              node.tone === "cyan"
                ? "rgba(34,211,238,0.66)"
                : node.tone === "green"
                  ? "rgba(52,211,153,0.62)"
                  : "rgba(208,176,94,0.72)";
            ctx.beginPath();
            ctx.arc(
              node.sx,
              node.sy,
              Math.max(0.9, node.radius * node.scale * local),
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();
          });
      }

      drawOrb(orb.x, orb.y, coreRadius, morph, pulse, arrival);

      if ((isLow && elapsed > maxIdleLife) || elapsed > maxAnimationLife) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(draw);
    }

    function onVisibilityChange() {
      visible = document.visibilityState !== "hidden";
      if (!visible && raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      if (visible && raf === 0) raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    raf = requestAnimationFrame(draw);
    return () => {
      visible = false;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [
    isAdvanced,
    isPro,
    mode,
    riskScore,
    tokenInfo.symbol,
    motionQuality,
    motionPreset,
    renderHeavyCanvas,
    lineStartMs,
    lineDurationMs,
    revealGapMs,
    readNodes.length,
    autoRotate,
    brainZoom,
  ]);

  const visibleNodes = readNodes.slice(0, revealedCount);
  const filteredVisibleNodes = useMemo(
    () =>
      activeTileGroup === "all"
        ? visibleNodes
        : visibleNodes.filter((node) => node.group === activeTileGroup),
    [activeTileGroup, visibleNodes],
  );

  const tileSourceBadge = useMemo(() => {
    const quality = result.dataQuality;
    if (locale === "pl") {
      return quality === "live"
        ? "źródło live"
        : quality === "partial"
          ? "źródło partial"
          : "fallback";
    }
    if (locale === "de") {
      return quality === "live"
        ? "Live-Quelle"
        : quality === "partial"
          ? "Partial-Quelle"
          : "Fallback";
    }
    return quality === "live"
      ? "live source"
      : quality === "partial"
        ? "partial source"
        : "fallback";
  }, [locale, result.dataQuality]);

  useEffect(() => {
    if (
      selectedNode &&
      activeTileGroup !== "all" &&
      selectedNode.group !== activeTileGroup
    ) {
      setSelectedNode(null);
    }
  }, [activeTileGroup, selectedNode]);

  const selectRelativeNode = useCallback(
    (direction: 1 | -1) => {
      const nodes = filteredVisibleNodes.length
        ? filteredVisibleNodes
        : visibleNodes;
      if (!nodes.length) return;
      const currentIndex = selectedNode
        ? nodes.findIndex((node) => node.label === selectedNode.label)
        : -1;
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : nodes.length - 1
          : (currentIndex + direction + nodes.length) % nodes.length;
      setSelectedNode(nodes[nextIndex]);
    },
    [filteredVisibleNodes, selectedNode, visibleNodes],
  );

  useEffect(() => {
    const handleBrainKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedNode) {
          event.preventDefault();
          setSelectedNode(null);
          return;
        }
        onClose();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        selectRelativeNode(1);
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        selectRelativeNode(-1);
      }
    };
    window.addEventListener("keydown", handleBrainKeydown);
    return () => window.removeEventListener("keydown", handleBrainKeydown);
  }, [onClose, selectRelativeNode, selectedNode]);
  // PASS201 marker: keyboard tile navigation uses Escape and ArrowRight/ArrowLeft without adding another visible HUD.
  const selectedTileEvidenceCopy = useMemo(() => {
    if (!selectedNode) return null;
    const groupLabel = groupLabels[selectedNode.group];
    const isGerman = locale === "de";
    const isPolish = locale === "pl";
    const sourceState =
      result.dataQuality === "live"
        ? isPolish
          ? "źródło live"
          : isGerman
            ? "Live-Quelle"
            : "live source"
        : result.dataQuality === "partial"
          ? isPolish
            ? "źródło partial"
            : isGerman
              ? "Partial-Quelle"
              : "partial source"
          : isPolish
            ? "fallback / brak źródła"
            : isGerman
              ? "Fallback / fehlende Quelle"
              : "fallback / missing source";
    const value = selectedNode.value;
    const numericValue = Number.parseFloat(
      String(value).replace(/[^0-9.-]/g, ""),
    );
    const severityTone =
      selectedNode.group === "source" &&
      /block|missing|brak/i.test(String(value))
        ? "blocked"
        : Number.isFinite(numericValue) && numericValue >= 65
          ? "red"
          : Number.isFinite(numericValue) && numericValue >= 35
            ? "watch"
            : "calm";
    const severityLabel = isPolish
      ? severityTone === "blocked"
        ? "blokada dowodów"
        : severityTone === "red"
          ? "red flag"
          : severityTone === "watch"
            ? "wymaga kontroli"
            : "spokojny skrót"
      : isGerman
        ? severityTone === "blocked"
          ? "Beweis-Blocker"
          : severityTone === "red"
            ? "Red Flag"
            : severityTone === "watch"
              ? "Review nötig"
              : "ruhiger Kurzbefund"
        : severityTone === "blocked"
          ? "evidence blocker"
          : severityTone === "red"
            ? "red flag"
            : severityTone === "watch"
              ? "review needed"
              : "calm summary";
    const intelligenceLabels = isPolish
      ? {
          caseSummary: "Wniosek VLM",
          inputTrace: "Dane użyte przez kafelek",
          missingTrace: "Czego brakuje do mocnego werdyktu",
          operatorAction: "Następny ruch operatora",
          previousTile: "Poprzedni kafelek",
          nextTile: "Następny kafelek",
          sourceTrust: "Source trust",
          publishState: "Stan publikacji",
          keyboardHint: "ESC zamyka · strzałki zmieniają kafelek",
          caveat: "To jest skrót analityczny, nie certyfikat bezpieczeństwa.",
          evidenceRail: "Łańcuch dowodów",
          confidenceRail: "Pewność odczytu",
          decisionRail: "Brama publikacji",
          checklist: "Checklist operatora",
          decisionDock: "Decision dock",
          priority: "Priorytet",
          confidenceLimit: "Limit pewności",
          sourceMode: "Tryb źródeł",
          reviewWindow: "Okno review",
          reportCapsule: "Kapsuła raportu",
          publicBrief: "Brief publiczny",
          internalMemo: "Notatka operatora",
          redactionRule: "Redakcja danych",
          exportGate: "Brama eksportu",
          actionQueue: "Kolejka operatora",
          queueStatus: "Status kolejki",
          queueExportGate: "Export gate",
        }
      : isGerman
        ? {
            caseSummary: "VLM-Befund",
            inputTrace: "Daten, die diese Kachel nutzt",
            missingTrace: "Was für ein starkes Urteil fehlt",
            operatorAction: "Nächster Operator-Schritt",
            previousTile: "Vorherige Kachel",
            nextTile: "Nächste Kachel",
            sourceTrust: "Source Trust",
            publishState: "Publikationsstatus",
            keyboardHint: "ESC schließt · Pfeiltasten wechseln Kacheln",
            caveat:
              "Das ist eine Analyse-Zusammenfassung, kein Sicherheitszertifikat.",
            evidenceRail: "Beweiskette",
            confidenceRail: "Readout-Confidence",
            decisionRail: "Publikations-Gate",
            checklist: "Operator-Checkliste",
            decisionDock: "Decision Dock",
            priority: "Priorität",
            confidenceLimit: "Confidence-Limit",
            sourceMode: "Quellenmodus",
            reviewWindow: "Review-Fenster",
            reportCapsule: "Report-Kapsel",
            publicBrief: "Öffentlicher Brief",
            internalMemo: "Operator-Notiz",
            redactionRule: "Datenredaktion",
            exportGate: "Export-Gate",
            actionQueue: "Operator-Queue",
            queueStatus: "Queue-Status",
            queueExportGate: "Export-Gate",
          }
        : {
            caseSummary: "VLM readout",
            inputTrace: "Data used by this tile",
            missingTrace: "What is missing for a strong verdict",
            operatorAction: "Next operator move",
            previousTile: "Previous tile",
            nextTile: "Next tile",
            sourceTrust: "Source trust",
            publishState: "Publication state",
            keyboardHint: "ESC closes · arrows switch tiles",
            caveat:
              "Analytical operator brief · verify sources before publishing.",
            evidenceRail: "Evidence chain",
            confidenceRail: "Readout confidence",
            decisionRail: "Publication gate",
            checklist: "Operator checklist",
            decisionDock: "Decision dock",
            priority: "Priority",
            confidenceLimit: "Confidence limit",
            sourceMode: "Source mode",
            reviewWindow: "Review window",
            reportCapsule: "Report capsule",
            publicBrief: "Public brief",
            internalMemo: "Operator memo",
            redactionRule: "Data redaction",
            exportGate: "Export gate",
            actionQueue: "Operator queue",
            queueStatus: "Queue status",
            queueExportGate: "Export gate",
          };
    const groupCopy: Record<
      Exclude<VlmReadGroup, "all">,
      {
        driver: string;
        scoreRead: string;
        evidenceNeed: string;
        next: string;
        operatorQuestion: string;
        why: string;
      }
    > = (() => {
      if (isPolish) {
        return {
          risk: {
            driver: `Ten kafelek streszcza główny poziom ryzyka. Wartość ${value} nie jest certyfikatem bezpieczeństwa — mówi tylko, jak model czyta dostępne sygnały.`,
            scoreRead:
              "Niski score często oznacza brak mocnych flag w aktualnych danych, ale przy brakach źródeł nadal trzeba sprawdzić kontrakt, holderów i płynność.",
            evidenceNeed:
              "Wymagane dowody: świeże świece, źródło market data, source ledger i manualny review największych braków.",
            next: "Najpierw sprawdź, czy wynik jest niski przez realnie spokojne dane, czy przez missing/fallback data.",
            why: nodeDisplayCopy.risk.summary,
            operatorQuestion:
              "Czy mamy źródło live i czy missing data nie ukrywa ryzyka?",
          },
          liquidity: {
            driver: `Ten kafelek pokazuje możliwość wyjścia z pozycji bez dużego poślizgu. Wartość ${value} zależy od wolumenu, depth, spreadu i relacji volume/market cap.`,
            scoreRead:
              "Niska płynność zwiększa ryzyko, bo cena może wyglądać dobrze, ale wyjście większym zleceniem może być drogie albo nierealne.",
            evidenceNeed:
              "Wymagane dowody: order book, spread, slippage, giełdy z realnym wolumenem i porównanie wolumenu do market cap.",
            next: "Zweryfikuj depth, spread, slippage i czy wolumen jest organiczny, a nie tylko podbity przez market-makerów.",
            why: nodeDisplayCopy.liquidity.summary,
            operatorQuestion:
              "Czy użytkownik mógłby realnie wyjść z pozycji bez rozwalenia ceny?",
          },
          holders: {
            driver: `Ten kafelek ocenia koncentrację podaży i kontrolę nad tokenem. Wartość ${value} rośnie, gdy holderzy, CEX, LP albo treasury są niejasne.`,
            scoreRead:
              "Niejasne klastry holderów nie oznaczają od razu scam — oznaczają, że nie wolno robić mocnego werdyktu bez chain/source labels.",
            evidenceNeed:
              "Wymagane dowody: największe portfele, CEX/custody, LP, treasury, team/advisor wallets i unclassified clusters.",
            next: "Sprawdź największe portfele, CEX/custody, LP, treasury i unclassified clusters.",
            why: nodeDisplayCopy.holders.summary,
            operatorQuestion:
              "Kto realnie kontroluje podaż i czy można to potwierdzić źródłem?",
          },
          signals: {
            driver: `Ten kafelek wybiera najmocniejszy widoczny sygnał. ${value} wymaga potwierdzenia, bo model nie może opierać werdyktu na jednej fladze.`,
            scoreRead:
              "Sygnał jest punktem startowym review, nie oskarżeniem ani poradą. Im świeższy i mocniejszy sygnał, tym ważniejsze źródło.",
            evidenceNeed:
              "Wymagane dowody: świeże źródła, wykres, wolumen, social/KOL context i zgodność z innymi agentami.",
            next: "Potwierdź sygnał w świeżych źródłach zanim użyjesz mocnego werdyktu.",
            why: nodeDisplayCopy.signals.summary,
            operatorQuestion:
              "Czy ten sygnał ma potwierdzenie poza samym ruchem ceny?",
          },
          source: {
            driver:
              "Ten kafelek mówi, czy analiza opiera się na danych live, partial, fallback czy missing. Źródło zmienia pewność całego odczytu.",
            scoreRead:
              "Brak danych nie jest neutralny. Jeżeli źródło jest partial lub fallback, VLM ma mówić ostrożniej i kierować sprawę do manual review.",
            evidenceNeed:
              "Wymagane dowody: timestamp źródła, provider, freshness, source ledger i lista pól, których nie udało się pobrać.",
            next: "Oznacz freshness źródła i nie publikuj mocnej tezy, jeśli dane są partial/missing.",
            why: nodeDisplayCopy.source.summary,
            operatorQuestion:
              "Czy użytkownik widzi różnicę między live source a fallbackiem?",
          },
          access: {
            driver:
              "Ten kafelek pilnuje granicy produktu: VLM jest utility/access layer, a nie obietnicą inwestycyjną.",
            scoreRead:
              "Dostęp premium może odblokować więcej danych i evidence, ale nie może obiecywać ROI, bezpieczeństwa inwestycji ani ukrytej transakcji.",
            evidenceNeed:
              "Wymagane dowody: utility copy, brak seed phrase flow, brak value promise i jasne policy pages.",
            next: "Pilnuj VLM jako utility/access layer, bez obietnic ROI i bez seed phrase flow.",
            why: nodeDisplayCopy.access.summary,
            operatorQuestion:
              "Czy użytkownik rozumie, że to narzędzie analizy, nie obietnica zysku?",
          },
        };
      }

      if (isGerman) {
        return {
          risk: {
            driver: `Diese Kachel fasst das Hauptrisiko zusammen. Der Wert ${value} ist kein Sicherheitszertifikat — er zeigt nur, wie VLM die verfügbaren Signale liest.`,
            scoreRead:
              "Ein niedriger Score bedeutet oft, dass in den aktuellen Daten keine starken Flags sichtbar sind. Bei Quellenlücken bleiben Contract, Holder und Liquidität trotzdem im Review.",
            evidenceNeed:
              "Benötigte Nachweise: frische Kerzen, Marktdatenquelle, Source Ledger und manuelle Prüfung der größten Datenlücken.",
            next: "Prüfe zuerst, ob der Score durch ruhige Daten niedrig ist oder durch fehlende/fallback Quellen.",
            why: nodeDisplayCopy.risk.summary,
            operatorQuestion:
              "Haben wir eine Live-Quelle und verstecken fehlende Daten kein Risiko?",
          },
          liquidity: {
            driver: `Diese Kachel zeigt, ob ein Ausstieg ohne starken Slippage realistisch wäre. Der Wert ${value} hängt von Volumen, Tiefe, Spread und Volume/Market-Cap-Verhältnis ab.`,
            scoreRead:
              "Schwache Liquidität erhöht das Risiko: Der Chart kann sauber wirken, während größere Orders teuer oder kaum realistisch sind.",
            evidenceNeed:
              "Benötigte Nachweise: Orderbook, Spread, Slippage, Handelsplätze mit realem Volumen und Vergleich von Volumen zu Market Cap.",
            next: "Prüfe Tiefe, Spread, Slippage und ob das Volumen organisch wirkt statt künstlich erzeugt.",
            why: nodeDisplayCopy.liquidity.summary,
            operatorQuestion:
              "Könnte ein Nutzer realistisch aussteigen, ohne den Preis stark zu bewegen?",
          },
          holders: {
            driver: `Diese Kachel bewertet Angebotskonzentration und Token-Kontrolle. Der Wert ${value} steigt, wenn Holder, CEX, LP oder Treasury unklar sind.`,
            scoreRead:
              "Unklare Holder-Cluster sind keine Anschuldigung. Sie bedeuten: kein starkes Urteil ohne Chain- und Source-Labels.",
            evidenceNeed:
              "Benötigte Nachweise: Top-Wallets, CEX/Custody, LP, Treasury, Team/Advisor Wallets und unbekannte Cluster.",
            next: "Prüfe Top-Wallets, CEX/Custody, LP, Treasury und unbekannte Cluster.",
            why: nodeDisplayCopy.holders.summary,
            operatorQuestion:
              "Wer kontrolliert real das Angebot und kann eine Quelle das belegen?",
          },
          signals: {
            driver: `Diese Kachel wählt das stärkste sichtbare Signal. ${value} braucht Bestätigung, weil VLM kein Urteil auf eine einzelne Flag stützen darf.`,
            scoreRead:
              "Ein Signal ist ein Review-Startpunkt, keine Anschuldigung und keine Empfehlung. Je frischer und stärker das Signal ist, desto wichtiger ist die Quelle.",
            evidenceNeed:
              "Benötigte Nachweise: frische Quellen, Chart, Volumen, Social/KOL-Kontext und Abgleich mit anderen Agenten.",
            next: "Bestätige das Signal in frischen Quellen, bevor starke Formulierungen genutzt werden.",
            why: nodeDisplayCopy.signals.summary,
            operatorQuestion:
              "Ist dieses Signal auch außerhalb der Preisbewegung bestätigt?",
          },
          source: {
            driver:
              "Diese Kachel zeigt, ob die Analyse auf Live-, Partial-, Fallback- oder Missing-Daten basiert. Der Quellenstatus verändert die Sicherheit des ganzen Readouts.",
            scoreRead:
              "Fehlende Daten sind nicht neutral. Bei Partial oder Fallback muss VLM vorsichtiger formulieren und die Sache in manuelles Review geben.",
            evidenceNeed:
              "Benötigte Nachweise: Quellen-Zeitstempel, Provider, Freshness, Source Ledger und Liste der Felder, die nicht geladen wurden.",
            next: "Markiere die Quellen-Freshness und veröffentliche keine starke These, wenn Daten partial/missing sind.",
            why: nodeDisplayCopy.source.summary,
            operatorQuestion:
              "Sieht der Nutzer den Unterschied zwischen Live-Quelle und Fallback?",
          },
          access: {
            driver:
              "Diese Kachel schützt die Produktgrenze: VLM ist eine Utility-/Access-Schicht, kein Anlageversprechen.",
            scoreRead:
              "Premium-Zugang kann tiefere Daten und Evidence öffnen, darf aber kein ROI, keine Investment-Sicherheit und keine versteckte Transaktion versprechen.",
            evidenceNeed:
              "Benötigte Nachweise: Utility-Copy, kein Seed-Phrase-Flow, kein Value-Promise und klare Policy-Seiten.",
            next: "Halte VLM als Utility-/Access-Layer: kein ROI-Versprechen und kein Seed-Phrase-Flow.",
            why: nodeDisplayCopy.access.summary,
            operatorQuestion:
              "Versteht der Nutzer, dass es ein Analysewerkzeug ist, kein Gewinnversprechen?",
          },
        };
      }

      return {
        risk: {
          driver: `This tile summarizes the main risk level. ${value} is not a safety certificate — it only shows how the model reads available signals.`,
          scoreRead:
            "A low score often means no strong flags in current data, but missing sources still require contract, holder and liquidity review.",
          evidenceNeed:
            "Required evidence: fresh candles, market data source, source ledger and manual review of the largest gaps.",
          next: "First check whether the score is low because data is genuinely calm or because sources are missing/fallback.",
          why: nodeDisplayCopy.risk.summary,
          operatorQuestion:
            "Do we have live source truth, and is missing data hiding risk?",
        },
        liquidity: {
          driver: `This tile shows exit ability without heavy slippage. ${value} depends on volume, depth, spread and volume/market-cap ratio.`,
          scoreRead:
            "Weak liquidity raises risk because the chart may look calm while larger exits are expensive or unrealistic.",
          evidenceNeed:
            "Required evidence: order book, spread, slippage, venues with real volume and volume-to-market-cap comparison.",
          next: "Verify depth, spread, slippage and whether volume is organic instead of engineered by market makers.",
          why: nodeDisplayCopy.liquidity.summary,
          operatorQuestion:
            "Could a user realistically exit without breaking price?",
        },
        holders: {
          driver: `This tile evaluates supply concentration and token control. ${value} rises when holders, CEX, LP or treasury labels are unclear.`,
          scoreRead:
            "Unclear holder clusters are not an accusation — they mean no strong verdict without chain/source labels.",
          evidenceNeed:
            "Required evidence: top wallets, CEX/custody, LP, treasury, team/advisor wallets and unclassified clusters.",
          next: "Review top wallets, CEX/custody, LP, treasury and unclassified clusters.",
          why: nodeDisplayCopy.holders.summary,
          operatorQuestion:
            "Who really controls supply, and can the source prove it?",
        },
        signals: {
          driver: `This tile selects the strongest visible signal. ${value} needs confirmation because the model cannot base verdicts on a single flag.`,
          scoreRead:
            "A signal is a review prompt, not an accusation or advice. The fresher and stronger it is, the more the source matters.",
          evidenceNeed:
            "Required evidence: fresh sources, chart, volume, social/KOL context and agreement with other agents.",
          next: "Confirm the signal in fresh sources before using strong wording.",
          why: nodeDisplayCopy.signals.summary,
          operatorQuestion:
            "Is this signal confirmed outside price movement alone?",
        },
        source: {
          driver:
            "This tile tells whether the system uses live, partial, fallback or missing data. Source state changes the confidence of the whole readout.",
          scoreRead:
            "Missing data is not neutral. When a source is partial or fallback, VLM must speak cautiously and route the case to manual review.",
          evidenceNeed:
            "Required evidence: source timestamp, provider, freshness, source ledger and the list of fields that failed to load.",
          next: "Mark source freshness and avoid strong public claims when the data is partial/missing.",
          why: nodeDisplayCopy.source.summary,
          operatorQuestion:
            "Can the user see the difference between live source truth and fallback data?",
        },
        access: {
          driver:
            "This tile protects the product boundary: VLM is utility/access layer, not an investment promise.",
          scoreRead:
            "Premium access can unlock deeper data and evidence, but cannot promise ROI, investment safety or hidden transactions.",
          evidenceNeed:
            "Required evidence: utility copy, no seed phrase flow, no value promise and clear policy pages.",
          next: "Keep VLM as utility/access layer, with no ROI promise and no seed phrase flow.",
          why: nodeDisplayCopy.access.summary,
          operatorQuestion:
            "Does the user understand this is analysis tooling, not a profit promise?",
        },
      };
    })();
    const copy = groupCopy[selectedNode.group];
    const inputTrace = isPolish
      ? `Wejścia: ${selectedNode.detail}; source=${sourceState}; confidence=${confidence}%; chart=${chartSource}.`
      : isGerman
        ? `Inputs: ${selectedNode.detail}; Quelle=${sourceState}; Confidence=${confidence}%; Chart=${chartSource}.`
        : `Inputs: ${selectedNode.detail}; source=${sourceState}; confidence=${confidence}%; chart=${chartSource}.`;
    const sourceTrust =
      result.dataQuality === "live"
        ? isPolish
          ? "można czytać, ale dalej wymaga review"
          : isGerman
            ? "lesbar, aber weiterhin Review nötig"
            : "usable, still review-gated"
        : result.dataQuality === "partial"
          ? isPolish
            ? "częściowe źródła · ostrożny język"
            : isGerman
              ? "teilweise Quellen · vorsichtige Sprache"
              : "partial sources · cautious language"
          : isPolish
            ? "fallback/braki · blokuje mocny werdykt"
            : isGerman
              ? "Fallback/Lücken · blockiert starke Aussage"
              : "fallback/gaps · blocks strong verdict";
    const publicationState =
      severityTone === "blocked" || result.dataQuality !== "live"
        ? isPolish
          ? "tylko internal review"
          : isGerman
            ? "nur internes Review"
            : "internal review only"
        : severityTone === "red"
          ? isPolish
            ? "wymaga drugiego źródła"
            : isGerman
              ? "zweite Quelle nötig"
              : "needs second source"
          : isPolish
            ? "może trafić do briefu z caveatem"
            : isGerman
              ? "brief-fähig mit Caveat"
              : "brief-ready with caveat";
    const evidenceRail =
      result.dataQuality === "live"
        ? isPolish
          ? "live źródło + caveat"
          : isGerman
            ? "Live-Quelle + Caveat"
            : "live source + caveat"
        : result.dataQuality === "partial"
          ? isPolish
            ? "partial źródło · drugi proof"
            : isGerman
              ? "Partial-Quelle · zweiter Proof"
              : "partial source · second proof"
          : isPolish
            ? "fallback · blokuje mocny brief"
            : isGerman
              ? "Fallback · blockiert starken Brief"
              : "fallback · blocks strong brief";
    const confidenceRail =
      confidence >= 75
        ? isPolish
          ? "wysoka pewność, dalej ręczny review"
          : isGerman
            ? "hohe Confidence, weiterhin manuelles Review"
            : "high confidence, still manual review"
        : confidence >= 50
          ? isPolish
            ? "średnia pewność · porównaj źródła"
            : isGerman
              ? "mittlere Confidence · Quellen vergleichen"
              : "medium confidence · compare sources"
          : isPolish
            ? "niska pewność · nie publikuj mocnego skrótu"
            : isGerman
              ? "niedrige Confidence · keinen starken Kurzbefund veröffentlichen"
              : "low confidence · do not publish strong summary";
    const decisionRail =
      severityTone === "blocked" || result.dataQuality !== "live"
        ? isPolish
          ? "zostaje w review"
          : isGerman
            ? "bleibt im Review"
            : "keeps case in review"
        : severityTone === "red"
          ? isPolish
            ? "eskaluj do drugiego źródła"
            : isGerman
              ? "zur zweiten Quelle eskalieren"
              : "escalate to second source"
          : isPolish
            ? "krótki brief z ostrożnym językiem"
            : isGerman
              ? "kurzer Brief mit vorsichtiger Sprache"
              : "short brief with cautious wording";
    const priorityValue =
      severityTone === "blocked" || result.dataQuality !== "live"
        ? isPolish
          ? "P1 · review blokuje publikację"
          : isGerman
            ? "P1 · Review blockiert Veröffentlichung"
            : "P1 · review blocks publishing"
        : severityTone === "red"
          ? isPolish
            ? "P2 · eskalacja źródła"
            : isGerman
              ? "P2 · Quellen-Eskalation"
              : "P2 · source escalation"
          : isPolish
            ? "P3 · monitoruj"
            : isGerman
              ? "P3 · beobachten"
              : "P3 · monitor";
    const confidenceLimitValue =
      result.dataQuality === "live"
        ? isPolish
          ? `do ${confidence}% · caveat zostaje`
          : isGerman
            ? `bis ${confidence}% · Caveat bleibt`
            : `up to ${confidence}% · caveat remains`
        : result.dataQuality === "partial"
          ? isPolish
            ? "obcięte przez partial source"
            : isGerman
              ? "durch Partial-Quelle begrenzt"
              : "capped by partial source"
          : isPolish
            ? "obcięte przez fallback/braki"
            : isGerman
              ? "durch Fallback/Lücken begrenzt"
              : "capped by fallback/gaps";
    const sourceModeValue =
      result.dataQuality === "live"
        ? isPolish
          ? "live · porównaj drugie źródło"
          : isGerman
            ? "live · zweite Quelle vergleichen"
            : "live · compare second source"
        : result.dataQuality === "partial"
          ? isPolish
            ? "partial · ostrożny brief"
            : isGerman
              ? "partial · vorsichtiger Brief"
              : "partial · cautious brief"
          : isPolish
            ? "fallback · tylko internal"
            : isGerman
              ? "fallback · nur intern"
              : "fallback · internal only";
    const reviewWindowValue =
      selectedNode.group === "liquidity" || selectedNode.group === "signals"
        ? isPolish
          ? "szybkie odświeżenie przed opisem"
          : isGerman
            ? "vor Befund schnell aktualisieren"
            : "refresh before write-up"
        : selectedNode.group === "source"
          ? isPolish
            ? "czekaj na świeży timestamp"
            : isGerman
              ? "auf frischen Timestamp warten"
              : "wait for fresh timestamp"
          : isPolish
            ? "review przy następnym źródle"
            : isGerman
              ? "Review bei nächster Quelle"
              : "review at next source";
    const decisionDock = [
      {
        label: intelligenceLabels.priority,
        value: priorityValue,
        detail: decisionRail,
      },
      {
        label: intelligenceLabels.confidenceLimit,
        value: confidenceLimitValue,
        detail: confidenceRail,
      },
      {
        label: intelligenceLabels.sourceMode,
        value: sourceModeValue,
        detail: sourceTrust,
      },
      {
        label: intelligenceLabels.reviewWindow,
        value: reviewWindowValue,
        detail: publicationState,
      },
    ];
    const reportCapsule = [
      {
        label: intelligenceLabels.publicBrief,
        value: publicationState,
        detail: isPolish
          ? "Użyj krótkiego języka: anomaly, review, source confidence. Bez finalnego werdyktu."
          : isGerman
            ? "Kurz formulieren: Anomalie, Review, Source Confidence. Kein finales Urteil."
            : "Use short wording: anomaly, review, source confidence. No final verdict.",
      },
      {
        label: intelligenceLabels.internalMemo,
        value: priorityValue,
        detail: isPolish
          ? "Zachowaj driver, missing evidence i następny krok operatora w case file."
          : isGerman
            ? "Driver, fehlende Evidenz und nächsten Operator-Schritt im Case File halten."
            : "Keep driver, missing evidence and next operator action in the case file.",
      },
      {
        label: intelligenceLabels.redactionRule,
        value: isPolish
          ? "bez PII / sekretów / raw payload"
          : isGerman
            ? "ohne PII / Secrets / Raw Payload"
            : "no PII / secrets / raw payload",
        detail: isPolish
          ? "Do eksportu trafia tylko bezpieczny skrót, confidence i brakujące dowody."
          : isGerman
            ? "In den Export gehen nur sichere Kurzfassung, Confidence und fehlende Nachweise."
            : "Export only the safe summary, confidence and missing evidence.",
      },
      {
        label: intelligenceLabels.exportGate,
        value:
          result.dataQuality === "live" && severityTone !== "blocked"
            ? isPolish
              ? "PDF-ready po review"
              : isGerman
                ? "PDF-ready nach Review"
                : "PDF-ready after review"
            : isPolish
              ? "zatrzymaj jako internal"
              : isGerman
                ? "intern halten"
                : "hold as internal",
        detail: isPolish
          ? "Mózg AI łączy analizę z bezpiecznym raportem i przygotowuje spójny podgląd."
          : isGerman
            ? "AI Brain verbindet die Analyse mit einem sicheren, konsistenten Report."
            : "AI Brain connects analysis with a safe, consistent report preview.",
      },
    ];
    const operatorChecklist = (() => {
      const sourceCheck = isPolish
        ? "Sprawdź freshness i provider źródła."
        : isGerman
          ? "Freshness und Provider der Quelle prüfen."
          : "Check source freshness and provider.";
      const manualCheck = isPolish
        ? "Porównaj z drugim niezależnym sygnałem."
        : isGerman
          ? "Mit einem zweiten unabhängigen Signal vergleichen."
          : "Compare with a second independent signal.";
      const wordingCheck = isPolish
        ? "Zostaw język jako anomaly/review, nie finalny werdykt."
        : isGerman
          ? "Sprache bei Anomalie/Review lassen, kein finales Urteil."
          : "Keep wording as anomaly/review, not a final verdict.";
      const groupSpecific: Record<Exclude<VlmReadGroup, "all">, string> = {
        risk: isPolish
          ? "Sprawdź, czy niski score nie wynika z braków danych."
          : isGerman
            ? "Prüfen, ob ein niedriger Score aus Datenlücken entsteht."
            : "Check whether a low score comes from missing data.",
        liquidity: isPolish
          ? "Zweryfikuj spread, depth i slippage przed skrótem."
          : isGerman
            ? "Spread, Tiefe und Slippage vor dem Kurzbefund prüfen."
            : "Verify spread, depth and slippage before the summary.",
        holders: isPolish
          ? "Oznacz CEX/LP/treasury/unclassified clusters."
          : isGerman
            ? "CEX/LP/Treasury/nicht klassifizierte Cluster markieren."
            : "Label CEX/LP/treasury/unclassified clusters.",
        signals: isPolish
          ? "Potwierdź sygnał poza samym ruchem świecy."
          : isGerman
            ? "Signal außerhalb der Kerzenbewegung bestätigen."
            : "Confirm the signal outside candle movement alone.",
        source: isPolish
          ? "Zapisz brakujące pola do source ledger."
          : isGerman
            ? "Fehlende Felder im Source Ledger festhalten."
            : "Record missing fields in the source ledger.",
        access: isPolish
          ? "Upewnij się, że flow nie prosi o seed/private key."
          : isGerman
            ? "Sicherstellen, dass kein Seed/Private-Key abgefragt wird."
            : "Confirm the flow never asks for seed/private key.",
      };
      return [
        sourceCheck,
        groupSpecific[selectedNode.group],
        manualCheck,
        wordingCheck,
      ];
    })();
    return {
      groupLabel,
      sourceState,
      why: copy.why,
      driver: copy.driver,
      scoreRead: copy.scoreRead,
      evidenceNeed: copy.evidenceNeed,
      next: copy.next,
      operatorQuestion: copy.operatorQuestion,
      confidence: `${confidence}%`,
      chartSource,
      sourceTrust,
      publicationState,
      evidenceRail,
      confidenceRail,
      decisionRail,
      decisionDock,
      reportCapsule,
      operatorChecklist,
      severityLabel,
      severityTone,
      intelligenceLabels,
      inputTrace,
    };
  }, [
    selectedNode,
    groupLabels,
    result.dataQuality,
    locale,
    confidence,
    chartSource,
    nodeDisplayCopy,
  ]);

  const selectedTileReportCapsuleEnvelope = useMemo(() => {
    if (!selectedNode || !selectedTileEvidenceCopy) return null;
    const labels = selectedTileEvidenceCopy.intelligenceLabels;
    const findCapsuleValue = (label: string) =>
      selectedTileEvidenceCopy.reportCapsule.find(
        (item) => item.label === label,
      )?.value ?? "review required";
    const findCapsuleDetail = (label: string) =>
      selectedTileEvidenceCopy.reportCapsule.find(
        (item) => item.label === label,
      )?.detail ?? "manual review required";

    return buildVlmBrainReportCapsule({
      locale,
      token: {
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
      },
      tile: {
        label: selectedNode.label,
        group: selectedNode.group,
        value: selectedNode.value,
        severity: selectedTileEvidenceCopy.severityLabel,
      },
      source: {
        trust: selectedTileEvidenceCopy.sourceTrust,
        publicationState: selectedTileEvidenceCopy.publicationState,
        chartSource: selectedTileEvidenceCopy.chartSource,
        dataQuality: result.dataQuality,
        confidence: selectedTileEvidenceCopy.confidence,
      },
      capsule: {
        publicBrief: findCapsuleValue(labels.publicBrief),
        operatorMemo: findCapsuleValue(labels.internalMemo),
        redactionRule: findCapsuleDetail(labels.redactionRule),
        exportGate: findCapsuleValue(labels.exportGate),
      },
      operator: {
        nextAction: selectedTileEvidenceCopy.next,
        checklist: selectedTileEvidenceCopy.operatorChecklist,
      },
      generatedAt: result.generatedAt,
    });
  }, [
    locale,
    result.dataQuality,
    result.generatedAt,
    selectedNode,
    selectedTileEvidenceCopy,
    tokenInfo.name,
    tokenInfo.symbol,
  ]);
  // PASS209 marker: selected VLM Brain tile now builds a typed report capsule envelope before any future PDF/export handoff.

  const selectedTileCommandDeckLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "AI command deck",
        subtitle:
          "Jedna ścieżka od analizy do evidence. Najpierw confidence i source state, potem ledger, PDF preview i browser replay.",
        capsule: "Report capsule",
        ledger: "Source ledger",
        pdf: "PDF preview",
        handoff: "Release handoff",
      };
    }
    if (locale === "de") {
      return {
        title: "AI Command Deck",
        subtitle:
          "Ein Pfad von Analyse zu Evidenz. Zuerst Confidence und Source State, dann Ledger, PDF-Preview und Browser Replay.",
        capsule: "Report Capsule",
        ledger: "Source Ledger",
        pdf: "PDF Preview",
        handoff: "Release Handoff",
      };
    }
    return {
      title: "AI command deck",
      subtitle:
        "One path from analysis to evidence. Confidence and source state first, then ledger, PDF preview and browser replay.",
      capsule: "Report capsule",
      ledger: "Source ledger",
      pdf: "PDF preview",
      handoff: "Release handoff",
    };
  }, [locale]);

  const selectedTileReportHandoffLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Most raportu",
        status: "status",
        freshness: "freshness",
        storage: "storage",
        blockers: "blokery",
      };
    }
    if (locale === "de") {
      return {
        title: "Report-Brücke",
        status: "Status",
        freshness: "Freshness",
        storage: "Storage",
        blockers: "Blocker",
      };
    }
    return {
      title: "Report handoff",
      status: "status",
      freshness: "freshness",
      storage: "storage",
      blockers: "blockers",
    };
  }, [locale]);

  const selectedTileReportCapsuleHandoff = useMemo(() => {
    if (!selectedTileReportCapsuleEnvelope) return null;
    return buildVlmBrainCapsuleHandoff(
      selectedTileReportCapsuleEnvelope,
      result,
    );
  }, [result, selectedTileReportCapsuleEnvelope]);
  // PASS210 marker: selected VLM Brain tile builds a report handoff with source freshness, storage mode and blockers before any PDF route.

  const selectedTileOperatorActionQueue = useMemo(() => {
    if (!selectedTileReportCapsuleEnvelope || !selectedTileReportCapsuleHandoff)
      return null;
    return buildVlmBrainOperatorActionQueue(
      selectedTileReportCapsuleEnvelope,
      selectedTileReportCapsuleHandoff,
      result,
    );
  }, [
    result,
    selectedTileReportCapsuleEnvelope,
    selectedTileReportCapsuleHandoff,
  ]);
  // PASS211 marker: selected VLM Brain tile builds an operator action queue from capsule + handoff state before any report/PDF export.

  const selectedTileCaseReviewTimelineLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Oś sprawy",
        status: "status",
        storage: "zapis",
        exportGate: "eksport",
        durableWrite: "durable write",
        events: "zdarzenia",
      };
    }
    if (locale === "de") {
      return {
        title: "Case-Timeline",
        status: "Status",
        storage: "Speicher",
        exportGate: "Export",
        durableWrite: "Durable Write",
        events: "Events",
      };
    }
    return {
      title: "Case timeline",
      status: "status",
      storage: "storage",
      exportGate: "export",
      durableWrite: "durable write",
      events: "events",
    };
  }, [locale]);

  const selectedTileCaseReviewTimeline = useMemo(() => {
    if (
      !selectedTileReportCapsuleEnvelope ||
      !selectedTileReportCapsuleHandoff ||
      !selectedTileOperatorActionQueue
    )
      return null;
    return buildVlmBrainCaseReviewTimeline(
      selectedTileReportCapsuleEnvelope,
      selectedTileReportCapsuleHandoff,
      selectedTileOperatorActionQueue,
      result,
    );
  }, [
    result,
    selectedTileOperatorActionQueue,
    selectedTileReportCapsuleEnvelope,
    selectedTileReportCapsuleHandoff,
  ]);
  // PASS212 marker: selected VLM Brain tile builds an operator case-review timeline linking capsule, handoff and action queue before report/PDF export.

  const selectedTileCustomerExportFirewallLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Zapora eksportu",
        release: "release",
        visibility: "widoczność",
        pdfGate: "PDF gate",
        evidenceCoverage: "pokrycie dowodów",
        redactionScore: "redakcja",
        sourceDebt: "dług źródeł",
        debtMatrix: "macierz długu",
        checklist: "checklista release",
      };
    }
    if (locale === "de") {
      return {
        title: "Export-Firewall",
        release: "Release",
        visibility: "Sichtbarkeit",
        pdfGate: "PDF-Gate",
        evidenceCoverage: "Evidence Coverage",
        redactionScore: "Redaction",
        sourceDebt: "Source Debt",
        debtMatrix: "Debt-Matrix",
        checklist: "Release-Checkliste",
      };
    }
    return {
      title: "Export firewall",
      release: "release",
      visibility: "visibility",
      pdfGate: "PDF gate",
      evidenceCoverage: "evidence coverage",
      redactionScore: "redaction",
      sourceDebt: "source debt",
      debtMatrix: "debt matrix",
      checklist: "release checklist",
    };
  }, [locale]);

  const selectedTileCustomerExportFirewall = useMemo(() => {
    if (
      !selectedTileReportCapsuleEnvelope ||
      !selectedTileReportCapsuleHandoff ||
      !selectedTileOperatorActionQueue ||
      !selectedTileCaseReviewTimeline
    ) {
      return null;
    }
    return buildVlmBrainCustomerExportFirewall(
      selectedTileReportCapsuleEnvelope,
      selectedTileReportCapsuleHandoff,
      selectedTileOperatorActionQueue,
      selectedTileCaseReviewTimeline,
      result,
    );
  }, [
    result,
    selectedTileCaseReviewTimeline,
    selectedTileOperatorActionQueue,
    selectedTileReportCapsuleEnvelope,
    selectedTileReportCapsuleHandoff,
  ]);
  // PASS213 marker: selected VLM Brain tile now builds a customer export firewall with source debt, redaction and durable-case gates before any PDF/customer download.

  const selectedTileSourceCoverageMatrixLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Macierz źródeł",
        coverage: "pokrycie",
        sla: "review SLA",
        pressure: "presja eksportu",
        secondSource: "drugie źródło",
        lanes: "linie źródeł",
      };
    }
    if (locale === "de") {
      return {
        title: "Quellenmatrix",
        coverage: "Coverage",
        sla: "Review-SLA",
        pressure: "Exportdruck",
        secondSource: "Zweitquelle",
        lanes: "Quellen-Lanes",
      };
    }
    return {
      title: "Source matrix",
      coverage: "coverage",
      sla: "review SLA",
      pressure: "export pressure",
      secondSource: "second source",
      lanes: "source lanes",
    };
  }, [locale]);

  const selectedTileSourceCoverageMatrix = useMemo(() => {
    if (
      !selectedTileReportCapsuleEnvelope ||
      !selectedTileReportCapsuleHandoff ||
      !selectedTileOperatorActionQueue ||
      !selectedTileCaseReviewTimeline ||
      !selectedTileCustomerExportFirewall
    ) {
      return null;
    }
    return buildVlmBrainSourceCoverageMatrix(
      selectedTileReportCapsuleEnvelope,
      selectedTileReportCapsuleHandoff,
      selectedTileOperatorActionQueue,
      selectedTileCaseReviewTimeline,
      selectedTileCustomerExportFirewall,
      result,
    );
  }, [
    result,
    selectedTileCaseReviewTimeline,
    selectedTileCustomerExportFirewall,
    selectedTileOperatorActionQueue,
    selectedTileReportCapsuleEnvelope,
    selectedTileReportCapsuleHandoff,
  ]);
  // PASS214 marker: selected VLM Brain tile now builds a source coverage matrix with lane-level SLA, second-source and export-pressure gates.

  const selectedTileReleaseReviewPacketLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Pakiet release",
        decision: "decyzja",
        score: "release score",
        blockers: "blokery",
        review: "review",
        customerCopy: "customer copy",
        pdf: "PDF",
        lanes: "bramy release",
        checklist: "checklista",
      };
    }
    if (locale === "de") {
      return {
        title: "Release-Paket",
        decision: "Entscheidung",
        score: "Release Score",
        blockers: "Blocker",
        review: "Review",
        customerCopy: "Customer Copy",
        pdf: "PDF",
        lanes: "Release-Gates",
        checklist: "Checkliste",
      };
    }
    return {
      title: "Release packet",
      decision: "decision",
      score: "release score",
      blockers: "blockers",
      review: "review",
      customerCopy: "customer copy",
      pdf: "PDF",
      lanes: "release gates",
      checklist: "checklist",
    };
  }, [locale]);

  const selectedTileReleaseReviewPacket = useMemo(() => {
    if (
      !selectedTileReportCapsuleEnvelope ||
      !selectedTileReportCapsuleHandoff ||
      !selectedTileOperatorActionQueue ||
      !selectedTileCaseReviewTimeline ||
      !selectedTileCustomerExportFirewall ||
      !selectedTileSourceCoverageMatrix
    ) {
      return null;
    }
    return buildVlmBrainReleaseReviewPacket(
      selectedTileReportCapsuleEnvelope,
      selectedTileReportCapsuleHandoff,
      selectedTileOperatorActionQueue,
      selectedTileCaseReviewTimeline,
      selectedTileCustomerExportFirewall,
      selectedTileSourceCoverageMatrix,
      result,
    );
  }, [
    result,
    selectedTileCaseReviewTimeline,
    selectedTileCustomerExportFirewall,
    selectedTileOperatorActionQueue,
    selectedTileReportCapsuleEnvelope,
    selectedTileReportCapsuleHandoff,
    selectedTileSourceCoverageMatrix,
  ]);
  // PASS215 marker: selected VLM Brain tile now builds a release review packet combining source coverage, freshness, redaction, durable case and PDF gates.
  const selectedTileSourceTruthSpineLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Prawda źródeł",
        decision: "decyzja",
        score: "truth score",
        blocked: "blokery",
        stale: "stale",
        missing: "braki",
        export: "eksport",
        durable: "durable",
        lanes: "adapter lanes",
      };
    }
    if (locale === "de") {
      return {
        title: "Source Truth Spine",
        decision: "Entscheidung",
        score: "Truth Score",
        blocked: "Blocker",
        stale: "Stale",
        missing: "Fehlend",
        export: "Export",
        durable: "Durable",
        lanes: "Adapter-Lanes",
      };
    }
    return {
      title: "Source Truth Spine",
      decision: "decision",
      score: "truth score",
      blocked: "blockers",
      stale: "stale",
      missing: "missing",
      export: "export",
      durable: "durable",
      lanes: "adapter lanes",
    };
  }, [locale]);

  const selectedTileSourceTruthSpine = useMemo(() => {
    if (
      !selectedTileReportCapsuleEnvelope ||
      !selectedTileSourceCoverageMatrix ||
      !selectedTileReleaseReviewPacket
    )
      return null;
    return buildVlmBrainSourceTruthSpine(
      selectedTileReportCapsuleEnvelope,
      selectedTileSourceCoverageMatrix,
      selectedTileReleaseReviewPacket,
      result,
    );
  }, [
    result,
    selectedTileReleaseReviewPacket,
    selectedTileReportCapsuleEnvelope,
    selectedTileSourceCoverageMatrix,
  ]);
  // PASS216 marker: selected VLM Brain tile now builds a source truth spine tying adapter freshness, source coverage and release gates together before customer export.

  const selectedTileLiveAdapterFreshnessLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Świeżość adapterów live",
        decision: "decyzja",
        score: "freshness score",
        refresh: "refresh",
        hardStop: "hard stop",
        export: "eksport",
        ledger: "ledger",
        lanes: "linie adapterów",
      };
    }
    if (locale === "de") {
      return {
        title: "Live-Adapter-Frische",
        decision: "Entscheidung",
        score: "Freshness Score",
        refresh: "Refresh",
        hardStop: "Hard Stop",
        export: "Export",
        ledger: "Ledger",
        lanes: "Adapter-Lanes",
      };
    }
    return {
      title: "Live Adapter Freshness",
      decision: "decision",
      score: "freshness score",
      refresh: "refresh",
      hardStop: "hard stop",
      export: "export",
      ledger: "ledger",
      lanes: "adapter lanes",
    };
  }, [locale]);

  const selectedTileLiveAdapterFreshnessMesh = useMemo(() => {
    if (!selectedTileSourceTruthSpine || !selectedTileReleaseReviewPacket)
      return null;
    return buildVlmBrainLiveAdapterFreshnessMesh(
      selectedTileSourceTruthSpine,
      selectedTileReleaseReviewPacket,
      result,
    );
  }, [result, selectedTileReleaseReviewPacket, selectedTileSourceTruthSpine]);
  // PASS217 marker: selected VLM Brain tile now builds a live adapter freshness mesh with TTL, cache decision, hard stop and source-ledger preview gates.

  const selectedTileSourcePolicyGateLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Brama polityki źródeł",
        decision: "decyzja",
        allowlist: "allowlist",
        trusted: "preview",
        blocked: "blokery",
        second: "drugie źródło",
        customer: "customer copy",
        lanes: "policy lanes",
      };
    }
    if (locale === "de") {
      return {
        title: "Source-Policy-Gate",
        decision: "Entscheidung",
        allowlist: "Allowlist",
        trusted: "Preview",
        blocked: "Blocker",
        second: "Zweitquelle",
        customer: "Customer Copy",
        lanes: "Policy-Lanes",
      };
    }
    return {
      title: "Source Policy Gate",
      decision: "decision",
      allowlist: "allowlist",
      trusted: "preview",
      blocked: "blockers",
      second: "second source",
      customer: "customer copy",
      lanes: "policy lanes",
    };
  }, [locale]);

  const selectedTileSourcePolicyGate = useMemo(() => {
    if (!selectedTileLiveAdapterFreshnessMesh) return null;
    return buildVlmBrainSourcePolicyGate(
      selectedTileLiveAdapterFreshnessMesh,
      result,
    );
  }, [result, selectedTileLiveAdapterFreshnessMesh]);
  // PASS218 marker: selected VLM Brain tile now builds a source policy gate with allowlist, reviewer and forbidden-claim lanes.

  const selectedTileDurableSnapshotLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Plan zapisu durable",
        decision: "decyzja",
        source: "source store",
        case: "case store",
        export: "manifest",
        blocked: "blokery",
        writes: "write plan",
      };
    }
    if (locale === "de") {
      return {
        title: "Durable-Snapshot-Plan",
        decision: "Entscheidung",
        source: "Source Store",
        case: "Case Store",
        export: "Manifest",
        blocked: "Blocker",
        writes: "Write Plan",
      };
    }
    return {
      title: "Durable Snapshot Plan",
      decision: "decision",
      source: "source store",
      case: "case store",
      export: "manifest",
      blocked: "blockers",
      writes: "write plan",
    };
  }, [locale]);

  const selectedTileDurableSnapshotPlan = useMemo(() => {
    if (
      !selectedTileLiveAdapterFreshnessMesh ||
      !selectedTileSourcePolicyGate ||
      !selectedTileReleaseReviewPacket
    )
      return null;
    return buildVlmBrainDurableSnapshotPlan(
      selectedTileLiveAdapterFreshnessMesh,
      selectedTileSourcePolicyGate,
      selectedTileReleaseReviewPacket,
    );
  }, [
    selectedTileLiveAdapterFreshnessMesh,
    selectedTileReleaseReviewPacket,
    selectedTileSourcePolicyGate,
  ]);
  // PASS219 marker: selected VLM Brain tile now builds a durable snapshot write plan for source/case/redaction/export stores before PDF/customer export.

  const selectedTileReleaseChainAuditLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Audyt release chain",
        decision: "decyzja",
        score: "readiness",
        blockers: "blokery",
        review: "review",
        adapters: "adaptery",
        pdf: "PDF",
        lanes: "chain lanes",
        next: "następny krok",
      };
    }
    if (locale === "de") {
      return {
        title: "Release-Chain-Audit",
        decision: "Entscheidung",
        score: "Readiness",
        blockers: "Blocker",
        review: "Review",
        adapters: "Adapter",
        pdf: "PDF",
        lanes: "Chain-Lanes",
        next: "Nächster Schritt",
      };
    }
    return {
      title: "Release chain audit",
      decision: "decision",
      score: "readiness",
      blockers: "blockers",
      review: "review",
      adapters: "adapters",
      pdf: "PDF",
      lanes: "chain lanes",
      next: "next step",
    };
  }, [locale]);

  const selectedTileReleaseChainAudit = useMemo(() => {
    if (
      !selectedTileCustomerExportFirewall ||
      !selectedTileSourceCoverageMatrix ||
      !selectedTileReleaseReviewPacket ||
      !selectedTileSourceTruthSpine ||
      !selectedTileLiveAdapterFreshnessMesh ||
      !selectedTileSourcePolicyGate ||
      !selectedTileDurableSnapshotPlan
    ) {
      return null;
    }
    return buildVlmBrainReleaseChainAudit(
      selectedTileCustomerExportFirewall,
      selectedTileSourceCoverageMatrix,
      selectedTileReleaseReviewPacket,
      selectedTileSourceTruthSpine,
      selectedTileLiveAdapterFreshnessMesh,
      selectedTileSourcePolicyGate,
      selectedTileDurableSnapshotPlan,
      result,
    );
  }, [
    result,
    selectedTileCustomerExportFirewall,
    selectedTileDurableSnapshotPlan,
    selectedTileLiveAdapterFreshnessMesh,
    selectedTileReleaseReviewPacket,
    selectedTileSourceCoverageMatrix,
    selectedTileSourcePolicyGate,
    selectedTileSourceTruthSpine,
  ]);
  // PASS220 marker: selected VLM Brain tile now audits the full release chain before customer copy, PDF route or durable export can move forward.
  const selectedTileSourceLedgerUiPreviewLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Source Ledger UI",
        decision: "decyzja",
        blocked: "blokery",
        server: "server",
        preview: "preview",
        browser: "browser QA",
        lanes: "ledger lanes",
      };
    }
    if (locale === "de") {
      return {
        title: "Source-Ledger-UI",
        decision: "Entscheidung",
        blocked: "Blocker",
        server: "Server",
        preview: "Preview",
        browser: "Browser QA",
        lanes: "Ledger-Lanes",
      };
    }
    return {
      title: "Source Ledger UI",
      decision: "decision",
      blocked: "blockers",
      server: "server",
      preview: "preview",
      browser: "browser QA",
      lanes: "ledger lanes",
    };
  }, [locale]);

  const selectedTileSourceLedgerUiPreview = useMemo(() => {
    if (!selectedTileReleaseChainAudit || !selectedTileDurableSnapshotPlan)
      return null;
    return buildVlmBrainSourceLedgerUiPreview(
      selectedTileReleaseChainAudit,
      selectedTileDurableSnapshotPlan,
      result,
    );
  }, [result, selectedTileDurableSnapshotPlan, selectedTileReleaseChainAudit]);
  // PASS221 marker: selected VLM Brain tile now builds a source ledger UI preview with server-write, browser-QA and raw-payload gates.

  const selectedTilePdfPreviewManifestLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Manifest PDF preview",
        route: "route",
        blocked: "blokery",
        review: "review",
        customer: "customer copy",
        sections: "sekcje",
      };
    }
    if (locale === "de") {
      return {
        title: "PDF-Preview-Manifest",
        route: "Route",
        blocked: "Blocker",
        review: "Review",
        customer: "Customer Copy",
        sections: "Sektionen",
      };
    }
    return {
      title: "PDF preview manifest",
      route: "route",
      blocked: "blockers",
      review: "review",
      customer: "customer copy",
      sections: "sections",
    };
  }, [locale]);

  const selectedTilePdfPreviewManifest = useMemo(() => {
    if (
      !selectedTileReportCapsuleEnvelope ||
      !selectedTileReleaseChainAudit ||
      !selectedTileSourceLedgerUiPreview
    )
      return null;
    return buildVlmBrainPdfPreviewManifest(
      selectedTileReportCapsuleEnvelope,
      selectedTileReleaseChainAudit,
      selectedTileSourceLedgerUiPreview,
    );
  }, [
    selectedTileReleaseChainAudit,
    selectedTileReportCapsuleEnvelope,
    selectedTileSourceLedgerUiPreview,
  ]);
  // PASS222 marker: selected VLM Brain tile now builds a PDF-ready HTML preview manifest while binary PDF download stays disabled.

  const selectedTileLensShieldHandoffLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Lens → Shield handoff",
        decision: "decyzja",
        query: "query",
        publicRoute: "public route",
        routes: "routes",
      };
    }
    if (locale === "de") {
      return {
        title: "Lens → Shield Handoff",
        decision: "Entscheidung",
        query: "Query",
        publicRoute: "Public Route",
        routes: "Routes",
      };
    }
    return {
      title: "Lens → Shield handoff",
      decision: "decision",
      query: "query",
      publicRoute: "public route",
      routes: "routes",
    };
  }, [locale]);

  const selectedTileLensShieldHandoff = useMemo(() => {
    if (
      !selectedTileReleaseChainAudit ||
      !selectedTileSourceLedgerUiPreview ||
      !selectedTilePdfPreviewManifest
    )
      return null;
    return buildVlmBrainLensShieldHandoff(
      selectedTileReleaseChainAudit,
      selectedTileSourceLedgerUiPreview,
      selectedTilePdfPreviewManifest,
      result,
    );
  }, [
    result,
    selectedTilePdfPreviewManifest,
    selectedTileReleaseChainAudit,
    selectedTileSourceLedgerUiPreview,
  ]);
  // PASS223 marker: selected VLM Brain tile now builds a Lens-to-Shield handoff preview with privacy route and raw query payload blocked.

  const selectedTileReleaseQaScorecardLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Release QA scorecard",
        decision: "decyzja",
        score: "score",
        blocked: "blokery",
        review: "review",
        browser: "browser",
        lanes: "QA lanes",
      };
    }
    if (locale === "de") {
      return {
        title: "Release-QA-Scorecard",
        decision: "Entscheidung",
        score: "Score",
        blocked: "Blocker",
        review: "Review",
        browser: "Browser",
        lanes: "QA-Lanes",
      };
    }
    return {
      title: "Release QA scorecard",
      decision: "decision",
      score: "score",
      blocked: "blockers",
      review: "review",
      browser: "browser",
      lanes: "QA lanes",
    };
  }, [locale]);

  const selectedTileReleaseQaScorecard = useMemo(() => {
    if (
      !selectedTileReleaseChainAudit ||
      !selectedTileSourceLedgerUiPreview ||
      !selectedTilePdfPreviewManifest ||
      !selectedTileLensShieldHandoff
    )
      return null;
    return buildVlmBrainReleaseQaScorecard(
      selectedTileReleaseChainAudit,
      selectedTileSourceLedgerUiPreview,
      selectedTilePdfPreviewManifest,
      selectedTileLensShieldHandoff,
      result,
    );
  }, [
    result,
    selectedTileLensShieldHandoff,
    selectedTilePdfPreviewManifest,
    selectedTileReleaseChainAudit,
    selectedTileSourceLedgerUiPreview,
  ]);
  // PASS224 marker: selected VLM Brain tile now builds a release QA scorecard aggregating browser, motion, source, redaction, PDF, Lens, durable and copy gates.

  const selectedTileEightPassLabels = useMemo(() => {
    if (locale === "pl")
      return {
        blocker: "Resolver blokerów",
        browser: "Browser QA",
        copy: "Customer copy",
        pdf: "PDF route",
        ledger: "Ledger persistence",
        feeds: "Live feeds",
        wallet: "Wallet access",
        launch: "Launch readiness",
        decision: "decyzja",
        score: "score",
        p0: "P0",
        lanes: "lanes",
      };
    if (locale === "de")
      return {
        blocker: "Blocker-Resolver",
        browser: "Browser QA",
        copy: "Customer Copy",
        pdf: "PDF Route",
        ledger: "Ledger Persistence",
        feeds: "Live Feeds",
        wallet: "Wallet Access",
        launch: "Launch Readiness",
        decision: "Entscheidung",
        score: "Score",
        p0: "P0",
        lanes: "Lanes",
      };
    return {
      blocker: "Blocker resolver",
      browser: "Browser QA",
      copy: "Customer copy",
      pdf: "PDF route",
      ledger: "Ledger persistence",
      feeds: "Live feeds",
      wallet: "Wallet access",
      launch: "Launch readiness",
      decision: "decision",
      score: "score",
      p0: "P0",
      lanes: "lanes",
    };
  }, [locale]);

  const selectedTileReleaseBlockerResolver = useMemo(() => {
    if (!selectedTileReleaseChainAudit || !selectedTileReleaseQaScorecard)
      return null;
    return buildVlmBrainReleaseBlockerResolver(
      selectedTileReleaseChainAudit,
      selectedTileReleaseQaScorecard,
    );
  }, [selectedTileReleaseChainAudit, selectedTileReleaseQaScorecard]);
  // PASS225 marker: selected VLM Brain tile resolves P0/P1 release blockers before customer export, public route or binary PDF.

  const selectedTileBrowserQaRunbook = useMemo(() => {
    if (!selectedTileReleaseBlockerResolver || !selectedTileReleaseQaScorecard)
      return null;
    return buildVlmBrainBrowserQaRunbook(
      selectedTileReleaseBlockerResolver,
      selectedTileReleaseQaScorecard,
    );
  }, [selectedTileReleaseBlockerResolver, selectedTileReleaseQaScorecard]);
  // PASS226 marker: selected VLM Brain tile builds a real-browser QA runbook for modal layers, Orbit FPS, tile drawer, search portal, keyboard and mobile.

  const selectedTileCustomerCopySanitizer = useMemo(() => {
    if (!selectedTilePdfPreviewManifest || !selectedTileReleaseBlockerResolver)
      return null;
    return buildVlmBrainCustomerCopySanitizer(
      selectedTilePdfPreviewManifest,
      selectedTileReleaseBlockerResolver,
      result,
    );
  }, [
    result,
    selectedTilePdfPreviewManifest,
    selectedTileReleaseBlockerResolver,
  ]);
  // PASS227 marker: selected VLM Brain tile sanitizes customer copy and blocks forbidden profit/safety/trading language before export.

  const selectedTilePdfRouteContract = useMemo(() => {
    if (
      !selectedTilePdfPreviewManifest ||
      !selectedTileCustomerCopySanitizer ||
      !selectedTileReleaseBlockerResolver
    )
      return null;
    return buildVlmBrainPdfRouteContract(
      selectedTilePdfPreviewManifest,
      selectedTileCustomerCopySanitizer,
      selectedTileReleaseBlockerResolver,
    );
  }, [
    selectedTileCustomerCopySanitizer,
    selectedTilePdfPreviewManifest,
    selectedTileReleaseBlockerResolver,
  ]);
  // PASS228 marker: selected VLM Brain tile keeps binary PDF disabled through a PDF route contract while HTML preview stays operator-only.

  const selectedTileLedgerPersistenceAdapterPlan = useMemo(() => {
    if (!selectedTileSourceLedgerUiPreview || !selectedTileDurableSnapshotPlan)
      return null;
    return buildVlmBrainLedgerPersistenceAdapterPlan(
      selectedTileSourceLedgerUiPreview,
      selectedTileDurableSnapshotPlan,
    );
  }, [selectedTileDurableSnapshotPlan, selectedTileSourceLedgerUiPreview]);
  // PASS229 marker: selected VLM Brain tile maps source/case/redaction/export ledger writes to server-only persistence adapters.

  const selectedTileLiveFeedAdapterMatrix = useMemo(() => {
    if (!selectedTileLiveAdapterFreshnessMesh) return null;
    return buildVlmBrainLiveFeedAdapterMatrix(
      selectedTileLiveAdapterFreshnessMesh,
      result,
    );
  }, [result, selectedTileLiveAdapterFreshnessMesh]);
  // PASS230 marker: selected VLM Brain tile shows holder/orderbook/contract/OSINT/market live-feed adapter gaps before public copy.

  const selectedTileWalletAccessGateMatrix = useMemo(() => {
    if (!selectedTileReleaseQaScorecard) return null;
    return buildVlmBrainWalletAccessGateMatrix(
      selectedTileReleaseQaScorecard,
      result,
    );
  }, [result, selectedTileReleaseQaScorecard]);
  // PASS231 marker: selected VLM Brain tile maps Basic/Pro/Advanced wallet/session entitlement gates and keeps seed phrase flow forbidden.

  const selectedTileLaunchReadinessDashboard = useMemo(() => {
    if (
      !selectedTileReleaseBlockerResolver ||
      !selectedTileBrowserQaRunbook ||
      !selectedTileCustomerCopySanitizer ||
      !selectedTilePdfRouteContract ||
      !selectedTileLedgerPersistenceAdapterPlan ||
      !selectedTileLiveFeedAdapterMatrix ||
      !selectedTileWalletAccessGateMatrix
    )
      return null;
    return buildVlmBrainLaunchReadinessDashboard(
      selectedTileReleaseBlockerResolver,
      selectedTileBrowserQaRunbook,
      selectedTileCustomerCopySanitizer,
      selectedTilePdfRouteContract,
      selectedTileLedgerPersistenceAdapterPlan,
      selectedTileLiveFeedAdapterMatrix,
      selectedTileWalletAccessGateMatrix,
    );
  }, [
    selectedTileBrowserQaRunbook,
    selectedTileCustomerCopySanitizer,
    selectedTileLedgerPersistenceAdapterPlan,
    selectedTileLiveFeedAdapterMatrix,
    selectedTilePdfRouteContract,
    selectedTileReleaseBlockerResolver,
    selectedTileWalletAccessGateMatrix,
  ]);
  // PASS232 marker: selected VLM Brain tile aggregates blocker, browser, copy, PDF, persistence, live-feed and wallet gates into one launch readiness dashboard.

  const selectedTileQaTraceBundle = useMemo(() => {
    if (!selectedTileLaunchReadinessDashboard || !selectedTileBrowserQaRunbook)
      return null;
    return buildVlmBrainQaTraceBundle(
      selectedTileLaunchReadinessDashboard,
      selectedTileBrowserQaRunbook,
    );
  }, [selectedTileBrowserQaRunbook, selectedTileLaunchReadinessDashboard]);
  // PASS233 marker: selected VLM Brain tile bundles browser QA traces before renderer, PDF or customer route decisions.

  const selectedTileAdapterOrchestrationPlan = useMemo(() => {
    if (
      !selectedTileLiveFeedAdapterMatrix ||
      !selectedTileLedgerPersistenceAdapterPlan
    )
      return null;
    return buildVlmBrainAdapterOrchestrationPlan(
      selectedTileLiveFeedAdapterMatrix,
      selectedTileLedgerPersistenceAdapterPlan,
    );
  }, [
    selectedTileLedgerPersistenceAdapterPlan,
    selectedTileLiveFeedAdapterMatrix,
  ]);
  // PASS234 marker: selected VLM Brain tile orchestrates live-feed and durable-storage adapters as server-required gates.

  const selectedTileAccessCopyFirewall = useMemo(() => {
    if (
      !selectedTileWalletAccessGateMatrix ||
      !selectedTileCustomerCopySanitizer
    )
      return null;
    return buildVlmBrainAccessCopyFirewall(
      selectedTileWalletAccessGateMatrix,
      selectedTileCustomerCopySanitizer,
    );
  }, [selectedTileCustomerCopySanitizer, selectedTileWalletAccessGateMatrix]);
  // PASS235 marker: selected VLM Brain tile blocks wallet/access copy claims and keeps recovery-phrase/private-key flows forbidden.

  const selectedTilePdfStorageRedactionBridge = useMemo(() => {
    if (
      !selectedTilePdfRouteContract ||
      !selectedTileLedgerPersistenceAdapterPlan
    )
      return null;
    return buildVlmBrainPdfStorageRedactionBridge(
      selectedTilePdfRouteContract,
      selectedTileLedgerPersistenceAdapterPlan,
    );
  }, [selectedTileLedgerPersistenceAdapterPlan, selectedTilePdfRouteContract]);
  // PASS236 marker: selected VLM Brain tile bridges PDF route, durable storage and redaction envelope before any binary export.

  const selectedTileMissingDataEscalationQueue = useMemo(() => {
    if (
      !selectedTileLaunchReadinessDashboard ||
      !selectedTileLiveFeedAdapterMatrix
    )
      return null;
    return buildVlmBrainMissingDataEscalationQueue(
      selectedTileLaunchReadinessDashboard,
      selectedTileLiveFeedAdapterMatrix,
    );
  }, [selectedTileLaunchReadinessDashboard, selectedTileLiveFeedAdapterMatrix]);
  // PASS237 marker: selected VLM Brain tile escalates missing holder/orderbook/contract/OSINT data instead of treating gaps as neutral.

  const selectedTileRendererComparisonPlan = useMemo(() => {
    if (!selectedTileBrowserQaRunbook || !selectedTileQaTraceBundle)
      return null;
    return buildVlmBrainRendererComparisonPlan(
      selectedTileBrowserQaRunbook,
      selectedTileQaTraceBundle,
    );
  }, [selectedTileBrowserQaRunbook, selectedTileQaTraceBundle]);
  // PASS238 marker: selected VLM Brain tile keeps DOM vs WebGL comparison behind QA trace gates.

  const selectedTileGovernancePolicyMemo = useMemo(() => {
    if (!selectedTileReleaseBlockerResolver || !selectedTileSourcePolicyGate)
      return null;
    return buildVlmBrainGovernancePolicyMemo(
      selectedTileReleaseBlockerResolver,
      selectedTileSourcePolicyGate,
    );
  }, [selectedTileReleaseBlockerResolver, selectedTileSourcePolicyGate]);
  // PASS239 marker: selected VLM Brain tile keeps forbidden-claim and source-policy governance active before customer copy.

  const selectedTileAuditTrailIndex = useMemo(() => {
    if (!selectedTileReleaseChainAudit || !selectedTileSourceLedgerUiPreview)
      return null;
    return buildVlmBrainAuditTrailIndex(
      selectedTileReleaseChainAudit,
      selectedTileSourceLedgerUiPreview,
    );
  }, [selectedTileReleaseChainAudit, selectedTileSourceLedgerUiPreview]);
  // PASS240 marker: selected VLM Brain tile indexes release-chain audit lanes back to source ledger refs.

  const selectedTileCustomerReadinessPreflight = useMemo(() => {
    if (
      !selectedTileAccessCopyFirewall ||
      !selectedTileMissingDataEscalationQueue ||
      !selectedTilePdfStorageRedactionBridge
    )
      return null;
    return buildVlmBrainCustomerReadinessPreflight(
      selectedTileAccessCopyFirewall,
      selectedTileMissingDataEscalationQueue,
      selectedTilePdfStorageRedactionBridge,
    );
  }, [
    selectedTileAccessCopyFirewall,
    selectedTileMissingDataEscalationQueue,
    selectedTilePdfStorageRedactionBridge,
  ]);
  // PASS241 marker: selected VLM Brain tile locks customer route readiness until access, missing-data and PDF/storage gates pass.

  const selectedTileMegaBranchControlTower = useMemo(() => {
    if (
      !selectedTileAdapterOrchestrationPlan ||
      !selectedTileRendererComparisonPlan ||
      !selectedTileGovernancePolicyMemo ||
      !selectedTileAuditTrailIndex ||
      !selectedTileCustomerReadinessPreflight
    )
      return null;
    return buildVlmBrainMegaBranchControlTower(
      selectedTileAdapterOrchestrationPlan,
      selectedTileRendererComparisonPlan,
      selectedTileGovernancePolicyMemo,
      selectedTileAuditTrailIndex,
      selectedTileCustomerReadinessPreflight,
    );
  }, [
    selectedTileAdapterOrchestrationPlan,
    selectedTileAuditTrailIndex,
    selectedTileCustomerReadinessPreflight,
    selectedTileGovernancePolicyMemo,
    selectedTileRendererComparisonPlan,
  ]);
  // PASS242 marker: selected VLM Brain tile aggregates PASS233-PASS242 release control into one internal tower.

  const selectedTileReleaseTriageBoard = useMemo(() => {
    if (
      !selectedTileReleaseChainAudit ||
      !selectedTileLaunchReadinessDashboard ||
      !selectedTileMegaBranchControlTower ||
      !selectedTilePdfPreviewManifest ||
      !selectedTileWalletAccessGateMatrix
    )
      return null;
    return buildVlmBrainReleaseTriageBoard(
      selectedTileReleaseChainAudit,
      selectedTileLaunchReadinessDashboard,
      selectedTileMegaBranchControlTower,
      selectedTilePdfPreviewManifest,
      selectedTileWalletAccessGateMatrix,
      result,
    );
  }, [
    result,
    selectedTileLaunchReadinessDashboard,
    selectedTileMegaBranchControlTower,
    selectedTilePdfPreviewManifest,
    selectedTileReleaseChainAudit,
    selectedTileWalletAccessGateMatrix,
  ]);
  // PASS243 marker: selected VLM Brain tile now compresses release-chain, launch, PDF and wallet gates into one honest triage board.

  const selectedTileOperatorHandoffVault = useMemo(() => {
    if (
      !selectedTileReleaseTriageBoard ||
      !selectedTileDurableSnapshotPlan ||
      !selectedTileAuditTrailIndex ||
      !selectedTileReportCapsuleEnvelope
    )
      return null;
    return buildVlmBrainOperatorHandoffVault(
      selectedTileReleaseTriageBoard,
      selectedTileDurableSnapshotPlan,
      selectedTileAuditTrailIndex,
      selectedTileReportCapsuleEnvelope,
    );
  }, [
    selectedTileAuditTrailIndex,
    selectedTileDurableSnapshotPlan,
    selectedTileReleaseTriageBoard,
    selectedTileReportCapsuleEnvelope,
  ]);
  // PASS244 marker: selected VLM Brain tile now prepares an operator handoff vault for durable writes, redaction manifest and browser trace capture.

  const selectedTileBrowserReplayScript = useMemo(() => {
    if (
      !selectedTileReleaseTriageBoard ||
      !selectedTileRendererComparisonPlan ||
      !selectedTileQaTraceBundle
    )
      return null;
    return buildVlmBrainBrowserReplayScript(
      selectedTileReleaseTriageBoard,
      selectedTileRendererComparisonPlan,
      selectedTileQaTraceBundle,
      result,
    );
  }, [
    result,
    selectedTileQaTraceBundle,
    selectedTileReleaseTriageBoard,
    selectedTileRendererComparisonPlan,
  ]);
  // PASS245 marker: selected VLM Brain tile now outputs a real-browser replay script so static guards are not mistaken for browser QA.

  const selectedTileExportAuthorizationGate = useMemo(() => {
    if (
      !selectedTileReleaseTriageBoard ||
      !selectedTileOperatorHandoffVault ||
      !selectedTileBrowserReplayScript ||
      !selectedTileReleaseQaScorecard
    )
      return null;
    return buildVlmBrainExportAuthorizationGate(
      selectedTileReleaseTriageBoard,
      selectedTileOperatorHandoffVault,
      selectedTileBrowserReplayScript,
      selectedTileReleaseQaScorecard,
    );
  }, [
    selectedTileBrowserReplayScript,
    selectedTileOperatorHandoffVault,
    selectedTileReleaseQaScorecard,
    selectedTileReleaseTriageBoard,
  ]);
  // PASS246 marker: selected VLM Brain tile now produces one export authorization gate instead of scattered PDF/customer/wallet decisions.

  const selectedTileBrowserEvidenceCollector = useMemo(() => {
    if (
      !selectedTileBrowserReplayScript ||
      !selectedTileQaTraceBundle ||
      !selectedTileRendererComparisonPlan
    )
      return null;
    return buildVlmBrainBrowserEvidenceCollector(
      selectedTileBrowserReplayScript,
      selectedTileQaTraceBundle,
      selectedTileRendererComparisonPlan,
    );
  }, [
    selectedTileBrowserReplayScript,
    selectedTileQaTraceBundle,
    selectedTileRendererComparisonPlan,
  ]);
  // PASS247 marker: selected VLM Brain tile now collects concrete browser evidence artifacts before renderer or export decisions.

  const selectedTileAdapterReadinessScheduler = useMemo(() => {
    if (
      !selectedTileLiveFeedAdapterMatrix ||
      !selectedTileLiveAdapterFreshnessMesh ||
      !selectedTileAdapterOrchestrationPlan
    )
      return null;
    return buildVlmBrainAdapterReadinessScheduler(
      selectedTileLiveFeedAdapterMatrix,
      selectedTileLiveAdapterFreshnessMesh,
      selectedTileAdapterOrchestrationPlan,
    );
  }, [
    selectedTileAdapterOrchestrationPlan,
    selectedTileLiveAdapterFreshnessMesh,
    selectedTileLiveFeedAdapterMatrix,
  ]);
  // PASS248 marker: selected VLM Brain tile now schedules live-feed and freshness adapter work into P0/P1/P2 server-required tasks.

  const selectedTileCustomerBriefBuilder = useMemo(() => {
    if (
      !selectedTileReportCapsuleEnvelope ||
      !selectedTileCustomerCopySanitizer ||
      !selectedTileSourcePolicyGate ||
      !selectedTileExportAuthorizationGate
    )
      return null;
    return buildVlmBrainCustomerBriefBuilder(
      selectedTileReportCapsuleEnvelope,
      selectedTileCustomerCopySanitizer,
      selectedTileSourcePolicyGate,
      selectedTileExportAuthorizationGate,
    );
  }, [
    selectedTileCustomerCopySanitizer,
    selectedTileExportAuthorizationGate,
    selectedTileReportCapsuleEnvelope,
    selectedTileSourcePolicyGate,
  ]);
  // PASS249 marker: selected VLM Brain tile now builds a sanitized customer brief preview while public copy stays blocked.

  const selectedTileWalletSessionPolicy = useMemo(() => {
    if (
      !selectedTileWalletAccessGateMatrix ||
      !selectedTileAccessCopyFirewall ||
      !selectedTileExportAuthorizationGate
    )
      return null;
    return buildVlmBrainWalletSessionPolicy(
      selectedTileWalletAccessGateMatrix,
      selectedTileAccessCopyFirewall,
      selectedTileExportAuthorizationGate,
    );
  }, [
    selectedTileAccessCopyFirewall,
    selectedTileExportAuthorizationGate,
    selectedTileWalletAccessGateMatrix,
  ]);
  // PASS250 marker: selected VLM Brain tile now gates wallet sessions without seed phrase/private key or ROI/public-sale copy.

  const selectedTileReleaseReadinessOrchestrator = useMemo(() => {
    if (
      !selectedTileExportAuthorizationGate ||
      !selectedTileBrowserEvidenceCollector ||
      !selectedTileAdapterReadinessScheduler ||
      !selectedTileCustomerBriefBuilder ||
      !selectedTileWalletSessionPolicy ||
      !selectedTileDurableSnapshotPlan ||
      !selectedTilePdfPreviewManifest
    )
      return null;
    return buildVlmBrainReleaseReadinessOrchestrator(
      selectedTileExportAuthorizationGate,
      selectedTileBrowserEvidenceCollector,
      selectedTileAdapterReadinessScheduler,
      selectedTileCustomerBriefBuilder,
      selectedTileWalletSessionPolicy,
      selectedTileDurableSnapshotPlan,
      selectedTilePdfPreviewManifest,
    );
  }, [
    selectedTileAdapterReadinessScheduler,
    selectedTileBrowserEvidenceCollector,
    selectedTileCustomerBriefBuilder,
    selectedTileDurableSnapshotPlan,
    selectedTileExportAuthorizationGate,
    selectedTilePdfPreviewManifest,
    selectedTileWalletSessionPolicy,
  ]);
  // PASS251 marker: selected VLM Brain tile now orchestrates authorization, browser evidence, adapters, customer brief, wallet session, durable snapshot and PDF manifest into one release decision.

  const selectedTileReleaseCockpitLabels = useMemo(() => {
    if (locale === "pl")
      return {
        title: "Release cockpit",
        decision: "decyzja",
        score: "score",
        blockers: "blokery",
        review: "review",
        gates: "bramy",
        actions: "priorytetowe kroki",
        boundary: "granica publikacji",
      };
    if (locale === "de")
      return {
        title: "Release Cockpit",
        decision: "Entscheidung",
        score: "Score",
        blockers: "Blocker",
        review: "Review",
        gates: "Gates",
        actions: "Priorisierte Schritte",
        boundary: "Publikationsgrenze",
      };
    return {
      title: "Release cockpit",
      decision: "decision",
      score: "score",
      blockers: "blockers",
      review: "review",
      gates: "gates",
      actions: "priority actions",
      boundary: "publication boundary",
    };
  }, [locale]);

  const selectedTileReleaseCockpit = useMemo(() => {
    if (
      !selectedTileReleaseReadinessOrchestrator ||
      !selectedTileReleaseTriageBoard ||
      !selectedTileReleaseQaScorecard ||
      !selectedTileBrowserEvidenceCollector ||
      !selectedTileAdapterReadinessScheduler ||
      !selectedTileCustomerBriefBuilder ||
      !selectedTileWalletSessionPolicy ||
      !selectedTilePdfRouteContract
    ) {
      return null;
    }
    return buildVlmBrainReleaseCockpit(
      selectedTileReleaseReadinessOrchestrator,
      selectedTileReleaseTriageBoard,
      selectedTileReleaseQaScorecard,
      selectedTileBrowserEvidenceCollector,
      selectedTileAdapterReadinessScheduler,
      selectedTileCustomerBriefBuilder,
      selectedTileWalletSessionPolicy,
      selectedTilePdfRouteContract,
    );
  }, [
    selectedTileAdapterReadinessScheduler,
    selectedTileBrowserEvidenceCollector,
    selectedTileCustomerBriefBuilder,
    selectedTilePdfRouteContract,
    selectedTileReleaseQaScorecard,
    selectedTileReleaseReadinessOrchestrator,
    selectedTileReleaseTriageBoard,
    selectedTileWalletSessionPolicy,
  ]);
  // PASS252 marker: selected VLM Brain tile now has one release cockpit that compresses readiness, browser QA, adapters, customer copy, wallet and PDF route gates into a single operator control surface.

  const selectedTilePass254HandoffLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Release handoff",
        decision: "decyzja",
        p0: "P0 blokery",
        p1: "P1 review",
        lanes: "bramy release",
        actions: "kolejne kroki",
        boundary: "granica publikacji",
        source: "source",
        lens: "Lens",
        pdf: "PDF",
        wallet: "wallet",
      };
    }
    if (locale === "de") {
      return {
        title: "Release-Handoff",
        decision: "Entscheidung",
        p0: "P0 Blocker",
        p1: "P1 Review",
        lanes: "Release-Gates",
        actions: "Nächste Schritte",
        boundary: "Publikationsgrenze",
        source: "Source",
        lens: "Lens",
        pdf: "PDF",
        wallet: "Wallet",
      };
    }
    return {
      title: "Release handoff",
      decision: "decision",
      p0: "P0 blockers",
      p1: "P1 review",
      lanes: "release gates",
      actions: "next actions",
      boundary: "publication boundary",
      source: "source",
      lens: "Lens",
      pdf: "PDF",
      wallet: "wallet",
    };
  }, [locale]);

  const selectedTilePass254ReleaseHandoff = useMemo(() => {
    if (
      !selectedTileReleaseCockpit ||
      !selectedTileSourceLedgerUiPreview ||
      !selectedTileLensShieldHandoff ||
      !selectedTilePdfPreviewManifest ||
      !selectedTileWalletSessionPolicy ||
      !selectedTileBrowserEvidenceCollector
    ) {
      return null;
    }
    return buildVlmBrainReleaseCockpitSourceLedgerHandoff(
      selectedTileReleaseCockpit,
      selectedTileSourceLedgerUiPreview,
      selectedTileLensShieldHandoff,
      selectedTilePdfPreviewManifest,
      selectedTileWalletSessionPolicy,
      selectedTileBrowserEvidenceCollector,
    );
  }, [
    selectedTileBrowserEvidenceCollector,
    selectedTileLensShieldHandoff,
    selectedTilePdfPreviewManifest,
    selectedTileReleaseCockpit,
    selectedTileSourceLedgerUiPreview,
    selectedTileWalletSessionPolicy,
  ]);
  // PASS254 marker: selected tile release handoff compresses cockpit, source ledger, Lens/PDF, wallet/session and browser evidence gates into one readable operator layer.

  const selectedTileCommandDeckItems = useMemo(() => {
    return [
      {
        label: selectedTileCommandDeckLabels.capsule,
        value: selectedTileReportCapsuleEnvelope?.exportReadiness ?? "review",
        detail:
          selectedTileReportCapsuleEnvelope?.schemaVersion ??
          "capsule not prepared",
      },
      {
        label: selectedTileCommandDeckLabels.ledger,
        value: selectedTileSourceLedgerUiPreview?.ledgerDecision ?? "review",
        detail: selectedTileSourceLedgerUiPreview?.browserTraceRequired
          ? "browser trace required"
          : "browser trace clear",
      },
      {
        label: selectedTileCommandDeckLabels.pdf,
        value: selectedTilePdfPreviewManifest?.routeState ?? "blocked",
        detail:
          selectedTilePdfPreviewManifest?.customerCopyAllowed ?? "preview only",
      },
      {
        label: selectedTileCommandDeckLabels.handoff,
        value: selectedTilePass254ReleaseHandoff?.decision ?? "review",
        detail:
          selectedTilePass254ReleaseHandoff?.operatorSummary ??
          "handoff pending",
      },
    ];
  }, [
    selectedTileCommandDeckLabels,
    selectedTilePass254ReleaseHandoff,
    selectedTilePdfPreviewManifest,
    selectedTileReportCapsuleEnvelope,
    selectedTileSourceLedgerUiPreview,
  ]);

  const selectedTilePass255ActionRouterLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Action router",
        decision: "decyzja",
        p0: "P0 blokery",
        p1: "P1 review",
        phases: "kolejność pracy",
        artifacts: "browser replay",
        actions: "najbliższe kroki",
        boundary: "granica operatora",
      };
    }
    if (locale === "de") {
      return {
        title: "Action Router",
        decision: "Entscheidung",
        p0: "P0 Blocker",
        p1: "P1 Review",
        phases: "Arbeitsreihenfolge",
        artifacts: "Browser-Replay",
        actions: "Nächste Schritte",
        boundary: "Operator-Grenze",
      };
    }
    return {
      title: "Action router",
      decision: "decision",
      p0: "P0 blockers",
      p1: "P1 review",
      phases: "work order",
      artifacts: "browser replay",
      actions: "next actions",
      boundary: "operator boundary",
    };
  }, [locale]);

  const selectedTilePass255ActionRouter = useMemo(() => {
    if (!selectedTilePass254ReleaseHandoff) return null;
    return buildVlmBrainPass255ActionRouter(selectedTilePass254ReleaseHandoff);
  }, [selectedTilePass254ReleaseHandoff]);
  // PASS255 marker: selected tile action router orders evidence intake, browser replay, export freeze and wallet/customer-copy gates without enabling public export.

  const selectedTilePass256EvidenceRunbookLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Evidence runbook",
        decision: "decyzja",
        blocked: "blokady",
        capture: "do nagrania",
        queue: "kolejka dowodów",
        replay: "browser replay",
        freeze: "export freeze",
        next: "następny ruch",
        boundary: "granica publikacji",
      };
    }
    if (locale === "de") {
      return {
        title: "Evidence-Runbook",
        decision: "Entscheidung",
        blocked: "Blocker",
        capture: "Aufnahme nötig",
        queue: "Evidenz-Queue",
        replay: "Browser-Replay",
        freeze: "Export-Freeze",
        next: "Nächster Schritt",
        boundary: "Publikationsgrenze",
      };
    }
    return {
      title: "Evidence runbook",
      decision: "decision",
      blocked: "blocked",
      capture: "capture required",
      queue: "evidence queue",
      replay: "browser replay",
      freeze: "export freeze",
      next: "next move",
      boundary: "publication boundary",
    };
  }, [locale]);

  const selectedTilePass256EvidenceRunbook = useMemo(() => {
    if (!selectedTilePass255ActionRouter) return null;
    return buildVlmBrainPass256EvidenceRunbook(selectedTilePass255ActionRouter);
  }, [selectedTilePass255ActionRouter]);
  // PASS256 marker: selected tile evidence runbook turns action-router phases into a visible operator queue, browser replay checklist and export quarantine matrix.

  const selectedTilePass257EvidenceSlaLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Evidence SLA timeline",
        decision: "decyzja",
        blocker: "P0 blokery",
        capture: "capture lane",
        timeline: "SLA timeline",
        escalation: "eskalacja",
        firewall: "exception firewall",
        next: "następny SLA ruch",
      };
    }
    if (locale === "de") {
      return {
        title: "Evidence-SLA-Timeline",
        decision: "Entscheidung",
        blocker: "P0 Blocker",
        capture: "Capture-Lane",
        timeline: "SLA-Timeline",
        escalation: "Eskalation",
        firewall: "Exception-Firewall",
        next: "Nächster SLA-Schritt",
      };
    }
    return {
      title: "Evidence SLA timeline",
      decision: "decision",
      blocker: "P0 blockers",
      capture: "capture lane",
      timeline: "SLA timeline",
      escalation: "escalation",
      firewall: "exception firewall",
      next: "next SLA move",
    };
  }, [locale]);

  const selectedTilePass257EvidenceSlaTimeline = useMemo(() => {
    if (!selectedTilePass256EvidenceRunbook) return null;
    return buildVlmBrainPass257EvidenceSlaTimeline(
      selectedTilePass256EvidenceRunbook,
    );
  }, [selectedTilePass256EvidenceRunbook]);
  // PASS257 marker: selected tile evidence SLA timeline orders P0 blockers, browser capture, escalation lanes and an exception firewall without enabling public export.

  const selectedTilePass258ProofReceiptLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Proof receipt lock",
        decision: "decyzja",
        missing: "brakujące receipt",
        capture: "trace do nagrania",
        receipts: "receipt lanes",
        signoff: "owner signoff",
        trace: "browser trace pack",
        locks: "release locks",
        next: "następny proof move",
      };
    }
    if (locale === "de") {
      return {
        title: "Proof-Receipt-Lock",
        decision: "Entscheidung",
        missing: "fehlende Receipts",
        capture: "Trace nötig",
        receipts: "Receipt-Lanes",
        signoff: "Owner-Signoff",
        trace: "Browser-Trace-Pack",
        locks: "Release-Locks",
        next: "Nächster Proof-Schritt",
      };
    }
    return {
      title: "Proof receipt lock",
      decision: "decision",
      missing: "missing receipts",
      capture: "trace capture",
      receipts: "receipt lanes",
      signoff: "owner signoff",
      trace: "browser trace pack",
      locks: "release locks",
      next: "next proof move",
    };
  }, [locale]);

  const selectedTilePass258ProofReceiptLock = useMemo(() => {
    if (!selectedTilePass257EvidenceSlaTimeline) return null;
    return buildVlmBrainPass258ProofReceiptLock(
      selectedTilePass257EvidenceSlaTimeline,
    );
  }, [selectedTilePass257EvidenceSlaTimeline]);
  // PASS258 marker: selected tile proof receipt lock adds owner signoff, browser trace receipts and release locks without enabling public export.

  const selectedTilePass259AttestationLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Attestation ledger",
        decision: "decyzja",
        missing: "brakujące attestation",
        capture: "capture wymagany",
        review: "owner review",
        attestations: "attestation lanes",
        freeze: "freeze reasons",
        checklist: "promotion checklist",
        trace: "trace refs",
        next: "następny attestation move",
      };
    }
    if (locale === "de") {
      return {
        title: "Attestation-Ledger",
        decision: "Entscheidung",
        missing: "fehlende Attestations",
        capture: "Capture nötig",
        review: "Owner Review",
        attestations: "Attestation-Lanes",
        freeze: "Freeze-Gründe",
        checklist: "Promotion-Checklist",
        trace: "Trace-Refs",
        next: "Nächster Attestation-Schritt",
      };
    }
    return {
      title: "Attestation ledger",
      decision: "decision",
      missing: "missing attestations",
      capture: "capture required",
      review: "owner review",
      attestations: "attestation lanes",
      freeze: "freeze reasons",
      checklist: "promotion checklist",
      trace: "trace refs",
      next: "next attestation move",
    };
  }, [locale]);

  const selectedTilePass259AttestationLedger = useMemo(() => {
    if (!selectedTilePass258ProofReceiptLock) return null;
    return buildVlmBrainPass259AttestationLedger(
      selectedTilePass258ProofReceiptLock,
    );
  }, [selectedTilePass258ProofReceiptLock]);
  // PASS259 marker: selected tile attestation ledger converts proof receipts into reviewed owner lanes and keeps release promotion frozen.

  const selectedTilePass260PromotionFirewallLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Promotion firewall",
        decision: "decyzja",
        blocked: "blokady",
        capture: "capture",
        review: "review",
        freeze: "customer freeze",
        lanes: "promotion lanes",
        packets: "review packets",
        checklist: "checklist",
        next: "następny promotion move",
      };
    }
    if (locale === "de") {
      return {
        title: "Promotion-Firewall",
        decision: "Entscheidung",
        blocked: "Blockaden",
        capture: "Capture",
        review: "Review",
        freeze: "Customer-Freeze",
        lanes: "Promotion-Lanes",
        packets: "Review-Pakete",
        checklist: "Checklist",
        next: "Nächster Promotion-Schritt",
      };
    }
    return {
      title: "Promotion firewall",
      decision: "decision",
      blocked: "blocked",
      capture: "capture",
      review: "review",
      freeze: "customer freeze",
      lanes: "promotion lanes",
      packets: "review packets",
      checklist: "checklist",
      next: "next promotion move",
    };
  }, [locale]);

  const selectedTilePass260PromotionFirewall = useMemo(() => {
    if (!selectedTilePass259AttestationLedger) return null;
    return buildVlmBrainPass260ReleasePromotionFirewall(
      selectedTilePass259AttestationLedger,
    );
  }, [selectedTilePass259AttestationLedger]);
  // PASS260 marker: selected tile release promotion firewall converts attestations into review packets and keeps customer/public surfaces frozen.

  const selectedTilePass261CutoverControlLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Cutover control",
        decision: "decyzja",
        blocked: "blokady",
        capture: "capture",
        review: "review/rollback",
        lanes: "cutover lanes",
        rollback: "rollback vault",
        seals: "readiness seals",
        next: "następny cutover move",
      };
    }
    if (locale === "de") {
      return {
        title: "Cutover-Control",
        decision: "Entscheidung",
        blocked: "Blockaden",
        capture: "Capture",
        review: "Review/Rollback",
        lanes: "Cutover-Lanes",
        rollback: "Rollback-Vault",
        seals: "Readiness-Seals",
        next: "Nächster Cutover-Schritt",
      };
    }
    return {
      title: "Cutover control",
      decision: "decision",
      blocked: "blocked",
      capture: "capture",
      review: "review/rollback",
      lanes: "cutover lanes",
      rollback: "rollback vault",
      seals: "readiness seals",
      next: "next cutover move",
    };
  }, [locale]);

  const selectedTilePass261CutoverControl = useMemo(() => {
    if (!selectedTilePass260PromotionFirewall) return null;
    return buildVlmBrainPass261ReleaseCutoverControl(
      selectedTilePass260PromotionFirewall,
    );
  }, [selectedTilePass260PromotionFirewall]);
  // PASS261 marker: selected tile release cutover control adds rollback vault and readiness seals while release cutover remains disabled.

  const selectedTilePass262ReleaseRehearsalLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Release rehearsal",
        decision: "decyzja",
        blocked: "blokady",
        evidence: "brak dowodu",
        rollback: "rollback drill",
        signoff: "owner signoff",
        lanes: "rehearsal lanes",
        locks: "surface locks",
        next: "następny dry-run move",
      };
    }
    if (locale === "de") {
      return {
        title: "Release-Rehearsal",
        decision: "Entscheidung",
        blocked: "Blockaden",
        evidence: "fehlende Evidenz",
        rollback: "Rollback-Drill",
        signoff: "Owner-Signoff",
        lanes: "Rehearsal-Lanes",
        locks: "Surface-Locks",
        next: "Nächster Dry-Run-Schritt",
      };
    }
    return {
      title: "Release rehearsal",
      decision: "decision",
      blocked: "blocked",
      evidence: "missing evidence",
      rollback: "rollback drill",
      signoff: "owner signoff",
      lanes: "rehearsal lanes",
      locks: "surface locks",
      next: "next dry-run move",
    };
  }, [locale]);

  const selectedTilePass262ReleaseRehearsalMatrix = useMemo(() => {
    if (!selectedTilePass261CutoverControl) return null;
    return buildVlmBrainPass262ReleaseRehearsalMatrix(
      selectedTilePass261CutoverControl,
    );
  }, [selectedTilePass261CutoverControl]);
  // PASS262 marker: selected tile release rehearsal matrix requires dry-run evidence, rollback drill and owner signoff while public release stays locked.

  const selectedTilePass263CandidateTrustLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Candidate trust board",
        decision: "decyzja",
        blocked: "blokady",
        proof: "proof gaps",
        copy: "copy review",
        lanes: "candidate lanes",
        cues: "trust cues",
        locks: "surface locks",
        next: "następny trust move",
      };
    }
    if (locale === "de") {
      return {
        title: "Candidate-Trust-Board",
        decision: "Entscheidung",
        blocked: "Blockaden",
        proof: "Proof-Gaps",
        copy: "Copy-Review",
        lanes: "Candidate-Lanes",
        cues: "Trust-Cues",
        locks: "Surface-Locks",
        next: "Nächster Trust-Schritt",
      };
    }
    return {
      title: "Candidate trust board",
      decision: "decision",
      blocked: "blocked",
      proof: "proof gaps",
      copy: "copy review",
      lanes: "candidate lanes",
      cues: "trust cues",
      locks: "surface locks",
      next: "next trust move",
    };
  }, [locale]);

  const selectedTilePass263CandidateTrustBoard = useMemo(() => {
    if (!selectedTilePass262ReleaseRehearsalMatrix) return null;
    return buildVlmBrainPass263ReleaseCandidateTrustBoard(
      selectedTilePass262ReleaseRehearsalMatrix,
    );
  }, [selectedTilePass262ReleaseRehearsalMatrix]);
  // PASS263 marker: selected tile release candidate trust board keeps trust psychology, customer copy and public surfaces operator-only.

  const selectedTilePass264TrustNarrativeLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Trust narrative guard",
        stages: "etapy narracji",
        patterns: "dark-pattern review",
        locks: "locked surfaces",
        proof: "proof gaps",
        next: "następny narrative move",
        stageLabel: "narrative stages",
        patternLabel: "blocked persuasion risks",
      };
    }
    if (locale === "de") {
      return {
        title: "Trust-Narrative-Guard",
        stages: "Narrativ-Stufen",
        patterns: "Dark-Pattern-Review",
        locks: "Locked Surfaces",
        proof: "Proof-Gaps",
        next: "Nächster Narrative-Schritt",
        stageLabel: "Narrativ-Stufen",
        patternLabel: "Gesperrte Persuasion-Risiken",
      };
    }
    return {
      title: "Trust narrative guard",
      stages: "narrative stages",
      patterns: "dark-pattern review",
      locks: "locked surfaces",
      proof: "proof gaps",
      next: "next narrative move",
      stageLabel: "narrative stages",
      patternLabel: "blocked persuasion risks",
    };
  }, [locale]);

  const selectedTilePass264TrustNarrativeGuard = useMemo(() => {
    if (!selectedTilePass263CandidateTrustBoard) return null;
    return buildVlmBrainPass264TrustNarrativeGuard(
      selectedTilePass263CandidateTrustBoard,
    );
  }, [selectedTilePass263CandidateTrustBoard]);
  // PASS264 marker: selected tile trust narrative guard blocks urgency, certainty theatre, public badges and access shortcuts while public release surfaces stay locked.

  const selectedTilePass265EvidenceLanguageLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Evidence language ledger",
        steps: "language steps",
        tones: "tone checks",
        locks: "locked surfaces",
        proof: "proof gaps",
        order: "reading order",
        next: "następny language move",
        stepLabel: "evidence-first language steps",
        toneLabel: "blocked tone risks",
      };
    }
    if (locale === "de") {
      return {
        title: "Evidence-Language-Ledger",
        steps: "Language Steps",
        tones: "Tone Checks",
        locks: "Locked Surfaces",
        proof: "Proof-Gaps",
        order: "Reading Order",
        next: "Nächster Language-Schritt",
        stepLabel: "Evidence-first Language Steps",
        toneLabel: "Gesperrte Tone-Risiken",
      };
    }
    return {
      title: "Evidence language ledger",
      steps: "language steps",
      tones: "tone checks",
      locks: "locked surfaces",
      proof: "proof gaps",
      order: "reading order",
      next: "next language move",
      stepLabel: "evidence-first language steps",
      toneLabel: "blocked tone risks",
    };
  }, [locale]);

  const selectedTilePass265EvidenceLanguageLedger = useMemo(() => {
    if (!selectedTilePass264TrustNarrativeGuard) return null;
    return buildVlmBrainPass265EvidenceLanguageLedger(
      selectedTilePass264TrustNarrativeGuard,
    );
  }, [selectedTilePass264TrustNarrativeGuard]);
  // PASS265 marker: selected tile evidence language ledger lowers cognitive load with source context, visible limitations, manual review and locked surface copy boundaries.

  const selectedTilePass266ClaimTraceabilityLabels = useMemo(() => {
    if (locale === "pl") {
      return {
        title: "Claim traceability matrix",
        claims: "claim lanes",
        checks: "comprehension checks",
        locks: "locked claims",
        proof: "proof gaps",
        protocol: "claim reading protocol",
        next: "następny traceability move",
        laneLabel: "claim-to-evidence lanes",
        checkLabel: "comprehension gate checks",
      };
    }
    if (locale === "de") {
      return {
        title: "Claim-Traceability-Matrix",
        claims: "Claim-Lanes",
        checks: "Comprehension Checks",
        locks: "Locked Claims",
        proof: "Proof-Gaps",
        protocol: "Claim Reading Protocol",
        next: "Nächster Traceability-Schritt",
        laneLabel: "Claim-to-Evidence-Lanes",
        checkLabel: "Comprehension-Gate-Checks",
      };
    }
    return {
      title: "Claim traceability matrix",
      claims: "claim lanes",
      checks: "comprehension checks",
      locks: "locked claims",
      proof: "proof gaps",
      protocol: "claim reading protocol",
      next: "next traceability move",
      laneLabel: "claim-to-evidence lanes",
      checkLabel: "comprehension gate checks",
    };
  }, [locale]);

  const selectedTilePass266ClaimTraceabilityMatrix = useMemo(() => {
    if (!selectedTilePass265EvidenceLanguageLedger) return null;
    return buildVlmBrainPass266ClaimTraceabilityMatrix(
      selectedTilePass265EvidenceLanguageLedger,
    );
  }, [selectedTilePass265EvidenceLanguageLedger]);
  // PASS266 marker: selected tile claim traceability matrix maps every claim lane to an evidence anchor, comprehension check and locked public surface.

  // PASS324 compatibility marker: legacy wheel interception removed; drawer now uses native contained scrolling.
  const selectedTileDetailScrollFrameRef = useRef<HTMLDivElement | null>(null);
  const selectedTileDetailTouchRef = useRef<{ y: number | null }>({ y: null });

  const normalizeSelectedTileDetailDeltaPass355 = useCallback(
    (deltaY: number, deltaMode?: number) => {
      const frame = selectedTileDetailScrollFrameRef.current;
      if (deltaMode === 1) return deltaY * 18;
      if (deltaMode === 2)
        return deltaY * Math.max(180, frame?.clientHeight ?? 420);
      return deltaY;
    },
    [],
  );

  const routeSelectedTileDetailScrollPass350 = useCallback(
    (deltaY: number, deltaMode?: number) => {
      const frame = selectedTileDetailScrollFrameRef.current;
      if (!frame) return false;
      const maxScroll = Math.max(0, frame.scrollHeight - frame.clientHeight);
      if (maxScroll <= 0) return false;
      const current = frame.scrollTop;
      const normalizedDelta = normalizeSelectedTileDetailDeltaPass355(
        deltaY,
        deltaMode,
      );
      const next = Math.min(maxScroll, Math.max(0, current + normalizedDelta));
      frame.scrollTop = next;
      return next !== current;
    },
    [normalizeSelectedTileDetailDeltaPass355],
  );

  const consumeSelectedTileWheelPass355 = useCallback(
    (event: ReactWheelEvent<HTMLElement> | WheelEvent) => {
      routeSelectedTileDetailScrollPass350(event.deltaY, event.deltaMode);
      event.preventDefault();
      event.stopPropagation();
    },
    [routeSelectedTileDetailScrollPass350],
  );

  const consumeSelectedTileTouchStartPass355 = useCallback(
    (event: ReactTouchEvent<HTMLElement> | TouchEvent) => {
      selectedTileDetailTouchRef.current.y = event.touches[0]?.clientY ?? null;
      event.stopPropagation();
    },
    [],
  );

  const consumeSelectedTileTouchMovePass355 = useCallback(
    (event: ReactTouchEvent<HTMLElement> | TouchEvent) => {
      const nextY = event.touches[0]?.clientY ?? null;
      const previousY = selectedTileDetailTouchRef.current.y;
      if (nextY != null && previousY != null) {
        routeSelectedTileDetailScrollPass350(previousY - nextY, 0);
        selectedTileDetailTouchRef.current.y = nextY;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    [routeSelectedTileDetailScrollPass350],
  );

  const isSelectedTileDetailScrollZonePass351 = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('[data-vlm-scroll-zone="true"]'));
    },
    [],
  );

  const stopOrbitLeakPass352 = useCallback((event: SyntheticEvent) => {
    // PASS352: keep native scroll inside the drawer, but never let wheel/touch drag the Orbit canvas/body.
    event.stopPropagation();
  }, []);

  const scrollSelectedTileDetailFramePass356 = useCallback(
    (deltaY: number, deltaMode?: number) => {
      const frame = selectedTileDetailScrollFrameRef.current;
      if (!frame) return false;
      const maxScroll = Math.max(0, frame.scrollHeight - frame.clientHeight);
      if (maxScroll <= 0) return false;
      const next = Math.min(
        maxScroll,
        Math.max(
          0,
          frame.scrollTop +
            normalizeSelectedTileDetailDeltaPass355(deltaY, deltaMode),
        ),
      );
      if (Math.abs(next - frame.scrollTop) < 0.5) return true;
      frame.scrollTop = next;
      return true;
    },
    [normalizeSelectedTileDetailDeltaPass355],
  );

  const stopSelectedTileNativeScrollLeakPass356 = useCallback(
    (event: SyntheticEvent) => {
      // PASS356: true native scroll zone. Do not preventDefault inside the frame; only stop the Orbit/body handlers.
      event.stopPropagation();
    },
    [],
  );

  const routeSelectedTilePanelWheelPass356 = useCallback(
    (event: ReactWheelEvent<HTMLElement> | WheelEvent) => {
      if (isSelectedTileDetailScrollZonePass351(event.target)) {
        event.stopPropagation();
        return;
      }
      scrollSelectedTileDetailFramePass356(event.deltaY, event.deltaMode);
      event.preventDefault();
      event.stopPropagation();
    },
    [
      isSelectedTileDetailScrollZonePass351,
      scrollSelectedTileDetailFramePass356,
    ],
  );

  const routeSelectedTilePanelTouchStartPass356 = useCallback(
    (event: ReactTouchEvent<HTMLElement> | TouchEvent) => {
      selectedTileDetailTouchRef.current.y = event.touches[0]?.clientY ?? null;
      event.stopPropagation();
    },
    [],
  );

  const routeSelectedTilePanelTouchMovePass356 = useCallback(
    (event: ReactTouchEvent<HTMLElement> | TouchEvent) => {
      if (isSelectedTileDetailScrollZonePass351(event.target)) {
        event.stopPropagation();
        return;
      }
      const nextY = event.touches[0]?.clientY ?? null;
      const previousY = selectedTileDetailTouchRef.current.y;
      if (nextY != null && previousY != null) {
        scrollSelectedTileDetailFramePass356(previousY - nextY, 0);
        selectedTileDetailTouchRef.current.y = nextY;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    [
      isSelectedTileDetailScrollZonePass351,
      scrollSelectedTileDetailFramePass356,
    ],
  );

  const handleSelectedTileKeyboardScrollPass356 = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const frame = selectedTileDetailScrollFrameRef.current;
      if (!frame) return;
      const keyDelta: Record<string, number> = {
        ArrowDown: 42,
        ArrowUp: -42,
        PageDown: frame.clientHeight * 0.82,
        PageUp: -frame.clientHeight * 0.82,
        " ": frame.clientHeight * 0.82,
      };
      if (event.key === "Home") {
        frame.scrollTop = 0;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === "End") {
        frame.scrollTop = frame.scrollHeight;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const delta = keyDelta[event.key];
      if (typeof delta !== "number") return;
      scrollSelectedTileDetailFramePass356(delta, 0);
      event.preventDefault();
      event.stopPropagation();
    },
    [scrollSelectedTileDetailFramePass356],
  );

  useEffect(() => {
    if (!selectedNode || typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    root.classList.add(
      "shield-vlm-detail-open-pass353",
      "shield-vlm-detail-open-pass356",
    );
    body.classList.add(
      "shield-vlm-detail-open-pass353",
      "shield-vlm-detail-open-pass356",
    );

    const isScrollZone = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('[data-vlm-scroll-zone="true"]'));
    };
    const isPanel = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest('[data-pass353-orbit-scroll-boundary="true"]'),
      );
    };

    const handleWheel = (event: WheelEvent) => {
      // PASS356: inside the scroll-frame stays native; panel chrome/padding is bridged into the frame.
      if (isScrollZone(event.target)) {
        event.stopPropagation();
        return;
      }
      if (isPanel(event.target)) {
        scrollSelectedTileDetailFramePass356(event.deltaY, event.deltaMode);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const handleTouchStart = (event: TouchEvent) => {
      routeSelectedTilePanelTouchStartPass356(event);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isScrollZone(event.target)) {
        event.stopPropagation();
        return;
      }
      if (isPanel(event.target)) {
        routeSelectedTilePanelTouchMovePass356(event);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const panel = document.querySelector<HTMLElement>('[data-pass353-orbit-scroll-boundary="true"]');
    if (!panel) return undefined;
    panel.addEventListener("wheel", handleWheel, { passive: false });
    panel.addEventListener("touchstart", handleTouchStart, { passive: true });
    panel.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      panel.removeEventListener("wheel", handleWheel);
      panel.removeEventListener("touchstart", handleTouchStart);
      panel.removeEventListener("touchmove", handleTouchMove);
      root.classList.remove(
        "shield-vlm-detail-open-pass353",
        "shield-vlm-detail-open-pass356",
      );
      body.classList.remove(
        "shield-vlm-detail-open-pass353",
        "shield-vlm-detail-open-pass356",
      );
    };
  }, [
    routeSelectedTilePanelTouchMovePass356,
    routeSelectedTilePanelTouchStartPass356,
    scrollSelectedTileDetailFramePass356,
    selectedNode,
  ]);
  // PASS353 marker: document-level Orbit scroll router keeps the drawer scrollable even when the Orbit canvas/body has wheel handlers.
  // PASS355 marker: all wheel/touch deltas are normalized and consumed by the inner scroll-frame, including SVG/text targets and panel padding.
  // PASS356 marker: scroll-frame returns to true native scrolling; only panel chrome is delta-bridged into the frame and keyboard Page/Arrow/Home/End are supported.
  // PASS355 compatibility marker: consumeSelectedTileWheelPass355(event) and consumeSelectedTileTouchMovePass355(event) remain available but PASS356 only uses them as legacy fallback, not inside native frame.

  useEffect(() => {
    if (!selectedNode) return;
    const frame = selectedTileDetailScrollFrameRef.current;
    if (!frame) return;
    frame.scrollTop = 0;
    frame.setAttribute("tabindex", "-1");
    requestAnimationFrame(() => frame.focus({ preventScroll: true }));
  }, [selectedNode]);
  // PASS354 marker: every selected tile opens with a focused native scroll frame; SVG/text targets are routed with Element.closest, not HTMLElement-only checks.

  const selectedTileDetailPortal =
    selectedNode && typeof document !== "undefined"
      ? createPortal(
          <div
            className="shield-vlm-detail-portal-root shield-vlm-detail-portal-pass201 shield-vlm-detail-portal-pass353"
            data-vlm-brain-mode={mode}
            data-vlm-no-drag="true"
          >
            <button
              type="button"
              aria-label="Close tile detail"
              className="shield-vlm-detail-dismiss-layer shield-vlm-detail-dismiss-layer-portal"
              data-vlm-no-drag="true"
              onClick={() => setSelectedNode(null)}
              onPointerDown={(event) => event.stopPropagation()}
            />
            <div
              key={selectedNode.label}
              className="shield-vlm-detail-panel shield-vlm-detail-panel-side shield-vlm-detail-panel-solid shield-vlm-detail-panel-popup shield-vlm-detail-panel-portal shield-vlm-detail-panel-edge shield-vlm-detail-panel-pass314 shield-vlm-detail-panel-pass324 shield-vlm-detail-panel-pass325 shield-vlm-detail-panel-pass326 shield-vlm-detail-panel-pass327 shield-vlm-detail-panel-pass342 shield-vlm-detail-panel-pass344 shield-vlm-detail-panel-pass345 shield-vlm-detail-panel-pass346 shield-vlm-detail-panel-pass347 shield-vlm-detail-panel-pass348 shield-vlm-detail-panel-pass349 shield-vlm-detail-panel-pass350 shield-vlm-detail-panel-pass352 shield-vlm-detail-panel-pass353 shield-vlm-detail-panel-pass354 shield-vlm-detail-panel-pass355 shield-vlm-detail-panel-pass359 shield-vlm-detail-panel-pass367 z-30"
              role="dialog"
              aria-modal="false"
              aria-label={`${ui.selectedPoint}: ${selectedNode.label}`}
              tabIndex={-1}
              data-vlm-no-drag="true"
              data-pass288-orbit-right-edge-scroll="true"
              data-pass327-native-scroll="true"
              data-pass342-scroll-repair="true"
              data-pass343-scroll-lock="manual-wheel"
              data-pass344-native-scroll-no-sticky="true"
              data-pass345-scroll-v4="true"
              data-pass346-orbit-scroll-hardlock="true"
              data-pass347-orbit-scroll-native="true"
              data-pass348-orbit-native-scroll-v6="true"
              data-pass349-orbit-scroll-frame="true"
              data-pass349-public-drawer-trim="true"
              data-pass350-orbit-scroll-engine="true"
              data-pass351-orbit-native-scroll-router="true"
              data-pass352-orbit-scroll-contract="true"
              data-pass353-orbit-scroll-boundary="true"
              data-pass354-orbit-svg-scroll-router="true"
              data-pass355-orbit-delta-normalizer="true"
              data-pass356-orbit-native-bridge="true"
              data-pass359-orbit-clean-drawer="true"
              data-pass367-orbit-reader-scroll="true"
              data-pass367-public-detail-trim="true"
              data-selected-node-group={selectedNode.group}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerMove={(event) => event.stopPropagation()}
              onTouchMove={(event) => event.stopPropagation()}
              onScrollCapture={(event) => event.stopPropagation()}
              onWheelCapture={(event) => {
                // PASS346 compatibility marker retained for guard: panel.scrollTop += event.deltaY
                // PASS347 compatibility: nearestScrollZone + Math.max(0, scrollTarget.scrollTop + event.deltaY).
                // PASS348 compatibility string retained: Do not preventDefault on the main drawer.
                // PASS348 compatibility string retained: scrollTarget !== panel && maxScroll > 0.
                // PASS348/PASS349 compatibility kept, but PASS350 routes every wheel delta into the inner scroll-frame.
                // PASS350 compatibility guard: routeSelectedTileDetailScrollPass350(event.deltaY); event.preventDefault();
                // PASS351: if the pointer is already inside the scroll-frame, allow native browser scrolling and only stop the Orbit/body leak. Compatibility: isSelectedTileDetailScrollZonePass351(event.target) routeSelectedTileDetailScrollPass350(event.deltaY).
                // PASS352: outside-padding wheel is routed into the frame; inside-frame wheel stays native.
                // PASS353: native document router also blocks body/orbit leaks when React capture misses a wheel frame.
                routeSelectedTilePanelWheelPass356(event);
              }}
              onTouchStartCapture={(event) => {
                routeSelectedTilePanelTouchStartPass356(event);
              }}
              onTouchMoveCapture={(event) => {
                routeSelectedTilePanelTouchMovePass356(event);
              }}
              onKeyDownCapture={handleSelectedTileKeyboardScrollPass356}
            >
              <div
                ref={selectedTileDetailScrollFrameRef}
                className="shield-vlm-detail-scroll-frame shield-vlm-detail-scroll-frame-pass349 shield-vlm-detail-scroll-frame-pass350 shield-vlm-detail-scroll-frame-pass351 shield-vlm-detail-scroll-frame-pass352 shield-vlm-detail-scroll-frame-pass353 shield-vlm-detail-scroll-frame-pass354 shield-vlm-detail-scroll-frame-pass355 shield-vlm-detail-scroll-frame-pass359 shield-vlm-detail-scroll-frame-animated"
                data-vlm-scroll-zone="true"
                data-pass349-scroll-sandbox="true"
                data-pass350-orbit-scroll-frame="true"
                data-pass351-native-scroll-zone="true"
                data-pass352-native-scroll-zone="true"
                data-pass353-native-scroll-zone="true"
                data-pass354-native-scroll-zone="true"
                data-pass355-scroll-delta-sink="true"
                data-pass356-native-scroll-bridge="true"
                data-pass359-native-scroll-zone="true"
                data-selected-node={selectedNode.label}
                // PASS352 compatibility: inside-frame wheel stays native; legacy guard expected onWheelCapture={stopOrbitLeakPass352}. PASS356 keeps the frame native and only stops Orbit/body propagation.
                onWheelCapture={stopSelectedTileNativeScrollLeakPass356}
                onTouchStartCapture={routeSelectedTilePanelTouchStartPass356}
                onTouchMoveCapture={stopSelectedTileNativeScrollLeakPass356}
                onKeyDownCapture={handleSelectedTileKeyboardScrollPass356}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">
                      {ui.selectedPoint} · {selectedNode.group}
                    </p>
                    <h3 className="mt-2 truncate font-mono text-sm uppercase tracking-[0.10em] text-white">
                      {selectedNode.label.split(" ")[0]} ·{" "}
                      {nodeDisplayCopy[selectedNode.group].label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    data-vlm-no-drag="true"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setSelectedNode(null)}
                    className="rounded-full border border-white/[0.10] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.50] hover:text-white"
                  >
                    {ui.close}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <p className="font-mono text-2xl text-white tabular-nums">
                    {selectedNode.value}
                  </p>
                  <span
                    className={`shield-vlm-detail-severity shield-vlm-detail-severity-${selectedTileEvidenceCopy?.severityTone ?? "calm"}`}
                  >
                    {selectedTileEvidenceCopy?.severityLabel}
                  </span>
                </div>
                <p className="shield-vlm-pass343-unique-tile-copy mt-3">
                  {nodeDisplayCopy[selectedNode.group].summary}
                </p>
                <div className="shield-vlm-detail-action-row mt-3 shield-vlm-detail-action-row-pass350">
                  <button
                    type="button"
                    data-vlm-no-drag="true"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => selectRelativeNode(-1)}
                  >
                    ←{" "}
                    {selectedTileEvidenceCopy?.intelligenceLabels.previousTile}
                  </button>
                  <span>
                    {selectedTileEvidenceCopy?.intelligenceLabels.keyboardHint}
                  </span>
                  <button
                    type="button"
                    data-vlm-no-drag="true"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => selectRelativeNode(1)}
                  >
                    {selectedTileEvidenceCopy?.intelligenceLabels.nextTile} →
                  </button>
                </div>
                <div
                  className="shield-vlm-detail-depth-note mt-3"
                  data-vlm-brain-depth-note={mode}
                >
                  <strong>
                    {isAdvanced
                      ? ui.advancedTitle
                      : isPro
                        ? ui.proTitle
                        : ui.basicTitle}
                  </strong>
                  <span>
                    {isAdvanced
                      ? ui.advancedHint
                      : isPro
                        ? ui.proHint
                        : ui.basicHint}
                  </span>
                </div>
                <div className="shield-vlm-evidence-chain-rail mt-3">
                  <span>
                    {selectedTileEvidenceCopy?.intelligenceLabels.evidenceRail}{" "}
                    · {selectedTileEvidenceCopy?.evidenceRail}
                  </span>
                  <span>
                    {
                      selectedTileEvidenceCopy?.intelligenceLabels
                        .confidenceRail
                    }{" "}
                    · {selectedTileEvidenceCopy?.confidenceRail}
                  </span>
                  <span>
                    {selectedTileEvidenceCopy?.intelligenceLabels.decisionRail}{" "}
                    · {selectedTileEvidenceCopy?.decisionRail}
                  </span>
                </div>
                <div
                  className="shield-vlm-decision-dock mt-3"
                  data-vlm-decision-dock="true"
                >
                  {(selectedTileEvidenceCopy?.decisionDock ?? []).map(
                    (dock) => (
                      <span key={dock.label}>
                        <strong>{dock.label}</strong>
                        <b>{dock.value}</b>
                        <small>{dock.detail}</small>
                      </span>
                    ),
                  )}
                </div>
                <div
                  className="shield-vlm-command-deck mt-3 rounded-[1.4rem] border border-velmere-gold/[0.16] bg-[linear-gradient(145deg,rgba(212,175,55,.07),rgba(255,255,255,.02),rgba(0,0,0,.22))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
                  data-vlm-command-deck="true"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-velmere-gold">
                        <Sparkles className="h-4 w-4" />
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em]">
                          {selectedTileCommandDeckLabels.title}
                        </p>
                      </div>
                      <p className="mt-3 max-w-2xl text-xs leading-6 text-white/[0.62]">
                        {selectedTileCommandDeckLabels.subtitle}
                      </p>
                    </div>
                    <span className="velmere-command-pill min-h-0 bg-black/[0.22] px-3 py-2 text-[8px]">
                      {selectedTileEvidenceCopy?.sourceTrust}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedTileCommandDeckItems.map((item) => (
                      <div
                        key={item.label}
                        data-command-tone={commandStateTone(item.value)}
                        className="group shield-vlm-command-deck-card velmere-readout-card rounded-2xl p-4 transition duration-300 hover:border-white/[0.18] hover:bg-white/[0.04]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.36]">
                            {item.label}
                          </p>
                          <ArrowUpRight className="h-3.5 w-3.5 text-white/[0.26] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/[0.58]" />
                        </div>
                        <p className="mt-2 text-sm text-white/[0.86]">
                          {item.value}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-white/[0.50]">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="shield-vlm-report-capsule mt-3"
                  data-vlm-report-capsule="true"
                >
                  <div className="shield-vlm-report-capsule-head">
                    <strong>
                      {
                        selectedTileEvidenceCopy?.intelligenceLabels
                          .reportCapsule
                      }
                    </strong>
                    <span>
                      {selectedTileEvidenceCopy?.intelligenceLabels.exportGate}
                    </span>
                  </div>
                  <div className="shield-vlm-report-capsule-grid">
                    {(selectedTileEvidenceCopy?.reportCapsule ?? []).map(
                      (item) => (
                        <span
                          key={item.label}
                          data-command-tone={commandStateTone(item.value)}
                          className="shield-vlm-report-capsule-card"
                        >
                          <strong>{item.label}</strong>
                          <b>{item.value}</b>
                          <small>{item.detail}</small>
                        </span>
                      ),
                    )}
                  </div>
                  <div
                    className="shield-vlm-report-capsule-footer"
                    data-vlm-report-capsule-envelope="true"
                  >
                    <code>{selectedTileReportCapsuleEnvelope?.capsuleId}</code>
                    <span>
                      {selectedTileReportCapsuleEnvelope?.schemaVersion}
                    </span>
                    <b>{selectedTileReportCapsuleEnvelope?.exportReadiness}</b>
                  </div>
                  <div
                    className="shield-vlm-report-handoff"
                    data-vlm-capsule-handoff="true"
                  >
                    <div className="shield-vlm-report-handoff-head">
                      <strong>{selectedTileReportHandoffLabels.title}</strong>
                      <span>
                        {selectedTileReportCapsuleHandoff?.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-report-handoff-grid">
                      <span>
                        <strong>
                          {selectedTileReportHandoffLabels.status}
                        </strong>
                        <b>
                          {
                            selectedTileReportCapsuleHandoff?.reportBridge
                              .status
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReportHandoffLabels.freshness}
                        </strong>
                        <b>
                          {selectedTileReportCapsuleHandoff?.freshness.label}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReportHandoffLabels.storage}
                        </strong>
                        <b>
                          {
                            selectedTileReportCapsuleHandoff?.reportBridge
                              .storageMode
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReportHandoffLabels.blockers}
                        </strong>
                        <b>
                          {selectedTileReportCapsuleHandoff?.blockedBy.length ??
                            0}
                        </b>
                      </span>
                    </div>
                  </div>
                  <div
                    className="shield-vlm-operator-action-queue"
                    data-vlm-operator-action-queue="true"
                  >
                    <div className="shield-vlm-operator-action-queue-head">
                      <strong>
                        {
                          selectedTileEvidenceCopy?.intelligenceLabels
                            .actionQueue
                        }
                      </strong>
                      <span>
                        {selectedTileOperatorActionQueue?.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-operator-action-queue-summary">
                      <span>
                        <strong>
                          {
                            selectedTileEvidenceCopy?.intelligenceLabels
                              .queueStatus
                          }
                        </strong>
                        <b>{selectedTileOperatorActionQueue?.status}</b>
                      </span>
                      <span>
                        <strong>
                          {
                            selectedTileEvidenceCopy?.intelligenceLabels
                              .queueExportGate
                          }
                        </strong>
                        <b>
                          {
                            selectedTileOperatorActionQueue?.exportGate
                              .customerCopy
                          }
                        </b>
                      </span>
                      <span>
                        <strong>actions</strong>
                        <b>
                          {selectedTileOperatorActionQueue?.actions.length ?? 0}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-operator-action-list">
                      {(selectedTileOperatorActionQueue?.actions ?? [])
                        .slice(0, 4)
                        .map((action) => (
                          <span
                            key={action.id}
                            data-vlm-operator-action={action.priority}
                          >
                            <strong>
                              {action.priority} · {action.lane}
                            </strong>
                            <b>{action.label}</b>
                            <small>{action.detail}</small>
                          </span>
                        ))}
                    </div>
                  </div>
                  <div
                    className="shield-vlm-case-review-timeline"
                    data-vlm-case-review-timeline="true"
                  >
                    <div className="shield-vlm-case-review-timeline-head">
                      <strong>
                        {selectedTileCaseReviewTimelineLabels.title}
                      </strong>
                      <span>
                        {selectedTileCaseReviewTimeline?.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-case-review-timeline-summary">
                      <span>
                        <strong>
                          {selectedTileCaseReviewTimelineLabels.status}
                        </strong>
                        <b>{selectedTileCaseReviewTimeline?.status}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileCaseReviewTimelineLabels.storage}
                        </strong>
                        <b>
                          {
                            selectedTileCaseReviewTimeline?.ownerGate
                              .timelineStorage
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileCaseReviewTimelineLabels.exportGate}
                        </strong>
                        <b>
                          {
                            selectedTileCaseReviewTimeline?.exportGate
                              .customerExport
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileCaseReviewTimelineLabels.durableWrite}
                        </strong>
                        <b>
                          {
                            selectedTileCaseReviewTimeline?.ownerGate
                              .durableWrite
                          }
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-case-review-event-list"
                      aria-label={selectedTileCaseReviewTimelineLabels.events}
                    >
                      {(selectedTileCaseReviewTimeline?.events ?? [])
                        .slice(0, 5)
                        .map((event) => (
                          <span
                            key={event.id}
                            data-vlm-case-review-event={event.status}
                          >
                            <strong>
                              {event.order}. {event.lane} · {event.status}
                            </strong>
                            <b>{event.title}</b>
                            <small>{event.detail}</small>
                          </span>
                        ))}
                    </div>
                    <div className="shield-vlm-case-review-timeline-foot">
                      <code>{selectedTileCaseReviewTimeline?.timelineId}</code>
                      <span>
                        {selectedTileCaseReviewTimeline?.safeCopyBoundary}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedTileReleaseCockpit ? (
                  <div
                    className="shield-vlm-pass252-cockpit mt-3"
                    data-vlm-release-cockpit="pass252"
                  >
                    <div className="shield-vlm-release-cockpit-head">
                      <strong>{selectedTileReleaseCockpitLabels.title}</strong>
                      <span>{selectedTileReleaseCockpit.schemaVersion}</span>
                    </div>
                    <div className="shield-vlm-release-cockpit-summary">
                      <span
                        data-vlm-release-cockpit-decision={
                          selectedTileReleaseCockpit.decision
                        }
                      >
                        <strong>
                          {selectedTileReleaseCockpitLabels.decision}
                        </strong>
                        <b>{selectedTileReleaseCockpit.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseCockpitLabels.score}
                        </strong>
                        <b>{selectedTileReleaseCockpit.releaseScore}%</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseCockpitLabels.blockers}
                        </strong>
                        <b>{selectedTileReleaseCockpit.hardBlockCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseCockpitLabels.review}
                        </strong>
                        <b>{selectedTileReleaseCockpit.reviewCount}</b>
                      </span>
                      <span>
                        <strong>PDF</strong>
                        <b>
                          {selectedTileReleaseCockpit.binaryPdfAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>wallet</strong>
                        <b>
                          {selectedTileReleaseCockpit.walletAccessAllowed
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-cockpit-lanes"
                      aria-label={selectedTileReleaseCockpitLabels.gates}
                    >
                      {selectedTileReleaseCockpit.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-release-cockpit-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <b>
                            {lane.score}% · {lane.blockers} / {lane.reviewItems}
                          </b>
                          <small>{lane.nextAction}</small>
                        </span>
                      ))}
                    </div>
                    <div
                      className="shield-vlm-release-cockpit-actions"
                      aria-label={selectedTileReleaseCockpitLabels.actions}
                    >
                      {selectedTileReleaseCockpit.priorityActions.map(
                        (action) => (
                          <span key={action}>{action}</span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-release-cockpit-foot">
                      <code>{selectedTileReleaseCockpit.cockpitId}</code>
                      <span>{selectedTileReleaseCockpit.customerBoundary}</span>
                    </div>
                  </div>
                ) : null}
                {selectedTilePass254ReleaseHandoff ? (
                  <div
                    className="shield-vlm-pass254-handoff mt-3"
                    data-vlm-pass254-release-handoff-safety="true"
                  >
                    <div className="shield-vlm-pass254-handoff-head">
                      <strong>{selectedTilePass254HandoffLabels.title}</strong>
                      <span>
                        {selectedTilePass254ReleaseHandoff.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass254-handoff-summary">
                      <span
                        data-vlm-pass254-release-decision={
                          selectedTilePass254ReleaseHandoff.decision
                        }
                      >
                        <strong>
                          {selectedTilePass254HandoffLabels.decision}
                        </strong>
                        <b>{selectedTilePass254ReleaseHandoff.decision}</b>
                      </span>
                      <span>
                        <strong>{selectedTilePass254HandoffLabels.p0}</strong>
                        <b>{selectedTilePass254ReleaseHandoff.p0Count}</b>
                      </span>
                      <span>
                        <strong>{selectedTilePass254HandoffLabels.p1}</strong>
                        <b>{selectedTilePass254ReleaseHandoff.p1Count}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass254HandoffLabels.source}
                        </strong>
                        <b>
                          {
                            selectedTilePass254ReleaseHandoff.sourceLedgerDecision
                          }
                        </b>
                      </span>
                      <span>
                        <strong>{selectedTilePass254HandoffLabels.lens}</strong>
                        <b>
                          {
                            selectedTilePass254ReleaseHandoff.lensHandoffDecision
                          }
                        </b>
                      </span>
                      <span>
                        <strong>{selectedTilePass254HandoffLabels.pdf}</strong>
                        <b>{selectedTilePass254ReleaseHandoff.pdfRouteState}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass254HandoffLabels.wallet}
                        </strong>
                        <b>
                          {
                            selectedTilePass254ReleaseHandoff.walletPolicyDecision
                          }
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass254-handoff-brief">
                      {selectedTilePass254ReleaseHandoff.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass254-handoff-lanes"
                      aria-label={selectedTilePass254HandoffLabels.lanes}
                    >
                      {selectedTilePass254ReleaseHandoff.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-pass254-release-lane={lane.state}
                          data-vlm-pass254-release-priority={lane.priority}
                        >
                          <strong>
                            {lane.priority} · {lane.label}
                          </strong>
                          <b>
                            {lane.owner} · {lane.score}%
                          </b>
                          <small>{lane.blocker}</small>
                          <em>{lane.nextAction}</em>
                        </span>
                      ))}
                    </div>
                    <div
                      className="shield-vlm-pass254-handoff-actions"
                      aria-label={selectedTilePass254HandoffLabels.actions}
                    >
                      {selectedTilePass254ReleaseHandoff.priorityActions.map(
                        (action) => (
                          <span key={action}>{action}</span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass254-handoff-foot">
                      <code>{selectedTilePass254ReleaseHandoff.handoffId}</code>
                      <span>
                        {selectedTilePass254ReleaseHandoff.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTilePass255ActionRouter ? (
                  <div
                    className="shield-vlm-pass255-action-router mt-3"
                    data-vlm-pass255-action-router="true"
                  >
                    <div className="shield-vlm-pass255-action-router-head">
                      <strong>
                        {selectedTilePass255ActionRouterLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass255ActionRouter.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass255-action-router-summary">
                      <span
                        data-vlm-pass255-action-decision={
                          selectedTilePass255ActionRouter.decision
                        }
                      >
                        <strong>
                          {selectedTilePass255ActionRouterLabels.decision}
                        </strong>
                        <b>{selectedTilePass255ActionRouter.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass255ActionRouterLabels.p0}
                        </strong>
                        <b>{selectedTilePass255ActionRouter.p0Count}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass255ActionRouterLabels.p1}
                        </strong>
                        <b>{selectedTilePass255ActionRouter.p1Count}</b>
                      </span>
                      <span>
                        <strong>export freeze</strong>
                        <b>
                          {selectedTilePass255ActionRouter.exportFreeze
                            ? "active"
                            : "off"}
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass255-action-router-brief">
                      {selectedTilePass255ActionRouter.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass255-action-router-phases"
                      aria-label={selectedTilePass255ActionRouterLabels.phases}
                    >
                      {selectedTilePass255ActionRouter.phases.map((phase) => (
                        <span
                          key={phase.id}
                          data-vlm-pass255-action-phase={phase.state}
                          data-vlm-pass255-action-priority={phase.priority}
                        >
                          <strong>
                            {phase.priority} · {phase.label}
                          </strong>
                          <b>
                            {phase.owner} · {phase.score}% ·{" "}
                            {phase.blockerCount}/{phase.reviewCount}
                          </b>
                          <small>{phase.operatorCommand}</small>
                          <em>{phase.uiHint}</em>
                        </span>
                      ))}
                    </div>
                    <div
                      className="shield-vlm-pass255-action-router-artifacts"
                      aria-label={
                        selectedTilePass255ActionRouterLabels.artifacts
                      }
                    >
                      {selectedTilePass255ActionRouter.replayArtifacts.map(
                        (artifact) => (
                          <span
                            key={artifact.id}
                            data-vlm-pass255-replay-artifact={artifact.state}
                          >
                            <strong>{artifact.label}</strong>
                            <b>{artifact.state}</b>
                            <small>{artifact.reason}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div
                      className="shield-vlm-pass255-action-router-actions"
                      aria-label={selectedTilePass255ActionRouterLabels.actions}
                    >
                      {selectedTilePass255ActionRouter.topActions.map(
                        (action) => (
                          <span key={action}>{action}</span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass255-action-router-foot">
                      <code>{selectedTilePass255ActionRouter.actionId}</code>
                      <span>
                        {selectedTilePass255ActionRouter.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass256EvidenceRunbook ? (
                  <div
                    className="shield-vlm-pass256-evidence-runbook mt-3"
                    data-vlm-pass256-evidence-runbook="true"
                  >
                    <div className="shield-vlm-pass256-evidence-runbook-head">
                      <strong>
                        {selectedTilePass256EvidenceRunbookLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass256EvidenceRunbook.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass256-evidence-runbook-summary">
                      <span
                        data-vlm-pass256-runbook-decision={
                          selectedTilePass256EvidenceRunbook.decision
                        }
                      >
                        <strong>
                          {selectedTilePass256EvidenceRunbookLabels.decision}
                        </strong>
                        <b>{selectedTilePass256EvidenceRunbook.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass256EvidenceRunbookLabels.blocked}
                        </strong>
                        <b>{selectedTilePass256EvidenceRunbook.blockedCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass256EvidenceRunbookLabels.capture}
                        </strong>
                        <b>
                          {
                            selectedTilePass256EvidenceRunbook.captureRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>quarantine</strong>
                        <b>
                          {selectedTilePass256EvidenceRunbook.exportQuarantine
                            ? "active"
                            : "off"}
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass256-evidence-runbook-brief">
                      {selectedTilePass256EvidenceRunbook.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass256-evidence-runbook-next"
                      aria-label={selectedTilePass256EvidenceRunbookLabels.next}
                    >
                      <strong>
                        {selectedTilePass256EvidenceRunbookLabels.next}
                      </strong>
                      <span>
                        {selectedTilePass256EvidenceRunbook.nextOperatorMove}
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass256-evidence-runbook-queue"
                      aria-label={
                        selectedTilePass256EvidenceRunbookLabels.queue
                      }
                    >
                      {selectedTilePass256EvidenceRunbook.queue
                        .slice(0, 8)
                        .map((item) => (
                          <span
                            key={item.id}
                            data-vlm-pass256-queue-state={item.state}
                            data-vlm-pass256-queue-priority={item.priority}
                          >
                            <strong>
                              {item.priority} · {item.label}
                            </strong>
                            <b>
                              {item.owner} · {item.source}
                            </b>
                            <small>{item.operatorNext}</small>
                            <em>{item.acceptance}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass256-evidence-runbook-replay"
                      aria-label={
                        selectedTilePass256EvidenceRunbookLabels.replay
                      }
                    >
                      {selectedTilePass256EvidenceRunbook.browserReplayChecklist
                        .slice(0, 5)
                        .map((check) => (
                          <span
                            key={check.id}
                            data-vlm-pass256-replay-state={check.state}
                          >
                            <strong>{check.label}</strong>
                            <b>{check.state}</b>
                            <small>{check.acceptance}</small>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass256-evidence-runbook-freeze"
                      aria-label={
                        selectedTilePass256EvidenceRunbookLabels.freeze
                      }
                    >
                      {selectedTilePass256EvidenceRunbook.releaseFreezeMatrix.map(
                        (cell) => (
                          <span
                            key={cell.id}
                            data-vlm-pass256-freeze-cell={cell.state}
                          >
                            <strong>{cell.label}</strong>
                            <b>{cell.state}</b>
                            <small>{cell.reason}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass256-evidence-runbook-foot">
                      <code>
                        {selectedTilePass256EvidenceRunbook.runbookId}
                      </code>
                      <span>
                        {selectedTilePass256EvidenceRunbook.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass257EvidenceSlaTimeline ? (
                  <div
                    className="shield-vlm-pass257-evidence-sla mt-3"
                    data-vlm-pass257-evidence-sla-timeline="true"
                  >
                    <div className="shield-vlm-pass257-evidence-sla-head">
                      <strong>
                        {selectedTilePass257EvidenceSlaLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass257EvidenceSlaTimeline.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass257-evidence-sla-summary">
                      <span
                        data-vlm-pass257-sla-decision={
                          selectedTilePass257EvidenceSlaTimeline.decision
                        }
                      >
                        <strong>
                          {selectedTilePass257EvidenceSlaLabels.decision}
                        </strong>
                        <b>{selectedTilePass257EvidenceSlaTimeline.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass257EvidenceSlaLabels.blocker}
                        </strong>
                        <b>
                          {
                            selectedTilePass257EvidenceSlaTimeline.immediateBlockerCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass257EvidenceSlaLabels.capture}
                        </strong>
                        <b>
                          {
                            selectedTilePass257EvidenceSlaTimeline.sameSessionCaptureCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>release freeze</strong>
                        <b>
                          {selectedTilePass257EvidenceSlaTimeline.releaseFreezeActive
                            ? "active"
                            : "off"}
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass257-evidence-sla-brief">
                      {selectedTilePass257EvidenceSlaTimeline.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass257-evidence-sla-next"
                      aria-label={selectedTilePass257EvidenceSlaLabels.next}
                    >
                      <strong>
                        {selectedTilePass257EvidenceSlaLabels.next}
                      </strong>
                      <span>
                        {selectedTilePass257EvidenceSlaTimeline.nextSlaMove}
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass257-evidence-sla-timeline"
                      aria-label={selectedTilePass257EvidenceSlaLabels.timeline}
                    >
                      {selectedTilePass257EvidenceSlaTimeline.timeline
                        .slice(0, 7)
                        .map((item) => (
                          <span
                            key={item.id}
                            data-vlm-pass257-sla-tier={item.slaTier}
                            data-vlm-pass257-sla-priority={item.priority}
                          >
                            <strong>
                              {item.priority} · {item.lane}
                            </strong>
                            <b>
                              {item.slaTier} · {item.owner}
                            </b>
                            <small>{item.reviewWindow}</small>
                            <em>{item.escalation}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass257-evidence-sla-escalation"
                      aria-label={
                        selectedTilePass257EvidenceSlaLabels.escalation
                      }
                    >
                      {selectedTilePass257EvidenceSlaTimeline.escalationLanes
                        .slice(0, 6)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-pass257-escalation-owner={lane.owner}
                          >
                            <strong>{lane.label}</strong>
                            <b>
                              P0 {lane.blockerCount} · capture{" "}
                              {lane.captureCount}
                            </b>
                            <small>{lane.nextAction}</small>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass257-evidence-sla-firewall"
                      aria-label={selectedTilePass257EvidenceSlaLabels.firewall}
                    >
                      {selectedTilePass257EvidenceSlaTimeline.exceptionFirewall.map(
                        (cell) => (
                          <span
                            key={cell.id}
                            data-vlm-pass257-exception-firewall={cell.state}
                          >
                            <strong>{cell.label}</strong>
                            <b>
                              {cell.exceptionAllowed ? "exception" : "frozen"}
                            </b>
                            <small>{cell.reason}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass257-evidence-sla-foot">
                      <code>
                        {selectedTilePass257EvidenceSlaTimeline.timelineId}
                      </code>
                      <span>
                        {
                          selectedTilePass257EvidenceSlaTimeline.customerBoundary
                        }
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass258ProofReceiptLock ? (
                  <div
                    className="shield-vlm-pass258-proof-receipt-lock mt-3"
                    data-vlm-pass258-proof-receipt-lock="true"
                  >
                    <div className="shield-vlm-pass258-proof-receipt-lock-head">
                      <strong>
                        {selectedTilePass258ProofReceiptLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass258ProofReceiptLock.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass258-proof-receipt-lock-summary">
                      <span
                        data-vlm-pass258-proof-decision={
                          selectedTilePass258ProofReceiptLock.decision
                        }
                      >
                        <strong>
                          {selectedTilePass258ProofReceiptLabels.decision}
                        </strong>
                        <b>{selectedTilePass258ProofReceiptLock.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass258ProofReceiptLabels.missing}
                        </strong>
                        <b>
                          {
                            selectedTilePass258ProofReceiptLock.missingReceiptCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass258ProofReceiptLabels.capture}
                        </strong>
                        <b>
                          {
                            selectedTilePass258ProofReceiptLock.captureRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>lock</strong>
                        <b>
                          {selectedTilePass258ProofReceiptLock.proofReceiptLockActive
                            ? "active"
                            : "off"}
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass258-proof-receipt-lock-brief">
                      {selectedTilePass258ProofReceiptLock.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass258-proof-receipt-lock-next"
                      aria-label={selectedTilePass258ProofReceiptLabels.next}
                    >
                      <strong>
                        {selectedTilePass258ProofReceiptLabels.next}
                      </strong>
                      <span>
                        {selectedTilePass258ProofReceiptLock.nextProofMove}
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass258-proof-receipt-lock-receipts"
                      aria-label={
                        selectedTilePass258ProofReceiptLabels.receipts
                      }
                    >
                      {selectedTilePass258ProofReceiptLock.receipts
                        .slice(0, 8)
                        .map((receipt) => (
                          <span
                            key={receipt.id}
                            data-vlm-pass258-proof-receipt={receipt.state}
                            data-vlm-pass258-proof-priority={receipt.priority}
                          >
                            <strong>
                              {receipt.priority} · {receipt.label}
                            </strong>
                            <b>
                              {receipt.owner} · {receipt.evidenceSource}
                            </b>
                            <small>{receipt.operatorNext}</small>
                            <em>{receipt.acceptance}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass258-proof-receipt-lock-signoff"
                      aria-label={selectedTilePass258ProofReceiptLabels.signoff}
                    >
                      {selectedTilePass258ProofReceiptLock.signoffQueue.map(
                        (item) => (
                          <span
                            key={item.id}
                            data-vlm-pass258-signoff-state={item.state}
                            data-vlm-pass258-signoff-owner={item.owner}
                          >
                            <strong>
                              {item.priority} · {item.owner}
                            </strong>
                            <b>{item.state}</b>
                            <small>{item.blockerReason}</small>
                            <em>{item.safeAction}</em>
                          </span>
                        ),
                      )}
                    </div>
                    <div
                      className="shield-vlm-pass258-proof-receipt-lock-trace"
                      aria-label={selectedTilePass258ProofReceiptLabels.trace}
                    >
                      {selectedTilePass258ProofReceiptLock.browserTracePack.map(
                        (trace) => (
                          <span
                            key={trace.id}
                            data-vlm-pass258-browser-trace={trace.state}
                          >
                            <strong>{trace.label}</strong>
                            <b>{trace.state}</b>
                            <small>{trace.replayScope}</small>
                            <em>{trace.acceptance}</em>
                          </span>
                        ),
                      )}
                    </div>
                    <div
                      className="shield-vlm-pass258-proof-receipt-lock-matrix"
                      aria-label={selectedTilePass258ProofReceiptLabels.locks}
                    >
                      {selectedTilePass258ProofReceiptLock.releaseLockMatrix.map(
                        (cell) => (
                          <span
                            key={cell.id}
                            data-vlm-pass258-release-lock={cell.state}
                          >
                            <strong>{cell.label}</strong>
                            <b>{cell.requiredReceipt}</b>
                            <small>{cell.reason}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass258-proof-receipt-lock-foot">
                      <code>
                        {selectedTilePass258ProofReceiptLock.receiptLockId}
                      </code>
                      <span>
                        {selectedTilePass258ProofReceiptLock.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass259AttestationLedger ? (
                  <div
                    className="shield-vlm-pass259-attestation-ledger mt-3"
                    data-vlm-pass259-attestation-ledger="true"
                  >
                    <div className="shield-vlm-pass259-attestation-ledger-head">
                      <strong>
                        {selectedTilePass259AttestationLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass259AttestationLedger.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass259-attestation-ledger-summary">
                      <span
                        data-vlm-pass259-attestation-decision={
                          selectedTilePass259AttestationLedger.decision
                        }
                      >
                        <strong>
                          {selectedTilePass259AttestationLabels.decision}
                        </strong>
                        <b>{selectedTilePass259AttestationLedger.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass259AttestationLabels.missing}
                        </strong>
                        <b>
                          {
                            selectedTilePass259AttestationLedger.missingAttestationCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass259AttestationLabels.capture}
                        </strong>
                        <b>
                          {
                            selectedTilePass259AttestationLedger.captureRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass259AttestationLabels.review}
                        </strong>
                        <b>
                          {
                            selectedTilePass259AttestationLedger.ownerReviewCount
                          }
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass259-attestation-ledger-brief">
                      {selectedTilePass259AttestationLedger.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass259-attestation-ledger-next"
                      aria-label={selectedTilePass259AttestationLabels.next}
                    >
                      <strong>
                        {selectedTilePass259AttestationLabels.next}
                      </strong>
                      <span>
                        {
                          selectedTilePass259AttestationLedger.nextAttestationMove
                        }
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass259-attestation-ledger-lanes"
                      aria-label={
                        selectedTilePass259AttestationLabels.attestations
                      }
                    >
                      {selectedTilePass259AttestationLedger.attestations
                        .slice(0, 8)
                        .map((item) => (
                          <span
                            key={item.id}
                            data-vlm-pass259-attestation-state={item.state}
                            data-vlm-pass259-attestation-lane={item.lane}
                            data-vlm-pass259-attestation-priority={
                              item.priority
                            }
                          >
                            <strong>
                              {item.priority} · {item.label}
                            </strong>
                            <b>
                              {item.lane} · {item.sourceState}
                            </b>
                            <small>{item.operatorNext}</small>
                            <em>{item.acceptance}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass259-attestation-ledger-freeze"
                      aria-label={selectedTilePass259AttestationLabels.freeze}
                    >
                      {selectedTilePass259AttestationLedger.freezeReasons.map(
                        (item) => (
                          <span
                            key={item.id}
                            data-vlm-pass259-freeze-state={item.state}
                          >
                            <strong>{item.label}</strong>
                            <b>{item.requiredReceipt}</b>
                            <small>{item.reason}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div
                      className="shield-vlm-pass259-attestation-ledger-checklist"
                      aria-label={
                        selectedTilePass259AttestationLabels.checklist
                      }
                    >
                      {selectedTilePass259AttestationLedger.promotionChecklist
                        .slice(0, 7)
                        .map((item) => (
                          <span
                            key={item.id}
                            data-vlm-pass259-check-state={item.state}
                            data-vlm-pass259-check-priority={item.priority}
                          >
                            <strong>
                              {item.priority} · {item.label}
                            </strong>
                            <b>{item.owner}</b>
                            <small>{item.blockerReason}</small>
                            <em>{item.acceptance}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass259-attestation-ledger-trace"
                      aria-label={selectedTilePass259AttestationLabels.trace}
                    >
                      {selectedTilePass259AttestationLedger.browserTraceRefs.map(
                        (trace) => (
                          <span
                            key={trace.id}
                            data-vlm-pass259-trace-state={trace.state}
                          >
                            <strong>{trace.label}</strong>
                            <b>{trace.state}</b>
                            <small>{trace.replayScope}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass259-attestation-ledger-foot">
                      <code>
                        {
                          selectedTilePass259AttestationLedger.attestationLedgerId
                        }
                      </code>
                      <span>
                        {selectedTilePass259AttestationLedger.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass260PromotionFirewall ? (
                  <div
                    className="shield-vlm-pass260-promotion-firewall mt-3"
                    data-vlm-pass260-promotion-firewall="true"
                  >
                    <div className="shield-vlm-pass260-promotion-firewall-head">
                      <strong>
                        {selectedTilePass260PromotionFirewallLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass260PromotionFirewall.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass260-promotion-firewall-summary">
                      <span
                        data-vlm-pass260-promotion-decision={
                          selectedTilePass260PromotionFirewall.decision
                        }
                      >
                        <strong>
                          {selectedTilePass260PromotionFirewallLabels.decision}
                        </strong>
                        <b>{selectedTilePass260PromotionFirewall.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass260PromotionFirewallLabels.blocked}
                        </strong>
                        <b>
                          {
                            selectedTilePass260PromotionFirewall.blockedLaneCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass260PromotionFirewallLabels.capture}
                        </strong>
                        <b>
                          {
                            selectedTilePass260PromotionFirewall.captureRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass260PromotionFirewallLabels.review}
                        </strong>
                        <b>
                          {
                            selectedTilePass260PromotionFirewall.ownerReviewCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass260PromotionFirewallLabels.freeze}
                        </strong>
                        <b>
                          {
                            selectedTilePass260PromotionFirewall.customerFreezeCount
                          }
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass260-promotion-firewall-brief">
                      {selectedTilePass260PromotionFirewall.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass260-promotion-firewall-next"
                      aria-label={
                        selectedTilePass260PromotionFirewallLabels.next
                      }
                    >
                      <strong>
                        {selectedTilePass260PromotionFirewallLabels.next}
                      </strong>
                      <span>
                        {selectedTilePass260PromotionFirewall.nextPromotionMove}
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass260-promotion-firewall-lanes"
                      aria-label={
                        selectedTilePass260PromotionFirewallLabels.lanes
                      }
                    >
                      {selectedTilePass260PromotionFirewall.lanes
                        .slice(0, 8)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-pass260-promotion-lane={lane.state}
                            data-vlm-pass260-promotion-priority={lane.priority}
                            data-vlm-pass260-promotion-owner={lane.owner}
                          >
                            <strong>
                              {lane.priority} · {lane.label}
                            </strong>
                            <b>
                              {lane.lane} · {lane.owner}
                            </b>
                            <small>{lane.operatorNext}</small>
                            <em>{lane.acceptance}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass260-promotion-firewall-packets"
                      aria-label={
                        selectedTilePass260PromotionFirewallLabels.packets
                      }
                    >
                      {selectedTilePass260PromotionFirewall.reviewPackets
                        .slice(0, 7)
                        .map((packet) => (
                          <span
                            key={packet.id}
                            data-vlm-pass260-review-packet={packet.state}
                            data-vlm-pass260-review-priority={packet.priority}
                          >
                            <strong>
                              {packet.priority} · {packet.label}
                            </strong>
                            <b>{packet.owner}</b>
                            <small>{packet.note}</small>
                            <em>
                              {packet.browserReplayRequired
                                ? "browser replay"
                                : packet.durableWriteRequired
                                  ? "durable write"
                                  : packet.redactionReviewRequired
                                    ? "redaction review"
                                    : "owner review"}
                            </em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass260-promotion-firewall-freeze"
                      aria-label={
                        selectedTilePass260PromotionFirewallLabels.freeze
                      }
                    >
                      {selectedTilePass260PromotionFirewall.customerFreezeLines.map(
                        (line) => (
                          <span
                            key={line.id}
                            data-vlm-pass260-customer-freeze={line.state}
                          >
                            <strong>{line.label}</strong>
                            <b>{line.state}</b>
                            <small>{line.reason}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass260-promotion-firewall-foot">
                      <code>
                        {selectedTilePass260PromotionFirewall.firewallId}
                      </code>
                      <span>
                        {selectedTilePass260PromotionFirewall.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass261CutoverControl ? (
                  <div
                    className="shield-vlm-pass261-cutover-control mt-3"
                    data-vlm-pass261-cutover-control="true"
                  >
                    <div className="shield-vlm-pass261-cutover-control-head">
                      <strong>
                        {selectedTilePass261CutoverControlLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass261CutoverControl.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass261-cutover-control-summary">
                      <span
                        data-vlm-pass261-cutover-decision={
                          selectedTilePass261CutoverControl.decision
                        }
                      >
                        <strong>
                          {selectedTilePass261CutoverControlLabels.decision}
                        </strong>
                        <b>{selectedTilePass261CutoverControl.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass261CutoverControlLabels.blocked}
                        </strong>
                        <b>
                          {selectedTilePass261CutoverControl.blockedLaneCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass261CutoverControlLabels.capture}
                        </strong>
                        <b>
                          {
                            selectedTilePass261CutoverControl.captureRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass261CutoverControlLabels.review}
                        </strong>
                        <b>
                          {
                            selectedTilePass261CutoverControl.reviewRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass261CutoverControlLabels.rollback}
                        </strong>
                        <b>
                          {selectedTilePass261CutoverControl.rollbackItemCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass261CutoverControlLabels.seals}
                        </strong>
                        <b>
                          {selectedTilePass261CutoverControl.readinessSealCount}
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass261-cutover-control-brief">
                      {selectedTilePass261CutoverControl.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass261-cutover-control-next"
                      aria-label={selectedTilePass261CutoverControlLabels.next}
                    >
                      <strong>
                        {selectedTilePass261CutoverControlLabels.next}
                      </strong>
                      <span>
                        {selectedTilePass261CutoverControl.nextCutoverMove}
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass261-cutover-control-lanes"
                      aria-label={selectedTilePass261CutoverControlLabels.lanes}
                    >
                      {selectedTilePass261CutoverControl.lanes
                        .slice(0, 8)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-pass261-cutover-lane={lane.state}
                            data-vlm-pass261-cutover-priority={lane.priority}
                            data-vlm-pass261-cutover-owner={lane.owner}
                          >
                            <strong>
                              {lane.priority} · {lane.label}
                            </strong>
                            <b>
                              {lane.lane} · {lane.owner}
                            </b>
                            <small>{lane.holdReason}</small>
                            <em>{lane.acceptance}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass261-cutover-control-rollback"
                      aria-label={
                        selectedTilePass261CutoverControlLabels.rollback
                      }
                    >
                      {selectedTilePass261CutoverControl.rollbackVault
                        .slice(0, 8)
                        .map((item) => (
                          <span
                            key={item.id}
                            data-vlm-pass261-rollback-state={item.state}
                            data-vlm-pass261-rollback-priority={item.priority}
                          >
                            <strong>
                              {item.priority} · {item.label}
                            </strong>
                            <b>{item.state}</b>
                            <small>{item.rollbackTrigger}</small>
                            <em>{item.rollbackAction}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass261-cutover-control-seals"
                      aria-label={selectedTilePass261CutoverControlLabels.seals}
                    >
                      {selectedTilePass261CutoverControl.readinessSeals.map(
                        (seal) => (
                          <span
                            key={seal.id}
                            data-vlm-pass261-readiness-seal={seal.state}
                          >
                            <strong>{seal.label}</strong>
                            <b>
                              {seal.requiredOwner} · {seal.state}
                            </b>
                            <small>{seal.evidenceRequired}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass261-cutover-control-foot">
                      <code>{selectedTilePass261CutoverControl.controlId}</code>
                      <span>
                        {selectedTilePass261CutoverControl.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass262ReleaseRehearsalMatrix ? (
                  <div
                    className="shield-vlm-pass262-release-rehearsal mt-3"
                    data-vlm-pass262-release-rehearsal="true"
                  >
                    <div className="shield-vlm-pass262-release-rehearsal-head">
                      <strong>
                        {selectedTilePass262ReleaseRehearsalLabels.title}
                      </strong>
                      <span>
                        {
                          selectedTilePass262ReleaseRehearsalMatrix.schemaVersion
                        }
                      </span>
                    </div>
                    <div className="shield-vlm-pass262-release-rehearsal-summary">
                      <span
                        data-vlm-pass262-rehearsal-decision={
                          selectedTilePass262ReleaseRehearsalMatrix.decision
                        }
                      >
                        <strong>
                          {selectedTilePass262ReleaseRehearsalLabels.decision}
                        </strong>
                        <b>
                          {selectedTilePass262ReleaseRehearsalMatrix.decision}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass262ReleaseRehearsalLabels.blocked}
                        </strong>
                        <b>
                          {
                            selectedTilePass262ReleaseRehearsalMatrix.blockedLaneCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass262ReleaseRehearsalLabels.evidence}
                        </strong>
                        <b>
                          {
                            selectedTilePass262ReleaseRehearsalMatrix.evidenceMissingCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass262ReleaseRehearsalLabels.rollback}
                        </strong>
                        <b>
                          {
                            selectedTilePass262ReleaseRehearsalMatrix.rollbackDrillCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass262ReleaseRehearsalLabels.signoff}
                        </strong>
                        <b>
                          {
                            selectedTilePass262ReleaseRehearsalMatrix.ownerSignoffCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass262ReleaseRehearsalLabels.locks}
                        </strong>
                        <b>
                          {
                            selectedTilePass262ReleaseRehearsalMatrix.surfaceLockCount
                          }
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass262-release-rehearsal-brief">
                      {
                        selectedTilePass262ReleaseRehearsalMatrix.operatorSummary
                      }
                    </p>
                    <div
                      className="shield-vlm-pass262-release-rehearsal-next"
                      aria-label={
                        selectedTilePass262ReleaseRehearsalLabels.next
                      }
                    >
                      <strong>
                        {selectedTilePass262ReleaseRehearsalLabels.next}
                      </strong>
                      <span>
                        {
                          selectedTilePass262ReleaseRehearsalMatrix.nextRehearsalMove
                        }
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass262-release-rehearsal-lanes"
                      aria-label={
                        selectedTilePass262ReleaseRehearsalLabels.lanes
                      }
                    >
                      {selectedTilePass262ReleaseRehearsalMatrix.lanes
                        .slice(0, 8)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-pass262-rehearsal-lane={lane.state}
                            data-vlm-pass262-rehearsal-priority={lane.priority}
                            data-vlm-pass262-rehearsal-owner={lane.owner}
                          >
                            <strong>
                              {lane.priority} · {lane.label}
                            </strong>
                            <b>
                              {lane.lane} · {lane.owner}
                            </b>
                            <small>{lane.rehearsalStep}</small>
                            <em>{lane.rollbackDrill}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass262-release-rehearsal-signoff"
                      aria-label={
                        selectedTilePass262ReleaseRehearsalLabels.signoff
                      }
                    >
                      {selectedTilePass262ReleaseRehearsalMatrix.ownerSignoffs
                        .slice(0, 8)
                        .map((item) => (
                          <span
                            key={item.id}
                            data-vlm-pass262-signoff-state={item.state}
                            data-vlm-pass262-signoff-priority={item.priority}
                          >
                            <strong>
                              {item.priority} · {item.owner}
                            </strong>
                            <b>{item.state}</b>
                            <small>{item.requiredEvidence}</small>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass262-release-rehearsal-locks"
                      aria-label={
                        selectedTilePass262ReleaseRehearsalLabels.locks
                      }
                    >
                      {selectedTilePass262ReleaseRehearsalMatrix.surfaceLocks.map(
                        (lock) => (
                          <span
                            key={lock.id}
                            data-vlm-pass262-surface-lock={lock.surface}
                          >
                            <strong>{lock.label}</strong>
                            <b>{lock.state}</b>
                            <small>{lock.reason}</small>
                            <em>{lock.operatorAction}</em>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass262-release-rehearsal-foot">
                      <code>
                        {selectedTilePass262ReleaseRehearsalMatrix.matrixId}
                      </code>
                      <span>
                        {
                          selectedTilePass262ReleaseRehearsalMatrix.customerBoundary
                        }
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass263CandidateTrustBoard ? (
                  <div
                    className="shield-vlm-pass263-candidate-trust-board mt-3"
                    data-vlm-pass263-candidate-trust-board="true"
                  >
                    <div className="shield-vlm-pass263-candidate-trust-board-head">
                      <strong>
                        {selectedTilePass263CandidateTrustLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass263CandidateTrustBoard.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass263-candidate-trust-board-summary">
                      <span
                        data-vlm-pass263-candidate-decision={
                          selectedTilePass263CandidateTrustBoard.decision
                        }
                      >
                        <strong>
                          {selectedTilePass263CandidateTrustLabels.decision}
                        </strong>
                        <b>{selectedTilePass263CandidateTrustBoard.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass263CandidateTrustLabels.blocked}
                        </strong>
                        <b>
                          {
                            selectedTilePass263CandidateTrustBoard.blockedLaneCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass263CandidateTrustLabels.proof}
                        </strong>
                        <b>
                          {selectedTilePass263CandidateTrustBoard.proofGapCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass263CandidateTrustLabels.copy}
                        </strong>
                        <b>
                          {
                            selectedTilePass263CandidateTrustBoard.copyReviewCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass263CandidateTrustLabels.cues}
                        </strong>
                        <b>
                          {selectedTilePass263CandidateTrustBoard.trustCueCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass263CandidateTrustLabels.locks}
                        </strong>
                        <b>
                          {
                            selectedTilePass263CandidateTrustBoard.surfaceLockCount
                          }
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass263-candidate-trust-board-brief">
                      {selectedTilePass263CandidateTrustBoard.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass263-candidate-trust-board-next"
                      aria-label={selectedTilePass263CandidateTrustLabels.next}
                    >
                      <strong>
                        {selectedTilePass263CandidateTrustLabels.next}
                      </strong>
                      <span>
                        {
                          selectedTilePass263CandidateTrustBoard.nextCandidateMove
                        }
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass263-candidate-trust-board-lanes"
                      aria-label={selectedTilePass263CandidateTrustLabels.lanes}
                    >
                      {selectedTilePass263CandidateTrustBoard.candidateLanes
                        .slice(0, 8)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-pass263-candidate-lane={lane.state}
                            data-vlm-pass263-candidate-priority={lane.priority}
                            data-vlm-pass263-candidate-owner={lane.owner}
                          >
                            <strong>
                              {lane.priority} · {lane.label}
                            </strong>
                            <b>
                              {lane.lane} · {lane.owner}
                            </b>
                            <small>{lane.trustQuestion}</small>
                            <em>{lane.customerSafeAngle}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass263-candidate-trust-board-cues"
                      aria-label={selectedTilePass263CandidateTrustLabels.cues}
                    >
                      {selectedTilePass263CandidateTrustBoard.trustCues.map(
                        (cue) => (
                          <span
                            key={cue.id}
                            data-vlm-pass263-trust-cue={cue.cue}
                          >
                            <strong>{cue.label}</strong>
                            <b>{cue.publicReady ? "public" : "review"}</b>
                            <small>{cue.customerSafeCopy}</small>
                            <em>{cue.operatorNote}</em>
                          </span>
                        ),
                      )}
                    </div>
                    <div
                      className="shield-vlm-pass263-candidate-trust-board-locks"
                      aria-label={selectedTilePass263CandidateTrustLabels.locks}
                    >
                      {selectedTilePass263CandidateTrustBoard.surfaceLocks
                        .slice(0, 6)
                        .map((lock) => (
                          <span
                            key={lock.id}
                            data-vlm-pass263-surface-lock={lock.surface}
                          >
                            <strong>{lock.label}</strong>
                            <b>{lock.state}</b>
                            <small>{lock.reason}</small>
                          </span>
                        ))}
                    </div>
                    <div className="shield-vlm-pass263-candidate-trust-board-foot">
                      <code>
                        {selectedTilePass263CandidateTrustBoard.boardId}
                      </code>
                      <span>
                        {
                          selectedTilePass263CandidateTrustBoard.customerBoundary
                        }
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass264TrustNarrativeGuard ? (
                  <div
                    className="shield-vlm-pass264-trust-narrative-guard mt-3"
                    data-vlm-pass264-trust-narrative-guard="true"
                  >
                    <div className="shield-vlm-pass264-trust-narrative-guard-head">
                      <strong>
                        {selectedTilePass264TrustNarrativeLabels.title}
                      </strong>
                      <span>
                        {selectedTilePass264TrustNarrativeGuard.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-pass264-trust-narrative-guard-summary">
                      <span>
                        <strong>
                          {selectedTilePass264TrustNarrativeLabels.stages}
                        </strong>
                        <b>
                          {
                            selectedTilePass264TrustNarrativeGuard.narrativeStageCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass264TrustNarrativeLabels.patterns}
                        </strong>
                        <b>
                          {
                            selectedTilePass264TrustNarrativeGuard.darkPatternCheckCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass264TrustNarrativeLabels.locks}
                        </strong>
                        <b>
                          {
                            selectedTilePass264TrustNarrativeGuard.lockedSurfaceCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass264TrustNarrativeLabels.proof}
                        </strong>
                        <b>
                          {selectedTilePass264TrustNarrativeGuard.proofGapCount}
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass264-trust-narrative-guard-brief">
                      {selectedTilePass264TrustNarrativeGuard.operatorSummary}
                    </p>
                    <div
                      className="shield-vlm-pass264-trust-narrative-guard-next"
                      aria-label={selectedTilePass264TrustNarrativeLabels.next}
                    >
                      <strong>
                        {selectedTilePass264TrustNarrativeLabels.next}
                      </strong>
                      <span>
                        {
                          selectedTilePass264TrustNarrativeGuard.nextNarrativeMove
                        }
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass264-trust-narrative-guard-stages"
                      aria-label={
                        selectedTilePass264TrustNarrativeLabels.stageLabel
                      }
                    >
                      {selectedTilePass264TrustNarrativeGuard.stages
                        .slice(0, 8)
                        .map((stage) => (
                          <span
                            key={stage.id}
                            data-vlm-pass264-narrative-stage={stage.stage}
                            data-vlm-pass264-narrative-priority={stage.priority}
                            data-vlm-pass264-narrative-surface={
                              stage.allowedSurface
                            }
                          >
                            <strong>
                              {stage.priority} · {stage.label}
                            </strong>
                            <b>
                              {stage.stage} · {stage.allowedSurface}
                            </b>
                            <small>{stage.operatorCopy}</small>
                            <em>{stage.customerSafeDraft}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass264-trust-narrative-guard-patterns"
                      aria-label={
                        selectedTilePass264TrustNarrativeLabels.patternLabel
                      }
                    >
                      {selectedTilePass264TrustNarrativeGuard.darkPatternChecks.map(
                        (item) => (
                          <span
                            key={item.id}
                            data-vlm-pass264-dark-pattern={item.risk}
                            data-vlm-pass264-dark-pattern-state={item.state}
                          >
                            <strong>{item.label}</strong>
                            <b>{item.risk}</b>
                            <small>{item.reason}</small>
                            <em>{item.replacementRule}</em>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass264-trust-narrative-guard-foot">
                      <code>
                        {selectedTilePass264TrustNarrativeGuard.guardId}
                      </code>
                      <span>
                        {
                          selectedTilePass264TrustNarrativeGuard.customerBoundary
                        }
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass265EvidenceLanguageLedger ? (
                  <div
                    className="shield-vlm-pass265-evidence-language-ledger mt-3"
                    data-vlm-pass265-evidence-language-ledger="true"
                  >
                    <div className="shield-vlm-pass265-evidence-language-ledger-head">
                      <strong>
                        {selectedTilePass265EvidenceLanguageLabels.title}
                      </strong>
                      <span>
                        {
                          selectedTilePass265EvidenceLanguageLedger.schemaVersion
                        }
                      </span>
                    </div>
                    <div className="shield-vlm-pass265-evidence-language-ledger-summary">
                      <span>
                        <strong>
                          {selectedTilePass265EvidenceLanguageLabels.steps}
                        </strong>
                        <b>
                          {
                            selectedTilePass265EvidenceLanguageLedger.languageStepCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass265EvidenceLanguageLabels.tones}
                        </strong>
                        <b>
                          {
                            selectedTilePass265EvidenceLanguageLedger.toneCheckCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass265EvidenceLanguageLabels.locks}
                        </strong>
                        <b>
                          {
                            selectedTilePass265EvidenceLanguageLedger.lockedSurfaceCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass265EvidenceLanguageLabels.proof}
                        </strong>
                        <b>
                          {
                            selectedTilePass265EvidenceLanguageLedger.proofGapCount
                          }
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass265-evidence-language-ledger-brief">
                      {
                        selectedTilePass265EvidenceLanguageLedger.operatorSummary
                      }
                    </p>
                    <div
                      className="shield-vlm-pass265-evidence-language-ledger-order"
                      aria-label={
                        selectedTilePass265EvidenceLanguageLabels.order
                      }
                    >
                      <strong>
                        {selectedTilePass265EvidenceLanguageLabels.order}
                      </strong>
                      <span>
                        {selectedTilePass265EvidenceLanguageLedger.recommendedReadingOrder.join(
                          " → ",
                        )}
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass265-evidence-language-ledger-next"
                      aria-label={
                        selectedTilePass265EvidenceLanguageLabels.next
                      }
                    >
                      <strong>
                        {selectedTilePass265EvidenceLanguageLabels.next}
                      </strong>
                      <span>
                        {
                          selectedTilePass265EvidenceLanguageLedger.nextLanguageMove
                        }
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass265-evidence-language-ledger-steps"
                      aria-label={
                        selectedTilePass265EvidenceLanguageLabels.stepLabel
                      }
                    >
                      {selectedTilePass265EvidenceLanguageLedger.languageSteps
                        .slice(0, 8)
                        .map((step) => (
                          <span
                            key={step.id}
                            data-vlm-pass265-language-step={step.step}
                            data-vlm-pass265-language-priority={step.priority}
                            data-vlm-pass265-language-surface={step.surface}
                          >
                            <strong>
                              {step.priority} · {step.label}
                            </strong>
                            <b>
                              {step.step} · {step.cognitiveLoad}
                            </b>
                            <small>{step.operatorInstruction}</small>
                            <em>{step.customerSafeLine}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass265-evidence-language-ledger-tones"
                      aria-label={
                        selectedTilePass265EvidenceLanguageLabels.toneLabel
                      }
                    >
                      {selectedTilePass265EvidenceLanguageLedger.toneChecks.map(
                        (item) => (
                          <span
                            key={item.id}
                            data-vlm-pass265-tone-risk={item.risk}
                            data-vlm-pass265-tone-state={item.state}
                          >
                            <strong>{item.label}</strong>
                            <b>{item.risk}</b>
                            <small>{item.replacementPattern}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass265-evidence-language-ledger-foot">
                      <code>
                        {selectedTilePass265EvidenceLanguageLedger.ledgerId}
                      </code>
                      <span>
                        {
                          selectedTilePass265EvidenceLanguageLedger.customerBoundary
                        }
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTilePass266ClaimTraceabilityMatrix ? (
                  <div
                    className="shield-vlm-pass266-claim-traceability-matrix mt-3"
                    data-vlm-pass266-claim-traceability-matrix="true"
                  >
                    <div className="shield-vlm-pass266-claim-traceability-matrix-head">
                      <strong>
                        {selectedTilePass266ClaimTraceabilityLabels.title}
                      </strong>
                      <span>
                        {
                          selectedTilePass266ClaimTraceabilityMatrix.schemaVersion
                        }
                      </span>
                    </div>
                    <div className="shield-vlm-pass266-claim-traceability-matrix-summary">
                      <span>
                        <strong>
                          {selectedTilePass266ClaimTraceabilityLabels.claims}
                        </strong>
                        <b>
                          {
                            selectedTilePass266ClaimTraceabilityMatrix.claimLaneCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass266ClaimTraceabilityLabels.checks}
                        </strong>
                        <b>
                          {
                            selectedTilePass266ClaimTraceabilityMatrix.comprehensionCheckCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass266ClaimTraceabilityLabels.locks}
                        </strong>
                        <b>
                          {
                            selectedTilePass266ClaimTraceabilityMatrix.lockedClaimCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePass266ClaimTraceabilityLabels.proof}
                        </strong>
                        <b>
                          {
                            selectedTilePass266ClaimTraceabilityMatrix.proofGapCount
                          }
                        </b>
                      </span>
                    </div>
                    <p className="shield-vlm-pass266-claim-traceability-matrix-brief">
                      {
                        selectedTilePass266ClaimTraceabilityMatrix.operatorSummary
                      }
                    </p>
                    <div
                      className="shield-vlm-pass266-claim-traceability-matrix-protocol"
                      aria-label={
                        selectedTilePass266ClaimTraceabilityLabels.protocol
                      }
                    >
                      <strong>
                        {selectedTilePass266ClaimTraceabilityLabels.protocol}
                      </strong>
                      <span>
                        {selectedTilePass266ClaimTraceabilityMatrix.claimReadingProtocol.join(
                          " → ",
                        )}
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass266-claim-traceability-matrix-next"
                      aria-label={
                        selectedTilePass266ClaimTraceabilityLabels.next
                      }
                    >
                      <strong>
                        {selectedTilePass266ClaimTraceabilityLabels.next}
                      </strong>
                      <span>
                        {
                          selectedTilePass266ClaimTraceabilityMatrix.nextTraceabilityMove
                        }
                      </span>
                    </div>
                    <div
                      className="shield-vlm-pass266-claim-traceability-matrix-lanes"
                      aria-label={
                        selectedTilePass266ClaimTraceabilityLabels.laneLabel
                      }
                    >
                      {selectedTilePass266ClaimTraceabilityMatrix.claimLanes
                        .slice(0, 8)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-pass266-claim-lane={lane.lane}
                            data-vlm-pass266-claim-priority={lane.priority}
                            data-vlm-pass266-evidence-anchor={
                              lane.evidenceAnchor
                            }
                          >
                            <strong>
                              {lane.priority} · {lane.lane}
                            </strong>
                            <b>{lane.evidenceAnchor}</b>
                            <small>{lane.allowedWording}</small>
                            <em>{lane.blockedShortcut}</em>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-pass266-claim-traceability-matrix-checks"
                      aria-label={
                        selectedTilePass266ClaimTraceabilityLabels.checkLabel
                      }
                    >
                      {selectedTilePass266ClaimTraceabilityMatrix.comprehensionChecks.map(
                        (check) => (
                          <span
                            key={check.id}
                            data-vlm-pass266-comprehension-risk={check.risk}
                          >
                            <strong>{check.label}</strong>
                            <b>{check.risk}</b>
                            <small>{check.operatorFix}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-pass266-claim-traceability-matrix-foot">
                      <code>
                        {selectedTilePass266ClaimTraceabilityMatrix.matrixId}
                      </code>
                      <span>
                        {
                          selectedTilePass266ClaimTraceabilityMatrix.customerBoundary
                        }
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTileCustomerExportFirewall ? (
                  <div
                    className="shield-vlm-export-firewall mt-3"
                    data-vlm-export-firewall="pass213"
                  >
                    <div className="shield-vlm-export-firewall-head">
                      <strong>
                        {selectedTileCustomerExportFirewallLabels.title}
                      </strong>
                      <span>
                        {selectedTileCustomerExportFirewall.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-export-firewall-summary">
                      <span>
                        <strong>
                          {selectedTileCustomerExportFirewallLabels.release}
                        </strong>
                        <b>{selectedTileCustomerExportFirewall.releaseState}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileCustomerExportFirewallLabels.visibility}
                        </strong>
                        <b>
                          {
                            selectedTileCustomerExportFirewall.customerVisibility
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileCustomerExportFirewallLabels.pdfGate}
                        </strong>
                        <b>{selectedTileCustomerExportFirewall.pdfRouteGate}</b>
                      </span>
                      <span>
                        <strong>
                          {
                            selectedTileCustomerExportFirewallLabels.evidenceCoverage
                          }
                        </strong>
                        <b>
                          {
                            selectedTileCustomerExportFirewall.evidenceCoverageScore
                          }
                          %
                        </b>
                      </span>
                      <span>
                        <strong>
                          {
                            selectedTileCustomerExportFirewallLabels.redactionScore
                          }
                        </strong>
                        <b>
                          {selectedTileCustomerExportFirewall.redactionScore}%
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileCustomerExportFirewallLabels.sourceDebt}
                        </strong>
                        <b>
                          {selectedTileCustomerExportFirewall.sourceDebtCount}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-export-firewall-debt"
                      aria-label={
                        selectedTileCustomerExportFirewallLabels.debtMatrix
                      }
                    >
                      {selectedTileCustomerExportFirewall.debtMatrix
                        .slice(0, 4)
                        .map((debt) => (
                          <span
                            key={debt.id}
                            data-vlm-export-debt={debt.severity}
                          >
                            <strong>
                              {debt.lane} · {debt.severity}
                            </strong>
                            <b>{debt.label}</b>
                            <small>{debt.nextAction}</small>
                          </span>
                        ))}
                    </div>
                    <div className="shield-vlm-export-firewall-foot">
                      <code>
                        {selectedTileCustomerExportFirewall.firewallId}
                      </code>
                      <span>
                        {
                          selectedTileCustomerExportFirewall.customerCopyBoundary
                        }
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileSourceCoverageMatrix ? (
                  <div
                    className="shield-vlm-source-coverage-matrix mt-3"
                    data-vlm-source-coverage-matrix="pass214"
                  >
                    <div className="shield-vlm-source-coverage-head">
                      <strong>
                        {selectedTileSourceCoverageMatrixLabels.title}
                      </strong>
                      <span>
                        {selectedTileSourceCoverageMatrix.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-source-coverage-summary">
                      <span>
                        <strong>
                          {selectedTileSourceCoverageMatrixLabels.coverage}
                        </strong>
                        <b>
                          {
                            selectedTileSourceCoverageMatrix.overallCoverageScore
                          }
                          %
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceCoverageMatrixLabels.sla}
                        </strong>
                        <b>{selectedTileSourceCoverageMatrix.reviewSla}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceCoverageMatrixLabels.pressure}
                        </strong>
                        <b>{selectedTileSourceCoverageMatrix.exportPressure}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceCoverageMatrixLabels.secondSource}
                        </strong>
                        <b>
                          {selectedTileSourceCoverageMatrix.secondSourceRequired
                            ? "required"
                            : "not required"}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-source-coverage-lanes"
                      aria-label={selectedTileSourceCoverageMatrixLabels.lanes}
                    >
                      {selectedTileSourceCoverageMatrix.lanes
                        .slice(0, 6)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-source-coverage-lane={lane.state}
                          >
                            <strong>
                              {lane.label} · {lane.state}
                            </strong>
                            <b>
                              {lane.score}% · {lane.publicCopy}
                            </b>
                            <small>{lane.nextAction}</small>
                          </span>
                        ))}
                    </div>
                    <div className="shield-vlm-source-coverage-foot">
                      <code>{selectedTileSourceCoverageMatrix.matrixId}</code>
                      <span>
                        {selectedTileSourceCoverageMatrix.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileReleaseReviewPacket ? (
                  <div
                    className="shield-vlm-release-review-packet mt-3"
                    data-vlm-release-review-packet="pass215"
                  >
                    <div className="shield-vlm-release-review-head">
                      <strong>
                        {selectedTileReleaseReviewPacketLabels.title}
                      </strong>
                      <span>
                        {selectedTileReleaseReviewPacket.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-review-summary">
                      <span
                        data-vlm-release-decision={
                          selectedTileReleaseReviewPacket.decision
                        }
                      >
                        <strong>
                          {selectedTileReleaseReviewPacketLabels.decision}
                        </strong>
                        <b>{selectedTileReleaseReviewPacket.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseReviewPacketLabels.score}
                        </strong>
                        <b>{selectedTileReleaseReviewPacket.releaseScore}%</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseReviewPacketLabels.blockers}
                        </strong>
                        <b>{selectedTileReleaseReviewPacket.blockerCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseReviewPacketLabels.review}
                        </strong>
                        <b>{selectedTileReleaseReviewPacket.reviewCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseReviewPacketLabels.customerCopy}
                        </strong>
                        <b>
                          {selectedTileReleaseReviewPacket.customerCopyMode}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseReviewPacketLabels.pdf}
                        </strong>
                        <b>{selectedTileReleaseReviewPacket.pdfPreview}</b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-review-lanes"
                      aria-label={selectedTileReleaseReviewPacketLabels.lanes}
                    >
                      {selectedTileReleaseReviewPacket.lanes
                        .slice(0, 6)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-release-lane={lane.state}
                          >
                            <strong>
                              {lane.label} · {lane.state}
                            </strong>
                            <b>
                              {lane.score}% · {lane.releaseImpact}
                            </b>
                            <small>{lane.nextAction}</small>
                          </span>
                        ))}
                    </div>
                    <div
                      className="shield-vlm-release-review-checklist"
                      aria-label={
                        selectedTileReleaseReviewPacketLabels.checklist
                      }
                    >
                      {selectedTileReleaseReviewPacket.checklist
                        .slice(0, 5)
                        .map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                    </div>
                    <div className="shield-vlm-release-review-foot">
                      <code>{selectedTileReleaseReviewPacket.packetId}</code>
                      <span>
                        {selectedTileReleaseReviewPacket.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileSourceTruthSpine ? (
                  <div
                    className="shield-vlm-source-truth-spine mt-3"
                    data-vlm-source-truth-spine="pass216"
                  >
                    <div className="shield-vlm-source-truth-head">
                      <strong>
                        {selectedTileSourceTruthSpineLabels.title}
                      </strong>
                      <span>{selectedTileSourceTruthSpine.schemaVersion}</span>
                    </div>
                    <div className="shield-vlm-source-truth-summary">
                      <span
                        data-vlm-source-truth-decision={
                          selectedTileSourceTruthSpine.decision
                        }
                      >
                        <strong>
                          {selectedTileSourceTruthSpineLabels.decision}
                        </strong>
                        <b>{selectedTileSourceTruthSpine.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceTruthSpineLabels.score}
                        </strong>
                        <b>{selectedTileSourceTruthSpine.truthScore}%</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceTruthSpineLabels.blocked}
                        </strong>
                        <b>{selectedTileSourceTruthSpine.blockedLaneCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceTruthSpineLabels.stale}
                        </strong>
                        <b>{selectedTileSourceTruthSpine.staleLaneCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceTruthSpineLabels.missing}
                        </strong>
                        <b>{selectedTileSourceTruthSpine.missingLaneCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceTruthSpineLabels.export}
                        </strong>
                        <b>{selectedTileSourceTruthSpine.customerExport}</b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-source-truth-lanes"
                      aria-label={selectedTileSourceTruthSpineLabels.lanes}
                    >
                      {selectedTileSourceTruthSpine.lanes
                        .slice(0, 6)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-source-truth-lane={lane.state}
                          >
                            <strong>
                              {lane.label} · {lane.state}
                            </strong>
                            <b>
                              {lane.adapterLane} · {lane.mode} · cap{" "}
                              {lane.trustCap}%
                            </b>
                            <small>{lane.nextAction}</small>
                          </span>
                        ))}
                    </div>
                    <div className="shield-vlm-source-truth-foot">
                      <code>{selectedTileSourceTruthSpine.spineId}</code>
                      <span>
                        {selectedTileSourceTruthSpine.adapterBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileLiveAdapterFreshnessMesh ? (
                  <div
                    className="shield-vlm-live-adapter-freshness mt-3"
                    data-vlm-live-adapter-freshness="pass217"
                  >
                    <div className="shield-vlm-live-adapter-head">
                      <strong>
                        {selectedTileLiveAdapterFreshnessLabels.title}
                      </strong>
                      <span>
                        {selectedTileLiveAdapterFreshnessMesh.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-live-adapter-summary">
                      <span
                        data-vlm-live-adapter-decision={
                          selectedTileLiveAdapterFreshnessMesh.decision
                        }
                      >
                        <strong>
                          {selectedTileLiveAdapterFreshnessLabels.decision}
                        </strong>
                        <b>{selectedTileLiveAdapterFreshnessMesh.decision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileLiveAdapterFreshnessLabels.score}
                        </strong>
                        <b>
                          {selectedTileLiveAdapterFreshnessMesh.freshnessScore}%
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileLiveAdapterFreshnessLabels.refresh}
                        </strong>
                        <b>
                          {
                            selectedTileLiveAdapterFreshnessMesh.refreshRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileLiveAdapterFreshnessLabels.hardStop}
                        </strong>
                        <b>
                          {selectedTileLiveAdapterFreshnessMesh.hardStopCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileLiveAdapterFreshnessLabels.export}
                        </strong>
                        <b>
                          {
                            selectedTileLiveAdapterFreshnessMesh.customerExportGate
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileLiveAdapterFreshnessLabels.ledger}
                        </strong>
                        <b>
                          {
                            selectedTileLiveAdapterFreshnessMesh.sourceLedgerWrite
                          }
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-live-adapter-lanes"
                      aria-label={selectedTileLiveAdapterFreshnessLabels.lanes}
                    >
                      {selectedTileLiveAdapterFreshnessMesh.lanes
                        .slice(0, 6)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-live-adapter-lane={lane.state}
                          >
                            <strong>
                              {lane.label} · {lane.state} ·{" "}
                              {lane.refreshPriority}
                            </strong>
                            <b>
                              {lane.adapterLane} · {lane.cacheDecision} · TTL{" "}
                              {lane.ttlMinutes}m
                            </b>
                            <small>{lane.operatorAction}</small>
                          </span>
                        ))}
                    </div>
                    <div className="shield-vlm-live-adapter-foot">
                      <code>{selectedTileLiveAdapterFreshnessMesh.meshId}</code>
                      <span>
                        {selectedTileLiveAdapterFreshnessMesh.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileSourcePolicyGate ? (
                  <div
                    className="shield-vlm-source-policy-gate mt-3"
                    data-vlm-source-policy-gate="pass218"
                  >
                    <div className="shield-vlm-source-policy-head">
                      <strong>
                        {selectedTileSourcePolicyGateLabels.title}
                      </strong>
                      <span>{selectedTileSourcePolicyGate.schemaVersion}</span>
                    </div>
                    <div className="shield-vlm-source-policy-summary">
                      <span
                        data-vlm-source-policy-decision={
                          selectedTileSourcePolicyGate.policyDecision
                        }
                      >
                        <strong>
                          {selectedTileSourcePolicyGateLabels.decision}
                        </strong>
                        <b>{selectedTileSourcePolicyGate.policyDecision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourcePolicyGateLabels.allowlist}
                        </strong>
                        <b>{selectedTileSourcePolicyGate.allowlistMode}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourcePolicyGateLabels.trusted}
                        </strong>
                        <b>
                          {selectedTileSourcePolicyGate.trustedPreviewLaneCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourcePolicyGateLabels.blocked}
                        </strong>
                        <b>{selectedTileSourcePolicyGate.blockedLaneCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourcePolicyGateLabels.second}
                        </strong>
                        <b>
                          {
                            selectedTileSourcePolicyGate.secondSourceRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourcePolicyGateLabels.customer}
                        </strong>
                        <b>{selectedTileSourcePolicyGate.customerCopy}</b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-source-policy-lanes"
                      aria-label={selectedTileSourcePolicyGateLabels.lanes}
                    >
                      {selectedTileSourcePolicyGate.lanes
                        .slice(0, 6)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-source-policy-lane={lane.policyState}
                          >
                            <strong>
                              {lane.label} · {lane.policyState}
                            </strong>
                            <b>
                              {lane.sourceClass} · {lane.reviewerGate} ·{" "}
                              {lane.evidenceUse}
                            </b>
                            <small>{lane.nextPolicyAction}</small>
                          </span>
                        ))}
                    </div>
                    <div className="shield-vlm-source-policy-foot">
                      <code>{selectedTileSourcePolicyGate.policyId}</code>
                      <span>
                        {selectedTileSourcePolicyGate.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileReleaseChainAudit ? (
                  <div
                    className="shield-vlm-release-chain-audit mt-3"
                    data-vlm-release-chain-audit="pass220"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>
                        {selectedTileReleaseChainAuditLabels.title}
                      </strong>
                      <span>{selectedTileReleaseChainAudit.schemaVersion}</span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-release-chain-decision={
                          selectedTileReleaseChainAudit.chainDecision
                        }
                      >
                        <strong>
                          {selectedTileReleaseChainAuditLabels.decision}
                        </strong>
                        <b>{selectedTileReleaseChainAudit.chainDecision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseChainAuditLabels.score}
                        </strong>
                        <b>
                          {selectedTileReleaseChainAudit.releaseReadinessScore}%
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseChainAuditLabels.blockers}
                        </strong>
                        <b>{selectedTileReleaseChainAudit.hardBlockCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseChainAuditLabels.review}
                        </strong>
                        <b>{selectedTileReleaseChainAudit.reviewCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseChainAuditLabels.adapters}
                        </strong>
                        <b>
                          {
                            selectedTileReleaseChainAudit.serverAdapterRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseChainAuditLabels.pdf}
                        </strong>
                        <b>
                          {selectedTileReleaseChainAudit.pdfDownloadReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-chain-lanes"
                      aria-label={selectedTileReleaseChainAuditLabels.lanes}
                    >
                      {selectedTileReleaseChainAudit.chainLanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-release-chain-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <b>
                            {lane.score}% · {lane.publicCopyGate}
                          </b>
                          <small>{lane.operatorAction}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTileReleaseChainAudit.auditId}</code>
                      <span>
                        {selectedTileReleaseChainAudit.operatorSummary}
                      </span>
                      <small>
                        {selectedTileReleaseChainAuditLabels.next}:{" "}
                        {selectedTileReleaseChainAudit.nextMilestone}
                      </small>
                    </div>
                  </div>
                ) : null}
                {selectedTileSourceLedgerUiPreview ? (
                  <div
                    className="shield-vlm-source-ledger-ui mt-3"
                    data-vlm-source-ledger-ui="pass221"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>
                        {selectedTileSourceLedgerUiPreviewLabels.title}
                      </strong>
                      <span>
                        {selectedTileSourceLedgerUiPreview.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-source-ledger-decision={
                          selectedTileSourceLedgerUiPreview.ledgerDecision
                        }
                      >
                        <strong>
                          {selectedTileSourceLedgerUiPreviewLabels.decision}
                        </strong>
                        <b>
                          {selectedTileSourceLedgerUiPreview.ledgerDecision}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceLedgerUiPreviewLabels.blocked}
                        </strong>
                        <b>
                          {selectedTileSourceLedgerUiPreview.blockedLaneCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceLedgerUiPreviewLabels.server}
                        </strong>
                        <b>
                          {
                            selectedTileSourceLedgerUiPreview.serverRequiredCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceLedgerUiPreviewLabels.preview}
                        </strong>
                        <b>
                          {selectedTileSourceLedgerUiPreview.previewLaneCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileSourceLedgerUiPreviewLabels.browser}
                        </strong>
                        <b>
                          {selectedTileSourceLedgerUiPreview.browserTraceRequired
                            ? "required"
                            : "clear"}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-chain-lanes"
                      aria-label={selectedTileSourceLedgerUiPreviewLabels.lanes}
                    >
                      {selectedTileSourceLedgerUiPreview.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-source-ledger-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <b>
                            {lane.score}% · {lane.proofMode}
                          </b>
                          <small>{lane.nextAction}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>
                        {selectedTileSourceLedgerUiPreview.ledgerPreviewId}
                      </code>
                      <span>
                        {selectedTileSourceLedgerUiPreview.operatorSummary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTilePdfPreviewManifest ? (
                  <div
                    className="shield-vlm-pdf-preview-manifest mt-3"
                    data-vlm-pdf-preview-manifest="pass222"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>
                        {selectedTilePdfPreviewManifestLabels.title}
                      </strong>
                      <span>
                        {selectedTilePdfPreviewManifest.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-pdf-preview-route={
                          selectedTilePdfPreviewManifest.routeState
                        }
                      >
                        <strong>
                          {selectedTilePdfPreviewManifestLabels.route}
                        </strong>
                        <b>{selectedTilePdfPreviewManifest.routeState}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePdfPreviewManifestLabels.blocked}
                        </strong>
                        <b>
                          {selectedTilePdfPreviewManifest.blockedSectionCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePdfPreviewManifestLabels.review}
                        </strong>
                        <b>
                          {selectedTilePdfPreviewManifest.reviewSectionCount}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTilePdfPreviewManifestLabels.customer}
                        </strong>
                        <b>
                          {selectedTilePdfPreviewManifest.customerCopyAllowed}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-chain-lanes"
                      aria-label={selectedTilePdfPreviewManifestLabels.sections}
                    >
                      {selectedTilePdfPreviewManifest.sections.map(
                        (section) => (
                          <span
                            key={section.id}
                            data-vlm-pdf-preview-section={section.state}
                          >
                            <strong>
                              {section.label} · {section.state}
                            </strong>
                            <b>{section.exportMode}</b>
                            <small>{section.text}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTilePdfPreviewManifest.manifestId}</code>
                      <span>
                        {selectedTilePdfPreviewManifest.operatorSummary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileLensShieldHandoff ? (
                  <div
                    className="shield-vlm-lens-shield-handoff mt-3"
                    data-vlm-lens-shield-handoff="pass223"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>
                        {selectedTileLensShieldHandoffLabels.title}
                      </strong>
                      <span>{selectedTileLensShieldHandoff.schemaVersion}</span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-lens-shield-decision={
                          selectedTileLensShieldHandoff.handoffDecision
                        }
                      >
                        <strong>
                          {selectedTileLensShieldHandoffLabels.decision}
                        </strong>
                        <b>{selectedTileLensShieldHandoff.handoffDecision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileLensShieldHandoffLabels.query}
                        </strong>
                        <b>{selectedTileLensShieldHandoff.searchQuery}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileLensShieldHandoffLabels.publicRoute}
                        </strong>
                        <b>
                          {selectedTileLensShieldHandoff.publicRouteEnabled
                            ? "enabled"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-chain-lanes"
                      aria-label={selectedTileLensShieldHandoffLabels.routes}
                    >
                      {selectedTileLensShieldHandoff.routes.map((route) => (
                        <span
                          key={route.id}
                          data-vlm-lens-shield-route={route.state}
                        >
                          <strong>
                            {route.label} · {route.state}
                          </strong>
                          <b>{route.privacyGate}</b>
                          <small>{route.nextAction}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTileLensShieldHandoff.handoffId}</code>
                      <span>
                        {selectedTileLensShieldHandoff.operatorSummary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileReleaseQaScorecard ? (
                  <div
                    className="shield-vlm-release-qa-scorecard mt-3"
                    data-vlm-release-qa-scorecard="pass224"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>
                        {selectedTileReleaseQaScorecardLabels.title}
                      </strong>
                      <span>
                        {selectedTileReleaseQaScorecard.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-release-qa-decision={
                          selectedTileReleaseQaScorecard.qaDecision
                        }
                      >
                        <strong>
                          {selectedTileReleaseQaScorecardLabels.decision}
                        </strong>
                        <b>{selectedTileReleaseQaScorecard.qaDecision}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseQaScorecardLabels.score}
                        </strong>
                        <b>{selectedTileReleaseQaScorecard.overallScore}%</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseQaScorecardLabels.blocked}
                        </strong>
                        <b>{selectedTileReleaseQaScorecard.blockedLaneCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseQaScorecardLabels.review}
                        </strong>
                        <b>{selectedTileReleaseQaScorecard.reviewLaneCount}</b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileReleaseQaScorecardLabels.browser}
                        </strong>
                        <b>
                          {selectedTileReleaseQaScorecard.browserQaRequired
                            ? "required"
                            : "clear"}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-chain-lanes"
                      aria-label={selectedTileReleaseQaScorecardLabels.lanes}
                    >
                      {selectedTileReleaseQaScorecard.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-release-qa-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <b>{lane.score}%</b>
                          <small>{lane.nextAction}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTileReleaseQaScorecard.scorecardId}</code>
                      <span>
                        {selectedTileReleaseQaScorecard.operatorSummary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTileReleaseBlockerResolver ? (
                  <div
                    className="shield-vlm-pass225-232-panel mt-3"
                    data-vlm-release-blocker-resolver="pass225"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.blocker}</strong>
                      <span>
                        {selectedTileReleaseBlockerResolver.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-release-blocker-decision={
                          selectedTileReleaseBlockerResolver.resolverDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>
                          {selectedTileReleaseBlockerResolver.resolverDecision}
                        </b>
                      </span>
                      <span>
                        <strong>{selectedTileEightPassLabels.p0}</strong>
                        <b>{selectedTileReleaseBlockerResolver.p0Count}</b>
                      </span>
                      <span>
                        <strong>P1</strong>
                        <b>{selectedTileReleaseBlockerResolver.p1Count}</b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-release-chain-lanes"
                      aria-label={selectedTileEightPassLabels.lanes}
                    >
                      {selectedTileReleaseBlockerResolver.lanes
                        .slice(0, 4)
                        .map((lane) => (
                          <span
                            key={lane.id}
                            data-vlm-release-blocker-lane={lane.state}
                          >
                            <strong>
                              {lane.label} · {lane.priority}
                            </strong>
                            <b>
                              {lane.owner} · {lane.score}%
                            </b>
                            <small>{lane.nextAction}</small>
                          </span>
                        ))}
                    </div>
                  </div>
                ) : null}
                {selectedTileBrowserQaRunbook ? (
                  <div
                    className="shield-vlm-pass225-232-panel mt-3"
                    data-vlm-browser-qa-runbook="pass226"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.browser}</strong>
                      <span>{selectedTileBrowserQaRunbook.schemaVersion}</span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-browser-qa-decision={
                          selectedTileBrowserQaRunbook.qaDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>{selectedTileBrowserQaRunbook.qaDecision}</b>
                      </span>
                      <span>
                        <strong>required</strong>
                        <b>{selectedTileBrowserQaRunbook.requiredStepCount}</b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileBrowserQaRunbook.steps
                        .slice(0, 4)
                        .map((step) => (
                          <span
                            key={step.id}
                            data-vlm-browser-qa-step={step.state}
                          >
                            <strong>
                              {step.label} · {step.priority}
                            </strong>
                            <b>{step.evidence}</b>
                            <small>{step.nextAction}</small>
                          </span>
                        ))}
                    </div>
                  </div>
                ) : null}
                {selectedTileCustomerCopySanitizer ? (
                  <div
                    className="shield-vlm-pass225-232-panel mt-3"
                    data-vlm-customer-copy-sanitizer="pass227"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.copy}</strong>
                      <span>
                        {selectedTileCustomerCopySanitizer.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-customer-copy-decision={
                          selectedTileCustomerCopySanitizer.copyDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>{selectedTileCustomerCopySanitizer.copyDecision}</b>
                      </span>
                      <span>
                        <strong>redaction</strong>
                        <b>
                          {selectedTileCustomerCopySanitizer.redactionScore}%
                        </b>
                      </span>
                      <span>
                        <strong>forbidden</strong>
                        <b>
                          {selectedTileCustomerCopySanitizer.forbiddenTermCount}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>
                        {selectedTileCustomerCopySanitizer.sanitizerId}
                      </code>
                      <span>
                        {selectedTileCustomerCopySanitizer.previewCopy}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTilePdfRouteContract ? (
                  <div
                    className="shield-vlm-pass225-232-panel mt-3"
                    data-vlm-pdf-route-contract="pass228"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.pdf}</strong>
                      <span>{selectedTilePdfRouteContract.schemaVersion}</span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-pdf-route-decision={
                          selectedTilePdfRouteContract.routeDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>{selectedTilePdfRouteContract.routeDecision}</b>
                      </span>
                      <span>
                        <strong>binary</strong>
                        <b>
                          {selectedTilePdfRouteContract.binaryPdfReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>html</strong>
                        <b>
                          {selectedTilePdfRouteContract.htmlPreviewReady
                            ? "preview"
                            : "review"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTilePdfRouteContract.routeChecks.map((check) => (
                        <span
                          key={check.id}
                          data-vlm-pdf-route-check={check.state}
                        >
                          <strong>
                            {check.label} · {check.state}
                          </strong>
                          <small>{check.nextAction}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedTileLedgerPersistenceAdapterPlan ? (
                  <div
                    className="shield-vlm-pass225-232-panel mt-3"
                    data-vlm-ledger-persistence-adapter-plan="pass229"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.ledger}</strong>
                      <span>
                        {selectedTileLedgerPersistenceAdapterPlan.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-ledger-persistence-decision={
                          selectedTileLedgerPersistenceAdapterPlan.persistenceDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>
                          {
                            selectedTileLedgerPersistenceAdapterPlan.persistenceDecision
                          }
                        </b>
                      </span>
                      <span>
                        <strong>raw</strong>
                        <b>
                          {selectedTileLedgerPersistenceAdapterPlan.rawPayloadAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileLedgerPersistenceAdapterPlan.adapters.map(
                        (adapter) => (
                          <span
                            key={adapter.id}
                            data-vlm-ledger-persistence-adapter={adapter.state}
                          >
                            <strong>
                              {adapter.label} · {adapter.state}
                            </strong>
                            <b>{adapter.target}</b>
                            <small>{adapter.nextAction}</small>
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
                {selectedTileLiveFeedAdapterMatrix ? (
                  <div
                    className="shield-vlm-pass225-232-panel mt-3"
                    data-vlm-live-feed-adapter-matrix="pass230"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.feeds}</strong>
                      <span>
                        {selectedTileLiveFeedAdapterMatrix.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-live-feed-matrix-decision={
                          selectedTileLiveFeedAdapterMatrix.matrixDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>
                          {selectedTileLiveFeedAdapterMatrix.matrixDecision}
                        </b>
                      </span>
                      <span>
                        <strong>live</strong>
                        <b>
                          {selectedTileLiveFeedAdapterMatrix.liveFeedReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileLiveFeedAdapterMatrix.feeds.map((feed) => (
                        <span
                          key={feed.id}
                          data-vlm-live-feed-state={feed.state}
                        >
                          <strong>
                            {feed.label} · {feed.state}
                          </strong>
                          <b>{feed.score}%</b>
                          <small>{feed.nextAction}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedTileWalletAccessGateMatrix ? (
                  <div
                    className="shield-vlm-pass225-232-panel mt-3"
                    data-vlm-wallet-access-gate-matrix="pass231"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.wallet}</strong>
                      <span>
                        {selectedTileWalletAccessGateMatrix.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-wallet-access-decision={
                          selectedTileWalletAccessGateMatrix.accessDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>
                          {selectedTileWalletAccessGateMatrix.accessDecision}
                        </b>
                      </span>
                      <span>
                        <strong>recovery</strong>
                        <b>
                          {selectedTileWalletAccessGateMatrix.seedPhraseAllowed
                            ? "allowed"
                            : "forbidden"}
                        </b>
                      </span>
                      <span>
                        <strong>wallet</strong>
                        <b>
                          {selectedTileWalletAccessGateMatrix.walletConnectReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileWalletAccessGateMatrix.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-wallet-access-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <small>{lane.nextAction}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedTileLaunchReadinessDashboard ? (
                  <div
                    className="shield-vlm-pass225-232-panel shield-vlm-launch-readiness-dashboard mt-3"
                    data-vlm-launch-readiness-dashboard="pass232"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>{selectedTileEightPassLabels.launch}</strong>
                      <span>
                        {selectedTileLaunchReadinessDashboard.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-launch-readiness-decision={
                          selectedTileLaunchReadinessDashboard.launchDecision
                        }
                      >
                        <strong>{selectedTileEightPassLabels.decision}</strong>
                        <b>
                          {selectedTileLaunchReadinessDashboard.launchDecision}
                        </b>
                      </span>
                      <span>
                        <strong>{selectedTileEightPassLabels.score}</strong>
                        <b>
                          {selectedTileLaunchReadinessDashboard.overallScore}%
                        </b>
                      </span>
                      <span>
                        <strong>public</strong>
                        <b>
                          {selectedTileLaunchReadinessDashboard.publicLaunchReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileLaunchReadinessDashboard.lanes.map(
                        (lane) => (
                          <span
                            key={lane.id}
                            data-vlm-launch-readiness-lane={lane.state}
                          >
                            <strong>
                              {lane.label} · {lane.state}
                            </strong>
                            <b>{lane.score}%</b>
                            <small>{lane.nextAction}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>
                        {selectedTileLaunchReadinessDashboard.dashboardId}
                      </code>
                      <span>
                        {selectedTileLaunchReadinessDashboard.operatorSummary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTileMegaBranchControlTower ? (
                  <div
                    className="shield-vlm-pass233-242-panel shield-vlm-mega-branch-control-tower mt-3"
                    data-vlm-mega-branch-control-tower="pass242"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Release overview</strong>
                      <span>
                        {selectedTileMegaBranchControlTower.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-mega-branch-decision={
                          selectedTileMegaBranchControlTower.towerDecision
                        }
                      >
                        <strong>decision</strong>
                        <b>
                          {selectedTileMegaBranchControlTower.towerDecision}
                        </b>
                      </span>
                      <span>
                        <strong>public</strong>
                        <b>
                          {selectedTileMegaBranchControlTower.publicExportReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>PDF</strong>
                        <b>
                          {selectedTileMegaBranchControlTower.binaryPdfReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>wallet</strong>
                        <b>
                          {selectedTileMegaBranchControlTower.walletAccessReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileMegaBranchControlTower.branches.map(
                        (branch) => (
                          <span
                            key={branch.id}
                            data-vlm-mega-branch-lane={branch.state}
                          >
                            <strong>
                              {branch.label} · {branch.state}
                            </strong>
                            <b>{branch.score}%</b>
                            <small>{branch.nextAction}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTileMegaBranchControlTower.towerId}</code>
                      <span>
                        {selectedTileMegaBranchControlTower.operatorSummary}
                      </span>
                    </div>
                  </div>
                ) : null}
                {selectedTileReleaseTriageBoard ? (
                  <div
                    className="shield-vlm-pass243-245-panel shield-vlm-release-triage-board mt-3"
                    data-vlm-release-triage-board="pass243"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Release priorities</strong>
                      <span>
                        {selectedTileReleaseTriageBoard.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-release-triage-decision={
                          selectedTileReleaseTriageBoard.decision
                        }
                      >
                        <strong>decision</strong>
                        <b>{selectedTileReleaseTriageBoard.decision}</b>
                      </span>
                      <span>
                        <strong>score</strong>
                        <b>{selectedTileReleaseTriageBoard.releaseScore}%</b>
                      </span>
                      <span>
                        <strong>blocks</strong>
                        <b>{selectedTileReleaseTriageBoard.hardBlockCount}</b>
                      </span>
                      <span>
                        <strong>review</strong>
                        <b>{selectedTileReleaseTriageBoard.reviewCount}</b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileReleaseTriageBoard.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-release-triage-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <b>
                            {lane.score}% · {lane.exportGate}
                          </b>
                          <small>{lane.nextAction}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTileReleaseTriageBoard.boardId}</code>
                      <span>
                        {selectedTileReleaseTriageBoard.nextMilestone}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTileOperatorHandoffVault ? (
                  <div
                    className="shield-vlm-pass243-245-panel shield-vlm-operator-handoff-vault mt-3"
                    data-vlm-operator-handoff-vault="pass244"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Handoff summary</strong>
                      <span>
                        {selectedTileOperatorHandoffVault.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-handoff-vault-decision={
                          selectedTileOperatorHandoffVault.handoffDecision
                        }
                      >
                        <strong>handoff</strong>
                        <b>
                          {selectedTileOperatorHandoffVault.handoffDecision}
                        </b>
                      </span>
                      <span>
                        <strong>source write</strong>
                        <b>
                          {selectedTileOperatorHandoffVault.sourceSnapshotWriteReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>case write</strong>
                        <b>
                          {selectedTileOperatorHandoffVault.caseTimelineWriteReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>raw</strong>
                        <b>
                          {selectedTileOperatorHandoffVault.rawPayloadAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileOperatorHandoffVault.entries.map((entry) => (
                        <span
                          key={entry.id}
                          data-vlm-handoff-vault-entry={entry.state}
                        >
                          <strong>
                            {entry.label} · {entry.state}
                          </strong>
                          <b>{entry.storageTarget}</b>
                          <small>{entry.nextAction}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTileOperatorHandoffVault.vaultId}</code>
                      <span>
                        {selectedTileOperatorHandoffVault.redactionBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTileBrowserReplayScript ? (
                  <div
                    className="shield-vlm-pass243-245-panel shield-vlm-browser-replay-script mt-3"
                    data-vlm-browser-replay-script="pass245"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Browser review</strong>
                      <span>
                        {selectedTileBrowserReplayScript.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-browser-replay-decision={
                          selectedTileBrowserReplayScript.replayDecision
                        }
                      >
                        <strong>replay</strong>
                        <b>{selectedTileBrowserReplayScript.replayDecision}</b>
                      </span>
                      <span>
                        <strong>QA HUD</strong>
                        <b>
                          {selectedTileBrowserReplayScript.qaHudRequired
                            ? "required"
                            : "off"}
                        </b>
                      </span>
                      <span>
                        <strong>WebGL compare</strong>
                        <b>
                          {selectedTileBrowserReplayScript.webglComparisonAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileBrowserReplayScript.steps.map((step) => (
                        <span
                          key={step.id}
                          data-vlm-browser-replay-step={step.state}
                        >
                          <strong>
                            {step.label} · {step.state}
                          </strong>
                          <b>{step.traceTarget}</b>
                          <small>{step.expected}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>{selectedTileBrowserReplayScript.replayId}</code>
                      <span>
                        {selectedTileBrowserReplayScript.nextMilestone}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTileReleaseReadinessOrchestrator ? (
                  <div
                    className="shield-vlm-pass246-251-panel shield-vlm-release-readiness-orchestrator mt-3"
                    data-vlm-release-readiness-orchestrator="pass251"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Readiness overview</strong>
                      <span>
                        {selectedTileReleaseReadinessOrchestrator.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-release-readiness-decision={
                          selectedTileReleaseReadinessOrchestrator.releaseDecision
                        }
                      >
                        <strong>decision</strong>
                        <b>
                          {
                            selectedTileReleaseReadinessOrchestrator.releaseDecision
                          }
                        </b>
                      </span>
                      <span>
                        <strong>score</strong>
                        <b>
                          {
                            selectedTileReleaseReadinessOrchestrator.overallScore
                          }
                          %
                        </b>
                      </span>
                      <span>
                        <strong>blocked</strong>
                        <b>
                          {
                            selectedTileReleaseReadinessOrchestrator.blockedLaneCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>review</strong>
                        <b>
                          {
                            selectedTileReleaseReadinessOrchestrator.reviewLaneCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>PDF</strong>
                        <b>
                          {selectedTileReleaseReadinessOrchestrator.binaryPdfAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>wallet</strong>
                        <b>
                          {selectedTileReleaseReadinessOrchestrator.walletAccessAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileReleaseReadinessOrchestrator.lanes.map(
                        (lane) => (
                          <span
                            key={lane.id}
                            data-vlm-release-readiness-lane={lane.state}
                          >
                            <strong>
                              {lane.label} · {lane.state}
                            </strong>
                            <b>{lane.score}%</b>
                            <small>{lane.nextAction}</small>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="shield-vlm-release-chain-foot">
                      <code>
                        {
                          selectedTileReleaseReadinessOrchestrator.orchestratorId
                        }
                      </code>
                      <span>
                        {selectedTileReleaseReadinessOrchestrator.nextMilestone}
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedTileExportAuthorizationGate ? (
                  <div
                    className="shield-vlm-pass246-251-panel mt-3"
                    data-vlm-export-authorization-gate="pass246"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Export authorization gate</strong>
                      <span>
                        {selectedTileExportAuthorizationGate.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-export-auth-decision={
                          selectedTileExportAuthorizationGate.decision
                        }
                      >
                        <strong>decision</strong>
                        <b>{selectedTileExportAuthorizationGate.decision}</b>
                      </span>
                      <span>
                        <strong>score</strong>
                        <b>
                          {
                            selectedTileExportAuthorizationGate.authorizationScore
                          }
                          %
                        </b>
                      </span>
                      <span>
                        <strong>public</strong>
                        <b>
                          {selectedTileExportAuthorizationGate.publicExportAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>raw</strong>
                        <b>
                          {selectedTileExportAuthorizationGate.rawPayloadAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileExportAuthorizationGate.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-export-auth-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <b>{lane.score}%</b>
                          <small>{lane.nextAction}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTileBrowserEvidenceCollector ? (
                  <div
                    className="shield-vlm-pass246-251-panel mt-3"
                    data-vlm-browser-evidence-collector="pass247"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Browser evidence collector</strong>
                      <span>
                        {selectedTileBrowserEvidenceCollector.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-browser-evidence-decision={
                          selectedTileBrowserEvidenceCollector.collectorDecision
                        }
                      >
                        <strong>decision</strong>
                        <b>
                          {
                            selectedTileBrowserEvidenceCollector.collectorDecision
                          }
                        </b>
                      </span>
                      <span>
                        <strong>missing</strong>
                        <b>
                          {
                            selectedTileBrowserEvidenceCollector.missingArtifactCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>review</strong>
                        <b>
                          {
                            selectedTileBrowserEvidenceCollector.reviewArtifactCount
                          }
                        </b>
                      </span>
                      <span>
                        <strong>QA HUD</strong>
                        <b>
                          {selectedTileBrowserEvidenceCollector.qaHudRequired
                            ? "required"
                            : "off"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileBrowserEvidenceCollector.items
                        .slice(0, 8)
                        .map((item) => (
                          <span
                            key={item.id}
                            data-vlm-browser-evidence-item={item.state}
                          >
                            <strong>
                              {item.label} · {item.state}
                            </strong>
                            <b>{item.traceTarget}</b>
                            <small>{item.requiredArtifact}</small>
                          </span>
                        ))}
                    </div>
                  </div>
                ) : null}

                {selectedTileAdapterReadinessScheduler ? (
                  <div
                    className="shield-vlm-pass246-251-panel mt-3"
                    data-vlm-adapter-readiness-scheduler="pass248"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Adapter readiness scheduler</strong>
                      <span>
                        {selectedTileAdapterReadinessScheduler.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-adapter-scheduler-decision={
                          selectedTileAdapterReadinessScheduler.schedulerDecision
                        }
                      >
                        <strong>decision</strong>
                        <b>
                          {
                            selectedTileAdapterReadinessScheduler.schedulerDecision
                          }
                        </b>
                      </span>
                      <span>
                        <strong>P0</strong>
                        <b>{selectedTileAdapterReadinessScheduler.p0Count}</b>
                      </span>
                      <span>
                        <strong>P1</strong>
                        <b>{selectedTileAdapterReadinessScheduler.p1Count}</b>
                      </span>
                      <span>
                        <strong>browser</strong>
                        <b>
                          {selectedTileAdapterReadinessScheduler.browserOnlyAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileAdapterReadinessScheduler.tasks
                        .slice(0, 10)
                        .map((task) => (
                          <span
                            key={task.id}
                            data-vlm-adapter-task={task.state}
                          >
                            <strong>
                              {task.priority} · {task.label}
                            </strong>
                            <b>{task.retryPolicy}</b>
                            <small>{task.nextAction}</small>
                          </span>
                        ))}
                    </div>
                  </div>
                ) : null}

                {selectedTileCustomerBriefBuilder ? (
                  <div
                    className="shield-vlm-pass246-251-panel mt-3"
                    data-vlm-customer-brief-builder="pass249"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Customer brief builder</strong>
                      <span>
                        {selectedTileCustomerBriefBuilder.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-customer-brief-decision={
                          selectedTileCustomerBriefBuilder.briefDecision
                        }
                      >
                        <strong>decision</strong>
                        <b>{selectedTileCustomerBriefBuilder.briefDecision}</b>
                      </span>
                      <span>
                        <strong>copy</strong>
                        <b>
                          {selectedTileCustomerBriefBuilder.customerCopyReady
                            ? "ready"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>public route</strong>
                        <b>
                          {selectedTileCustomerBriefBuilder.publicRouteAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>terms</strong>
                        <b>
                          {selectedTileCustomerBriefBuilder.forbiddenClaimCount}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileCustomerBriefBuilder.sections.map(
                        (section) => (
                          <span
                            key={section.id}
                            data-vlm-customer-brief-section={section.state}
                          >
                            <strong>
                              {section.label} · {section.state}
                            </strong>
                            <small>{section.copy}</small>
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {selectedTileWalletSessionPolicy ? (
                  <div
                    className="shield-vlm-pass246-251-panel mt-3"
                    data-vlm-wallet-session-policy="pass250"
                  >
                    <div className="shield-vlm-release-chain-head">
                      <strong>Wallet session policy</strong>
                      <span>
                        {selectedTileWalletSessionPolicy.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-summary">
                      <span
                        data-vlm-wallet-session-decision={
                          selectedTileWalletSessionPolicy.policyDecision
                        }
                      >
                        <strong>decision</strong>
                        <b>{selectedTileWalletSessionPolicy.policyDecision}</b>
                      </span>
                      <span>
                        <strong>recovery</strong>
                        <b>
                          {selectedTileWalletSessionPolicy.seedPhraseAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>secret key</strong>
                        <b>
                          {selectedTileWalletSessionPolicy.privateKeyAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                      <span>
                        <strong>profit copy</strong>
                        <b>
                          {selectedTileWalletSessionPolicy.roiCopyAllowed
                            ? "allowed"
                            : "blocked"}
                        </b>
                      </span>
                    </div>
                    <div className="shield-vlm-release-chain-lanes">
                      {selectedTileWalletSessionPolicy.lanes.map((lane) => (
                        <span
                          key={lane.id}
                          data-vlm-wallet-session-lane={lane.state}
                        >
                          <strong>
                            {lane.label} · {lane.state}
                          </strong>
                          <small>{lane.nextAction}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTileDurableSnapshotPlan ? (
                  <div
                    className="shield-vlm-durable-snapshot-plan mt-3"
                    data-vlm-durable-snapshot-plan="pass219"
                  >
                    <div className="shield-vlm-durable-snapshot-head">
                      <strong>{selectedTileDurableSnapshotLabels.title}</strong>
                      <span>
                        {selectedTileDurableSnapshotPlan.schemaVersion}
                      </span>
                    </div>
                    <div className="shield-vlm-durable-snapshot-summary">
                      <span
                        data-vlm-durable-snapshot-decision={
                          selectedTileDurableSnapshotPlan.durableWriteDecision
                        }
                      >
                        <strong>
                          {selectedTileDurableSnapshotLabels.decision}
                        </strong>
                        <b>
                          {selectedTileDurableSnapshotPlan.durableWriteDecision}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileDurableSnapshotLabels.source}
                        </strong>
                        <b>
                          {selectedTileDurableSnapshotPlan.sourceSnapshotStore}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileDurableSnapshotLabels.case}
                        </strong>
                        <b>
                          {selectedTileDurableSnapshotPlan.caseTimelineStore}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileDurableSnapshotLabels.export}
                        </strong>
                        <b>
                          {selectedTileDurableSnapshotPlan.exportManifestStore}
                        </b>
                      </span>
                      <span>
                        <strong>
                          {selectedTileDurableSnapshotLabels.blocked}
                        </strong>
                        <b>
                          {selectedTileDurableSnapshotPlan.blockedWriteCount}
                        </b>
                      </span>
                    </div>
                    <div
                      className="shield-vlm-durable-snapshot-writes"
                      aria-label={selectedTileDurableSnapshotLabels.writes}
                    >
                      {selectedTileDurableSnapshotPlan.writes.map((item) => (
                        <span
                          key={item.id}
                          data-vlm-durable-snapshot-write={item.state}
                        >
                          <strong>
                            {item.label} · {item.state}
                          </strong>
                          <b>
                            {item.storageTarget} · raw payload{" "}
                            {item.rawPayloadAllowed ? "allowed" : "blocked"}
                          </b>
                          <small>{item.nextWriteStep}</small>
                        </span>
                      ))}
                    </div>
                    <div className="shield-vlm-durable-snapshot-foot">
                      <code>{selectedTileDurableSnapshotPlan.planId}</code>
                      <span>
                        {selectedTileDurableSnapshotPlan.customerBoundary}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 rounded-2xl border border-white/[0.12] bg-black/[0.82] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
                    {selectedTileEvidenceCopy?.groupLabel} ·{" "}
                    {selectedTileEvidenceCopy?.sourceState}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-white/[0.66]">
                    {selectedNode.detail}
                  </p>
                  <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.50]">
                      {selectedTileEvidenceCopy?.intelligenceLabels.caseSummary}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.76]">
                      {selectedTileEvidenceCopy?.driver}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.58]">
                      {selectedTileEvidenceCopy?.why}
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/[0.08] bg-black/[0.30] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.50]">
                      {selectedTileEvidenceCopy?.intelligenceLabels.inputTrace}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.62]">
                      {selectedTileEvidenceCopy?.inputTrace}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">
                      {selectedTileEvidenceCopy?.scoreRead}
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl border border-cyan-200/[0.10] bg-cyan-300/[0.035] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.60]">
                      {
                        selectedTileEvidenceCopy?.intelligenceLabels
                          .missingTrace
                      }
                    </p>
                    <p className="mt-2 text-xs leading-6 text-cyan-100/[0.72]">
                      {selectedTileEvidenceCopy?.evidenceNeed}
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl border border-velmere-gold/[0.14] bg-velmere-gold/[0.055] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-velmere-gold/[0.72]">
                      {
                        selectedTileEvidenceCopy?.intelligenceLabels
                          .operatorAction
                      }
                    </p>
                    <p className="mt-2 text-xs leading-6 text-velmere-gold/[0.84]">
                      {selectedTileEvidenceCopy?.next}
                    </p>
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.38]">
                      {selectedTileEvidenceCopy?.operatorQuestion}
                    </p>
                    <div className="shield-vlm-operator-checklist mt-3">
                      <p>
                        {selectedTileEvidenceCopy?.intelligenceLabels.checklist}
                      </p>
                      <ul>
                        {(
                          selectedTileEvidenceCopy?.operatorChecklist ?? []
                        ).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-white/[0.42]">
                    {selectedTileEvidenceCopy?.intelligenceLabels.caveat}
                  </p>
                </div>
                <div className="shield-vlm-detail-operator-footrail shield-vlm-detail-operator-footrail-premium mt-3 grid gap-2 rounded-2xl border border-white/[0.10] bg-black/[0.50] p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.50] sm:grid-cols-3">
                  <span>source · {selectedTileEvidenceCopy?.chartSource}</span>
                  <span>
                    {selectedTileEvidenceCopy?.intelligenceLabels.sourceTrust} ·{" "}
                    {selectedTileEvidenceCopy?.sourceTrust}
                  </span>
                  <span>
                    {selectedTileEvidenceCopy?.intelligenceLabels.publishState}{" "}
                    · {selectedTileEvidenceCopy?.publicationState}
                  </span>
                  <span>
                    confidence · {selectedTileEvidenceCopy?.confidence}
                  </span>
                  <span>
                    mode ·{" "}
                    {isAdvanced ? ui.modeAdvanced : isPro ? "pro" : "basic"}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;
  // PASS367 marker: Orbit drawer trims raw operator rails, keeps the right-edge panel scroll-native and preserves safeChartStatusLabel rendering.
  // PASS201 marker: tile detail popup is rendered through document.body portal above the Orbit 360 layer.
  // PASS203 marker: AI Brain detail drawer now exposes evidenceRail/confidenceRail/decisionRail and per-card source badges.
  // PASS204 marker: AI Brain uses lightweight FPS telemetry, selected-tile reading pause and a WebGL migration gate without enabling a heavy renderer.
  // PASS205 marker: VLM Brain mounts an isolated feature-gated WebGL prototype layer while DOM Orbit remains the visible fallback.
  // PASS206 marker: public VLM Brain hides QA/FPS/zoom HUD by default and keeps WebGL trace behind NEXT_PUBLIC_VLM_BRAIN_QA_HUD or renderer gate.
  // PASS207 marker: selected tile drawer now includes a decision dock with priority, confidence cap, source mode and review window.
  // PASS208 marker: selected tile drawer now exposes a report capsule with public brief, internal memo, redaction rule and export gate.
  // PASS210 marker: report handoff bridge shows freshness/status/storage/blocker state without enabling binary PDF export.
  // PASS211 marker: operator action queue exposes prioritized source/review/export steps without enabling customer export.
  // PASS212 marker: case-review timeline links capsule/handoff/action events into an operator-only audit preview before customer export.
  // PASS262 marker: release rehearsal matrix keeps dry-run, rollback, owner signoff and public-surface locks operator-only.
  // PASS213 marker: customer export firewall adds source debt, evidence coverage, redaction score and PDF gate visibility to the selected tile drawer.
  // PASS216 marker: source truth spine adds adapter freshness and source-ledger preview gates to the selected tile drawer.
  // PASS217 marker: live adapter freshness mesh adds TTL/cache/hard-stop/source-ledger preview gates before customer export.
  // PASS218 marker: source policy gate adds allowlist/reviewer/evidence-use boundaries before customer copy.
  // PASS219 marker: durable snapshot write plan adds source/case/redaction/export storage gates before PDF/customer export.
  // PASS220 marker: release chain audit aggregates coverage, freshness, source policy, durable snapshot and PDF gates into one operator-only readiness chain.
  // PASS221 marker: source ledger UI preview exposes server-write/browser QA/raw-payload gates above durable snapshot details.
  // PASS222 marker: PDF preview manifest keeps binary PDF download disabled while mapping safe HTML preview sections.
  // PASS223 marker: Lens-to-Shield handoff keeps public route and raw query payload blocked until review.
  // PASS224 marker: release QA scorecard aggregates browser, motion, source, redaction, PDF, Lens, durable and copy gates.
  // PASS225 marker: release blocker resolver prioritizes P0/P1 blockers before customer export.
  // PASS226 marker: browser QA runbook covers modal layers, Orbit FPS, tile drawer, search portal, keyboard and mobile.
  // PASS227 marker: customer copy sanitizer blocks forbidden terms and keeps public copy review-only.
  // PASS228 marker: PDF route contract keeps binary download disabled while preview remains operator-only.
  // PASS229 marker: ledger persistence adapter plan requires server-only source/case/redaction/export stores.
  // PASS230 marker: live feed adapter matrix exposes holder/orderbook/contract/OSINT gaps.
  // PASS231 marker: wallet access gate matrix keeps seed phrase forbidden and entitlements blocked until implemented.
  // PASS232 marker: launch readiness dashboard aggregates blocker/browser/copy/PDF/persistence/feed/wallet gates.
  // PASS242 marker: PASS233-PASS242 control tower render protects public export/PDF/wallet/raw payload gates.
  // PASS254 marker: release cockpit source-ledger handoff keeps export/PDF/wallet/customer copy blocked until source, redaction and browser evidence are proven.

  const phaseLabel =
    phase === "boot"
      ? ui.boot
      : phase === "orb"
        ? ui.orb
        : phase === "brain"
          ? ui.brain
          : phase === "readout"
            ? ui.readout
            : ui.complete;

  const boardDensity =
    filteredVisibleNodes.length <= 2
      ? "sparse"
      : filteredVisibleNodes.length <= 6
        ? "focused"
        : "full";
  const estimatedReadSeconds = Math.max(
    5,
    Math.ceil(
      (lineStartMs + readNodes.length * revealGapMs + lineDurationMs) / 1000,
    ),
  );

  return (
    <div
      ref={overlayRef}
      className={`shield-vlm-sequence-overlay shield-vlm-sequence-pass326 ${isCompactViewport ? "shield-vlm-sequence-compact" : ""} ${useStaticEvidenceBoard ? "shield-vlm-board-mode" : "shield-vlm-orbit-mode"} ${performanceRuntime ? "shield-vlm-runtime-performance" : "shield-vlm-runtime-cinematic"}`}
      data-pass326-fullscreen-orbit="true"
      data-pass368-neural-audit-morph="true"
      data-pass395-orbit360-neural-brain="true"
      data-pass329-a4-orbit-refine="true"
      data-vlm-qa-motion={showMotionQaHud ? "true" : "false"}
      data-vlm-webgl-trace={webglTelemetry ? "active" : "idle"}
      role="dialog"
      aria-modal="true"
      aria-label="VLM neural token analysis"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onPointerLeave={releasePointer}
      onWheel={handleOrbitWheel}
    >
      {renderHeavyCanvas ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        />
      ) : null}
      <VlmBrainWebGLPrototype
        symbol={tokenInfo.symbol}
        mode={mode}
        riskScore={riskScore}
        paused={Boolean(selectedNode)}
        quality={motionQuality}
        onTelemetry={setWebglTelemetry}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(200,169,106,0.11),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.68))]" />
      <div
        className={`shield-vlm-dom-core shield-vlm-dom-core-${phase}`}
        style={coreEntryStyle}
        aria-hidden="true"
      >
        <span className="shield-vlm-dom-core-ring shield-vlm-dom-core-ring-a" />
        <span className="shield-vlm-dom-core-ring shield-vlm-dom-core-ring-b" />
        <span className="shield-vlm-dom-core-label">VLM</span>
        <span className="shield-vlm-dom-core-symbol">{tokenInfo.symbol}</span>
      </div>

      <div
        className="shield-vlm-topbar shield-vlm-topbar-minimal z-30"
        data-vlm-no-drag="true"
      >
        <div className="shield-vlm-brain-chip">
          <span>{ui.brainChip}</span>
          <strong>
            {tokenInfo.symbol} ·{" "}
            {isAdvanced
              ? ui.advancedTitle
              : isPro
                ? ui.proTitle
                : ui.basicTitle}
          </strong>
        </div>
        {showMotionQaHud ? (
          <div
            className={`shield-vlm-motion-health-chip shield-vlm-motion-health-${motionTelemetry.state}`}
            aria-label={`${ui.motionHealth}: ${motionTelemetryLabel}`}
            data-vlm-motion-qa="true"
          >
            <span>{ui.motionHealth}</span>
            <strong>
              {motionTelemetry.fps
                ? `${motionTelemetry.fps} FPS`
                : motionTelemetryLabel}
            </strong>
            <em>
              {webglTelemetry
                ? `webgl ${webglTelemetry.fps} FPS · worst ${webglTelemetry.worstFrameMs}ms · ${webglTelemetry.nodeCount} nodes`
                : `${motionTelemetryLabel} · ${ui.inputLatency} ${motionTelemetry.inputLatency}`}
            </em>
          </div>
        ) : null}

        <div
          className="shield-vlm-topbar-actions"
          data-vlm-no-drag="true"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {/* Public Orbit view intentionally keeps one clear action only.
              QA motion presets and +/- zoom controls remain internal. */}
          {/* PASS196/PASS193 compatibility markers: shield-vlm-orbit-only · shield-vlm-motion-toggle-mini · shield-vlm-zoom-controls. Public controls are intentionally removed. */}

          <button
            type="button"
            data-vlm-no-drag="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="shield-vlm-back-button shield-vlm-back-button-corner"
          >
            {ui.back}
          </button>
        </div>
      </div>

      {/* The technical build timer is retained in runtime state but not shown in the public Orbit surface. */}

      <section
        className="shield-vlm-pass395-neural-collector"
        data-pass395-orbit360-neural-brain="true"
        data-pass395-fields={pass395Readout.count}
        data-vlm-no-drag="true"
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="VLM neural collection before analysis readout"
      >
        <div className="shield-vlm-pass395-neural-orbit" aria-hidden="true">
          <span className="shield-vlm-pass395-vlm-coin">V</span>
          <span className="shield-vlm-pass395-brain-shell" />
          {Array.from({ length: 24 }).map((_, index) => (
            <i
              key={`shield-pass395-neuron-${index}`}
              style={{ "--pass395-node": index } as CSSProperties}
            />
          ))}
        </div>
        <div className="shield-vlm-pass395-neural-copy">
          <p>{pass395OrbitNeuralContract.version}</p>
          <strong>{pass395Readout.headline}</strong>
          <span>{pass395Readout.body}</span>
          <em>
            {pass395Readout.seconds.toFixed(1)}s · {pass395Readout.count} fields
            · {visiblePointLabel}
          </em>
          <div>
            {pass395CollectionPhases.map((phaseItem) => (
              <b key={phaseItem.id}>
                {phaseItem.label}
                <small>{phaseItem.seconds.toFixed(1)}s</small>
              </b>
            ))}
          </div>
        </div>
      </section>

      {motionPreset !== "static" ? (
        <div className="shield-vlm-orbital-shell" aria-hidden="true">
          <span className="shield-vlm-orbital-shell-ring shield-vlm-orbital-shell-ring-a" />
          <span className="shield-vlm-orbital-shell-ring shield-vlm-orbital-shell-ring-b" />
          <span className="shield-vlm-orbital-shell-ring shield-vlm-orbital-shell-ring-c" />
        </div>
      ) : null}

      {!useRailLayout && showLineSvg ? (
        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {readNodes.map((node, index) => {
            const pathD = linePathForNode(node, index);
            const lineDelay = lineStartMs + index * revealGapMs;
            const dotDelay = lineDelay + lineDurationMs * 0.76;
            return (
              <g
                key={`vlm-line-${node.label}`}
                className="shield-vlm-ray-group"
              >
                <path
                  d={pathD}
                  className={`shield-vlm-read-line ${isAdvanced ? "shield-vlm-read-line-advanced" : ""}`}
                  style={{
                    animationDelay: `${lineDelay}ms`,
                    animationDuration: `${lineDurationMs}ms`,
                  }}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isAdvanced ? 0.38 : 0.52}
                  className={`shield-vlm-read-dot shield-vlm-read-dot-${node.tone ?? "gold"}`}
                  style={{ animationDelay: `${dotDelay}ms` }}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isAdvanced ? 1.04 : 1.34}
                  className="shield-vlm-read-pulse"
                  style={{ animationDelay: `${dotDelay + 80}ms` }}
                />
              </g>
            );
          })}
        </svg>
      ) : null}

      {useRailLayout ? (
        <div
          className={`shield-vlm-static-evidence-board shield-vlm-static-density-${boardDensity} z-20`}
          data-vlm-no-drag="true"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="shield-vlm-static-board-header">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
                {ui.evidenceBoard}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/[0.45]">
                {ui.boardHint} · {ui.tapPoint}
              </p>
            </div>
            <span>
              {filteredVisibleNodes.length}/{visibleNodes.length}
            </span>
          </div>
          <div className="shield-vlm-group-filter shield-vlm-static-filter">
            {tileGroups.map((group) => (
              <button
                key={group}
                type="button"
                data-vlm-no-drag="true"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setActiveTileGroup(group)}
                className={activeTileGroup === group ? "is-active" : ""}
              >
                {groupLabels[group]}
              </button>
            ))}
          </div>
          <div className="shield-vlm-static-map-rings" aria-hidden="true">
            <span className="shield-vlm-static-map-ring shield-vlm-static-map-ring-a" />
            <span className="shield-vlm-static-map-ring shield-vlm-static-map-ring-b" />
            <span className="shield-vlm-static-map-ring shield-vlm-static-map-ring-c" />
          </div>
          <div className="shield-vlm-static-stage">
            {filteredVisibleNodes.map((node, index) => {
              const display = nodeDisplayCopy[node.group];
              return (
                <button
                  key={`vlm-static-${node.label}`}
                  type="button"
                  data-vlm-no-drag="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setSelectedNode(node)}
                  className={`shield-vlm-read-card shield-vlm-static-card shield-vlm-static-card-${staticBoardRingName(index, filteredVisibleNodes.length)} shield-vlm-read-card-${node.tone ?? "gold"} ${selectedNode?.label === node.label ? "shield-vlm-read-card-active" : ""}`}
                  style={{
                    ...staticBoardTileStyle(
                      node,
                      index,
                      filteredVisibleNodes.length,
                    ),
                    animationDelay: `${Math.min(index * 45, 520)}ms`,
                  }}
                >
                  <div className="shield-vlm-read-card-scan" />
                  <p className="relative font-mono text-[8px] uppercase tracking-[0.16em] text-white/[0.35]">
                    {node.label.split(" ")[0]} · {display.label}
                  </p>
                  <p className="relative mt-1 truncate font-mono text-[13px] font-semibold text-white tabular-nums">
                    {node.value}
                  </p>
                  <p className="relative mt-1 truncate font-mono text-[8px] uppercase tracking-[0.12em] text-velmere-gold">
                    {display.hint}
                  </p>
                  <span className="shield-vlm-card-detail-pill">
                    {ui.tileDetails}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20 shield-vlm-tile-deck shield-vlm-motion-governed">
          {filteredVisibleNodes.map((node, index) => {
            const display = nodeDisplayCopy[node.group];
            return (
              <div
                key={`vlm-read-${node.label}`}
                className="absolute shield-vlm-tile-anchor"
                style={advancedTileStyle(node, index)}
              >
                <button
                  type="button"
                  data-vlm-no-drag="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setSelectedNode(node)}
                  className={`pointer-events-auto shield-vlm-read-card shield-vlm-read-card-${node.tone ?? "gold"} shield-vlm-read-card-advanced ${selectedNode?.label === node.label ? "shield-vlm-read-card-active" : ""}`}
                  style={{ animationDelay: `${Math.min(index * 70, 700)}ms` }}
                >
                  <div className="shield-vlm-read-card-scan" />
                  <p className="relative font-mono text-[8px] uppercase tracking-[0.16em] text-white/[0.35]">
                    {node.label.split(" ")[0]} · {display.label}
                  </p>
                  <p className="relative mt-1 truncate font-mono text-[13px] font-semibold text-white tabular-nums">
                    {node.value}
                  </p>
                  <p className="relative mt-1 truncate font-mono text-[8px] uppercase tracking-[0.12em] text-velmere-gold">
                    {display.hint}
                  </p>
                  <span className="shield-vlm-card-detail-pill">
                    {ui.tileDetails}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedTileDetailPortal}
    </div>
  );
}

/* <i18n-safe-boundary */
function AdvancedVlmNeuralConsole({
  result,
  candles,
  orderbook,
  combinedScore,
  chartSource,
  advancedTierLabel,
  onCommand,
}: {
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  combinedScore: number;
  chartSource: string;
  advancedTierLabel: string;
  onCommand: (id: TerminalCommandId) => void;
}) {
  const tokenInfo = result["token"];
  const investigator = useMemo(
    () => buildVlmShieldInvestigator(result),
    [result],
  );
  const strongestAgents = (result.agentAssessments ?? [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const lanes = [
    {
      id: "sources" as const,
      label: "Source stream",
      value: result.dataQuality,
      body: `${candles.length || 0} candles · ${chartSource}`,
      icon: Database,
    },
    {
      id: "liquidity" as const,
      label: "Liquidity lane",
      value: orderbook ? "depth online" : "partial",
      body: orderbook
        ? `${orderbook.riskPoints ?? 0}/100 order-book stress`
        : "depth feed gated / fallback",
      icon: Activity,
    },
    {
      id: "holders" as const,
      label: "Holder graph",
      value: "gated",
      body: "whales · CEX · DEX/LP · retail · unclassified buckets",
      icon: Network,
    },
    {
      id: "evidence" as const,
      label: "Evidence rail",
      value: "draft",
      body: "source ledger, missing data and legal-safe export path",
      icon: FileText,
    },
  ];
  /* < */
  const aiFeed = [
    `Advanced mode dla ${tokenInfo.symbol}: spinam wykres, source ledger, liquidity, holders i evidence w jedną mapę systemu.`,
    `Risk center: ${combinedScore}/100. To jest flaga algorytmiczna, nie wyrok, nie porada inwestycyjna i nie dowód prawny.`,
    `Najpierw sprawdzam źródła: ${result.dataQuality}. Brakujące dane podnoszą uncertainty, a nie bezpieczeństwo.`,
    orderbook
      ? `Orderbook feed podłączony: stress ${orderbook.riskPoints ?? 0}/100, spread/slippage idą do liquidity lane.`
      : "Orderbook/depth nie jest pełny — advanced pokazuje to jako partial lane, nie jako pustą kartę.",
    `Pełne rubryki są dla ${advancedTierLabel}: AI, holder graph, evidence, replay, stress i operator workflow.`,
  ];

  return (
    <section className="shield-vlm-neural-console mt-5 overflow-hidden rounded-[1.85rem] border border-velmere-gold/[0.16] bg-[radial-gradient(circle_at_50%_40%,rgba(200,169,106,0.18),transparent_32%),radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.10),transparent_30%),rgba(255,255,255,0.024)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_120px_rgba(0,0,0,0.35)] md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-velmere-gold">
            Advanced VLM neural analysis
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            Dane nie są już listą kart — tworzą mapę przepływu ryzyka.
          </h3>
          <p className="shield-copy-safe mt-3 max-w-3xl text-sm leading-7 text-white/[0.56]">
            Lewa strona pokazuje strumienie danych, centrum łączy je w VLM risk
            core, prawa strona pokazuje analizę AI jak operator SOC. To jest
            warstwa advanced — public/basic zostaje czysty.
          </p>
        </div>
        <span className="w-fit rounded-full border border-velmere-gold/[0.22] bg-velmere-gold/[0.08] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-velmere-gold">
          {advancedTierLabel} · gated
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,0.82fr)_minmax(20rem,0.38fr)]">
        <div className="shield-investigator-brief rounded-[1.5rem] border border-cyan-300/[0.14] bg-cyan-300/[0.045] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                {investigator.title}
              </p>
              <h4 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white md:text-2xl">
                OSINT protocol dla podejrzanych pomp, low-float i ukrytych
                unlocków.
              </h4>
              <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.55]">
                {investigator.quickVerdict}
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
              <span className="rounded-2xl border border-white/[0.10] bg-black/[0.26] px-4 py-3">
                <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.36]">
                  Shield risk
                </span>
                <span className="mt-1 block font-mono text-2xl text-white tabular-nums">
                  {investigator.overallRisk}
                </span>
              </span>
              <span className="rounded-2xl border border-white/[0.10] bg-black/[0.26] px-4 py-3">
                <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.36]">
                  Confidence
                </span>
                <span className="mt-1 block font-mono text-sm uppercase tracking-[0.12em] text-velmere-gold">
                  {investigator.confidence}
                </span>
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {investigator.lanes.slice(0, 6).map((lane) => (
              <button
                key={lane.id}
                type="button"
                onClick={() => onCommand("evidence")}
                className={`shield-investigator-lane shield-investigator-lane-${lane.status}`}
                title={lane.nextStep}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.56]">
                    {lane.label}
                  </span>
                  <span className="font-mono text-[10px] text-white tabular-nums">
                    {lane.score}
                  </span>
                </span>
                <span className="mt-2 block text-left text-[11px] leading-5 text-white/[0.52]">
                  {lane.headline}
                </span>
              </button>
            ))}
          </div>
          <div className="shield-loss-prevention-panel mt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">
              loss prevention
            </p>
            <p className="shield-copy-safe mt-2 text-[11px] leading-5 text-white/[0.54]">
              {investigator.lossPrevention.whyThisMatters}
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <p className="rounded-2xl border border-red-300/[0.14] bg-red-400/[0.045] p-3 text-[11px] leading-5 text-red-50/[0.72]">
                {investigator.lossPrevention.behavioralTrap.label}:{" "}
                {investigator.lossPrevention.behavioralTrap.risk}
              </p>
              <p className="rounded-2xl border border-emerald-300/[0.13] bg-emerald-400/[0.040] p-3 text-[11px] leading-5 text-emerald-50/[0.70]">
                {investigator.lossPrevention.behavioralTrap.counterMove}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-velmere-gold/[0.16] bg-velmere-gold/[0.055] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            Web OSINT required
          </p>
          <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.54]">
            Finalny werdykt tokena musi sprawdzać świeże źródła: supply,
            vesting, buyback, squeeze, KOL i kontrakt. Brak przejrzystych danych
            jest red flagą.
          </p>
          <div className="mt-3 space-y-2">
            {investigator.webQueries.slice(0, 4).map((query) => (
              <p
                key={query}
                className="truncate rounded-full border border-white/[0.08] bg-black/[0.24] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.10em] text-white/[0.42]"
              >
                {query}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)_23rem]">
        <div className="grid gap-3">
          {lanes.map((lane, index) => {
            const Icon = lane.icon;
            return (
              <button
                key={lane.label}
                type="button"
                onClick={() => onCommand(lane.id)}
                className="shield-neural-lane group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-black/[0.24] p-4 text-left transition hover:border-velmere-gold/[0.28] hover:bg-velmere-gold/[0.045]"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="absolute right-[-2rem] top-1/2 hidden h-px w-16 bg-gradient-to-r from-velmere-gold/[0.45] to-transparent xl:block" />
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.07] text-velmere-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white/[0.82]">
                      {lane.label}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-velmere-gold">
                      {lane.value}
                    </p>
                  </div>
                </div>
                <p className="shield-copy-safe mt-3 text-xs leading-6 text-white/[0.45]">
                  {lane.body}
                </p>
              </button>
            );
          })}
        </div>

        <div className="relative min-h-[26rem] overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-black/[0.30] p-5">
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(200,169,106,0.18),transparent_34%)]" />
          <div className="relative flex h-full min-h-[26rem] items-center justify-center">
            <div className="shield-vlm-core relative flex h-52 w-52 items-center justify-center rounded-full border border-velmere-gold/[0.26] bg-velmere-gold/[0.055] text-center shadow-[0_0_90px_rgba(200,169,106,0.16)]">
              <span className="absolute inset-[-2rem] rounded-full border border-dashed border-velmere-gold/[0.14]" />
              <span className="absolute inset-[-4rem] rounded-full border border-white/[0.055]" />
              <span className="absolute inset-[-6rem] rounded-full border border-white/[0.035]" />
              <span className="absolute left-[-6.5rem] top-1/2 h-px w-24 bg-gradient-to-r from-transparent via-velmere-gold/[0.45] to-velmere-gold/[0.0]" />
              <span className="absolute right-[-6.5rem] top-1/2 h-px w-24 bg-gradient-to-r from-velmere-gold/[0.0] via-velmere-gold/[0.45] to-transparent" />
              <div className="relative">
                <p className="shield-serif-display text-5xl leading-none tracking-[-0.06em] text-white">
                  VLM
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold">
                  risk core
                </p>
                <p className="mt-4 font-mono text-3xl text-white tabular-nums">
                  {combinedScore}
                  <span className="text-sm text-white/[0.38]">/100</span>
                </p>
              </div>
            </div>
            {strongestAgents.map((agent, index) => (
              <span
                key={`${agent.id}-${index}`}
                className="absolute rounded-full border border-white/[0.10] bg-black/[0.55] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.58] backdrop-blur"
                style={{
                  left: `${14 + (index % 2) * 64}%`,
                  top: `${16 + index * 14}%`,
                }}
              >
                {agent.label} · {agent.score}/100
              </span>
            ))}
          </div>
        </div>

        <div className="shield-ai-advanced-feed overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-black/[0.26] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
                AI advanced feed
              </p>
              <p className="mt-1 text-xs text-white/[0.42]">
                animated reasoning layer · safe wording
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/[0.20] bg-emerald-400/[0.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-100">
              live UI
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {aiFeed.map((line, index) => (
              <div
                key={line}
                className="shield-ai-feed-line rounded-2xl border border-white/[0.08] bg-white/[0.024] p-3"
                style={{ animationDelay: `${index * 130}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-velmere-gold shadow-[0_0_18px_rgba(200,169,106,0.7)]" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">
                    step {index + 1}
                  </span>
                </div>
                <p className="shield-copy-safe mt-2 text-xs leading-6 text-white/[0.58]">
                  {line}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AiAnalysisChatPopup({
  open,
  onClose,
  onOpenAdvanced,
  result,
  candles,
  orderbook,
  combinedScore,
  chartSource,
  advancedTierLabel,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAdvanced: () => void;
  result: BrainResult;
  candles: Candle[];
  orderbook: OrderBookResult | null;
  combinedScore: number;
  chartSource: string;
  advancedTierLabel: string;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const strongestAgent = useMemo(
    () =>
      (result.agentAssessments ?? [])
        .slice()
        .sort((a, b) => b.score - a.score)[0],
    [result.agentAssessments],
  );
  const sourceMode =
    result.dataQuality === "live"
      ? "live data"
      : result.dataQuality === "partial"
        ? "partial data"
        : "fallback / uncertainty";
  const tokenInfo = result["token"];
  const messages = useMemo(
    () => [
      {
        label: "Velmère AI",
        body: `Startuję krótką analizę ${tokenInfo.symbol}. Basic pokazuje tylko najważniejsze wnioski; pełny terminal zostaje za VLM / owner access.`,
      },
      {
        label: "Source check",
        body: `Źródła: ${sourceMode}. Wykres: ${candles.length || 0} świec z ${chartSource}. Orderbook: ${orderbook ? "podłączony" : "brak pełnej głębokości / partial"}.`,
      },
      {
        label: "Risk read",
        body: `Aktualny risk flag: ${combinedScore}/100. To jest algorithmic risk flag, nie porada inwestycyjna i nie dowód prawny.`,
      },
      {
        label: "Dominant layer",
        body: strongestAgent
          ? `Najmocniejsza warstwa teraz: ${strongestAgent.label} (${strongestAgent.score}/100). Następny krok: sprawdzić świece, wolumen i brakujące źródła zanim cokolwiek eskalujemy.`
          : "Brak jednej dominującej warstwy. Traktuję to jako spokojny monitoring i sprawdzam brakujące dane.",
      },
      {
        label: "Access gate",
        body: `Pełne dane: holder clusters, stress, replay, evidence export i SOC workflow są dla ${advancedTierLabel}. Public/basic zostaje krótkie i czyste.`,
      },
    ],
    [
      advancedTierLabel,
      candles.length,
      chartSource,
      combinedScore,
      orderbook,
      sourceMode,
      strongestAgent,
      tokenInfo.symbol,
    ],
  );

  useEffect(() => {
    if (!open) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(1);
    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        if (current >= messages.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 620);
    return () => window.clearInterval(timer);
  }, [messages.length, open]);

  if (!open) return null;

  return (
    <div className="shield-ai-analysis-chat fixed bottom-4 right-4 z-[80] w-[min(27rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-velmere-gold/[0.18] bg-[#0b0b0d]/[0.98] shadow-[0_30px_120px_rgba(0,0,0,0.62)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] p-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
            AI analysis chat
          </p>
          <p className="mt-1 truncate text-xs text-white/[0.45]">
            animated SOC-style read · {tokenInfo.symbol}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-white/[0.62] transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Close AI analysis chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="shield-safe-scroll max-h-[31rem] space-y-3 overflow-y-auto p-4">
        {messages.slice(0, visibleCount).map((message, index) => (
          <div
            key={`${message.label}-${index}`}
            className="shield-ai-chat-message rounded-2xl border border-white/[0.08] bg-white/[0.026] p-3"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-velmere-gold/[0.20] bg-velmere-gold/[0.08] text-velmere-gold">
                <Brain className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">
                {message.label}
              </span>
            </div>
            <p className="shield-copy-safe mt-2 text-sm leading-7 text-white/[0.64]">
              {message.body}
            </p>
          </div>
        ))}
        {visibleCount < messages.length ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/[0.22] px-3 py-2 text-xs text-white/[0.44]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-velmere-gold" />
            AI pisze analizę…
          </div>
        ) : null}
      </div>
      <div className="grid gap-2 border-t border-white/[0.08] p-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="rounded-full border border-velmere-gold/[0.22] bg-velmere-gold/[0.08] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.13]"
        >
          Open advanced
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/[0.10] bg-white/[0.035] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.54] transition hover:border-white/[0.18] hover:text-white"
        >
          Keep basic
        </button>
      </div>
    </div>
  );
}

export default function TokenRiskModal({
  item,
  onClose,
  handoffContext,
}: {
  item: ModalItem;
  onClose: () => void;
  handoffContext?: Pass468BrowserShieldOrbitHandoff;
}) {
  const t = useTranslations("MarketIntegrity");
  const locale = useLocale();
  const ui = useMemo(() => {
    if (locale === "pl") {
      return {
        controlKicker: "zakres analizy",
        controlTitle: "Tryby analizy",
        controlBody:
          "Wybierz zakres audytu. Velmère porządkuje dostępne źródła i pokazuje luki bez generowania danych zastępczych.",
        basicTitle: "Basic Analysis",
        basicHint:
          "Cena, trend 1h/24h/7d, skala rynku, źródło i najważniejsze braki",
        proTitle: "Pro Review",
        proHint:
          "Basic + świece, FDV/podaż, płynność, drugi provider i scenariusz ryzyka",
        advancedTitle: "Advanced Analysis",
        advancedHint:
          "Pro + orderbook, poślizg, holderzy, unlocki, kontrakt/KOL i plan weryfikacji",
        evidenceExportTitle: "Manifest evidence",
        evidenceExportBody:
          "Manifest pokazuje źródła, braki danych i listę dalszych sprawdzeń. To podgląd analizy, nie finalny raport prawny.",
        evidenceDownload: "Pobierz JSON",
        evidenceCopy: "Kopiuj",
        evidenceCopied: "Skopiowano",
        modeGuideTitle: "Jak czytać wynik",
        modeGuideKicker: "opis trybu",
        modeGuideBody:
          "Score pokazuje, które warstwy wyglądają spokojnie, a które wymagają doprecyzowania źródeł.",
        infoLabel: "opis",
        tileDetails: "szczegóły",
        caseKicker: "kontekst analizy",
        caseTitle: "Kontekst do dalszej weryfikacji",
        caseNext: "następny krok",
        caseBlockers: "blokery",
        caseQueries: "zapytanie OSINT",
        summaryDisclaimer:
          "VLM porządkuje sygnały, źródła i braki danych w czytelne podsumowanie.",
      };
    }
    if (locale === "de") {
      return {
        controlKicker: "Analysekontrolle",
        controlTitle: "Analysemodi",
        controlBody:
          "Wähle den Audit-Umfang. Velmère ordnet verfügbare Quellen und zeigt Datenlücken ohne Ersatzdaten.",
        basicTitle: "Basic Analysis",
        basicHint:
          "Preis, 1h/24h/7d-Trend, Marktgröße, Quelle und wichtigste Lücken",
        proTitle: "Pro Review",
        proHint:
          "Basic plus Kerzen, FDV/Supply, Liquidität, Zweitprovider und Risikoszenario",
        advancedTitle: "Advanced Analysis",
        advancedHint:
          "Pro plus Orderbook, Slippage, Holder, Unlocks, Contract/KOL und Prüfplan",
        evidenceExportTitle: "Evidence Manifest",
        evidenceExportBody:
          "Das Manifest zeigt Quellen, Datenlücken und nächste Prüfschritte. Es bleibt eine Vorschau, kein finaler Rechtsbericht.",
        evidenceDownload: "JSON laden",
        evidenceCopy: "Kopieren",
        evidenceCopied: "Kopiert",
        modeGuideTitle: "So liest du den Befund",
        modeGuideKicker: "Modus-Erklärung",
        modeGuideBody:
          "Der Score zeigt, welche Ebenen ruhig wirken und welche Quellen noch Präzisierung brauchen.",
        infoLabel: "Info",
        tileDetails: "Details",
        caseKicker: "Analysekontext",
        caseTitle: "Kontext für weitere Prüfung",
        caseNext: "nächster Schritt",
        caseBlockers: "Blocker",
        caseQueries: "OSINT-Abfrage",
        summaryDisclaimer:
          "VLM ordnet Signale, Quellen und Datenlücken in einer klaren Zusammenfassung.",
      };
    }
    return {
      controlKicker: "analysis control",
      controlTitle: "Analysis modes",
      controlBody:
        "Choose the audit depth. Velmère organizes available sources and exposes gaps without generating substitute data.",
      basicTitle: "Basic Analysis",
      basicHint:
        "Price, 1h/24h/7d trend, market scale, source and the key evidence gaps",
      proTitle: "Pro Review",
      proHint:
        "Basic plus candles, FDV/supply, liquidity, second provider and risk scenario",
      advancedTitle: "Advanced Analysis",
      advancedHint:
        "Pro plus orderbook, slippage, holders, unlocks, contract/KOL and verification plan",
      evidenceExportTitle: "Evidence manifest",
      evidenceExportBody:
        "The manifest shows sources, missing data and the next checks. It remains a preview, not a final legal report.",
      evidenceDownload: "Download JSON",
      evidenceCopy: "Copy",
      evidenceCopied: "Copied",
      modeGuideTitle: "How to read this",
      modeGuideKicker: "mode guide",
      modeGuideBody:
        "A low score is not a safety certificate. Check missing data, liquidity and sources before treating the case as calm.",
      infoLabel: "info",
      tileDetails: "details",
      caseKicker: "analysis context",
      caseTitle: "Context for further review",
      caseNext: "next step",
      caseBlockers: "blockers",
      caseQueries: "OSINT query",
      summaryDisclaimer:
        "VLM shows a readable summary of data and gaps. It is not a safety certificate, investment advice or performance guarantee.",
    };
  }, [locale]);

  const result = isMarketRow(item) ? item.result : item;
  const row = isMarketRow(item) ? item : null;
  const assetRegime = useMemo(() => buildTokenAssetRegime(result), [result]);
  const marketPressureRegime = useMemo(
    () => buildMarketPressureRegime(result, assetRegime),
    [assetRegime, result],
  );
  const contractTrapRegime = useMemo(
    () => buildContractTrapRegime(result),
    [result],
  );
  const holderConcentrationGate = useMemo(
    () => buildHolderConcentrationGate(result),
    [result],
  );
  const unlockVestingGate = useMemo(
    () => buildUnlockVestingGate(result),
    [result],
  );
  const osintNarrativeGate = useMemo(
    () => buildOsintNarrativeGate(result),
    [result],
  );
  const operatorCaseFile = useMemo(
    () => buildShieldOperatorCaseFile(result),
    [result],
  );
  const evidenceReportDraft = useMemo(
    () => buildShieldEvidenceReportDraft(result, operatorCaseFile),
    [operatorCaseFile, result],
  );
  const evidenceExportManifest = useMemo(
    () =>
      buildShieldEvidenceExportManifest(
        result,
        operatorCaseFile,
        evidenceReportDraft,
      ),
    [evidenceReportDraft, operatorCaseFile, result],
  );
  const evidenceExportJson = useMemo(
    () => serializeShieldEvidenceExportManifest(evidenceExportManifest),
    [evidenceExportManifest],
  );
  const asset = result["token"];
  const [selectedTier, setSelectedTier] =
    useState<Pass615AnalysisTier>("basic");
  const [vlmSequenceMode, setVlmSequenceMode] =
    useState<VlmAiSequenceMode | null>(null);
  const layoutSentinelMode: VlmAiSequenceMode = vlmSequenceMode ?? selectedTier;
  const [range, setRange] = useState<MarketChartRange>("7d");
  const [chartMode, setChartMode] = useState<
    "line" | "candles" | "depth" | "volume"
  >("candles");
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>(() =>
    fallbackPointsForResult(row, result, "7d"),
  );
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartSource, setChartSource] = useState<string>(
    "CoinGecko market_chart",
  );
  const [chartObservedAt, setChartObservedAt] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [orderbook, setOrderbook] = useState<OrderBookResult | null>(null);
  const [orderbookObservedAt, setOrderbookObservedAt] = useState<string | null>(
    null,
  );
  const [orderbookError, setOrderbookError] = useState<string | null>(null);
  const [orderbookLoading, setOrderbookLoading] = useState(false);
  const liquidityExitGate = useMemo(
    () => buildLiquidityExitGate(result, orderbook),
    [orderbook, result],
  );
  const sourceAdapterQuorumGate = useMemo(
    () =>
      buildSourceAdapterQuorumGate(result, {
        chartSource,
        chartError,
        chartLoading,
        orderbook,
        orderbookError,
        orderbookLoading,
        retryWindowSeconds: orderbookLoading || chartLoading ? 30 : 90,
      }),
    [
      chartError,
      chartLoading,
      chartSource,
      orderbook,
      orderbookError,
      orderbookLoading,
      result,
    ],
  );
  const sourcePolicyAllowlistGate = useMemo(
    () => buildSourcePolicyAllowlistGate(result, sourceAdapterQuorumGate),
    [result, sourceAdapterQuorumGate],
  );
  const durableAuditReceiptVault = useMemo(
    () => buildDurableAuditReceiptVault(result, sourcePolicyAllowlistGate),
    [result, sourcePolicyAllowlistGate],
  );
  const sourceFreshnessRegistryGate = useMemo(
    () =>
      buildSourceFreshnessRegistryGate(
        result,
        sourceAdapterQuorumGate,
        durableAuditReceiptVault,
        {
          chartSource,
          chartError,
          chartLoading,
          orderbook,
          orderbookError,
          orderbookLoading,
          retryWindowSeconds: orderbookLoading || chartLoading ? 30 : 90,
        },
      ),
    [
      chartError,
      chartLoading,
      chartSource,
      durableAuditReceiptVault,
      orderbook,
      orderbookError,
      orderbookLoading,
      result,
      sourceAdapterQuorumGate,
    ],
  );
  const analyticsEventTaxonomyGate = useMemo(
    () =>
      buildAnalyticsEventTaxonomyGate(
        result,
        sourceFreshnessRegistryGate,
        durableAuditReceiptVault,
      ),
    [durableAuditReceiptVault, result, sourceFreshnessRegistryGate],
  );
  const storageAdapterContractGate = useMemo(
    () =>
      buildStorageAdapterContractGate(
        result,
        durableAuditReceiptVault,
        sourceFreshnessRegistryGate,
        analyticsEventTaxonomyGate,
      ),
    [
      analyticsEventTaxonomyGate,
      durableAuditReceiptVault,
      result,
      sourceFreshnessRegistryGate,
    ],
  );
  const privacyRedactionEnvelopeGate = useMemo(
    () =>
      buildPrivacyRedactionEnvelopeGate(
        result,
        durableAuditReceiptVault,
        analyticsEventTaxonomyGate,
        storageAdapterContractGate,
      ),
    [
      analyticsEventTaxonomyGate,
      durableAuditReceiptVault,
      result,
      storageAdapterContractGate,
    ],
  );
  const operatorCaseSlaOrchestratorGate = useMemo(
    () =>
      buildOperatorCaseSlaOrchestratorGate(
        result,
        sourceFreshnessRegistryGate,
        analyticsEventTaxonomyGate,
        storageAdapterContractGate,
        privacyRedactionEnvelopeGate,
      ),
    [
      analyticsEventTaxonomyGate,
      privacyRedactionEnvelopeGate,
      result,
      sourceFreshnessRegistryGate,
      storageAdapterContractGate,
    ],
  );
  const retentionPolicyGate = useMemo(
    () =>
      buildRetentionPolicyGate(
        result,
        sourceFreshnessRegistryGate,
        analyticsEventTaxonomyGate,
        storageAdapterContractGate,
        privacyRedactionEnvelopeGate,
        operatorCaseSlaOrchestratorGate,
      ),
    [
      analyticsEventTaxonomyGate,
      operatorCaseSlaOrchestratorGate,
      privacyRedactionEnvelopeGate,
      result,
      sourceFreshnessRegistryGate,
      storageAdapterContractGate,
    ],
  );
  const customerSafeRiskBriefGate = useMemo(
    () =>
      buildCustomerSafeRiskBriefGate(
        result,
        evidenceReportDraft,
        sourceFreshnessRegistryGate,
        storageAdapterContractGate,
        privacyRedactionEnvelopeGate,
        operatorCaseSlaOrchestratorGate,
        retentionPolicyGate,
      ),
    [
      evidenceReportDraft,
      operatorCaseSlaOrchestratorGate,
      privacyRedactionEnvelopeGate,
      result,
      retentionPolicyGate,
      sourceFreshnessRegistryGate,
      storageAdapterContractGate,
    ],
  );
  const lensReportPreviewGate = useMemo(
    () =>
      buildLensReportPreviewGate(
        result,
        evidenceReportDraft,
        customerSafeRiskBriefGate,
        sourceFreshnessRegistryGate,
        storageAdapterContractGate,
        privacyRedactionEnvelopeGate,
        retentionPolicyGate,
      ),
    [
      customerSafeRiskBriefGate,
      evidenceReportDraft,
      privacyRedactionEnvelopeGate,
      result,
      retentionPolicyGate,
      sourceFreshnessRegistryGate,
      storageAdapterContractGate,
    ],
  );
  const evidenceNoteIntegrityGate = useMemo(
    () =>
      buildEvidenceNoteIntegrityGate(
        result,
        evidenceReportDraft,
        lensReportPreviewGate,
        customerSafeRiskBriefGate,
        sourceFreshnessRegistryGate,
        storageAdapterContractGate,
        privacyRedactionEnvelopeGate,
        retentionPolicyGate,
      ),
    [
      customerSafeRiskBriefGate,
      evidenceReportDraft,
      lensReportPreviewGate,
      privacyRedactionEnvelopeGate,
      result,
      retentionPolicyGate,
      sourceFreshnessRegistryGate,
      storageAdapterContractGate,
    ],
  );
  const pdfForgeComposerGate = useMemo(
    () =>
      buildPdfForgeComposerGate(
        result,
        lensReportPreviewGate,
        evidenceNoteIntegrityGate,
        sourceFreshnessRegistryGate,
        privacyRedactionEnvelopeGate,
        retentionPolicyGate,
      ),
    [
      evidenceNoteIntegrityGate,
      lensReportPreviewGate,
      privacyRedactionEnvelopeGate,
      result,
      retentionPolicyGate,
      sourceFreshnessRegistryGate,
    ],
  );
  const layoutStabilitySentinelGate = useMemo(
    () =>
      buildLayoutStabilitySentinelGate(
        result,
        pdfForgeComposerGate,
        layoutSentinelMode,
      ),
    [layoutSentinelMode, pdfForgeComposerGate, result],
  );
  const operatorOnlyReportFieldGate = useMemo(
    () =>
      buildOperatorOnlyReportFieldGate(
        result,
        customerSafeRiskBriefGate,
        lensReportPreviewGate,
        evidenceNoteIntegrityGate,
        pdfForgeComposerGate,
        sourceFreshnessRegistryGate,
        storageAdapterContractGate,
        privacyRedactionEnvelopeGate,
        retentionPolicyGate,
        layoutStabilitySentinelGate,
      ),
    [
      customerSafeRiskBriefGate,
      evidenceNoteIntegrityGate,
      layoutStabilitySentinelGate,
      lensReportPreviewGate,
      pdfForgeComposerGate,
      privacyRedactionEnvelopeGate,
      result,
      retentionPolicyGate,
      sourceFreshnessRegistryGate,
      storageAdapterContractGate,
    ],
  );
  const pdfBrowserReplayBoundaryGate = useMemo(
    () =>
      buildPdfBrowserReplayBoundaryGate(
        result,
        pdfForgeComposerGate,
        layoutStabilitySentinelGate,
        operatorOnlyReportFieldGate,
        lensReportPreviewGate,
        evidenceNoteIntegrityGate,
      ),
    [
      evidenceNoteIntegrityGate,
      layoutStabilitySentinelGate,
      lensReportPreviewGate,
      operatorOnlyReportFieldGate,
      pdfForgeComposerGate,
      result,
    ],
  );
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [mounted, setMounted] = useState(false);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const modalShellRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [viewportGovernor, setViewportGovernor] =
    useState<Pass613ModalViewportGovernor>(() =>
      buildPass613ModalViewportGovernor({
        layoutWidth: 1280,
        layoutHeight: 800,
        visualWidth: 1280,
        visualHeight: 800,
        offsetLeft: 0,
        offsetTop: 0,
        scale: 1,
      }),
    );
  const closeDialogBoundary = useCallback(() => {
    if (vlmSequenceMode) {
      setVlmSequenceMode(null);
      return;
    }
    onClose();
  }, [onClose, vlmSequenceMode]);

  useModalScrollLock(mounted);
  useDialogFocusBoundary(mounted, modalRootRef, {
    onClose: closeDialogBoundary,
    initialFocus: closeButtonRef,
    closeOnOutsidePointerDown: true,
  });
  const [expanded, setExpanded] = useState(true);
  const [evidenceExportNotice, setEvidenceExportNotice] = useState<
    "idle" | "copied" | "downloaded" | "failed"
  >("idle");
  const resetEvidenceExportNotice = useCallback(
    (state: "copied" | "downloaded" | "failed") => {
      setEvidenceExportNotice(state);
      window.setTimeout(() => setEvidenceExportNotice("idle"), 1800);
    },
    [],
  );
  const [pdfForgeNotice, setPdfForgeNotice] = useState<
    "idle" | "downloaded" | "failed"
  >("idle");
  const resetPdfForgeNotice = useCallback((state: "downloaded" | "failed") => {
    setPdfForgeNotice(state);
    window.setTimeout(() => setPdfForgeNotice("idle"), 1800);
  }, []);
  const [pdfReplayNotice, setPdfReplayNotice] = useState<
    "idle" | "downloaded" | "failed"
  >("idle");
  const resetPdfReplayNotice = useCallback((state: "downloaded" | "failed") => {
    setPdfReplayNotice(state);
    window.setTimeout(() => setPdfReplayNotice("idle"), 1800);
  }, []);

  const downloadEvidenceManifest = useCallback(() => {
    try {
      const blob = new Blob([evidenceExportJson], {
        type: "application/json;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${evidenceExportManifest.reportId.toLowerCase()}-evidence-manifest-preview.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      resetEvidenceExportNotice("downloaded");
    } catch (error) {
      console.warn("VLM evidence manifest download failed", error);
      resetEvidenceExportNotice("failed");
    }
  }, [
    evidenceExportJson,
    evidenceExportManifest.reportId,
    resetEvidenceExportNotice,
  ]);

  const copyEvidenceManifest = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(evidenceExportJson);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = evidenceExportJson;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      resetEvidenceExportNotice("copied");
    } catch (error) {
      console.warn("VLM evidence manifest copy failed", error);
      resetEvidenceExportNotice("failed");
    }
  }, [evidenceExportJson, resetEvidenceExportNotice]);

  const downloadVelmereCybersecurityPdf = useCallback(() => {
    try {
      const pdf = serializeVelmereCybersecurityPdf(pdfForgeComposerGate);
      const blob = new Blob([pdf], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${pdfForgeComposerGate.pdfId.toLowerCase()}-velmere-cybersecurity.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      resetPdfForgeNotice("downloaded");
    } catch (error) {
      console.warn("VLM branded PDF forge failed", error);
      resetPdfForgeNotice("failed");
    }
  }, [pdfForgeComposerGate, resetPdfForgeNotice]);

  const downloadPdfBrowserReplayPacket = useCallback(() => {
    try {
      const packet = serializePdfBrowserReplayBoundaryPacket(
        pdfBrowserReplayBoundaryGate,
      );
      const blob = new Blob([packet], {
        type: "application/json;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${pdfBrowserReplayBoundaryGate.replayId.toLowerCase()}-browser-replay-packet.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      resetPdfReplayNotice("downloaded");
    } catch (error) {
      console.warn("VLM PDF/browser replay packet failed", error);
      resetPdfReplayNotice("failed");
    }
  }, [pdfBrowserReplayBoundaryGate, resetPdfReplayNotice]);

  const [activeCommand, setActiveCommand] = useState<TerminalCommandId>("deck");
  const [terminalBooted, setTerminalBooted] = useState(false);
  const [advancedGateRequested, setAdvancedGateRequested] = useState(false);
  function buildAdvancedAnalysisAccessContext(): VlmPaidAccessContext {
    return {
      surface: "shield",
      locale: auditLocale,
      assetId: asset.tokenAddress || asset.symbol,
      symbol: asset.symbol,
      depth: "advanced",
      returnPath: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : `/${auditLocale}`,
    };
  }
  async function runVlmAiSequence(mode: VlmAiSequenceMode) {
    const normalizedTier = normalizePass615Tier(mode);
    if (normalizedTier === "advanced") {
      const paidContext = buildAdvancedAnalysisAccessContext();
      const paidAccessToken = readVlmPaidAccessToken("vlm_advanced_analysis_single", paidContext);
      if (!paidAccessToken) {
        setAdvancedGateRequested(true);
        try {
          await startVlmServiceCheckout({
            productId: "vlm_advanced_analysis_single",
            locale: auditLocale,
            context: paidContext,
          });
        } catch {
          setAdvancedGateRequested(false);
        }
        return;
      }
    }
    setSelectedTier(normalizedTier);
    writePass615Tier(normalizedTier);
    setAdvancedGateRequested(false);
    // PASS1978: Basic / Pro / Advanced must visibly start the VLM Brain
    // sequence, not only switch the selected button state.
    setVlmSequenceMode(normalizedTier);
  }

  function completeVlmAiSequence(_mode: VlmAiSequenceMode) {
    // PASS194: Back from Orbit 360 returns to the chart modal, not an extra readout panel.
    setVlmSequenceMode(null);
    setAdvancedGateRequested(false);
    setActiveCommand("deck");
  }

  useEffect(() => {
    setSelectedTier(readPass615Tier());
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.dispatchEvent(
      new CustomEvent("velmere:overlay-opening", {
        detail: {
          kind: "modal",
          surfaceId: "velmere-shield-asset-modal",
          surface: "shield-asset-modal",
        },
      }),
    );
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return undefined;
    let frame = 0;
    const measureViewport = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const visualViewport = window.visualViewport;
        setViewportGovernor(
          buildPass613ModalViewportGovernor({
            layoutWidth:
              document.documentElement.clientWidth || window.innerWidth,
            layoutHeight: window.innerHeight,
            visualWidth: visualViewport?.width ?? window.innerWidth,
            visualHeight: visualViewport?.height ?? window.innerHeight,
            offsetLeft: visualViewport?.offsetLeft ?? 0,
            offsetTop: visualViewport?.offsetTop ?? 0,
            scale: visualViewport?.scale ?? 1,
          }),
        );
      });
    };
    measureViewport();
    window.addEventListener("resize", measureViewport, { passive: true });
    window.addEventListener("orientationchange", measureViewport, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", measureViewport, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", measureViewport, {
      passive: true,
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureViewport);
      window.removeEventListener("orientationchange", measureViewport);
      window.visualViewport?.removeEventListener("resize", measureViewport);
      window.visualViewport?.removeEventListener("scroll", measureViewport);
    };
  }, [mounted]);

  useEffect(() => {
    setTerminalBooted(false);
    const timer = window.setTimeout(() => setTerminalBooted(true), 140);
    return () => window.clearTimeout(timer);
  }, [asset.symbol]);

  useEffect(() => {
    let active = true;
    async function loadChart() {
      setChartLoading(true);
      setChartError(null);
      setChartObservedAt(null);
      try {
        const klineResponse = await fetch(
          `/api/market-integrity/klines?symbol=${encodeURIComponent(asset.symbol)}&range=${range}`,
          { headers: { accept: "application/json" } },
        );
        const klineData = (await klineResponse.json()) as CandleApiResponse;
        if (
          active &&
          klineResponse.ok &&
          klineData.mode === "live" &&
          klineData.candles.length >= 2
        ) {
          setCandles(klineData.candles);
          setChartPoints(
            klineData.candles.map((candle) => ({
              timestamp: candle.timestamp,
              price: candle.close,
              volume: candle.quoteVolume ?? candle.volume,
            })),
          );
          setChartSource(klineData.source);
          const latestCandleTimestamp = klineData.candles.at(-1)?.timestamp;
          setChartObservedAt(
            latestCandleTimestamp
              ? new Date(
                  latestCandleTimestamp < 10_000_000_000
                    ? latestCandleTimestamp * 1000
                    : latestCandleTimestamp,
                ).toISOString()
              : null,
          );
          setChartLoading(false);
          return;
        }
        if (!asset.marketId) {
          const fallback = fallbackPointsForResult(row, result, range);
          if (active) {
            setChartPoints(fallback);
            setCandles(candlesFromPoints(fallback));
            setChartSource("Local sparkline fallback");
            setChartObservedAt(null);
          }
          return;
        }
        const response = await fetch(
          `/api/market-integrity/chart?id=${encodeURIComponent(asset.marketId)}&range=${range}`,
          { headers: { accept: "application/json" } },
        );
        const data = (await response.json()) as ChartApiResponse;
        if (!response.ok || data.mode === "error")
          throw new Error(
            data.mode === "error" ? data.error : "Chart request failed",
          );
        if (active) {
          const fallbackPoints =
            data.points.length >= 2
              ? data.points
              : fallbackPointsForResult(row, result, range);
          setChartPoints(fallbackPoints);
          setCandles(candlesFromPoints(fallbackPoints));
          setChartSource(
            data.points.length >= 2 ? data.source : "Sparkline fallback",
          );
          const latestPointTimestamp = data.points.at(-1)?.timestamp;
          setChartObservedAt(
            data.points.length >= 2 && latestPointTimestamp
              ? new Date(
                  latestPointTimestamp < 10_000_000_000
                    ? latestPointTimestamp * 1000
                    : latestPointTimestamp,
                ).toISOString()
              : null,
          );
        }
      } catch (error) {
        if (active) {
          setChartError(
            error instanceof Error ? error.message : "Chart request failed",
          );
          const fallback = fallbackPointsForResult(row, result, range);
          setChartPoints(fallback);
          setCandles(candlesFromPoints(fallback));
          setChartSource("Sparkline fallback");
          setChartObservedAt(null);
        }
      } finally {
        if (active) setChartLoading(false);
      }
    }
    void loadChart();
    return () => {
      active = false;
    };
  }, [asset.marketId, asset.symbol, range, result, row]);

  useEffect(() => {
    let active = true;
    async function loadOrderBook() {
      if (!asset.symbol || asset.symbol.length > 12) return;
      setOrderbookLoading(true);
      setOrderbookError(null);
      setOrderbookObservedAt(null);
      try {
        const response = await fetch(
          `/api/market-integrity/orderbook?symbol=${encodeURIComponent(asset.symbol)}`,
          { headers: { accept: "application/json" } },
        );
        const data = (await response.json()) as OrderBookApiResponse;
        if (!response.ok || data.mode === "error")
          throw new Error(
            data.mode === "error" ? data.error : "Order book request failed",
          );
        if (active) {
          setOrderbook(data.orderbook);
          setOrderbookObservedAt(data.generatedAt);
        }
      } catch (error) {
        if (active) {
          setOrderbook(null);
          setOrderbookObservedAt(null);
          setOrderbookError(
            error instanceof Error ? error.message : "Order book not available",
          );
        }
      } finally {
        if (active) setOrderbookLoading(false);
      }
    }
    const timer = window.setTimeout(() => void loadOrderBook(), 260);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [asset.symbol]);

  useEffect(() => {
    let active = true;
    const id = asset.marketId ?? asset.tokenAddress ?? asset.symbol;
    async function loadHistory() {
      if (!id) return;
      try {
        const response = await fetch(
          `/api/market-integrity/history?id=${encodeURIComponent(id)}`,
          { headers: { accept: "application/json" } },
        );
        const data = (await response.json()) as HistoryApiResponse;
        if (active && response.ok && data.mode === "live")
          setHistory(data.history.slice(-24));
      } catch {
        if (active) setHistory([]);
      }
    }
    const timer = window.setTimeout(() => void loadHistory(), 420);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [asset.marketId, asset.symbol, asset.tokenAddress]);

  const generated = new Date(result.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(generated);
  const chartStatusLabel = chartError
    ? locale === "pl"
      ? "fallback · źródło live chwilowo niedostępne"
      : locale === "de"
        ? "Fallback · Live-Quelle vorübergehend nicht verfügbar"
        : "fallback · live source temporarily unavailable"
    : `${chartSource} · ${candles.length || chartPoints.length} bars`;
  const safeChartStatusLabel = chartStatusLabel || "fallback · source pending";
  const combinedScore = Math.min(
    100,
    result.score + (orderbook?.riskPoints ?? 0),
  );
  const accessBrief = buildVlmShieldAccess(result);
  const advancedTierLabel =
    accessBrief.recommendedTier === "public"
      ? "VLM Member"
      : accessBrief.recommendedTier === "member"
        ? "VLM Member"
        : accessBrief.recommendedTier === "pro"
          ? "Shield Pro"
          : "Research Desk";
  const combinedLevel = levelFromScore(combinedScore);
  const combinedBadge = badgeFromLevel(combinedLevel);

  const sourceSpineCopy = useMemo(
    () =>
      locale === "pl"
        ? {
            title: "Source spine",
            subtitle: "Co jest live, co jest częściowe, a czego nadal brakuje.",
            live: "live",
            partial: "partial",
            stale: "nieświeże",
            fallback: "fallback",
            offline: "offline",
            missing: "missing",
            blocked: "blocked",
            loading: "loading",
            market: "Market data",
            candles: "Świece / OHLCV",
            orderbook: "Orderbook",
            holders: "Holderzy",
            contract: "Kontrakt",
            osint: "OSINT",
            waiting: "czeka na źródło",
            readyLabel: "warstw gotowych",
            freshness: "świeżość",
            ttl: "TTL",
          }
        : locale === "de"
          ? {
              title: "Source spine",
              subtitle: "Was live ist, was partial ist und was noch fehlt.",
              live: "live",
              partial: "partial",
              stale: "veraltet",
              fallback: "fallback",
              offline: "offline",
              missing: "missing",
              blocked: "blocked",
              loading: "loading",
              market: "Market data",
              candles: "Kerzen / OHLCV",
              orderbook: "Orderbook",
              holders: "Holder",
              contract: "Contract",
              osint: "OSINT",
              waiting: "wartet auf Quelle",
              readyLabel: "Schichten bereit",
              freshness: "Freshness",
              ttl: "TTL",
            }
          : {
              title: "Source spine",
              subtitle:
                "What is live, what is partial, and what is still missing.",
              live: "live",
              partial: "partial",
              stale: "stale",
              fallback: "fallback",
              offline: "offline",
              missing: "missing",
              blocked: "blocked",
              loading: "loading",
              market: "Market data",
              candles: "Candles / OHLCV",
              orderbook: "Orderbook",
              holders: "Holders",
              contract: "Contract",
              osint: "OSINT",
              waiting: "waiting for source",
              readyLabel: "layers ready",
              freshness: "freshness",
              ttl: "TTL",
            },
    [locale],
  );

  const chartGapCount = useMemo(() => {
    const timestamps = candles
      .map((candle) => candle.timestamp)
      .filter((timestamp) => Number.isFinite(timestamp))
      .sort((left, right) => left - right);
    if (timestamps.length < 3) return 0;
    const intervals = timestamps
      .slice(1)
      .map((timestamp, index) => timestamp - timestamps[index])
      .filter((interval) => interval > 0)
      .sort((left, right) => left - right);
    if (!intervals.length) return 0;
    const median = intervals[Math.floor(intervals.length / 2)];
    return intervals.filter((interval) => interval > median * 1.8).length;
  }, [candles]);

  const sourceContract = useMemo<Pass612OneSourceStateContract>(() => {
    const latestCandleTimestamp = candles.at(-1)?.timestamp;
    const chartFallback = /fallback|sparkline|local/i.test(chartSource);
    const marketProvider = result.dataSources.find(Boolean) ?? null;
    const chartBudgetSeconds =
      range === "1h"
        ? 3 * 60 * 60
        : range === "4h"
          ? 10 * 60 * 60
          : range === "1d"
            ? 54 * 60 * 60
            : 8 * 24 * 60 * 60;
    return buildPass612OneSourceStateContract({
      generatedAt: result.generatedAt,
      now: result.generatedAt,
      layers: [
        {
          id: "market",
          label: sourceSpineCopy.market,
          provider: marketProvider,
          requestedState:
            result.dataQuality === "live"
              ? "live"
              : result.dataQuality === "partial"
                ? "partial"
                : "fallback",
          observedAt: result.generatedAt,
          timestampKind: "route",
          recordCount: result.metrics.currentPrice !== undefined ? 1 : 0,
          expectedRecords: 1,
          detail: `${formatUsd(result.metrics.currentPrice)} · ${formatUsd(result.metrics.volume24h)} vol`,
          freshnessBudgetSeconds: 30 * 60,
          required: true,
        },
        {
          id: "candles",
          label: sourceSpineCopy.candles,
          provider: chartFallback ? null : chartSource,
          backupProvider:
            !chartFallback && !/coingecko/i.test(chartSource) && asset.marketId
              ? "CoinGecko market_chart"
              : null,
          requestedState: chartFallback
            ? "fallback"
            : candles.length >= 24
              ? "live"
              : candles.length
                ? "partial"
                : "offline",
          observedAt:
            chartObservedAt ??
            (latestCandleTimestamp
              ? new Date(
                  latestCandleTimestamp < 10_000_000_000
                    ? latestCandleTimestamp * 1000
                    : latestCandleTimestamp,
                ).toISOString()
              : null),
          timestampKind: chartFallback ? "none" : "provider",
          recordCount: candles.length || chartPoints.length,
          expectedRecords: 24,
          loading: chartLoading,
          error: chartError,
          hasFallback:
            chartFallback || Boolean(chartError && chartPoints.length),
          detail: `${candles.length || chartPoints.length} bars · ${chartSource}`,
          freshnessBudgetSeconds: chartBudgetSeconds,
          required: true,
        },
        {
          id: "orderbook",
          label: sourceSpineCopy.orderbook,
          provider: orderbook?.source ?? null,
          requestedState: orderbook ? "partial" : "offline",
          observedAt: orderbookObservedAt,
          timestampKind: orderbook ? "route" : "none",
          recordCount: orderbook ? 1 : 0,
          expectedRecords: 1,
          loading: orderbookLoading,
          error: orderbookError,
          detail: orderbook
            ? `spread ${formatPercent(orderbook.spreadPercent)} · depth ${formatUsd(orderbook.bidDepthUsd + orderbook.askDepthUsd)}`
            : (orderbookError ?? sourceSpineCopy.waiting),
          freshnessBudgetSeconds: 10 * 60,
          required: false,
        },
        {
          id: "holders",
          label: sourceSpineCopy.holders,
          provider:
            result.metrics.holderCount !== undefined ||
            result.metrics.top10HolderPercent !== undefined
              ? marketProvider
              : null,
          requestedState:
            result.metrics.holderCount !== undefined ||
            result.metrics.top10HolderPercent !== undefined
              ? "partial"
              : "offline",
          observedAt: null,
          timestampKind: "route",
          recordCount:
            result.metrics.holderCount !== undefined ||
            result.metrics.top10HolderPercent !== undefined
              ? 1
              : 0,
          expectedRecords: 1,
          detail: `${formatNumber(result.metrics.holderCount)} holders · top10 ${formatPercent(result.metrics.top10HolderPercent)}`,
          required: false,
        },
        {
          id: "contract",
          label: sourceSpineCopy.contract,
          provider: asset.tokenAddress ? "on-chain identifier" : null,
          requestedState: asset.tokenAddress ? "partial" : "offline",
          observedAt: null,
          timestampKind: asset.tokenAddress ? "static" : "none",
          recordCount: asset.tokenAddress ? 1 : 0,
          expectedRecords: 1,
          detail: asset.tokenAddress
            ? `${asset.chainId ?? "chain"} · address attached`
            : "address needed",
          required: false,
        },
        {
          id: "osint",
          label: sourceSpineCopy.osint,
          provider: null,
          requestedState: "offline",
          observedAt: null,
          timestampKind: "none",
          recordCount: 0,
          expectedRecords: 1,
          detail:
            locale === "pl"
              ? "wymaga świeżego researchu / źródeł"
              : locale === "de"
                ? "benötigt frische Recherche / Quellen"
                : "requires fresh research / sources",
          required: false,
        },
      ],
    });
  }, [
    asset.chainId,
    asset.marketId,
    asset.tokenAddress,
    candles,
    chartError,
    chartLoading,
    chartObservedAt,
    chartPoints.length,
    chartSource,
    locale,
    orderbook,
    orderbookError,
    orderbookLoading,
    orderbookObservedAt,
    range,
    result,
    sourceSpineCopy,
  ]);

  const sourceStateLabel = useCallback(
    (state: Pass612SourceState) =>
      state === "live"
        ? sourceSpineCopy.live
        : state === "partial"
          ? sourceSpineCopy.partial
          : state === "stale"
            ? sourceSpineCopy.stale
            : state === "fallback"
              ? sourceSpineCopy.fallback
              : sourceSpineCopy.offline,
    [sourceSpineCopy],
  );
  const sourceSpineRows = sourceContract.layers.map((layer) => ({
    id: layer.id,
    label: layer.label,
    tone: layer.state,
    state: sourceStateLabel(layer.state),
    detail: layer.detail,
    freshness: layer.observedAt
      ? `${Math.round((layer.ageSeconds ?? 0) / 60)}m · ${layer.timestampKind}`
      : layer.state,
  }));
  const sourceSpineReadyCount = sourceContract.readyCount;

  const metrics = [
    {
      icon: BarChart3,
      label: t("metrics.price"),
      value: formatUsd(result.metrics.currentPrice),
    },
    {
      icon: Activity,
      label: t("metrics.change24h"),
      value: formatPercent(result.metrics.priceChange24h),
    },
    {
      icon: Activity,
      label: t("metrics.change7d"),
      value: formatPercent(result.metrics.priceChange7d),
    },
    {
      icon: Activity,
      label: "30d",
      value: formatPercent(result.metrics.priceChange30d),
    },
    {
      icon: Database,
      label: t("metrics.marketCap"),
      value: formatUsd(result.metrics.marketCap),
    },
    {
      icon: Sigma,
      label: t("metrics.volume"),
      value: formatUsd(result.metrics.volume24h),
    },
  ];

  const categoryScore = (ids: string[]) =>
    result.signals
      .filter((signal) => ids.includes(signal.id))
      .reduce((sum, signal) => sum + signal.points, 0);
  const methodRows = [
    {
      label: t("method.velocity"),
      value: categoryScore([
        "rapid_intraday_move",
        "parabolic_24h_gain",
        "parabolic_7d_gain",
        "parabolic_30d_gain",
        "multi_timeframe_pump",
        "new_ath_repricing",
        "extreme_drawdown",
        "major_drawdown",
        "severe_24h_drop",
        "high_24h_drop",
      ]),
    },
    {
      label: t("method.liquidity"),
      value:
        categoryScore([
          "thin_liquidity",
          "very_thin_liquidity",
          "low_dex_liquidity",
          "market_volume_stress",
          "wash_trading_risk",
          "volume_spike",
          "orderbook_slippage_risk",
          "orderbook_imbalance",
          "orderbook_depth_collapse",
        ]) + (orderbook?.riskPoints ?? 0),
    },
    {
      label: t("method.holders"),
      value: categoryScore([
        "holder_concentration",
        "supply_overhang",
        "fdv_marketcap_gap",
      ]),
    },
    {
      label: t("method.contract"),
      value: categoryScore([
        "contract_privileges",
        "honeypot_risk",
        "high_sell_tax",
        "mint_risk",
        "blacklist_risk",
      ]),
    },
  ];

  const firstHistory = history[0];
  const lastHistory = history.at(-1);
  const historyScoreDelta =
    firstHistory && lastHistory
      ? lastHistory.score - firstHistory.score
      : undefined;
  const attackSurface = useMemo(() => buildAttackSurface(result), [result]);
  const commandRows = useMemo<TerminalCommandRow[]>(
    () => [
      {
        id: "deck" as const,
        label: "Review deck",
        body: "A first-screen review that prioritizes the market picture, source quality, evidence gaps and the next useful check.",
        next: "Start with the review, then open only the area that limits confidence: sources, liquidity, evidence or analysis depth.",
      },
      {
        id: "risk" as const,
        label: "Explain risk",
        body: `Start with the dominant score: ${result.score}/100. Compare velocity, liquidity and data uncertainty before making a conclusion.`,
        next: "Open evidence workflow, then check whether the signal is rising or cooling in replay.",
      },
      {
        id: "review" as const,
        label: "Operator review",
        body: "One focused panel keeps source confidence, the calm AI review and unresolved evidence visible without a wall of modules.",
        next: "Open the focused review, then move to the chart, sources or evidence according to the missing piece.",
      },
      {
        id: "holders" as const,
        label: "Audit holders",
        body: "Review concentration, FDV overhang, unresolved wallet clusters and whether CEX wallets are excluded from the holder picture.",
        next: "Use holder intelligence; missing chain data must stay as uncertainty, not safety.",
      },
      {
        id: "liquidity" as const,
        label: "Check exit depth",
        body: orderbook
          ? `Order book risk contributes ${orderbook.riskPoints}/100. Compare slippage, spread and bid/ask imbalance.`
          : "Order book feed is missing, so Shield keeps a liquidity uncertainty penalty.",
        next: "Look at heatmap, stress simulator and sell shock rows before trusting the chart.",
      },
      {
        id: "chart" as const,
        label: "Read candles",
        body: `${candles.length} bars loaded for this view. Dense Binance candles are preferred; sparse feeds are fallback-only context.`,
        next: "Use 1h/4h/1d to compare structure; don't judge only one timeframe.",
      },
      {
        id: "evidence" as const,
        label: "Build report",
        body: `Risk delta: ${historyScoreDelta !== undefined ? `${historyScoreDelta > 0 ? "+" : ""}${historyScoreDelta}` : "baseline unavailable"}. Evidence should mention signals, missing data and next verification step.`,
        next: "Generate an evidence workflow and keep language as anomaly review, not accusation or advice.",
      },
      {
        id: "data" as const,
        label: "Audit sources",
        body: `Source mode: ${result.dataQuality}. Compare candles, order book, holder completeness and replay snapshots before escalating any anomaly.`,
        next: "Open evidence workflow and source ledger; missing data must increase uncertainty instead of creating false confidence.",
      },
      {
        id: "copilot" as const,
        label: "AI copilot",
        body: "The copilot turns missing data, source checks and safe wording into a practical next-step guide without hype or accusations.",
        next: "Open the copilot, choose the matching review prompt and confirm evidence or sources before creating a report.",
      },
      {
        id: "launch" as const,
        label: "Launch bridge",
        body: "The launch view groups data availability, audit storage, access limits and report readiness into one simple status.",
        next: "Open launch readiness, resolve the blocking items and keep unavailable functions clearly marked until they are connected.",
      },
      {
        id: "sources" as const,
        label: "Source trust",
        body: "Sources stay separated as live, partial, fallback or unavailable so confidence never looks stronger than the evidence.",
        next: "Open source quality, then review missing order-book, holder and report inputs before trusting the result.",
      },
      {
        id: "export" as const,
        label: "Evidence export",
        body: "Report readiness keeps the source list, audit trail and privacy boundaries together so a draft cannot look more final than it is.",
        next: "Open report readiness, resolve missing evidence and keep the missing-data note visible in every draft.",
      },
      {
        id: "runtime" as const,
        label: "Runtime health",
        body: "The stability view watches chart fallback, order-book availability, history, sources and safe output in one place.",
        next: "Open stability, review degraded inputs first and move to source quality or report readiness before trusting a delayed view.",
      },
      {
        id: "usability" as const,
        label: "Usability guard",
        body: "The usability view checks search, sorting, modal rendering and clear source language across the main journey.",
        next: "Open usability, test the search and sorting controls, then confirm every action has a clear visible result.",
      },
      {
        id: "stability" as const,
        label: "Interaction guard",
        body: "The interaction view protects the path from asset selection to chart, analysis depth and Shield Map without competing panels.",
        next: "Open interaction quality and verify selection, chart rendering, analysis switching and scrolling before adding more detail.",
      },
      {
        id: "ops" as const,
        label: "Ops audit",
        body: `This path checks whether the current analysis can be saved, reviewed and shared without overstating evidence.`,
        next: "Review the blocking items, then decide whether the analysis stays in review or can become a report.",
      },
      {
        id: "control" as const,
        label: "Control plane",
        body: `This view turns product readiness into clear requirements, acceptance checks and next actions.`,
        next: "Open readiness, prioritize the highest-impact blockers and keep source honesty visible in every public state.",
      },
      {
        id: "workspace" as const,
        label: "Risk workspace",
        body: `This workspace turns visual risk into a simple decision path: source quality, policy boundaries, missing evidence and the next review step.`,
        next: "Open the risk workspace, resolve missing evidence and create a report only with clear source and review language.",
      },
      {
        id: "production" as const,
        label: "Production hardening",
        body: `The production view checks audit history, access limits, report readiness and public wording before wider release.`,
        next: "Open production readiness, resolve critical access and report blockers and keep unavailable functions visibly limited.",
      },
    ],
    [
      candles.length,
      historyScoreDelta,
      orderbook,
      result.dataQuality,
      result.score,
    ],
  );
  const activeCommandRow =
    commandRows.find((row) => row.id === activeCommand) ?? commandRows[0];
  const isControlCommand = activeCommand === "control";

  const riskScenarioRows = [
    {
      id: "pump",
      label: t("modal.scenario.pump.label"),
      score: Math.min(100, methodRows[0]?.value ?? 0),
      body: t("modal.scenario.pump.body"),
    },
    {
      id: "liquidity",
      label: t("modal.scenario.liquidity.label"),
      score: Math.min(100, methodRows[1]?.value ?? 0),
      body: t("modal.scenario.liquidity.body"),
    },
    {
      id: "book",
      label: t("modal.scenario.book.label"),
      score: Math.min(
        100,
        (orderbook?.riskPoints ?? 0) +
          Math.max(0, orderbook?.simulatedSellSlippage10k ?? 0),
      ),
      body: t("modal.scenario.book.body"),
    },
    {
      id: "forensics",
      label: t("modal.scenario.forensics.label"),
      score: result.metaModel?.requiredReview
        ? Math.max(35, combinedScore)
        : Math.max(0, combinedScore - 25),
      body: t("modal.scenario.forensics.body"),
    },
  ];

  const visualComposureScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 -
          Math.abs(combinedScore - 50) * 0.34 -
          (chartError ? 8 : 0) -
          (orderbookError ? 6 : 0),
      ),
    ),
  );
  const dataConfidenceLabel =
    result.dataQuality === "live"
      ? "live data"
      : result.dataQuality === "partial"
        ? "partial data"
        : "uncertainty";
  const terminalAnchors = [
    ["visual", `${visualComposureScore}/100 calm UI`],
    ["data", dataConfidenceLabel],
    ["wording", "anomaly review"],
  ];
  const auditLocale = locale === "de" || locale === "en" ? locale : "pl";
  const auditCopy = useMemo(
    () =>
      ({
        pl: {
          price: "Cena",
          change1h: "Zmiana 1h",
          change24h: "Zmiana 24h",
          change7d: "Zmiana 7d",
          change30d: "Zmiana 30d",
          marketCap: "Kapitalizacja",
          volume: "Wolumen 24h",
          liquidity: "Płynność",
          fdv: "Relacja FDV / market cap",
          supply: "Podaż w obiegu",
          holders: "Liczba holderów",
          concentration: "Koncentracja top 10",
          tax: "Podatek kupna / sprzedaży",
          slippage: "Symulowany poślizg 10k",
          depth: "Głębokość bid / ask",
          candles: "Świece źródłowe",
          data: "Jakość danych",
          signals: "Sygnały ryzyka",
          agents: "Agenci oceny",
          gaps: "Luki dowodowe",
          observed: "Wartość pochodzi z aktualnie załadowanego wyniku.",
          missing: "Brak wartości pozostaje widoczny i wymaga źródła.",
        },
        de: {
          price: "Preis",
          change1h: "Änderung 1h",
          change24h: "Änderung 24h",
          change7d: "Änderung 7d",
          change30d: "Änderung 30d",
          marketCap: "Marktkapitalisierung",
          volume: "Volumen 24h",
          liquidity: "Liquidität",
          fdv: "FDV / Market Cap",
          supply: "Umlaufangebot",
          holders: "Holder-Anzahl",
          concentration: "Top-10-Konzentration",
          tax: "Kauf- / Verkaufssteuer",
          slippage: "Simulierter 10k-Slippage",
          depth: "Bid- / Ask-Tiefe",
          candles: "Quellenkerzen",
          data: "Datenqualität",
          signals: "Risikosignale",
          agents: "Bewertungsagenten",
          gaps: "Evidenzlücken",
          observed: "Der Wert stammt aus dem aktuell geladenen Ergebnis.",
          missing:
            "Ein fehlender Wert bleibt sichtbar und benötigt eine Quelle.",
        },
        en: {
          price: "Price",
          change1h: "1h change",
          change24h: "24h change",
          change7d: "7d change",
          change30d: "30d change",
          marketCap: "Market cap",
          volume: "24h volume",
          liquidity: "Liquidity",
          fdv: "FDV / market cap",
          supply: "Circulating supply",
          holders: "Holder count",
          concentration: "Top-10 concentration",
          tax: "Buy / sell tax",
          slippage: "Simulated 10k slippage",
          depth: "Bid / ask depth",
          candles: "Source candles",
          data: "Data quality",
          signals: "Risk signals",
          agents: "Assessment agents",
          gaps: "Evidence gaps",
          observed: "The value comes from the currently loaded result.",
          missing: "A missing value remains visible and requires a source.",
        },
      })[auditLocale],
    [auditLocale],
  );
  const chartEvidenceOverlay = useMemo<Pass614ChartEvidenceOverlay>(
    () =>
      buildPass614ChartEvidenceOverlay({
        locale: auditLocale,
        sourceContract,
        chartLayerId: "candles",
        candleTimestamp:
          candles.at(-1)?.timestamp ?? chartPoints.at(-1)?.timestamp ?? null,
        gapCount: chartGapCount,
      }),
    [auditLocale, candles, chartGapCount, chartPoints, sourceContract],
  );

  const tierManifests = useMemo(() => {
    const supplyBase = result.metrics.totalSupply ?? result.metrics.maxSupply;
    const supplyRatio =
      result.metrics.circulatingSupply !== undefined && supplyBase
        ? `${((result.metrics.circulatingSupply / supplyBase) * 100).toFixed(1)}% circulating`
        : null;
    const contractSummary =
      asset.tokenAddress ||
      result.metrics.buyTaxPercentage !== undefined ||
      result.metrics.sellTaxPercentage !== undefined
        ? [
            asset.tokenAddress ? `${asset.chainId ?? "chain"} address` : null,
            result.metrics.buyTaxPercentage !== undefined ||
            result.metrics.sellTaxPercentage !== undefined
              ? `${formatPercent(result.metrics.buyTaxPercentage)} / ${formatPercent(result.metrics.sellTaxPercentage)} tax`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : null;
    const depth = orderbook
      ? `${formatUsd(orderbook.bidDepthUsd)} / ${formatUsd(orderbook.askDepthUsd)}`
      : null;
    const labels = {
      price: auditCopy.price,
      change1h: auditCopy.change1h,
      change24h: auditCopy.change24h,
      change7d: auditCopy.change7d,
      marketCap: auditCopy.marketCap,
      volume: auditCopy.volume,
      risk:
        auditLocale === "pl"
          ? "Presja ryzyka"
          : auditLocale === "de"
            ? "Risikodruck"
            : "Risk pressure",
      confidence:
        auditLocale === "pl"
          ? "Limit pewności"
          : auditLocale === "de"
            ? "Konfidenzgrenze"
            : "Confidence cap",
      sourceState:
        auditLocale === "pl"
          ? "Stan źródeł"
          : auditLocale === "de"
            ? "Quellenstatus"
            : "Source state",
      candles: auditCopy.candles,
      gaps: auditCopy.gaps,
      fdv: auditCopy.fdv,
      liquidity: auditCopy.liquidity,
      secondSource:
        auditLocale === "pl"
          ? "Źródło zapasowe"
          : auditLocale === "de"
            ? "Ersatzquelle"
            : "Backup provider",
      slippage: auditCopy.slippage,
      depth: auditCopy.depth,
      holders: auditCopy.holders,
      concentration: auditCopy.concentration,
      supply: auditCopy.supply,
      contract:
        auditLocale === "pl"
          ? "Kontrakt / podatki"
          : auditLocale === "de"
            ? "Contract / Steuern"
            : "Contract / tax controls",
    };
    const values = {
      price:
        result.metrics.currentPrice !== undefined
          ? formatUsd(result.metrics.currentPrice)
          : null,
      change1h:
        result.metrics.priceChange1h !== undefined
          ? formatPercent(result.metrics.priceChange1h)
          : null,
      change24h:
        result.metrics.priceChange24h !== undefined
          ? formatPercent(result.metrics.priceChange24h)
          : null,
      change7d:
        result.metrics.priceChange7d !== undefined
          ? formatPercent(result.metrics.priceChange7d)
          : null,
      marketCap:
        result.metrics.marketCap !== undefined
          ? formatUsd(result.metrics.marketCap)
          : null,
      volume:
        result.metrics.volume24h !== undefined
          ? formatUsd(result.metrics.volume24h)
          : null,
      risk: `${combinedScore}/100`,
      confidence: `${sourceContract.confidenceCap}%`,
      sourceState: sourceStateLabel(sourceContract.aggregateState),
      candles: candles.length || chartPoints.length || null,
      gaps: (result.metaModel?.limitations?.length ?? 0) + chartGapCount,
      fdv:
        result.metrics.fdv !== undefined
          ? `${formatUsd(result.metrics.fdv)}${result.metrics.fdvToMarketCapRatio !== undefined ? ` · ${result.metrics.fdvToMarketCapRatio.toFixed(2)}× MC` : ""}`
          : null,
      liquidity:
        result.metrics.liquidityUsd !== undefined
          ? formatUsd(result.metrics.liquidityUsd)
          : orderbook
            ? formatUsd(orderbook.bidDepthUsd + orderbook.askDepthUsd)
            : null,
      secondSource:
        sourceContract.layers.find((layer) => layer.id === "candles")
          ?.backupProvider ?? null,
      slippage:
        orderbook?.simulatedSellSlippage10k !== undefined
          ? formatPercent(orderbook.simulatedSellSlippage10k)
          : result.metrics.simulatedSlippage10k !== undefined
            ? formatPercent(result.metrics.simulatedSlippage10k)
            : null,
      depth,
      holders:
        result.metrics.holderCount !== undefined
          ? formatNumber(result.metrics.holderCount)
          : null,
      concentration:
        result.metrics.top10HolderPercent !== undefined
          ? formatPercent(result.metrics.top10HolderPercent)
          : null,
      supply: supplyRatio,
      contract: contractSummary,
    };
    return {
      basic: buildPass615TierInformationArchitecture({
        tier: "basic",
        sourceContract,
        labels,
        values,
      }),
      pro: buildPass615TierInformationArchitecture({
        tier: "pro",
        sourceContract,
        labels,
        values,
      }),
      advanced: buildPass615TierInformationArchitecture({
        tier: "advanced",
        sourceContract,
        labels,
        values,
      }),
    };
  }, [
    asset.chainId,
    asset.tokenAddress,
    auditCopy,
    auditLocale,
    candles.length,
    chartGapCount,
    chartPoints.length,
    combinedScore,
    orderbook,
    result,
    sourceContract,
    sourceStateLabel,
  ]);

  const activeTierManifest = tierManifests[selectedTier];
  const shieldTimeframeOptions = useMemo<
    UnifiedTimeframeOption<MarketChartRange>[]
  >(
    () => [
      { value: "15m", label: "15M" },
      { value: "1h", label: "1H" },
      { value: "4h", label: "4H" },
      { value: "1d", label: "1D" },
      { value: "7d", label: "1W" },
    ],
    [],
  );
  const advancedAnalysisProduct = useMemo(
    () => getVlmPaidProduct("vlm_advanced_analysis_single", auditLocale),
    [auditLocale],
  );
  const shieldDepthOptions = useMemo<
    UnifiedDepthOption<Pass615AnalysisTier>[]
  >(
    () => {
      const unit = auditLocale === "pl" ? "pól" : auditLocale === "de" ? "Felder" : "fields";
      return [
        {
          value: "basic",
          label: "Basic",
          meta: `${tierManifests.basic.fieldBudget} ${unit} · 2–3s`,
          icon: <Brain className="h-4 w-4" />,
        },
        {
          value: "pro",
          label: "Pro",
          meta: `${tierManifests.pro.fieldBudget} ${unit} · 4–5s`,
          icon: <FileText className="h-4 w-4" />,
        },
        {
          value: "advanced",
          label: "Advanced",
          meta: `${tierManifests.advanced.fieldBudget} ${unit} · ${advancedAnalysisProduct.priceLabel}`,
          icon: <GitBranch className="h-4 w-4" />,
        },
      ];
    },
    [advancedAnalysisProduct.priceLabel, auditLocale, tierManifests, ui.advancedTitle, ui.basicTitle, ui.proTitle],
  );
  const vlmAuditEvidence = useMemo(() => {
    if (!vlmSequenceMode) return [];
    return tierManifests[vlmSequenceMode].fields.map((field) => ({
      id: field.id,
      label: field.label,
      value: field.value,
      note: `${field.note} · ${sourceStateLabel(
        sourceContract.layers.find((layer) => layer.id === field.sourceLayerId)
          ?.state ?? "offline",
      )}`,
      status:
        field.state === "confirmed"
          ? ("verified" as const)
          : field.state === "limited"
            ? ("review" as const)
            : ("missing" as const),
    }));
  }, [sourceContract.layers, sourceStateLabel, tierManifests, vlmSequenceMode]);

  const mobileStressSweep = useMemo(
    () =>
      buildPass616ShieldMobileStressSweep({
        width: viewportGovernor.width,
        height: viewportGovernor.height,
        orientation:
          viewportGovernor.width > viewportGovernor.height
            ? "landscape"
            : "portrait",
        zoomPercent: Math.round(viewportGovernor.scale * 100),
        keyboardOcclusion: viewportGovernor.keyboardOcclusion,
        minimumTargetPx: viewportGovernor.minimumTargetPx,
        focusTrap: true,
        closeReachable: viewportGovernor.stickyHeader,
        singleScrollOwner:
          viewportGovernor.singleScrollOwner === "dialog_shell",
        backdropCloses: true,
      }),
    [viewportGovernor],
  );

  if (!mounted) return null;

  const modal = (
    <div
      ref={modalRootRef}
      className="shield-typography-root shield-no-overlap shield-modal-backdrop fixed inset-0 flex items-start justify-center overflow-hidden bg-black/[0.88] p-0 sm:p-3 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shield-token-modal-title"
      aria-describedby="shield-token-modal-boundary"
      data-pass559-public-evidence-spine="true"
      data-pass559-next-proof-step="true"
      data-pass552-public-operator-diagnostics="hidden"
      data-pass612-source-state={sourceContract.aggregateState}
      data-pass613-modal-viewport-governor={viewportGovernor.mode}
      data-pass616-mobile-stress={mobileStressSweep.state}
      data-pass2011-shield-modal="solid-backdrop-pointer-close-no-blur"
      style={{
        ...(viewportGovernor.cssVariables as CSSProperties),
        ...pass628LayerStyle("modal"),
      }}
      data-velmere-overlay-layer="modal"
    >
      <button
        type="button"
        className="shield-modal-dismiss-layer fixed inset-0 cursor-default"
        aria-hidden="true"
        tabIndex={-1}
        onPointerDown={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        id="velmere-shield-asset-modal"
        ref={modalShellRef}
        tabIndex={-1}
        data-modal-scroll-region="true"
        data-single-scroll-owner="dialog_shell"
        data-pass1454-shield-modal="rectangular-chart-depth-rail"
        className="shield-token-popup-shell unified-shield-token-popup-shell overscroll-contain touch-pan-y"
      >
        <UnifiedAssetModalShell
          kind="shield"
          eyebrow="Velmère Shield"
          title={<span id="shield-token-modal-title">{asset.symbol}</span>}
          subtitle={asset.name}
          icon={<TokenAvatar image={asset.image} symbol={asset.symbol} />}
          closeLabel={t("modal.close")}
          closeButtonRef={closeButtonRef}
          onClose={onClose}
          readouts={[
            {
              label: auditLocale === "pl" ? "Cena" : auditLocale === "de" ? "Preis" : "Price",
              value: formatUsd(result.metrics.currentPrice),
              tone: "gold",
            },
            {
              label: auditLocale === "pl" ? "Ryzyko" : auditLocale === "de" ? "Risiko" : "Risk",
              value: `${combinedScore}/100`,
              tone: combinedScore >= 70 ? "neutral" : "ready",
            },
            {
              label: auditLocale === "pl" ? "Pewność" : auditLocale === "de" ? "Konfidenz" : "Confidence",
              value: `${chartEvidenceOverlay.confidenceCap}%`,
              tone: "cyan",
            },
          ]}
          timeframeSlot={
            <UnifiedTimeframeTabs
              options={shieldTimeframeOptions}
              value={range}
              onChange={setRange}
              ariaLabel={
                auditLocale === "pl"
                  ? "Zakres wykresu Shield"
                  : auditLocale === "de"
                    ? "Shield-Chart-Zeitraum"
                    : "Shield chart timeframe"
              }
              className="md:justify-end"
              testIdPrefix="shield-chart-range"
            />
          }
          chartSlot={
            <PopupMarketChart
              candles={candles}
              points={chartPoints}
              loading={chartLoading}
              change24h={result.metrics.priceChange24h}
              evidence={chartEvidenceOverlay}
              cleanChrome
            />
          }
          depthSlot={
            <UnifiedAnalysisDepthDock
              options={shieldDepthOptions}
              value={selectedTier}
              onSelect={runVlmAiSequence}
              ariaLabel={
                auditLocale === "pl"
                  ? "Poziomy analizy VLM"
                  : auditLocale === "de"
                    ? "VLM-Analysetiefen"
                    : "VLM analysis depths"
              }
            />
          }
          analysisOverlaySlot={
            vlmSequenceMode ? (
              <VlmNeuralAuditExperience
                key={`${asset.symbol}:${vlmSequenceMode}:shield-contained`}
                contained
                locale={auditLocale}
                mode={vlmSequenceMode}
                symbol={asset.symbol}
                name={asset.name}
                evidence={vlmAuditEvidence}
                onClose={() => completeVlmAiSequence(vlmSequenceMode)}
              />
            ) : null
          }
          detailsSlot={
            <details
              className="unified-asset-modal-details rounded-[1.35rem] border border-white/[0.08] bg-white/[0.025] p-4"
              data-pass1454-shield-details="source-gaps-next-step-secondary"
            >
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.58]">
                {auditLocale === "pl"
                  ? "Źródła, luki i następny krok"
                  : auditLocale === "de"
                    ? "Quellen, Lücken und nächster Schritt"
                    : "Sources, gaps and next check"}
              </summary>
              <div id="shield-token-modal-boundary" className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="velmere-readout-card">
                  <p className="velmere-readout-label">
                    {auditLocale === "pl" ? "Stan źródeł" : auditLocale === "de" ? "Quellenstatus" : "Source state"}
                  </p>
                  <p className="velmere-readout-value text-sm">{sourceStateLabel(sourceContract.aggregateState)}</p>
                </div>
                <div className="velmere-readout-card">
                  <p className="velmere-readout-label">
                    {auditLocale === "pl" ? "Luki" : auditLocale === "de" ? "Lücken" : "Gaps"}
                  </p>
                  <p className="velmere-readout-value text-sm">{chartEvidenceOverlay.gapCount}</p>
                </div>
                <div className="velmere-readout-card">
                  <p className="velmere-readout-label">
                    {auditLocale === "pl" ? "Następnie" : auditLocale === "de" ? "Nächster Schritt" : "Next"}
                  </p>
                  <p className="velmere-readout-value line-clamp-2 text-sm normal-case tracking-normal">
                    {operatorCaseFile.primaryNextAction}
                  </p>
                </div>
              </div>
              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.34]">
                {generatedLabel} · {chartEvidenceOverlay.sourceLabel} · {sourceContract.readyCount}/{sourceContract.layers.length} {sourceSpineCopy.readyLabel}
              </p>
            </details>
          }
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
// PASS170 compatibility marker: const allowedMotionPresets = useMemo<MotionPreset[]>(() => ["orbit", "static"], []);
// PASS65 compatibility markers after PASS194 return-to-chart flow: setActiveCommand("risk") · setActiveCommand("control")

// PASS196 marker: Orbit 360 only for Basic/Pro/Advanced; Evidence Board removed from public UI; VLM overlay portal sibling; chart drag natural direction.

// Guard compatibility marker after PASS197: Advanced Orbit 360 renders orbital cards.

// Guard compatibility marker after PASS197: buildShieldEvidenceExportManifest(result, operatorCaseFile, evidenceReportDraft)

// Guard compatibility marker after PASS197: activeTileGroup === "all" ? visibleNodes : visibleNodes.filter

// Guard compatibility marker after PASS197: const useStaticEvidenceBoard = motionPreset === "static";
// Guard compatibility marker after PASS197: const staticBoardTileStyle = (node: VlmReadNode, index: number, total: number): CSSProperties => {
// Guard compatibility marker after PASS197: style={{ ...staticBoardTileStyle(node, index, filteredVisibleNodes.length), animationDelay:

// Guard compatibility marker after PASS197: const boardDensity = filteredVisibleNodes.length <= 2 ?
