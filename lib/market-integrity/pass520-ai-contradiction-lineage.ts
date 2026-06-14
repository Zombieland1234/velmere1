import type { UnifiedAuditEvidence, UnifiedAuditLocale } from "./unified-audit";

export type Pass520LineageNode = {
  id: string;
  label: string;
  value: string;
  status: UnifiedAuditEvidence["status"];
  group: string;
};

export type Pass520LineageEdge = {
  id: string;
  from: string;
  to: string;
  relation: "supports" | "limits" | "contradicts";
  reason: string;
};

export type Pass520AiContradictionLineage = {
  version: "pass520-ai-contradiction-lineage";
  nodes: Pass520LineageNode[];
  edges: Pass520LineageEdge[];
  contradictionCount: number;
  limiterCount: number;
  headline: string;
  boundary: string;
};

const conflictPattern = /conflict|contradict|diverg|mismatch|rozbie|sprzecz|konflikt|widerspruch|abweich/i;

function groupFor(item: UnifiedAuditEvidence) {
  const raw = `${item.id} ${item.label}`.toLowerCase();
  if (/source|provider|venue|exchange/.test(raw)) return "source";
  if (/price|change|candle|market/.test(raw)) return "market";
  if (/liquid|depth|slippage|volume/.test(raw)) return "liquidity";
  if (/supply|holder|unlock|vesting|concentration/.test(raw)) return "ownership";
  if (/contract|tax|governance|audit/.test(raw)) return "contract";
  return item.id.split(/[-_:]/)[0] || "other";
}

const copy = {
  pl: { headline: "Genealogia sprzeczności", boundary: "Graf łączy tylko widoczne pola. Relacja sprzeczności wymaga jawnego konfliktu lub rozbieżnych stanów w tej samej grupie." },
  de: { headline: "Widerspruchs-Lineage", boundary: "Der Graph verbindet nur sichtbare Felder. Ein Widerspruch braucht einen expliziten Konflikt oder abweichende Zustände innerhalb derselben Gruppe." },
  en: { headline: "Contradiction lineage", boundary: "The graph links visible fields only. A contradiction requires an explicit conflict or diverging states inside the same evidence group." },
} as const;

export function buildPass520AiContradictionLineage(
  locale: UnifiedAuditLocale,
  evidence: UnifiedAuditEvidence[],
): Pass520AiContradictionLineage {
  const nodes = evidence.slice(0, 20).map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    status: item.status,
    group: groupFor(item),
  } satisfies Pass520LineageNode));
  const edges: Pass520LineageEdge[] = [];
  const grouped = new Map<string, Pass520LineageNode[]>();
  nodes.forEach((node) => grouped.set(node.group, [...(grouped.get(node.group) || []), node]));

  grouped.forEach((items, group) => {
    const anchor = items.find((item) => item.status === "verified") || items[0];
    items.forEach((item) => {
      if (item.id === anchor.id) return;
      const source = evidence.find((entry) => entry.id === item.id);
      const explicitConflict = conflictPattern.test(`${source?.note || ""} ${source?.value || ""}`);
      const relation: Pass520LineageEdge["relation"] = explicitConflict
        ? "contradicts"
        : item.status === "verified" && anchor.status === "verified"
          ? "supports"
          : "limits";
      edges.push({
        id: `${group}:${anchor.id}:${item.id}`,
        from: anchor.id,
        to: item.id,
        relation,
        reason: explicitConflict
          ? "The visible evidence text explicitly signals a provider or value conflict."
          : relation === "supports"
            ? "Both fields are verified inside the same evidence group."
            : "A review or missing field limits the verified anchor.",
      });
    });
  });

  return {
    version: "pass520-ai-contradiction-lineage",
    nodes,
    edges: edges.slice(0, 24),
    contradictionCount: edges.filter((edge) => edge.relation === "contradicts").length,
    limiterCount: edges.filter((edge) => edge.relation === "limits").length,
    headline: copy[locale].headline,
    boundary: copy[locale].boundary,
  };
}
