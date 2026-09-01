import assert from "node:assert/strict";
import { buildLensReport } from "../../lib/search/lens-report.js";
import { buildLensCommercialReadiness } from "../../lib/search/lens-commercial-readiness.js";
import type { VelmereSearchResult } from "../../lib/search/intelligence-search-contract.js";

const result: VelmereSearchResult = {
  id: "lens-report-truth",
  title: "Lens report truth",
  symbol: "LRT",
  category: "market",
  tone: "review",
  summary: "A bounded source-lane test report.",
  whyItMatters: "Missing sources must remain visible and uncalibrated heuristics must not become customer confidence.",
  missingData: ["second source"],
  nextOperatorStep: "Attach an independent second source.",
  sourceMode: "live_table",
  sourceConfidence: 88,
  sourceConfidenceCalibrated: false,
  sourceCoverage: 100, // spoofed/stale value; report must recompute from source modes.
  shieldHref: "/market-integrity",
  sources: [
    { id: "one", label: "Primary", mode: "live", freshness: "request-time", confidence: 91, note: "primary source" },
    { id: "two", label: "Secondary", mode: "missing", freshness: "missing", confidence: 77, note: "not attached" },
  ],
  chips: ["truth"],
};

const report = buildLensReport(result, "en", "basic", "2026-08-11T16:00:00.000Z");
assert.equal(report.sourceConfidence, 0, "uncalibrated input must not become report confidence");
assert.equal(report.sourceConfidenceCalibrated, false);
assert.equal(report.sourceCoverage, 50, "report must recompute coverage from source modes");
assert.equal(report.sources[0]?.coverage, 100);
assert.equal(report.sources[0]?.confidence, 0);
assert.equal(report.sources[0]?.confidenceCalibrated, false);
assert.equal(report.sources[1]?.coverage, 0);
assert.match(report.sections.find((section) => section.id === "sources")?.body ?? "", /data coverage 100%/i);
assert.match(report.sections.find((section) => section.id === "sources")?.body ?? "", /calibrated confidence: unavailable/i);

const proReadiness = buildLensCommercialReadiness(report, "pro");
const advancedReadiness = buildLensCommercialReadiness(report, "advanced");
assert.equal(proReadiness.sellReady, false, "uncalibrated source confidence must fail paid readiness closed");
assert.equal(advancedReadiness.sellReady, false, "uncalibrated source confidence must fail Advanced readiness closed");
assert.ok(proReadiness.blockedReasons.some((reason) => reason.startsWith("confidence:0/")));
assert.ok(advancedReadiness.blockedReasons.some((reason) => reason.startsWith("confidence:0/")));

console.log("A102 Lens report source-metric truth and paid-readiness fail-closed: PASS");
