#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const digestRows = (rows) => { const hash = crypto.createHash("sha256"); for (const row of [...rows].sort((a, b) => a.path.localeCompare(b.path))) { hash.update(row.path); hash.update("\0"); hash.update(row.currentSha256); hash.update("\0"); } return hash.digest("hex"); };

const revision = "VELMERE_PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE";
const required = [
  "config/pass35/a52-kill-switch-incident-customer-communication-acceptance.json",
  "config/pass35/a52-source-manifest.json",
  "scripts/a52-kill-switch-incident-customer-communication-acceptance.mjs",
  "scripts/a52-package-evidence.mjs",
  "scripts/a52-runtime-diagnostics.mjs",
  "scripts/pass35/test-a52-kill-switch-incident-customer-communication-acceptance.mjs",
  "scripts/pass35/test-a52-kill-switch-incident-customer-communication-fixture.mjs",
  "scripts/pass35/verify-a52-source-manifest.mjs",
  "VELMERE_RUN_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE.cmd",
  "VELMERE_A52_PATCH.txt"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const contract = readJson("config/pass35/a52-kill-switch-incident-customer-communication-acceptance.json");
const a51 = readJson("config/pass35/a51-backup-restore-rollback-provider-loss-acceptance.json");
const a46 = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const pkg = readJson("package.json");
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === a51.revisionId, contract.parentRevisionId);
check("contract:a51_decision", contract.requiredA51Decision === "VERIFIED_STAGING_BACKUP_RESTORE_ROLLBACK_PROVIDER_FAILOVER", contract.requiredA51Decision);
check("contract:runtime", contract.runtime?.node === "24.18.0" && contract.runtime?.npm === "11.16.0", contract.runtime);
check("contract:env", contract.requiredEnvironment?.length === 12 && new Set(contract.requiredEnvironment).size === 12, contract.requiredEnvironment);
check("contract:checks", contract.requiredChecks?.length === 30 && new Set(contract.requiredChecks).size === 30, contract.requiredChecks);
check("contract:sla", contract.budgets?.acknowledgementSlaSeconds === 300 && contract.budgets?.minimumPlaybookActions === 5, contract.budgets);
check("contract:incident", contract.incidentSafety?.requiredPlaybookActions?.length === 5 && contract.incidentSafety?.safeModes?.includes("degraded_safe"), contract.incidentSafety);
check("contract:truth", /does not prove production incident response/iu.test(contract.truthBoundary) && /sale readiness/iu.test(contract.truthBoundary), contract.truthBoundary);
check("integrity:a51_contract", contract.integrity.a51ContractSha256 === sha("config/pass35/a51-backup-restore-rollback-provider-loss-acceptance.json"), contract.integrity.a51ContractSha256);
check("integrity:visual", contract.integrity.visualFiles === 338 && contract.integrity.visualDigest === digestRows(a46.integrity.visualFiles), contract.integrity);
check("integrity:assets", contract.integrity.publicAssets === 225 && contract.integrity.publicAssetsDigest === digestRows(a46.integrity.publicAssets), contract.integrity);
check("integrity:engine", contract.integrity.protectedEngineFiles === 510 && contract.integrity.protectedEngineDigest === digestRows(a46.integrity.protectedEngineFiles), contract.integrity);
for (const row of [...a46.integrity.visualFiles, ...a46.integrity.publicAssets, ...a46.integrity.protectedEngineFiles]) {
  const absolute = path.join(root, row.path);
  check(`hash:${row.path}`, fs.existsSync(absolute) && sha(row.path) === row.currentSha256, row.path);
}
const expectedScripts = {
  "diagnose:runtime:a52": "node scripts/a52-runtime-diagnostics.mjs --write",
  "test:pass35:a52": "node scripts/pass35/test-a52-kill-switch-incident-customer-communication-acceptance.mjs",
  "test:pass35:a52:fixture": "node scripts/pass35/test-a52-kill-switch-incident-customer-communication-fixture.mjs",
  "staging:incident-lifecycle:a52": "node scripts/pass36/block-retired-staging-command.mjs A52",
  "package:evidence:a52": "node scripts/a52-package-evidence.mjs",
  "verify:source:a52": "node scripts/pass35/verify-a52-source-manifest.mjs"
};
for (const [name, value] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === value, pkg.scripts?.[name]);
check("package:revision", pkg.velmereIncidentLifecycleAcceptancePass === revision, pkg.velmereIncidentLifecycleAcceptancePass);
const source = fs.readFileSync(path.join(root, "scripts/a52-kill-switch-incident-customer-communication-acceptance.mjs"), "utf8");
for (const token of [
  "VERIFIED_STAGING_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION",
  "acknowledgement-sla-met", "kill-switch-activated", "paid-delivery-blocked", "customer-notice-truthful",
  "playbook-actions-complete", "resolution-message-delivered", "incident-closed",
  "productionIncidentResponseProven: false", "realSlaProven: false", "saleEnabled: false"
]) check(`source:${token}`, source.includes(token), token);
for (const forbidden of ["sk_live_", "productionIncidentResponseProven: true", "saleEnabled: true"]) check(`source:forbid:${forbidden}`, !source.includes(forbidden), forbidden);
const failures = checks.filter((row) => !row.ok);
fs.mkdirSync(path.join(root, "artifacts/pass35/a52"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a52/PASS35_A52_CONTRACT_TEST.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a52.contract-test.v1", revisionId: revision, generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, checks }, null, 2)}\n`);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 100), null, 2)); process.exit(1); }
