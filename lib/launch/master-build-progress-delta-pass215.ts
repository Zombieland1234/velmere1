export const PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET_DELTA = true;

export const velmerePass215ProgressDeltas = [
  {
    areaId: "D15",
    label: "Risk driver mapping",
    previous: 77,
    current: 80,
    change: 3,
    note: "Risk drivers now flow into a release review packet before customer export.",
  },
  {
    areaId: "D16",
    label: "Source confidence lanes",
    previous: 83,
    current: 86,
    change: 3,
    note: "Source coverage is now checked against freshness, redaction, durable case and PDF gates.",
  },
  {
    areaId: "D17",
    label: "Missing-data semantics",
    previous: 86,
    current: 88,
    change: 2,
    note: "Missing/blocked lanes stay as release blockers instead of becoming neutral customer copy.",
  },
  {
    areaId: "M01",
    label: "Velmère Shield Report",
    previous: 65,
    current: 70,
    change: 5,
    note: "Report path now receives an operator release packet before any PDF-ready handoff.",
  },
  {
    areaId: "M05",
    label: "Redacted payload export",
    previous: 69,
    current: 74,
    change: 5,
    note: "Release packet includes redaction, customer copy and no-raw-payload gates.",
  },
  {
    areaId: "M06",
    label: "Report download route",
    previous: 34,
    current: 39,
    change: 5,
    note: "PDF route is represented as a disabled/operator-only gate until durable storage and review pass.",
  },
  {
    areaId: "M07",
    label: "Operator-only report fields",
    previous: 72,
    current: 78,
    change: 6,
    note: "Operator checklist and customer boundary keep release debt internal-only.",
  },
] as const;

export const PASS215_PRODUCT_DELTA_TOTAL = velmerePass215ProgressDeltas.reduce((sum, row) => sum + row.change, 0);
