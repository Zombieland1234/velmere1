export type Pass601EvidenceMotion = {
  version: "pass601-evidence-only-motion";
  mode: "offscreen" | "reduced" | "settled" | "probing" | "evidence_delta";
  animate: boolean;
  durationMs: number;
  iterations: 0 | 1;
  fingerprint: string;
};

export function createPass601EvidenceFingerprint(input: {
  snapshotId?: string | null;
  deltaState?: string | null;
  riskDelta?: number | null;
  blockerDelta?: number | null;
  sourceState?: string | null;
}) {
  return [
    input.snapshotId ?? "none",
    input.deltaState ?? "baseline",
    Math.round(Number(input.riskDelta ?? 0)),
    Math.round(Number(input.blockerDelta ?? 0)),
    input.sourceState ?? "unknown",
  ].join("|");
}

export function buildPass601EvidenceOnlyMotion(input: {
  visible: boolean;
  reducedMotion: boolean;
  loading: boolean;
  evidenceChanged: boolean;
  fingerprint: string;
}): Pass601EvidenceMotion {
  const mode: Pass601EvidenceMotion["mode"] = !input.visible
    ? "offscreen"
    : input.reducedMotion
      ? "reduced"
      : input.loading
        ? "probing"
        : input.evidenceChanged
          ? "evidence_delta"
          : "settled";
  const animate = mode === "probing" || mode === "evidence_delta";
  return {
    version: "pass601-evidence-only-motion",
    mode,
    animate,
    durationMs: mode === "probing" ? 1600 : mode === "evidence_delta" ? 920 : 0,
    iterations: animate ? 1 : 0,
    fingerprint: input.fingerprint,
  };
}
