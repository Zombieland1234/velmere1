import type { VelmereSearchResult, VelmereSearchSourceMode } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { SourceAdapterContractMeshGate } from "@/lib/market-integrity/source-adapter-contract-mesh-gate";
import type { SourceProofEscrowGate } from "@/lib/market-integrity/source-proof-escrow-gate";
import type { LiveAdapterCircuitBreakerGate } from "@/lib/market-integrity/live-adapter-circuit-breaker-gate";

export const PASS304_FRESHNESS_TIMECODE_LEDGER_GATE = true;

export type FreshnessTimecodeLedgerSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type FreshnessTimecodeLedgerState =
  | "live_window"
  | "near_live_review"
  | "stale_cooldown"
  | "frozen_operator";

export type FreshnessTimecodeLedgerLaneId =
  | "orderbook_depth_timecode"
  | "reserve_snapshot_timecode"
  | "contract_control_timecode"
  | "provenance_passport_timecode"
  | "browser_replay_timecode"
  | "customer_copy_timecode";

export type FreshnessTimecodeLedgerLane = {
  id: FreshnessTimecodeLedgerLaneId;
  label: string;
  state: FreshnessTimecodeLedgerState;
  freshness: number;
  drift: number;
  ttlSeconds: number;
  timecodeRule: string;
  customerRule: string;
  operatorRule: string;
};

export type FreshnessTimecodeLedgerAction = {
  id: string;
  label: string;
  posture: "publish_context" | "review" | "cooldown" | "operator_freeze";
  reason: string;
  safeBoundary: string;
};

export type FreshnessTimecodeLedgerGate = {
  version: "velmere_freshness_timecode_ledger_gate_v1_pass304";
  surface: FreshnessTimecodeLedgerSurface;
  query: string;
  ledgerId: string;
  ledgerState: FreshnessTimecodeLedgerState;
  freshnessScore: number;
  driftPressure: number;
  replayReadiness: number;
  expirySeconds: number;
  releaseMode: "timecoded_context" | "review_context" | "cooldown_context" | "operator_only";
  headline: string;
  lanes: FreshnessTimecodeLedgerLane[];
  actions: FreshnessTimecodeLedgerAction[];
  customerMicrocopy: string;
  operatorMicrocopy: string;
  psychologyRules: string[];
  blockedDarkPatterns: string[];
  innovation: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[], fallback = 0) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return fallback;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function cleanQuery(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function ledgerSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function sourceModeFreshness(mode?: VelmereSearchSourceMode) {
  if (mode === "live_table") return 90;
  if (mode === "live") return 82;
  if (mode === "table") return 66;
  if (mode === "fallback") return 42;
  return 34;
}

function routerFreshness(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 48);
}

