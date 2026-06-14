import { velmereMasterBuildAreas } from "./master-build-areas";

export type VelmerePass201DeltaStatus = "improved" | "unchanged" | "blocked";

export type VelmerePass201ProgressDeltaEntry = {
  id: string;
  previous: number;
  current: number;
  change: number;
  status: VelmerePass201DeltaStatus;
  note: string;
};

export const velmerePass201ProgressDeltas: VelmerePass201ProgressDeltaEntry[] = [
  {
    id: "D07",
    previous: 91,
    current: 94,
    change: 3,
    status: "improved",
    note: "Tile detail moved into a document.body portal with a solid premium panel, outside click and ESC close, reducing clipping risk under Orbit 360.",
  },
  {
    id: "D10",
    previous: 92,
    current: 93,
    change: 1,
    status: "improved",
    note: "Orbit auto-spin is slowed and paused while a tile detail is open so reading a signal does not fight the animation.",
  },
  {
    id: "D19",
    previous: 84,
    current: 87,
    change: 3,
    status: "improved",
    note: "Brain cards now support keyboard relative selection in addition to pointer clicks, while still opening only one detail layer.",
  },
  {
    id: "D20",
    previous: 92,
    current: 95,
    change: 3,
    status: "improved",
    note: "VLM tile detail is now a high-z body portal above the token modal, mode guide and Orbit 360 scene.",
  },
  {
    id: "D23",
    previous: 44,
    current: 51,
    change: 7,
    status: "improved",
    note: "Escape closes the detail layer, arrow keys move between revealed tiles, and the detail drawer has ARIA dialog semantics.",
  },
  {
    id: "J04",
    previous: 91,
    current: 93,
    change: 2,
    status: "improved",
    note: "Scroll/z-index layering now covers Shield search portal, mode guide portal and VLM tile detail portal as separate layers.",
  },
  {
    id: "J06",
    previous: 90,
    current: 92,
    change: 2,
    status: "improved",
    note: "User-facing plus/minus clutter is hidden, auto orbit is slower, and tile-reading pauses motion for better perceived performance.",
  },
];

export const velmerePass201ProgressDeltaSummary = {
  pass: "PASS201",
  title: "AI Brain Interaction Portal / Keyboard + Pause-On-Read",
  changedAreas: velmerePass201ProgressDeltas.length,
  totalDelta: velmerePass201ProgressDeltas.reduce((sum, item) => sum + item.change, 0),
  affectedGroups: Array.from(new Set(velmerePass201ProgressDeltas.map((item) => item.id[0]))).sort(),
  rule: "Every AI Brain pass must keep the D01-D24 matrix visible and update Previous → Current → Change rows.",
};

export const getVelmerePass201ProgressDeltaRows = () =>
  velmerePass201ProgressDeltas.map((delta) => {
    const area = velmereMasterBuildAreas.find((item) => item.id === delta.id);
    return {
      ...delta,
      group: area?.group ?? delta.id[0],
      label: area?.label ?? delta.id,
      next: area?.next ?? "Keep tracking this row in the next pass.",
    };
  });

// PASS201 marker: AI Brain tile detail portal, keyboard navigation and pause-on-read are explicit progress deltas.
