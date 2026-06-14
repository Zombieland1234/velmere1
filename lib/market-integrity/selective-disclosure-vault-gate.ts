import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { SourceProofEscrowGate } from "@/lib/market-integrity/source-proof-escrow-gate";
import type { LiveAdapterCircuitBreakerGate } from "@/lib/market-integrity/live-adapter-circuit-breaker-gate";
import type { FreshnessTimecodeLedgerGate } from "@/lib/market-integrity/freshness-timecode-ledger-gate";

export const PASS305_SELECTIVE_DISCLOSURE_VAULT_GATE = true;

export type SelectiveDisclosureVaultSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type SelectiveDisclosureVaultState =
  | "public_summary"
  | "guided_preview"
  | "redacted_receipt"
  | "operator_vault";

export type SelectiveDisclosureVaultLaneId =
  | "identity_disclosure_card"
  | "depth_disclosure_card"
  | "reserve_disclosure_card"
  | "provenance_disclosure_card"
  | "runtime_disclosure_card"
  | "export_disclosure_card";

export type SelectiveDisclosureVaultLane = {
  id: SelectiveDisclosureVaultLaneId;
  label: string;
  state: SelectiveDisclosureVaultState;
  score: number;
  visibility: "customer_visible" | "customer_limited" | "operator_review" | "operator_only";
  disclosureRule: string;
  customerBoundary: string;
  operatorProof: string;
};

export type SelectiveDisclosureVaultAction = {
  id: string;
  label: string;
  posture: "show_public_summary" | "show_guided_preview" | "show_redacted_receipt" | "hold_operator_vault";
  reason: string;
  safeBoundary: string;
};

