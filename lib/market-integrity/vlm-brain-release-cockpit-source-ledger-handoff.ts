import type { VlmBrainBrowserEvidenceCollector } from "./vlm-brain-browser-evidence-collector";
import type { VlmBrainLensShieldHandoff } from "./vlm-brain-lens-shield-handoff";
import type { VlmBrainPdfPreviewManifest } from "./vlm-brain-pdf-preview-manifest";
import type { VlmBrainReleaseCockpit } from "./vlm-brain-release-cockpit";
import type { VlmBrainSourceLedgerUiPreview } from "./vlm-brain-source-ledger-ui-preview";
import type { VlmBrainWalletSessionPolicy } from "./vlm-brain-wallet-session-policy";

export type VlmBrainPass254HandoffLaneId =
  | "source"
  | "freshness"
  | "redaction"
  | "durable_snapshot"
  | "browser_qa"
  | "pdf_preview"
  | "wallet_session"
  | "customer_copy";

export type VlmBrainPass254HandoffLaneState = "hard_block" | "review_lock" | "operator_preview";
export type VlmBrainPass254HandoffPriority = "P0" | "P1" | "P2" | "P3";

export type VlmBrainPass254ReleaseHandoffLane = {
  id: VlmBrainPass254HandoffLaneId;
  label: string;
  state: VlmBrainPass254HandoffLaneState;
  priority: VlmBrainPass254HandoffPriority;
  owner: "source" | "qa" | "report" | "access" | "copy";
  score: number;
  blocker: string;
  nextAction: string;
  safeCustomerCopy: string;
};

export type VlmBrainPass254ReleaseCockpitSourceLedgerHandoff = {
  schemaVersion: "vlm-brain-release-cockpit-source-ledger-handoff-v1-pass254";
  handoffMode: "operator_release_cockpit_source_ledger_handoff";
  handoffId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  decision: "hard_block" | "review_lock" | "operator_preview_only";
  sourceLedgerDecision: VlmBrainSourceLedgerUiPreview["ledgerDecision"];
  lensHandoffDecision: VlmBrainLensShieldHandoff["handoffDecision"];
  pdfRouteState: VlmBrainPdfPreviewManifest["routeState"];
  walletPolicyDecision: VlmBrainWalletSessionPolicy["policyDecision"];
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  browserQaRequired: true;
  laneCount: number;
  p0Count: number;
  p1Count: number;
  lanes: VlmBrainPass254ReleaseHandoffLane[];
  priorityActions: string[];
  operatorSummary: string;
  customerBoundary: string;
};

const PASS254_SCHEMA = "vlm-brain-release-cockpit-source-ledger-handoff-v1-pass254" as const;

