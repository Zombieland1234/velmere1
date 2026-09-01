#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const digestRows = (rows) => { const hash = crypto.createHash("sha256"); for (const row of [...rows].sort((a, b) => a.path.localeCompare(b.path))) { hash.update(row.path); hash.update("\0"); hash.update(row.currentSha256); hash.update("\0"); } return hash.digest("hex"); };

const revision = "VELMERE_PASS35_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE";
const required = [
  "config/pass35/a51-backup-restore-rollback-provider-loss-acceptance.json",
  "config/pass35/a51-source-manifest.json",
  "scripts/a51-backup-restore-rollback-provider-loss-acceptance.mjs",
  "scripts/a51-package-evidence.mjs",
  "scripts/a51-runtime-diagnostics.mjs",
  "scripts/pass35/test-a51-backup-restore-rollback-provider-loss-acceptance.mjs",
  "scripts/pass35/test-a51-backup-restore-rollback-provider-loss-fixture.mjs",
  "scripts/pass35/verify-a51-source-manifest.mjs",
  "VELMERE_RUN_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE.cmd",
  "VELMERE_A51_PATCH.txt"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const contract = readJson("config/pass35/a51-backup-restore-rollback-provider-loss-acceptance.json");
const a50 = readJson("config/pass35/a50-transactional-email-private-storage-kms-acceptance.json");
const a46 = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const pkg = readJson("package.json");
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === a50.revisionId, contract.parentRevisionId);
check("contract:a50_decision", contract.requiredA50Decision === "VERIFIED_STAGING_EMAIL_STORAGE_KMS", contract.requiredA50Decision);
check("contract:runtime", contract.runtime?.node === "24.18.0" && contract.runtime?.npm === "11.16.0", contract.runtime);
check("contract:env", contract.requiredEnvironment?.length === 14 && new Set(contract.requiredEnvironment).size === 14, contract.requiredEnvironment);
check("contract:checks", contract.requiredChecks?.length === 30 && new Set(contract.requiredChecks).size === 30, contract.requiredChecks);
check("contract:backup", contract.bridgeSafety?.backupMustBeEncrypted === true && contract.bridgeSafety?.restoreTargetClass === "disposable_restore", contract.bridgeSafety);
check("contract:provider", contract.providerSafety?.outageMode === "primary_down" && contract.providerSafety?.restoreMode === "primary_up", contract.providerSafety);
check("contract:truth", /does not prove full-project point-in-time recovery/iu.test(contract.truthBoundary) && /sale readiness/iu.test(contract.truthBoundary), contract.truthBoundary);
check("integrity:a50_contract", contract.integrity.a50ContractSha256 === sha("config/pass35/a50-transactional-email-private-storage-kms-acceptance.json"), contract.integrity.a50ContractSha256);
check("integrity:visual", contract.integrity.visualFiles === 338 && contract.integrity.visualDigest === digestRows(a46.integrity.visualFiles), contract.integrity);
check("integrity:assets", contract.integrity.publicAssets === 225 && contract.integrity.publicAssetsDigest === digestRows(a46.integrity.publicAssets), contract.integrity);
check("integrity:engine", contract.integrity.protectedEngineFiles === 510 && contract.integrity.protectedEngineDigest === digestRows(a46.integrity.protectedEngineFiles), contract.integrity);
for (const row of [...a46.integrity.visualFiles, ...a46.integrity.publicAssets, ...a46.integrity.protectedEngineFiles]) {
  const absolute = path.join(root, row.path);
  check(`hash:${row.path}`, fs.existsSync(absolute) && sha(row.path) === row.currentSha256, row.path);
}
const expectedScripts = {
  "diagnose:runtime:a51": "node scripts/a51-runtime-diagnostics.mjs --write",
  "test:pass35:a51": "node scripts/pass35/test-a51-backup-restore-rollback-provider-loss-acceptance.mjs",
  "test:pass35:a51:fixture": "node scripts/pass35/test-a51-backup-restore-rollback-provider-loss-fixture.mjs",
  "staging:backup-restore-rollback:a51": "node scripts/pass36/block-retired-staging-command.mjs A51",
  "package:evidence:a51": "node scripts/a51-package-evidence.mjs",
  "verify:source:a51": "node scripts/pass35/verify-a51-source-manifest.mjs"
};
for (const [name, value] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === value, pkg.scripts?.[name]);
check("package:revision", pkg.velmereBackupRestoreRollbackAcceptancePass === revision, pkg.velmereBackupRestoreRollbackAcceptancePass);
const source = fs.readFileSync(path.join(root, "scripts/a51-backup-restore-rollback-provider-loss-acceptance.mjs"), "utf8");
for (const token of [
  "VERIFIED_STAGING_BACKUP_RESTORE_ROLLBACK_PROVIDER_FAILOVER",
  "restore-database-digest-parity",
  "restore-storage-digest-parity",
  "restore-rls-revalidated",
  "rollback-forward-restored",
  "provider-failover-served",
  "productionBackupProven: false",
  "productionRollbackProven: false",
  "providerSlaProven: false",
  "saleEnabled: false"
]) check(`source:${token}`, source.includes(token), token);
for (const forbidden of ["console.log(backupSecret", "console.log(deploymentSecret", "console.log(chaosSecret", "rawBackupId:", "rawDeploymentId:"]) check(`forbidden:${forbidden}`, !source.includes(forbidden), forbidden);
const fixture = spawnSync(process.execPath, ["scripts/pass35/test-a51-backup-restore-rollback-provider-loss-fixture.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
check("fixture:passes", fixture.status === 0, { status: fixture.status, stdout: fixture.stdout?.trim(), stderr: fixture.stderr?.trim() });
const failures = checks.filter((row) => !row.ok);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 100), null, 2)); process.exit(1); }
