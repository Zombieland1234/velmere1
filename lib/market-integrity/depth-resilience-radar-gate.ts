import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";

export const PASS297_DEPTH_RESILIENCE_RADAR_GATE = true;

export type DepthResilienceRadarSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type DepthResilienceRadarMode =
  | "resilient_depth"
  | "liquidity_shock_review"
  | "source_gap"
  | "operator_only";

export type DepthResilienceRadarRing = {
  id: "venue_depth" | "spread_resilience" | "source_freshness" | "traceability_link" | "status_friction";
  label: string;
  state: "clear" | "review" | "thin" | "blocked";
  value: number;
  note: string;
  proof: string;
};

export type DepthResilienceRadarAction = {
  id: string;
  label: string;
  posture: "continue" | "slow" | "hold";
  reason: string;
  operatorBoundary: string;
};

export type DepthResilienceRadarGate = {
  version: "velmere_depth_resilience_radar_gate_v1_pass297";
  surface: DepthResilienceRadarSurface;
  query: string;
  radarId: string;
  mode: DepthResilienceRadarMode;
  resilienceScore: number;
  shockPressure: number;
  proofGrade: "atelier" | "private_review" | "source_vault" | "locked";
  headline: string;
  rings: DepthResilienceRadarRing[];
  actions: DepthResilienceRadarAction[];
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

function radarSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function containsLiquidityGap(text: string) {
  return /depth|orderbook|order book|liquidity|płynno|slippage|spread|venue|resilien/i.test(text);
}

function sourceModeScore(results: VelmereSearchResult[]) {
  if (!results.length) return 40;
  return average(
    results.map((item) => {
      if (item.sourceMode === "live_table") return 78;
      if (item.sourceMode === "live") return 72;
      if (item.sourceMode === "table") return 58;
      if (item.sourceMode === "fallback") return 43;
      return 22;
    }),
    40,
  );
}

function routerScore(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 42);
}

function ringState(input: { value: number; blocked?: boolean; review?: boolean }): DepthResilienceRadarRing["state"] {
  if (input.blocked) return "blocked";
  if (input.value >= 72 && !input.review) return "clear";
  if (input.value >= 48 || input.review) return "review";
  return "thin";
}

function modeFor(input: {
  resilienceScore: number;
  shockPressure: number;
  sourceConfidence: number;
  missingCount: number;
  hasLiquidityGap: boolean;
}): DepthResilienceRadarMode {
  if (input.sourceConfidence < 36 || input.missingCount >= 8) return "source_gap";
  if (input.hasLiquidityGap || input.shockPressure >= 58) return "liquidity_shock_review";
  if (input.resilienceScore >= 74) return "resilient_depth";
  return "operator_only";
}

function proofGradeFor(mode: DepthResilienceRadarMode): DepthResilienceRadarGate["proofGrade"] {
  if (mode === "resilient_depth") return "atelier";
  if (mode === "liquidity_shock_review") return "private_review";
  if (mode === "source_gap") return "source_vault";
  return "locked";
}

function headlineFor(mode: DepthResilienceRadarMode) {
  if (mode === "resilient_depth") return "Depth Resilience Radar allows a calm review because depth, source and traceability are aligned";
  if (mode === "liquidity_shock_review") return "Depth Resilience Radar detects liquidity shock pressure and slows the decision surface";
  if (mode === "source_gap") return "Depth Resilience Radar is locked at source freshness before any stronger public capsule";
  return "Depth Resilience Radar stays operator-only until resilience, depth and traceability improve";
}

