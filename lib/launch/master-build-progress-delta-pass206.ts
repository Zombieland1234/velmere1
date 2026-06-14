export type VelmerePass206ProgressDelta = {
  id: string;
  area: string;
  previous: number;
  current: number;
  change: number;
  status: "improved" | "newly_tracked" | "blocked";
};

export const velmerePass206ProgressDeltas: VelmerePass206ProgressDelta[] = [
  { id: "A06", area: "Runtime observability", previous: 68, current: 70, change: 2, status: "improved" },
  { id: "D10", area: "Performance governor", previous: 96, current: 97, change: 1, status: "improved" },
  { id: "D11", area: "WebGL / Three.js lane", previous: 49, current: 54, change: 5, status: "improved" },
  { id: "D21", area: "Brain telemetry / FPS QA", previous: 58, current: 64, change: 6, status: "improved" },
  { id: "D22", area: "WebGL migration contract", previous: 54, current: 58, change: 4, status: "improved" },
  { id: "J04", area: "Scroll lock / z-index layers", previous: 93, current: 94, change: 1, status: "improved" },
  { id: "J06", area: "Animation performance", previous: 95, current: 96, change: 1, status: "improved" },
];

export const velmerePass206ProductDelta = velmerePass206ProgressDeltas.reduce(
  (sum, row) => sum + row.change,
  0,
);

// PASS206 marker: Previous → Current → Change tracks public HUD cleanup, gated WebGL trace telemetry and production UI polish.
