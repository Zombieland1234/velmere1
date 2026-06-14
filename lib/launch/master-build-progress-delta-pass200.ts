import { velmereMasterBuildAreas } from "./master-build-areas";

export type VelmerePass200DeltaStatus = "improved" | "newly_tracked" | "blocked";

export type VelmerePass200DeltaEntry = {
  id: string;
  previous: number;
  current: number;
  change: number;
  status: VelmerePass200DeltaStatus;
  note: string;
};

export const velmerePass200ProgressDeltas: VelmerePass200DeltaEntry[] = [
  { id: "D01", previous: 94, current: 95, change: 1, status: "improved", note: "Orbit 360 shell is now explicitly confirmed inside the AI Brain D01-D24 matrix." },
  { id: "D04", previous: 84, current: 85, change: 1, status: "improved", note: "Advanced Analysis brain is split into visual, reasoning, telemetry and WebGL lanes for clearer next work." },
  { id: "D07", previous: 90, current: 91, change: 1, status: "improved", note: "Tile detail popup now points to a dedicated tile-specific explainer taxonomy lane." },
  { id: "D09", previous: 78, current: 79, change: 1, status: "improved", note: "Reduced-motion/mobile downgrade is connected to a separate telemetry and FPS QA blocker." },
  { id: "D11", previous: 36, current: 38, change: 2, status: "improved", note: "WebGL/Three.js lane now has a clearer migration contract instead of vague future work." },
  { id: "D13", previous: 0, current: 72, change: 72, status: "newly_tracked", note: "Newly exposed tracking row: AI risk signal ontology. The feature existed broadly; PASS200 makes it measurable." },
  { id: "D14", previous: 0, current: 88, change: 88, status: "newly_tracked", note: "Newly exposed tracking row: tile-specific explainer taxonomy for driver, score, missing data and next action." },
  { id: "D15", previous: 0, current: 58, change: 58, status: "newly_tracked", note: "Newly exposed tracking row: risk driver mapping; still depends on live source adapters." },
  { id: "D16", previous: 0, current: 52, change: 52, status: "newly_tracked", note: "Newly exposed tracking row: source confidence lanes for live/partial/fallback/stale/missing states." },
  { id: "D17", previous: 0, current: 62, change: 62, status: "newly_tracked", note: "Newly exposed tracking row: missing-data semantics so missing data never reads as a safe verdict." },
  { id: "D18", previous: 0, current: 86, change: 86, status: "newly_tracked", note: "Newly exposed tracking row: Basic/Pro/Advanced depth contract." },
  { id: "D19", previous: 0, current: 84, change: 84, status: "newly_tracked", note: "Newly exposed tracking row: click coverage for every visible static/orbit card." },
  { id: "D20", previous: 0, current: 92, change: 92, status: "newly_tracked", note: "Newly exposed tracking row: brain portal layering and scroll lock." },
  { id: "D21", previous: 0, current: 46, change: 46, status: "newly_tracked", note: "Newly exposed tracking row: real FPS and input-latency QA, still not production-proven." },
  { id: "D22", previous: 0, current: 40, change: 40, status: "newly_tracked", note: "Newly exposed tracking row: WebGL migration contract." },
  { id: "D23", previous: 0, current: 44, change: 44, status: "newly_tracked", note: "Newly exposed tracking row: keyboard/accessibility flow for the brain." },
  { id: "D24", previous: 0, current: 72, change: 72, status: "newly_tracked", note: "Newly exposed tracking row: PL/EN/DE copy localization for the brain." },
  { id: "C08", previous: 93, current: 94, change: 1, status: "improved", note: "Token modal shell now references the explicit D01-D24 brain matrix in its handoff tracking." },
  { id: "J06", previous: 90, current: 91, change: 1, status: "improved", note: "Animation performance is now tied to real brain telemetry rather than generic motion polish." },
];

export const velmerePass200ProgressDeltaSummary = {
  pass: "PASS200",
  title: "AI Brain Master Matrix / D01-D24 Explicit Tracking",
  changedAreas: velmerePass200ProgressDeltas.length,
  productDelta: velmerePass200ProgressDeltas.filter((item) => item.status === "improved").reduce((sum, item) => sum + item.change, 0),
  newlyTrackedRows: velmerePass200ProgressDeltas.filter((item) => item.status === "newly_tracked").length,
  affectedGroups: Array.from(new Set(velmerePass200ProgressDeltas.map((item) => item.id[0]))).sort(),
  rule: "AI Brain cannot be hidden inside a generic VLM bucket; reports must show D01-D24 and separate real feature movement from newly tracked baselines.",
};

export const getVelmerePass200ProgressDeltaRows = () =>
  velmerePass200ProgressDeltas.map((delta) => {
    const area = velmereMasterBuildAreas.find((item) => item.id === delta.id);
    return {
      ...delta,
      group: area?.group ?? delta.id[0],
      label: area?.label ?? delta.id,
      next: area?.next ?? "Keep tracking this row in the next pass.",
    };
  });

// PASS200 marker: AI Brain D01-D24 progress deltas are explicit and reportable as Previous → Current → Change.
