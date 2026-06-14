import type { VelmereSearchResult, VelmereSearchSourceMode } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { SourceAdapterContractMeshGate } from "@/lib/market-integrity/source-adapter-contract-mesh-gate";
import type { SourceProofEscrowGate } from "@/lib/market-integrity/source-proof-escrow-gate";

export const PASS303_LIVE_ADAPTER_CIRCUIT_BREAKER_GATE = true;

export type LiveAdapterCircuitBreakerSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type LiveAdapterCircuitBreakerState =
  | "closed_verified"
  | "half_open_review"
  | "open_cooldown"
  | "operator_lock";

export type LiveAdapterCircuitBreakerLaneId =
  | "websocket_depth"
  | "rest_depth_snapshot"
  | "reserve_proof_snapshot"
  | "provenance_passport"
  | "runtime_fault_quarantine"
  | "report_export_boundary";

export type LiveAdapterCircuitBreakerLane = {
  id: LiveAdapterCircuitBreakerLaneId;
  label: string;
  state: LiveAdapterCircuitBreakerState;
  readiness: number;
  pressure: number;
  circuitRule: string;
  customerRule: string;
  operatorRule: string;
};

export type LiveAdapterCircuitBreakerAction = {
  id: string;
  label: string;
  posture: "continue" | "review" | "cooldown" | "lock";
  reason: string;
  safeBoundary: string;
};

export type LiveAdapterCircuitBreakerGate = {
  version: "velmere_live_adapter_circuit_breaker_gate_v1_pass303";
  surface: LiveAdapterCircuitBreakerSurface;
  query: string;
  breakerId: string;
  breakerState: LiveAdapterCircuitBreakerState;
  breakerPressure: number;
  liveReadiness: number;
  adapterContinuity: number;
  cooldownSeconds: number;
  proofReleaseMode: "live_receipt" | "delayed_review" | "cooldown_receipt" | "operator_only";
  headline: string;
  lanes: LiveAdapterCircuitBreakerLane[];
  actions: LiveAdapterCircuitBreakerAction[];
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

function breakerSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function sourceModeReadiness(mode?: VelmereSearchSourceMode) {
  if (mode === "live_table") return 88;
  if (mode === "live") return 80;
  if (mode === "table") return 66;
  if (mode === "fallback") return 42;
  return 30;
}

function routerReadiness(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 46);
}

