export type VelmerePass220ProgressDelta = {
  id: string;
  label: string;
  previous: number;
  current: number;
  change: number;
  reason: string;
};

export const velmerePass220ProgressDeltas: VelmerePass220ProgressDelta[] = [
  { id: "D15", label: "Risk driver mapping", previous: 83, current: 86, change: 3, reason: "Release chain auditor maps risk driver evidence through coverage, freshness, policy and durable export blockers." },
  { id: "D16", label: "Source confidence lanes", previous: 92, current: 94, change: 2, reason: "Full chain lanes now show public copy gate, upstream ref, blocker/review count and source-confidence decision." },
  { id: "D17", label: "Missing-data semantics", previous: 91, current: 93, change: 2, reason: "Missing/stale/blocked data now propagates into the aggregate release chain and keeps customer export blocked." },
  { id: "K04", label: "Storage adapter contract", previous: 43, current: 47, change: 4, reason: "Release chain audit counts server adapter requirements before any durable snapshot, case or export manifest can be treated as ready." },
  { id: "K05", label: "Privacy redaction envelope", previous: 70, current: 74, change: 4, reason: "Audit chain keeps raw payload and public export disabled while redaction/source policy debt remains open." },
  { id: "M01", label: "Velmère Shield Report", previous: 70, current: 74, change: 4, reason: "Shield report path now receives one aggregate release-chain decision instead of scattered tile-only gates." },
  { id: "M05", label: "Redacted payload export", previous: 82, current: 85, change: 3, reason: "PublicExportReady, rawPayloadAllowed and PDF readiness are all hard false until the release chain passes." },
  { id: "M06", label: "Report download route", previous: 42, current: 46, change: 4, reason: "PDF route gate is explicitly blocked by chain audit until durable storage and browser QA exist." },
  { id: "M07", label: "Operator-only report fields", previous: 88, current: 91, change: 3, reason: "Audit id, upstream refs, lane decisions and next milestone are internal-only release-review fields." },
];

export const PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR_DELTA = true;
