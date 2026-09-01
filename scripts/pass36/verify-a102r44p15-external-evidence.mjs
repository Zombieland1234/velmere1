import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const at = args.indexOf("--evidence-root");
if (at < 0 || !args[at + 1]) throw new Error("usage: --evidence-root <materials-root>");
const evidenceRoot = path.resolve(args[at + 1]);
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p15-action-required-current-state.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p15-reentrancy-remediation-policy.json"), "utf8"));
const shaFile = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
for (const [key, binding] of Object.entries(policy.materialBindings)) {
  const p = path.join(evidenceRoot, binding.path);
  const exists = fs.existsSync(p) && fs.lstatSync(p).isFile() && !fs.lstatSync(p).isSymbolicLink();
  check(`${key}-exists`, exists, binding.path);
  if (exists) {
    check(`${key}-bytes`, fs.statSync(p).size === binding.bytes, { expected: binding.bytes, actual: fs.statSync(p).size });
    check(`${key}-sha`, shaFile(p) === binding.sha256, { expected: binding.sha256, actual: shaFile(p) });
  }
}
const ledgerPath = path.join(evidenceRoot, policy.materialBindings.ledger.path);
const summaryPath = path.join(evidenceRoot, policy.materialBindings.summary.path);
const independentPath = path.join(evidenceRoot, policy.materialBindings.independentVerification.path);
if (fs.existsSync(ledgerPath) && fs.existsSync(summaryPath) && fs.existsSync(independentPath)) {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const independent = JSON.parse(fs.readFileSync(independentPath, "utf8"));
  check("dataset-commit", ledger.dataset.commit === "230e649123477eff332742a59a1c7cc6dc286cab");
  check("denominators", ledger.denominators.cases === 69 && ledger.denominators.controls === 12 && ledger.cases.length === 69 && ledger.controls.length === 12);
  check("analyzer-class", ledger.analyzer.class === "STRUCTURED_TOKEN_CONTROL_FLOW_V3_STATE_AWARE_NOT_COMPILER_AST");
  check("analyzer-sha", ledger.analyzer.analyzerSha256 === state.accuracyTruth.analyzerSha256);
  check("recall", summary.currentRecall === 0.956522 && ledger.categoryDelta.reentrancy.currentRecall === 1);
  check("controls", summary.currentControlFlagRate === 0 && summary.flaggedControls === 0);
  check("independent", independent.status === "PASS" && independent.checks === 35 && independent.passed === 35 && independent.failed === 0);
  check("truth-boundary", ledger.truthBoundary.formalPrecision === false && ledger.truthBoundary.severityCalibration === false && ledger.truthBoundary.customerCredit === false && ledger.truthBoundary.paidTierCredit === false && ledger.truthBoundary.liveCredit === false && ledger.truthBoundary.worldClassProven === false);
  const receipts = fs.readdirSync(path.join(path.dirname(ledgerPath), "receipts")).filter((name) => name.endsWith(".json"));
  check("receipts-69", receipts.length === 69, receipts.length);
}
const failed = checks.filter((row) => !row.ok);
const result = { schemaVersion: "velmere.pass36.a102r44p15.external-evidence-receipt.v1", status: failed.length ? "FAIL" : "PASS", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks };
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
