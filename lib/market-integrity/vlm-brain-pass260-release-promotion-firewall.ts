import type {
  VlmBrainPass259AttestationLedger,
  VlmBrainPass259AttestationLane,
  VlmBrainPass259AttestationState,
  VlmBrainPass259LedgerAttestation,
  VlmBrainPass259PromotionChecklistItem,
} from "./vlm-brain-pass259-attestation-ledger";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass260PromotionFirewallState =
  | "blocked"
  | "capture_required"
  | "review_required"
  | "quarantined";

export type VlmBrainPass260PromotionLane = {
  id: string;
  lane: VlmBrainPass259AttestationLane | "release_owner";
  label: string;
  owner: VlmBrainPass259LedgerAttestation["owner"] | "release_owner";
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass260PromotionFirewallState;
  sourceState: VlmBrainPass259AttestationState | VlmBrainPass259PromotionChecklistItem["state"];
  attestationRef?: VlmBrainPass259LedgerAttestation["id"];
  checklistRef?: VlmBrainPass259PromotionChecklistItem["id"];
  promotionAllowed: false;
  customerVisible: false;
  operatorNext: string;
  acceptance: string;
};

export type VlmBrainPass260ReviewPacket = {
  id: string;
  owner: VlmBrainPass260PromotionLane["owner"] | "browser_trace";
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass260PromotionFirewallState;
  label: string;
  missingReceipt: boolean;
  browserReplayRequired: boolean;
  durableWriteRequired: boolean;
  redactionReviewRequired: boolean;
  note: string;
};

export type VlmBrainPass260CustomerFreezeLine = {
  id: string;
  label: string;
  state: "hidden_until_review";
  reason: string;
  customerCopyAllowed: false;
};

export type VlmBrainPass260ReleasePromotionFirewall = {
  schemaVersion: "vlm-brain-pass260-release-promotion-firewall-v1";
  mode: "operator_release_promotion_firewall_review_packet";
  firewallId: string;
  token: { symbol: string; name: string };
  decision: "promotion_quarantined" | "attestation_missing" | "capture_required" | "owner_review_required";
  promotionFirewallActive: true;
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  releasePromotionAllowed: false;
  publicReleaseBadgeAllowed: false;
  finalVerdictAllowed: false;
  reviewPacketReady: false;
  promotionLaneCount: number;
  blockedLaneCount: number;
  captureRequiredCount: number;
  ownerReviewCount: number;
  customerFreezeCount: number;
  lanes: VlmBrainPass260PromotionLane[];
  reviewPackets: VlmBrainPass260ReviewPacket[];
  customerFreezeLines: VlmBrainPass260CustomerFreezeLine[];
  promotionChecklist: Array<Pick<VlmBrainPass259PromotionChecklistItem, "id" | "label" | "owner" | "priority" | "state" | "acceptance">>;
  nextPromotionMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS260_SCHEMA = "vlm-brain-pass260-release-promotion-firewall-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compact(value: unknown, fallback = "PASS260 promotion firewall review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS260-PROMOTION-FIREWALL", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stateFromAttestation(state: VlmBrainPass259AttestationState): VlmBrainPass260PromotionFirewallState {
  if (state === "missing_attestation") return "blocked";
  if (state === "capture_required") return "capture_required";
  if (state === "owner_review_required") return "review_required";
  return "quarantined";
}

function stateFromChecklist(state: VlmBrainPass259PromotionChecklistItem["state"]): VlmBrainPass260PromotionFirewallState {
  if (state === "blocked") return "blocked";
  if (state === "capture_required") return "capture_required";
  return "review_required";
}

