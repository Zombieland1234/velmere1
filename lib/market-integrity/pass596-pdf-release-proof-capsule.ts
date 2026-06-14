import type { Pass592ChromiumFixtureReceipt } from "./pass592-chromium-visual-fixture-runner";
import type { Pass593TaggedPdfFeasibilityGate } from "./pass593-tagged-pdf-feasibility-gate";
import type { Pass594BidirectionalSourceFootnotes } from "./pass594-bidirectional-source-footnotes";
import type { Pass595ExtremeTypographyHardening } from "./pass595-extreme-typography-hardening";

export type Pass596PdfReleaseProofCapsule = {
  version: "pass596-pdf-release-proof-capsule";
  state: "sealed" | "review";
  capsuleKey: string;
  fixtureProofRef: string;
  sourceReceipt: string;
  parityKey: string;
  compositorResult: string;
  footnoteChecksum: string;
  typographyState: string;
  taggedPdfState: string;
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

export function buildPass596PdfReleaseProofCapsule(input: {
  fixture: Pass592ChromiumFixtureReceipt;
  taggedPdf: Pass593TaggedPdfFeasibilityGate;
  footnotes: Pass594BidirectionalSourceFootnotes;
  typography: Pass595ExtremeTypographyHardening;
  sourceReceipt: string;
  parityKey: string;
  compositorResult: string;
}): Pass596PdfReleaseProofCapsule {
  const canonical = [
    input.fixture.proofRef,
    input.sourceReceipt,
    input.parityKey,
    input.compositorResult,
    input.footnotes.checksum,
    input.typography.state,
    input.taggedPdf.state,
  ].join("|");
  const state =
    input.compositorResult === "ready" && input.typography.state === "ready"
      ? "sealed"
      : "review";

  return {
    version: "pass596-pdf-release-proof-capsule",
    state,
    capsuleKey: `VLM-PDF-PROOF-${hash(canonical)}`,
    fixtureProofRef: input.fixture.proofRef,
    sourceReceipt: input.sourceReceipt,
    parityKey: input.parityKey,
    compositorResult: input.compositorResult,
    footnoteChecksum: input.footnotes.checksum,
    typographyState: input.typography.state,
    taggedPdfState: input.taggedPdf.state,
    boundary:
      "The capsule binds the Chromium fixture identity, source receipt, Reader/download parity, compositor result, footnote map and typography gate. It does not turn a metadata-only PDF into a tagged-PDF claim.",
  };
}
