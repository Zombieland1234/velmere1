export type VelmerePass217ProgressDelta = {
  id: string;
  label: string;
  previous: number;
  current: number;
  change: number;
  reason: string;
};

export const velmerePass217ProgressDeltas: VelmerePass217ProgressDelta[] = [
  { id: "D16", label: "Source confidence lanes", previous: 89, current: 91, change: 2, reason: "Live adapter freshness mesh adds TTL, cache decision and hard-stop state to each Brain source lane." },
  { id: "D17", label: "Missing-data semantics", previous: 90, current: 91, change: 1, reason: "Expired/blocked adapter freshness is explicitly treated as customer-export blocking debt." },
  { id: "D21", label: "Brain telemetry / FPS QA", previous: 64, current: 66, change: 2, reason: "Selected tile drawer now exposes freshness state that can be checked against live adapter trace and QA telemetry." },
  { id: "K02", label: "Source freshness registry", previous: 63, current: 68, change: 5, reason: "Freshness state is normalized into TTL, stale window, cache decision, age bucket and refresh priority." },
  { id: "K05", label: "Privacy redaction envelope", previous: 64, current: 66, change: 2, reason: "Freshness mesh remains preview-only and does not export raw adapter payloads." },
  { id: "L06", label: "Adapter timeouts / fallbacks", previous: 55, current: 62, change: 7, reason: "Adapter lanes now show live/usable/stale/expired/blocked states and P0/P1/P2 refresh priority." },
  { id: "L07", label: "Allowlists / source policy", previous: 30, current: 34, change: 4, reason: "Source policy starts to separate append-ready preview from durable-store blocked lanes." },
  { id: "M05", label: "Redacted payload export", previous: 77, current: 79, change: 2, reason: "Customer export gate checks freshness hard stops before any PDF-ready route." },
  { id: "M07", label: "Operator-only report fields", previous: 81, current: 84, change: 3, reason: "Freshness mesh id, adapter id, TTL and operator action remain internal review fields." },
];

export const PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS_DELTA = true;
