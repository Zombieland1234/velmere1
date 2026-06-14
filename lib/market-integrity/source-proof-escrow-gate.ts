import type { VelmereSearchResult, VelmereSearchSourceMode } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";
import type { SourceAdapterContractMeshGate } from "@/lib/market-integrity/source-adapter-contract-mesh-gate";

export const PASS302_SOURCE_PROOF_ESCROW_GATE = true;

export type SourceProofEscrowSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type SourceProofEscrowReleaseState =
  | "release_ready"
  | "proof_review"
  | "escrow_cooldown"
  | "operator_hold";

export type SourceProofEscrowLaneId =
  | "exchange_depth"
  | "reserve_snapshot"
  | "contract_permissions"
  | "provenance_passport"
  | "redaction_boundary";

export type SourceProofEscrowLane = {
  id: SourceProofEscrowLaneId;
  label: string;
  state: "sealed" | "review" | "cooldown" | "locked";
  score: number;
  evidenceRule: string;
  publicCopyRule: string;
  operatorEscrowRule: string;
};

export type SourceProofEscrowAction = {
  id: string;
  label: string;
  posture: "release" | "review" | "cooldown" | "hold";
  reason: string;
  safeBoundary: string;
};

export type SourceProofEscrowGate = {
  version: "velmere_source_proof_escrow_gate_v1_pass302";
  surface: SourceProofEscrowSurface;
  query: string;
  escrowId: string;
  releaseState: SourceProofEscrowReleaseState;
  escrowScore: number;
  proofCompleteness: number;
  evidenceFriction: number;
  publicCopyReadiness: number;
  trustSeal: "atelier_release" | "private_review" | "cooldown_escrow" | "operator_vault";
  headline: string;
  lanes: SourceProofEscrowLane[];
  actions: SourceProofEscrowAction[];
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

function escrowSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function sourceScore(mode?: VelmereSearchSourceMode) {
  if (mode === "live_table") return 86;
  if (mode === "live") return 78;
  if (mode === "table") return 64;
  if (mode === "fallback") return 42;
  return 28;
}

function routerAverage(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 44);
}

function hasText(text: string, terms: RegExp) {
  return terms.test(text);
}

function laneState(score: number, friction: number): SourceProofEscrowLane["state"] {
  if (score < 36 || friction >= 76) return "locked";
  if (score < 56 || friction >= 62) return "cooldown";
  if (score < 76) return "review";
  return "sealed";
}

function releaseStateFor(input: { escrowScore: number; proofCompleteness: number; evidenceFriction: number; publicCopyReadiness: number; missingCount: number }): SourceProofEscrowReleaseState {
  if (input.evidenceFriction >= 74 || input.missingCount >= 10 || input.publicCopyReadiness < 38) return "operator_hold";
  if (input.evidenceFriction >= 58 || input.escrowScore < 48) return "escrow_cooldown";
  if (input.proofCompleteness >= 72 && input.publicCopyReadiness >= 68 && input.escrowScore >= 72) return "release_ready";
  return "proof_review";
}

function trustSealFor(state: SourceProofEscrowReleaseState): SourceProofEscrowGate["trustSeal"] {
  if (state === "release_ready") return "atelier_release";
  if (state === "proof_review") return "private_review";
  if (state === "escrow_cooldown") return "cooldown_escrow";
  return "operator_vault";
}

function headlineFor(state: SourceProofEscrowReleaseState) {
  if (state === "release_ready") return "Source Proof Escrow can release calm customer copy because depth, source and provenance lanes agree";
  if (state === "proof_review") return "Source Proof Escrow keeps the result in private review until proof lanes are better aligned";
  if (state === "escrow_cooldown") return "Source Proof Escrow adds friction because evidence exists but is not stable enough for premium copy";
  return "Source Proof Escrow locks public copy until operator review clears missing evidence and fault pressure";
}

function buildLane(input: {
  id: SourceProofEscrowLaneId;
  label: string;
  score: number;
  friction: number;
  evidenceRule: string;
  publicCopyRule: string;
  operatorEscrowRule: string;
}): SourceProofEscrowLane {
  return {
    id: input.id,
    label: input.label,
    state: laneState(input.score, input.friction),
    score: clampScore(input.score),
    evidenceRule: input.evidenceRule,
    publicCopyRule: input.publicCopyRule,
    operatorEscrowRule: input.operatorEscrowRule,
  };
}

