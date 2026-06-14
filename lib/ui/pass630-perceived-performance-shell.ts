export const PASS630_SHELL_VERSION = "pass630-perceived-performance-shell" as const;

export type StableShellPhase = "pending" | "partial" | "live" | "error";
export type StableShellSurface = "shield" | "browser" | "pdf" | "brain" | "map" | "real_markets";

export type StableShellInput = {
  surface: StableShellSurface;
  phase: StableShellPhase;
  minHeightPx: number;
  finalMinHeightPx?: number;
};

export type StableShellContract = {
  surface: StableShellSurface;
  phase: StableShellPhase;
  minHeightPx: number;
  ariaBusy: boolean;
  preserveGeometry: boolean;
  mayReplaceContentInPlace: boolean;
  layoutShiftRisk: "low" | "review";
};

export function buildPass630StableShell(input: StableShellInput): StableShellContract {
  const minHeightPx = Math.max(44, Math.round(input.minHeightPx));
  const finalMinHeightPx = Math.max(44, Math.round(input.finalMinHeightPx ?? minHeightPx));
  const geometryDelta = Math.abs(finalMinHeightPx - minHeightPx);
  const preserveGeometry = geometryDelta <= Math.max(8, finalMinHeightPx * 0.04);

  return {
    surface: input.surface,
    phase: input.phase,
    minHeightPx,
    ariaBusy: input.phase === "pending" || input.phase === "partial",
    preserveGeometry,
    mayReplaceContentInPlace: input.phase !== "error",
    layoutShiftRisk: preserveGeometry ? "low" : "review",
  };
}
