#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const source = path.join(root, "artifacts/pass35/a57");
const receiptPath = path.join(source, "PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE.json");
const contractPath = path.join(root, "config/pass35/a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.json");
const outputPath = path.join(root, "artifacts/pass35/PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE_EVIDENCE.zip");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
const safeRunFile = (runDir, relative) => {
  if (typeof relative !== "string" || !/^[a-zA-Z0-9._/-]+$/u.test(relative) || relative.startsWith("/") || relative.split("/").includes("..")) {
    fail(`A57 unsafe run artifact path: ${String(relative)}`);
  }
  const absolute = path.resolve(runDir, relative);
  if (!absolute.startsWith(`${path.resolve(runDir)}${path.sep}`)) fail(`A57 run artifact escapes run root: ${relative}`);
  return absolute;
};

if (!fs.existsSync(receiptPath)) fail("A57 receipt missing");
const receiptBytes = fs.readFileSync(receiptPath);
const receipt = JSON.parse(receiptBytes.toString("utf8"));
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const runDir = path.join(source, "runs", String(receipt.runId ?? ""));
const runReceiptPath = safeRunFile(runDir, "receipt.json");
if (!fs.existsSync(runReceiptPath)) fail("A57 run receipt missing");
const runReceiptBytes = fs.readFileSync(runReceiptPath);
if (!receiptBytes.equals(runReceiptBytes)) fail("A57 canonical receipt differs from immutable run receipt");

const verified =
  receipt.decision === "VERIFIED_STAGING_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY" &&
  receipt.fixtureMode === false &&
  receipt.summary?.failed === 0 &&
  receipt.boundedCanaryLifecycleProven === true &&
  receipt.controlledCanaryExecuted === true &&
  receipt.killSwitchAndRollbackProven === true &&
  receipt.supportRefundOutcomeTelemetryProven === true &&
  receipt.parentEvidence?.detachedSignaturesVerified === true &&
  receipt.recovery?.rollbackSucceeded === true &&
  receipt.recovery?.finalBaselineHealthy === true &&
  receipt.productionPaymentsProven === false &&
  receipt.productionApproved === false &&
  receipt.liveProven === false &&
  receipt.saleEnabled === false;
if (!verified) {
  fail(`A57 evidence package refused: decision=${receipt.decision}, fixtureMode=${receipt.fixtureMode}, failed=${receipt.summary?.failed}`);
}

const journalPath = safeRunFile(runDir, "journal.json");
const journalNdjsonPath = safeRunFile(runDir, "journal.ndjson");
if (!fs.existsSync(journalPath) || !fs.existsSync(journalNdjsonPath)) fail("A57 journal evidence incomplete");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
const journalRows = Array.isArray(journal.rows) ? journal.rows : [];
if (!journalRows.length || journalRows.length !== receipt.journalEvidence?.entries) fail("A57 journal row count mismatch");
for (let index = 0; index < journalRows.length; index += 1) {
  const row = journalRows[index];
  const { digest, ...unsigned } = row;
  if (!/^[a-f0-9]{64}$/u.test(digest ?? "") || sha256(JSON.stringify(unsigned)) !== digest) fail(`A57 journal digest mismatch at row ${index + 1}`);
  if (index > 0 && row.previousDigest !== journalRows[index - 1].digest) fail(`A57 journal chain mismatch at row ${index + 1}`);
}
if (journalRows.at(-1)?.digest !== receipt.journalDigest || receipt.journalDigest !== receipt.journalEvidence?.hashChainHead) {
  fail("A57 journal head mismatch");
}
const ndjsonRows = fs.readFileSync(journalNdjsonPath, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
if (JSON.stringify(ndjsonRows) !== JSON.stringify(journalRows)) fail("A57 JSON and NDJSON journal views differ");

const snapshotReceipts = receipt.snapshotEvidence?.receipts;
if (!Array.isArray(snapshotReceipts) || snapshotReceipts.length < contract.canary.minimumSnapshots || snapshotReceipts.length !== receipt.snapshotEvidence?.count) {
  fail("A57 complete snapshot evidence is missing");
}
const snapshotFiles = [];
for (const row of snapshotReceipts) {
  if (row.status !== "ACCEPTED") fail(`A57 non-accepted snapshot cannot receive verified evidence credit: ${row.index}`);
  const absolute = safeRunFile(runDir, row.path);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`A57 snapshot missing: ${row.path}`);
  const bytes = fs.readFileSync(absolute);
  if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) fail(`A57 snapshot digest mismatch: ${row.path}`);
  const snapshot = JSON.parse(bytes.toString("utf8"));
  if (
    snapshot.schemaVersion !== "velmere.pass35.a57.snapshot-evidence.v1" ||
    snapshot.revisionId !== receipt.revisionId ||
    snapshot.runId !== receipt.runId ||
    snapshot.index !== row.index ||
    snapshot.status !== "ACCEPTED"
  ) fail(`A57 snapshot binding mismatch: ${row.path}`);
  snapshotFiles.push({ absolute, relative: `run/${row.path}` });
}

