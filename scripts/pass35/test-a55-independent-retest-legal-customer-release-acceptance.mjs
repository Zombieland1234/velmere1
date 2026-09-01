#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null, category = "behavioral") => checks.push({ id, ok: Boolean(ok), detail, category });
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const digestRows = (rows) => { const h = crypto.createHash("sha256"); for (const row of [...rows].sort((a,b)=>a.path.localeCompare(b.path))) { h.update(row.path); h.update("\0"); h.update(row.currentSha256); h.update("\0"); } return h.digest("hex"); };
const revision = "VELMERE_PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE";
const required = [
  "config/pass35/a55-independent-retest-legal-customer-release-acceptance.json",
  "config/pass35/a55-source-manifest.json",
  "scripts/a55-independent-retest-legal-customer-release-acceptance.mjs",
  "scripts/a55-package-evidence.mjs",
  "scripts/a55-runtime-diagnostics.mjs",
  "scripts/pass35/test-a55-independent-retest-legal-customer-release-acceptance.mjs",
  "scripts/pass35/test-a55-independent-retest-legal-customer-release-fixture.mjs",
  "scripts/pass35/verify-a55-source-manifest.mjs",
  "VELMERE_RUN_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.cmd",
  "VELMERE_A55_PATCH.txt",
  "config/pass35/current-revision.json"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const contract = readJson("config/pass35/a55-independent-retest-legal-customer-release-acceptance.json");
const a54 = readJson("config/pass35/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.json");
const a46 = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const pkg = readJson("package.json");
const manifest = readJson("config/pass35/a55-source-manifest.json");
const current = readJson("config/pass35/current-revision.json");
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === a54.revisionId, contract.parentRevisionId);
check("contract:a54_gate", contract.requiredA54RevisionId === a54.revisionId && contract.requiredA54Decision === "VERIFIED_STAGING_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY", { revision: contract.requiredA54RevisionId, decision: contract.requiredA54Decision });
check("contract:runtime", contract.runtime?.node === "24.18.0" && contract.runtime?.npm === "11.16.0", contract.runtime);
check("contract:report_types", contract.reportTypes?.length === 5 && new Set(contract.reportTypes).size === 5, contract.reportTypes);
check("contract:scope", contract.reportTypes.every((type) => Array.isArray(contract.requiredScopes[type]) && contract.requiredScopes[type].length >= 4), contract.requiredScopes);
check("contract:roles", Object.keys(contract.primaryRoles ?? {}).length === 5 && contract.secondaryRole === "INDEPENDENT_VERIFIER" && contract.releaseRoles?.join("|") === "ACCOUNTABLE_RELEASE_OWNER|INDEPENDENT_ASSURANCE_CHAIR", { primary: contract.primaryRoles, secondary: contract.secondaryRole, release: contract.releaseRoles });
check("contract:crypto", contract.allowedAlgorithms?.length === 1 && contract.allowedAlgorithms[0] === "ED25519", contract.allowedAlgorithms);
check("contract:env", contract.requiredEnvironment?.length === 8 && new Set(contract.requiredEnvironment).size === 8, contract.requiredEnvironment);
check("contract:truth", /does not prove the competence/iu.test(contract.truthBoundary) && /does not.*enable sale/iu.test(contract.truthBoundary), contract.truthBoundary);
check("manifest:revision", manifest.revisionId === revision, manifest.revisionId);
check("manifest:no_self", !(manifest.files ?? []).some((row) => row.path === "config/pass35/a55-source-manifest.json"), null);
check("current:active", current.sourceRevisionId === revision && current.activeAcceptanceRevisionId === revision && current.previousAcceptanceRevisionId === a54.revisionId && current.saleEnabled === false && current.liveProven === false, current);
check("integrity:visual", digestRows(a46.integrity.visualFiles) === a54.integrity.visualDigest && a54.integrity.visualFiles === 338, a54.integrity);
check("integrity:assets", digestRows(a46.integrity.publicAssets) === a54.integrity.publicAssetsDigest && a54.integrity.publicAssets === 225, a54.integrity);
check("integrity:engine", digestRows(a46.integrity.protectedEngineFiles) === a54.integrity.protectedEngineDigest && a54.integrity.protectedEngineFiles === 510, a54.integrity);
for (const row of [...a46.integrity.visualFiles, ...a46.integrity.publicAssets, ...a46.integrity.protectedEngineFiles]) {
  const absolute = path.join(root, row.path); check(`hash:${row.path}`, fs.existsSync(absolute) && sha(row.path) === row.currentSha256, row.path, "protected_integrity");
}
const expectedScripts = {
  "diagnose:runtime:a55": "node scripts/a55-runtime-diagnostics.mjs --write",
  "test:pass35:a55": "node scripts/pass35/test-a55-independent-retest-legal-customer-release-acceptance.mjs",
  "test:pass35:a55:fixture": "node scripts/pass35/test-a55-independent-retest-legal-customer-release-fixture.mjs",
  "intake:independent-retest:a55": "node scripts/a55-independent-retest-legal-customer-release-acceptance.mjs",
  "package:evidence:a55": "node scripts/a55-package-evidence.mjs",
  "verify:source:a55": "node scripts/pass35/verify-a55-source-manifest.mjs"
};
for (const [name, value] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === value, pkg.scripts?.[name]);
check("package:revision", pkg.velmereIndependentRetestLegalCustomerReleasePass === revision, pkg.velmereIndependentRetestLegalCustomerReleasePass);
const source = fs.readFileSync(path.join(root, "scripts/a55-independent-retest-legal-customer-release-acceptance.mjs"), "utf8");
for (const token of [
  "extractZipSafely", "crypto.verify(null", "trust_roots_external_anchor_mismatch", "reviewer_organizations_not_distinct",
  "owner_not_subject_affiliated", "owner_chair_same_organization", "open_critical_or_high", "scope_not_exact",
  "release_report_digest_map_invalid", "APPROVE_CONTROLLED_CANARY_PREPARATION", "VERIFIED_STAGING_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE",
  "productionApproved: false", "liveProven: false", "saleEnabled: false"
]) check(`source:${token}`, source.includes(token), token);
for (const forbidden of ["saleEnabled: true", "liveProven: true", "productionApproved: true", "EXTERNAL_REFERENCE_REPORTED_VERIFIED"]) check(`source:forbid:${forbidden}`, !source.includes(forbidden), forbidden);
const failures = checks.filter((row) => !row.ok);
const behavioral = checks.filter((row) => row.category === "behavioral");
const protectedIntegrity = checks.filter((row) => row.category === "protected_integrity");
const report = { schemaVersion: "velmere.pass35.a55.contract-test.v1", revisionId: revision, generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, categories: { behavioral: { checks: behavioral.length, passed: behavioral.filter((r)=>r.ok).length, failed: behavioral.filter((r)=>!r.ok).length }, protectedIntegrity: { checks: protectedIntegrity.length, passed: protectedIntegrity.filter((r)=>r.ok).length, failed: protectedIntegrity.filter((r)=>!r.ok).length } }, checks };
fs.mkdirSync(path.join(root, "artifacts/pass35/a55"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a55/PASS35_A55_CONTRACT_TEST.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report.summary, categories: report.categories }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 100), null, 2)); process.exit(1); }
