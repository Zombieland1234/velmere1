export type VlmBrainRendererMode = "dom_orbit_360" | "dom_evidence_board" | "webgl_prototype";
export type VlmBrainRendererStatus = "active" | "fallback" | "prototype";
export type VlmBrainRendererPriority = "P0" | "P1" | "P2";

export type VlmBrainRendererLane = {
  id: VlmBrainRendererMode;
  status: VlmBrainRendererStatus;
  priority: VlmBrainRendererPriority;
  label: string;
  promise: string;
  guardrail: string[];
  nextStep: string;
  productionBoundary: string;
};

export const vlmBrainRendererLanes: VlmBrainRendererLane[] = [
  {
    id: "dom_orbit_360",
    status: "active",
    priority: "P0",
    label: "DOM Orbit 360",
    promise: "Default interactive orbit across Basic, Pro and Advanced without heavy canvas.",
    guardrail: ["transform + opacity only", "sparse React ticks", "pause on hidden tab", "reduced motion fallback"],
    nextStep: "Browser-test FPS on Vercel and lower card count/opacity on weak devices if needed.",
    productionBoundary: "DOM orbit is the public runtime until WebGL proves smoother on real devices.",
  },
  {
    id: "dom_evidence_board",
    status: "fallback",
    priority: "P0",
    label: "DOM Evidence Board",
    promise: "Full-screen command-board fallback with clickable cards around one VLM core.",
    guardrail: ["no duplicate core", "clickable cards", "density classes", "dark drawer"],
    nextStep: "QA sparse/focused/full density states and mobile overlap.",
    productionBoundary: "Evidence board must remain available even if orbit is disabled.",
  },
  {
    id: "webgl_prototype",
    status: "prototype",
    priority: "P1",
    label: "WebGL prototype lane",
    promise: "Future GPU renderer for orbit particles/cards if DOM cannot stay smooth.",
    guardrail: ["not imported into public modal", "no three.js dependency yet", "no runtime side effects", "feature flag before launch"],
    nextStep: "Create measured A/B prototype only after browser FPS proves DOM orbit is insufficient.",
    productionBoundary: "Prototype lane cannot replace public Shield without Vercel build, mobile QA and accessibility fallback.",
  },
];

export function getVlmBrainRendererSummary(lanes = vlmBrainRendererLanes) {
  const active = lanes.filter((lane) => lane.status === "active").length;
  const fallback = lanes.filter((lane) => lane.status === "fallback").length;
  const prototype = lanes.filter((lane) => lane.status === "prototype").length;
  return {
    schemaVersion: "velmere-vlm-brain-renderer-contract-v1",
    active,
    fallback,
    prototype,
    publicRuntime: "dom_orbit_360" as VlmBrainRendererMode,
    safeFallback: "dom_evidence_board" as VlmBrainRendererMode,
    experimentalLane: "webgl_prototype" as VlmBrainRendererMode,
    nextCriticalStep: lanes.find((lane) => lane.id === "dom_orbit_360")?.nextStep ?? "Run browser FPS QA.",
  };
}
