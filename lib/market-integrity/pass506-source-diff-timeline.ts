import type { UnifiedAuditEvidence, UnifiedAuditLocale } from "@/lib/market-integrity/unified-audit";

export type Pass506TimelineStep = {
  id: string;
  index: number;
  state: UnifiedAuditEvidence["status"];
  title: string;
  value: string;
  note: string;
  impact: "supports" | "limits" | "blocks";
};

export type Pass506SourceDiffTimeline = {
  version: "pass506-source-diff-timeline";
  steps: Pass506TimelineStep[];
  supported: number;
  limited: number;
  blocked: number;
  headline: string;
  boundary: string;
};

const copy = {
  pl: {
    headline: "Linia zmian dowodów",
    boundary: "Każdy krok pochodzi z widocznego pola dowodowego; brak źródła nie jest zastępowany przewidywaniem.",
  },
  de: {
    headline: "Evidenz-Differenz-Timeline",
    boundary: "Jeder Schritt stammt aus dem sichtbaren Evidenzfeld; fehlende Quellen werden nicht durch Prognosen ersetzt.",
  },
  en: {
    headline: "Evidence change timeline",
    boundary: "Every step comes from the visible evidence field; a missing source is never replaced by a prediction.",
  },
} as const;

export function buildPass506SourceDiffTimeline(
  locale: UnifiedAuditLocale,
  evidence: UnifiedAuditEvidence[],
): Pass506SourceDiffTimeline {
  const ordered = [...evidence].sort((left, right) => {
    const weight = { missing: 0, review: 1, verified: 2 } as const;
    return weight[left.status] - weight[right.status] || left.label.localeCompare(right.label);
  });
  const steps: Pass506TimelineStep[] = ordered.slice(0, 8).map((item, index) => ({
    id: item.id,
    index: index + 1,
    state: item.status,
    title: item.label,
    value: item.value,
    note: item.note,
    impact: item.status === "verified" ? "supports" : item.status === "review" ? "limits" : "blocks",
  }));
  return {
    version: "pass506-source-diff-timeline",
    steps,
    supported: evidence.filter((item) => item.status === "verified").length,
    limited: evidence.filter((item) => item.status === "review").length,
    blocked: evidence.filter((item) => item.status === "missing").length,
    headline: copy[locale].headline,
    boundary: copy[locale].boundary,
  };
}
