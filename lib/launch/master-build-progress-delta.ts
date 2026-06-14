import { velmereMasterBuildAreas } from "./master-build-areas";

export type VelmereProgressDeltaStatus = "improved" | "unchanged" | "blocked";

export type VelmereProgressDeltaEntry = {
  id: string;
  previous: number;
  current: number;
  change: number;
  status: VelmereProgressDeltaStatus;
  note: string;
};

export const velmerePass199ProgressDeltas: VelmereProgressDeltaEntry[] = [
  { id: "A05", previous: 99, current: 100, change: 1, status: "improved", note: "Preflight now guards the progress-delta ledger itself." },
  { id: "A06", previous: 64, current: 68, change: 4, status: "improved", note: "Runtime/QA reporting gained an explicit pass delta lane." },
  { id: "B06", previous: 66, current: 68, change: 2, status: "improved", note: "Copy psychology progress is now tracked per pass instead of being hidden in a broad brand bucket." },
  { id: "C01", previous: 66, current: 67, change: 1, status: "improved", note: "Shield terminal progress is separated from search and live-adapter blockers." },
  { id: "C02", previous: 94, current: 95, change: 1, status: "improved", note: "Search portal containment remains guarded and visible in the master matrix." },
  { id: "C03", previous: 62, current: 63, change: 1, status: "improved", note: "Global token lookup progress is tracked separately from local table suggestions." },
  { id: "C05", previous: 94, current: 95, change: 1, status: "improved", note: "Token fallback glyph coverage is reflected in the granular table." },
  { id: "E01", previous: 82, current: 83, change: 1, status: "improved", note: "Lens command-router work is now included in per-pass deltas." },
  { id: "E02", previous: 82, current: 83, change: 1, status: "improved", note: "Lens search UX has its own delta row instead of being merged into Shield." },
  { id: "J04", previous: 88, current: 91, change: 3, status: "improved", note: "Portal/z-index/scroll-lock fixes are now tracked as a dedicated QA surface." },
  { id: "K03", previous: 35, current: 39, change: 4, status: "improved", note: "Analytics taxonomy now includes pass-progress event naming and privacy-safe reporting boundaries." },
  { id: "K06", previous: 38, current: 40, change: 2, status: "improved", note: "Operator handoff visibility improved through a stable delta ledger." },
  { id: "M03", previous: 52, current: 54, change: 2, status: "improved", note: "Evidence-note reporting now has clearer current/next/blocker separation." },
  { id: "M04", previous: 76, current: 78, change: 2, status: "improved", note: "Safe wording progress remains guard-backed in every pass report." },
  { id: "M07", previous: 38, current: 41, change: 3, status: "improved", note: "Operator-only vs customer-visible reporting now appears in the delta table." },
];

export const velmerePass199ProgressDeltaSummary = {
  pass: "PASS199",
  title: "Progress Delta Ledger / No More Hidden Percentage Movement",
  changedAreas: velmerePass199ProgressDeltas.length,
  totalDelta: velmerePass199ProgressDeltas.reduce((sum, item) => sum + item.change, 0),
  affectedGroups: Array.from(new Set(velmerePass199ProgressDeltas.map((item) => item.id[0]))).sort(),
  rule: "Every future pass must include Previous → Current → Change for the areas touched by that pass.",
};

export const getVelmerePass199ProgressDeltaRows = () =>
  velmerePass199ProgressDeltas.map((delta) => {
    const area = velmereMasterBuildAreas.find((item) => item.id === delta.id);
    return {
      ...delta,
      group: area?.group ?? delta.id[0],
      label: area?.label ?? delta.id,
      next: area?.next ?? "Keep tracking this row in the next pass.",
    };
  });

// PASS199 marker: progress deltas are explicit, guard-backed and reportable as Previous → Current → Change.
