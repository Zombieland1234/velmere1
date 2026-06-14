import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainLiveAdapterFreshnessMesh, VlmBrainLiveAdapterFreshnessLane } from "./vlm-brain-live-adapter-freshness";

export type VlmBrainSourcePolicyLane = {
  id: string;
  label: string;
  adapterLane: string;
  policyState: "allowed_preview" | "needs_second_source" | "blocked_until_allowlisted";
  reviewerGate: "operator_required" | "lead_required" | "blocked";
  sourceClass: "market" | "chain" | "contract" | "social" | "report";
  evidenceUse: "customer_context_after_review" | "operator_only" | "never_customer_copy";
  mustNeverClaim: string[];
  nextPolicyAction: string;
};

export type VlmBrainSourcePolicyGate = {
  schemaVersion: "vlm-brain-source-policy-gate-v1-pass218";
  gateMode: "operator_source_policy_preview";
  policyId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  freshnessMeshId: string;
  policyDecision: "blocked" | "lead_review" | "operator_review" | "preview_only";
  allowlistMode: "not_connected";
  trustedPreviewLaneCount: number;
  blockedLaneCount: number;
  secondSourceRequiredCount: number;
  customerCopy: "blocked" | "review_locked" | "context_only";
  lanes: VlmBrainSourcePolicyLane[];
  operatorSummary: string;
  customerBoundary: string;
};

const PASS218_SOURCE_POLICY_GATE_SCHEMA = "vlm-brain-source-policy-gate-v1-pass218" as const;

function compact(value: unknown, fallback = "source policy review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-SOURCE-POLICY", 240)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sourceClassFor(lane: VlmBrainLiveAdapterFreshnessLane): VlmBrainSourcePolicyLane["sourceClass"] {
  if (lane.adapterLane === "holders") return "chain";
  if (lane.adapterLane === "contract") return "contract";
  if (lane.adapterLane === "osint") return "social";
  if (lane.adapterLane === "unlocks") return "report";
  return "market";
}

function policyStateFor(lane: VlmBrainLiveAdapterFreshnessLane): VlmBrainSourcePolicyLane["policyState"] {
  if (lane.hardStop || lane.state === "blocked" || lane.state === "expired") return "blocked_until_allowlisted";
  if (lane.state === "stale" || lane.state === "usable" || lane.customerCopyGate !== "context_after_review") return "needs_second_source";
  return "allowed_preview";
}

function reviewerGateFor(policyState: VlmBrainSourcePolicyLane["policyState"], sourceClass: VlmBrainSourcePolicyLane["sourceClass"]): VlmBrainSourcePolicyLane["reviewerGate"] {
  if (policyState === "blocked_until_allowlisted") return "blocked";
  if (sourceClass === "contract" || sourceClass === "social" || policyState === "needs_second_source") return "lead_required";
  return "operator_required";
}

function evidenceUseFor(policyState: VlmBrainSourcePolicyLane["policyState"]): VlmBrainSourcePolicyLane["evidenceUse"] {
  if (policyState === "allowed_preview") return "customer_context_after_review";
  if (policyState === "needs_second_source") return "operator_only";
  return "never_customer_copy";
}

function neverClaimsFor(sourceClass: VlmBrainSourcePolicyLane["sourceClass"]) {
  if (sourceClass === "contract") return ["contract safe", "scam confirmed", "fraud proven"];
  if (sourceClass === "social") return ["paid shill proven", "criminal intent", "coordinated fraud proven"];
  if (sourceClass === "chain") return ["ownership fully known", "all wallets identified", "whale intent proven"];
  if (sourceClass === "market") return ["guaranteed price accuracy", "exit liquidity verified", "slippage guaranteed"];
  return ["no unlock risk", "supply schedule fully verified without sources"];
}

function nextPolicyActionFor(policyState: VlmBrainSourcePolicyLane["policyState"], lane: VlmBrainLiveAdapterFreshnessLane) {
  if (policyState === "allowed_preview") return `Keep ${lane.label} as redacted context and attach source id/timestamp before public summary.`;
  if (policyState === "needs_second_source") return `Add a second source or lead review for ${lane.label} before customer copy.`;
  return `Block ${lane.label} from customer copy until the source is allowlisted, refreshed and durably stored.`;
}

function decisionFor(lanes: VlmBrainSourcePolicyLane[]): VlmBrainSourcePolicyGate["policyDecision"] {
  if (lanes.some((lane) => lane.policyState === "blocked_until_allowlisted")) return "blocked";
  if (lanes.some((lane) => lane.reviewerGate === "lead_required")) return "lead_review";
  if (lanes.some((lane) => lane.reviewerGate === "operator_required")) return "operator_review";
  return "preview_only";
}

function customerCopyFor(decision: VlmBrainSourcePolicyGate["policyDecision"]): VlmBrainSourcePolicyGate["customerCopy"] {
  if (decision === "blocked") return "blocked";
  if (decision === "lead_review" || decision === "operator_review") return "review_locked";
  return "context_only";
}

export function buildVlmBrainSourcePolicyGate(
  freshnessMesh: VlmBrainLiveAdapterFreshnessMesh,
  result: TokenRiskResult,
): VlmBrainSourcePolicyGate {
  const createdAt = result.generatedAt ?? freshnessMesh.createdAt ?? new Date().toISOString();
  const lanes = freshnessMesh.lanes.map((lane) => {
    const sourceClass = sourceClassFor(lane);
    const policyState = policyStateFor(lane);
    const reviewerGate = reviewerGateFor(policyState, sourceClass);
    return {
      id: lane.id,
      label: lane.label,
      adapterLane: lane.adapterLane,
      policyState,
      reviewerGate,
      sourceClass,
      evidenceUse: evidenceUseFor(policyState),
      mustNeverClaim: neverClaimsFor(sourceClass),
      nextPolicyAction: compact(nextPolicyActionFor(policyState, lane)),
    } satisfies VlmBrainSourcePolicyLane;
  });
  const policyDecision = decisionFor(lanes);
  return {
    schemaVersion: PASS218_SOURCE_POLICY_GATE_SCHEMA,
    gateMode: "operator_source_policy_preview",
    policyId: stableId(`VLM-SOURCE-POLICY-${freshnessMesh.token.symbol}-${freshnessMesh.meshId}-${createdAt}`),
    createdAt,
    token: freshnessMesh.token,
    freshnessMeshId: freshnessMesh.meshId,
    policyDecision,
    allowlistMode: "not_connected",
    trustedPreviewLaneCount: lanes.filter((lane) => lane.policyState === "allowed_preview").length,
    blockedLaneCount: lanes.filter((lane) => lane.policyState === "blocked_until_allowlisted").length,
    secondSourceRequiredCount: lanes.filter((lane) => lane.policyState === "needs_second_source").length,
    customerCopy: customerCopyFor(policyDecision),
    lanes,
    operatorSummary:
      policyDecision === "blocked"
        ? "At least one lane is not allowlisted or fresh enough. Keep the tile internal and block customer/PDF wording."
        : policyDecision === "lead_review"
          ? "Lead review is required because a sensitive source class or second-source debt is present."
          : policyDecision === "operator_review"
            ? "Operator review can continue, but customer copy stays locked until source policy is confirmed."
            : "Policy preview is clean enough for internal context after manual review; durable allowlist is still not connected.",
    customerBoundary:
      "Source policy is not an accusation engine. It only decides whether evidence may be used as redacted context, operator-only context or never customer copy.",
  };
}

export const PASS218_VLM_BRAIN_SOURCE_POLICY_GATE_CONTRACT = true;
