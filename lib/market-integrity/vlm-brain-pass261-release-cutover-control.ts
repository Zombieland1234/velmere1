import type {
  VlmBrainPass260PromotionFirewallState,
  VlmBrainPass260ReleasePromotionFirewall,
  VlmBrainPass260ReviewPacket,
} from "./vlm-brain-pass260-release-promotion-firewall";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass261CutoverControlState =
  | "blocked"
  | "capture_required"
  | "review_required"
  | "rollback_required"
  | "cutover_quarantined";

export type VlmBrainPass261ControlLane = {
  id: string;
  lane: "source" | "browser" | "storage" | "redaction" | "pdf" | "wallet" | "customer_copy" | "release_owner";
  label: string;
  owner: VlmBrainPass260ReviewPacket["owner"] | "release_owner" | "wallet_owner" | "customer_copy_owner";
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass261CutoverControlState;
  packetRef?: VlmBrainPass260ReviewPacket["id"];
  holdReason: string;
  acceptance: string;
  cutoverAllowed: false;
  rollbackRequired: true;
};

export type VlmBrainPass261RollbackVaultItem = {
  id: string;
  label: string;
  priority: VlmBrainPass254HandoffPriority;
  state: "armed_hold" | "capture_hold" | "owner_hold";
  sourceLaneRef: string;
  rollbackTrigger: string;
  rollbackAction: string;
  customerVisible: false;
};

export type VlmBrainPass261ReadinessSeal = {
  id: string;
  label: string;
  state: "not_signed" | "capture_missing" | "review_missing";
  requiredOwner: VlmBrainPass261ControlLane["owner"];
  evidenceRequired: string;
  publicSealAllowed: false;
};

export type VlmBrainPass261ReleaseCutoverControl = {
  schemaVersion: "vlm-brain-pass261-release-cutover-control-v1";
  mode: "operator_release_cutover_control_rollback_vault";
  controlId: string;
  token: { symbol: string; name: string };
  decision: "cutover_quarantined" | "rollback_plan_required" | "capture_required" | "owner_review_required";
  cutoverControlActive: true;
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  releasePromotionAllowed: false;
  releaseCutoverAllowed: false;
  publicReadinessSealAllowed: false;
  finalVerdictAllowed: false;
  rollbackVaultRequired: true;
  controlLaneCount: number;
  rollbackItemCount: number;
  readinessSealCount: number;
  blockedLaneCount: number;
  captureRequiredCount: number;
  reviewRequiredCount: number;
  lanes: VlmBrainPass261ControlLane[];
  rollbackVault: VlmBrainPass261RollbackVaultItem[];
  readinessSeals: VlmBrainPass261ReadinessSeal[];
  nextCutoverMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS261_SCHEMA = "vlm-brain-pass261-release-cutover-control-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compact(value: unknown, fallback = "PASS261 cutover control review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS261-CUTOVER-CONTROL", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stateFromPacket(packet: VlmBrainPass260ReviewPacket): VlmBrainPass261CutoverControlState {
  if (packet.state === "blocked") return "blocked";
  if (packet.state === "capture_required") return "capture_required";
  if (packet.browserReplayRequired || packet.durableWriteRequired || packet.redactionReviewRequired) return "rollback_required";
  if (packet.state === "review_required") return "review_required";
  return "cutover_quarantined";
}

function laneFromPacket(packet: VlmBrainPass260ReviewPacket): VlmBrainPass261ControlLane {
  const label = packet.label.toLowerCase();
  const lane = packet.browserReplayRequired
    ? "browser"
    : packet.durableWriteRequired
      ? "storage"
      : packet.redactionReviewRequired
        ? "redaction"
        : label.includes("wallet")
          ? "wallet"
          : label.includes("pdf") || label.includes("report")
            ? "pdf"
            : label.includes("copy")
              ? "customer_copy"
              : label.includes("source")
                ? "source"
                : "release_owner";
  return {
    id: stableId(`PASS261-CONTROL-LANE-${packet.id}`),
    lane,
    label: compact(packet.label, "Cutover control lane", 110),
    owner: packet.owner,
    priority: packet.priority,
    state: stateFromPacket(packet),
    packetRef: packet.id,
    holdReason: compact(packet.note, "Review packet must be accepted before cutover planning.", 240),
    acceptance: compact(
      packet.browserReplayRequired
        ? "Attach same-session browser replay evidence and operator note before cutover review."
        : packet.durableWriteRequired
          ? "Attach durable snapshot write proof and rollback note before cutover review."
          : packet.redactionReviewRequired
            ? "Attach redaction review proof before customer-facing copy can be considered."
            : "Attach owner review note before cutover can be considered.",
      "Owner acceptance is required before cutover review.",
      260,
    ),
    cutoverAllowed: false,
    rollbackRequired: true,
  };
}

