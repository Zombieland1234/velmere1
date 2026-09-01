#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ensureSafeDirectoryInsideRoot, normalizeLoopbackBaseUrl, readBoundRegularFileInsideRoot, sha256, validateBrowserReceipt } from "./pass36/a79-exact-build-browser-lib.mjs";
import { parseStrictJsonCli } from "./pass36/strict-json-cli.mjs";

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a45-exact-runtime-browser-acceptance.json"), "utf8"));
const a60Policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"), "utf8"));
const receiptPath = path.join(root, "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json");
const failures = [];
if (!fs.existsSync(receiptPath)) failures.push({ id: "browser-receipt-present", detail: "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json" });
let receipt = null;
let browserReceiptSnapshot = null;
if (fs.existsSync(receiptPath)) {
  try {
    browserReceiptSnapshot = readBoundRegularFileInsideRoot(root, "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json", { maxBytes: 32 * 1024 * 1024, label: "browser_receipt" });
    receipt = parseStrictJsonCli(browserReceiptSnapshot.bytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
  }
  catch (error) { failures.push({ id: "browser-receipt-json", detail: error instanceof Error ? error.message : String(error) }); }
}
const expected = {
  baseUrl: normalizeLoopbackBaseUrl(String(process.env.VELMERE_A45_BASE_URL ?? "")),
  sourceManifestSha256: String(process.env.VELMERE_A79_SOURCE_MANIFEST_SHA256 ?? "").trim().toLowerCase(),
  runtimeInstanceSha256: String(process.env.VELMERE_A79_RUNTIME_INSTANCE_SHA256 ?? "").trim().toLowerCase(),
  browserExecutableSha256: String(process.env.VELMERE_A79_BROWSER_EXECUTABLE_SHA256 ?? "").trim().toLowerCase(),
  buildId: String(process.env.VELMERE_A79_BUILD_ID ?? "").trim(),
  requireHttpErrors: true,
  qaFixtureRequired: true,
  qaFixtureRelativePath: a60Policy.browser.qaFixture.relativePath,
  qaFixtureGeneratorId: a60Policy.browser.qaFixture.generatorId,
  qaFixtureRequestCounterKeys: a60Policy.browser.qaFixture.requestCounterKeys,
  qaFixtureRequiredPositiveRequestFamilies: a60Policy.browser.qaFixture.requiredPositiveRequestFamilies,
  qaFixtureRequiredZeroRequestFamilies: a60Policy.browser.qaFixture.requiredZeroRequestFamilies,
};
for (const [key, value] of Object.entries(expected)) {
  if (!value) failures.push({ id: `expected-binding:${key}`, detail: value });
}
let validation = null;
if (receipt && failures.length === 0) {
  validation = validateBrowserReceipt({ root, receipt, contract, expected });
  failures.push(...validation.failures);
  const checkIdentitySha256 = sha256(validation.checks.map((row) => row.id).join("\n"));
  if (validation.checks.length !== a60Policy.evidencePackage.browserVerifierChecksRequired) failures.push({ id: "browser-verifier-denominator-exact", detail: { observed: validation.checks.length, expected: a60Policy.evidencePackage.browserVerifierChecksRequired } });
  if (checkIdentitySha256 !== a60Policy.evidencePackage.browserVerifierCheckIdentitySha256) failures.push({ id: "browser-verifier-identity-exact", detail: { observed: checkIdentitySha256, expected: a60Policy.evidencePackage.browserVerifierCheckIdentitySha256 } });
}
const result = {
  schemaVersion: "velmere.pass36.a60.browser-evidence-verification.v2",
  revisionId: "VELMERE_PASS36_A60R0_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE",
  hardeningRevisionId: "VELMERE_PASS36_A79R0_EXACT_FINAL_BYTE_BUILD_RUNTIME_AND_BROWSER_EVIDENCE_BINDING_HARDENING",
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 && validation?.checks?.length === a60Policy.evidencePackage.browserVerifierChecksRequired ? "PASS_BROWSER_EVIDENCE_EXACTLY_BOUND" : "FAIL_BROWSER_EVIDENCE",
  expected,
  browserReceiptBinding: browserReceiptSnapshot ? { relativePath: browserReceiptSnapshot.path, byteLength: browserReceiptSnapshot.byteLength, sha256: browserReceiptSnapshot.sha256 } : null,
  checks: validation?.checks?.length ?? 0,
  passed: validation?.checks?.filter((row) => row.passed).length ?? 0,
  checkIdentitySha256: validation ? sha256(validation.checks.map((row) => row.id).join("\n")) : null,
  failures,
  saleEnabled: false,
  liveProven: false,
};
const output = path.join(root, "artifacts/pass36/a60/PASS36_A60_BROWSER_EVIDENCE_VERIFICATION.json");
ensureSafeDirectoryInsideRoot(root, "artifacts/pass36/a60", { label: "a60_browser_verifier_output" });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
