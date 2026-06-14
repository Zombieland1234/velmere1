import type { UnifiedAuditEvidence } from "./unified-audit";
import type { Pass602NeuralEvidenceTopology } from "./pass602-neural-evidence-topology";

export type Pass604ClaimState = "fact" | "hypothesis" | "conflict" | "missing_source";

export type Pass604ConfidenceTrace = {
  evidenceId: string;
  claimNodeId: string | null;
  state: Pass604ClaimState;
  confidenceCap: number;
  path: string[];
  reason: string;
};

export type Pass604ConfidencePropagation = {
  version: "pass604-confidence-propagation";
  requestedConfidence: number;
  finalConfidence: number;
  limitingState: Pass604ClaimState | "none";
  limitingEvidenceId: string | null;
  traces: Pass604ConfidenceTrace[];
  facts: number;
  hypotheses: number;
  conflicts: number;
  missingSources: number;
  publicBoundary: string;
};

const CONFLICT_PATTERN = /(conflict|contradict|mismatch|disagree|sprzecz|widerspruch|abweich)/i;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function parseRequestedConfidence(evidence: UnifiedAuditEvidence[]): number {
  const candidate = evidence.find((item) => /confidence|pewno|konfidenz/i.test(`${item.id} ${item.label}`));
  const parsed = Number(candidate?.value.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", "."));
  return Number.isFinite(parsed) ? clamp(parsed) : 100;
}

function resolveState(item: UnifiedAuditEvidence): Pass604ClaimState {
  if (item.status === "missing") return "missing_source";
  if (CONFLICT_PATTERN.test(`${item.id} ${item.label} ${item.note} ${item.value}`)) return "conflict";
  if (item.status === "review") return "hypothesis";
  return "fact";
}

const CAP_BY_STATE: Record<Pass604ClaimState, number> = {
  fact: 96,
  hypothesis: 78,
  conflict: 62,
  missing_source: 54,
};

const REASON_BY_STATE: Record<Pass604ClaimState, string> = {
  fact: "Verified evidence can support the verdict but cannot create absolute certainty.",
  hypothesis: "Provisional evidence requires a second source or fresher observation.",
  conflict: "Conflicting evidence propagates a hard cap until the mismatch is resolved.",
  missing_source: "A missing source cannot raise confidence and caps dependent claims.",
};

export function buildPass604ConfidencePropagation(input: {
  topology: Pass602NeuralEvidenceTopology;
  evidence: UnifiedAuditEvidence[];
  requestedConfidence?: number | null;
}): Pass604ConfidencePropagation {
  const requestedConfidence = clamp(
    input.requestedConfidence ?? parseRequestedConfidence(input.evidence),
  );
  const traces = input.evidence.map<Pass604ConfidenceTrace>((item) => {
    const state = resolveState(item);
    const claimNode = input.topology.nodes.find(
      (node) => node.evidenceIds.includes(item.id),
    );
    const path: string[] = [];
    if (claimNode) {
      const queue = [claimNode.id];
      const seen = new Set<string>();
      while (queue.length) {
        const current = queue.shift()!;
        if (seen.has(current)) continue;
        seen.add(current);
        path.push(current);
        const currentNode = input.topology.nodes.find((node) => node.id === current);
        for (const outputId of currentNode?.outputIds ?? []) queue.push(outputId);
      }
      if (!path.includes(input.topology.verdictNodeId)) path.push(input.topology.verdictNodeId);
    }
    return {
      evidenceId: item.id,
      claimNodeId: claimNode?.id ?? null,
      state,
      confidenceCap: CAP_BY_STATE[state],
      path: path.filter((id, index, all) => all.indexOf(id) === index),
      reason: REASON_BY_STATE[state],
    };
  });

  const limitingTrace = traces.reduce<Pass604ConfidenceTrace | null>(
    (current, trace) => (!current || trace.confidenceCap < current.confidenceCap ? trace : current),
    null,
  );
  const finalConfidence = clamp(
    Math.min(requestedConfidence, limitingTrace?.confidenceCap ?? requestedConfidence),
  );
  const count = (state: Pass604ClaimState) => traces.filter((trace) => trace.state === state).length;

  return {
    version: "pass604-confidence-propagation",
    requestedConfidence,
    finalConfidence,
    limitingState: limitingTrace?.state ?? "none",
    limitingEvidenceId: limitingTrace?.evidenceId ?? null,
    traces,
    facts: count("fact"),
    hypotheses: count("hypothesis"),
    conflicts: count("conflict"),
    missingSources: count("missing_source"),
    publicBoundary:
      limitingTrace?.reason ??
      "Confidence remains bounded by the supplied evidence; private model weights are not exposed.",
  };
}
