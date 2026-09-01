import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const root = path.resolve(process.argv[2] ?? "");
if (!root || !fs.existsSync(root)) throw new Error("evidence_root_required");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const summaryPath = path.join(root, "R44P45_INTERACTION_CONTEXT_SUMMARY.json");
const summary = read(summaryPath);
const controlPath = path.join(root, "controls", fs.readdirSync(path.join(root, "controls")).filter((n) => n.endsWith(".json")).sort()[0]);
const syntheticPath = path.join(root, "synthetic", fs.readdirSync(path.join(root, "synthetic")).filter((n) => n.endsWith(".json")).sort()[0]);
const control = read(controlPath);
const synthetic = read(syntheticPath);
const digestOk = (row) => { const { evidenceSha256, ...core } = row; return evidenceSha256 === sha256(stable(core)); };
const cases = [
  ["summary-alert-count", summary, (x) => { x.publicControlCandidatesWithAlerts = 1; }],
  ["summary-alert-rate", summary, (x) => { x.candidateAlertRate = 0.5; }],
  ["summary-fpr-credit", summary, (x) => { x.formalFalsePositiveRateCredit = true; }],
  ["summary-human-credit", summary, (x) => { x.independentHumanAdjudicationCredit = true; }],
  ["summary-sale", summary, (x) => { x.saleCredit = true; }],
  ["summary-live", summary, (x) => { x.liveCredit = true; }],
  ["summary-pattern", summary, (x) => { x.boundedContextPatterns = []; }],
  ["control-source-hash", control, (x) => { x.sourceRootSha256 = "0".repeat(64); }],
  ["control-rule", control, (x) => { x.rootRuleIds = ["AST_EXTERNAL_INTERACTION_BEFORE_STATE_EFFECT"]; }],
  ["control-human-credit", control, (x) => { x.creditBoundary.independentHumanAdjudicationCredit = true; }],
  ["synthetic-pass", synthetic, (x) => { x.pass = !x.pass; }],
  ["synthetic-expected", synthetic, (x) => { x.expectedAlert = !x.expectedAlert; }],
];
const rows = cases.map(([id, original, mutate]) => {
  const copy = structuredClone(original);
  mutate(copy);
  return { id, rejected: !digestOk(copy) };
});
const result = { schemaVersion: "velmere.pass36.a102r44p45.interaction-context-tamper.v1", passed: rows.filter((r) => r.rejected).length, total: rows.length, rows };
console.log(JSON.stringify(result));
if (result.passed !== result.total) process.exitCode = 1;
