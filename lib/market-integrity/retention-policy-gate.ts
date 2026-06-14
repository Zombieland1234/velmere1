import type { TokenRiskResult } from "./risk-types";
import type { AnalyticsEventTaxonomyGate } from "./analytics-event-taxonomy-gate";
import type { OperatorCaseSlaOrchestratorGate } from "./operator-case-sla-orchestrator-gate";
import type { PrivacyRedactionEnvelopeGate } from "./privacy-redaction-envelope-gate";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";
import type { StorageAdapterContractGate } from "./storage-adapter-contract-gate";

export type RetentionPolicyTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type RetentionPolicyStatus =
  | "retention_owner_missing"
  | "delete_window_blocked"
  | "legal_hold_review"
  | "private_retention_seal";

export type RetentionPolicyRail = {
  id: "policy" | "ttl" | "erase" | "hold" | "export" | "seal";
  label: string;
  value: string;
  tone: RetentionPolicyTone;
  note: string;
};

export type RetentionPolicyLane = {
  id:
    | "source_snapshot"
    | "analytics_event"
    | "operator_case"
    | "receipt_hash"
    | "customer_export"
    | "browser_trace"
    | "wallet_context";
  label: string;
  state: "delete_after_ttl" | "retain_preview" | "operator_hold" | "blocked_until_policy";
  ttl: string;
  evidenceClass: "aggregate_only" | "hash_only" | "redacted_case" | "customer_safe" | "blocked_raw";
  note: string;
};

