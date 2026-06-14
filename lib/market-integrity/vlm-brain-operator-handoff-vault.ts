import type { VlmBrainAuditTrailIndex } from "./vlm-brain-audit-trail-index";
import type { VlmBrainDurableSnapshotPlan } from "./vlm-brain-durable-snapshot-plan";
import type { VlmBrainReleaseTriageBoard } from "./vlm-brain-release-triage-board";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";

export type VlmBrainOperatorHandoffEntry = {
  id: "source_snapshot" | "case_timeline" | "redaction_manifest" | "pdf_preview" | "browser_qa" | "operator_note";
  label: string;
  state: "blocked" | "server_required" | "review" | "preview";
  storageTarget: "server_adapter" | "operator_case" | "redaction_envelope" | "html_preview" | "browser_trace";
  rawPayloadAllowed: false;
  nextAction: string;
};

export type VlmBrainOperatorHandoffVault = {
  schemaVersion: "vlm-brain-operator-handoff-vault-v1-pass244";
  vaultMode: "operator_handoff_preview_no_pii";
  vaultId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  releaseDecision: VlmBrainReleaseTriageBoard["decision"];
  handoffDecision: "blocked" | "server_write_required" | "operator_review_only";
  sourceSnapshotWriteReady: false;
  caseTimelineWriteReady: false;
  customerExportReady: false;
  rawPayloadAllowed: false;
  capsuleId: string;
  auditIndexId: string;
  entries: VlmBrainOperatorHandoffEntry[];
  redactionBoundary: string;
  operatorSummary: string;
  nextMilestone: string;
};

const SCHEMA = "vlm-brain-operator-handoff-vault-v1-pass244" as const;

function compact(value: unknown, fallback = "operator handoff review required", limit = 300) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-HANDOFF-VAULT", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function entry(input: Omit<VlmBrainOperatorHandoffEntry, "rawPayloadAllowed">): VlmBrainOperatorHandoffEntry {
  return { ...input, rawPayloadAllowed: false };
}

export function buildVlmBrainOperatorHandoffVault(
  triage: VlmBrainReleaseTriageBoard,
  durableSnapshotPlan: VlmBrainDurableSnapshotPlan,
  auditIndex: VlmBrainAuditTrailIndex,
  capsule: VlmBrainReportCapsuleEnvelope,
): VlmBrainOperatorHandoffVault {
  const sourceWriteState = durableSnapshotPlan.writes.find((item) => item.storageTarget === "source_snapshot")?.state ?? "requires_server_adapter";
  const caseWriteState = durableSnapshotPlan.writes.find((item) => item.storageTarget === "case_timeline")?.state ?? "requires_server_adapter";
  const serverRequired = durableSnapshotPlan.durableWriteDecision !== "preview_ready" || triage.decision !== "operator_preview_only";
  const entries: VlmBrainOperatorHandoffEntry[] = [
    entry({
      id: "source_snapshot",
      label: "Source snapshot write",
      state: sourceWriteState === "blocked" ? "blocked" : sourceWriteState === "requires_server_adapter" ? "server_required" : "review",
      storageTarget: "server_adapter",
      nextAction: "Persist source snapshot with provider, generatedAt and redacted source references before export.",
    }),
    entry({
      id: "case_timeline",
      label: "Case timeline append",
      state: caseWriteState === "blocked" ? "blocked" : caseWriteState === "requires_server_adapter" ? "server_required" : "review",
      storageTarget: "operator_case",
      nextAction: "Append tile decision, reviewer action and release triage state to durable case timeline.",
    }),
    entry({
      id: "redaction_manifest",
      label: "Redaction manifest",
      state: capsule.exportReadiness === "ready" ? "preview" : "blocked",
      storageTarget: "redaction_envelope",
      nextAction: "Keep raw payload, PII, secrets and private weights outside customer export.",
    }),
    entry({
      id: "pdf_preview",
      label: "PDF preview handoff",
      state: triage.binaryPdfReady ? "preview" : "blocked",
      storageTarget: "html_preview",
      nextAction: "Use HTML/PDF-ready preview only until binary renderer, storage and redaction are wired.",
    }),
    entry({
      id: "browser_qa",
      label: "Browser QA trace",
      state: "server_required",
      storageTarget: "browser_trace",
      nextAction: "Attach real Vercel trace for modal layering, Orbit 360 FPS, search portal and PDF preview route.",
    }),
    entry({
      id: "operator_note",
      label: "Operator note",
      state: triage.reviewCount > 0 ? "review" : "preview",
      storageTarget: "operator_case",
      nextAction: triage.nextMilestone,
    }),
  ];
  const blockedEntries = entries.filter((item) => item.state === "blocked" || item.state === "server_required").length;

  return {
    schemaVersion: SCHEMA,
    vaultMode: "operator_handoff_preview_no_pii",
    vaultId: stableId(`VLM-HANDOFF-${triage.token.symbol}-${triage.boardId}-${capsule.capsuleId}`),
    createdAt: triage.createdAt,
    token: triage.token,
    releaseDecision: triage.decision,
    handoffDecision: blockedEntries > 0 || serverRequired ? "server_write_required" : "operator_review_only",
    sourceSnapshotWriteReady: false,
    caseTimelineWriteReady: false,
    customerExportReady: false,
    rawPayloadAllowed: false,
    capsuleId: capsule.capsuleId,
    auditIndexId: auditIndex.indexId,
    entries,
    redactionBoundary: "Handoff vault is operator-only and never stores raw payload, wallet secrets, PII, private model weights or unredacted source bodies.",
    operatorSummary: "PASS244 handoff vault converts the AI Brain triage board into concrete durable-write and export-prep tasks.",
    nextMilestone: "Implement server storage adapter, append-only audit timeline and redacted PDF manifest before enabling download.",
  };
}

export const PASS244_VLM_BRAIN_OPERATOR_HANDOFF_VAULT_CONTRACT = true;
