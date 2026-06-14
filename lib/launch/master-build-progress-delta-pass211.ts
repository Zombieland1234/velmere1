export const velmerePass211ProgressDeltas = [
  { id: "D15", label: "Risk driver mapping", previous: 70, current: 72, change: 2 },
  { id: "D16", label: "Source confidence lanes", previous: 71, current: 74, change: 3 },
  { id: "D17", label: "Missing-data semantics", previous: 78, current: 80, change: 2 },
  { id: "K02", label: "Source freshness registry", previous: 47, current: 49, change: 2 },
  { id: "K05", label: "Privacy redaction envelope", previous: 45, current: 48, change: 3 },
  { id: "K06", label: "Operator cases", previous: 40, current: 46, change: 6 },
  { id: "M01", label: "Velmère Shield Report", previous: 58, current: 60, change: 2 },
  { id: "M05", label: "Redacted payload export", previous: 52, current: 55, change: 3 },
  { id: "M07", label: "Operator-only report fields", previous: 53, current: 58, change: 5 },
] as const;

export const velmerePass211ProductDelta = velmerePass211ProgressDeltas.reduce(
  (sum, item) => sum + item.change,
  0,
);

export const PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE_DELTA = true;
