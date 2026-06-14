import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";

export const PASS298_RESERVE_PROVENANCE_TWIN_GATE = true;

export type ReserveProvenanceTwinSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type ReserveProvenanceTwinMode =
  | "reserve_backed_proof"
  | "provenance_review"
  | "liquidity_reserve_gap"
  | "operator_vault";

export type ReserveProvenanceTwinLane = {
  id: "reserve_proof" | "depth_context" | "provenance_passport" | "source_quorum" | "customer_boundary";
  label: string;
  state: "sealed" | "review" | "thin" | "vault";
  score: number;
  note: string;
  proof: string;
};

export type ReserveProvenanceTwinAction = {
  id: string;
  label: string;
  posture: "continue" | "slow" | "hold";
  reason: string;
  safeBoundary: string;
};

export type ReserveProvenanceTwinGate = {
  version: "velmere_reserve_provenance_twin_gate_v1_pass298";
  surface: ReserveProvenanceTwinSurface;
  query: string;
  twinId: string;
  mode: ReserveProvenanceTwinMode;
  reserveScore: number;
  provenanceScore: number;
  liquidityReserveGap: number;
  trustTier: "atelier_seal" | "private_trace" | "source_quarantine" | "vault_locked";
  headline: string;
  lanes: ReserveProvenanceTwinLane[];
  actions: ReserveProvenanceTwinAction[];
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

function twinSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function sourceModeScore(results: VelmereSearchResult[]) {
  if (!results.length) return 40;
  return average(
    results.map((item) => {
      if (item.sourceMode === "live_table") return 82;
      if (item.sourceMode === "live") return 74;
      if (item.sourceMode === "table") return 61;
      if (item.sourceMode === "fallback") return 42;
      return 25;
    }),
    40,
  );
}

function routerScore(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 42);
}

function containsReserveOrProvenanceGap(text: string) {
  return /reserve|proof of reserve|por|backing|custody|wallet|merkle|passport|provenance|traceability|authentic|source|freshness|depth|liquidity|spread|orderbook|order book/i.test(text);
}

function laneState(input: { score: number; review?: boolean; vault?: boolean }): ReserveProvenanceTwinLane["state"] {
  if (input.vault) return "vault";
  if (input.score >= 74 && !input.review) return "sealed";
  if (input.score >= 50 || input.review) return "review";
  return "thin";
}

function modeFor(input: {
  reserveScore: number;
  provenanceScore: number;
  liquidityReserveGap: number;
  sourceConfidence: number;
  missingCount: number;
  hasReserveOrProvenanceGap: boolean;
}): ReserveProvenanceTwinMode {
  if (input.sourceConfidence < 35 || input.missingCount >= 8) return "operator_vault";
  if (input.hasReserveOrProvenanceGap || input.liquidityReserveGap >= 60) return "liquidity_reserve_gap";
  if (input.reserveScore >= 72 && input.provenanceScore >= 70) return "reserve_backed_proof";
  return "provenance_review";
}

function trustTierFor(mode: ReserveProvenanceTwinMode): ReserveProvenanceTwinGate["trustTier"] {
  if (mode === "reserve_backed_proof") return "atelier_seal";
  if (mode === "provenance_review") return "private_trace";
  if (mode === "liquidity_reserve_gap") return "source_quarantine";
  return "vault_locked";
}

function headlineFor(mode: ReserveProvenanceTwinMode) {
  if (mode === "reserve_backed_proof") return "Reserve-Provenance Twin can show a calm proof seal because reserve, depth and provenance lanes agree";
  if (mode === "provenance_review") return "Reserve-Provenance Twin keeps the item in private review until provenance and source quorum are stronger";
  if (mode === "liquidity_reserve_gap") return "Reserve-Provenance Twin detected a reserve/depth gap and slows the customer-facing surface";
  return "Reserve-Provenance Twin stays locked in the operator vault until source freshness and reserve proof improve";
}

