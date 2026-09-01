import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildVlmModalEvidencePacket } from "../../lib/market-integrity/vlm-modal-evidence-packet.js";
import { evidenceCoverageCapLabel, sourceEvidenceLabel } from "../../lib/market-integrity/asset-detail-analysis-copy.js";
import { buildAuditSampleReport } from "../../lib/security/audit-sample-report.js";
import { buildAuditReportById } from "../../lib/security/audit-report-queue.js";
import { buildAuditRegistryDashboard } from "../../lib/security/audit-public-registry.js";
import { buildAuditReportExportPayload } from "../../lib/security/audit-pdf-shield-export.js";

const observedAt = new Date().toISOString();
const base = {
  symbol: "ETH",
  name: "Ethereum",
  priceLabel: "$4,000",
  changeLabel: "+1.2%",
  sourceLabel: "Binance",
  sourceTimeLabel: observedAt,
  currencyLabel: "USD",
  marketStatusLabel: "open",
  riskLabel: "20/100",
  candles: Array.from({ length: 10 }, (_, index) => ({
    timestamp: Date.now() - (10 - index) * 60_000,
    open: 3990 + index,
    high: 4005 + index,
    low: 3980 + index,
    close: 3995 + index,
    volume: 1000 + index * 10,
  })),
};

const basicLowRisk = buildVlmModalEvidencePacket({ ...base, tier: "Basic" });
const basicHighRisk = buildVlmModalEvidencePacket({ ...base, riskLabel: "95/100", tier: "Basic" });
assert.equal(
  basicLowRisk.evidenceCoverageCap,
  basicHighRisk.evidenceCoverageCap,
  "risk severity must not alter evidence coverage when the same evidence lanes are attached",
);
assert.ok(basicLowRisk.evidenceCoverageCap >= 0 && basicLowRisk.evidenceCoverageCap <= 100);

const pro = buildVlmModalEvidencePacket({ ...base, tier: "Pro" });
const advanced = buildVlmModalEvidencePacket({ ...base, tier: "Advanced" });
assert.equal(basicLowRisk.sourceCount, 1);
assert.equal(pro.sourceCount, 1);
assert.equal(advanced.sourceCount, 1);
assert.match(sourceEvidenceLabel("Basic", base), /^1 independent provider family attached$/);
assert.match(sourceEvidenceLabel("Advanced", base), /^1 independent provider family attached$/);
assert.equal(evidenceCoverageCapLabel("Basic", base), `${basicLowRisk.evidenceCoverageCap}% tier evidence coverage`);
assert.equal(evidenceCoverageCapLabel("Pro", base), `${pro.evidenceCoverageCap}% tier evidence coverage`);
assert.equal(evidenceCoverageCapLabel("Advanced", base), `${advanced.evidenceCoverageCap}% tier evidence coverage`);
assert.ok(
  advanced.evidenceCoverageCap <= basicLowRisk.evidenceCoverageCap,
  "Advanced may require more evidence lanes, but tier name must not create an arbitrary coverage floor",
);

const sample = buildAuditSampleReport("en", "basic_review");
const sampleReady = sample.preview.steps.filter((step) => step.state === "ready").length;
const sampleExpectedCoverage = sample.preview.steps.length ? Math.round((sampleReady / sample.preview.steps.length) * 100) : 0;
assert.equal(sample.verdict.evidenceCoverage, sampleExpectedCoverage);
assert.equal(sample.verdict.confidence, sample.verdict.evidenceCoverage, "compatibility alias must not change semantic authority");
assert.doesNotMatch(sample.verdict.body, /confidence cap|confidence stays capped/i);
assert.match(sample.verdict.body, /evidence coverage/i);

const queueSample = buildAuditReportById("sample", "en");
assert.equal(queueSample.confidenceCap, queueSample.evidenceCoverage);
assert.ok(queueSample.queueSignals.some((item) => item.startsWith("evidence-coverage:")));
assert.ok(queueSample.queueSignals.every((item) => !item.startsWith("confidence-cap:")));

const registry = buildAuditRegistryDashboard("en", "", "all", "evidence");
const registrySample = registry.projects.find((project) => project.id === "velmere-sample-token");
assert.ok(registrySample, "sample registry project must exist");
assert.equal(registrySample!.evidenceCoverage, queueSample.evidenceCoverage, "registry coverage must derive from current report output, not a seed score");
assert.equal(registrySample!.confidenceCap, registrySample!.evidenceCoverage);
assert.ok(registry.metrics.some((metric) => metric.label === "avg evidence coverage"));
assert.ok(registry.metrics.every((metric) => !/confidence/i.test(metric.label)));

const exportPayload = buildAuditReportExportPayload("sample", "en");
assert.equal(exportPayload.shieldMap.evidenceCoverage, queueSample.evidenceCoverage);
assert.equal(exportPayload.shieldMap.confidenceCap, exportPayload.shieldMap.evidenceCoverage);
assert.ok(exportPayload.pdf.executiveSummary.every((line) => !/confidence cap/i.test(line)));
assert.ok(exportPayload.pdf.sections.flatMap((section) => [section.body, ...section.bullets]).every((line) => !/confidence cap/i.test(line)));

const root = path.resolve(process.cwd());
for (const file of [
  "components/security/SecurityAuditRegistryPage.tsx",
  "components/security/SecurityAuditSampleReportPage.tsx",
  "components/security/SecurityAuditReportPage.tsx",
  "components/security/SecurityAuditExportPage.tsx",
  "components/market-integrity/AssetDetailModal.tsx",
  "components/market-integrity/asset-detail/analysis-model.ts",
]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.doesNotMatch(source, />Confidence cap</i, `${file} must not present deterministic coverage as confidence cap`);
}

const assetSource = fs.readFileSync(path.join(root, "lib/market-integrity/asset-detail-analysis-copy.ts"), "utf8");
assert.doesNotMatch(assetSource, /tier === "Advanced" \? "48% cap"/);
assert.doesNotMatch(assetSource, /analysisEvidenceCount/);
assert.match(assetSource, /tier evidence coverage/);

console.log("A102 public audit + AssetDetail evidence-coverage semantic truth: PASS");
