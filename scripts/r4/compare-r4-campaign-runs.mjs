import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const firstPath = process.argv[2];
const secondPath = process.argv[3];
const OUT = path.join(ROOT, "artifacts/r4/VELMERE_R4_CAMPAIGN_REPEATABILITY.json");
if (!firstPath || !secondPath) {
  process.stderr.write("usage: node scripts/r4/compare-r4-campaign-runs.mjs <run1.json> <run2.json>\n");
  process.exit(64);
}
const first = JSON.parse(fs.readFileSync(firstPath, "utf8"));
const second = JSON.parse(fs.readFileSync(secondPath, "utf8"));
const byFile = (campaign) => new Map(campaign.results.map((result) => [result.file, result]));
const left = byFile(first);
const right = byFile(second);
const selectedFileSetEqual = left.size === right.size && [...left.keys()].every((file) => right.has(file));
const comparisons = [...new Set([...left.keys(), ...right.keys()])].sort().map((file) => {
  const a = left.get(file);
  const b = right.get(file);
  return {
    file,
    presentInBoth: Boolean(a && b),
    classificationEqual: Boolean(a && b && a.classification === b.classification),
    exitCodeEqual: Boolean(a && b && a.exitCode === b.exitCode),
    stdoutSha256Equal: Boolean(a && b && a.stdoutSha256 === b.stdoutSha256),
    stderrSha256Equal: Boolean(a && b && a.stderrSha256 === b.stderrSha256),
    firstClassification: a?.classification ?? null,
    secondClassification: b?.classification ?? null,
  };
});
const count = (field) => comparisons.filter((comparison) => comparison[field]).length;
const outcomeStable = selectedFileSetEqual
  && comparisons.every((comparison) => comparison.classificationEqual && comparison.exitCodeEqual)
  && JSON.stringify(first.summary) === JSON.stringify(second.summary)
  && first.actualFailureCount === second.actualFailureCount
  && first.classification === second.classification;
const payload = {
  schemaVersion: "velmere.r4.local-current-execution-repeatability.v1",
  generatedAt: new Date().toISOString(),
  status: outcomeStable ? "PASS_OUTCOME_REPEATABLE" : "FAIL_OUTCOME_DIVERGED",
  inputs: {
    first: path.resolve(firstPath),
    second: path.resolve(secondPath),
  },
  selectedTests: comparisons.length,
  selectedFileSetEqual,
  campaignSummaryEqual: JSON.stringify(first.summary) === JSON.stringify(second.summary),
  campaignClassificationEqual: first.classification === second.classification,
  actualFailureCountEqual: first.actualFailureCount === second.actualFailureCount,
  perTest: {
    classificationEqual: count("classificationEqual"),
    exitCodeEqual: count("exitCodeEqual"),
    stdoutSha256Equal: count("stdoutSha256Equal"),
    stderrSha256Equal: count("stderrSha256Equal"),
  },
  stdoutDivergences: comparisons.filter((comparison) => !comparison.stdoutSha256Equal).map((comparison) => comparison.file),
  comparisons,
  byteIdenticalCampaignClaim: false,
  customerFinalCredit: false,
  truthBoundary: "Repeatability is granted only to selected test set, summary, per-test classification and exit status. Five stdout payloads contain run-specific nonce/time/evidence values, so whole-campaign byte identity is explicitly not claimed.",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: payload.status, selectedTests: payload.selectedTests, perTest: payload.perTest, stdoutDivergences: payload.stdoutDivergences, output: path.relative(ROOT, OUT).split(path.sep).join("/") }, null, 2)}\n`);
if (!outcomeStable) process.exit(2);
