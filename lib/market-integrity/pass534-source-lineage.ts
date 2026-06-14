import type { UnifiedAuditEvidence, UnifiedAuditLocale } from "./unified-audit";
import type { Pass520AiContradictionLineage } from "./pass520-ai-contradiction-lineage";

export type Pass534SourceLineageRecord = {
  nodeId: string;
  sourceId: string;
  sourceLabel: string;
  observedAt: number | null;
  freshness: "fresh" | "stale" | "unknown";
  evidenceStatus: UnifiedAuditEvidence["status"];
};

export type Pass534SourceLineage = {
  version: "pass534-source-lineage";
  records: Pass534SourceLineageRecord[];
  sourceCount: number;
  timestampCoverage: number;
  freshCount: number;
  staleCount: number;
  headline: string;
  boundary: string;
};

function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `src-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function parseTimestamp(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 1_000_000_000)
    return numeric > 10_000_000_000
      ? Math.round(numeric / 1000)
      : Math.round(numeric);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.round(parsed / 1000) : null;
}

function freshnessFor(observedAt: number | null, nowSeconds: number) {
  if (!observedAt) return "unknown" as const;
  return nowSeconds - observedAt <= 15 * 60
    ? ("fresh" as const)
    : ("stale" as const);
}

export function buildPass534SourceLineage(
  locale: UnifiedAuditLocale,
  evidence: UnifiedAuditEvidence[],
  lineage: Pass520AiContradictionLineage,
  nowSeconds = Math.floor(Date.now() / 1000),
): Pass534SourceLineage {
  const sourceEvidence = evidence.find((item) =>
    /(^|[-_:])source($|[-_:])|provider|venue/i.test(`${item.id} ${item.label}`),
  );
  const timestampEvidence = evidence.find((item) =>
    /timestamp|observed|freshness|czas źród|quellenzeit/i.test(
      `${item.id} ${item.label}`,
    ),
  );
  const globalSourceLabel =
    sourceEvidence?.value?.trim() || "source not identified";
  const globalTimestamp = timestampEvidence
    ? parseTimestamp(timestampEvidence.value)
    : null;
  const records = lineage.nodes.map((node) => {
    const item = evidence.find((entry) => entry.id === node.id);
    const localSource =
      item && /source|provider|venue/i.test(`${item.id} ${item.label}`)
        ? item.value.trim()
        : globalSourceLabel;
    const localTimestamp =
      item && /timestamp|observed|freshness/i.test(`${item.id} ${item.label}`)
        ? parseTimestamp(item.value)
        : globalTimestamp;
    return {
      nodeId: node.id,
      sourceId: stableId(localSource || "unidentified"),
      sourceLabel: localSource || "source not identified",
      observedAt: localTimestamp,
      freshness: freshnessFor(localTimestamp, nowSeconds),
      evidenceStatus: node.status,
    } satisfies Pass534SourceLineageRecord;
  });
  const sourceCount = new Set(records.map((record) => record.sourceId)).size;
  const timestampCoverage = Math.round(
    (records.filter((record) => record.observedAt !== null).length /
      Math.max(records.length, 1)) *
      100,
  );
  const freshCount = records.filter(
    (record) => record.freshness === "fresh",
  ).length;
  const staleCount = records.filter(
    (record) => record.freshness === "stale",
  ).length;
  const headline =
    locale === "pl"
      ? "Tożsamość i świeżość źródeł"
      : locale === "de"
        ? "Quellen-ID und Aktualität"
        : "Source identity and freshness";
  return {
    version: "pass534-source-lineage",
    records,
    sourceCount,
    timestampCoverage,
    freshCount,
    staleCount,
    headline,
    boundary:
      "Source IDs are deterministic labels for visible source text. Unknown timestamps remain unknown and are never replaced with the report generation time.",
  };
}
