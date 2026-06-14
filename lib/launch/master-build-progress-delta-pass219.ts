export type VelmerePass219ProgressDelta = {
  id: string;
  label: string;
  previous: number;
  current: number;
  change: number;
  reason: string;
};

export const velmerePass219ProgressDeltas: VelmerePass219ProgressDelta[] = [
  { id: "K01", label: "Durable audit ledger", previous: 40, current: 45, change: 5, reason: "Durable snapshot plan defines source/case/redaction/export write targets before server storage." },
  { id: "K04", label: "Storage adapter contract", previous: 36, current: 43, change: 7, reason: "Write plan separates source snapshot, case timeline, redaction envelope and export manifest storage targets." },
  { id: "K05", label: "Privacy redaction envelope", previous: 66, current: 70, change: 4, reason: "Durable plan keeps raw payload and PII out of every planned write." },
  { id: "K06", label: "Operator cases", previous: 63, current: 67, change: 4, reason: "Case timeline write target is now explicit and blocked until server adapter is connected." },
  { id: "M05", label: "Redacted payload export", previous: 79, current: 82, change: 3, reason: "Export manifest write remains blocked until freshness, policy and release gates are safe." },
  { id: "M06", label: "Report download route", previous: 39, current: 42, change: 3, reason: "PDF route now has a durable write precondition instead of UI-only readiness." },
  { id: "M07", label: "Operator-only report fields", previous: 86, current: 88, change: 2, reason: "Durable write plan id and storage targets stay internal until production storage exists." },
];

export const PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN_DELTA = true;
