import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";

export const PASS296_LUXURY_LIQUIDITY_PASSPORT_GATE = true;

export type LuxuryLiquidityPassportSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type LuxuryLiquidityPassportStatus =
  | "passport_ready"
  | "liquidity_review"
  | "source_first"
  | "operator_only";

export type LuxuryLiquidityPassportLane = {
  id: "identity" | "exchange_depth" | "traceability" | "social_context" | "elite_access";
  label: string;
  state: "sealed" | "review" | "waiting" | "blocked";
  note: string;
  proof: string;
};

export type LuxuryLiquidityPassportAction = {
  id: string;
  label: string;
  posture: "continue" | "slow" | "hold";
  reason: string;
};

export type LuxuryLiquidityPassportGate = {
  version: "velmere_luxury_liquidity_passport_gate_v1_pass296";
  surface: LuxuryLiquidityPassportSurface;
  query: string;
  passportId: string;
  status: LuxuryLiquidityPassportStatus;
  seal: string;
  readiness: number;
  luxuryStatus: "atelier" | "private_review" | "source_vault" | "locked";
  headline: string;
  lanes: LuxuryLiquidityPassportLane[];
  actions: LuxuryLiquidityPassportAction[];
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

function passportSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function containsDepthGap(text: string) {
  return /depth|orderbook|order book|liquidity|płynno|slippage|spread|market depth/i.test(text);
}

function sourceModeScore(results: VelmereSearchResult[]) {
  if (!results.length) return 42;
  return average(
    results.map((item) => {
      if (item.sourceMode === "live_table") return 76;
      if (item.sourceMode === "live") return 72;
      if (item.sourceMode === "table") return 58;
      if (item.sourceMode === "fallback") return 44;
      return 24;
    }),
    42,
  );
}

function routerScore(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 44);
}

function laneState(input: { score: number; blocked?: boolean; review?: boolean }): LuxuryLiquidityPassportLane["state"] {
  if (input.blocked) return "blocked";
  if (input.score >= 68 && !input.review) return "sealed";
  if (input.score >= 42 || input.review) return "review";
  return "waiting";
}

function statusFor(input: {
  readiness: number;
  depthGap: boolean;
  missingCount: number;
  sourceConfidence: number;
  socialWatch: number;
}): LuxuryLiquidityPassportStatus {
  if (input.sourceConfidence < 38 || input.missingCount >= 8) return "source_first";
  if (input.depthGap || input.socialWatch > 0) return "liquidity_review";
  if (input.readiness >= 74) return "passport_ready";
  return "operator_only";
}

function luxuryStatusFor(status: LuxuryLiquidityPassportStatus): LuxuryLiquidityPassportGate["luxuryStatus"] {
  if (status === "passport_ready") return "atelier";
  if (status === "liquidity_review") return "private_review";
  if (status === "source_first") return "source_vault";
  return "locked";
}

function headlineFor(status: LuxuryLiquidityPassportStatus) {
  if (status === "passport_ready") return "Luxury Liquidity Passport is ready for calm evidence review";
  if (status === "liquidity_review") return "Liquidity Passport keeps depth, spread and source proof in private review";
  if (status === "source_first") return "Liquidity Passport is holding at source identity before any public capsule";
  return "Liquidity Passport stays operator-only until proof, depth and redaction align";
}