function hasSignal(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function stateFor(freshness: number, drift: number): FreshnessTimecodeLedgerState {
  if (drift >= 82 || freshness < 30) return "frozen_operator";
  if (drift >= 66 || freshness < 48) return "stale_cooldown";
  if (drift >= 44 || freshness < 72) return "near_live_review";
  return "live_window";
}

function releaseModeFor(state: FreshnessTimecodeLedgerState): FreshnessTimecodeLedgerGate["releaseMode"] {
  if (state === "live_window") return "timecoded_context";
  if (state === "near_live_review") return "review_context";
  if (state === "stale_cooldown") return "cooldown_context";
  return "operator_only";
}

function headlineFor(state: FreshnessTimecodeLedgerState) {
  if (state === "live_window") return "Freshness Timecode Ledger lets the proof surface move because source windows and replay context are aligned";
  if (state === "near_live_review") return "Freshness Timecode Ledger keeps the surface in review until live context and replay context agree";
  if (state === "stale_cooldown") return "Freshness Timecode Ledger slows the journey because source drift is rising";
  return "Freshness Timecode Ledger freezes public copy until operator review refreshes the stale or conflicting source lanes";
}

function ttlFor(freshness: number, drift: number) {
  return Math.max(15, Math.min(900, Math.round(freshness * 7.5 - drift * 2.4 + 120)));
}

function buildLane(input: {
  id: FreshnessTimecodeLedgerLaneId;
  label: string;
  freshness: number;
  drift: number;
  timecodeRule: string;
  customerRule: string;
  operatorRule: string;
}): FreshnessTimecodeLedgerLane {
  const freshness = clampScore(input.freshness);
  const drift = clampScore(input.drift);
  return {
    id: input.id,
    label: input.label,
    state: stateFor(freshness, drift),
    freshness,
    drift,
    ttlSeconds: ttlFor(freshness, drift),
    timecodeRule: input.timecodeRule,
    customerRule: input.customerRule,
    operatorRule: input.operatorRule,
  };
}

export function buildFreshnessTimecodeLedgerGate(input: {
  surface: FreshnessTimecodeLedgerSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  sourceAdapterContractMeshGate?: SourceAdapterContractMeshGate;
  sourceProofEscrowGate?: SourceProofEscrowGate;
  liveAdapterCircuitBreakerGate?: LiveAdapterCircuitBreakerGate;
}): FreshnessTimecodeLedgerGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const joinedText = [
    query,
    ...knownFaults,
    ...results.flatMap((item) => [item.title, item.summary, item.whyItMatters, item.nextOperatorStep, ...item.missingData, ...item.chips]),
    ...routerSuggestions.flatMap((item) => [item.symbol, item.name, item.reason ?? "", item.exchangeLabel, item.sourceLabel, item.socialLabel]),
  ].join(" ");

  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const resultFreshness = average(results.map((item) => sourceModeFreshness(item.sourceMode)), routerFreshness(routerSuggestions));
  const confidence = average(results.map((item) => item.sourceConfidence), routerFreshness(routerSuggestions));
  const meshScore = input.sourceAdapterContractMeshGate?.meshScore ?? average([resultFreshness, confidence], 50);
  const adapterCoverage = input.sourceAdapterContractMeshGate?.adapterCoverage ?? average([meshScore, resultFreshness], 50);
  const escrowScore = input.sourceProofEscrowGate?.escrowScore ?? average([meshScore, confidence], 50);
  const liveReadiness = input.liveAdapterCircuitBreakerGate?.liveReadiness ?? average([resultFreshness, adapterCoverage, escrowScore], 50);
  const breakerPressure = input.liveAdapterCircuitBreakerGate?.breakerPressure ?? clampScore(100 - liveReadiness + missingCount * 2 + knownFaults.length * 7);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - resultFreshness + knownFaults.length * 8 + missingCount * 2.4);
  const timeoutPressure = input.sourceAdapterContractMeshGate?.timeoutPressure ?? clampScore(100 - adapterCoverage + missingCount * 1.8);
  const escrowFriction = input.sourceProofEscrowGate?.evidenceFriction ?? clampScore(100 - escrowScore + missingCount * 1.6);

  const hasDepth = hasSignal(joinedText, /order\s?book|depth|liquidity|spread|slippage|venue|websocket|snapshot/i);
  const hasReserve = hasSignal(joinedText, /reserve|proof|por|wallet|merkle|custody|asset backing/i);
  const hasContract = hasSignal(joinedText, /contract|owner|proxy|mint|pause|blacklist|tax|permission/i);
  const hasProvenance = hasSignal(joinedText, /passport|provenance|traceability|authentic|aura|lvmh|dpp|lifecycle|origin/i);
  const hasReplay = hasSignal(joinedText, /browser|replay|pdf|report|export|receipt|manifest|timecode/i) || input.surface !== "shield_terminal";
  const hasCustomerCopy = hasSignal(joinedText, /customer|public|redact|boundary|copy|brief/i) || results.length > 0;

  const replayReadiness = clampScore(average([liveReadiness, escrowScore, adapterCoverage, hasReplay ? 84 : 52], 56) - knownFaults.length * 4 - missingCount * 0.8);
  const freshnessScore = clampScore(
    resultFreshness * 0.2 +
      confidence * 0.16 +
      meshScore * 0.16 +
      escrowScore * 0.14 +
      liveReadiness * 0.2 +
      replayReadiness * 0.14 -
      knownFaults.length * 3 -
      missingCount * 0.6,
  );
  const driftPressure = clampScore(
    timeoutPressure * 0.22 +
      faultPressure * 0.22 +
      breakerPressure * 0.24 +
      escrowFriction * 0.16 +
      (100 - replayReadiness) * 0.16 +
      missingCount * 0.6,
  );
  const expirySeconds = ttlFor(freshnessScore, driftPressure);
  const ledgerState = stateFor(freshnessScore, driftPressure);
  const releaseMode = releaseModeFor(ledgerState);

  const lanes: FreshnessTimecodeLedgerLane[] = [
    buildLane({
      id: "orderbook_depth_timecode",
      label: "Orderbook depth timecode",
      freshness: clampScore((hasDepth ? 84 : 50) + resultFreshness * 0.12 + liveReadiness * 0.12 - timeoutPressure * 0.08),
      drift: clampScore(timeoutPressure * 0.46 + breakerPressure * 0.26 + (hasDepth ? 8 : 28)),
      timecodeRule: "Depth context must show whether it is live, snapshot or cooled before it can shape the decision surface.",
      customerRule: "Depth is shown as context only, never as an action command.",
      operatorRule: "If depth timing drifts, freeze live wording and require a fresh snapshot note.",
    }),
    buildLane({
      id: "reserve_snapshot_timecode",
      label: "Reserve snapshot timecode",
      freshness: clampScore((hasReserve ? 80 : 48) + escrowScore * 0.16 - escrowFriction * 0.08),
      drift: clampScore(escrowFriction * 0.36 + faultPressure * 0.26 + (hasReserve ? 12 : 30)),
      timecodeRule: "Reserve-style proof must carry a snapshot boundary and cannot become blanket platform approval.",
      customerRule: "Reserve context stays narrow: asset/source/snapshot, not a broad safety claim.",
      operatorRule: "Reserve data must remain linked to source, token, network and timestamp before release.",
    }),
    buildLane({
      id: "contract_control_timecode",
      label: "Contract control timecode",
      freshness: clampScore((hasContract ? 78 : 44) + meshScore * 0.14 - faultPressure * 0.08),
      drift: clampScore(faultPressure * 0.42 + timeoutPressure * 0.18 + (hasContract ? 14 : 34)),
      timecodeRule: "Contract permissions age quickly; stale permissions move to operator review.",
      customerRule: "Show permissions as review context, not as a final verdict.",
      operatorRule: "Owner/proxy/mint/pause/tax lanes need an adapter refresh before export copy.",
    }),
    buildLane({
      id: "provenance_passport_timecode",
      label: "Provenance passport timecode",
      freshness: clampScore((hasProvenance ? 86 : 54) + adapterCoverage * 0.12 - timeoutPressure * 0.06),
      drift: clampScore(timeoutPressure * 0.22 + escrowFriction * 0.22 + (hasProvenance ? 10 : 26)),
      timecodeRule: "Luxury-style provenance must show origin/history/passport context rather than vague prestige wording.",
      customerRule: "Status is earned by traceability and lifecycle context, not by scarcity pressure.",
      operatorRule: "DPP/provenance lanes stay operator-owned until source origin and lifecycle notes are present.",
    }),
    buildLane({
      id: "browser_replay_timecode",
      label: "Browser replay timecode",
      freshness: clampScore(replayReadiness + (hasReplay ? 8 : -12)),
      drift: clampScore(breakerPressure * 0.34 + faultPressure * 0.24 + (hasReplay ? 8 : 30)),
      timecodeRule: "Browser replay must carry a freshness window before it supports report or PDF context.",
      customerRule: "Replay wording is preview context, not a production certificate.",
      operatorRule: "If replay evidence is missing, keep PDF/export copy in review.",
    }),
    buildLane({
      id: "customer_copy_timecode",
      label: "Customer copy timecode",
      freshness: clampScore((hasCustomerCopy ? 78 : 50) + freshnessScore * 0.12 - driftPressure * 0.08),
      drift: clampScore(driftPressure * 0.42 + (hasCustomerCopy ? 8 : 28)),
      timecodeRule: "Customer-facing copy expires before operator proof; stale copy must downgrade to review wording.",
      customerRule: "Public text stays cautious when any evidence lane is old, missing or cooled.",
      operatorRule: "Operator copy can explain drift; public copy must stay plain and narrow.",
    }),
  ];

  const actions: FreshnessTimecodeLedgerAction[] =
    ledgerState === "live_window"
      ? [
          {
            id: "timecoded-context",
            label: "Release timecoded context",
            posture: "publish_context",
            reason: "Freshness, replay and adapter continuity are aligned enough for context copy.",
            safeBoundary: "Keep timestamps, source mode and review boundary visible.",
          },
        ]
      : ledgerState === "near_live_review"
        ? [
            {
              id: "review-context",
              label: "Keep near-live review",
              posture: "review",
              reason: "One or more source lanes have drift, so the UI should explain the review state.",
              safeBoundary: "Do not elevate proof tier until stale lanes refresh.",
            },
          ]
        : ledgerState === "stale_cooldown"
          ? [
              {
                id: "cooldown-context",
                label: "Apply source cooldown",
                posture: "cooldown",
                reason: "Source drift is high enough to slow report, PDF and premium proof copy.",
                safeBoundary: "Show calm wait/review language instead of urgency.",
              },
            ]
          : [
              {
                id: "operator-freeze",
                label: "Freeze public copy",
                posture: "operator_freeze",
                reason: "Freshness debt or runtime/source faults require operator review first.",
                safeBoundary: "Keep raw faults internal and release only redacted context.",
              },
            ];

  return {
    version: "velmere_freshness_timecode_ledger_gate_v1_pass304",
    surface: input.surface,
    query,
    ledgerId: `pass304-${ledgerSlug(query || input.surface)}-${releaseMode}-${freshnessScore}`,
    ledgerState,
    freshnessScore,
    driftPressure,
    replayReadiness,
    expirySeconds,
    releaseMode,
    headline: headlineFor(ledgerState),
    lanes,
    actions,
    customerMicrocopy:
      ledgerState === "live_window"
        ? "Freshness Timecode Ledger allows contextual proof only with visible source age, replay window and review boundary."
        : ledgerState === "near_live_review"
          ? "Freshness Timecode Ledger keeps this surface in review until source age and replay context agree."
          : ledgerState === "stale_cooldown"
            ? "Freshness Timecode Ledger slows the surface because one or more source windows are drifting."
            : "Freshness Timecode Ledger freezes public copy until operator review refreshes stale or conflicting lanes.",
    operatorMicrocopy: `Operator view: ${knownFaults.length} runtime/source fault(s), ${missingCount} missing data point(s), expiry ${expirySeconds}s, release mode ${releaseMode}.`,
    psychologyRules: [
      "Freshness debt increases friction instead of urgency.",
      "Prestige is shown as timecoded provenance, not vague elite language.",
      "Live data, reserve context and DPP-style provenance must disclose their boundary.",
      "Customer copy expires before operator proof when source timing drifts.",
    ],
    blockedDarkPatterns: [
      "No countdown pressure.",
      "No action command from live depth.",
      "No broad safety promise from reserve or provenance data.",
      "No hidden stale-source promotion.",
    ],
    innovation:
      "A timecode ledger that blends exchange depth freshness, reserve snapshot timing and luxury provenance lifecycle context into one proof-release governor for Shield, Shield Map and VLM Lens.",
  };
}