function sortByPriority<T extends { priority: VlmBrainPass254HandoffPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function laneFromAttestation(attestation: VlmBrainPass259LedgerAttestation): VlmBrainPass260PromotionLane {
  const state = stateFromAttestation(attestation.state);
  return {
    id: stableId(`PASS260-LANE-${attestation.id}`),
    lane: attestation.lane,
    label: compact(attestation.label, "Attestation lane", 100),
    owner: attestation.owner,
    priority: attestation.priority,
    state,
    sourceState: attestation.state,
    attestationRef: attestation.id,
    promotionAllowed: false,
    customerVisible: false,
    operatorNext: compact(attestation.operatorNext, "Finish owner attestation before release promotion review.", 260),
    acceptance: compact(attestation.acceptance, "Reviewed attestation is required before promotion review.", 260),
  };
}

function promotionOwnerFromChecklist(
  owner: VlmBrainPass259PromotionChecklistItem["owner"],
): VlmBrainPass260PromotionLane["owner"] {
  switch (owner) {
    case "source_reviewer": return "source";
    case "redaction_reviewer": return "redaction";
    case "browser_qa":
    case "browser_trace": return "browser";
    case "storage_owner": return "storage";
    case "report_owner": return "report";
    case "access_owner": return "wallet";
    case "release_owner": return "release_owner";
    default: return "copy";
  }
}

function laneFromChecklist(item: VlmBrainPass259PromotionChecklistItem): VlmBrainPass260PromotionLane {
  return {
    id: stableId(`PASS260-CHECKLIST-LANE-${item.id}`),
    lane: item.owner === "release_owner" ? "release_owner" : "copy",
    label: compact(item.label, "Promotion checklist lane", 100),
    owner: promotionOwnerFromChecklist(item.owner),
    priority: item.priority,
    state: stateFromChecklist(item.state),
    sourceState: item.state,
    checklistRef: item.id,
    promotionAllowed: false,
    customerVisible: false,
    operatorNext: compact(item.blockerReason, "Resolve checklist item before release promotion review.", 260),
    acceptance: compact(item.acceptance, "Checklist item requires owner review.", 260),
  };
}

function reviewPacketFromLane(lane: VlmBrainPass260PromotionLane): VlmBrainPass260ReviewPacket {
  const isBrowser = lane.lane === "browser" || lane.label.toLowerCase().includes("browser");
  const isStorage = lane.lane === "storage" || lane.lane === "source" || lane.lane === "report";
  const isRedaction = lane.lane === "redaction" || lane.lane === "copy" || lane.lane === "report";
  return {
    id: stableId(`PASS260-REVIEW-PACKET-${lane.id}`),
    owner: isBrowser ? "browser_trace" : lane.owner,
    priority: lane.priority,
    state: lane.state,
    label: compact(lane.label, "Review packet", 90),
    missingReceipt: lane.state === "blocked",
    browserReplayRequired: isBrowser,
    durableWriteRequired: isStorage,
    redactionReviewRequired: isRedaction,
    note: compact(lane.operatorNext, "Attach reviewed evidence packet before promotion can be considered.", 240),
  };
}

function customerFreezeLine(lane: VlmBrainPass260PromotionLane): VlmBrainPass260CustomerFreezeLine {
  return {
    id: stableId(`PASS260-CUSTOMER-FREEZE-${lane.id}`),
    label: compact(lane.label, "Customer freeze line", 90),
    state: "hidden_until_review",
    reason: compact(lane.acceptance, "Keep this lane operator-only until review packet is complete.", 220),
    customerCopyAllowed: false,
  };
}

export function buildVlmBrainPass260ReleasePromotionFirewall(
  ledger: VlmBrainPass259AttestationLedger,
): VlmBrainPass260ReleasePromotionFirewall {
  const lanes = sortByPriority([
    ...ledger.attestations.map(laneFromAttestation),
    ...ledger.promotionChecklist.map(laneFromChecklist),
  ]);
  const blockedLaneCount = lanes.filter((lane) => lane.state === "blocked").length;
  const captureRequiredCount = lanes.filter((lane) => lane.state === "capture_required").length;
  const ownerReviewCount = lanes.filter((lane) => lane.state === "review_required").length;
  const reviewPackets = lanes.map(reviewPacketFromLane);
  const customerFreezeLines = lanes.filter((lane) => lane.state !== "quarantined").slice(0, 8).map(customerFreezeLine);
  const top = lanes.find((lane) => lane.state === "blocked")
    ?? lanes.find((lane) => lane.state === "capture_required")
    ?? lanes.find((lane) => lane.state === "review_required")
    ?? lanes[0];
  const decision = blockedLaneCount > 0
    ? "promotion_quarantined"
    : captureRequiredCount > 0
      ? "capture_required"
      : ownerReviewCount > 0
        ? "owner_review_required"
        : "attestation_missing";

  return {
    schemaVersion: PASS260_SCHEMA,
    mode: "operator_release_promotion_firewall_review_packet",
    firewallId: stableId(`VLM-PASS260-PROMOTION-FIREWALL-${ledger.token.symbol}-${ledger.attestationLedgerId}`),
    token: ledger.token,
    decision,
    promotionFirewallActive: true,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    releasePromotionAllowed: false,
    publicReleaseBadgeAllowed: false,
    finalVerdictAllowed: false,
    reviewPacketReady: false,
    promotionLaneCount: lanes.length,
    blockedLaneCount,
    captureRequiredCount,
    ownerReviewCount,
    customerFreezeCount: customerFreezeLines.length,
    lanes,
    reviewPackets,
    customerFreezeLines,
    promotionChecklist: ledger.promotionChecklist.map((item) => ({
      id: item.id,
      label: item.label,
      owner: item.owner,
      priority: item.priority,
      state: item.state,
      acceptance: item.acceptance,
    })),
    nextPromotionMove: top
      ? `${top.priority} · ${top.label}: ${top.operatorNext}`
      : "Keep promotion firewall active until review packets are complete.",
    operatorSummary:
      "PASS260 adds a release promotion firewall above the attestation ledger. It groups owner lanes into review packets, keeps customer copy hidden until review and prevents public release badges while source, browser, storage or redaction packets are incomplete.",
    customerBoundary:
      "Operator-only promotion firewall. It does not enable public export, raw payload export, binary report download, wallet/session access, customer copy, final verdicts or public release badges.",
  };
}

export const PASS260_VLM_BRAIN_RELEASE_PROMOTION_FIREWALL_CONTRACT = true;