export function buildDepthResilienceRadarGate(input: {
  surface: DepthResilienceRadarSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
}): DepthResilienceRadarGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const sourceConfidence = average(results.map((item) => item.sourceConfidence), routerScore(routerSuggestions));
  const sourceFreshness = sourceModeScore(results);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const hasLiquidityGap = results.some((item) => item.missingData.some(containsLiquidityGap) || containsLiquidityGap(item.nextOperatorStep));
  const socialWatch = routerSuggestions.filter((item) => item.status === "watch" || item.status === "review").length;
  const sourceFirst = routerSuggestions.filter((item) => item.status === "source_first").length;
  const router = routerScore(routerSuggestions);
  const hasAnySignal = results.length > 0 || routerSuggestions.length > 0;

  const venueDepth = clampScore((hasLiquidityGap ? 42 : 74) + router * 0.14 - missingCount * 1.4);
  const spreadResilience = clampScore(venueDepth * 0.62 + sourceFreshness * 0.24 + (hasAnySignal ? 8 : 0) - socialWatch * 4);
  const traceability = clampScore(sourceConfidence * 0.66 + sourceFreshness * 0.24 + (hasAnySignal ? 8 : 0) - sourceFirst * 5 - missingCount * 1.6);
  const statusFriction = clampScore(64 + sourceFirst * 8 + socialWatch * 5 + (hasLiquidityGap ? 12 : 0) + Math.max(0, missingCount - 2) * 3);
  const shockPressure = clampScore((100 - spreadResilience) * 0.42 + statusFriction * 0.36 + socialWatch * 7 + (hasLiquidityGap ? 14 : 0));
  const resilienceScore = clampScore(venueDepth * 0.32 + spreadResilience * 0.26 + sourceFreshness * 0.16 + traceability * 0.18 + (hasAnySignal ? 8 : 0) - shockPressure * 0.12);
  const mode = modeFor({ resilienceScore, shockPressure, sourceConfidence, missingCount, hasLiquidityGap });
  const proofGrade = proofGradeFor(mode);
  const radarId = `VLM-PASS297-${radarSlug(query || input.surface)}-${resilienceScore}-${shockPressure}`;

  const rings: DepthResilienceRadarRing[] = [
    {
      id: "venue_depth",
      label: "Venue depth",
      state: ringState({ value: venueDepth, review: hasLiquidityGap }),
      value: venueDepth,
      note: hasLiquidityGap ? "depth/orderbook proof missing or thin" : "venue depth is not raising a hard stop",
      proof: "MEXC-style market depth stays on the decision surface as liquidity context, never as buy/sell advice.",
    },
    {
      id: "spread_resilience",
      label: "Spread resilience",
      state: ringState({ value: spreadResilience, review: shockPressure >= 58 }),
      value: spreadResilience,
      note: shockPressure >= 58 ? "shock pressure requires slower review" : "spread/depth resilience can stay in calm mode",
      proof: "Resilience radar watches whether shallow liquidity could amplify volatility or slower execution.",
    },
    {
      id: "source_freshness",
      label: "Source freshness",
      state: ringState({ value: sourceFreshness, blocked: sourceConfidence < 36 }),
      value: sourceFreshness,
      note: `${Math.round(sourceConfidence)}% confidence · ${missingCount} missing lanes`,
      proof: "Freshness controls public copy: stale or missing source data increases review pressure.",
    },
    {
      id: "traceability_link",
      label: "Traceability link",
      state: ringState({ value: traceability, blocked: sourceFirst >= Math.max(2, routerSuggestions.length) && routerSuggestions.length > 0 }),
      value: traceability,
      note: proofGrade === "atelier" ? "proof can be shown as premium status" : "passport/provenance proof remains private",
      proof: "LVMH/Aura-style product passport logic: trust is earned through provenance, not hype.",
    },
    {
      id: "status_friction",
      label: "Status friction",
      state: ringState({ value: 100 - statusFriction, review: statusFriction >= 62, blocked: mode === "source_gap" }),
      value: 100 - statusFriction,
      note: statusFriction >= 62 ? "elite status is slowed until evidence catches up" : "status layer can remain calm",
      proof: "FOMO becomes friction: high attention slows the interface instead of pushing action.",
    },
  ];

  const actions: DepthResilienceRadarAction[] = [
    {
      id: "attach_depth_resilience_snapshot",
      label: mode === "source_gap" ? "Resolve source freshness" : "Attach depth resilience snapshot",
      posture: mode === "resilient_depth" ? "continue" : mode === "source_gap" ? "hold" : "slow",
      reason: mode === "source_gap" ? "source freshness is too weak for public copy" : "venue depth, spread and resilience should be recorded beside the receipt",
      operatorBoundary: "No buy/sell command and no guaranteed execution, safety or profit language.",
    },
    {
      id: "open_private_passport_trace",
      label: "Open private passport trace",
      posture: traceability >= 70 && mode !== "source_gap" ? "continue" : "slow",
      reason: "traceability links the asset/search object to source proof before premium status is shown",
      operatorBoundary: "Premium status is evidence-earned, not artificial scarcity.",
    },
    {
      id: "cooldown_social_pressure",
      label: "Cooldown social pressure",
      posture: socialWatch > 0 || shockPressure >= 58 ? "hold" : "slow",
      reason: "trend attention can raise review priority, but cannot lower the evidence threshold",
      operatorBoundary: "No countdowns, no feed pressure and no emotional urgency copy.",
    },
  ];

  return {
    version: "velmere_depth_resilience_radar_gate_v1_pass297",
    surface: input.surface,
    query,
    radarId,
    mode,
    resilienceScore,
    shockPressure,
    proofGrade,
    headline: headlineFor(mode),
    rings,
    actions,
    customerMicrocopy:
      mode === "resilient_depth"
        ? "Depth, source and traceability are aligned enough for a calm review preview, but this is still not financial advice or a safety certificate."
        : "This capsule stays in private review because liquidity resilience, source freshness or traceability is incomplete.",
    operatorMicrocopy:
      "PASS297 turns MEXC-style market depth + LVMH/Aura-style provenance into a resilience radar: shallow depth slows the UI and high-status copy waits for proof.",
    psychologyRules: [
      "Convert FOMO into friction when depth, spread or source evidence is weak.",
      "Use elite status only after traceability and source freshness are visible.",
      "Show liquidity shock pressure as a calm review reason, not as panic copy.",
      "Keep one operator action per weak lane to reduce decision overload.",
    ],
    blockedDarkPatterns: [
      "no countdown",
      "no forced urgency",
      "no fake private allocation",
      "no profit promise",
      "no safety certificate wording",
    ],
    innovation:
      "Velmère Depth Resilience Radar: a luxury-exchange UI layer that turns orderbook depth, source freshness and provenance into animated proof rings that slow decisions when evidence is thin.",
  };
}
