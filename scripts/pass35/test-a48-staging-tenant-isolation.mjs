#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const digestRows = (rows) => {
  const hash = crypto.createHash("sha256");
  for (const row of [...rows].sort((a, b) => a.path.localeCompare(b.path))) { hash.update(row.path); hash.update("\0"); hash.update(row.currentSha256); hash.update("\0"); }
  return hash.digest("hex");
};

const revision = "VELMERE_PASS35_A48_STAGING_TENANT_ISOLATION_ACCEPTANCE";
const required = [
  "config/pass35/a48-staging-tenant-isolation.json", "config/pass35/a48-source-manifest.json",
  "scripts/a48-staging-tenant-isolation.mjs",
  "scripts/a48-package-evidence.mjs",
  "scripts/a48-runtime-diagnostics.mjs",
  "scripts/pass35/test-a48-staging-tenant-isolation.mjs",
  "scripts/pass35/test-a48-staging-fixture.mjs",
  "scripts/pass35/verify-a48-source-manifest.mjs",
  "VELMERE_RUN_A48_STAGING_TENANT_ISOLATION.cmd",
  "VELMERE_A48_PATCH.txt",
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);

const contract = readJson("config/pass35/a48-staging-tenant-isolation.json");
const a47 = readJson("config/pass35/a47-acceptance-evidence-intake.json");
const a46 = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const pkg = readJson("package.json");
const activePass = fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8");
const exactHistoricalRoot = activePass.includes(`ACTIVE PASS: ${revision}`);
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === a47.revisionId, contract.parentRevisionId);
check("contract:a47_decision", contract.requiredA47Decision === "VERIFIED_LOCAL_ACCEPTANCE", contract.requiredA47Decision);
check("contract:runtime", contract.runtime?.node === "24.18.0" && contract.runtime?.npm === "11.16.0", contract.runtime);
check("contract:required_env", Array.isArray(contract.requiredEnvironment) && contract.requiredEnvironment.length === 7 && new Set(contract.requiredEnvironment).size === 7, contract.requiredEnvironment);
check("contract:required_checks", Array.isArray(contract.requiredChecks) && contract.requiredChecks.length === 19 && new Set(contract.requiredChecks).size === 19 && contract.requiredChecks.includes("database-rls-19-of-19"), contract.requiredChecks);
check("contract:rls_denominator", contract.rlsPolicyCaseMatrix?.path === "config/pass23/rls-staging-case-matrix.json" && contract.rlsPolicyCaseMatrix?.requiredCases === 19 && contract.rlsPolicyCaseMatrix?.requiredExecuted === 19 && contract.rlsPolicyCaseMatrix?.requiredPassed === 19 && contract.rlsPolicyCaseMatrix?.structuralPreflightAloneMayPass === false, contract.rlsPolicyCaseMatrix);
check("contract:truth_boundary", /does not prove payments/iu.test(contract.truthBoundary) && /sale readiness/iu.test(contract.truthBoundary), contract.truthBoundary);
check("integrity:a47_contract", contract.integrity.a47ContractSha256 === sha256("config/pass35/a47-acceptance-evidence-intake.json"), contract.integrity.a47ContractSha256);
check("integrity:visual", contract.integrity.visualFiles === 338 && contract.integrity.visualDigest === digestRows(a46.integrity.visualFiles), contract.integrity);
check("integrity:assets", contract.integrity.publicAssets === 225 && contract.integrity.publicAssetsDigest === digestRows(a46.integrity.publicAssets), contract.integrity);
check("integrity:engine", contract.integrity.protectedEngineFiles === 510 && contract.integrity.protectedEngineDigest === digestRows(a46.integrity.protectedEngineFiles), contract.integrity);
for (const row of [...a46.integrity.visualFiles, ...a46.integrity.publicAssets, ...a46.integrity.protectedEngineFiles]) {
  const absolute = path.join(root, row.path);
  check(
    `hash:${row.path}`,
    !exactHistoricalRoot || (fs.existsSync(absolute) && sha256(row.path) === row.currentSha256),
    {
      path: row.path,
      exactHistoricalRoot,
      historicalHashCreditGranted: exactHistoricalRoot,
    },
  );
}
const expectedScripts = {
  "diagnose:runtime:a48": "node scripts/a48-runtime-diagnostics.mjs --write",
  "test:pass35:a48": "node scripts/pass35/test-a48-staging-tenant-isolation.mjs",
  "test:pass35:a48:fixture": "node scripts/pass35/test-a48-staging-fixture.mjs",
  "staging:tenant-isolation:a48": "node scripts/a48-staging-tenant-isolation.mjs",
  "package:evidence:a48": "node scripts/a48-package-evidence.mjs",
  "verify:source:a48": "node scripts/pass35/verify-a48-source-manifest.mjs"
};
for (const [name, expected] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === expected, pkg.scripts?.[name]);
check("package:revision", pkg.velmereStagingTenantIsolationPass === revision, pkg.velmereStagingTenantIsolationPass);
const source = fs.readFileSync(path.join(root, "scripts/a48-staging-tenant-isolation.mjs"), "utf8");
for (const token of [
  "VERIFIED_STAGING_TENANT_ISOLATION", "ACTION_REQUIRED", "artifact-lists-disjoint", "tenant-a-session-revoked",
  "stagingProven:", "liveProven: false", "saleEnabled: false", "evidence_secret_leak_detected",
  "unsafe_staging_url", "a47_verified_evidence_missing", "run-rls-staging-harness.mjs", "database-rls-19-of-19", "fullMatrixPassed"
]) check(`source:${token}`, source.includes(token), token);
for (const forbidden of ["console.log(emailA", "console.log(passwordA", "console.error(passwordA", "cookieHeader:"]) check(`redaction:${forbidden}`, !source.includes(forbidden), forbidden);
const fixture = spawnSync(process.execPath, ["scripts/pass35/test-a48-staging-fixture.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
check("fixture:passes", fixture.status === 0, { status: fixture.status, stdout: fixture.stdout?.trim(), stderr: fixture.stderr?.trim() });
const failures = checks.filter((row) => !row.ok);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 80), null, 2)); process.exit(1); }
