export type VelmerePass218ProgressDelta = {
  id: string;
  label: string;
  previous: number;
  current: number;
  change: number;
  reason: string;
};

export const velmerePass218ProgressDeltas: VelmerePass218ProgressDelta[] = [
  { id: "D16", label: "Source confidence lanes", previous: 91, current: 92, change: 1, reason: "Source policy gate classifies each freshness lane into allowed preview, second-source review or allowlist block." },
  { id: "K02", label: "Source freshness registry", previous: 68, current: 70, change: 2, reason: "Freshness lanes now feed a policy decision instead of staying as raw adapter state." },
  { id: "L07", label: "Allowlists / source policy", previous: 34, current: 44, change: 10, reason: "New source-policy gate introduces allowlist mode, source class, reviewer gate, evidence use and forbidden-claim mapping." },
  { id: "M04", label: "Safe export wording", previous: 80, current: 82, change: 2, reason: "Policy gate maps source classes to must-never-claim boundaries before customer copy." },
  { id: "M07", label: "Operator-only report fields", previous: 84, current: 86, change: 2, reason: "Policy id, source class, reviewer gate and evidence-use state stay operator-only." },
];

export const PASS218_AI_BRAIN_SOURCE_POLICY_GATE_DELTA = true;
