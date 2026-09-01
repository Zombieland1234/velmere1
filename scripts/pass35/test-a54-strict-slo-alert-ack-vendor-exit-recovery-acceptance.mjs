#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null, category = "behavioral") => checks.push({ id, ok: Boolean(ok), detail, category });
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const digestRows = (rows) => {
  const hash = crypto.createHash("sha256");
  for (const row of [...rows].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(row.path); hash.update("\0"); hash.update(row.currentSha256); hash.update("\0");
  }
  return hash.digest("hex");
};

const revision = "VELMERE_PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE";
const required = [
  "config/pass35/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.json",
  "config/pass35/a54-source-manifest.json",
  "scripts/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.mjs",
  "scripts/a54-package-evidence.mjs",
  "scripts/a54-runtime-diagnostics.mjs",
  "scripts/pass35/test-a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.mjs",
  "scripts/pass35/test-a54-strict-slo-alert-ack-vendor-exit-recovery-fixture.mjs",
  "scripts/pass35/verify-a54-source-manifest.mjs",
  "VELMERE_RUN_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.cmd",
  "VELMERE_A54_PATCH.txt",
  "config/pass35/current-revision.json"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const contract = readJson("config/pass35/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.json");
const a53 = readJson("config/pass35/a53-measured-slo-alert-ack-vendor-exit-acceptance.json");
const a46 = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const pkg = readJson("package.json");
const manifest = readJson("config/pass35/a54-source-manifest.json");
const currentRevision = readJson("config/pass35/current-revision.json");
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === a53.revisionId, contract.parentRevisionId);
check("contract:a52_gate", contract.requiredA52RevisionId === "VELMERE_PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE" && contract.requiredA52Decision === "VERIFIED_STAGING_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION", { revision: contract.requiredA52RevisionId, decision: contract.requiredA52Decision });
check("contract:runtime", contract.runtime?.node === "24.18.0" && contract.runtime?.npm === "11.16.0", contract.runtime);
check("contract:env", contract.requiredEnvironment?.length === 21 && new Set(contract.requiredEnvironment).size === 21, contract.requiredEnvironment);
check("contract:checks", contract.requiredChecks?.length === 42 && new Set(contract.requiredChecks).size === 42, contract.requiredChecks);
check("contract:window", contract.budgets?.minimumWindowSeconds === 900 && contract.budgets?.maximumWindowSeconds === 1800 && contract.budgets?.maximumWindowAgeSeconds === 180 && contract.budgets?.maximumClockSkewSeconds <= 2, contract.budgets);
check("contract:probe", contract.budgets?.minimumServiceProbes === 10 && contract.polling?.serviceProbeIntervalMs >= 1000, { budgets: contract.budgets, polling: contract.polling });
check("contract:recovery", contract.recovery?.restoreAttempts >= 3 && contract.recovery?.restoreRetryDelayMs >= 1000, contract.recovery);
check("contract:truth", /does not prove a production SLO/iu.test(contract.truthBoundary) && /sale readiness/iu.test(contract.truthBoundary), contract.truthBoundary);
check("manifest:revision", manifest.revisionId === revision, manifest.revisionId);
check("manifest:no_self_reference", !(manifest.files ?? []).some((row) => row.path === "config/pass35/a54-source-manifest.json"), null);
check("current-revision:lineage", (currentRevision.sourceRevisionId === revision || currentRevision.previousAcceptanceRevisionId === revision) && (currentRevision.activeAcceptanceRevisionId === revision || currentRevision.previousAcceptanceRevisionId === revision) && currentRevision.supersededAcceptanceRevisionId === a53.revisionId && currentRevision.saleEnabled === false, currentRevision);
check("integrity:a53_contract", contract.integrity.a53ContractSha256 === sha("config/pass35/a53-measured-slo-alert-ack-vendor-exit-acceptance.json"), contract.integrity.a53ContractSha256);
check("integrity:visual", contract.integrity.visualFiles === 338 && contract.integrity.visualDigest === digestRows(a46.integrity.visualFiles), contract.integrity);
check("integrity:assets", contract.integrity.publicAssets === 225 && contract.integrity.publicAssetsDigest === digestRows(a46.integrity.publicAssets), contract.integrity);
check("integrity:engine", contract.integrity.protectedEngineFiles === 510 && contract.integrity.protectedEngineDigest === digestRows(a46.integrity.protectedEngineFiles), contract.integrity);
for (const row of [...a46.integrity.visualFiles, ...a46.integrity.publicAssets, ...a46.integrity.protectedEngineFiles]) {
  const absolute = path.join(root, row.path);
  check(`hash:${row.path}`, fs.existsSync(absolute) && sha(row.path) === row.currentSha256, row.path, "protected_integrity");
}
const expectedScripts = {
  "diagnose:runtime:a54": "node scripts/a54-runtime-diagnostics.mjs --write",
  "test:pass35:a54": "node scripts/pass35/test-a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.mjs",
  "test:pass35:a54:fixture": "node scripts/pass35/test-a54-strict-slo-alert-ack-vendor-exit-recovery-fixture.mjs",
  "staging:strict-slo-vendor-exit:a54": "node scripts/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.mjs",
  "package:evidence:a54": "node scripts/a54-package-evidence.mjs",
  "verify:source:a54": "node scripts/pass35/verify-a54-source-manifest.mjs"
};
for (const [name, value] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === value, pkg.scripts?.[name]);
check("package:revision", pkg.velmereStrictSloVendorExitRecoveryPass === revision, pkg.velmereStrictSloVendorExitRecoveryPass);
const source = fs.readFileSync(path.join(root, "scripts/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.mjs"), "utf8");
for (const token of [
  "requireNoFailuresSince(preflightStart, \"a54_preflight_failed\")",
  "finally {",
  "restorePrimary(urls, secrets, sourceFingerprint",
  "RECOVERY_REQUIRED",
  "source-manifest-external-anchor",
  "precondition-a52-evidence-bound",
  "alert-delivered-by-independent-observer",
  "oncall-acknowledged-by-distinct-actor",
  "revoked-primary-credential-rejected",
  "alternate-provider-independent",
  "service-probe-schema-valid",
  "successCount + errorCount === sampleCount",
  "p50 <= p95 && p95 <= p99",
  "typeof value === \"number\" && Number.isFinite(value)",
  "sourceRevisionId === contract.revisionId",
  "saleEnabled: false"
]) check(`source:${token}`, source.includes(token), token);
const a53Source = fs.readFileSync(path.join(root, "scripts/a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs"), "utf8");
check("a53:real_mode_retired", a53Source.includes("A53_RETIRED_BY_A54") && a53Source.includes("if (!fixtureMode)"), null);
for (const forbidden of [
  "Math.max(0, (deliveredAt",
  "Math.max(0, (acknowledgedAt",
  "Number(exited.json?.primaryTrafficSharePct)",
  "Number(probe.json?.latencyMs)",
  "productionSloProven: true",
  "contractualSlaProven: true",
  "productionVendorExitProven: true",
  "saleEnabled: true"
]) check(`source:forbid:${forbidden}`, !source.includes(forbidden), forbidden);
const failures = checks.filter((row) => !row.ok);
const behavioral = checks.filter((row) => row.category === "behavioral");
const protectedIntegrity = checks.filter((row) => row.category === "protected_integrity");
const report = {
  schemaVersion: "velmere.pass35.a54.contract-test.v1",
  revisionId: revision,
  generatedAt: new Date().toISOString(),
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  categories: {
    behavioral: { checks: behavioral.length, passed: behavioral.filter((row) => row.ok).length, failed: behavioral.filter((row) => !row.ok).length },
    protectedIntegrity: { checks: protectedIntegrity.length, passed: protectedIntegrity.filter((row) => row.ok).length, failed: protectedIntegrity.filter((row) => !row.ok).length }
  },
  checks
};
fs.mkdirSync(path.join(root, "artifacts/pass35/a54"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a54/PASS35_A54_CONTRACT_TEST.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report.summary, categories: report.categories }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 100), null, 2)); process.exit(1); }
