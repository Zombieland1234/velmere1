export const PASS268_CHART_GESTURE_MODE_DOCK_DELTA = true;

export const velmerePass268ProgressDeltas = [
  {
    id: "C07",
    area: "Chart engine",
    previous: 88,
    current: 91,
    delta: 3,
    note: "Natural chart pan is now locked to same-direction drag: right moves right, left moves left.",
  },
  {
    id: "C08",
    area: "Token modal shell",
    previous: 93,
    current: 94,
    delta: 1,
    note: "The VLM mode dock keeps direct Basic/Pro/Advanced actions and removes the extra OPIS popup buttons.",
  },
  {
    id: "D18",
    area: "Basic / Pro / Advanced depth contract",
    previous: 90,
    current: 91,
    delta: 1,
    note: "Depth remains tiered, but the entry surface is cleaner and action-only before Orbit 360 opens.",
  },
  {
    id: "J02",
    area: "Accessibility / ARIA",
    previous: 62,
    current: 63,
    delta: 1,
    note: "Removing redundant OPIS popup buttons lowers focus clutter in the right-side modal control area.",
  },
  {
    id: "M04",
    area: "Safe export wording",
    previous: 86,
    current: 87,
    delta: 1,
    note: "Status/FOMO/MwSt trust cues are framed as queue/status/trust clarity, not buy pressure or investment promise.",
  },
] as const;

export const velmerePass268Summary = {
  pass: "PASS268",
  title: "Chart natural-pan + no-OPIS VLM mode dock",
  userVisibleFixes: [
    "Dragging the chart right now moves the chart window right; dragging left moves it left.",
    "Basic/Pro/Advanced no longer show separate OPIS buttons or mode-guide popups in the side dock.",
    "The modal keeps a subtle chart-first/status/MwSt-safe trust rail with no buy pressure.",
  ],
  totalDelta: velmerePass268ProgressDeltas.reduce((sum, item) => sum + item.delta, 0),
};