const topLevelFiles = [
  receiptPath,
  path.join(source, "PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE.md"),
  path.join(source, "PASS35_A57_RUNTIME_DIAGNOSTICS.json"),
  path.join(source, "PASS35_A57_CONTRACT_TEST.json"),
].filter((file) => fs.existsSync(file));
if (topLevelFiles.length < 3) fail("A57 evidence allowlist incomplete");

const stage = path.join(source, "package-stage");
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
const rows = [];
const copyEvidenceFile = (absolute, relative) => {
  const target = path.join(stage, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(absolute, target);
  const bytes = fs.readFileSync(target);
  rows.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
};
for (const absolute of topLevelFiles) copyEvidenceFile(absolute, path.basename(absolute));
copyEvidenceFile(runReceiptPath, "run/receipt.json");
copyEvidenceFile(journalPath, "run/journal.json");
copyEvidenceFile(journalNdjsonPath, "run/journal.ndjson");
for (const snapshot of snapshotFiles) copyEvidenceFile(snapshot.absolute, snapshot.relative);

const manifest = {
  schemaVersion: "velmere.pass35.a57.evidence-manifest.v2",
  revisionId: receipt.revisionId,
  parentRevisionId: receipt.parentRevisionId,
  decision: receipt.decision,
  generatedAt: new Date().toISOString(),
  sourceManifestSha256: receipt.sourceFingerprint?.manifestSha256,
  a55EvidenceManifestSha256: receipt.parentEvidence?.a55EvidenceManifestSha256,
  a56EvidenceManifestSha256: receipt.parentEvidence?.a56EvidenceManifestSha256,
  parentSignerSpkiSha256: [
    receipt.parentEvidence?.a55SignerSpkiSha256,
    receipt.parentEvidence?.a56SignerSpkiSha256,
  ],
  journalDigest: receipt.journalDigest,
  snapshotCount: snapshotFiles.length,
  promotionAllowed: false,
  truthBoundary: "This package can preserve a verified bounded staging canary transcript only. Its ZIP hash still requires an external release anchor. It grants no LIVE, production, sale, payment, SLA or customer-value credit.",
  files: rows.sort((left, right) => left.path.localeCompare(right.path)),
};
fs.writeFileSync(path.join(stage, "PASS35_A57_EVIDENCE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);

if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true });
let result;
if (process.platform === "win32") {
  const powershell = `Compress-Archive -Path '${stage.replaceAll("'", "''")}\\*' -DestinationPath '${outputPath.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`;
  result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", powershell], { cwd: root, encoding: "utf8" });
} else {
  result = spawnSync("python3", [
    "-c",
    "import os,sys,zipfile; s,o=sys.argv[1:]; z=zipfile.ZipFile(o,'w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f),os.path.relpath(os.path.join(r,f),s).replace(os.sep,'/')) for r,_,fs in os.walk(s) for f in fs]; z.close()",
    stage,
    outputPath,
  ], { cwd: root, encoding: "utf8" });
}
fs.rmSync(stage, { recursive: true, force: true });
if (result.status !== 0) fail(result.stderr || result.stdout);
const outputBytes = fs.readFileSync(outputPath);
console.log(JSON.stringify({
  output: path.relative(root, outputPath).replaceAll("\\", "/"),
  bytes: outputBytes.length,
  sha256: sha256(outputBytes),
  snapshotCount: snapshotFiles.length,
  promotionAllowed: false,
}, null, 2));
