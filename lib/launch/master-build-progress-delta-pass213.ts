export type VelmerePass213ProgressDelta = {
  area: string;
  previous: number;
  current: number;
  change: number;
  note: string;
};

export const velmerePass213ProgressDeltas: VelmerePass213ProgressDelta[] = [
  { area: "D15 Risk driver mapping", previous: 74, current: 77, change: 3, note: "Risk drivers now flow into a customer export firewall with source debt and evidence coverage." },
  { area: "D16 Source confidence lanes", previous: 76, current: 79, change: 3, note: "Selected tile source confidence now creates customer-impact debt rows before export." },
  { area: "D17 Missing-data semantics", previous: 80, current: 83, change: 3, note: "Missing data becomes blocker/review debt instead of quiet customer-facing copy." },
  { area: "K02 Source freshness registry", previous: 52, current: 55, change: 3, note: "Source debt matrix records freshness debt while durable registry remains a blocker." },
  { area: "K05 Privacy redaction envelope", previous: 52, current: 57, change: 5, note: "Firewall adds redaction score and visibility gate before any customer export." },
  { area: "K06 Operator cases", previous: 54, current: 59, change: 5, note: "Case path now includes firewall id, PDF gate, source debt and release checklist." },
  { area: "M01 Velmère Shield Report", previous: 62, current: 65, change: 3, note: "Report path receives customer export firewall and evidence coverage state without claiming binary PDF readiness." },
  { area: "M05 Redacted payload export", previous: 59, current: 66, change: 7, note: "Redacted export is now blocked by explicit source debt, durable-case and PDF gate rules." },
  { area: "M06 Report download route", previous: 30, current: 32, change: 2, note: "PDF route still blocked, but the drawer now shows the exact customer export gate reason." },
  { area: "M07 Operator-only report fields", previous: 64, current: 69, change: 5, note: "Operator-only debt/source/scoring context is separated from customer visibility state." },
];

export const PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL_DELTA = true;
// PASS213 marker: Previous → Current → Change table tracks customer export firewall progress without ZIP export.
