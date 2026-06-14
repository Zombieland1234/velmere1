export type VelmerePass216ProgressDelta = {
  id: string;
  label: string;
  previous: number;
  current: number;
  change: number;
  reason: string;
};

export const velmerePass216ProgressDeltas: VelmerePass216ProgressDelta[] = [
  { id: "D15", label: "Risk driver mapping", previous: 80, current: 83, change: 3, reason: "Source truth spine ties risk drivers to adapter freshness and release lanes." },
  { id: "D16", label: "Source confidence lanes", previous: 86, current: 89, change: 3, reason: "Adapter mode/cache decision/trust cap are visible per selected Brain tile." },
  { id: "D17", label: "Missing-data semantics", previous: 88, current: 90, change: 2, reason: "Missing and blocked adapter lanes remain customer-export blockers." },
  { id: "K02", label: "Source freshness registry", previous: 59, current: 63, change: 4, reason: "Truth spine consumes source adapter envelopes and freshness state before reports." },
  { id: "K05", label: "Privacy redaction envelope", previous: 61, current: 64, change: 3, reason: "Adapter snapshot remains preview/redacted and blocks raw payload export." },
  { id: "L06", label: "Adapter timeouts / fallbacks", previous: 48, current: 55, change: 7, reason: "Cache decision and fallback/missing lanes are surfaced in the Brain drawer." },
  { id: "M05", label: "Redacted payload export", previous: 74, current: 77, change: 3, reason: "Customer export now checks source truth spine before PDF/customer copy." },
  { id: "M07", label: "Operator-only report fields", previous: 78, current: 81, change: 3, reason: "Truth spine ids, adapter ids and next actions stay operator-only." },
];

export const PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE_DELTA = true;
