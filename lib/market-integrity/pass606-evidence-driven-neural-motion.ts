export type Pass606NeuralMotionMode =
  | "offscreen"
  | "reduced"
  | "settled"
  | "initial_evidence"
  | "evidence_delta"
  | "lineage_delta";

export type Pass606NeuralMotionPlan = {
  version: "pass606-evidence-driven-neural-motion";
  mode: Pass606NeuralMotionMode;
  fingerprint: string;
  animate: boolean;
  iterations: 0 | 1;
  durationMs: number;
  rotationDegrees: number;
  pulseScale: number;
  reason: string;
};

function hash(value: string): string {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return (output >>> 0).toString(36);
}

export function createPass606NeuralEvidenceFingerprint(input: {
  subject: string;
  activeNodeId?: string | null;
  evidence: Array<{ id: string; status: string; value?: string }>;
  sourceIds?: string[];
  conflictCount?: number;
  confidence?: number;
}): string {
  const payload = [
    input.subject.trim().toUpperCase(),
    input.activeNodeId ?? "verdict",
    ...input.evidence
      .map((item) => `${item.id}:${item.status}:${item.value ?? ""}`)
      .sort(),
    ...(input.sourceIds ?? []).slice().sort(),
    String(input.conflictCount ?? 0),
    String(input.confidence ?? 0),
  ].join("|");
  return `neural-${hash(payload)}`;
}

export function buildPass606EvidenceDrivenNeuralMotion(input: {
  fingerprint: string;
  previousFingerprint?: string | null;
  visible: boolean;
  reducedMotion: boolean;
  paused?: boolean;
  activeNodeChanged?: boolean;
}): Pass606NeuralMotionPlan {
  let mode: Pass606NeuralMotionMode = "settled";
  if (!input.visible) mode = "offscreen";
  else if (input.reducedMotion || input.paused) mode = "reduced";
  else if (!input.previousFingerprint) mode = "initial_evidence";
  else if (input.activeNodeChanged) mode = "lineage_delta";
  else if (input.previousFingerprint !== input.fingerprint) mode = "evidence_delta";

  const animate = mode === "initial_evidence" || mode === "evidence_delta" || mode === "lineage_delta";
  const durationMs = animate ? (mode === "lineage_delta" ? 620 : 840) : 0;
  return {
    version: "pass606-evidence-driven-neural-motion",
    mode,
    fingerprint: input.fingerprint,
    animate,
    iterations: animate ? 1 : 0,
    durationMs,
    rotationDegrees: animate ? (mode === "lineage_delta" ? 9 : 16) : 0,
    pulseScale: animate ? 1.08 : 1,
    reason:
      mode === "initial_evidence"
        ? "one_shot_initial_evidence_reveal"
        : mode === "evidence_delta"
          ? "one_shot_verified_evidence_change"
          : mode === "lineage_delta"
            ? "one_shot_active_lineage_change"
            : mode,
  };
}
