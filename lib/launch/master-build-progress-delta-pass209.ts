export type VelmerePass209ProgressDelta = {
  id: string;
  area: string;
  previous: number;
  current: number;
  change: number;
  status: "improved" | "newly_tracked" | "blocked";
};

export const velmerePass209ProgressDeltas: VelmerePass209ProgressDelta[] = [
  { id: "D15", area: "Risk driver mapping", previous: 68, current: 70, change: 2, status: "improved" },
  { id: "D16", area: "Source confidence lanes", previous: 67, current: 69, change: 2, status: "improved" },
  { id: "D17", area: "Missing-data semantics", previous: 74, current: 76, change: 2, status: "improved" },
  { id: "M01", area: "Velmère Shield Report", previous: 52, current: 55, change: 3, status: "improved" },
  { id: "M03", area: "Evidence Note", previous: 59, current: 62, change: 3, status: "improved" },
  { id: "M04", area: "Safe export wording", previous: 80, current: 83, change: 3, status: "improved" },
  { id: "M05", area: "Redacted payload export", previous: 41, current: 49, change: 8, status: "improved" },
  { id: "M07", area: "Operator-only report fields", previous: 46, current: 50, change: 4, status: "improved" },
];

export const velmerePass209ProductDelta = velmerePass209ProgressDeltas.reduce(
  (sum, row) => sum + row.change,
  0,
);

// PASS209 marker: Previous → Current → Change tracks typed AI Brain capsule envelope, redaction boundary and export-readiness state.