export function buildLuxuryLiquidityPassportGate(input: {
  surface: LuxuryLiquidityPassportSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
}): LuxuryLiquidityPassportGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const sourceConfidence = average(results.map((item) => item.sourceConfidence), routerScore(routerSuggestions));
  const sourceMode = sourceModeScore(results);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const depthGap = results.some((item) => item.missingData.some(containsDepthGap) || containsDepthGap(item.nextOperatorStep));
  const socialWatch = routerSuggestions.filter((item) => item.status === "watch" || item.status === "review").length;
  const router = routerScore(routerSuggestions);
  const hasAnySignal = results.length > 0 || routerSuggestions.length > 0;
  const traceabilityScore = clampScore(sourceConfidence * 0.62 + sourceMode * 0.24 + (hasAnySignal ? 12 : 0) - missingCount * 1.8);
  const depthScore = clampScore((depthGap ? 44 : 72) + router * 0.16 - missingCount * 1.3);
  const socialScore = clampScore(router * 0.7 + sourceConfidence * 0.18 - socialWatch * 4);
  const readiness = clampScore(traceabilityScore * 0.42 + depthScore * 0.28 + socialScore * 0.18 + (hasAnySignal ? 12 : 0));
  const status = statusFor({ readiness, depthGap, missingCount, sourceConfidence, socialWatch });
  const luxuryStatus = luxuryStatusFor(status);
  const passportId = `VLM-PASS296-${passportSlug(query || input.surface)}-${readiness}`;

  const lanes: LuxuryLiquidityPassportLane[] = [
    {
      id: "identity",
      label: "Identity seal",
      state: laneState({ score: hasAnySignal ? 78 : 22, review: !hasAnySignal }),
      note: hasAnySignal ? "asset or research route recognized" : "waiting for asset, contract or topic identity",
      proof: "DPP-style identity first: no luxury seal without a clear object.",
    },
    {
      id: "exchange_depth",
      label: "Exchange depth",
      state: laneState({ score: depthScore, review: depthGap }),
      note: depthGap ? "orderbook/liquidity depth still needs venue proof" : "depth lane is not raising a hard stop",
      proof: "MEXC-style depth stays near the decision surface as liquidity context, not a trading instruction.",
    },
    {
      id: "traceability",
      label: "Traceability passport",
      state: laneState({ score: traceabilityScore, blocked: sourceConfidence < 34 }),
      note: `${Math.round(sourceConfidence)}% source confidence · ${missingCount} missing lanes`,
      proof: "LVMH/Aura-style traceability: visible provenance before premium status.",
    },
    {
      id: "social_context",
      label: "Social context",
      state: laneState({ score: socialScore, review: socialWatch > 0 }),
      note: socialWatch > 0 ? "trend attention becomes review priority, not pressure" : "social signal stays supporting evidence",
      proof: "Social ranking can prioritize review but cannot replace source or depth proof.",
    },
    {
      id: "elite_access",
      label: "Elite access boundary",
      state: laneState({ score: readiness, blocked: status === "source_first" }),
      note: status === "passport_ready" ? "private atelier status can be shown as proof" : "status language stays private until proof catches up",
      proof: "Luxury status is earned by evidence, not fake scarcity or countdowns.",
    },
  ];

  const actions: LuxuryLiquidityPassportAction[] = [
    {
      id: "open_passport_review",
      label: status === "source_first" ? "Resolve source passport" : "Open passport review",
      posture: status === "passport_ready" ? "continue" : status === "source_first" ? "hold" : "slow",
      reason: status === "source_first" ? "identity/source proof is too weak" : "depth, traceability and social lanes are visible for operator review",
    },
    {
      id: "attach_depth_snapshot",
      label: "Attach depth snapshot",
      posture: depthGap ? "hold" : "slow",
      reason: "venue depth/spread/liquidity context must sit beside the decision receipt",
    },
    {
      id: "write_customer_copy",
      label: "Draft customer-safe copy",
      posture: readiness >= 70 && status !== "source_first" ? "continue" : "hold",
      reason: "customer language unlocks only after traceability, redaction and missing-data boundaries are clear",
    },
  ];

  return {
    version: "velmere_luxury_liquidity_passport_gate_v1_pass296",
    surface: input.surface,
    query,
    passportId,
    status,
    seal: status === "passport_ready" ? "private proof seal" : status === "liquidity_review" ? "liquidity review seal" : "source vault seal",
    readiness,
    luxuryStatus,
    headline: headlineFor(status),
    lanes,
    actions,
    customerMicrocopy:
      status === "passport_ready"
        ? "This capsule has enough context for a calm review preview, but it is still not financial advice or a safety certificate."
        : "This capsule stays in review because evidence, depth or traceability is incomplete.",
    operatorMicrocopy:
      "PASS296 turns exchange depth + luxury provenance into a visible proof passport: source first, liquidity second, customer copy last.",
    psychologyRules: [
      "Use elite status as evidence-earned mastery, not fake scarcity.",
      "Put liquidity friction before action when orderbook/depth context is missing.",
      "Make traceability visible so trust feels premium and inspectable.",
      "Reward patience and proof, not speed, panic or social pressure.",
    ],
    blockedDarkPatterns: [
      "no countdown urgency",
      "no artificial allocation scarcity",
      "no profit or safety certainty",
      "no social-proof pressure without source proof",
      "no buy/sell instruction",
    ],
    innovation:
      "Velmère Luxury Liquidity Passport: a DPP-inspired market capsule that fuses exchange depth, source traceability and ethical elite-status psychology into one inspectable proof seal.",
  };
}
