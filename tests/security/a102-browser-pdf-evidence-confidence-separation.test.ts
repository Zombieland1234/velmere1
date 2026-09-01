import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildLensReport } from "../../lib/search/lens-report.js";
import type { VelmereSearchResult } from "../../lib/search/intelligence-search-contract.js";

const generatedAt = "2026-08-11T18:00:00.000Z";
const result: VelmereSearchResult = {
  id: "evidence-confidence-separation",
  title: "BTC evidence boundary",
  symbol: "BTC",
  category: "token",
  tone: "review",
  summary: "A source-bound fixture for semantic score separation.",
  whyItMatters: "Evidence coverage must stay distinct from calibrated confidence.",
  missingData: ["second independent source"],
  nextOperatorStep: "Attach and compare a second provider.",
  sourceMode: "live_table",
  sourceConfidence: 88,
  sourceConfidenceCalibrated: false,
  sourceCoverage: 100,
  shieldHref: "/market-integrity",
  sources: [
    {
      id: "binance-primary",
      label: "Binance",
      mode: "live",
      freshness: "request-time",
      confidence: 91,
      confidenceCalibrated: false,
      note: "primary current provider lane",
    },
    {
      id: "secondary-required",
      label: "Second provider required",
      mode: "missing",
      freshness: "missing",
      confidence: 73,
      confidenceCalibrated: false,
      note: "not attached",
    },
  ],
  chips: ["truth"],
  marketSnapshot: {
    assetClass: "crypto",
    currency: "USD",
    price: 64000,
    marketCap: 1_260_000_000_000,
    volume24h: 22_000_000_000,
    change24h: 1.4,
    observedAt: generatedAt,
    providerState: "source_bound",
  },
};

const report = buildLensReport(result, "en", "basic", generatedAt);

assert.equal(report.sourceConfidence, 0, "uncalibrated heuristic must remain unpublished as confidence");
assert.equal(report.sourceConfidenceCalibrated, false);
assert.equal(report.sourceCoverage, 50, "coverage must be recomputed from actual source lanes");

assert.equal(report.pass477.evidenceCoverageCeiling, report.pass477.confidenceCeiling);
assert.equal(report.pass466.finalCoverage, report.pass466.finalConfidence);
assert.equal(report.pass466.lostCoverage, report.pass466.lostConfidence);
assert.match(report.pass466.boundary, /not calibrated confidence/i);

assert.equal(report.pass607.evidenceCoverageCap, report.pass607.confidenceCap);
for (const row of report.pass607.sources) {
  assert.equal(row.evidenceCoverageCap, row.confidenceCap);
}
for (const claim of report.pass607.claims) {
  assert.equal(claim.evidenceCoverageCap, claim.confidenceCap);
}

assert.equal(report.pass625.evidenceCoverageCap, report.pass625.confidenceCap);
assert.equal(report.pass1234.evidenceCoverageCap, report.pass1234.confidenceCap);
assert.equal(report.pass1374.evidenceCoverageCeiling, report.pass1374.confidenceCeiling);
assert.equal(report.pass453.decision.evidenceCeiling, report.pass453.decision.confidenceCeiling);
assert.equal(report.pass453.labels.evidenceCeiling, report.pass453.labels.confidenceCeiling);
assert.doesNotMatch(report.pass453.labels.limits, /confidence|pewno|konfidenz/i);
assert.doesNotMatch(report.pass453.decision.headline, /confidence|pewno|konfidenz/i);

assert.doesNotMatch(report.pass611.reader.chartAlternative, /source confidence|pewność źródeł|quellenkonfidenz/i);
assert.match(report.pass611.reader.chartAlternative, /evidence coverage|pokrycie dowod|evidenzabdeckung/i);
assert.doesNotMatch(report.pass1334.cover.evidenceLine, /confidence cap|limitu pewności|konfidenzgrenze/i);
assert.match(report.pass1334.cover.evidenceLine, /evidence-coverage|pokrycia dowod|evidenzabdeckung/i);
for (const entry of report.pass608.entries) {
  assert.equal(entry.evidencePenalty, entry.confidencePenalty);
}

const root = path.resolve(process.cwd());
const clientSource = fs.readFileSync(path.join(root, "components/search/VelmereIntelligenceSearchClient.tsx"), "utf8");
for (const forbidden of [
  "Waterfall pewności",
  "Confidence Waterfall",
  "Confidence waterfall",
  "Granice pewności",
  "Konfidenzgrenzen",
  "Confidence limits",
]) {
  assert.equal(clientSource.includes(forbidden), false, `customer UI must not expose legacy confidence copy: ${forbidden}`);
}
assert.doesNotMatch(clientSource, /pass607\.confidenceCap/);
assert.doesNotMatch(clientSource, /pass625\.confidenceCap/);
assert.doesNotMatch(clientSource, /pass1234\.confidenceCap/);
assert.doesNotMatch(clientSource, /pass1374\.confidenceCeiling/);
assert.doesNotMatch(clientSource, /pass477\.confidenceCeiling/);
assert.match(clientSource, /lensPublicEvidenceWaterfallTitle/);
assert.match(clientSource, /lensPublicEvidenceLimitsTitle/);

const pdfSource = fs.readFileSync(path.join(root, "lib/search/lens-pdf-renderer.ts"), "utf8");
assert.doesNotMatch(pdfSource, /report\.pass477\.confidenceCeiling/);
assert.doesNotMatch(pdfSource, /report\.kernel\.confidenceCap/);
assert.match(pdfSource, /report\.pass477\.evidenceCoverageCeiling/);
assert.match(pdfSource, /report\.pass607\.evidenceCoverageCap/);

console.log("A102 Browser/PDF evidence-coverage vs calibrated-confidence separation: PASS");
