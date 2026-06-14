import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";

export const PASS295_DECISION_FLOW_ORCHESTRATOR_GATE = true;

export type DecisionFlowSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type DecisionFlowStageId =
  | "identity"
  | "source_quorum"
  | "depth_context"
  | "social_context"
  | "operator_action";

export type DecisionFlowStage = {
  id: DecisionFlowStageId;
  label: string;
  state: "ready" | "review" | "blocked" | "waiting";
  note: string;
  microcopy: string;
};

export type DecisionFlowAction = {
  id: string;
  label: string;
  priority: "primary" | "secondary" | "hold";
  reason: string;
  safeBoundary: string;
};

export type DecisionFlowOrchestratorGate = {
  version: "velmere_decision_flow_orchestrator_gate_v1_pass295";
  surface: DecisionFlowSurface;
  query: string;
  status: "go_to_review" | "slow_down" | "source_first" | "blocked";
  headline: string;
  confidence: number;
  stages: DecisionFlowStage[];
  actions: DecisionFlowAction[];
  operatorReceipt: string;
  psychologyRules: string[];
  blockedDarkPatterns: string[];
  innovation: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeQuery(input?: string) {
  return (input ?? "").trim().slice(0, 80);
}

function resultSignals(results: VelmereSearchResult[]) {
  const sourceConfidence = average(results.map((item) => item.sourceConfidence), 38);
  const sourceModes = results.map((item) => item.sourceMode);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const blockedCount = results.filter((item) => item.tone === "blocked" || item.sourceMode === "missing").length;
  const watchCount = results.filter((item) => item.tone === "elevated" || item.tone === "review").length;
  const hasDepthGap = results.some((item) =>
    item.missingData.some((lane) => /depth|orderbook|liquidity|płynno/i.test(lane)),
  );

  return {
    sourceConfidence,
    sourceModes,
    missingCount,
    blockedCount,
    watchCount,
    hasDepthGap,
    hasLiveSource: sourceModes.some((mode) => mode === "live" || mode === "live_table"),
  };
}

function routerSignals(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  const routerScore = average(routerSuggestions.map((item) => item.routerScore), 42);
  const sourceFirstCount = routerSuggestions.filter((item) => item.status === "source_first").length;
  const watchCount = routerSuggestions.filter((item) => item.status === "watch").length;
  const reviewCount = routerSuggestions.filter((item) => item.status === "review").length;
  return { routerScore, sourceFirstCount, watchCount, reviewCount };
}

function stageState(input: {
  ready: boolean;
  blocked?: boolean;
  review?: boolean;
}): DecisionFlowStage["state"] {
  if (input.blocked) return "blocked";
  if (input.ready) return "ready";
  if (input.review) return "review";
  return "waiting";
}

export function buildDecisionFlowOrchestratorGate(input: {
  surface: DecisionFlowSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
}): DecisionFlowOrchestratorGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const result = resultSignals(results);
  const router = routerSignals(routerSuggestions);
  const hasAnySignal = results.length > 0 || routerSuggestions.length > 0;
  const sourceBlocked = result.blockedCount > 0 || result.sourceConfidence < 38 || router.sourceFirstCount >= Math.max(2, routerSuggestions.length);
  const depthReview = result.hasDepthGap || router.watchCount > 0;
  const socialReview = router.reviewCount > 0 || result.watchCount > 0;
  const confidence = clampScore(
    (hasAnySignal ? 26 : 12) + result.sourceConfidence * 0.34 + router.routerScore * 0.22 + (result.hasLiveSource ? 12 : 0) - result.missingCount * 2.6,
  );

  const status: DecisionFlowOrchestratorGate["status"] = sourceBlocked
    ? "source_first"
    : result.blockedCount > 0
      ? "blocked"
      : confidence >= 68 && !depthReview
        ? "go_to_review"
        : "slow_down";

  const stages: DecisionFlowStage[] = [
    {
      id: "identity",
      label: "Identity lock",
      state: stageState({ ready: hasAnySignal, review: !hasAnySignal }),
      note: hasAnySignal ? "asset, route or capsule is recognized" : "waiting for token, contract or topic identity",
      microcopy: "Start with identity before story, price or social noise.",
    },
    {
      id: "source_quorum",
      label: "Source quorum",
      state: stageState({ ready: result.sourceConfidence >= 62 || router.routerScore >= 66, blocked: sourceBlocked, review: true }),
      note: sourceBlocked ? "source-first boundary is active" : `${Math.round(result.sourceConfidence)}% source confidence · router ${Math.round(router.routerScore)}/100`,
      microcopy: "A ranked result must explain where confidence comes from.",
    },
    {
      id: "depth_context",
      label: "Depth context",
      state: stageState({ ready: !depthReview && hasAnySignal, review: depthReview }),
      note: depthReview ? "inspect orderbook/liquidity depth before stronger copy" : "depth lane is not raising a hard stop",
      microcopy: "Exchange-style depth stays near the decision, not hidden below the fold.",
    },
    {
      id: "social_context",
      label: "Social context",
      state: stageState({ ready: !socialReview && hasAnySignal, review: socialReview }),
      note: socialReview ? "social attention becomes review priority, not hype pressure" : "social signal is supporting evidence only",
      microcopy: "Meta/X-style ranking is visible and non-addictive.",
    },
    {
      id: "operator_action",
      label: "Operator action",
      state: stageState({ ready: status === "go_to_review", blocked: status === "source_first" || status === "blocked", review: status === "slow_down" }),
      note:
        status === "go_to_review"
          ? "open review surface with evidence receipt"
          : status === "source_first"
            ? "resolve identity/source before public summary"
            : "slow mode keeps the next step calm",
      microcopy: "One next action beats five competing CTAs.",
    },
  ];

  const actions: DecisionFlowAction[] = [
    {
      id: "open_evidence_surface",
      label: status === "source_first" ? "Resolve source first" : "Open evidence scan",
      priority: status === "go_to_review" ? "primary" : status === "source_first" ? "hold" : "secondary",
      reason: status === "source_first" ? "source identity is too weak for a public capsule" : "ranked signals are ready for human-readable review",
      safeBoundary: "No buy/sell instruction, no profit promise and no safety certificate.",
    },
    {
      id: "check_depth_and_social",
      label: "Check depth + social context",
      priority: depthReview || socialReview ? "primary" : "secondary",
      reason: "depth and narrative can change priority but cannot replace source evidence",
      safeBoundary: "Social pressure never lowers the evidence threshold.",
    },
    {
      id: "generate_receipt",
      label: "Generate calm decision receipt",
      priority: confidence >= 58 ? "secondary" : "hold",
      reason: "receipt records why the UI slowed down or allowed review",
      safeBoundary: "Receipt is an operator note, not financial advice.",
    },
  ];

  return {
    version: "velmere_decision_flow_orchestrator_gate_v1_pass295",
    surface: input.surface,
    query: normalizeQuery(input.query),
    status,
    headline:
      status === "go_to_review"
        ? "Decision Flow is ready for evidence review without hype pressure"
        : status === "source_first"
          ? "Decision Flow is holding the user at source-first verification"
          : "Decision Flow is slowing the action until depth, source and social context line up",
    confidence,
    stages,
    actions,
    operatorReceipt: `PASS295 receipt · ${status} · confidence ${confidence}/100 · no dark-pattern escalation`,
    psychologyRules: [
      "Reduce decision overload by showing one safe next action.",
      "Use status and exclusivity as calm mastery, not artificial scarcity.",
      "Make ranking reasons visible so the user can distrust the system when evidence is weak.",
      "Put friction before action when source, depth or social signals are incomplete.",
    ],
    blockedDarkPatterns: [
      "no countdown",
      "no infinite feed pressure",
      "no fake elite scarcity",
      "no profit or safety certainty",
      "no hidden engagement-only ranking",
    ],
    innovation:
      "Velmère Decision Flow Orchestrator: a transparent exchange + social ranking decision receipt that slows weak evidence and converts strong evidence into one calm operator action.",
  };
}
