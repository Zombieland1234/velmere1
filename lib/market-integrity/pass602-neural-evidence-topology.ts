import type { UnifiedAuditEvidence } from "./unified-audit";

export type Pass602NeuralNodeKind = "verdict" | "agent" | "claim" | "source";
export type Pass602NeuralNodeStatus = "verified" | "review" | "missing";
export type Pass602NeuralEdgeKind = "supports" | "routes" | "limits" | "conflicts";

export type Pass602NeuralEvidenceNode = {
  id: string;
  stableId: string;
  kind: Pass602NeuralNodeKind;
  label: string;
  summary: string;
  status: Pass602NeuralNodeStatus;
  evidenceIds: string[];
  inputIds: string[];
  outputIds: string[];
  conflictIds: string[];
  sourceIds: string[];
  publicBoundary: string;
};

export type Pass602NeuralEvidenceEdge = {
  id: string;
  from: string;
  to: string;
  kind: Pass602NeuralEdgeKind;
};

export type Pass602NeuralEvidenceTopology = {
  version: "pass602-neural-evidence-topology";
  subject: string;
  verdictNodeId: string;
  nodes: Pass602NeuralEvidenceNode[];
  edges: Pass602NeuralEvidenceEdge[];
  lobeIds: string[];
  sourceIds: string[];
  conflictCount: number;
  publicWeightExposure: false;
};

export type Pass602ActiveNeuralPath = {
  version: "pass602-neural-evidence-topology";
  activeNodeId: string | null;
  visibleNodeIds: string[];
  sourceIds: string[];
  conflictIds: string[];
  boundary: string;
};

const SOURCE_PATTERN = /(source|provider|venue|exchange|timestamp|filing|adapter|feed|quorum|źr[oó]d|quelle|anbieter)/i;
const CONFLICT_PATTERN = /(conflict|contradict|mismatch|disagree|sprzecz|widerspruch|abweich)/i;

const publicCopy = {
  pl: {
    lobes: { identity: "tożsamość", sources: "źródła", market: "rynek", liquidity: "płynność", risk: "ryzyko", context: "kontekst" },
    sourceMissing: "Źródło jest niedostępne; system nie dopowiada wartości.",
    sourceReview: "Źródło wymaga drugiej obserwacji albo świeższego timestampu.",
    sourceVerified: "Źródło znajduje się w przekazanym pakiecie dowodowym.",
    agentSummary: (count: number) => `${count} pól dowodowych przechodzi przez ten publiczny płat.`,
    topologyBoundary: "Publiczna topologia pokazuje lineage i granice, nigdy prywatne wagi scoringu.",
    missingClaim: "Brak źródła blokuje podnoszenie pewności przez ten claim.",
    reviewClaim: "Claim pozostaje roboczy do czasu kontroli drugim źródłem.",
    verifiedClaim: "Claim jest ograniczony do przekazanego źródła i timestampu.",
    missingLabel: (label: string) => `Źródło: ${label}`,
    missingSummary: "Dla tego pola nie przekazano rekordu źródłowego.",
    missingBoundary: "Brak danych jest pokazany jawnie i nie jest syntetyzowany.",
    verdictSummary: "Publiczny werdykt związany ze źródłami, złożony z widocznych claimów i agentów.",
    verdictBoundary: "Publiczny werdykt pokazuje lineage dowodów, a nie ukryte wagi modelu.",
    empty: "Brak topologii dowodowej.",
  },
  de: {
    lobes: { identity: "Identität", sources: "Quellen", market: "Markt", liquidity: "Liquidität", risk: "Risiko", context: "Kontext" },
    sourceMissing: "Quelle nicht verfügbar; kein Wert wird ergänzt.",
    sourceReview: "Die Quelle benötigt eine zweite Beobachtung oder einen frischeren Zeitstempel.",
    sourceVerified: "Die Quelle ist im übergebenen Evidenzpaket vorhanden.",
    agentSummary: (count: number) => `${count} Evidenzfelder laufen durch diesen öffentlichen Lappen.`,
    topologyBoundary: "Die öffentliche Topologie zeigt Lineage und Grenzen, nie private Scoring-Gewichte.",
    missingClaim: "Eine fehlende Quelle verhindert, dass dieser Claim die Konfidenz erhöht.",
    reviewClaim: "Der Claim bleibt vorläufig, bis er gegengeprüft wurde.",
    verifiedClaim: "Der Claim ist auf die übergebene Quelle und ihren Zeitstempel begrenzt.",
    missingLabel: (label: string) => `Quelle: ${label}`,
    missingSummary: "Für dieses Feld wurde kein Quellenrecord geliefert.",
    missingBoundary: "Fehlende Daten werden sichtbar gemacht und nicht synthetisiert.",
    verdictSummary: "Quellengebundener öffentlicher Befund aus sichtbaren Claims und Agenten.",
    verdictBoundary: "Der öffentliche Befund zeigt Evidenz-Lineage, nicht verborgene Modellgewichte.",
    empty: "Keine Evidenztopologie verfügbar.",
  },
  en: {
    lobes: { identity: "identity", sources: "sources", market: "market", liquidity: "liquidity", risk: "risk", context: "context" },
    sourceMissing: "Source unavailable; no value is inferred.",
    sourceReview: "Source requires a second observation or fresher timestamp.",
    sourceVerified: "Source is present in the supplied evidence payload.",
    agentSummary: (count: number) => `${count} evidence fields are routed through this public lobe.`,
    topologyBoundary: "Public topology exposes lineage and limits, never private scoring weights.",
    missingClaim: "A missing source blocks this claim from raising confidence.",
    reviewClaim: "The claim remains provisional until cross-checked.",
    verifiedClaim: "The claim is limited to the supplied source and timestamp.",
    missingLabel: (label: string) => `${label} source`,
    missingSummary: "No source record was supplied for this field.",
    missingBoundary: "Missing data is shown explicitly and is never synthesized.",
    verdictSummary: "Source-bound public verdict assembled from visible claims and agents.",
    verdictBoundary: "The public verdict exposes evidence lineage, not hidden model weights.",
    empty: "No evidence topology is available.",
  },
} as const;

function normalizeToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function stableNodeId(subject: string, kind: Pass602NeuralNodeKind, value: string): string {
  return `vlm:${normalizeToken(subject)}:${kind}:${normalizeToken(value)}`;
}

function classifyLobe(item: UnifiedAuditEvidence): string {
  const token = `${item.id} ${item.label}`.toLowerCase();
  if (/(identity|symbol|name|contract|chain|tożsamo|identit)/.test(token)) return "identity";
  if (/(source|provider|venue|exchange|timestamp|filing|adapter|feed|quorum|źr[oó]d|quelle)/.test(token)) return "sources";
  if (/(price|marketcap|fdv|volume|change|candle|open|high|low|close|kurs|cena)/.test(token)) return "market";
  if (/(liquid|depth|slippage|spread|holder|supply|unlock|concentration|płynn|tiefe)/.test(token)) return "liquidity";
  if (/(risk|confidence|coverage|anomal|gap|contradict|pressure|ryzy|pewno|risiko)/.test(token)) return "risk";
  return "context";
}

function statusRank(status: Pass602NeuralNodeStatus): number {
  return status === "missing" ? 2 : status === "review" ? 1 : 0;
}

function strongestStatus(statuses: Pass602NeuralNodeStatus[]): Pass602NeuralNodeStatus {
  return statuses.reduce<Pass602NeuralNodeStatus>(
    (current, next) => (statusRank(next) > statusRank(current) ? next : current),
    "verified",
  );
}

function addUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

