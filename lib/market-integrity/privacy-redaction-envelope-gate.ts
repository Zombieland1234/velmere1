import type { TokenRiskResult } from "./risk-types";
import type { AnalyticsEventTaxonomyGate } from "./analytics-event-taxonomy-gate";
import type { DurableAuditReceiptVault } from "./durable-audit-receipt-vault";
import type { StorageAdapterContractGate } from "./storage-adapter-contract-gate";

export type PrivacyRedactionEnvelopeTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type PrivacyRedactionEnvelopeStatus =
  | "raw_payload_quarantine"
  | "pii_review_required"
  | "operator_mask_pending"
  | "private_redaction_seal";

export type PrivacyRedactionEnvelopeRail = {
  id: "mask" | "wallet" | "query" | "receipt" | "telemetry" | "seal";
  label: string;
  value: string;
  tone: PrivacyRedactionEnvelopeTone;
  note: string;
};

export type PrivacyRedactionEnvelopeLane = {
  id:
    | "contract_identity"
    | "customer_query"
    | "analytics_payload"
    | "receipt_preview"
    | "operator_note"
    | "customer_copy"
    | "export_manifest";
  label: string;
  exposure: "public_safe" | "masked_preview" | "operator_only" | "blocked_raw";
  maskRule: string;
  note: string;
};