function manualControlLanes(firewall: VlmBrainPass260ReleasePromotionFirewall): VlmBrainPass261ControlLane[] {
  return [
    {
      id: stableId(`PASS261-MANUAL-PDF-${firewall.firewallId}`),
      lane: "pdf",
      label: "PDF route remains preview-only",
      owner: "release_owner",
      priority: "P0",
      state: "rollback_required",
      holdReason: "Binary report download stays disabled until storage, redaction and browser replay proof are accepted.",
      acceptance: "Confirm preview-only PDF route, rollback switch and customer-copy boundary in the operator packet.",
      cutoverAllowed: false,
      rollbackRequired: true,
    },
    {
      id: stableId(`PASS261-MANUAL-WALLET-${firewall.firewallId}`),
      lane: "wallet",
      label: "Wallet/session gate remains controlled",
      owner: "wallet_owner",
      priority: "P0",
      state: "review_required",
      holdReason: "Access levels stay utility/session controlled until entitlement and session proof are reviewed.",
      acceptance: "Confirm no sensitive credential capture, no public access claim and no entitlement bypass before cutover review.",
      cutoverAllowed: false,
      rollbackRequired: true,
    },
    {
      id: stableId(`PASS261-MANUAL-COPY-${firewall.firewallId}`),
      lane: "customer_copy",
      label: "Customer copy stays in review wording",
      owner: "customer_copy_owner",
      priority: "P1",
      state: "review_required",
      holdReason: "Customer-facing text stays limited to anomaly, source confidence, missing data and manual review boundaries.",
      acceptance: "Confirm reviewed wording before any public customer surface receives the summary.",
      cutoverAllowed: false,
      rollbackRequired: true,
    },
  ];
}

function sortByPriority<T extends { priority: VlmBrainPass254HandoffPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function rollbackState(state: VlmBrainPass261ControlLane["state"]): VlmBrainPass261RollbackVaultItem["state"] {
  if (state === "capture_required") return "capture_hold";
  if (state === "review_required") return "owner_hold";
  return "armed_hold";
}

function rollbackVaultItem(lane: VlmBrainPass261ControlLane): VlmBrainPass261RollbackVaultItem {
  return {
    id: stableId(`PASS261-ROLLBACK-${lane.id}`),
    label: lane.label,
    priority: lane.priority,
    state: rollbackState(lane.state),
    sourceLaneRef: lane.id,
    rollbackTrigger: compact(lane.holdReason, "Any missing acceptance keeps cutover disabled.", 220),
    rollbackAction: compact(
      `Keep ${lane.lane} in operator-only hold, preserve preview mode and require reviewed evidence before promotion is reconsidered.`,
      "Keep lane in operator-only hold until reviewed evidence exists.",
      240,
    ),
    customerVisible: false,
  };
}

function readinessSeal(lane: VlmBrainPass261ControlLane): VlmBrainPass261ReadinessSeal {
  return {
    id: stableId(`PASS261-SEAL-${lane.id}`),
    label: lane.label,
    state: lane.state === "capture_required" ? "capture_missing" : lane.state === "review_required" ? "review_missing" : "not_signed",
    requiredOwner: lane.owner,
    evidenceRequired: compact(lane.acceptance, "Reviewed evidence is required before any readiness seal.", 220),
    publicSealAllowed: false,
  };
}

export function buildVlmBrainPass261ReleaseCutoverControl(
  firewall: VlmBrainPass260ReleasePromotionFirewall,
): VlmBrainPass261ReleaseCutoverControl {
  const lanes = sortByPriority([
    ...firewall.reviewPackets.map(laneFromPacket),
    ...manualControlLanes(firewall),
  ]);
  const rollbackVault = lanes.slice(0, 10).map(rollbackVaultItem);
  const readinessSeals = lanes.slice(0, 8).map(readinessSeal);
  const blockedLaneCount = lanes.filter((lane) => lane.state === "blocked").length;
  const captureRequiredCount = lanes.filter((lane) => lane.state === "capture_required").length;
  const reviewRequiredCount = lanes.filter((lane) => lane.state === "review_required" || lane.state === "rollback_required").length;
  const top = lanes.find((lane) => lane.state === "blocked")
    ?? lanes.find((lane) => lane.state === "capture_required")
    ?? lanes.find((lane) => lane.state === "rollback_required")
    ?? lanes.find((lane) => lane.state === "review_required")
    ?? lanes[0];
  const decision = blockedLaneCount > 0
    ? "cutover_quarantined"
    : captureRequiredCount > 0
      ? "capture_required"
      : reviewRequiredCount > 0
        ? "rollback_plan_required"
        : "owner_review_required";

  return {
    schemaVersion: PASS261_SCHEMA,
    mode: "operator_release_cutover_control_rollback_vault",
    controlId: stableId(`VLM-PASS261-CUTOVER-CONTROL-${firewall.token.symbol}-${firewall.firewallId}`),
    token: firewall.token,
    decision,
    cutoverControlActive: true,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    releasePromotionAllowed: false,
    releaseCutoverAllowed: false,
    publicReadinessSealAllowed: false,
    finalVerdictAllowed: false,
    rollbackVaultRequired: true,
    controlLaneCount: lanes.length,
    rollbackItemCount: rollbackVault.length,
    readinessSealCount: readinessSeals.length,
    blockedLaneCount,
    captureRequiredCount,
    reviewRequiredCount,
    lanes,
    rollbackVault,
    readinessSeals,
    nextCutoverMove: top
      ? `${top.priority} · ${top.label}: ${top.acceptance}`
      : "Keep cutover control active until reviewed evidence and rollback notes exist.",
    operatorSummary:
      "PASS261 adds a release cutover control above the promotion firewall. It converts review packets into cutover lanes, rollback vault items and readiness seals while keeping public export, binary report download, wallet/session access and customer copy disabled.",
    customerBoundary:
      "Operator-only cutover control. It does not enable public export, raw payload export, binary report download, wallet/session access, customer copy, public readiness seals, final verdicts or release cutover.",
  };
}

export const PASS261_VLM_BRAIN_RELEASE_CUTOVER_CONTROL_CONTRACT = true;
