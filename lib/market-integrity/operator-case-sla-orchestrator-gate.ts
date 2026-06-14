import type { TokenRiskResult } from "./risk-types";
import type { AnalyticsEventTaxonomyGate } from "./analytics-event-taxonomy-gate";
import type { PrivacyRedactionEnvelopeGate } from "./privacy-redaction-envelope-gate";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";
import type { StorageAdapterContractGate } from "./storage-adapter-contract-gate";

export type OperatorCaseSlaTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type OperatorCaseSlaStatus =
  | "case_owner_missing"
  | "p0_review_queue"
  | "sla_clock_running"
  | "private_concierge_case";

export type OperatorCaseSlaRail = {
  id: "owner" | "sla" | "priority" | "proof" | "handoff" | "seal";
  label: string;
  value: string;
  tone: OperatorCaseSlaTone;
  note: string;
};

export type OperatorCaseSlaStage = {
  id:
    | "intake"
    | "source_replay"
    | "redaction_review"
    | "storage_write"
    | "operator_note"
    | "customer_boundary"
    | "reopen_trigger";
  label: string;
  state: "ready" | "queued" | "operator_only" | "blocked";
  priority: "P0" | "P1" | "P2" | "P3";
  sla: string;
  note: string;
};

export type OperatorCaseSlaOrchestratorGate = {
  version: "velmere_operator_case_sla_orchestrator_gate_v1_pass283";
  status: OperatorCaseSlaStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: OperatorCaseSlaRail[];
  stages: OperatorCaseSlaStage[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function stablePart(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "missing";
  return String(value).trim().toLowerCase();
}

function shortHash(payload: string) {
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function parseScore(value?: string) {
  const raw = value?.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

function toneFromStress(score: number): OperatorCaseSlaTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function stageStress(state: OperatorCaseSlaStage["state"], priority: OperatorCaseSlaStage["priority"]) {
  const stateCost =
    state === "ready" ? 10 : state === "queued" ? 34 : state === "operator_only" ? 58 : 86;
  const priorityCost = priority === "P0" ? 24 : priority === "P1" ? 14 : priority === "P2" ? 8 : 4;
  return stateCost + priorityCost;
}

function buildCaseId(result: TokenRiskResult, storageGate: StorageAdapterContractGate, privacyGate: PrivacyRedactionEnvelopeGate) {
  const seed = [
    stablePart(result.token.marketId),
    stablePart(result.token.chainId),
    stablePart(result.token.tokenAddress),
    stablePart(result.token.symbol),
    stablePart(result.generatedAt).slice(0, 13),
    storageGate.status,
    privacyGate.status,
  ].join("|");
  return `VCASE-${shortHash(seed).slice(0, 4)}-${shortHash(`${seed}|operator-sla`).slice(0, 6)}`;
}

function hasBlockedLane(gate: PrivacyRedactionEnvelopeGate) {
  return gate.lanes.some((lane) => lane.exposure === "blocked_raw");
}

function missingFreshness(gate: SourceFreshnessRegistryGate) {
  return gate.entries.some((entry) => entry.state === "missing" || entry.state === "stale" || entry.state === "blocked");
}

export function buildOperatorCaseSlaOrchestratorGate(
  result: TokenRiskResult,
  sourceFreshnessRegistryGate: SourceFreshnessRegistryGate,
  analyticsEventTaxonomyGate: AnalyticsEventTaxonomyGate,
  storageAdapterContractGate: StorageAdapterContractGate,
  privacyRedactionEnvelopeGate: PrivacyRedactionEnvelopeGate,
): OperatorCaseSlaOrchestratorGate {
  const hasMarketIdentity = Boolean(result.token.marketId || result.token.symbol);
  const hasContractIdentity = Boolean(result.token.chainId && result.token.tokenAddress);
  const hasOwner = false;
  const storageBlocked = storageAdapterContractGate.status === "server_adapter_missing";
  const privacyBlocked = hasBlockedLane(privacyRedactionEnvelopeGate);
  const freshnessBlocked = missingFreshness(sourceFreshnessRegistryGate);
  const analyticsBlocked = analyticsEventTaxonomyGate.lanes.some((lane) => lane.status === "blocked");
  const caseId = buildCaseId(result, storageAdapterContractGate, privacyRedactionEnvelopeGate);

  const stages: OperatorCaseSlaStage[] = [
    {
      id: "intake",
      label: "case intake",
      state: hasMarketIdentity ? "queued" : "blocked",
      priority: result.score >= 72 ? "P0" : result.score >= 52 ? "P1" : "P2",
      sla: result.score >= 72 ? "15m human review" : result.score >= 52 ? "60m review" : "next batch",
      note: "token modal creates an operator case preview without exposing customer identity or wallet data",
    },
    {
      id: "source_replay",
      label: "source replay",
      state: freshnessBlocked ? "operator_only" : "ready",
      priority: freshnessBlocked ? "P1" : "P2",
      sla: freshnessBlocked ? "refresh before summary" : "attach replay id",
      note: "chart, depth and source TTL must be replayed before any customer-facing summary",
    },
    {
      id: "redaction_review",
      label: "redaction review",
      state: privacyBlocked ? "blocked" : "operator_only",
      priority: privacyBlocked ? "P0" : "P1",
      sla: privacyBlocked ? "stop raw payload" : "mask before export",
      note: "raw query, wallet/IP, analytics payload and operator notes stay quarantined until masked",
    },
    {
      id: "storage_write",
      label: "storage write",
      state: storageBlocked ? "blocked" : "operator_only",
      priority: storageBlocked ? "P0" : "P1",
      sla: storageBlocked ? "server adapter required" : "append receipt",
      note: "browser/localStorage previews cannot be treated as durable case evidence",
    },
    {
      id: "operator_note",
      label: "operator note",
      state: hasOwner ? "ready" : "queued",
      priority: hasOwner ? "P2" : "P1",
      sla: hasOwner ? "owner attached" : "assign owner",
      note: "next action is concise, private and limitations-first; no accusation or regulated advice",
    },
    {
      id: "customer_boundary",
      label: "customer boundary",
      state: privacyBlocked || storageBlocked || !hasContractIdentity ? "operator_only" : "ready",
      priority: privacyBlocked || storageBlocked ? "P1" : "P2",
      sla: "limitations first",
      note: "customer copy may describe review status and source limits only, never a safety certificate",
    },
    {
      id: "reopen_trigger",
      label: "reopen trigger",
      state: result.dataQuality === "live" && !freshnessBlocked ? "queued" : "operator_only",
      priority: result.dataQuality === "live" ? "P2" : "P1",
      sla: "recheck on source decay",
      note: "TTL decay, new unlock, depth gap or contract change reopens the case instead of pushing urgency",
    },
  ];

  const stageScore = Math.round(
    clamp(stages.reduce((sum, stage) => sum + stageStress(stage.state, stage.priority), 0) / stages.length),
  );
  const privacyScore = parseScore(privacyRedactionEnvelopeGate.trustBadge) ?? 74;
  const storageScore = parseScore(storageAdapterContractGate.trustBadge) ?? 76;
  const freshnessScore = parseScore(sourceFreshnessRegistryGate.trustBadge) ?? 70;
  const analyticsScore = parseScore(analyticsEventTaxonomyGate.trustBadge) ?? 64;
  const ownerStress = hasOwner ? 10 : 58;
  const identityStress = hasContractIdentity ? 18 : hasMarketIdentity ? 42 : 72;
  const caseStress = Math.round(
    clamp(
      stageScore * 0.36 +
        privacyScore * 0.17 +
        storageScore * 0.16 +
        freshnessScore * 0.12 +
        analyticsScore * 0.08 +
        ownerStress * 0.07 +
        identityStress * 0.04,
    ),
  );

  const blockers = [
    !hasOwner ? "case owner not assigned" : null,
    privacyBlocked ? "raw/redaction lane blocked" : null,
    storageBlocked ? "server case storage missing" : null,
    freshnessBlocked ? "source replay / freshness gap" : null,
    analyticsBlocked ? "blocked analytics event lane" : null,
    !hasContractIdentity ? "chain/contract identity incomplete" : null,
  ].filter((item): item is string => Boolean(item));

  const status: OperatorCaseSlaStatus =
    !hasOwner || storageBlocked
      ? "case_owner_missing"
      : privacyBlocked || caseStress >= 74
        ? "p0_review_queue"
        : blockers.length >= 2 || caseStress >= 46
          ? "sla_clock_running"
          : "private_concierge_case";

  const headline =
    status === "case_owner_missing"
      ? "operator case owner required"
      : status === "p0_review_queue"
        ? "P0 review queue"
        : status === "sla_clock_running"
          ? "SLA clock running"
          : "Private Concierge Case";

  const operatorCue =
    status === "case_owner_missing"
      ? "The Concierge Escalation Rail creates a case preview but freezes elite status until an owner, server storage and masked evidence are attached. No urgency copy is allowed."
      : status === "p0_review_queue"
        ? "The case is high-priority because privacy, source or storage proof is not complete. Anti-FOMO language keeps the user in review mode rather than nudging a trade."
        : status === "sla_clock_running"
          ? "The operator timeline is active: source replay, redaction and storage stages must close before any public summary or report preview."
          : "The private concierge case can support quiet trust: owner, source replay, redaction and case timeline are aligned without pressure tactics.";

  const p0Count = stages.filter((stage) => stage.priority === "P0").length;
  const blockedCount = stages.filter((stage) => stage.state === "blocked").length;
  const nextAction =
    blockedCount > 0
      ? "assign owner, close blocked storage/redaction stages, then replay source freshness"
      : p0Count > 0
        ? "clear P0 review queue before customer copy"
        : "attach owner note and schedule TTL-based reopen trigger";

  return {
    version: "velmere_operator_case_sla_orchestrator_gate_v1_pass283",
    status,
    headline,
    trustBadge: `case SLA ${caseStress}/100`,
    operatorCue,
    rails: [
      {
        id: "owner",
        label: "owner",
        value: hasOwner ? "assigned" : "missing",
        tone: hasOwner ? "green" : "amber",
        note: caseId,
      },
      {
        id: "sla",
        label: "SLA",
        value: stages[0]?.sla ?? "review",
        tone: toneFromStress(stageScore),
        note: "Concierge Escalation Rail",
      },
      {
        id: "priority",
        label: "priority",
        value: p0Count > 0 ? `${p0Count} P0` : "no P0",
        tone: p0Count > 0 ? "red" : "gold",
        note: "P0 blocks public summary",
      },
      {
        id: "proof",
        label: "proof",
        value: freshnessBlocked ? "replay" : "attached",
        tone: freshnessBlocked ? "amber" : "green",
        note: "source replay before copy",
      },
      {
        id: "handoff",
        label: "handoff",
        value: storageBlocked ? "blocked" : "operator-only",
        tone: storageBlocked ? "red" : "gold",
        note: "durable timeline required",
      },
      {
        id: "seal",
        label: "seal",
        value: status === "private_concierge_case" ? "private" : "frozen",
        tone: toneFromStress(caseStress),
        note: "no public badge until owner proof",
      },
    ],
    stages,
    blockers,
    nextAction,
    customerBoundary:
      "Operator case data stays private: no raw payload, no wallet/IP, no public safety certificate, no profit claim and no buy/sell instruction.",
  };
}
