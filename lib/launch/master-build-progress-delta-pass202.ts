import { velmereMasterBuildAreas } from "./master-build-areas";

export type VelmerePass202DeltaStatus = "improved" | "unchanged" | "blocked";

export type VelmerePass202ProgressDeltaEntry = {
  id: string;
  previous: number;
  current: number;
  change: number;
  status: VelmerePass202DeltaStatus;
  note: string;
};

export const velmerePass202ProgressDeltas: VelmerePass202ProgressDeltaEntry[] = [
  {
    id: "D14",
    previous: 88,
    current: 91,
    change: 3,
    status: "improved",
    note: "Tile-specific explainer taxonomy now has a dedicated PL/EN/DE drawer pass instead of leaving German users with English body copy.",
  },
  {
    id: "D16",
    previous: 52,
    current: 57,
    change: 5,
    status: "improved",
    note: "Brain detail panels now show localized source-trust state so live, partial and fallback data are not visually treated as equal.",
  },
  {
    id: "D17",
    previous: 62,
    current: 66,
    change: 4,
    status: "improved",
    note: "Missing/partial/fallback data now maps to publication-state language that blocks strong public wording when evidence is weak.",
  },
  {
    id: "D18",
    previous: 86,
    current: 87,
    change: 1,
    status: "improved",
    note: "Basic/Pro/Advanced still share the clean Orbit 360 lane while drawer metadata keeps the active depth visible.",
  },
  {
    id: "D19",
    previous: 87,
    current: 88,
    change: 1,
    status: "improved",
    note: "The tile portal now exposes previous/next controls so users can inspect the brain without hunting cards behind the orbit.",
  },
  {
    id: "D23",
    previous: 51,
    current: 55,
    change: 4,
    status: "improved",
    note: "Localized previous/next controls and keyboard hints make the VLM Brain drawer easier to use by keyboard.",
  },
  {
    id: "D24",
    previous: 72,
    current: 80,
    change: 8,
    status: "improved",
    note: "German AI Brain drawer copy is now localized across risk, liquidity, holders, signals, source quality and access boundary sections.",
  },
  {
    id: "J02",
    previous: 58,
    current: 60,
    change: 2,
    status: "improved",
    note: "Accessibility moves forward through visible keyboard instructions and portal navigation controls; manual screen-reader QA is still required.",
  },
];

export const velmerePass202ProgressDeltaSummary = {
  pass: "PASS202",
  title: "AI Brain Localization + Source Trust Drawer",
  changedAreas: velmerePass202ProgressDeltas.length,
  totalDelta: velmerePass202ProgressDeltas.reduce((sum, item) => sum + item.change, 0),
  affectedGroups: Array.from(new Set(velmerePass202ProgressDeltas.map((item) => item.id[0]))).sort(),
  previousCurrentChange: "Previous → Current → Change",
  rule: "Every AI Brain drawer change must update D14/D16/D17/D23/D24 when it changes copy, source trust or keyboard navigation.",
};

export const getVelmerePass202ProgressDeltaRows = () =>
  velmerePass202ProgressDeltas.map((delta) => {
    const area = velmereMasterBuildAreas.find((item) => item.id === delta.id);
    return {
      ...delta,
      group: area?.group ?? delta.id[0],
      label: area?.label ?? delta.id,
      next: area?.next ?? "Keep tracking this row in the next pass.",
    };
  });

// PASS202 marker: AI Brain localization, source-trust state, publication-state state and previous/next tile drawer navigation are explicit progress deltas.