function compact(value: unknown, fallback = "PASS254 release handoff review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS254-HANDOFF", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stateFrom(blocked: boolean, review: boolean): VlmBrainPass254HandoffLaneState {
  if (blocked) return "hard_block";
  if (review) return "review_lock";
  return "operator_preview";
}

function priorityFrom(state: VlmBrainPass254HandoffLaneState, score: number): VlmBrainPass254HandoffPriority {
  if (state === "hard_block" || score < 35) return "P0";
  if (state === "review_lock" || score < 62) return "P1";
  if (score < 80) return "P2";
  return "P3";
}

function lane(input: Omit<VlmBrainPass254ReleaseHandoffLane, "priority">): VlmBrainPass254ReleaseHandoffLane {
  const score = clampPercent(input.score);
  return {
    ...input,
    label: compact(input.label, "Release handoff lane", 120),
    score,
    priority: priorityFrom(input.state, score),
    blocker: compact(input.blocker, "Review gate before public export.", 220),
    nextAction: compact(input.nextAction, "Attach operator proof before release.", 260),
    safeCustomerCopy: compact(input.safeCustomerCopy, "Customer copy stays review-only.", 240),
  };
}

export function buildVlmBrainReleaseCockpitSourceLedgerHandoff(
  cockpit: VlmBrainReleaseCockpit,
  sourceLedger: VlmBrainSourceLedgerUiPreview,
  lensHandoff: VlmBrainLensShieldHandoff,
  pdfManifest: VlmBrainPdfPreviewManifest,
  walletPolicy: VlmBrainWalletSessionPolicy,
  browserEvidence: VlmBrainBrowserEvidenceCollector,
): VlmBrainPass254ReleaseCockpitSourceLedgerHandoff {
  const createdAt = cockpit.createdAt ?? sourceLedger.createdAt ?? lensHandoff.createdAt ?? new Date().toISOString();
  const sourceBlocked = sourceLedger.ledgerDecision === "blocked";
  const sourceReview = !sourceBlocked && sourceLedger.serverRequiredCount > 0;
  const pdfBlocked = pdfManifest.routeState === "download_blocked";
  const walletBlocked = walletPolicy.policyDecision === "blocked";
  const browserBlocked = browserEvidence.collectorDecision === "blocked_missing_trace" || browserEvidence.missingArtifactCount > 0;
  const lensBlocked = lensHandoff.handoffDecision === "blocked";
  const customerBlocked = cockpit.customerExportAllowed === false || pdfManifest.customerCopyAllowed === "blocked" || lensBlocked;

  const lanes = [
    lane({
      id: "source",
      label: "Source coverage / ledger",
      state: stateFrom(sourceBlocked, sourceReview),
      owner: "source",
      score: 100 - sourceLedger.blockedLaneCount * 22 - sourceLedger.serverRequiredCount * 9,
      blocker: sourceBlocked ? "Source ledger preview has blocked lanes." : sourceReview ? "Server-side source snapshot write is still required." : "Source ledger is preview-only.",
      nextAction: "Persist adapter snapshot, case timeline and reviewer note on a server-only ledger before export.",
      safeCustomerCopy: "Show source confidence only after review; never expose raw adapter payloads.",
    }),
    lane({
      id: "freshness",
      label: "Freshness / stale data",
      state: stateFrom(cockpit.lanes.some((item) => item.id === "adapters" && item.state === "hard_block"), cockpit.lanes.some((item) => item.id === "adapters" && item.state === "review_lock")),
      owner: "source",
      score: cockpit.lanes.find((item) => item.id === "adapters")?.score ?? 0,
      blocker: "Live adapters need TTL, staleAt and expiresAt evidence before public summaries.",
      nextAction: "Make stale and missing lanes visible in the tile drawer and keep them inside manual review.",
      safeCustomerCopy: "Use missing-data and source-confidence language, not a clean verdict.",
    }),
    lane({
      id: "redaction",
      label: "Redaction manifest",
      state: stateFrom(sourceLedger.rawPayloadAllowed, pdfManifest.redactionRequired),
      owner: "report",
      score: sourceLedger.rawPayloadAllowed ? 0 : 74,
      blocker: "Redaction must block raw payloads, PII, secrets, private identifiers and internal evidence.",
      nextAction: "Store a redaction manifest before report preview or customer brief is promoted.",
      safeCustomerCopy: "Only sanitized brief and reviewed evidence notes can leave the operator layer.",
    }),
    lane({
      id: "durable_snapshot",
      label: "Durable snapshot contract",
      state: stateFrom(sourceLedger.ledgerDecision === "blocked", sourceLedger.ledgerDecision === "server_write_required"),
      owner: "source",
      score: 100 - sourceLedger.serverRequiredCount * 10 - sourceLedger.blockedLaneCount * 20,
      blocker: "Durable source/case/export writes are still a contract, not production persistence.",
      nextAction: "Keep the UI honest: preview contract until the server adapter writes real records.",
      safeCustomerCopy: "Do not claim durable proof until storage exists and the reviewer signs the case.",
    }),
    lane({
      id: "browser_qa",
      label: "Browser QA trace",
      state: stateFrom(browserBlocked, true),
      owner: "qa",
      score: 100 - browserEvidence.missingArtifactCount * 18 - browserEvidence.reviewArtifactCount * 5,
      blocker: "Real browser replay is required for modal layering, search portal, Orbit pause and mobile/reduced motion.",
      nextAction: "Capture browser artifacts before release; static guard success is not browser QA.",
      safeCustomerCopy: "Browser evidence remains internal QA, not a customer certificate.",
    }),
    lane({
      id: "pdf_preview",
      label: "PDF preview / download gate",
      state: stateFrom(pdfBlocked, pdfManifest.reviewSectionCount > 0),
      owner: "report",
      score: pdfManifest.binaryPdfReady ? 82 : pdfManifest.routeState === "review_required" ? 46 : 28,
      blocker: "Binary PDF download stays disabled until source, redaction and browser evidence pass.",
      nextAction: "Keep HTML report preview operator-only; do not render a fake download button.",
      safeCustomerCopy: "PDF-ready preview is not a certificate, investment advice or final verdict.",
    }),
    lane({
      id: "wallet_session",
      label: "Wallet / access session",
      state: stateFrom(walletBlocked, walletPolicy.policyDecision === "server_required"),
      owner: "access",
      score: walletPolicy.walletAccessAllowed ? 72 : 24,
      blocker: "Wallet access needs server-side entitlement and must never request recovery secrets.",
      nextAction: "Keep Basic/Pro/Advanced as access-depth gates; no price, profit or public-sale wording.",
      safeCustomerCopy: "Wallet link is optional access proof only and never a financial promise.",
    }),
    lane({
      id: "customer_copy",
      label: "Customer copy boundary",
      state: stateFrom(customerBlocked, cockpit.reviewCount > 0),
      owner: "copy",
      score: customerBlocked ? 26 : 54,
      blocker: "Customer copy is blocked until source confidence, redaction and missing-data semantics are reviewed.",
      nextAction: "Publish only short anomaly/review language after operator approval.",
      safeCustomerCopy: "Use: anomaly, requires review, source confidence, missing data and internal review.",
    }),
  ];

  const p0Count = lanes.filter((item) => item.priority === "P0").length;
  const p1Count = lanes.filter((item) => item.priority === "P1").length;
  const decision = p0Count > 0 ? "hard_block" : p1Count > 0 ? "review_lock" : "operator_preview_only";
  const priorityActions = lanes
    .filter((item) => item.priority === "P0" || item.priority === "P1")
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.score - b.score)
    .slice(0, 6)
    .map((item) => `${item.priority} · ${item.label}: ${item.nextAction}`);

  return {
    schemaVersion: PASS254_SCHEMA,
    handoffMode: "operator_release_cockpit_source_ledger_handoff",
    handoffId: stableId(`VLM-PASS254-HANDOFF-${cockpit.token.symbol}-${cockpit.cockpitId}-${createdAt}`),
    createdAt,
    token: cockpit.token,
    decision,
    sourceLedgerDecision: sourceLedger.ledgerDecision,
    lensHandoffDecision: lensHandoff.handoffDecision,
    pdfRouteState: pdfManifest.routeState,
    walletPolicyDecision: walletPolicy.policyDecision,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    browserQaRequired: true,
    laneCount: lanes.length,
    p0Count,
    p1Count,
    lanes,
    priorityActions,
    operatorSummary:
      "PASS254 turns the release cockpit into a readable operator handoff: source ledger, freshness, redaction, durable snapshot, browser QA, PDF preview, wallet session and customer copy are checked together before any public export.",
    customerBoundary:
      "Internal release review only. Public export, binary PDF, wallet-gated access and customer copy remain blocked until durable storage, redaction and real browser replay are proven.",
  };
}

export const PASS254_VLM_BRAIN_RELEASE_COCKPIT_SOURCE_LEDGER_HANDOFF_CONTRACT = true;
