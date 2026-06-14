export type VelmerePass208ProgressDelta = {
  id: string;
  area: string;
  previous: number;
  current: number;
  change: number;
  status: "improved" | "newly_tracked" | "blocked";
};

export const velmerePass208ProgressDeltas: VelmerePass208ProgressDelta[] = [
  { id: "D15", area: "Risk driver mapping", previous: 62, current: 68, change: 6, status: "improved" },
  { id: "D16", area: "Source confidence lanes", previous: 61, current: 67, change: 6, status: "improved" },
  { id: "D17", area: "Missing-data semantics", previous: 69, current: 74, change: 5, status: "improved" },
  { id: "D24", area: "Brain copy localization PL/EN/DE", previous: 82, current: 84, change: 2, status: "improved" },
  { id: "M01", area: "Velmère Shield Report", previous: 49, current: 52, change: 3, status: "improved" },
  { id: "M03", area: "Evidence Note", previous: 54, current: 59, change: 5, status: "improved" },
  { id: "M04", area: "Safe export wording", previous: 78, current: 80, change: 2, status: "improved" },
  { id: "M07", area: "Operator-only report fields", previous: 41, current: 46, change: 5, status: "improved" },
];

export const velmerePass208ProductDelta = velmerePass208ProgressDeltas.reduce(
  (sum, row) => sum + row.change,
  0,
);

// PASS208 marker: Previous → Current → Change tracks AI Brain Report Capsule, public brief, internal memo, redaction rule and export gate.
