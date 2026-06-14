import { velmereMasterBuildAreas } from "./master-build-areas";

export type VelmerePass203DeltaStatus = "improved" | "unchanged" | "blocked";

export type VelmerePass203ProgressDeltaEntry = {
  id: string;
  previous: number;
  current: number;
  change: number;
  status: VelmerePass203DeltaStatus;
  note: string;
};

export const velmerePass203ProgressDeltas: VelmerePass203ProgressDeltaEntry[] = [
  {
    id: "C06",
    previous: 70,
    current: 72,
    change: 2,
    status: "improved",
    note: "Risk scoring UI now has a stronger drawer rail showing evidence state, confidence and publication gate instead of only a numeric score.",
  },
  {
    id: "D15",
    previous: 58,
    current: 62,
    change: 4,
    status: "improved",
    note: "Every tile drawer now includes a group-specific operator checklist that maps the visual signal to concrete review actions.",
  },
  {
    id: "D16",
    previous: 57,
    current: 61,
    change: 4,
    status: "improved",
    note: "Visible Orbit/static cards now carry localized source badges and the drawer exposes evidence/confidence lanes before the long explanation.",
  },
  {
    id: "D17",
    previous: 66,
    current: 69,
    change: 3,
    status: "improved",
    note: "Missing/partial/fallback data now routes into a decision rail that blocks strong public language and keeps the case in review.",
  },
  {
    id: "D19",
    previous: 88,
    current: 90,
    change: 2,
    status: "improved",
    note: "Card click coverage is clearer because every visible tile shows a source badge and opens the same evidence-chain drawer.",
  },
  {
    id: "D21",
    previous: 46,
    current: 48,
    change: 2,
    status: "improved",
    note: "Evidence badges are static compositor-friendly UI and do not add new frame-loop state; real browser FPS QA is still required.",
  },
  {
    id: "D23",
    previous: 55,
    current: 58,
    change: 3,
    status: "improved",
    note: "The drawer now has structured rail labels and a checklist section, improving keyboard-readable operator flow before manual screen-reader QA.",
  },
  {
    id: "D24",
    previous: 80,
    current: 82,
    change: 2,
    status: "improved",
    note: "New evidence-chain, confidence and decision rail copy is localized for PL/EN/DE and avoids overclaim language.",
  },
  {
    id: "J02",
    previous: 60,
    current: 62,
    change: 2,
    status: "improved",
    note: "Accessibility moves forward through better labeled drawer rails and checklist structure; manual assistive-tech QA remains a blocker.",
  },
];

export const velmerePass203ProgressDeltaSummary = {
  pass: "PASS203",
  title: "AI Brain Evidence Chain Rail",
  changedAreas: velmerePass203ProgressDeltas.length,
  totalDelta: velmerePass203ProgressDeltas.reduce((sum, item) => sum + item.change, 0),
  affectedGroups: Array.from(new Set(velmerePass203ProgressDeltas.map((item) => item.id[0]))).sort(),
  previousCurrentChange: "Previous → Current → Change",
  rule: "Every AI Brain evidence/source/decision UI change must update D15/D16/D17/D19/D23/D24 and never convert missing data into a clean verdict.",
};

export const getVelmerePass203ProgressDeltaRows = () =>
  velmerePass203ProgressDeltas.map((delta) => {
    const area = velmereMasterBuildAreas.find((item) => item.id === delta.id);
    return {
      ...delta,
      group: area?.group ?? delta.id[0],
      label: area?.label ?? delta.id,
      next: area?.next ?? "Keep tracking this row in the next pass.",
    };
  });

// PASS203 marker: AI Brain evidence-chain rail, per-card source badges, decision rail and operator checklist are explicit progress deltas.
