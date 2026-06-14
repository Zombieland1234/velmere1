import type {
  VlmBrainPass258ProofReceipt,
  VlmBrainPass258ProofReceiptLock,
  VlmBrainPass258ProofReceiptState,
  VlmBrainPass258ReleaseLockCell,
  VlmBrainPass258SignoffItem,
  VlmBrainPass258TracePackItem,
} from "./vlm-brain-pass258-proof-receipt-lock";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass259AttestationState =
  | "missing_attestation"
  | "capture_required"
  | "owner_review_required"
  | "operator_preview_only";

export type VlmBrainPass259AttestationLane =
  | "source"
  | "freshness"
  | "redaction"
  | "browser"
  | "storage"
  | "report"
  | "wallet"
  | "copy";

export type VlmBrainPass259LedgerAttestation = {
  id: string;
  lane: VlmBrainPass259AttestationLane;
  label: string;
  owner: VlmBrainPass258ProofReceipt["owner"];
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass259AttestationState;
  reviewed: false;
  receiptAttached: false;
  sourceReceipt: VlmBrainPass258ProofReceipt["id"];
  sourceState: VlmBrainPass258ProofReceiptState;
  traceRequired: boolean;
  redactionRequired: boolean;
  durableWriteRequired: boolean;
  operatorNext: string;
  acceptance: string;
  customerBoundary: string;
};

export type VlmBrainPass259FreezeReason = {
  id: string;
  label: string;
  state: "frozen";
  releaseAllowed: false;
  requiredReceipt: VlmBrainPass258ReleaseLockCell["requiredReceipt"];
  attestationMissing: true;
  reason: string;
};

export type VlmBrainPass259PromotionChecklistItem = {
  id: string;
  label: string;
  owner: VlmBrainPass258SignoffItem["owner"] | "browser_trace" | "release_owner";
  priority: VlmBrainPass254HandoffPriority;
  state: "blocked" | "capture_required" | "review_required";
  acceptance: string;
  blockerReason: string;
};

export type VlmBrainPass259AttestationLedger = {
  schemaVersion: "vlm-brain-pass259-attestation-ledger-v1";
  mode: "operator_attestation_ledger_release_freeze";
  attestationLedgerId: string;
  token: { symbol: string; name: string };
  decision: "release_frozen" | "attestation_capture_required" | "attestation_review_required" | "operator_preview_frozen";
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  releasePromotionAllowed: false;
  attestationLedgerActive: true;
  sourceAttestationReady: false;
  browserAttestationReady: false;
  storageAttestationReady: false;
  redactionAttestationReady: false;
  attestationCount: number;
  missingAttestationCount: number;
  captureRequiredCount: number;
  ownerReviewCount: number;
  attestations: VlmBrainPass259LedgerAttestation[];
  freezeReasons: VlmBrainPass259FreezeReason[];
  promotionChecklist: VlmBrainPass259PromotionChecklistItem[];
  browserTraceRefs: Array<Pick<VlmBrainPass258TracePackItem, "id" | "label" | "state" | "replayScope">>;
  nextAttestationMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS259_SCHEMA = "vlm-brain-pass259-attestation-ledger-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compact(value: unknown, fallback = "PASS259 attestation review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS259-ATTESTATION", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function laneFromReceipt(receipt: VlmBrainPass258ProofReceipt): VlmBrainPass259AttestationLane {
  if (receipt.id === "source_snapshot") return "source";
  if (receipt.id === "freshness_ttl") return "freshness";
  if (receipt.id === "redaction_manifest") return "redaction";
  if (receipt.id === "browser_trace_pack") return "browser";
  if (receipt.id === "durable_case_write") return "storage";
  if (receipt.id === "pdf_preview_manifest") return "report";
  if (receipt.id === "wallet_session_gate") return "wallet";
  return "copy";
}

function stateFromReceipt(receipt: VlmBrainPass258ProofReceipt): VlmBrainPass259AttestationState {
  if (receipt.state === "missing") return "missing_attestation";
  if (receipt.state === "capture_required") return "capture_required";
  if (receipt.state === "review_required") return "owner_review_required";
  return "operator_preview_only";
}

function attestationFromReceipt(receipt: VlmBrainPass258ProofReceipt): VlmBrainPass259LedgerAttestation {
  const lane = laneFromReceipt(receipt);
  return {
    id: stableId(`PASS259-ATTESTATION-${receipt.id}`),
    lane,
    label: `${compact(receipt.label, "Receipt", 90)} attestation`,
    owner: receipt.owner,
    priority: receipt.priority,
    state: stateFromReceipt(receipt),
    reviewed: false,
    receiptAttached: false,
    sourceReceipt: receipt.id,
    sourceState: receipt.state,
    traceRequired: lane === "browser",
    redactionRequired: lane === "redaction" || lane === "copy" || lane === "report",
    durableWriteRequired: lane === "storage" || lane === "source" || lane === "report",
    operatorNext: compact(receipt.operatorNext, "Attach reviewed operator attestation before release promotion.", 260),
    acceptance: compact(receipt.acceptance, "Attestation must be reviewed before any promotion.", 260),
    customerBoundary: compact(receipt.customerBoundary, "Operator-only attestation. Keep customer copy review-limited.", 240),
  };
}

