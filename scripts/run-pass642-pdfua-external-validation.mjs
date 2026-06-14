import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const pdfPath = args.find((arg) => !arg.startsWith("--"));
const allowMissing = args.includes("--allow-missing");
if (!pdfPath) {
  console.error("Usage: node scripts/run-pass642-pdfua-external-validation.mjs <report.pdf> [--allow-missing]");
  process.exit(2);
}
const absolute = path.resolve(pdfPath);
if (!fs.existsSync(absolute)) {
  console.error(`PDF not found: ${absolute}`);
  process.exit(2);
}
const binary = process.env.VERAPDF_BIN || "verapdf";
const sha256 = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
const probe = spawnSync(binary, ["--version"], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  const receipt = {
    version: "pass642-external-validator-receipt",
    state: "not_run",
    validator: "veraPDF",
    validatorVersion: null,
    profile: "PDF/UA-1",
    executedAt: new Date().toISOString(),
    passed: false,
    machineCheckFailures: null,
    reportSha256: sha256,
    humanReview: "not_run",
    notes: ["veraPDF binary unavailable; no conformance claim may be made."],
  };
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(allowMissing ? 0 : 3);
}
const result = spawnSync(binary, ["--format", "json", "--profile", "ua1", absolute], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});
let parsed = null;
try { parsed = JSON.parse(result.stdout || "null"); } catch { parsed = null; }
const failures = Number(parsed?.report?.jobs?.[0]?.validationResult?.details?.failedRules ?? (result.status === 0 ? 0 : 1));
const receipt = {
  version: "pass642-external-validator-receipt",
  state: result.status === 0 && failures === 0 ? "machine_pass_human_review" : "blocked",
  validator: "veraPDF",
  validatorVersion: (probe.stdout || probe.stderr || "unknown").trim().slice(0, 160),
  profile: "PDF/UA-1",
  executedAt: new Date().toISOString(),
  passed: result.status === 0 && failures === 0,
  machineCheckFailures: failures,
  reportSha256: sha256,
  humanReview: "not_run",
  notes: [
    "Machine validation cannot prove all PDF/UA human checkpoints.",
    ...(result.stderr ? [result.stderr.trim().slice(0, 600)] : []),
  ],
};
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.passed ? 0 : 1);
