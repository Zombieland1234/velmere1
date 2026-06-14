import type { Pass478HumanEvidenceBrief } from "./pass478-human-evidence-brief";
import type { Pass582SourceCitationRail } from "./pass582-source-citation-rail";
import type { Pass594BidirectionalSourceFootnotes } from "./pass594-bidirectional-source-footnotes";

export type Pass607FreshnessState = "fresh" | "aging" | "stale" | "unknown" | "missing";
export type Pass607ClaimState = "confirmed" | "bounded" | "blocked" | "not_applicable";

export type Pass607SourceManifestRow = {
  sourceId: `S${string}`;
  label: string;
  state: Pass582SourceCitationRail["citations"][number]["state"];
  observedAt: string | null;
  freshnessLabel: string;
  freshnessState: Pass607FreshnessState;
  confidenceCap: number;
};

export type Pass607ClaimManifestRow = {
  claimId: `C${string}`;
  fieldId: string;
  label: string;
  value: string;
  sourceIds: Array<`S${string}`>;
  state: Pass607ClaimState;
  confidenceCap: number;
  blockers: string[];
};

export type Pass607ClaimSourceCompletenessGate = {
  version: "pass607-claim-source-completeness-gate";
  state: "complete" | "review" | "blocked";
  generatedAt: string;
  sources: Pass607SourceManifestRow[];
  claims: Pass607ClaimManifestRow[];
  confirmedClaims: number;
  boundedClaims: number;
  blockedClaims: number;
  timestampedSources: number;
  confidenceCap: number;
  boundary: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

function parseIso(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
}

function resolveObservedAt(
  freshness: string,
  marketObservedAt: string | null | undefined,
) {
  const direct = parseIso(freshness);
  if (direct) return direct;
  const normalized = freshness.toLowerCase();
  if (/request[- ]?time|live|current|fresh|now|aktuell|bieżąc/.test(normalized)) {
    return parseIso(marketObservedAt);
  }
  return null;
}

function freshnessState(
  observedAt: string | null,
  generatedAt: string,
  sourceState: Pass582SourceCitationRail["citations"][number]["state"],
): Pass607FreshnessState {
  if (sourceState === "missing") return "missing";
  if (!observedAt) return "unknown";
  const ageMs = Math.max(0, new Date(generatedAt).getTime() - new Date(observedAt).getTime());
  if (!Number.isFinite(ageMs)) return "unknown";
  if (ageMs <= 30 * 60 * 1000) return "fresh";
  if (ageMs <= 24 * 60 * 60 * 1000) return "aging";
  return "stale";
}

function freshnessCap(state: Pass607FreshnessState) {
  if (state === "fresh") return 100;
  if (state === "aging") return 72;
  if (state === "stale") return 38;
  if (state === "unknown") return 42;
  return 0;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildPass607ClaimSourceCompletenessGate(input: {
  generatedAt: string;
  marketObservedAt?: string | null;
  confidenceCeiling: number;
  brief: Pass478HumanEvidenceBrief;
  citationRail: Pass582SourceCitationRail;
  footnotes: Pass594BidirectionalSourceFootnotes;
}): Pass607ClaimSourceCompletenessGate {
  const generatedAt = parseIso(input.generatedAt) || new Date(0).toISOString();
  const sources = input.citationRail.citations.map((citation) => {
    const observedAt = resolveObservedAt(citation.freshness, input.marketObservedAt);
    const resolvedFreshness = freshnessState(observedAt, generatedAt, citation.state);
    return {
      sourceId: citation.id,
      label: citation.label,
      state: citation.state,
      observedAt,
      freshnessLabel: citation.freshness,
      freshnessState: resolvedFreshness,
      confidenceCap: Math.min(clamp(citation.confidence), freshnessCap(resolvedFreshness)),
    } satisfies Pass607SourceManifestRow;
  });

  const claims = input.brief.claims.map((claim, index) => {
    const footnote =
      input.footnotes.claims.find((item) => item.fieldId === claim.id) ||
      input.footnotes.claims[index];
    const sourceIds = footnote?.sourceIds || [];
    const linkedSources = sourceIds
      .map((sourceId) => sources.find((source) => source.sourceId === sourceId))
      .filter((source): source is Pass607SourceManifestRow => Boolean(source));
    const blockers = unique([
      ...(sourceIds.length ? [] : ["missing_source_link"]),
      ...(linkedSources.some((source) => source.state === "missing")
        ? ["missing_source"]
        : []),
      ...(linkedSources.some((source) => !source.observedAt)
        ? ["missing_timestamp"]
        : []),
      ...(linkedSources.some((source) => source.freshnessState === "stale")
        ? ["stale_source"]
        : []),
      ...(claim.state === "source_required" ? ["claim_requires_source"] : []),
    ]);
    const sourceCap = linkedSources.length
      ? Math.min(...linkedSources.map((source) => source.confidenceCap))
      : 0;
    let state: Pass607ClaimState;
    if (claim.state === "not_applicable") state = "not_applicable";
    else if (blockers.length || sourceCap < 35) state = "blocked";
    else if (claim.state === "confirmed" && sourceCap >= 55) state = "confirmed";
    else state = "bounded";
    const claimStateCap =
      state === "confirmed" ? 88 : state === "bounded" ? 64 : state === "blocked" ? 34 : 100;
    return {
      claimId: (footnote?.claimId || `C${String(index + 1).padStart(2, "0")}`) as `C${string}`,
      fieldId: claim.id,
      label: claim.label,
      value: claim.value,
      sourceIds,
      state,
      confidenceCap: Math.min(clamp(input.confidenceCeiling), sourceCap || claimStateCap, claimStateCap),
      blockers,
    } satisfies Pass607ClaimManifestRow;
  });

  const strongClaims = claims.filter((claim) => claim.state !== "not_applicable");
  const confirmedClaims = strongClaims.filter((claim) => claim.state === "confirmed").length;
  const boundedClaims = strongClaims.filter((claim) => claim.state === "bounded").length;
  const blockedClaims = strongClaims.filter((claim) => claim.state === "blocked").length;
  const confidenceCap = strongClaims.length
    ? Math.min(clamp(input.confidenceCeiling), ...strongClaims.map((claim) => claim.confidenceCap))
    : clamp(input.confidenceCeiling);
  const state = blockedClaims
    ? confirmedClaims
      ? "review"
      : "blocked"
    : boundedClaims
      ? "review"
      : "complete";

  return {
    version: "pass607-claim-source-completeness-gate",
    state,
    generatedAt,
    sources,
    claims,
    confirmedClaims,
    boundedClaims,
    blockedClaims,
    timestampedSources: sources.filter((source) => Boolean(source.observedAt)).length,
    confidenceCap,
    boundary:
      "A strong claim cannot remain confirmed without a linked source, an explicit observation timestamp, a usable freshness state and a source-bound confidence cap.",
  };
}