function freezeReason(cell: VlmBrainPass258ReleaseLockCell): VlmBrainPass259FreezeReason {
  return {
    id: stableId(`PASS259-FREEZE-${cell.id}`),
    label: compact(cell.label, "Release freeze", 100),
    state: "frozen",
    releaseAllowed: false,
    requiredReceipt: cell.requiredReceipt,
    attestationMissing: true,
    reason: compact(cell.reason, "Release path stays frozen until matching attestation is attached and reviewed.", 220),
  };
}

function checklistFromSignoff(item: VlmBrainPass258SignoffItem): VlmBrainPass259PromotionChecklistItem {
  return {
    id: stableId(`PASS259-CHECK-${item.owner}`),
    label: compact(`${item.owner.replace(/_/g, " ")} attestation`, "Owner attestation", 90),
    owner: item.owner,
    priority: item.priority,
    state: item.state,
    acceptance: compact(item.safeAction, "Owner review required before release promotion.", 220),
    blockerReason: compact(item.blockerReason, "Owner attestation is not reviewed.", 220),
  };
}

function checklistFromTrace(item: VlmBrainPass258TracePackItem): VlmBrainPass259PromotionChecklistItem {
  return {
    id: stableId(`PASS259-TRACE-CHECK-${item.id}`),
    label: compact(item.label, "Browser trace attestation", 90),
    owner: "browser_trace",
    priority: item.state === "not_attached" || item.state === "capture_required" ? "P0" : "P1",
    state: item.state === "not_attached" || item.state === "capture_required" ? "capture_required" : "review_required",
    acceptance: compact(item.acceptance, "Attach browser replay evidence and reviewer note.", 220),
    blockerReason: compact(item.replayScope, "Browser replay evidence is not attached.", 220),
  };
}

function sortByPriority<T extends { priority: VlmBrainPass254HandoffPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export function buildVlmBrainPass259AttestationLedger(
  lock: VlmBrainPass258ProofReceiptLock,
): VlmBrainPass259AttestationLedger {
  const attestations = sortByPriority(lock.receipts.map(attestationFromReceipt));
  const missingAttestationCount = attestations.filter((item) => item.state === "missing_attestation").length;
  const captureRequiredCount = attestations.filter((item) => item.state === "capture_required").length;
  const ownerReviewCount = attestations.filter((item) => item.state === "owner_review_required").length;
  const freezeReasons = lock.releaseLockMatrix.map(freezeReason);
  const promotionChecklist = sortByPriority([
    ...lock.signoffQueue.map(checklistFromSignoff),
    ...lock.browserTracePack.map(checklistFromTrace),
    {
      id: stableId("PASS259-CHECK-RELEASE-OWNER"),
      label: "Release owner attestation",
      owner: "release_owner",
      priority: "P0" as const,
      state: "blocked" as const,
      acceptance: "Release owner may only review after source, redaction, storage and browser attestations exist.",
      blockerReason: "Attestation ledger is still incomplete; promotion remains frozen.",
    } satisfies VlmBrainPass259PromotionChecklistItem,
  ]);
  const top = attestations.find((item) => item.state === "missing_attestation")
    ?? attestations.find((item) => item.state === "capture_required")
    ?? attestations.find((item) => item.state === "owner_review_required")
    ?? attestations[0];

  const decision = missingAttestationCount > 0 || lock.proofReceiptLockActive
    ? "release_frozen"
    : captureRequiredCount > 0
      ? "attestation_capture_required"
      : ownerReviewCount > 0
        ? "attestation_review_required"
        : "operator_preview_frozen";

  return {
    schemaVersion: PASS259_SCHEMA,
    mode: "operator_attestation_ledger_release_freeze",
    attestationLedgerId: stableId(`VLM-PASS259-ATTESTATION-LEDGER-${lock.token.symbol}-${lock.receiptLockId}`),
    token: lock.token,
    decision,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    releasePromotionAllowed: false,
    attestationLedgerActive: true,
    sourceAttestationReady: false,
    browserAttestationReady: false,
    storageAttestationReady: false,
    redactionAttestationReady: false,
    attestationCount: attestations.length,
    missingAttestationCount,
    captureRequiredCount,
    ownerReviewCount,
    attestations,
    freezeReasons,
    promotionChecklist,
    browserTraceRefs: lock.browserTracePack.map((trace) => ({
      id: trace.id,
      label: trace.label,
      state: trace.state,
      replayScope: trace.replayScope,
    })),
    nextAttestationMove: top
      ? `${top.priority} · ${top.label}: ${top.operatorNext}`
      : "Keep promotion frozen until reviewed attestations exist.",
    operatorSummary:
      "PASS259 adds an attestation ledger above the proof receipt lock. It turns every receipt into an owner-reviewed release freeze item, keeps browser traces separate from static guard results and prevents promotion while source, redaction, storage or review proof is missing.",
    customerBoundary:
      "Operator attestation layer only. It does not enable public export, raw payload export, binary report download, wallet/session access, customer copy or release promotion.",
  };
}

export const PASS259_VLM_BRAIN_ATTESTATION_LEDGER_CONTRACT = true;
