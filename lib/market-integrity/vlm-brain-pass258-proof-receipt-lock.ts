import type {
  VlmBrainPass257EvidenceSlaTimeline,
  VlmBrainPass257EvidenceTimelineItem,
  VlmBrainPass257ExceptionFirewallCell,
} from "./vlm-brain-pass257-evidence-sla-timeline";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass258ProofReceiptId =
  | "source_snapshot"
  | "freshness_ttl"
  | "redaction_manifest"
  | "browser_trace_pack"
  | "durable_case_write"
  | "pdf_preview_manifest"
  | "wallet_session_gate"
  | "customer_copy_review";

export type VlmBrainPass258ProofReceiptState =
  | "missing"
  | "capture_required"
  | "review_required"
  | "operator_preview";

export type VlmBrainPass258ProofReceipt = {
  id: VlmBrainPass258ProofReceiptId;
  label: string;
  owner: "source" | "redaction" | "browser" | "storage" | "report" | "wallet" | "copy";
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass258ProofReceiptState;
  required: true;
  receiptAttached: false;
  evidenceSource: string;
  operatorNext: string;
  acceptance: string;
  customerBoundary: string;
};

export type VlmBrainPass258SignoffOwner =
  | "source_reviewer"
  | "redaction_reviewer"
  | "browser_qa"
  | "storage_owner"
  | "report_owner"
  | "access_owner";

export type VlmBrainPass258SignoffItem = {
  id: string;
  owner: VlmBrainPass258SignoffOwner;
  priority: VlmBrainPass254HandoffPriority;
  state: "blocked" | "capture_required" | "review_required";
  blockerReason: string;
  safeAction: string;
};

export type VlmBrainPass258TracePackItem = {
  id: string;
  label: string;
  required: true;
  state: "not_attached" | "capture_required" | "review_required";
  replayScope: string;
  acceptance: string;
};

export type VlmBrainPass258ReleaseLockCell = {
  id: VlmBrainPass257ExceptionFirewallCell["id"];
  label: string;
  state: "locked";
  releaseAllowed: false;
  reason: string;
  requiredReceipt: VlmBrainPass258ProofReceiptId;
};

