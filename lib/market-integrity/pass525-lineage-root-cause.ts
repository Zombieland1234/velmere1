import type { Pass520AiContradictionLineage } from "./pass520-ai-contradiction-lineage";

export type Pass525LineageRootCause = {
  version: "pass525-lineage-root-cause";
  rootNodeId: string | null;
  rootLabel: string;
  severity: "clear" | "review" | "critical";
  contradictionEdges: number;
  limiterEdges: number;
  affectedNodeIds: string[];
  explanation: string;
  nextVerification: string;
  boundary: string;
};

export function buildPass525LineageRootCause(lineage: Pass520AiContradictionLineage): Pass525LineageRootCause {
  const weighted = lineage.nodes.map((node) => {
    const edges = lineage.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
    const contradictions = edges.filter((edge) => edge.relation === "contradicts").length;
    const limits = edges.filter((edge) => edge.relation === "limits").length;
    return { node, edges, score: contradictions * 4 + limits * 2 + (node.status === "missing" ? 3 : node.status === "review" ? 1 : 0) };
  }).sort((left, right) => right.score - left.score);
  const root = weighted[0];
  if (!root || root.score === 0) {
    return {
      version: "pass525-lineage-root-cause",
      rootNodeId: null,
      rootLabel: "No explicit root conflict",
      severity: "clear",
      contradictionEdges: 0,
      limiterEdges: 0,
      affectedNodeIds: [],
      explanation: "Visible evidence does not contain an explicit contradiction path.",
      nextVerification: "Continue source freshness checks and preserve the current evidence ledger.",
      boundary: "Root-cause ranking is derived only from visible evidence relations and never invents hidden causal links.",
    };
  }
  const contradictionEdges = root.edges.filter((edge) => edge.relation === "contradicts").length;
  const limiterEdges = root.edges.filter((edge) => edge.relation === "limits").length;
  const affectedNodeIds = Array.from(new Set(root.edges.flatMap((edge) => [edge.from, edge.to]).filter((id) => id !== root.node.id)));
  return {
    version: "pass525-lineage-root-cause",
    rootNodeId: root.node.id,
    rootLabel: root.node.label,
    severity: contradictionEdges > 0 ? "critical" : "review",
    contradictionEdges,
    limiterEdges,
    affectedNodeIds,
    explanation: contradictionEdges > 0
      ? "This field sits on the densest visible contradiction path and should be resolved before the conclusion is strengthened."
      : "This field limits the largest number of verified facts and currently creates the widest confidence drag.",
    nextVerification: `Re-check ${root.node.label} against a current independent source and record the timestamp and quote basis.`,
    boundary: "The graph identifies the most connected visible limiter; it does not claim legal, technical or market causation beyond the supplied evidence.",
  };
}