export function buildPass602NeuralEvidenceTopology(input: {
  subject: string;
  evidence: UnifiedAuditEvidence[];
  locale?: "pl" | "de" | "en";
}): Pass602NeuralEvidenceTopology {
  const subject = input.subject.trim() || "unknown";
  const c = publicCopy[input.locale ?? "en"];
  const evidence = input.evidence.filter((item) => item && item.id && item.label);
  const verdictNodeId = stableNodeId(subject, "verdict", "public-verdict");
  const nodes: Pass602NeuralEvidenceNode[] = [];
  const edges: Pass602NeuralEvidenceEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (from: string, to: string, kind: Pass602NeuralEdgeKind) => {
    if (!from || !to || from === to) return;
    const key = `${from}|${to}|${kind}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ id: `edge:${normalizeToken(key)}`, from, to, kind });
  };

  const sourceEvidence = evidence.filter((item) => SOURCE_PATTERN.test(`${item.id} ${item.label}`));
  const sourceNodes = sourceEvidence.map<Pass602NeuralEvidenceNode>((item) => ({
    id: stableNodeId(subject, "source", item.id),
    stableId: stableNodeId(subject, "source", item.id),
    kind: "source",
    label: item.label,
    summary: item.value || item.note,
    status: item.status,
    evidenceIds: [item.id],
    inputIds: [],
    outputIds: [],
    conflictIds: [],
    sourceIds: [],
    publicBoundary:
      item.status === "missing"
        ? c.sourceMissing
        : item.status === "review"
          ? c.sourceReview
          : c.sourceVerified,
  }));
  nodes.push(...sourceNodes);

  const sourceByEvidenceId = new Map(sourceNodes.map((node) => [node.evidenceIds[0], node]));
  const canonicalSource = sourceNodes.find((node) => node.status === "verified") ?? sourceNodes[0] ?? null;
  for (const item of sourceEvidence) {
    if (!CONFLICT_PATTERN.test(`${item.id} ${item.label} ${item.note} ${item.value}`)) continue;
    const conflictNode = sourceByEvidenceId.get(item.id);
    const counterpart = sourceNodes.find((node) => node.id !== conflictNode?.id && node.status === "verified");
    if (!conflictNode || !counterpart) continue;
    addUnique(conflictNode.conflictIds, counterpart.id);
    addUnique(counterpart.conflictIds, conflictNode.id);
    addEdge(conflictNode.id, counterpart.id, "conflicts");
    addEdge(counterpart.id, conflictNode.id, "conflicts");
  }
  const lobeGroups = new Map<string, UnifiedAuditEvidence[]>();
  for (const item of evidence) {
    if (sourceByEvidenceId.has(item.id)) continue;
    const lobe = classifyLobe(item);
    const bucket = lobeGroups.get(lobe) ?? [];
    bucket.push(item);
    lobeGroups.set(lobe, bucket);
  }

  const lobeIds: string[] = [];
  for (const [lobe, items] of Array.from(lobeGroups.entries())) {
    const agentId = stableNodeId(subject, "agent", lobe);
    lobeIds.push(agentId);
    const agentNode: Pass602NeuralEvidenceNode = {
      id: agentId,
      stableId: agentId,
      kind: "agent",
      label: c.lobes[lobe as keyof typeof c.lobes] ?? c.lobes.context,
      summary: c.agentSummary(items.length),
      status: strongestStatus(items.map((item: UnifiedAuditEvidence) => item.status)),
      evidenceIds: items.map((item: UnifiedAuditEvidence) => item.id),
      inputIds: [],
      outputIds: [verdictNodeId],
      conflictIds: [],
      sourceIds: [],
      publicBoundary: c.topologyBoundary,
    };
    nodes.push(agentNode);
    addEdge(agentId, verdictNodeId, "routes");

    const verifiedClaims: string[] = [];
    for (const item of items) {
      const claimId = stableNodeId(subject, "claim", item.id);
      const missingSourceId = stableNodeId(subject, "source", `missing-${item.id}`);
      const sourceNode = item.status === "missing" ? null : canonicalSource;
      const claimNode: Pass602NeuralEvidenceNode = {
        id: claimId,
        stableId: claimId,
        kind: "claim",
        label: item.label,
        summary: item.value || item.note,
        status: item.status,
        evidenceIds: [item.id],
        inputIds: [],
        outputIds: [agentId],
        conflictIds: [],
        sourceIds: sourceNode ? [sourceNode.id] : [missingSourceId],
        publicBoundary:
          item.status === "missing"
            ? c.missingClaim
            : item.status === "review"
              ? c.reviewClaim
              : c.verifiedClaim,
      };
      nodes.push(claimNode);
      addEdge(claimId, agentId, item.status === "missing" ? "limits" : "routes");
      if (sourceNode) {
        addUnique(sourceNode.outputIds, claimId);
        addUnique(claimNode.inputIds, sourceNode.id);
        addUnique(agentNode.sourceIds, sourceNode.id);
        addEdge(sourceNode.id, claimId, item.status === "review" ? "limits" : "supports");
      } else {
        const missingNode: Pass602NeuralEvidenceNode = {
          id: missingSourceId,
          stableId: missingSourceId,
          kind: "source",
          label: c.missingLabel(item.label),
          summary: c.missingSummary,
          status: "missing",
          evidenceIds: [item.id],
          inputIds: [],
          outputIds: [claimId],
          conflictIds: [],
          sourceIds: [],
          publicBoundary: c.missingBoundary,
        };
        nodes.push(missingNode);
        addUnique(claimNode.inputIds, missingNode.id);
        addUnique(agentNode.sourceIds, missingNode.id);
        addEdge(missingNode.id, claimId, "limits");
      }
      if (item.status === "verified") verifiedClaims.push(claimId);
    }

    const conflictClaims = items.filter((item: UnifiedAuditEvidence) =>
      CONFLICT_PATTERN.test(`${item.id} ${item.label} ${item.note} ${item.value}`),
    );
    for (const conflictItem of conflictClaims) {
      const conflictId = stableNodeId(subject, "claim", conflictItem.id);
      const counterpart = verifiedClaims.find((id) => id !== conflictId);
      if (!counterpart) continue;
      const conflictNode = nodes.find((node) => node.id === conflictId);
      const counterpartNode = nodes.find((node) => node.id === counterpart);
      if (!conflictNode || !counterpartNode) continue;
      addUnique(conflictNode.conflictIds, counterpart);
      addUnique(counterpartNode.conflictIds, conflictId);
      addUnique(agentNode.conflictIds, conflictId);
      addEdge(conflictId, counterpart, "conflicts");
      addEdge(counterpart, conflictId, "conflicts");
    }
  }

  const verdictStatuses = evidence.map((item) => item.status);
  nodes.push({
    id: verdictNodeId,
    stableId: verdictNodeId,
    kind: "verdict",
    label: subject,
    summary: c.verdictSummary,
    status: strongestStatus(verdictStatuses),
    evidenceIds: evidence.map((item) => item.id),
    inputIds: lobeIds,
    outputIds: [],
    conflictIds: nodes.flatMap((node) => node.conflictIds),
    sourceIds: sourceNodes.map((node) => node.id),
    publicBoundary: c.verdictBoundary,
  });

  for (const edge of edges) {
    const from = nodes.find((node) => node.id === edge.from);
    const to = nodes.find((node) => node.id === edge.to);
    if (from) addUnique(from.outputIds, edge.to);
    if (to) addUnique(to.inputIds, edge.from);
  }

  return {
    version: "pass602-neural-evidence-topology",
    subject,
    verdictNodeId,
    nodes,
    edges,
    lobeIds,
    sourceIds: nodes.filter((node) => node.kind === "source").map((node) => node.id),
    conflictCount: edges.filter((edge) => edge.kind === "conflicts").length / 2,
    publicWeightExposure: false,
  };
}

export function resolvePass602ActiveNeuralPath(
  topology: Pass602NeuralEvidenceTopology,
  activeNodeId: string | null,
): Pass602ActiveNeuralPath {
  const active = topology.nodes.find((node) => node.id === activeNodeId) ??
    topology.nodes.find((node) => node.id === topology.verdictNodeId) ??
    topology.nodes[0] ?? null;
  if (!active) {
    return {
      version: "pass602-neural-evidence-topology",
      activeNodeId: null,
      visibleNodeIds: [],
      sourceIds: [],
      conflictIds: [],
      boundary: "—",
    };
  }

  const visible = new Set<string>([active.id]);
  const queue = [active.id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of topology.edges) {
      if (edge.to === current && !visible.has(edge.from)) {
        visible.add(edge.from);
        queue.push(edge.from);
      }
      if (edge.from === current && edge.kind === "conflicts" && !visible.has(edge.to)) {
        visible.add(edge.to);
      }
      if (edge.to === current && edge.kind === "conflicts" && !visible.has(edge.from)) {
        visible.add(edge.from);
      }
    }
  }

  const pathNodes = topology.nodes.filter((node) => visible.has(node.id));
  return {
    version: "pass602-neural-evidence-topology",
    activeNodeId: active.id,
    visibleNodeIds: pathNodes.map((node) => node.id),
    sourceIds: pathNodes.filter((node) => node.kind === "source").map((node) => node.id),
    conflictIds: pathNodes.flatMap((node) => node.conflictIds).filter((id, index, all) => all.indexOf(id) === index),
    boundary: active.publicBoundary,
  };
}
