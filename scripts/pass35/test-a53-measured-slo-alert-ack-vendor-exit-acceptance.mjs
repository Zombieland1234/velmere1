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

const revision = "VELMERE_PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE";
const required = [
  "config/pass35/a53-measured-slo-alert-ack-vendor-exit-acceptance.json",
  "config/pass35/a53-source-manifest.json",
  "scripts/a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs",
  "scripts/a53-package-evidence.mjs",
  "scripts/a53-runtime-diagnostics.mjs",
  "scripts/pass35/test-a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs",
  "scripts/pass35/test-a53-measured-slo-alert-ack-vendor-exit-fixture.mjs",
  "scripts/pass35/verify-a53-source-manifest.mjs",
  "VELMERE_RUN_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE.cmd",
  "VELMERE_A53_PATCH.txt"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const contract = readJson("config/pass35/a53-measured-slo-alert-ack-vendor-exit-acceptance.json");
const a52 = readJson("config/pass35/a52-kill-switch-incident-customer-communication-acceptance.json");
const a46 = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const pkg = readJson("package.json");
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === a52.revisionId, contract.parentRevisionId);
check("contract:a52_decision", contract.requiredA52Decision === "VERIFIED_STAGING_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION", contract.requiredA52Decision);
check("contract:runtime", contract.runtime?.node === "24.18.0" && contract.runtime?.npm === "11.16.0", contract.runtime);
check("contract:env", contract.requiredEnvironment?.length === 13 && new Set(contract.requiredEnvironment).size === 13, contract.requiredEnvironment);
check("contract:checks", contract.requiredChecks?.length === 33 && new Set(contract.requiredChecks).size === 33, contract.requiredChecks);
check("contract:slo", contract.budgets?.minimumWindowSeconds === 900 && contract.budgets?.minimumSamples === 50 && contract.budgets?.availabilityTargetPct === 99 && contract.budgets?.p95MaximumMs === 1500 && contract.budgets?.p99MaximumMs === 3000, contract.budgets);
check("contract:telemetry", contract.budgets?.alertDeliverySlaSeconds === 60 && contract.budgets?.acknowledgementSlaSeconds === 300 && contract.budgets?.vendorExitSlaSeconds === 120 && contract.budgets?.minimumServiceProbes === 5, contract.budgets);
check("contract:truth", /does not prove a production SLO/iu.test(contract.truthBoundary) && /sale readiness/iu.test(contract.truthBoundary), contract.truthBoundary);
check("integrity:a52_contract", contract.integrity.a52ContractSha256 === sha("config/pass35/a52-kill-switch-incident-customer-communication-acceptance.json"), contract.integrity.a52ContractSha256);
check("integrity:visual", contract.integrity.visualFiles === 338 && contract.integrity.visualDigest === digestRows(a46.integrity.visualFiles), contract.integrity);
check("integrity:assets", contract.integrity.publicAssets === 225 && contract.integrity.publicAssetsDigest === digestRows(a46.integrity.publicAssets), contract.integrity);
check("integrity:engine", contract.integrity.protectedEngineFiles === 510 && contract.integrity.protectedEngineDigest === digestRows(a46.integrity.protectedEngineFiles), contract.integrity);
for (const row of [...a46.integrity.visualFiles, ...a46.integrity.publicAssets, ...a46.integrity.protectedEngineFiles]) {
  const absolute = path.join(root, row.path);
  check(`hash:${row.path}`, fs.existsSync(absolute) && sha(row.path) === row.currentSha256, row.path);
}
const expectedScripts = {
  "diagnose:runtime:a53": "node scripts/a53-runtime-diagnostics.mjs --write",
  "test:pass35:a53": "node scripts/pass35/test-a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs",
  "test:pass35:a53:fixture": "node scripts/pass35/test-a53-measured-slo-alert-ack-vendor-exit-fixture.mjs",
  "staging:slo-vendor-exit:a53": "node scripts/a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs",
  "package:evidence:a53": "node scripts/a53-package-evidence.mjs",
  "verify:source:a53": "node scripts/pass35/verify-a53-source-manifest.mjs"
};
for (const [name, value] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === value, pkg.scripts?.[name]);
check("package:revision", pkg.velmereSloVendorExitAcceptancePass === revision, pkg.velmereSloVendorExitAcceptancePass);
const source = fs.readFileSync(path.join(root, "scripts/a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs"), "utf8");
for (const token of [
  "VERIFIED_STAGING_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT",
  "slo-availability-target", "alert-delivery-sla-met", "acknowledgement-sla-met", "primary-credential-revoked",
  "alternate-provider-active", "service-availability-floor", "service-freshness-floor", "vendor-restored",
  "productionSloProven: false", "contractualSlaProven: false", "productionVendorExitProven: false", "saleEnabled: false"
]) check(`source:${token}`, source.includes(token), token);
for (const forbidden of ["sk_live_", "productionSloProven: true", "contractualSlaProven: true", "productionVendorExitProven: true", "saleEnabled: true"]) check(`source:forbid:${forbidden}`, !source.includes(forbidden), forbidden);
const failures = checks.filter((row) => !row.ok);
fs.mkdirSync(path.join(root, "artifacts/pass35/a53"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a53/PASS35_A53_CONTRACT_TEST.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a53.contract-test.v1", revisionId: revision, generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, checks }, null, 2)}\n`);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 100), null, 2)); process.exit(1); }
