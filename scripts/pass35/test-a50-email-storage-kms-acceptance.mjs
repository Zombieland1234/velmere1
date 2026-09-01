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
const digestRows = (rows) => {
  const hash = crypto.createHash("sha256");
  for (const row of [...rows].sort((a, b) => a.path.localeCompare(b.path))) { hash.update(row.path); hash.update("\0"); hash.update(row.currentSha256); hash.update("\0"); }
  return hash.digest("hex");
};

const revision = "VELMERE_PASS35_A50_TRANSACTIONAL_EMAIL_PRIVATE_STORAGE_KMS_ACCEPTANCE";
const required = [
  "config/pass35/a50-transactional-email-private-storage-kms-acceptance.json",
  "config/pass35/a50-source-manifest.json",
  "scripts/a50-email-storage-kms-acceptance.mjs",
  "scripts/a50-package-evidence.mjs",
  "scripts/a50-runtime-diagnostics.mjs",
  "scripts/pass35/test-a50-email-storage-kms-acceptance.mjs",
  "scripts/pass35/test-a50-email-storage-kms-fixture.mjs",
  "scripts/pass35/verify-a50-source-manifest.mjs",
  "VELMERE_RUN_A50_EMAIL_STORAGE_KMS_ACCEPTANCE.cmd",
  "VELMERE_A50_PATCH.txt"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const contract = readJson("config/pass35/a50-transactional-email-private-storage-kms-acceptance.json");
const a49 = readJson("config/pass35/a49-stripe-test-payment-acceptance.json");
const a46 = readJson("config/pass35/a46-customer-data-plane-acceptance.json");
const pkg = readJson("package.json");
check("contract:revision", contract.revisionId === revision, contract.revisionId);
check("contract:parent", contract.parentRevisionId === a49.revisionId, contract.parentRevisionId);
check("contract:a49_decision", contract.requiredA49Decision === "VERIFIED_STAGING_PAYMENT_REFUND_RECONCILIATION", contract.requiredA49Decision);
check("contract:runtime", contract.runtime?.node === "24.18.0" && contract.runtime?.npm === "11.16.0", contract.runtime);
check("contract:env", contract.requiredEnvironment?.length === 17 && new Set(contract.requiredEnvironment).size === 17, contract.requiredEnvironment);
check("contract:checks", contract.requiredChecks?.length === 28 && new Set(contract.requiredChecks).size === 28, contract.requiredChecks);
check("contract:private", contract.storageSafety?.bucketMustBePrivate === true && contract.storageSafety?.encryptionAlgorithm === "aes-256-gcm", contract.storageSafety);
check("contract:email", contract.emailSafety?.apiBase === "https://api.resend.com" && contract.emailSafety?.apiKeyPrefix === "re_" && contract.emailSafety?.requiredFinalEvent === "delivered", contract.emailSafety);
check("contract:truth", /does not prove production key custody/iu.test(contract.truthBoundary) && /sale readiness/iu.test(contract.truthBoundary), contract.truthBoundary);
check("integrity:a49_contract", contract.integrity.a49ContractSha256 === sha("config/pass35/a49-stripe-test-payment-acceptance.json"), contract.integrity.a49ContractSha256);
check("integrity:visual", contract.integrity.visualFiles === 338 && contract.integrity.visualDigest === digestRows(a46.integrity.visualFiles), contract.integrity);
check("integrity:assets", contract.integrity.publicAssets === 225 && contract.integrity.publicAssetsDigest === digestRows(a46.integrity.publicAssets), contract.integrity);
check("integrity:engine", contract.integrity.protectedEngineFiles === 510 && contract.integrity.protectedEngineDigest === digestRows(a46.integrity.protectedEngineFiles), contract.integrity);
for (const row of [...a46.integrity.visualFiles, ...a46.integrity.publicAssets, ...a46.integrity.protectedEngineFiles]) {
  const absolute = path.join(root, row.path);
  check(`hash:${row.path}`, fs.existsSync(absolute) && sha(row.path) === row.currentSha256, row.path);
}
const expectedScripts = {
  "diagnose:runtime:a50": "node scripts/a50-runtime-diagnostics.mjs --write",
  "test:pass35:a50": "node scripts/pass35/test-a50-email-storage-kms-acceptance.mjs",
  "test:pass35:a50:fixture": "node scripts/pass35/test-a50-email-storage-kms-fixture.mjs",
  "staging:email-storage-kms:a50": "node scripts/a50-email-storage-kms-acceptance.mjs",
  "package:evidence:a50": "node scripts/a50-package-evidence.mjs",
  "verify:source:a50": "node scripts/pass35/verify-a50-source-manifest.mjs"
};
for (const [name, value] of Object.entries(expectedScripts)) check(`package:${name}`, pkg.scripts?.[name] === value, pkg.scripts?.[name]);
check("package:revision", pkg.velmereEmailStorageKmsAcceptancePass === revision, pkg.velmereEmailStorageKmsAcceptancePass);
const source = fs.readFileSync(path.join(root, "scripts/a50-email-storage-kms-acceptance.mjs"), "utf8");
for (const token of [
  "VERIFIED_STAGING_EMAIL_STORAGE_KMS",
  "storage-cross-tenant-denied",
  "storage-signed-url-expired",
  "storage-raw-object-not-plaintext",
  "kms-wrap-succeeded",
  "kms-unwrap-succeeded",
  "email-retrieve-delivered",
  "productionEmailProven: false",
  "productionStorageProven: false",
  "productionKmsProven: false",
  "saleEnabled: false",
  "aes-256-gcm"
]) check(`source:${token}`, source.includes(token), token);
for (const forbidden of ["console.log(serviceKey", "console.log(kmsSecret", "console.log(resendKey", "rawEmail:", "rawObjectPath:"]) check(`forbidden:${forbidden}`, !source.includes(forbidden), forbidden);
const fixture = spawnSync(process.execPath, ["scripts/pass35/test-a50-email-storage-kms-fixture.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
check("fixture:passes", fixture.status === 0, { status: fixture.status, stdout: fixture.stdout?.trim(), stderr: fixture.stderr?.trim() });
const failures = checks.filter((row) => !row.ok);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 100), null, 2)); process.exit(1); }