export type RetentionPolicyGate = {
  version: "velmere_retention_policy_gate_v1_pass284";
  status: RetentionPolicyStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: RetentionPolicyRail[];
  lanes: RetentionPolicyLane[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parseScore(value?: string) {
  const raw = value?.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

function toneFromStress(score: number): RetentionPolicyTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function laneStress(state: RetentionPolicyLane["state"], evidenceClass: RetentionPolicyLane["evidenceClass"]) {
  const stateCost =
    state === "delete_after_ttl" ? 18 : state === "retain_preview" ? 34 : state === "operator_hold" ? 62 : 92;
  const evidenceCost =
    evidenceClass === "customer_safe"
      ? 14
      : evidenceClass === "hash_only"
        ? 24
        : evidenceClass === "aggregate_only"
          ? 28
          : evidenceClass === "redacted_case"
            ? 42
            : 96;
  return Math.round((stateCost * 0.64 + evidenceCost * 0.36));
}

function missingOrBlockedFreshness(gate: SourceFreshnessRegistryGate) {
  return gate.entries.some((entry) => entry.state === "missing" || entry.state === "stale" || entry.state === "blocked");
}

function hasRawPrivacyLane(gate: PrivacyRedactionEnvelopeGate) {
  return gate.lanes.some((lane) => lane.exposure === "blocked_raw");
}

function hasBlockedAnalytics(gate: AnalyticsEventTaxonomyGate) {
  return gate.lanes.some((lane) => lane.status === "blocked" || lane.privacy === "blocked_raw_payload");
}

export function buildRetentionPolicyGate(
  result: TokenRiskResult,
  sourceFreshnessRegistryGate: SourceFreshnessRegistryGate,
  analyticsEventTaxonomyGate: AnalyticsEventTaxonomyGate,
  storageAdapterContractGate: StorageAdapterContractGate,
  privacyRedactionEnvelopeGate: PrivacyRedactionEnvelopeGate,
  operatorCaseSlaOrchestratorGate: OperatorCaseSlaOrchestratorGate,
): RetentionPolicyGate {
  const storageMissing = storageAdapterContractGate.status === "server_adapter_missing";
  const rawPrivacyBlocked = hasRawPrivacyLane(privacyRedactionEnvelopeGate);
  const analyticsBlocked = hasBlockedAnalytics(analyticsEventTaxonomyGate);
  const freshnessGap = missingOrBlockedFreshness(sourceFreshnessRegistryGate);
  const operatorCaseOpen = operatorCaseSlaOrchestratorGate.status !== "private_concierge_case";
  const hasRetentionOwner = false;
  const hasContractIdentity = Boolean(result.token.chainId && result.token.tokenAddress);
  const liveData = result.dataQuality === "live";

  const lanes: RetentionPolicyLane[] = [
    {
      id: "source_snapshot",
      label: "source snapshot",
      state: storageMissing || freshnessGap ? "blocked_until_policy" : "delete_after_ttl",
      ttl: freshnessGap ? "refresh before TTL" : "24h preview / 30d case",
      evidenceClass: freshnessGap ? "blocked_raw" : "hash_only",
      note: "chart, depth and source TTL are retained as a bounded evidence receipt, not as an endless raw market dump",
    },
    {
      id: "analytics_event",
      label: "analytics event",
      state: analyticsBlocked ? "blocked_until_policy" : "delete_after_ttl",
      ttl: analyticsBlocked ? "blocked" : "aggregate rolling 30d",
      evidenceClass: analyticsBlocked ? "blocked_raw" : "aggregate_only",
      note: "telemetry keeps aggregate event keys only; no behavioral pressure profile or raw query payload",
    },
    {
      id: "operator_case",
      label: "operator case",
      state: operatorCaseOpen ? "operator_hold" : "retain_preview",
      ttl: operatorCaseOpen ? "SLA hold until owner" : "case TTL after close",
      evidenceClass: "redacted_case",
      note: "case notes stay private, redacted and owner-scoped until the review clock is closed",
    },
    {
      id: "receipt_hash",
      label: "receipt hash",
      state: storageMissing ? "blocked_until_policy" : "retain_preview",
      ttl: storageMissing ? "server storage required" : "hash retained / payload bounded",
      evidenceClass: storageMissing ? "blocked_raw" : "hash_only",
      note: "a receipt hash can stay longer than raw payload; raw payload still needs storage and retention proof",
    },
    {
      id: "customer_export",
      label: "customer export",
      state: rawPrivacyBlocked || storageMissing || !hasRetentionOwner ? "blocked_until_policy" : "delete_after_ttl",
      ttl: rawPrivacyBlocked || storageMissing ? "export frozen" : "customer copy TTL",
      evidenceClass: rawPrivacyBlocked || storageMissing ? "blocked_raw" : "customer_safe",
      note: "customer copy can mention review limits only after retention, storage and redaction pass together",
    },
    {
      id: "browser_trace",
      label: "browser trace",
      state: liveData && !storageMissing ? "delete_after_ttl" : "operator_hold",
      ttl: liveData ? "short QA TTL" : "demo trace hold",
      evidenceClass: liveData ? "aggregate_only" : "redacted_case",
      note: "runtime QA traces are short-lived diagnostics, not permanent customer dossiers",
    },
    {
      id: "wallet_context",
      label: "wallet/IP context",
      state: "blocked_until_policy",
      ttl: "do not retain raw wallet/IP",
      evidenceClass: "blocked_raw",
      note: "wallet, IP and raw customer identity remain blocked from retention and export surfaces",
    },
  ];

  const laneScore = Math.round(
    clamp(lanes.reduce((sum, lane) => sum + laneStress(lane.state, lane.evidenceClass), 0) / lanes.length),
  );
  const storageScore = parseScore(storageAdapterContractGate.trustBadge) ?? 76;
  const privacyScore = parseScore(privacyRedactionEnvelopeGate.trustBadge) ?? 78;
  const caseScore = parseScore(operatorCaseSlaOrchestratorGate.trustBadge) ?? 70;
  const sourceScore = parseScore(sourceFreshnessRegistryGate.trustBadge) ?? 68;
  const identityStress = hasContractIdentity ? 18 : 52;
  const ownerStress = hasRetentionOwner ? 10 : 74;
  const retentionStress = Math.round(
    clamp(
      laneScore * 0.34 +
        storageScore * 0.16 +
        privacyScore * 0.16 +
        caseScore * 0.12 +
        sourceScore * 0.08 +
        identityStress * 0.05 +
        ownerStress * 0.09,
    ),
  );

  const blockers = [
    !hasRetentionOwner ? "retention/delete owner not assigned" : null,
    storageMissing ? "server storage adapter missing" : null,
    rawPrivacyBlocked ? "raw payload/redaction lane blocked" : null,
    analyticsBlocked ? "blocked analytics payload" : null,
    freshnessGap ? "source TTL replay gap" : null,
    operatorCaseOpen ? "operator case SLA still open" : null,
    !hasContractIdentity ? "chain/contract identity incomplete" : null,
    "no wallet/IP retention policy",
  ].filter((item): item is string => Boolean(item));

  const status: RetentionPolicyStatus =
    !hasRetentionOwner || storageMissing
      ? "retention_owner_missing"
      : rawPrivacyBlocked || analyticsBlocked || retentionStress >= 74
        ? "delete_window_blocked"
        : operatorCaseOpen || blockers.length >= 2 || retentionStress >= 52
          ? "legal_hold_review"
          : "private_retention_seal";

  const rails: RetentionPolicyRail[] = [
    {
      id: "policy",
      label: "policy",
      value: hasRetentionOwner ? "owner bound" : "owner missing",
      tone: hasRetentionOwner ? "green" : "red",
      note: hasRetentionOwner ? "retention owner attached" : "assign delete/export owner before release copy",
    },
    {
      id: "ttl",
      label: "TTL",
      value: freshnessGap ? "decay blocked" : "bounded clock",
      tone: freshnessGap ? "amber" : "green",
      note: freshnessGap ? "source replay before customer copy" : "fresh receipts get a limited review clock",
    },
    {
      id: "erase",
      label: "erase",
      value: storageMissing ? "not durable" : "erase queue",
      tone: storageMissing ? "red" : "gold",
      note: storageMissing ? "browser preview cannot prove deletion" : "delete queue waits for server proof",
    },
    {
      id: "hold",
      label: "hold",
      value: operatorCaseOpen ? "case hold" : "case closed",
      tone: operatorCaseOpen ? "amber" : "green",
      note: operatorCaseOpen ? "SLA remains private until owner review" : "case is eligible for bounded retention",
    },
    {
      id: "export",
      label: "export",
      value: blockers.length ? "locked" : "limited",
      tone: blockers.length ? "red" : "green",
      note: "no raw payload, no certificate language, no investment pressure",
    },
    {
      id: "seal",
      label: "seal",
      value: status === "private_retention_seal" ? "Velvet TTL Seal" : "quiet waiting room",
      tone: toneFromStress(retentionStress),
      note: `retention stress ${retentionStress}/100`,
    },
  ];

  return {
    version: "velmere_retention_policy_gate_v1_pass284",
    status,
    headline: status === "private_retention_seal" ? "Velvet TTL Seal" : "Retention policy gate",
    trustBadge: `retention stress ${retentionStress}/100`,
    operatorCue:
      status === "private_retention_seal"
        ? "Private retention seal active: evidence is bounded, redacted and owned before any customer copy."
        : "Quiet Vault Clock active: missing owner, storage or redaction keeps the case in a calm review room instead of creating FOMO pressure.",
    rails,
    lanes,
    blockers,
    nextAction: blockers[0] ?? "Attach retention owner and export TTL to the private source passport.",
    customerBoundary:
      "Customer-facing output may show only bounded review status; raw payload, wallet/IP, safety certificates, profit claims and buy/sell instructions remain blocked.",
  };
}
