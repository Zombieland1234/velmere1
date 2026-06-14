import type { VlmBrainLiveAdapterFreshnessMesh } from "./vlm-brain-live-adapter-freshness";
import type { VlmBrainReleaseReviewPacket } from "./vlm-brain-release-review-packet";
import type { VlmBrainSourcePolicyGate } from "./vlm-brain-source-policy-gate";

export type VlmBrainDurableSnapshotWrite = {
  id: string;
  label: string;
  state: "ready_preview" | "blocked" | "requires_server_adapter";
  storageTarget: "source_snapshot" | "case_timeline" | "redaction_envelope" | "export_manifest";
  containsCustomerPii: false;
  rawPayloadAllowed: false;
  nextWriteStep: string;
};

export type VlmBrainDurableSnapshotPlan = {
  schemaVersion: "vlm-brain-durable-snapshot-plan-v1-pass219";
  planMode: "operator_durable_write_preview";
  planId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  freshnessMeshId: string;
  policyId: string;
  releasePacketId: string;
  durableWriteDecision: "blocked" | "server_adapter_required" | "preview_ready";
  sourceSnapshotStore: "not_connected";
  caseTimelineStore: "not_connected";
  exportManifestStore: "not_connected";
  blockedWriteCount: number;
  previewReadyCount: number;
  writes: VlmBrainDurableSnapshotWrite[];
  operatorSummary: string;
  customerBoundary: string;
};

const PASS219_DURABLE_SNAPSHOT_SCHEMA = "vlm-brain-durable-snapshot-plan-v1-pass219" as const;

function compact(value: unknown, fallback = "durable snapshot review required", limit = 300) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-DURABLE-SNAPSHOT", 240)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function write(id: string, label: string, storageTarget: VlmBrainDurableSnapshotWrite["storageTarget"], blocked: boolean, nextWriteStep: string): VlmBrainDurableSnapshotWrite {
  return {
    id,
    label,
    state: blocked ? "blocked" : "requires_server_adapter",
    storageTarget,
    containsCustomerPii: false,
    rawPayloadAllowed: false,
    nextWriteStep: compact(nextWriteStep),
  };
}

function decisionFor(writes: VlmBrainDurableSnapshotWrite[]): VlmBrainDurableSnapshotPlan["durableWriteDecision"] {
  if (writes.some((item) => item.state === "blocked")) return "blocked";
  if (writes.some((item) => item.state === "requires_server_adapter")) return "server_adapter_required";
  return "preview_ready";
}

export function buildVlmBrainDurableSnapshotPlan(
  freshnessMesh: VlmBrainLiveAdapterFreshnessMesh,
  policyGate: VlmBrainSourcePolicyGate,
  releasePacket: VlmBrainReleaseReviewPacket,
): VlmBrainDurableSnapshotPlan {
  const createdAt = freshnessMesh.createdAt ?? new Date().toISOString();
  const freshnessBlocked = freshnessMesh.hardStopCount > 0 || freshnessMesh.customerExportGate === "blocked";
  const policyBlocked = policyGate.policyDecision === "blocked" || policyGate.customerCopy === "blocked";
  const releaseBlocked = releasePacket.decision === "hard_block";
  const writes = [
    write("source_snapshot", "Source snapshot store", "source_snapshot", freshnessBlocked, "Connect server-only source snapshot adapter with adapter id, receivedAt, staleAt, expiresAt and redacted payload."),
    write("case_timeline", "Case timeline store", "case_timeline", releaseBlocked, "Persist operator timeline events with reviewer id and no raw customer PII before export."),
    write("redaction_envelope", "Redaction envelope store", "redaction_envelope", policyBlocked, "Store redaction envelope and forbidden-claim checks before any customer-facing brief."),
    write("export_manifest", "Export manifest store", "export_manifest", freshnessBlocked || policyBlocked || releaseBlocked, "Create export manifest only after source, policy and release gates pass review."),
  ];
  const durableWriteDecision = decisionFor(writes);
  return {
    schemaVersion: PASS219_DURABLE_SNAPSHOT_SCHEMA,
    planMode: "operator_durable_write_preview",
    planId: stableId(`VLM-DURABLE-SNAPSHOT-${freshnessMesh.token.symbol}-${policyGate.policyId}-${createdAt}`),
    createdAt,
    token: freshnessMesh.token,
    freshnessMeshId: freshnessMesh.meshId,
    policyId: policyGate.policyId,
    releasePacketId: releasePacket.packetId,
    durableWriteDecision,
    sourceSnapshotStore: "not_connected",
    caseTimelineStore: "not_connected",
    exportManifestStore: "not_connected",
    blockedWriteCount: writes.filter((item) => item.state === "blocked").length,
    previewReadyCount: writes.filter((item) => item.state === "ready_preview").length,
    writes,
    operatorSummary:
      durableWriteDecision === "blocked"
        ? "Durable write plan is blocked by freshness, policy or release debt. Keep customer export disabled."
        : durableWriteDecision === "server_adapter_required"
          ? "No customer export yet: server-only durable adapters are required before source snapshots become proof."
          : "Durable write preview is structurally ready, but production storage still requires server deployment and manual QA.",
    customerBoundary:
      "Durable snapshot plan is an internal readiness layer. It is not a certificate, proof of safety, trading signal or final public verdict.",
  };
}

export const PASS219_VLM_BRAIN_DURABLE_SNAPSHOT_PLAN_CONTRACT = true;