export function buildSourceProofEscrowGate(input: {
  surface: SourceProofEscrowSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
  sourceAdapterContractMeshGate?: SourceAdapterContractMeshGate;
}): SourceProofEscrowGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const joinedText = [
    query,
    ...results.flatMap((item) => [item.title, item.summary, item.whyItMatters, item.nextOperatorStep, ...item.missingData, ...item.chips]),
    ...routerSuggestions.flatMap((item) => [item.symbol, item.name, item.reason ?? "", item.exchangeLabel, item.sourceLabel, item.socialLabel]),
  ].join(" ");

  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const resultSourceScore = average(results.map((item) => sourceScore(item.sourceMode)), routerAverage(routerSuggestions));
  const resultConfidence = average(results.map((item) => item.sourceConfidence), routerAverage(routerSuggestions));
  const routerScore = routerAverage(routerSuggestions);
  const meshScore = input.sourceAdapterContractMeshGate?.meshScore ?? average([resultSourceScore, resultConfidence, routerScore], 50);
  const adapterCoverage = input.sourceAdapterContractMeshGate?.adapterCoverage ?? clampScore(average([resultSourceScore, routerScore], 50) - missingCount * 1.4);
  const timeoutPressure = input.sourceAdapterContractMeshGate?.timeoutPressure ?? clampScore(100 - adapterCoverage + missingCount * 1.5);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - average([resultSourceScore, resultConfidence], 50) + missingCount * 3.2);

  const hasDepth = hasText(joinedText, /depth|orderbook|order book|liquidity|spread|slippage|market/i);
  const hasReserve = hasText(joinedText, /reserve|proof|por|wallet|custody|backing|merkle/i);
  const hasContract = hasText(joinedText, /contract|owner|proxy|mint|pause|tax|blacklist|permission/i);
  const hasProvenance = hasText(joinedText, /passport|provenance|traceability|authentic|lvmh|aura|dpp|ledger/i);
  const hasRedaction = hasText(joinedText, /redact|privacy|customer|operator|public|report|pdf|evidence/i) || input.surface !== "shield_terminal";

  const proofCompleteness = clampScore(
    average([hasDepth, hasReserve, hasContract, hasProvenance, hasRedaction].map((enabled) => (enabled ? 82 : 44)), 54) * 0.42 +
      adapterCoverage * 0.34 +
      meshScore * 0.16 -
      missingCount * 1.1,
  );
  const evidenceFriction = clampScore(
    timeoutPressure * 0.32 + faultPressure * 0.28 + (100 - proofCompleteness) * 0.26 + missingCount * 1.6,
  );
  const publicCopyReadiness = clampScore(resultConfidence * 0.28 + resultSourceScore * 0.24 + proofCompleteness * 0.32 + (100 - evidenceFriction) * 0.16);
  const escrowScore = clampScore(meshScore * 0.24 + proofCompleteness * 0.34 + publicCopyReadiness * 0.26 + (100 - evidenceFriction) * 0.16);
  const releaseState = releaseStateFor({ escrowScore, proofCompleteness, evidenceFriction, publicCopyReadiness, missingCount });
  const trustSeal = trustSealFor(releaseState);

  const lanes: SourceProofEscrowLane[] = [
    buildLane({
      id: "exchange_depth",
      label: "Exchange depth escrow",
      score: clampScore((hasDepth ? 80 : 48) + resultSourceScore * 0.15 - timeoutPressure * 0.08),
      friction: evidenceFriction,
      evidenceRule: "Depth/spread/slippage context must be visible near the decision surface before any market-status badge appears.",
      publicCopyRule: "Depth copy stays informational and never becomes a trade instruction or execution promise.",
      operatorEscrowRule: "If depth is stale or missing, keep the lane in review and require a second venue/source note.",
    }),
    buildLane({
      id: "reserve_snapshot",
      label: "Reserve snapshot escrow",
      score: clampScore((hasReserve ? 78 : 45) + resultConfidence * 0.14 - faultPressure * 0.08),
      friction: evidenceFriction + (hasReserve ? 0 : 8),
      evidenceRule: "Reserve/PoR data is treated as a dated transparency snapshot, not as a solvency or safety guarantee.",
      publicCopyRule: "Show source, limitation and snapshot wording; never promise backing, withdrawal safety or platform solvency.",
      operatorEscrowRule: "Operator view may keep raw reserve/source notes, but customer view receives only bounded summary copy.",
    }),
    buildLane({
      id: "contract_permissions",
      label: "Contract permission escrow",
      score: clampScore((hasContract ? 76 : 46) + adapterCoverage * 0.14 - missingCount * 1.2),
      friction: evidenceFriction + (hasContract ? 0 : 6),
      evidenceRule: "Owner, proxy, mint, pause, blacklist and tax permissions must stay separated from market/depth sentiment.",
      publicCopyRule: "Public copy can say review needed; it cannot label a contract as fraud/scam without proof review.",
      operatorEscrowRule: "Unsafe permission flags stay operator-first until source freshness and redaction checks pass.",
    }),
    buildLane({
      id: "provenance_passport",
      label: "Provenance passport escrow",
      score: clampScore((hasProvenance ? 80 : 48) + meshScore * 0.13 - timeoutPressure * 0.05),
      friction: evidenceFriction,
      evidenceRule: "DPP-style traceability links identity, source history and proof boundaries into one customer-readable passport.",
      publicCopyRule: "Luxury status is earned by provenance and data quality, not artificial scarcity or urgency.",
      operatorEscrowRule: "Missing passport data lowers the trust seal rather than creating hype language.",
    }),
    buildLane({
      id: "redaction_boundary",
      label: "Redaction boundary escrow",
      score: clampScore((hasRedaction ? 82 : 52) + publicCopyReadiness * 0.14 - faultPressure * 0.07),
      friction: evidenceFriction,
      evidenceRule: "Customer report, PDF and browser replay copy must be redacted before leaving operator-only context.",
      publicCopyRule: "No raw IP, secrets, personal data, wallet-sensitive payloads or stack traces in public proof copy.",
      operatorEscrowRule: "Escrow keeps raw evidence operator-only and exports a safe receipt rather than a raw payload.",
    }),
  ];

  const actions: SourceProofEscrowAction[] = [
    {
      id: "escrow_depth_first",
      label: releaseState === "release_ready" ? "Release proof receipt" : "Hold proof in escrow",
      posture: releaseState === "release_ready" ? "release" : releaseState === "operator_hold" ? "hold" : releaseState === "escrow_cooldown" ? "cooldown" : "review",
      reason: releaseState === "release_ready" ? "Source, depth, provenance and redaction lanes are aligned enough for calm copy." : "At least one proof lane still needs source freshness, adapter coverage or redaction review.",
      safeBoundary: "This is a review/proof receipt, not investment advice, safety certificate, solvency promise or buy/sell instruction.",
    },
    {
      id: "escalate_missing_lane",
      label: evidenceFriction >= 58 ? "Escalate missing lane" : "Keep source receipt attached",
      posture: evidenceFriction >= 74 ? "hold" : evidenceFriction >= 58 ? "cooldown" : "review",
      reason: `Evidence friction is ${evidenceFriction}/100 and missing-data count is ${missingCount}.`,
      safeBoundary: "Higher hype or weaker evidence increases friction; it never unlocks urgency copy.",
    },
  ];

  return {
    version: "velmere_source_proof_escrow_gate_v1_pass302",
    surface: input.surface,
    query,
    escrowId: `pass302-${escrowSlug(query || input.surface)}-${trustSeal}-${escrowScore}`,
    releaseState,
    escrowScore,
    proofCompleteness,
    evidenceFriction,
    publicCopyReadiness,
    trustSeal,
    headline: headlineFor(releaseState),
    lanes,
    actions,
    customerMicrocopy:
      releaseState === "release_ready"
        ? "Proof receipt can be shown calmly because source, depth and provenance lanes agree."
        : "Proof remains in escrow until source freshness, adapter coverage and redaction boundaries are clearer.",
    operatorMicrocopy: `PASS302 escrow: proof ${proofCompleteness}/100 · friction ${evidenceFriction}/100 · public copy ${publicCopyReadiness}/100 · mesh ${Math.round(meshScore)}/100.`,
    psychologyRules: [
      "FOMO is inverted into evidence friction: weaker data slows the journey instead of increasing urgency.",
      "Elite status is earned by verified source/provenance lanes, not fake scarcity, countdowns or social pressure.",
      "Customer copy receives a receipt and limitations; operator view keeps raw proof, faults and missing lanes.",
    ],
    blockedDarkPatterns: [
      "countdown timers",
      "fake urgency pressure",
      "buy/sell commands",
      "profit-promise or safety-certificate language",
      "proof-of-reserves framed as platform solvency promise",
    ],
    innovation:
      "Source Proof Escrow: a Velmère-only UI layer that holds premium proof copy in escrow until exchange depth, reserve snapshot, contract permissions, provenance passport and redaction lanes are aligned.",
  };
}
