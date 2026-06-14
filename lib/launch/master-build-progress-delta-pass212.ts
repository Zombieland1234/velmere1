export type VelmerePass212ProgressDelta = {
  area: string;
  previous: number;
  current: number;
  change: number;
  note: string;
};

export const velmerePass212ProgressDeltas: VelmerePass212ProgressDelta[] = [
  { area: "D15 Risk driver mapping", previous: 72, current: 74, change: 2, note: "Risk drivers now flow into a case-review event timeline instead of stopping at a drawer queue." },
  { area: "D16 Source confidence lanes", previous: 74, current: 76, change: 2, note: "Freshness and source gate are represented as timeline events before customer export." },
  { area: "K02 Source freshness registry", previous: 49, current: 52, change: 3, note: "Client preview records freshness event state while durable source registry remains a blocker." },
  { area: "K05 Privacy redaction envelope", previous: 48, current: 52, change: 4, note: "Case timeline keeps customer visibility hidden until redaction and source checks are complete." },
  { area: "K06 Operator cases", previous: 46, current: 54, change: 8, note: "Selected Brain tile now exposes an operator-only case timeline with ordered events and ownership gate." },
  { area: "M01 Velmère Shield Report", previous: 60, current: 62, change: 2, note: "Report path receives a timeline preview contract without enabling binary PDF export." },
  { area: "M05 Redacted payload export", previous: 55, current: 59, change: 4, note: "Timeline export gate requires durable case timeline before customer-facing export." },
  { area: "M07 Operator-only report fields", previous: 58, current: 64, change: 6, note: "Timeline separates internal operator events from future customer summary fields." },
];

export const PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE_DELTA = true;
// PASS212 marker: Previous → Current → Change table tracks AI Brain case-review timeline progress without ZIP export.
