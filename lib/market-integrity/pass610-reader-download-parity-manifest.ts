import type { Pass607ClaimSourceCompletenessGate } from "./pass607-claim-source-completeness-gate";
import type { Pass608MissingSourceAppendix } from "./pass608-missing-source-appendix";
import type { Pass609DynamicA4DensityBalancing } from "./pass609-dynamic-a4-density-balancing";

export type Pass610ReaderDownloadParityManifest = {
  version: "pass610-reader-download-parity-manifest";
  state: "locked" | "review";
  locale: "pl" | "de" | "en";
  depth: "basic" | "pro" | "advanced";
  pageCount: 4;
  pages: Array<{
    id: "decision" | "evidence" | "analysis" | "boundary";
    index: number;
    title: string;
    blockIds: string[];
  }>;
  sectionOrder: string[];
  sourceIds: Array<`S${string}`>;
  claimIds: Array<`C${string}`>;
  appendixIds: Array<`M${string}`>;
  manifestKey: string;
  canonicalVisual: "pdf_blob";
  readerMode: "semantic_reflow";
  boundary: string;
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function localeOf(locale: string): "pl" | "de" | "en" {
  return locale === "de" || locale === "en" ? locale : "pl";
}

function pageTitles(locale: "pl" | "de" | "en") {
  if (locale === "de") return ["Entscheidung", "Quellen", "Analyse", "Grenzen"];
  if (locale === "en") return ["Decision", "Evidence", "Analysis", "Boundaries"];
  return ["Decyzja", "Dowody", "Analiza", "Granice"];
}

export function buildPass610ReaderDownloadParityManifest(input: {
  locale: string;
  depth: "basic" | "pro" | "advanced";
  reportChecksum: string;
  sections: readonly { id: string; title: string; body: string }[];
  claimGate: Pass607ClaimSourceCompletenessGate;
  appendix: Pass608MissingSourceAppendix;
  density: Pass609DynamicA4DensityBalancing;
}): Pass610ReaderDownloadParityManifest {
  const locale = localeOf(input.locale);
  const titles = pageTitles(locale);
  const pages = input.density.pages.map((page, index) => ({
    id: page.id,
    index: index + 1,
    title: titles[index],
    blockIds: page.blockIds,
  }));
  const sectionOrder = input.sections.map((section) => section.id);
  const sourceIds = input.claimGate.sources.map((source) => source.sourceId);
  const claimIds = input.claimGate.claims.map((claim) => claim.claimId);
  const appendixIds = input.appendix.entries.map((entry) => entry.id);
  const canonical = [
    locale,
    input.depth,
    input.reportChecksum,
    ...pages.flatMap((page) => [page.id, String(page.index), page.title, ...page.blockIds]),
    ...input.sections.map((section) => `${section.id}:${section.title}:${section.body}`),
    ...sourceIds,
    ...claimIds,
    ...appendixIds,
  ].join("|");
  return {
    version: "pass610-reader-download-parity-manifest",
    state: input.density.state === "blocked" ? "review" : "locked",
    locale,
    depth: input.depth,
    pageCount: 4,
    pages,
    sectionOrder,
    sourceIds,
    claimIds,
    appendixIds,
    manifestKey: `VLM-RD-${hash(canonical)}`,
    canonicalVisual: "pdf_blob",
    readerMode: "semantic_reflow",
    boundary:
      "The PDF blob is the canonical visual output. Reader and download share locale, depth, page IDs, section order, source IDs, claim IDs and appendix IDs; the semantic Reader may reflow without changing content.",
  };
}
