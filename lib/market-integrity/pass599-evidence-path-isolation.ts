export type Pass599EvidenceGraphNode = {
  id: string;
  dependsOn?: readonly string[];
  citations?: readonly string[];
  conflicts?: readonly string[];
  confidenceCap?: string | null;
};

export type Pass599EvidencePathNode = {
  id: string;
  state: "active" | "dependency" | "dependent" | "conflict" | "unrelated";
  citations: string[];
  conflictIds: string[];
  confidenceCap: string | null;
};

export type Pass599EvidencePathIsolation = {
  version: "pass599-evidence-path-isolation";
  state: "ready" | "missing_active";
  activeId: string | null;
  nodes: Pass599EvidencePathNode[];
  citationIds: string[];
  conflictIds: string[];
  confidenceCap: string | null;
  visibleNodeIds: string[];
};

const unique = (values: readonly string[] = []) =>
  Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));

export function buildPass599EvidencePathIsolation(input: {
  activeId?: string | null;
  nodes: readonly Pass599EvidenceGraphNode[];
}): Pass599EvidencePathIsolation {
  const active = input.nodes.find((node) => node.id === input.activeId) ?? null;
  if (!active) {
    return {
      version: "pass599-evidence-path-isolation",
      state: "missing_active",
      activeId: null,
      nodes: input.nodes.map((node) => ({
        id: node.id,
        state: "unrelated",
        citations: unique(node.citations),
        conflictIds: unique(node.conflicts),
        confidenceCap: node.confidenceCap ?? null,
      })),
      citationIds: [],
      conflictIds: [],
      confidenceCap: null,
      visibleNodeIds: [],
    };
  }

  const graph = new Map(input.nodes.map((node) => [node.id, node] as const));
  const dependencies = new Set<string>();
  const dependencyQueue = [...unique(active.dependsOn)];
  while (dependencyQueue.length) {
    const dependencyId = dependencyQueue.shift();
    if (!dependencyId || dependencyId === active.id || dependencies.has(dependencyId)) continue;
    dependencies.add(dependencyId);
    dependencyQueue.push(...unique(graph.get(dependencyId)?.dependsOn));
  }

  const dependents = new Set<string>();
  const dependentQueue = [active.id];
  while (dependentQueue.length) {
    const parentId = dependentQueue.shift();
    if (!parentId) continue;
    for (const node of input.nodes) {
      if (node.id === active.id || dependents.has(node.id)) continue;
      if (!unique(node.dependsOn).includes(parentId)) continue;
      dependents.add(node.id);
      dependentQueue.push(node.id);
    }
  }

  const conflicts = new Set([
    ...unique(active.conflicts),
    ...input.nodes
      .filter((node) => unique(node.conflicts).includes(active.id))
      .map((node) => node.id),
  ]);
  const nodes = input.nodes.map((node): Pass599EvidencePathNode => ({
    id: node.id,
    state:
      node.id === active.id
        ? "active"
        : conflicts.has(node.id)
          ? "conflict"
          : dependencies.has(node.id)
            ? "dependency"
            : dependents.has(node.id)
              ? "dependent"
              : "unrelated",
    citations: unique(node.citations),
    conflictIds: unique(node.conflicts),
    confidenceCap: node.confidenceCap ?? null,
  }));
  const visibleNodes = nodes.filter((node) => node.state !== "unrelated");
  const visibleNodeIds = visibleNodes.map((node) => node.id);
  return {
    version: "pass599-evidence-path-isolation",
    state: "ready",
    activeId: active.id,
    nodes,
    citationIds: unique(visibleNodes.flatMap((node) => node.citations)),
    conflictIds: Array.from(conflicts),
    confidenceCap: active.confidenceCap ?? null,
    visibleNodeIds,
  };
}
