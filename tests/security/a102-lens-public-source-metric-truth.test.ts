import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  projectPublicSearchSourceMetrics,
  sourceEvidenceCoverageScore,
  type VelmereSearchResult,
} from "../../lib/search/intelligence-search-contract.js";
import { normalizeClientSearchResult } from "../../lib/search/lens-client-normalizers.js";

function fixture(overrides: Partial<VelmereSearchResult> = {}): VelmereSearchResult {
  return {
    id: "metric-truth",
    title: "Metric Truth",
    symbol: "BTC",
    category: "token",
    tone: "review",
    summary: "Source-bound test fixture.",
    whyItMatters: "Public metrics must not overstate evidence.",
    missingData: ["second source"],
    nextOperatorStep: "Verify missing source lane.",
    sourceMode: "live_table",
    // Deliberately legacy/un-calibrated heuristic: must never reach public output as confidence.
    sourceConfidence: 74,
    shieldHref: "/market-integrity",
    sources: [
      {
        id: "primary",
        label: "Primary provider",
        mode: "live",
        freshness: "request-time",
        confidence: 91,
        note: "live provider lane",
      },
      {
        id: "secondary",
        label: "Second provider",
        mode: "missing",
        freshness: "missing",
        confidence: 63,
        note: "not attached",
      },
    ],
    chips: ["source truth"],
    ...overrides,
  };
}

const raw = fixture();
const projected = projectPublicSearchSourceMetrics(raw);
assert.equal(projected.sourceConfidence, 0, "uncalibrated heuristic confidence must be zeroed at public boundary");
assert.equal(projected.sourceConfidenceCalibrated, false);
assert.equal(projected.sourceCoverage, 50, "one present and one missing lane must mean 50% data coverage");
assert.equal(projected.sources[0]?.confidence, 0, "source-level uncalibrated heuristic must be zeroed");
assert.equal(projected.sources[0]?.coverage, 100);
assert.equal(projected.sources[1]?.coverage, 0);

// Symbol/name changes cannot alter coverage when the actual source lanes are identical.
const symbolPerturbed = projectPublicSearchSourceMetrics(fixture({ symbol: "DOGE", title: "Dogecoin" }));
assert.equal(symbolPerturbed.sourceCoverage, projected.sourceCoverage);
assert.equal(symbolPerturbed.sourceConfidence, 0);

// Relevant source-lane availability change must alter coverage.
const secondLive = fixture({
  sources: [
    raw.sources[0]!,
    { ...raw.sources[1]!, mode: "live", freshness: "request-time" },
  ],
});
assert.equal(sourceEvidenceCoverageScore(secondLive), 100);
assert.equal(projectPublicSearchSourceMetrics(secondLive).sourceCoverage, 100);

// Explicitly calibrated metrics can pass, but only with the explicit calibration flag.
const calibrated = projectPublicSearchSourceMetrics(
  fixture({
    sourceConfidence: 81,
    sourceConfidenceCalibrated: true,
    sources: [
      {
        ...raw.sources[0]!,
        confidence: 77,
        confidenceCalibrated: true,
      },
    ],
  }),
);
assert.equal(calibrated.sourceConfidence, 81);
assert.equal(calibrated.sourceConfidenceCalibrated, true);
assert.equal(calibrated.sources[0]?.confidence, 77);
assert.equal(calibrated.sources[0]?.confidenceCalibrated, true);

// Client normalizer recomputes coverage from modes and does not trust spoofed public coverage.
const normalized = normalizeClientSearchResult({
  ...raw,
  sourceCoverage: 100,
  sourceConfidence: 99,
  sourceConfidenceCalibrated: false,
  sources: raw.sources.map((source) => ({ ...source, coverage: 100 })),
});
assert.ok(normalized);
assert.equal(normalized!.sourceConfidence, 0);
assert.equal(normalized!.sourceCoverage, 50);
assert.equal(normalized!.sources[1]?.coverage, 0);

// Static active-route order: public metric projection must happen before Lens token signing.
const root = path.resolve(process.cwd());
const orchestrator = fs.readFileSync(path.join(root, "lib/search/search-route-orchestrator.ts"), "utf8");
const projectionIndex = orchestrator.indexOf(".map(projectPublicSearchSourceMetrics)");
const tokenIndex = orchestrator.indexOf("issuePass4822LensSourceToken({ result: item, locale })");
assert.ok(projectionIndex >= 0, "active orchestrator must project public metrics");
assert.ok(tokenIndex > projectionIndex, "signed Lens token must bind the post-firewall public payload");

const reportSource = fs.readFileSync(path.join(root, "lib/search/lens-report.ts"), "utf8");
assert.match(reportSource, /publicCalibratedSourceConfidence\(result\)/);
assert.match(reportSource, /sourceEvidenceCoverageScore\(result\)/);
assert.match(reportSource, /sourceConfidenceCalibrated/);
assert.match(reportSource, /sourceCoverage/);
assert.doesNotMatch(reportSource, /const sourceConfidence = clampPercent\(result\.sourceConfidence\)/);

const clientSource = fs.readFileSync(path.join(root, "components/search/VelmereIntelligenceSearchClient.tsx"), "utf8");
assert.doesNotMatch(clientSource, /\{result\.sourceConfidence\}%/);
assert.match(clientSource, /result\.sourceCoverage \?\? sourceEvidenceCoverageScore\(result\)/);

console.log("A102 Lens public source-metric truth firewall: PASS");
