import assert from "node:assert/strict";

import { buildPass488A4DecisionCockpit } from "../../lib/market-integrity/a4-decision-cockpit";
import {
  buildPass592ChromiumFixturePlan,
  buildPass592ChromiumFixtureReceipt,
} from "../../lib/market-integrity/chromium-visual-fixture-runner";
import {
  pageCountForDepth,
  type LensTierPageCount,
  type LensTierPageDepth,
} from "../../lib/market-integrity/lens-tier-page-count";
import { buildPass611PdfAccessibilityPhase2 } from "../../lib/market-integrity/pdf-accessibility-phase-2";
import { buildPass451PdfExactPreview } from "../../lib/market-integrity/pdf-exact-preview-runtime";
import { buildPass1254PdfTypographyReleaseGate } from "../../lib/market-integrity/pdf-typography-release-gate";
import {
  buildPass580PdfVisualFixtureReceipt,
  PASS580_PDF_VISUAL_FIXTURES,
} from "../../lib/market-integrity/pdf-visual-fixtures";
import type { VelmereSearchResult } from "../../lib/search/intelligence-search-contract";
import { buildLensReport, isLensReport } from "../../lib/search/lens-report";

const depthCases = [
  ["basic", 2],
  ["pro", 4],
  ["advanced", 8],
] as const satisfies ReadonlyArray<readonly [LensTierPageDepth, LensTierPageCount]>;

const fixturePlan = buildPass592ChromiumFixturePlan(
  PASS580_PDF_VISUAL_FIXTURES,
);
const reportFixture: VelmereSearchResult = {
  id: "pass35-tier-page-count",
  title: "Synthetic page-count contract fixture",
  symbol: "VLM",
  category: "token",
  tone: "review",
  summary: "Synthetic offline fixture used only to verify tier pagination.",
  whyItMatters: "It guards one canonical page-count contract across report modules.",
  missingData: ["Live provider observations are intentionally absent."],
  nextOperatorStep: "Keep the fixture offline and attach current evidence before any assessment.",
  sourceMode: "missing",
  sourceConfidence: 0,
  shieldHref: "/market-integrity?asset=pass35-tier-page-count",
  avatarLabel: "VLM",
  sources: [],
  chips: ["synthetic", "offline"],
  marketSnapshot: {
    assetClass: "crypto",
    providerState: "not_configured",
    anomalyLabel: "synthetic_page_count_contract",
  },
};

assert.equal(PASS580_PDF_VISUAL_FIXTURES.length, 27);
assert.equal(fixturePlan.fixtureCount, 27);
assert.equal(fixturePlan.cases.length, 27);

for (const [depth, expectedPageCount] of depthCases) {
  assert.equal(pageCountForDepth(depth), expectedPageCount);

  const pass451 = buildPass451PdfExactPreview("pl", depth);
  assert.equal(pass451.depth, depth);
  assert.equal(pass451.pageCount, expectedPageCount);
  assert.match(pass451.labels.pageCount, new RegExp(`^${expectedPageCount} `));
  assert.match(
    pass451.forgeStages.find((stage) => stage.id === "signature")?.detail ?? "",
    new RegExp(`^${expectedPageCount} `),
  );

  const pass488 = buildPass488A4DecisionCockpit({
    locale: "pl",
    symbol: "VLM",
    generatedAt: "2026-07-22T00:00:00.000Z",
    depth,
    sourceConfidence: 91,
    sourceCount: 3,
    missingDataCount: 0,
    checksum: `checksum-${depth}`,
    fieldBudget: depth === "basic" ? 10 : depth === "pro" ? 14 : 20,
  });
  assert.equal(pass488.pageCount, expectedPageCount);
  assert.equal(pass488.readerPageCount, expectedPageCount);
  assert.equal(pass488.binaryPageCount, expectedPageCount);

  const fixtures = PASS580_PDF_VISUAL_FIXTURES.filter(
    (fixture) => fixture.depth === depth,
  );
  assert.equal(fixtures.length, 9);
  assert.ok(
    fixtures.every((fixture) => fixture.expectedPages === expectedPageCount),
  );
  assert.ok(
    fixturePlan.cases
      .filter((fixture) => fixture.depth === depth)
      .every((fixture) => fixture.expectedPages === expectedPageCount),
  );

  const pass580 = buildPass580PdfVisualFixtureReceipt({
    locale: "pl",
    depth,
    maxDensity: 80,
    sourceCount: 3,
    fieldBudget: depth === "basic" ? 10 : depth === "pro" ? 14 : 20,
    checksum: `checksum-${depth}`,
  });
  assert.equal(pass580.expectedPages, expectedPageCount);

  const pass592 = buildPass592ChromiumFixtureReceipt({
    fixtureId: pass580.fixtureId,
    depth,
    expectedFieldBudget:
      depth === "basic" ? 10 : depth === "pro" ? 14 : 20,
  });
  assert.equal(pass592.expectedPages, expectedPageCount);

  const pageTitles = Array.from(
    { length: expectedPageCount },
    (_, index) => `Page ${index + 1}`,
  );
  const pass611 = buildPass611PdfAccessibilityPhase2({
    locale: "pl",
    depth,
    symbol: "VLM",
    title: `Tier ${depth}`,
    pageTitles,
    sourceConfidence: 91,
  });
  assert.equal(pass611.pdf.pageSections, expectedPageCount);
  assert.equal(pass611.reader.readingOrder.length, expectedPageCount);
  assert.equal(pass611.reader.headingOutline.length, expectedPageCount + 1);

  const pass1254 = buildPass1254PdfTypographyReleaseGate({
    locale: "pl",
    depth,
    reportChecksum: `checksum-${depth}`,
    sectionCount: 4,
    sourceCount: 3,
    missingCount: 0,
    claimCount: 4,
    readerDownloadManifest: `reader-${depth}`,
    evidenceManifest: `evidence-${depth}`,
    typographyState: "ready",
    densityState: "ready",
    maxDensity: 0.8,
    mobileBudgetState: "ready",
  });
  assert.equal(pass1254.pdf.pageCount, expectedPageCount);

  const report = buildLensReport(
    reportFixture,
    "en",
    depth,
    "2026-07-22T00:00:00.000Z",
  );
  assert.equal(report.pass451.pageCount, expectedPageCount);
  assert.equal(report.pass488.pageCount, expectedPageCount);
  assert.equal(report.pass488.readerPageCount, expectedPageCount);
  assert.equal(report.pass488.binaryPageCount, expectedPageCount);
  assert.equal(report.pass580.expectedPages, expectedPageCount);
  assert.equal(report.pass592.expectedPages, expectedPageCount);
  assert.equal(report.pass610.pageCount, expectedPageCount);
  assert.equal(report.pass611.pdf.pageSections, expectedPageCount);
  assert.equal(report.pass1254.pdf.pageCount, expectedPageCount);
  assert.equal(isLensReport(report), true);
}

assert.throws(
  () => pageCountForDepth("enterprise" as LensTierPageDepth),
  /unsupported_lens_tier_depth:enterprise/,
);

console.log("lens tier page-count contract: 2/4/8 PASS");
