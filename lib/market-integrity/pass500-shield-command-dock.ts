export type Pass500ShieldCommandDock = {
  version: "pass500-shield-command-dock";
  riskLaneId: string | null;
  stableLaneId: string | null;
  spread: number;
  readyLanes: number;
  reviewLanes: number;
  nextStep: string;
};

type Pass500Lane = { id: string; score: number; status: string };

export function buildPass500ShieldCommandDock(
  lanes: Pass500Lane[],
  nextStep: string | undefined,
): Pass500ShieldCommandDock {
  const sorted = [...lanes].sort((left, right) => right.score - left.score);
  const stable = [...lanes].sort((left, right) => left.score - right.score)[0];
  return {
    version: "pass500-shield-command-dock",
    riskLaneId: sorted[0]?.id ?? null,
    stableLaneId: stable?.id ?? null,
    spread: sorted.length ? Math.max(0, (sorted[0]?.score ?? 0) - (stable?.score ?? 0)) : 0,
    readyLanes: lanes.filter((lane) => lane.status === "confirmed" || lane.status === "likely").length,
    reviewLanes: lanes.filter((lane) => lane.status !== "confirmed" && lane.status !== "likely").length,
    nextStep: nextStep || "Verify the highest-risk lane before strengthening the conclusion.",
  };
}
