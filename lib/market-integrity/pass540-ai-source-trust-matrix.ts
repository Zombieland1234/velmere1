import type { Pass534SourceLineage } from "./pass534-source-lineage";

export type Pass540SourceTrustEntry = {
  sourceId: string;
  sourceLabel: string;
  nodeCount: number;
  timestampCoverage: number;
  freshCount: number;
  staleCount: number;
  unknownFreshnessCount: number;
  verifiedCount: number;
  reviewCount: number;
  missingCount: number;
  score: number;
  state: "trusted" | "monitored" | "limited" | "unlinked";
  limiter: string;
};

export type Pass540AiSourceTrustMatrix = {
  version: "pass540-ai-source-trust-matrix";
  state: "trusted" | "mixed" | "limited" | "unlinked";
  entries: Pass540SourceTrustEntry[];
  topSourceId: string | null;
  weakestSourceId: string | null;
  weightedScore: number;
  headline: string;
  nextAction: string;
  boundary: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function buildPass540AiSourceTrustMatrix(
  locale: "pl" | "de" | "en",
  lineage: Pass534SourceLineage,
): Pass540AiSourceTrustMatrix {
  const grouped = new Map<string, Pass534SourceLineage["records"]>();
  for (const record of lineage.records) {
    const bucket = grouped.get(record.sourceId) ?? [];
    bucket.push(record);
    grouped.set(record.sourceId, bucket);
  }

  const entries = Array.from(grouped.entries())
    .map(([sourceId, records]) => {
      const nodeCount = records.length;
      const timestamped = records.filter(
        (record) => record.observedAt !== null,
      ).length;
      const freshCount = records.filter(
        (record) => record.freshness === "fresh",
      ).length;
      const staleCount = records.filter(
        (record) => record.freshness === "stale",
      ).length;
      const unknownFreshnessCount = records.filter(
        (record) => record.freshness === "unknown",
      ).length;
      const verifiedCount = records.filter(
        (record) => record.evidenceStatus === "verified",
      ).length;
      const reviewCount = records.filter(
        (record) => record.evidenceStatus === "review",
      ).length;
      const missingCount = records.filter(
        (record) => record.evidenceStatus === "missing",
      ).length;
      const timestampCoverage = Math.round(
        (timestamped / Math.max(nodeCount, 1)) * 100,
      );
      const statusScore =
        ((verifiedCount + reviewCount * 0.55) / Math.max(nodeCount, 1)) * 100;
      const freshnessScore =
        ((freshCount + staleCount * 0.35) / Math.max(nodeCount, 1)) * 100;
      const linkPenalty = sourceId === "src-00000000" ? 35 : 0;
      const score = clamp(
        statusScore * 0.48 +
          freshnessScore * 0.32 +
          timestampCoverage * 0.2 -
          missingCount * 8 -
          linkPenalty,
      );
      const state: Pass540SourceTrustEntry["state"] =
        /not identified|unidentified/i.test(records[0]?.sourceLabel || "")
          ? "unlinked"
          : score >= 82
            ? "trusted"
            : score >= 58
              ? "monitored"
              : "limited";
      const limiter =
        missingCount > 0
          ? `${missingCount} evidence node${missingCount === 1 ? "" : "s"} missing`
          : unknownFreshnessCount > 0
            ? `${unknownFreshnessCount} timestamp${unknownFreshnessCount === 1 ? "" : "s"} unknown`
            : staleCount > 0
              ? `${staleCount} stale observation${staleCount === 1 ? "" : "s"}`
              : "No dominant source limiter detected";
      return {
        sourceId,
        sourceLabel: records[0]?.sourceLabel || "source not identified",
        nodeCount,
        timestampCoverage,
        freshCount,
        staleCount,
        unknownFreshnessCount,
        verifiedCount,
        reviewCount,
        missingCount,
        score,
        state,
        limiter,
      } satisfies Pass540SourceTrustEntry;
    })
    .sort((left, right) => right.score - left.score || right.nodeCount - left.nodeCount);

  const totalNodes = entries.reduce((sum, entry) => sum + entry.nodeCount, 0);
  const weightedScore = clamp(
    entries.reduce(
      (sum, entry) => sum + entry.score * (entry.nodeCount / Math.max(totalNodes, 1)),
      0,
    ),
  );
  const state: Pass540AiSourceTrustMatrix["state"] =
    !entries.length || entries.every((entry) => entry.state === "unlinked")
      ? "unlinked"
      : entries.every((entry) => entry.state === "trusted")
        ? "trusted"
        : weightedScore >= 58
          ? "mixed"
          : "limited";
  const copy = {
    pl: {
      trusted: "Źródła mają spójną tożsamość, czas i status dowodów",
      mixed: "Część źródeł wymaga monitorowania lub uzupełnienia",
      limited: "Jakość lineage ogranicza pewność mózgu AI",
      unlinked: "Źródła nie są jeszcze poprawnie powiązane",
      next: "Najpierw napraw najsłabsze źródło i jego timestampy.",
    },
    de: {
      trusted: "Quellenidentität, Zeit und Evidenzstatus sind konsistent",
      mixed: "Ein Teil der Quellen muss überwacht oder ergänzt werden",
      limited: "Die Lineage-Qualität begrenzt die KI-Konfidenz",
      unlinked: "Quellen sind noch nicht korrekt verknüpft",
      next: "Zuerst die schwächste Quelle und ihre Zeitstempel korrigieren.",
    },
    en: {
      trusted: "Source identity, time and evidence status are consistent",
      mixed: "Some sources require monitoring or completion",
      limited: "Lineage quality is limiting AI confidence",
      unlinked: "Sources are not yet linked correctly",
      next: "Repair the weakest source and its timestamps first.",
    },
  } as const;

  return {
    version: "pass540-ai-source-trust-matrix",
    state,
    entries,
    topSourceId: entries[0]?.sourceId ?? null,
    weakestSourceId: entries.at(-1)?.sourceId ?? null,
    weightedScore,
    headline: copy[locale][state],
    nextAction: copy[locale].next,
    boundary:
      "Source trust measures visible identity, timestamp coverage, freshness and evidence status. It does not certify the provider or the asset.",
  };
}