export type SelectiveDisclosureVaultGate = {
  version: "velmere_selective_disclosure_vault_gate_v1_pass305";
  surface: SelectiveDisclosureVaultSurface;
  query: string;
  vaultId: string;
  vaultState: SelectiveDisclosureVaultState;
  disclosureScore: number;
  privacyScore: number;
  redactionPressure: number;
  evidencePrestige: number;
  releaseMode: "public_summary" | "guided_preview" | "redacted_receipt" | "operator_only";
  headline: string;
  lanes: SelectiveDisclosureVaultLane[];
  actions: SelectiveDisclosureVaultAction[];
  customerMicrocopy: string;
  operatorMicrocopy: string;
  psychologyRules: string[];
  blockedManipulationPatterns: string[];
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

function vaultSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function hasSignal(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function stateFor(score: number, pressure: number): SelectiveDisclosureVaultState {
  if (pressure >= 76 || score < 34) return "operator_vault";
  if (pressure >= 58 || score < 52) return "redacted_receipt";
  if (pressure >= 38 || score < 74) return "guided_preview";
  return "public_summary";
}

function releaseModeFor(state: SelectiveDisclosureVaultState): SelectiveDisclosureVaultGate["releaseMode"] {
  if (state === "public_summary") return "public_summary";
  if (state === "guided_preview") return "guided_preview";
  if (state === "redacted_receipt") return "redacted_receipt";
  return "operator_only";
}

function visibilityFor(state: SelectiveDisclosureVaultState): SelectiveDisclosureVaultLane["visibility"] {
  if (state === "public_summary") return "customer_visible";
  if (state === "guided_preview") return "customer_limited";
  if (state === "redacted_receipt") return "operator_review";
  return "operator_only";
}

function headlineFor(state: SelectiveDisclosureVaultState) {
  if (state === "public_summary") return "Selective Disclosure Vault can show a calm public summary because proof timing, redaction and provenance agree";
  if (state === "guided_preview") return "Selective Disclosure Vault shows a guided preview while source proof and customer wording are still bounded";
  if (state === "redacted_receipt") return "Selective Disclosure Vault keeps only a redacted receipt visible until operator review closes the evidence gap";
  return "Selective Disclosure Vault holds the proof inside operator view until source timing, privacy and replay boundaries recover";
}

function buildLane(input: {
  id: SelectiveDisclosureVaultLaneId;
  label: string;
  score: number;
  pressure: number;
  disclosureRule: string;
  customerBoundary: string;
  operatorProof: string;
}): SelectiveDisclosureVaultLane {
  const score = clampScore(input.score);
  const pressure = clampScore(input.pressure);
  const state = stateFor(score, pressure);
  return {
    id: input.id,
    label: input.label,
    state,
    score,
    visibility: visibilityFor(state),
    disclosureRule: input.disclosureRule,
    customerBoundary: input.customerBoundary,
    operatorProof: input.operatorProof,
  };
}

export function buildSelectiveDisclosureVaultGate(input: {
  surface: SelectiveDisclosureVaultSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  sourceProofEscrowGate?: SourceProofEscrowGate;
  liveAdapterCircuitBreakerGate?: LiveAdapterCircuitBreakerGate;
  freshnessTimecodeLedgerGate?: FreshnessTimecodeLedgerGate;
}): SelectiveDisclosureVaultGate {
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
  const confidence = average(results.map((item) => item.sourceConfidence), average(routerSuggestions.map((item) => item.routerScore), 50));
  const freshness = input.freshnessTimecodeLedgerGate?.freshnessScore ?? confidence;
  const drift = input.freshnessTimecodeLedgerGate?.driftPressure ?? clampScore(100 - freshness + missingCount * 2);
  const escrowScore = input.sourceProofEscrowGate?.escrowScore ?? average([confidence, freshness], 50);
  const proofCompleteness = input.sourceProofEscrowGate?.proofCompleteness ?? escrowScore;
  const liveReadiness = input.liveAdapterCircuitBreakerGate?.liveReadiness ?? average([freshness, proofCompleteness], 50);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - confidence + knownFaults.length * 9 + missingCount * 2);

  const hasDepth = hasSignal(joinedText, /order\s?book|depth|liquidity|spread|slippage|venue|websocket|snapshot/i);
  const hasReserve = hasSignal(joinedText, /reserve|proof|wallet|merkle|custody|asset backing|snapshot/i);
  const hasProvenance = hasSignal(joinedText, /passport|provenance|traceability|authentic|aura|lvmh|dpp|lifecycle|origin/i);
  const hasRuntime = hasSignal(joinedText, /runtime|fault|error|replay|browser|timeout|circuit/i) || knownFaults.length > 0;
  const hasExport = hasSignal(joinedText, /report|pdf|export|receipt|manifest|customer|copy|redact/i) || results.length > 0;

  const privacyScore = clampScore(average([100 - faultPressure, escrowScore, freshness, input.freshnessTimecodeLedgerGate?.replayReadiness ?? freshness], 62) - knownFaults.length * 4);
  const disclosureScore = clampScore(
    confidence * 0.18 +
      freshness * 0.2 +
      escrowScore * 0.18 +
      proofCompleteness * 0.16 +
      liveReadiness * 0.16 +
      privacyScore * 0.12 -
      missingCount * 0.7 -
      knownFaults.length * 3,
  );
  const redactionPressure = clampScore(
    (100 - privacyScore) * 0.34 +
      drift * 0.24 +
      faultPressure * 0.22 +
      (100 - escrowScore) * 0.12 +
      missingCount * 0.8 +
      knownFaults.length * 4,
  );
  const evidencePrestige = clampScore(average([disclosureScore, proofCompleteness, freshness, privacyScore], 50) - redactionPressure * 0.15);
  const vaultState = stateFor(disclosureScore, redactionPressure);
  const releaseMode = releaseModeFor(vaultState);

  const lanes: SelectiveDisclosureVaultLane[] = [
    buildLane({
      id: "identity_disclosure_card",
      label: "Identity disclosure",
      score: confidence,
      pressure: knownFaults.length ? faultPressure : 100 - confidence,
      disclosureRule: "Show symbol, source mode and limitation before any prestige badge.",
      customerBoundary: "Customer sees identity context only with source boundary.",
      operatorProof: "Operator receives raw source mismatch and missing identity lanes.",
    }),
    buildLane({
      id: "depth_disclosure_card",
      label: "Depth disclosure",
      score: hasDepth ? liveReadiness : average([liveReadiness, 48], 52),
      pressure: hasDepth ? drift : clampScore(drift + 18),
      disclosureRule: "Depth context is visible only as liquidity context, not an action instruction.",
      customerBoundary: "Customer sees depth age, spread context and source limits.",
      operatorProof: "Operator checks WebSocket/REST continuity and venue depth source debt.",
    }),
    buildLane({
      id: "reserve_disclosure_card",
      label: "Reserve disclosure",
      score: hasReserve ? proofCompleteness : average([proofCompleteness, 44], 50),
      pressure: hasReserve ? redactionPressure : clampScore(redactionPressure + 12),
      disclosureRule: "Reserve context can be shown as transparent snapshot context only.",
      customerBoundary: "Customer sees snapshot limits and network/wallet boundary.",
      operatorProof: "Operator checks reserve snapshot timestamp and address/source policy.",
    }),
    buildLane({
      id: "provenance_disclosure_card",
      label: "Provenance disclosure",
      score: hasProvenance ? average([freshness, escrowScore, 86], 70) : average([freshness, 50], 50),
      pressure: hasProvenance ? redactionPressure : clampScore(redactionPressure + 16),
      disclosureRule: "DPP-style provenance is displayed as lifecycle context and origin trace.",
      customerBoundary: "Customer sees provenance without broad safety language.",
      operatorProof: "Operator checks DPP, Aura/LVMH-style traceability and data owner boundary.",
    }),
    buildLane({
      id: "runtime_disclosure_card",
      label: "Runtime disclosure",
      score: hasRuntime ? clampScore(100 - faultPressure) : 82,
      pressure: faultPressure,
      disclosureRule: "Runtime faults are summarized calmly and raw traces stay internal.",
      customerBoundary: "Customer sees temporary review/cooldown copy only.",
      operatorProof: "Operator receives fault count, quarantine state and retry posture.",
    }),
    buildLane({
      id: "export_disclosure_card",
      label: "Export disclosure",
      score: hasExport ? average([privacyScore, input.freshnessTimecodeLedgerGate?.replayReadiness ?? freshness], 60) : privacyScore,
      pressure: redactionPressure,
      disclosureRule: "Report/PDF export copy is released through redacted receipt before full public copy.",
      customerBoundary: "Customer sees receipt and limitation text.",
      operatorProof: "Operator checks redaction, replay and report boundary before export.",
    }),
  ];

  const actions: SelectiveDisclosureVaultAction[] = [
    {
      id: "vault-release-mode",
      label: releaseMode.replaceAll("_", " "),
      posture: vaultState === "public_summary" ? "show_public_summary" : vaultState === "guided_preview" ? "show_guided_preview" : vaultState === "redacted_receipt" ? "show_redacted_receipt" : "hold_operator_vault",
      reason: headlineFor(vaultState),
      safeBoundary: "Disclosure level follows proof timing, redaction pressure and replay readiness.",
    },
    {
      id: "evidence-prestige",
      label: `evidence prestige ${evidencePrestige}/100`,
      posture: evidencePrestige >= 76 && vaultState !== "operator_vault" ? "show_guided_preview" : "show_redacted_receipt",
      reason: "Status is earned by evidence lanes and can drop when proof becomes stale or private.",
      safeBoundary: "Prestige wording never replaces source limitations or operator review.",
    },
  ];

  return {
    version: "velmere_selective_disclosure_vault_gate_v1_pass305",
    surface: input.surface,
    query,
    vaultId: `sdv-${vaultSlug(query)}-${releaseMode}`,
    vaultState,
    disclosureScore,
    privacyScore,
    redactionPressure,
    evidencePrestige,
    releaseMode,
    headline: headlineFor(vaultState),
    lanes,
    actions,
    customerMicrocopy:
      vaultState === "public_summary"
        ? "Selective Disclosure Vault shows a public summary with visible limits because proof, privacy and replay context agree."
        : vaultState === "guided_preview"
          ? "Selective Disclosure Vault keeps the experience guided while proof and privacy lanes are still bounded."
          : vaultState === "redacted_receipt"
            ? "Selective Disclosure Vault shows only a redacted receipt until an operator reviews source and replay debt."
            : "Selective Disclosure Vault keeps this proof operator-only until stale, private or conflicting lanes are resolved.",
    operatorMicrocopy: `PASS305 vault: disclosure ${disclosureScore}/100 · privacy ${privacyScore}/100 · redaction ${redactionPressure}/100 · prestige ${evidencePrestige}/100 · mode ${releaseMode}.`,
    psychologyRules: [
      "FOMO is inverted into selective disclosure: weaker proof shows less, not more urgency.",
      "Elite status is earned by visible evidence lanes and can be reduced by source drift.",
      "Customer trust comes from calm limitation text, not hidden ranking pressure.",
      "Operator proof stays richer than customer copy until redaction and replay boundaries agree.",
    ],
    blockedManipulationPatterns: [
      "No timer pressure.",
      "No trade action command.",
      "No broad safety wording from reserve, depth or provenance context.",
      "No hidden stale-source promotion.",
    ],
    innovation:
      "Selective Disclosure Vault: a Velmère-only UI pattern that dynamically reveals public summary, guided preview, redacted receipt or operator vault based on exchange depth, reserve snapshot, DPP-style provenance, source freshness, runtime faults and report-export redaction.",
  };
}