export type VlmBrainPass258ProofReceiptLock = {
  schemaVersion: "vlm-brain-pass258-proof-receipt-lock-v1";
  mode: "operator_proof_receipt_lock_browser_trace_pack";
  receiptLockId: string;
  token: { symbol: string; name: string };
  decision: "release_locked" | "proof_capture_required" | "operator_review_required" | "operator_preview_locked";
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  releaseReceiptSigned: false;
  browserTraceAttached: false;
  durableSnapshotAttached: false;
  redactionManifestAttached: false;
  proofReceiptLockActive: true;
  receiptCount: number;
  missingReceiptCount: number;
  captureRequiredCount: number;
  signoffCount: number;
  receipts: VlmBrainPass258ProofReceipt[];
  signoffQueue: VlmBrainPass258SignoffItem[];
  browserTracePack: VlmBrainPass258TracePackItem[];
  releaseLockMatrix: VlmBrainPass258ReleaseLockCell[];
  nextProofMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS258_SCHEMA = "vlm-brain-pass258-proof-receipt-lock-v1" as const;

function compact(value: unknown, fallback = "PASS258 proof receipt review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS258-PROOF-RECEIPT", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;

function highestPriority(items: VlmBrainPass257EvidenceTimelineItem[], fallback: VlmBrainPass254HandoffPriority = "P2") {
  return items.map((item) => item.priority).sort((a, b) => PRIORITY_ORDER[a] - PRIORITY_ORDER[b])[0] ?? fallback;
}

function highestReceiptPriority(receipts: VlmBrainPass258ProofReceipt[], fallback: VlmBrainPass254HandoffPriority = "P2") {
  return receipts.map((receipt) => receipt.priority).sort((a, b) => PRIORITY_ORDER[a] - PRIORITY_ORDER[b])[0] ?? fallback;
}

function receiptState(items: VlmBrainPass257EvidenceTimelineItem[]): VlmBrainPass258ProofReceiptState {
  if (items.some((item) => item.slaTier === "immediate_blocker" || item.state === "blocked")) return "missing";
  if (items.some((item) => item.slaTier === "same_session_capture" || item.state === "capture_required")) return "capture_required";
  if (items.some((item) => item.slaTier === "operator_review" || item.state === "review_required")) return "review_required";
  return "operator_preview";
}

function byOwner(timeline: VlmBrainPass257EvidenceTimelineItem[], owner: VlmBrainPass257EvidenceTimelineItem["owner"] | VlmBrainPass257EvidenceTimelineItem["owner"][]) {
  const owners = Array.isArray(owner) ? owner : [owner];
  return timeline.filter((item) => owners.includes(item.owner));
}

function makeReceipt(
  id: VlmBrainPass258ProofReceiptId,
  label: string,
  owner: VlmBrainPass258ProofReceipt["owner"],
  items: VlmBrainPass257EvidenceTimelineItem[],
  input: Pick<VlmBrainPass258ProofReceipt, "evidenceSource" | "operatorNext" | "acceptance" | "customerBoundary">,
): VlmBrainPass258ProofReceipt {
  const state = receiptState(items);
  return {
    id,
    label,
    owner,
    priority: highestPriority(items, state === "operator_preview" ? "P3" : "P1"),
    state,
    required: true,
    receiptAttached: false,
    evidenceSource: compact(input.evidenceSource, "Operator evidence source required.", 180),
    operatorNext: compact(input.operatorNext, "Attach reviewed operator proof before release review.", 260),
    acceptance: compact(input.acceptance, "Receipt must be attached and reviewed before promotion.", 260),
    customerBoundary: compact(input.customerBoundary, "Operator-only receipt. Do not convert into customer claim.", 240),
  };
}

function signoffState(receipts: VlmBrainPass258ProofReceipt[]): VlmBrainPass258SignoffItem["state"] {
  if (receipts.some((receipt) => receipt.state === "missing")) return "blocked";
  if (receipts.some((receipt) => receipt.state === "capture_required")) return "capture_required";
  return "review_required";
}

function buildSignoffQueue(receipts: VlmBrainPass258ProofReceipt[]): VlmBrainPass258SignoffItem[] {
  const groups: Array<{ owner: VlmBrainPass258SignoffOwner; receiptIds: VlmBrainPass258ProofReceiptId[]; safeAction: string }> = [
    {
      owner: "source_reviewer",
      receiptIds: ["source_snapshot", "freshness_ttl"],
      safeAction: "Review source snapshot and freshness TTL before any report wording is promoted.",
    },
    {
      owner: "redaction_reviewer",
      receiptIds: ["redaction_manifest", "customer_copy_review"],
      safeAction: "Review redaction and customer wording while keeping raw payload out of export surfaces.",
    },
    {
      owner: "browser_qa",
      receiptIds: ["browser_trace_pack"],
      safeAction: "Attach real browser trace pack for modal layering, Orbit pause, search portal, keyboard and reduced motion.",
    },
    {
      owner: "storage_owner",
      receiptIds: ["durable_case_write"],
      safeAction: "Attach durable case write proof before PDF or report export work continues.",
    },
    {
      owner: "report_owner",
      receiptIds: ["pdf_preview_manifest"],
      safeAction: "Keep report preview operator-only until source, redaction and browser proof are reviewed.",
    },
    {
      owner: "access_owner",
      receiptIds: ["wallet_session_gate"],
      safeAction: "Keep access levels session-based and utility-only until entitlement proof exists.",
    },
  ];

  return groups.map((group) => {
    const groupReceipts = receipts.filter((receipt) => group.receiptIds.includes(receipt.id));
    const state = signoffState(groupReceipts);
    const priority = highestReceiptPriority(groupReceipts, state === "blocked" ? "P0" : "P1");
    const first = groupReceipts.find((receipt) => receipt.state === "missing") ?? groupReceipts.find((receipt) => receipt.state === "capture_required") ?? groupReceipts[0];
    return {
      id: stableId(`PASS258-SIGNOFF-${group.owner}`),
      owner: group.owner,
      priority,
      state,
      blockerReason: first
        ? compact(`${first.label}: ${first.operatorNext}`, "Proof receipt is not attached.", 260)
        : "Proof receipt is not attached.",
      safeAction: compact(group.safeAction, "Review proof receipts before release review.", 260),
    };
  });
}

function traceItem(id: string, label: string, capturePressure: boolean, replayScope: string, acceptance: string): VlmBrainPass258TracePackItem {
  return {
    id: stableId(`PASS258-TRACE-${id}`),
    label,
    required: true,
    state: capturePressure ? "capture_required" : "not_attached",
    replayScope: compact(replayScope, "Browser replay scope required.", 220),
    acceptance: compact(acceptance, "Attach browser evidence and operator note.", 220),
  };
}

function lockCell(
  cell: VlmBrainPass257ExceptionFirewallCell,
  requiredReceipt: VlmBrainPass258ProofReceiptId,
): VlmBrainPass258ReleaseLockCell {
  return {
    id: cell.id,
    label: compact(cell.label, "Release lock", 100),
    state: "locked",
    releaseAllowed: false,
    reason: compact(cell.reason, "Release path stays locked until required receipts are reviewed.", 220),
    requiredReceipt,
  };
}

export function buildVlmBrainPass258ProofReceiptLock(
  timeline: VlmBrainPass257EvidenceSlaTimeline,
): VlmBrainPass258ProofReceiptLock {
  const sourceItems = byOwner(timeline.timeline, "source");
  const browserItems = byOwner(timeline.timeline, ["browser", "qa"]);
  const redactionItems = byOwner(timeline.timeline, ["report", "copy"]);
  const storageItems = byOwner(timeline.timeline, ["release", "report"]);
  const reportItems = byOwner(timeline.timeline, "report");
  const walletItems = byOwner(timeline.timeline, "access");

  const receipts: VlmBrainPass258ProofReceipt[] = [
    makeReceipt("source_snapshot", "Source snapshot receipt", "source", sourceItems, {
      evidenceSource: "source ledger preview and adapter lane notes",
      operatorNext: "Attach reviewed source snapshot receipt for adapter lane, source debt and reviewer note.",
      acceptance: "Receipt must name source lane, freshness state and next adapter action.",
      customerBoundary: "Customer copy may mention source confidence only after review; raw source detail stays internal.",
    }),
    makeReceipt("freshness_ttl", "Freshness TTL receipt", "source", sourceItems, {
      evidenceSource: "freshness mesh and TTL review",
      operatorNext: "Attach freshness TTL receipt and mark stale, blocked or missing lanes before report preview.",
      acceptance: "Receipt must separate live, stale, fallback and missing source states.",
      customerBoundary: "Freshness gaps become review pressure, not a clean public conclusion.",
    }),
    makeReceipt("redaction_manifest", "Redaction manifest receipt", "redaction", redactionItems, {
      evidenceSource: "redaction envelope and operator-only fields",
      operatorNext: "Attach redaction manifest for payload, customer text, report preview and audit note.",
      acceptance: "Receipt must confirm no PII, secrets, IP addresses or raw payloads move to customer surfaces.",
      customerBoundary: "Customer text stays brief, source-aware and review-limited.",
    }),
    makeReceipt("browser_trace_pack", "Browser trace pack receipt", "browser", browserItems, {
      evidenceSource: "real browser replay notes",
      operatorNext: "Capture modal layering, tile drawer scroll, Orbit pause, search portal and reduced-motion replay.",
      acceptance: "Receipt must attach browser evidence beyond static guard success.",
      customerBoundary: "Browser QA is internal release proof, not a public badge.",
    }),
    makeReceipt("durable_case_write", "Durable case write receipt", "storage", storageItems, {
      evidenceSource: "case timeline and storage contract",
      operatorNext: "Attach durable write target proof before report or PDF route can move forward.",
      acceptance: "Receipt must identify storage mode, case id strategy and redaction boundary.",
      customerBoundary: "Preview-only storage contracts cannot be presented as production persistence.",
    }),
    makeReceipt("pdf_preview_manifest", "PDF preview manifest receipt", "report", reportItems, {
      evidenceSource: "PDF preview manifest and report capsule",
      operatorNext: "Keep binary report download locked until source, redaction, storage and browser proof receipts are reviewed.",
      acceptance: "Receipt must show preview-only status and blocked binary download state.",
      customerBoundary: "Report preview cannot become a final verdict or trading instruction.",
    }),
    makeReceipt("wallet_session_gate", "Wallet/session gate receipt", "wallet", walletItems, {
      evidenceSource: "wallet session policy and entitlement gate",
      operatorNext: "Keep Basic/Pro/Advanced as controlled utility access until server-side entitlement proof exists.",
      acceptance: "Receipt must confirm no sensitive wallet recovery flow and no return-promise or public launch wording.",
      customerBoundary: "Access copy stays utility and intelligence-layer focused.",
    }),
    makeReceipt("customer_copy_review", "Customer copy review receipt", "copy", [...redactionItems, ...reportItems], {
      evidenceSource: "customer brief builder and copy sanitizer",
      operatorNext: "Review every customer-facing sentence for anomaly, source confidence, missing data and manual review boundaries.",
      acceptance: "Receipt must confirm no final verdict, no public safety badge and no investment instruction.",
      customerBoundary: "Customer copy remains conservative until operator approval.",
    }),
  ];

  const missingReceiptCount = receipts.filter((receipt) => receipt.state === "missing").length;
  const captureRequiredCount = receipts.filter((receipt) => receipt.state === "capture_required").length;
  const reviewRequiredCount = receipts.filter((receipt) => receipt.state === "review_required").length;
  const signoffQueue = buildSignoffQueue(receipts);
  const browserTracePack = [
    traceItem("modal-layering", "Modal layering + drawer portal", timeline.sameSessionCaptureCount > 0, "Token modal, tile drawer, search portal and close layers.", "Operator replay note confirms no clipping or z-index conflict."),
    traceItem("orbit-pause", "Orbit pause on read", timeline.sameSessionCaptureCount > 0, "Clicked tile pauses heavy motion while detail drawer remains readable.", "Replay shows readable panel and motion downgrade path."),
    traceItem("keyboard-reduced-motion", "Keyboard and reduced motion", true, "Escape, previous/next tile path, mobile and reduced-motion contexts.", "Replay confirms keyboard close and lower-motion rendering."),
    traceItem("lens-handoff", "Lens handoff path", true, "Lens guide, Shield analysis handoff and PDF preview boundary.", "Replay confirms preview remains operator-only and button clutter stays removed."),
  ];

  const lockMap: Record<VlmBrainPass257ExceptionFirewallCell["id"], VlmBrainPass258ProofReceiptId> = {
    public_export: "customer_copy_review",
    raw_payload: "redaction_manifest",
    binary_pdf: "pdf_preview_manifest",
    wallet_access: "wallet_session_gate",
    customer_copy: "customer_copy_review",
    release_override: "durable_case_write",
  };
  const releaseLockMatrix = timeline.exceptionFirewall.map((cell) => lockCell(cell, lockMap[cell.id]));

  const decision = missingReceiptCount > 0 || timeline.releaseFreezeActive
    ? "release_locked"
    : captureRequiredCount > 0
      ? "proof_capture_required"
      : reviewRequiredCount > 0
        ? "operator_review_required"
        : "operator_preview_locked";

  const topReceipt = receipts.find((receipt) => receipt.state === "missing") ?? receipts.find((receipt) => receipt.state === "capture_required") ?? receipts.find((receipt) => receipt.state === "review_required") ?? receipts[0];

  return {
    schemaVersion: PASS258_SCHEMA,
    mode: "operator_proof_receipt_lock_browser_trace_pack",
    receiptLockId: stableId(`VLM-PASS258-RECEIPT-LOCK-${timeline.token.symbol}-${timeline.timelineId}`),
    token: timeline.token,
    decision,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    releaseReceiptSigned: false,
    browserTraceAttached: false,
    durableSnapshotAttached: false,
    redactionManifestAttached: false,
    proofReceiptLockActive: true,
    receiptCount: receipts.length,
    missingReceiptCount,
    captureRequiredCount,
    signoffCount: signoffQueue.length,
    receipts,
    signoffQueue,
    browserTracePack,
    releaseLockMatrix,
    nextProofMove: topReceipt
      ? `${topReceipt.priority} · ${topReceipt.label}: ${topReceipt.operatorNext}`
      : "Keep release locked until reviewed proof receipts are attached.",
    operatorSummary:
      "PASS258 adds a proof receipt lock above the SLA timeline: every release lane needs a reviewed receipt, browser trace pack, storage/redaction proof and owner signoff before any future promotion.",
    customerBoundary:
      "Operator proof layer only. It does not enable public export, raw payload export, binary report download, wallet/session access or customer copy.",
  };
}

export const PASS258_VLM_BRAIN_PROOF_RECEIPT_LOCK_CONTRACT = true;