export type PrivacyRedactionEnvelopeGate = {
  version: "velmere_privacy_redaction_envelope_gate_v1_pass282";
  status: PrivacyRedactionEnvelopeStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: PrivacyRedactionEnvelopeRail[];
  lanes: PrivacyRedactionEnvelopeLane[];
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

function toneFromStress(score: number): PrivacyRedactionEnvelopeTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function exposureStress(exposure: PrivacyRedactionEnvelopeLane["exposure"]) {
  switch (exposure) {
    case "public_safe":
      return 14;
    case "masked_preview":
      return 30;
    case "operator_only":
      return 58;
    case "blocked_raw":
      return 92;
    default:
      return 70;
  }
}

function maskContract(address?: string) {
  const clean = address?.trim();
  if (!clean) return "contract missing";
  if (clean.length <= 10) return "masked contract";
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

function buildRedactionSealId(
  result: TokenRiskResult,
  storageGate: StorageAdapterContractGate,
  analyticsGate: AnalyticsEventTaxonomyGate,
) {
  const seed = [
    stablePart(result.token.marketId),
    stablePart(result.token.chainId),
    stablePart(result.token.tokenAddress),
    stablePart(result.token.symbol),
    stablePart(result.generatedAt).slice(0, 13),
    storageGate.status,
    analyticsGate.status,
  ].join("|");
  return `REM-${shortHash(seed).slice(0, 4)}-${shortHash(`${seed}|redaction`).slice(0, 6)}`;
}

function hasBlockedAnalytics(analyticsGate: AnalyticsEventTaxonomyGate) {
  return analyticsGate.lanes.some((lane) => lane.status === "blocked" || lane.privacy === "blocked_raw_payload");
}

export function buildPrivacyRedactionEnvelopeGate(
  result: TokenRiskResult,
  durableVault: DurableAuditReceiptVault,
  analyticsGate: AnalyticsEventTaxonomyGate,
  storageGate: StorageAdapterContractGate,
): PrivacyRedactionEnvelopeGate {
  const hasContract = Boolean(result.token.chainId && result.token.tokenAddress);
  const hasPairIdentity = Boolean(result.token.pairAddress || result.token.dexId || result.token.marketId);
  const analyticsBlocked = hasBlockedAnalytics(analyticsGate);
  const storageMissing = storageGate.status === "server_adapter_missing";
  const receiptBlocked = durableVault.status === "ledger_write_blocked";
  const dataIsLive = result.dataQuality === "live";
  const sealId = buildRedactionSealId(result, storageGate, analyticsGate);

  const lanes: PrivacyRedactionEnvelopeLane[] = [
    {
      id: "contract_identity",
      label: "contract identity",
      exposure: hasContract ? "masked_preview" : "operator_only",
      maskRule: hasContract ? maskContract(result.token.tokenAddress) : "chain + contract required",
      note: "contract/address context may be shown only as a shortened review cue, never as a customer identity payload",
    },
    {
      id: "customer_query",
      label: "customer query",
      exposure: "blocked_raw",
      maskRule: "do not store raw search terms",
      note: "Lens/Shield search text stays transient; only result category buckets may be counted",
    },
    {
      id: "analytics_payload",
      label: "analytics payload",
      exposure: analyticsBlocked ? "blocked_raw" : "operator_only",
      maskRule: analyticsBlocked ? "quarantine raw event" : "aggregate event key only",
      note: "analytics stays aggregate/redacted and cannot become growth-pressure or behavioral profiling",
    },
    {
      id: "receipt_preview",
      label: "receipt preview",
      exposure: receiptBlocked || storageMissing ? "operator_only" : "masked_preview",
      maskRule: durableVault.rails.find((rail) => rail.id === "hash")?.value ?? sealId,
      note: "receipt hash is previewable; raw source payload remains server/redaction gated",
    },
    {
      id: "operator_note",
      label: "operator note",
      exposure: "operator_only",
      maskRule: "human review note, no customer PII",
      note: "internal memo can mention missing sources and review actions, not user identity or wallet assumptions",
    },
    {
      id: "customer_copy",
      label: "customer copy",
      exposure: dataIsLive && !analyticsBlocked && !receiptBlocked ? "public_safe" : "operator_only",
      maskRule: "limitations-first copy",
      note: "customer wording may describe source limits and review status only; no safety, profit or certificate language",
    },
    {
      id: "export_manifest",
      label: "export manifest",
      exposure: !storageMissing && !receiptBlocked && hasPairIdentity ? "operator_only" : "blocked_raw",
      maskRule: "redacted manifest before PDF/export",
      note: "export remains locked until storage, retention, redaction and source replay have durable proof",
    },
  ];

  const laneStress = Math.round(
    clamp(lanes.reduce((sum, lane) => sum + exposureStress(lane.exposure), 0) / lanes.length),
  );
  const storageScore = parseScore(storageGate.trustBadge) ?? 74;
  const analyticsScore = parseScore(analyticsGate.trustBadge) ?? 70;
  const vaultScore = parseScore(durableVault.trustBadge) ?? 72;
  const identityStress = hasContract ? 22 : hasPairIdentity ? 42 : 66;
  const liveStress = dataIsLive ? 16 : result.dataQuality === "partial" ? 44 : 74;
  const envelopeStress = Math.round(
    clamp(
      laneStress * 0.32 +
        storageScore * 0.2 +
        analyticsScore * 0.17 +
        vaultScore * 0.13 +
        identityStress * 0.1 +
        liveStress * 0.08,
    ),
  );

  const blockers = [
    analyticsBlocked ? "blocked analytics/raw event payload" : null,
    storageMissing ? "server storage adapter missing" : null,
    receiptBlocked ? "durable receipt write blocked" : null,
    !hasContract ? "masked chain/contract identity" : null,
    result.dataQuality !== "live" ? "demo/partial source label" : null,
    "retention/delete/export owner",
  ].filter((item): item is string => Boolean(item));

  const status: PrivacyRedactionEnvelopeStatus =
    lanes.some((lane) => lane.exposure === "blocked_raw") || envelopeStress >= 74
      ? "raw_payload_quarantine"
      : blockers.length >= 4 || envelopeStress >= 56
        ? "pii_review_required"
        : blockers.length >= 2 || envelopeStress >= 36
          ? "operator_mask_pending"
          : "private_redaction_seal";

  const headline =
    status === "raw_payload_quarantine"
      ? "raw payload quarantine"
      : status === "pii_review_required"
        ? "PII redaction review"
        : status === "operator_mask_pending"
          ? "operator mask pending"
          : "Private Redaction Seal";

  const operatorCue =
    status === "raw_payload_quarantine"
      ? "The Redaction Mirror catches raw query, analytics or export payload before it can leak into customer copy. Urgency and elite badges stay frozen until every lane is masked."
      : status === "pii_review_required"
        ? "The envelope has structure, but privacy ownership and storage replay still need review. Status is earned by restraint, not by pushing faster decisions."
        : status === "operator_mask_pending"
          ? "Most lanes are masked, but operator notes, retention and export boundaries remain private until proof is attached."
          : "The private redaction seal can support quiet trust: masked preview, aggregate telemetry and customer copy boundaries are aligned without FOMO pressure.";

  return {
    version: "velmere_privacy_redaction_envelope_gate_v1_pass282",
    status,
    headline,
    trustBadge: `redaction ${envelopeStress}/100`,
    operatorCue,
    rails: [
      {
        id: "mask",
        label: "mask",
        value: status.replaceAll("_", " "),
        tone: toneFromStress(envelopeStress),
        note: "Velvet Redaction Mirror",
      },
      {
        id: "wallet",
        label: "wallet/IP",
        value: "blocked",
        tone: "green",
        note: "no wallet/IP/customer PII",
      },
      {
        id: "query",
        label: "query",
        value: "transient",
        tone: "cyan",
        note: "no raw search storage",
      },
      {
        id: "receipt",
        label: "receipt",
        value: receiptBlocked ? "locked" : "masked",
        tone: receiptBlocked ? "amber" : "green",
        note: "hash only",
      },
      {
        id: "telemetry",
        label: "telemetry",
        value: analyticsBlocked ? "quarantine" : "aggregate",
        tone: analyticsBlocked ? "red" : "gold",
        note: "privacy class enforced",
      },
      {
        id: "seal",
        label: "seal",
        value: sealId,
        tone: toneFromStress(envelopeStress),
        note: "private, not public certificate",
      },
    ],
    lanes,
    blockers,
    nextAction:
      status === "raw_payload_quarantine"
        ? "Keep raw query, wallet/IP, analytics payload and export manifest blocked; bind redacted event keys to server storage and retention owner before expanding any dashboard."
        : status === "pii_review_required"
          ? "Assign privacy owner, attach retention/delete rules and replay storage writes before customer copy or PDF preview uses this envelope."
          : status === "operator_mask_pending"
            ? "Convert operator-only lanes into masked receipts and confirm that no raw payload can leave the modal/report route."
            : "Keep the Private Redaction Seal quiet: it may support trust internally, but it must not be marketed as safety, profit, certification or investment advice.",
    customerBoundary:
      "Customer-facing surfaces may mention that sensitive details are masked and reviewed, but must never expose wallet/IP/search payloads or claim token safety, guaranteed accuracy, profit, certification, fraud confirmation or regulated advice.",
  };
}
