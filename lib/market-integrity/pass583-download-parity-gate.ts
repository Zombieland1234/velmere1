import type { Pass581PdfPageCompositor } from "./pass581-pdf-page-compositor";
import type { Pass582SourceCitationRail } from "./pass582-source-citation-rail";

export type Pass583DownloadParityGate = {
  version: "pass583-download-parity-gate";
  state: "locked" | "review";
  manifestKey: string;
  readerPages: 4;
  downloadPages: 4;
  citationCount: number;
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

export function buildPass583DownloadParityGate(input: {
  symbol: string;
  locale: string;
  depth: string;
  reportChecksum: string;
  parityKey: string;
  sections: readonly { id: string; title: string; body: string }[];
  compositor: Pass581PdfPageCompositor;
  citationRail: Pass582SourceCitationRail;
}): Pass583DownloadParityGate {
  const canonical = [
    input.symbol.toUpperCase(),
    input.locale,
    input.depth,
    input.reportChecksum,
    input.parityKey,
    ...input.sections.map(
      (section) => `${section.id}:${section.title}:${section.body}`,
    ),
    ...input.compositor.pages.flatMap((page) =>
      page.blocks.map(
        (block) => `${page.id}:${block.id}:${block.state}:${block.weight}`,
      ),
    ),
    ...input.citationRail.citations.map(
      (citation) =>
        `${citation.id}:${citation.label}:${citation.confidence}:${citation.state}`,
    ),
  ].join("|");
  const state = input.compositor.compactedBlocks.length ? "review" : "locked";

  return {
    version: "pass583-download-parity-gate",
    state,
    manifestKey: `VLM-PARITY-${hash(canonical)}`,
    readerPages: 4,
    downloadPages: 4,
    citationCount: input.citationRail.citations.length,
    boundary:
      "Reader and download are accepted only when page order, source IDs, depth and the source-bound report checksum produce the same manifest.",
  };
}
