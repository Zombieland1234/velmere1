import { velmereMasterBuildAreas } from "./master-build-areas";

export type VelmerePass205DeltaStatus = "improved" | "unchanged" | "blocked";

export type VelmerePass205ProgressDeltaEntry = {
  id: string;
  previous: number;
  current: number;
  change: number;
  status: VelmerePass205DeltaStatus;
  note: string;
};

export const velmerePass205ProgressDeltas: VelmerePass205ProgressDeltaEntry[] = [
  {
    id: "D09",
    previous: 81,
    current: 83,
    change: 2,
    status: "improved",
    note: "The isolated WebGL prototype layer is hidden on compact/reduced-motion contexts and never replaces the safe DOM Orbit fallback.",
  },
  {
    id: "D10",
    previous: 95,
    current: 96,
    change: 1,
    status: "improved",
    note: "The performance governor stays in control because the new renderer mounts only through the feature gate and does not add per-card React frame state.",
  },
  {
    id: "D11",
    previous: 42,
    current: 49,
    change: 7,
    status: "improved",
    note: "An isolated raw WebGL prototype component now exists behind NEXT_PUBLIC_VLM_BRAIN_RENDERER=webgl-prototype for visual/FPS comparison against DOM Orbit.",
  },
  {
    id: "D21",
    previous: 55,
    current: 58,
    change: 3,
    status: "improved",
    note: "The Brain can now compare DOM Orbit telemetry with a gated WebGL prototype lane in real browser QA instead of estimating renderer performance.",
  },
  {
    id: "D22",
    previous: 46,
    current: 54,
    change: 8,
    status: "improved",
    note: "The renderer contract now has prototype rules and the modal mounts the WebGL layer without breaking DOM Orbit, tile portals or keyboard flow.",
  },
  {
    id: "J06",
    previous: 94,
    current: 95,
    change: 1,
    status: "improved",
    note: "Animation performance is safer because the prototype uses one canvas/WebGL point buffer and stays disabled by default.",
  },
];

export const velmerePass205ProgressDeltaSummary = {
  pass: "PASS205",
  title: "AI Brain WebGL Prototype Isolation",
  changedAreas: velmerePass205ProgressDeltas.length,
  totalDelta: velmerePass205ProgressDeltas.reduce((sum, item) => sum + item.change, 0),
  affectedGroups: Array.from(new Set(velmerePass205ProgressDeltas.map((item) => item.id[0]))).sort(),
  previousCurrentChange: "Previous → Current → Change",
  rule: "WebGL can be tested, but DOM Orbit remains the production fallback until browser FPS, pointer and accessibility evidence is captured.",
};

export const getVelmerePass205ProgressDeltaRows = () =>
  velmerePass205ProgressDeltas.map((delta) => {
    const area = velmereMasterBuildAreas.find((item) => item.id === delta.id);
    return {
      ...delta,
      group: area?.group ?? delta.id[0],
      label: area?.label ?? delta.id,
      next: area?.next ?? "Keep tracking this row in the next pass.",
    };
  });

// PASS205 marker: isolated WebGL prototype renderer has explicit progress deltas and keeps DOM Orbit as fallback.
