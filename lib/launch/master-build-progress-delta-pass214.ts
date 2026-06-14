export type VelmerePass214ProgressDelta = {
  area: string;
  previous: number;
  current: number;
  change: number;
  note: string;
};

export const velmerePass214ProgressDeltas: VelmerePass214ProgressDelta[] = [
  { area: "D16 Source confidence lanes", previous: 79, current: 83, change: 4, note: "Selected Brain tile now has a lane-level source coverage matrix with covered/review/missing/blocked states." },
  { area: "D17 Missing-data semantics", previous: 83, current: 86, change: 3, note: "Missing market/liquidity/holder/contract/social lanes now reduce coverage score and force second-source review." },
  { area: "K02 Source freshness registry", previous: 55, current: 59, change: 4, note: "Coverage matrix converts freshness/source debt into review SLA and export pressure before durable registry is connected." },
  { area: "K05 Privacy redaction envelope", previous: 57, current: 61, change: 4, note: "Customer boundary now separates lane coverage from raw payload/private scoring and operator-only debt." },
  { area: "K06 Operator cases", previous: 59, current: 63, change: 4, note: "Operator case path now receives source coverage matrix id, lane states and review SLA." },
  { area: "L01 Holder feed", previous: 24, current: 26, change: 2, note: "Holder feed gap is now visible as a coverage lane instead of hidden missing data." },
  { area: "L02 Orderbook feed", previous: 22, current: 24, change: 2, note: "Liquidity/orderbook evidence is now scored as a coverage lane before public liquidity copy." },
  { area: "L03 Contract analyzer", previous: 32, current: 35, change: 3, note: "Contract control lane now blocks/reviews export when contract analyzer evidence is missing." },
  { area: "L05 OSINT feed", previous: 30, current: 33, change: 3, note: "Narrative/social pressure lane now exposes OSINT source debt and internal-only copy when missing." },
  { area: "M05 Redacted payload export", previous: 66, current: 69, change: 3, note: "Report/export lane now carries publicCopy gates and customer boundary in the matrix." },
  { area: "M06 Report download route", previous: 32, current: 34, change: 2, note: "PDF gate now receives source coverage/export-pressure context, still blocked until durable export exists." },
  { area: "M07 Operator-only report fields", previous: 69, current: 72, change: 3, note: "Operator-only source coverage details are kept out of customer copy while shown in the Brain drawer." },
];

export const PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX_DELTA = true;
// PASS214 marker: Previous → Current → Change table tracks Brain source coverage matrix without ZIP export.