function hasSignal(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function laneState(readiness: number, pressure: number): LiveAdapterCircuitBreakerState {
  if (pressure >= 82 || readiness < 32) return "operator_lock";
  if (pressure >= 68 || readiness < 48) return "open_cooldown";
  if (pressure >= 48 || readiness < 72) return "half_open_review";
  return "closed_verified";
}

function breakerStateFor(input: { liveReadiness: number; breakerPressure: number; adapterContinuity: number; cooldownSeconds: number }): LiveAdapterCircuitBreakerState {
  if (input.breakerPressure >= 82 || input.liveReadiness < 32 || input.adapterContinuity < 30) return "operator_lock";
  if (input.breakerPressure >= 68 || input.cooldownSeconds >= 50) return "open_cooldown";
  if (input.breakerPressure >= 48 || input.liveReadiness < 72) return "half_open_review";
  return "closed_verified";
}

function proofReleaseModeFor(state: LiveAdapterCircuitBreakerState): LiveAdapterCircuitBreakerGate["proofReleaseMode"] {
  if (state === "closed_verified") return "live_receipt";
  if (state === "half_open_review") return "delayed_review";
  if (state === "open_cooldown") return "cooldown_receipt";
  return "operator_only";
}

function headlineFor(state: LiveAdapterCircuitBreakerState) {
  if (state === "closed_verified") return "Live Adapter Circuit Breaker keeps proof live because adapter continuity and source pressure are balanced";
  if (state === "half_open_review") return "Live Adapter Circuit Breaker keeps the surface in review while live sources stabilize";
  if (state === "open_cooldown") return "Live Adapter Circuit Breaker cools the journey because live adapters need more stable evidence";
  return "Live Adapter Circuit Breaker locks public copy until operator review clears adapter faults and proof gaps";
}

function buildLane(input: {
  id: LiveAdapterCircuitBreakerLaneId;
  label: string;
  readiness: number;
  pressure: number;
  circuitRule: string;
  customerRule: string;
  operatorRule: string;
}): LiveAdapterCircuitBreakerLane {
  const readiness = clampScore(input.readiness);
  const pressure = clampScore(input.pressure);
  return {
    id: input.id,
    label: input.label,
    state: laneState(readiness, pressure),
    readiness,
    pressure,
    circuitRule: input.circuitRule,
    customerRule: input.customerRule,
    operatorRule: input.operatorRule,
  };
}

export function buildLiveAdapterCircuitBreakerGate(input: {
  surface: LiveAdapterCircuitBreakerSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  sourceAdapterContractMeshGate?: SourceAdapterContractMeshGate;
  sourceProofEscrowGate?: SourceProofEscrowGate;
}): LiveAdapterCircuitBreakerGate {
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
  const resultReadiness = average(results.map((item) => sourceModeReadiness(item.sourceMode)), routerReadiness(routerSuggestions));
  const resultConfidence = average(results.map((item) => item.sourceConfidence), routerReadiness(routerSuggestions));
  const meshScore = input.sourceAdapterContractMeshGate?.meshScore ?? average([resultReadiness, resultConfidence], 48);
  const adapterCoverage = input.sourceAdapterContractMeshGate?.adapterCoverage ?? clampScore(average([resultReadiness, meshScore], 48) - missingCount * 1.2);
  const timeoutPressure = input.sourceAdapterContractMeshGate?.timeoutPressure ?? clampScore(100 - adapterCoverage + missingCount * 1.6);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - average([resultReadiness, resultConfidence], 50) + missingCount * 2.8 + knownFaults.length * 8);
  const escrowFriction = input.sourceProofEscrowGate?.evidenceFriction ?? clampScore(timeoutPressure * 0.42 + faultPressure * 0.38 + missingCount * 1.4);
  const escrowScore = input.sourceProofEscrowGate?.escrowScore ?? average([meshScore, adapterCoverage, resultConfidence], 50);

  const hasWebsocket = hasSignal(joinedText, /websocket|stream|live|real[- ]?time|orderbook|depth/i);
  const hasRestDepth = hasSignal(joinedText, /rest|snapshot|depth|spread|slippage|liquidity|venue/i);
  const hasReserve = hasSignal(joinedText, /reserve|proof|por|wallet|custody|audit|merkle/i);
  const hasProvenance = hasSignal(joinedText, /passport|provenance|traceability|authentic|lvmh|aura|dpp|lifecycle/i);
  const hasRuntimeQuarantine = knownFaults.length > 0 || hasSignal(joinedText, /fault|timeout|fallback|stale|missing|error|quarantine/i);
  const hasReportBoundary = hasSignal(joinedText, /report|pdf|export|redact|customer|operator|receipt/i) || input.surface !== "shield_terminal";

  const adapterContinuity = clampScore(
    average([hasWebsocket, hasRestDepth, hasReserve, hasProvenance, hasReportBoundary].map((enabled) => (enabled ? 82 : 46)), 56) * 0.36 +
      adapterCoverage * 0.32 +
      meshScore * 0.2 -
      knownFaults.length * 5 -
      missingCount * 0.8,
  );
  const liveReadiness = clampScore(
    resultReadiness * 0.2 + resultConfidence * 0.18 + adapterContinuity * 0.24 + escrowScore * 0.2 + (100 - escrowFriction) * 0.18,
  );
  const breakerPressure = clampScore(
    timeoutPressure * 0.24 + faultPressure * 0.24 + escrowFriction * 0.24 + (100 - adapterContinuity) * 0.18 + knownFaults.length * 4 + missingCount * 0.9,
  );
  const cooldownSeconds = clampScore(Math.max(0, breakerPressure - liveReadiness / 3));
  const breakerState = breakerStateFor({ liveReadiness, breakerPressure, adapterContinuity, cooldownSeconds });
  const proofReleaseMode = proofReleaseModeFor(breakerState);

  const lanes: LiveAdapterCircuitBreakerLane[] = [
    buildLane({
      id: "websocket_depth",
      label: "WebSocket depth circuit",
      readiness: clampScore((hasWebsocket ? 82 : 48) + resultReadiness * 0.14 - timeoutPressure * 0.08),
      pressure: clampScore(timeoutPressure * 0.58 + (hasWebsocket ? 10 : 28) + knownFaults.length * 5),
      circuitRule: "Live depth streams may enrich the decision surface only when freshness and timeout pressure stay controlled.",
      customerRule: "Show live/depth wording as context only; never turn it into an action command.",
      operatorRule: "If live stream continuity breaks, downgrade to snapshot review and keep raw fault details internal.",
    }),
    buildLane({
      id: "rest_depth_snapshot",
      label: "REST depth snapshot circuit",
      readiness: clampScore((hasRestDepth ? 80 : 50) + adapterCoverage * 0.15 - faultPressure * 0.08),
      pressure: clampScore(faultPressure * 0.42 + timeoutPressure * 0.26 + (hasRestDepth ? 10 : 24)),
      circuitRule: "Snapshot data is allowed as a calm fallback when streaming continuity is weak or unavailable.",
      customerRule: "Snapshot copy must include source and freshness limits instead of implying perfect market visibility.",
      operatorRule: "Require second-source review when snapshot and stream posture disagree.",
    }),
    buildLane({
      id: "reserve_proof_snapshot",
      label: "Reserve proof circuit",
      readiness: clampScore((hasReserve ? 78 : 44) + resultConfidence * 0.16 - escrowFriction * 0.08),
      pressure: clampScore(escrowFriction * 0.38 + (hasReserve ? 12 : 30) + knownFaults.length * 4),
      circuitRule: "Reserve proof stays a dated transparency snapshot and cannot override weak source/depth posture.",
      customerRule: "Customer copy receives a bounded receipt, not solvency or platform-safety language.",
      operatorRule: "Keep raw reserve references and audit notes behind operator-only boundaries until redaction passes.",
    }),
    buildLane({
      id: "provenance_passport",
      label: "Provenance passport circuit",
      readiness: clampScore((hasProvenance ? 82 : 48) + meshScore * 0.14 - timeoutPressure * 0.05),
      pressure: clampScore((hasProvenance ? 10 : 26) + timeoutPressure * 0.28 + (100 - meshScore) * 0.18),
      circuitRule: "DPP-style provenance is treated as a lifecycle proof lane that can elevate trust only when source quality agrees.",
      customerRule: "Elite status is earned by traceability and proof clarity, not scarcity pressure.",
      operatorRule: "Missing DPP/provenance data lowers the status tier and adds review friction.",
    }),
    buildLane({
      id: "runtime_fault_quarantine",
      label: "Runtime fault quarantine",
      readiness: clampScore((hasRuntimeQuarantine ? 54 : 82) + (100 - faultPressure) * 0.12 - knownFaults.length * 5),
      pressure: clampScore(faultPressure * 0.52 + knownFaults.length * 10 + (hasRuntimeQuarantine ? 18 : 8)),
      circuitRule: "Runtime, dropdown, modal and adapter faults pause proof release before public copy changes state.",
      customerRule: "Public UI shows calm review/cooldown state without exposing stack traces or raw errors.",
      operatorRule: "Operator view can keep fault labels, reproduction notes and source retry posture.",
    }),
    buildLane({
      id: "report_export_boundary",
      label: "Report export circuit",
      readiness: clampScore((hasReportBoundary ? 82 : 54) + escrowScore * 0.12 - escrowFriction * 0.06),
      pressure: clampScore(escrowFriction * 0.32 + (hasReportBoundary ? 8 : 22) + (100 - liveReadiness) * 0.18),
      circuitRule: "Reports, PDF and browser replay can release only after circuit state, redaction and source escrow agree.",
      customerRule: "Customer receives a review receipt and limitations; raw payloads remain internal.",
      operatorRule: "Export is delayed when the circuit is open, cooldown or operator lock.",
    }),
  ];

  const actions: LiveAdapterCircuitBreakerAction[] = [
    {
      id: "breaker_next_state",
      label:
        breakerState === "closed_verified"
          ? "Continue with live receipt"
          : breakerState === "half_open_review"
            ? "Route through review"
            : breakerState === "open_cooldown"
              ? "Apply cooldown before receipt"
              : "Lock to operator review",
      posture:
        breakerState === "closed_verified"
          ? "continue"
          : breakerState === "half_open_review"
            ? "review"
            : breakerState === "open_cooldown"
              ? "cooldown"
              : "lock",
      reason: `Breaker pressure is ${breakerPressure}/100, live readiness is ${liveReadiness}/100 and continuity is ${adapterContinuity}/100.`,
      safeBoundary: "This is source-quality orchestration, not financial advice, a trade instruction or a safety certificate.",
    },
    {
      id: "cooldown_or_receipt",
      label: cooldownSeconds > 38 ? "Slow public proof release" : "Attach live-source receipt",
      posture: cooldownSeconds > 70 ? "lock" : cooldownSeconds > 38 ? "cooldown" : "review",
      reason: `Circuit cooldown is ${cooldownSeconds}s equivalent; higher hype or adapter pressure increases friction instead of urgency.`,
      safeBoundary: "No countdown pressure, no artificial scarcity and no urgency copy are allowed in this gate.",
    },
  ];

  return {
    version: "velmere_live_adapter_circuit_breaker_gate_v1_pass303",
    surface: input.surface,
    query,
    breakerId: `pass303-${breakerSlug(query || input.surface)}-${proofReleaseMode}-${liveReadiness}`,
    breakerState,
    breakerPressure,
    liveReadiness,
    adapterContinuity,
    cooldownSeconds,
    proofReleaseMode,
    headline: headlineFor(breakerState),
    lanes,
    actions,
    customerMicrocopy:
      breakerState === "closed_verified"
        ? "Live sources can stay attached because adapter continuity, proof escrow and fault pressure are balanced."
        : "Live source proof is slowed until adapter continuity, source freshness and proof escrow become clearer.",
    operatorMicrocopy: `PASS303 circuit: live ${liveReadiness}/100 · pressure ${breakerPressure}/100 · continuity ${adapterContinuity}/100 · cooldown ${cooldownSeconds}s · mode ${proofReleaseMode}.`,
    psychologyRules: [
      "FOMO is converted into circuit friction: weaker adapter continuity slows the journey instead of increasing urgency.",
      "Elite access is earned by live-source resilience, proof escrow and provenance clarity, not by artificial scarcity.",
      "Customer copy receives state and limitations; operator view keeps raw faults, retry posture and source debt.",
    ],
    blockedDarkPatterns: [
      "countdown pressure",
      "artificial scarcity prompts",
      "trade action commands",
      "profit or safety-certificate language",
      "raw stack traces in customer copy",
    ],
    innovation:
      "Live Adapter Circuit Breaker: a Velmère-only UI layer that opens, cools or locks live-source proof based on WebSocket depth continuity, REST snapshots, reserve proof, provenance passport, runtime faults and export boundaries.",
  };
}