export function buildReserveProvenanceTwinGate(input: {
  surface: ReserveProvenanceTwinSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
}): ReserveProvenanceTwinGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const sourceConfidence = average(results.map((item) => item.sourceConfidence), routerScore(routerSuggestions));
  const sourceFreshness = sourceModeScore(results);
  const router = routerScore(routerSuggestions);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const hasReserveOrProvenanceGap = results.some((item) => item.missingData.some(containsReserveOrProvenanceGap) || containsReserveOrProvenanceGap(item.nextOperatorStep));
  const sourceFirst = routerSuggestions.filter((item) => item.status === "source_first").length;
  const socialReview = routerSuggestions.filter((item) => item.status === "watch" || item.status === "review").length;
  const hasAnySignal = results.length > 0 || routerSuggestions.length > 0;

  const reserveScore = clampScore(sourceFreshness * 0.42 + sourceConfidence * 0.26 + router * 0.18 + (hasAnySignal ? 10 : 0) - missingCount * 1.6 - sourceFirst * 5);
  const depthContext = clampScore((hasReserveOrProvenanceGap ? 46 : 74) + router * 0.15 + sourceFreshness * 0.1 - socialReview * 3 - missingCount * 1.2);
  const provenanceScore = clampScore(sourceConfidence * 0.44 + sourceFreshness * 0.22 + router * 0.16 + (hasAnySignal ? 12 : 0) - missingCount * 1.4 - sourceFirst * 4);
  const sourceQuorum = clampScore(sourceConfidence * 0.52 + sourceFreshness * 0.32 + (routerSuggestions.length >= 3 ? 8 : 0) - missingCount * 1.5);
  const customerBoundary = clampScore(64 + sourceFirst * 9 + socialReview * 5 + (hasReserveOrProvenanceGap ? 12 : 0) + Math.max(0, missingCount - 2) * 3);
  const liquidityReserveGap = clampScore((100 - depthContext) * 0.34 + (100 - reserveScore) * 0.34 + customerBoundary * 0.24 + (hasReserveOrProvenanceGap ? 12 : 0));
  const mode = modeFor({ reserveScore, provenanceScore, liquidityReserveGap, sourceConfidence, missingCount, hasReserveOrProvenanceGap });
  const trustTier = trustTierFor(mode);
  const twinId = `VLM-PASS298-${twinSlug(query || input.surface)}-${reserveScore}-${provenanceScore}`;

  const lanes: ReserveProvenanceTwinLane[] = [
    {
      id: "reserve_proof",
      label: "Reserve proof",
      state: laneState({ score: reserveScore, review: sourceFirst > 0 || hasReserveOrProvenanceGap, vault: sourceConfidence < 35 }),
      score: reserveScore,
      note: sourceFirst > 0 ? "source-first route requires external reserve or custody proof" : "reserve/backing signal can be recorded beside the receipt",
      proof: "MEXC-style Proof of Reserves thinking: reserve backing is a transparency lane, not a promise of profit or safety.",
    },
    {
      id: "depth_context",
      label: "Depth context",
      state: laneState({ score: depthContext, review: liquidityReserveGap >= 60 }),
      score: depthContext,
      note: liquidityReserveGap >= 60 ? "thin liquidity or source gap slows the decision" : "depth context is stable enough for calm review",
      proof: "Order depth remains next to the decision surface because shallow depth can affect execution quality and volatility.",
    },
    {
      id: "provenance_passport",
      label: "Provenance passport",
      state: laneState({ score: provenanceScore, review: mode !== "reserve_backed_proof" }),
      score: provenanceScore,
      note: trustTier === "atelier_seal" ? "passport can become a premium proof seal" : "passport stays private until traceability catches up",
      proof: "LVMH/Aura-style DPP logic: provenance and authenticity must be visible before luxury status appears.",
    },
    {
      id: "source_quorum",
      label: "Source quorum",
      state: laneState({ score: sourceQuorum, vault: sourceConfidence < 35 }),
      score: sourceQuorum,
      note: `${Math.round(sourceConfidence)}% confidence · ${missingCount} missing lanes`,
      proof: "Quorum separates live/table/local/fallback sources so customer copy cannot outrun evidence.",
    },
    {
      id: "customer_boundary",
      label: "Customer boundary",
      state: laneState({ score: 100 - customerBoundary, review: customerBoundary >= 62, vault: mode === "operator_vault" }),
      score: 100 - customerBoundary,
      note: customerBoundary >= 62 ? "public copy is slowed; operator receipt stays private" : "customer copy can stay calm and limited",
      proof: "FOMO becomes a brake: attention, scarcity and status cannot override missing reserve/provenance proof.",
    },
  ];

  const actions: ReserveProvenanceTwinAction[] = [
    {
      id: "attach_reserve_snapshot",
      label: mode === "operator_vault" ? "Resolve reserve/source vault" : "Attach reserve snapshot",
      posture: mode === "reserve_backed_proof" ? "continue" : mode === "operator_vault" ? "hold" : "slow",
      reason: mode === "operator_vault" ? "source freshness is too weak for public proof" : "reserve/backing context must sit beside depth and provenance proof",
      safeBoundary: "No solvency guarantee, no buy/sell command and no safety certificate wording.",
    },
    {
      id: "link_provenance_passport",
      label: "Link provenance passport",
      posture: provenanceScore >= 70 && mode !== "operator_vault" ? "continue" : "slow",
      reason: "luxury status unlocks only when identity, source and traceability are coherent",
      safeBoundary: "Premium access is evidence-earned, never fake scarcity or countdown pressure.",
    },
    {
      id: "cooldown_customer_copy",
      label: "Cooldown customer copy",
      posture: liquidityReserveGap >= 60 || socialReview > 0 ? "hold" : "slow",
      reason: "market attention, thin depth or proof gaps must increase review friction",
      safeBoundary: "Customer text can say review/uncertainty only; operator-only details stay private.",
    },
  ];

  return {
    version: "velmere_reserve_provenance_twin_gate_v1_pass298",
    surface: input.surface,
    query,
    twinId,
    mode,
    reserveScore,
    provenanceScore,
    liquidityReserveGap,
    trustTier,
    headline: headlineFor(mode),
    lanes,
    actions,
    customerMicrocopy:
      mode === "reserve_backed_proof"
        ? "Reserve, depth and provenance are aligned enough for a calm proof seal, still without investment advice."
        : mode === "operator_vault"
          ? "Reserve/provenance proof is incomplete, so the public surface stays locked and operator review comes first."
          : "Reserve, depth and provenance are still being stitched together; Velmère slows the interface instead of creating urgency.",
    operatorMicrocopy: `Reserve ${reserveScore}/100 · provenance ${provenanceScore}/100 · gap ${liquidityReserveGap}/100 · ${trustTier.replaceAll("_", " ")}.`,
    psychologyRules: [
      "Elite status is earned by reserve/provenance proof, not artificial scarcity.",
      "FOMO becomes friction when reserve, depth, traceability or source quorum is weak.",
      "The UI shows why the system slows down instead of hiding ranking logic.",
      "Customer copy stays smaller than operator evidence and never claims guaranteed safety.",
    ],
    blockedDarkPatterns: [
      "no countdown urgency",
      "no limited-slots pressure",
      "no buy/sell command",
      "no guaranteed solvency, profit or safety wording",
      "no hidden engagement-only ranking",
    ],
    innovation:
      "Reserve-Provenance Twin merges exchange transparency, market depth and luxury digital-passport proof into one calm gate: the more hype rises, the more evidence the interface requires.",
  };
}
