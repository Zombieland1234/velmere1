#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const digestRows = (rows) => {
  const hash = crypto.createHash("sha256");
  for (const row of [...rows].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(row.path); hash.update("\0"); hash.update(row.currentSha256); hash.update("\0");
  }
  return hash.digest("hex");
};
const revision = "VELMERE_PASS35_A47_ACCEPTANCE_EVIDENCE_INTAKE_TRIAGE";
const required = [
  "config/pass35/a47-acceptance-evidence-intake.json", "scripts/lib/a47-safe-zip.mjs", "scripts/a47-evidence-intake.mjs",
  "scripts/a47-package-evidence.mjs", "scripts/a47-runtime-diagnostics.mjs", "scripts/pass35/test-a47-acceptance-evidence-intake.mjs",
  "scripts/pass35/test-a47-evidence-intake-fixture.mjs", "scripts/pass35/verify-a47-source-manifest.mjs", "VELMERE_IMPORT_A47_ACCEPTANCE_EVIDENCE.cmd", "VELMERE_A47_PATCH.txt",
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const contract = readJson("config/pass35/a47-acceptance-evidence-intake.json");
const parent = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const hardening = readJson("config/pass35/a57r1-hardening-integrity.json");
const pkg = readJson("package.json");
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === parent.revisionId, contract.parentRevisionId);
check("contract:a45_revision", contract.a45RevisionId === "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE", contract.a45RevisionId);
check("contract:a46_revision", contract.a46RevisionId === parent.revisionId, contract.a46RevisionId);
check("contract:a45_route_rows", contract.expectedA45RouteRows === 36, contract.expectedA45RouteRows);
check("contract:a45_stages", contract.requiredA45Stages.length === 12 && new Set(contract.requiredA45Stages).size === 12, contract.requiredA45Stages);
check("contract:a46_stages", contract.requiredA46Stages.length === 7 && new Set(contract.requiredA46Stages).size === 7, contract.requiredA46Stages);
check("contract:a46_checks", contract.requiredA46Checks.length === 9 && new Set(contract.requiredA46Checks).size === 9, contract.requiredA46Checks);
check("integrity:a46_contract", contract.integrity.a46ContractSha256 === sha256("config/pass35/a46-customer-data-plane-acceptance.json"), contract.integrity.a46ContractSha256);
check("integrity:visual_count", contract.integrity.visualFiles === 338 && parent.integrity.visualFiles.length === 338, contract.integrity.visualFiles);
check("integrity:visual_digest", contract.integrity.visualDigest === digestRows(parent.integrity.visualFiles), contract.integrity.visualDigest);
check("integrity:asset_count", contract.integrity.publicAssets === 225 && parent.integrity.publicAssets.length === 225, contract.integrity.publicAssets);
check("integrity:asset_digest", contract.integrity.publicAssetsDigest === digestRows(parent.integrity.publicAssets), contract.integrity.publicAssetsDigest);
check("integrity:engine_count", contract.integrity.protectedEngineFiles === 510 && parent.integrity.protectedEngineFiles.length === 510, contract.integrity.protectedEngineFiles);
check("integrity:engine_digest", contract.integrity.protectedEngineDigest === digestRows(parent.integrity.protectedEngineFiles), contract.integrity.protectedEngineDigest);
const tombstoneDigest = (row) => crypto.createHash("sha256").update(`A59_RETIRED_ROUTE_SHELL\0${row.path}\0${[...(row.replacementPaths ?? [])].sort((a, b) => a.localeCompare(b)).join("\0")}`).digest("hex");
const currentRows = [...hardening.integrity.visualFiles, ...hardening.integrity.publicAssets, ...hardening.integrity.protectedEngineFiles];
check("integrity:current_hardening", hardening.schemaVersion === "velmere.pass35.a57r1.hardening-integrity.v2" && currentRows.length === 1073, hardening.counts);
for (const row of currentRows) {
  const absolute = path.join(root, row.path);
  const ok = row.classification === "A59_RETIRED_ROUTE_SHELL"
    ? !fs.existsSync(absolute) && Array.isArray(row.replacementPaths) && row.replacementPaths.length >= 3 && row.replacementPaths.every((replacement) => fs.existsSync(path.join(root, replacement))) && tombstoneDigest(row) === row.currentSha256
    : fs.existsSync(absolute) && sha256(row.path) === row.currentSha256;
  check(`hash:${row.path}`, ok, row.path);
}
const expectedScripts = {
  "diagnose:runtime:a47": "node scripts/a47-runtime-diagnostics.mjs --write",
  "test:pass35:a47": "node scripts/pass35/test-a47-acceptance-evidence-intake.mjs",
  "test:pass35:a47:fixture": "node scripts/pass35/test-a47-evidence-intake-fixture.mjs",
  "intake:evidence:a47": "node scripts/a47-evidence-intake.mjs",
  "package:evidence:a47": "node scripts/a47-package-evidence.mjs",
  "verify:source:a47": "node scripts/pass35/verify-a47-source-manifest.mjs",
};
for (const [name, expected] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === expected, pkg.scripts?.[name]);
check("package:revision", pkg.velmereEvidenceIntakePass === revision, pkg.velmereEvidenceIntakePass);
const source = fs.readFileSync(path.join(root, "scripts/a47-evidence-intake.mjs"), "utf8");
for (const token of ["REJECTED_INTEGRITY", "INCOMPLETE_EVIDENCE", "ACTION_REQUIRED", "VERIFIED_LOCAL_ACCEPTANCE", "stagingProven: false", "liveProven: false", "saleEnabled: false"]) check(`source:${token}`, source.includes(token));
const zipSource = fs.readFileSync(path.join(root, "scripts/lib/a47-safe-zip.mjs"), "utf8");
for (const token of ["zip_path_traversal", "zip_duplicate_entry", "zip_symlink_rejected", "zip_crc_mismatch", "maximumTotalUncompressedBytes"]) check(`zip:${token}`, zipSource.includes(token));
const failures = checks.filter((row) => !row.ok);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) {
  console.error(JSON.stringify(failures.slice(0, 50), null, 2));
  process.exit(1);
}
