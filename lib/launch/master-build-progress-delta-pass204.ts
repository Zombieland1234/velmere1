import { velmereMasterBuildAreas } from "./master-build-areas";

export type VelmerePass204DeltaStatus = "improved" | "unchanged" | "blocked";

export type VelmerePass204ProgressDeltaEntry = {
  id: string;
  previous: number;
  current: number;
  change: number;
  status: VelmerePass204DeltaStatus;
  note: string;
};

export const velmerePass204ProgressDeltas: VelmerePass204ProgressDeltaEntry[] = [
  {
    id: "D09",
    previous: 79,
    current: 81,
    change: 2,
    status: "improved",
    note: "Reading a tile now stops Orbit updates and the motion-health chip is hidden on compact/mobile viewports to reduce visual and runtime load.",
  },
  {
    id: "D10",
    previous: 93,
    current: 95,
    change: 2,
    status: "improved",
    note: "The Orbit governor skips update ticks while the tile drawer is open and keeps sparse React updates instead of running card state every frame.",
  },
  {
    id: "D11",
    previous: 38,
    current: 42,
    change: 4,
    status: "improved",
    note: "A typed WebGL/Three.js migration gate contract was added so a future renderer can be tested without replacing the current DOM Orbit fallback.",
  },
  {
    id: "D21",
    previous: 48,
    current: 55,
    change: 7,
    status: "improved",
    note: "The Brain now samples browser FPS and worst frame delta once per second, exposing telemetry without claiming production smoothness.",
  },
  {
    id: "D22",
    previous: 40,
    current: 46,
    change: 6,
    status: "improved",
    note: "The WebGL migration contract defines default DOM fallback, experimental renderer ID, browser-QA requirements and hard safety rules.",
  },
  {
    id: "J06",
    previous: 92,
    current: 94,
    change: 2,
    status: "improved",
    note: "Animation performance improves through reading-pause behavior and low-frequency telemetry instead of extra frame-loop setState.",
  },
];

export const velmerePass204ProgressDeltaSummary = {
  pass: "PASS204",
  title: "AI Brain FPS Telemetry + WebGL Gate",
  changedAreas: velmerePass204ProgressDeltas.length,
  totalDelta: velmerePass204ProgressDeltas.reduce((sum, item) => sum + item.change, 0),
  affectedGroups: Array.from(new Set(velmerePass204ProgressDeltas.map((item) => item.id[0]))).sort(),
  previousCurrentChange: "Previous → Current → Change",
  rule: "Every Brain performance change must measure rather than promise smoothness, keep DOM Orbit fallback active, and keep WebGL behind an explicit gate.",
};

export const getVelmerePass204ProgressDeltaRows = () =>
  velmerePass204ProgressDeltas.map((delta) => {
    const area = velmereMasterBuildAreas.find((item) => item.id === delta.id);
    return {
      ...delta,
      group: area?.group ?? delta.id[0],
      label: area?.label ?? delta.id,
      next: area?.next ?? "Keep tracking this row in the next pass.",
    };
  });

// PASS204 marker: AI Brain FPS telemetry, selected-tile pause and WebGL renderer gate are explicit progress deltas.
