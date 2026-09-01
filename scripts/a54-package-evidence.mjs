#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const source = path.join(root, "artifacts/pass35/a54");
const receiptPath = path.join(source, "PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json");
const out = path.join(root, "artifacts/pass35/PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE_EVIDENCE.zip");
if (!fs.existsSync(receiptPath)) { console.error("A54 receipt missing"); process.exit(1); }
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const verified = receipt.decision === "VERIFIED_STAGING_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY" && receipt.fixtureMode === false && receipt.summary?.failed === 0 && receipt.recovery?.mutationStarted === true && receipt.recovery?.restorationAttempted === true && receipt.recovery?.restorationSucceeded === true && receipt.sourceFingerprint?.before && receipt.sourceFingerprint?.before === receipt.sourceFingerprint?.after && receipt.saleEnabled === false;
if (!verified) { console.error(`A54 evidence package refused: decision=${receipt.decision}, fixtureMode=${receipt.fixtureMode}`); process.exit(1); }
const runDir = path.join(source, "runs", receipt.runId);
const allow = [
  receiptPath,
  path.join(source, "PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.md"),
  path.join(source, "PASS35_A54_RUNTIME_DIAGNOSTICS.json"),
  path.join(source, "PASS35_A54_CONTRACT_TEST.json"),
  path.join(runDir, "receipt.json"),
  path.join(runDir, "journal.json")
].filter((file) => fs.existsSync(file));
if (allow.length < 4) { console.error("A54 evidence allowlist incomplete"); process.exit(1); }
const stage = path.join(source, "package-stage");
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
const manifestRows = [];
for (const absolute of allow) {
  const relative = absolute.startsWith(runDir) ? `run/${path.basename(absolute)}` : path.basename(absolute);
  const target = path.join(stage, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(absolute, target);
  const bytes = fs.readFileSync(target);
  manifestRows.push({ path: relative.replaceAll("\\", "/"), bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
}
const manifest = {
  schemaVersion: "velmere.pass35.a54.evidence-manifest.v1",
  revisionId: receipt.revisionId,
  runId: receipt.runId,
  decision: receipt.decision,
  generatedAt: new Date().toISOString(),
  sourceManifestSha256: receipt.sourceFingerprint.manifestSha256,
  files: manifestRows.sort((a, b) => a.path.localeCompare(b.path))
};
fs.writeFileSync(path.join(stage, "PASS35_A54_EVIDENCE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
if (fs.existsSync(out)) fs.rmSync(out, { force: true });
let result;
if (process.platform === "win32") {
  const ps = `Compress-Archive -Path '${stage.replaceAll("'", "''")}\\*' -DestinationPath '${out.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`;
  result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], { cwd: root, encoding: "utf8" });
} else {
  result = spawnSync("python3", ["-c", "import os,sys,zipfile; s,o=sys.argv[1:]; z=zipfile.ZipFile(o,'w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f),os.path.relpath(os.path.join(r,f),s).replace(os.sep,'/')) for r,_,fs in os.walk(s) for f in fs]; z.close()", stage, out], { cwd: root, encoding: "utf8" });
}
fs.rmSync(stage, { recursive: true, force: true });
if (result.status !== 0) { console.error(result.stderr || result.stdout); process.exit(1); }
const bytes = fs.readFileSync(out);
console.log(JSON.stringify({ output: path.relative(root, out).replaceAll("\\", "/"), bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }, null, 2));
