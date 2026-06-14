export const velmerePass210ProgressDeltas = [
  { id: "D16", label: "Source confidence lanes", previous: 69, current: 71, change: 2 },
  { id: "D17", label: "Missing-data semantics", previous: 76, current: 78, change: 2 },
  { id: "K02", label: "Source freshness registry", previous: 42, current: 47, change: 5 },
  { id: "K05", label: "Privacy redaction envelope", previous: 41, current: 45, change: 4 },
  { id: "L06", label: "Adapter timeouts / fallbacks", previous: 44, current: 48, change: 4 },
  { id: "M01", label: "Velmère Shield Report", previous: 55, current: 58, change: 3 },
  { id: "M05", label: "Redacted payload export", previous: 49, current: 52, change: 3 },
  { id: "M07", label: "Operator-only report fields", previous: 50, current: 53, change: 3 },
] as const;

export const velmerePass210ProductDelta = velmerePass210ProgressDeltas.reduce(
  (sum, item) => sum + item.change,
  0,
);

export const PASS210_AI_BRAIN_CAPSULE_HANDOFF_DELTA = true;
