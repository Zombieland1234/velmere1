#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import {
  A79_REVISION,
  buildA60ChildEnvironment,
  expectedBrowserRows,
  expectedScreenshotPaths,
  isExpectedNextRscAbort,
  normalizeLoopbackBaseUrl,
  sha256,
  validateA79Environment,
  validateBrowserReceipt,
} from "./a79-exact-build-browser-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync("config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json", "utf8"));
const contract = JSON.parse(fs.readFileSync("config/pass35/a45-exact-runtime-browser-acceptance.json", "utf8"));
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const expectThrow = (id, fn, marker) => {
  try { fn(); check(id, false, "did_not_throw"); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); check(id, message.includes(marker), message); }
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBytes.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return out;
}
function png(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + width * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

check("policy-revision", policy.revisionId === A79_REVISION, policy.revisionId);
check("policy-parent", policy.parentRevisionId === "VELMERE_PASS36_A78R0_EXACT_RUNTIME_LOCKFILE_DEPENDENCY_BROWSER_BOOTSTRAP_HARDENING", policy.parentRevisionId);
check("policy-denominators", policy.requiredBrowserRows === 56 && policy.requiredScreenshots === 29 && policy.requiredPopupTabs === 4, policy);
check("policy-no-live-sale", policy.promotionConditions.saleEnabled === false && policy.promotionConditions.liveProven === false);
check("loopback-valid", normalizeLoopbackBaseUrl("http://127.0.0.1:4176") === "http://127.0.0.1:4176");

check("next-rsc-abort-accepted", isExpectedNextRscAbort({
  url: "https://127.0.0.1:4176/pl?_rsc=abc",
  error: "net::ERR_ABORTED",
  method: "GET",
  resourceType: "fetch",
  isNavigationRequest: false,
}, "https://127.0.0.1:4176"));
check("next-rsc-navigation-not-ignored", !isExpectedNextRscAbort({
  url: "https://127.0.0.1:4176/pl?_rsc=abc",
  error: "net::ERR_ABORTED",
  method: "GET",
  resourceType: "document",
  isNavigationRequest: true,
}, "https://127.0.0.1:4176"));
check("next-rsc-cross-origin-not-ignored", !isExpectedNextRscAbort({
  url: "https://attacker.invalid/pl?_rsc=abc",
  error: "net::ERR_ABORTED",
  method: "GET",
  resourceType: "fetch",
  isNavigationRequest: false,
}, "https://127.0.0.1:4176"));
check("loopback-https-valid", normalizeLoopbackBaseUrl("https://127.0.0.1:4176") === "https://127.0.0.1:4176");
for (const [id, value, marker] of [
  ["loopback-external", "https://example.com:4176", "exact_loopback"],
  ["loopback-ftp", "ftp://127.0.0.1:4176", "http_or_https"],
  ["loopback-localhost", "http://localhost:4176", "exact_loopback"],
  ["loopback-credentials", "http://user:pass@127.0.0.1:4176", "credentials"],
  ["loopback-path", "http://127.0.0.1:4176/pl", "origin_only"],
  ["loopback-query", "http://127.0.0.1:4176/?a=1", "origin_only"],
  ["loopback-low-port", "http://127.0.0.1:80", "port_invalid"],
]) expectThrow(id, () => normalizeLoopbackBaseUrl(value), marker);

const expectedNpmScriptShell = process.platform === "win32" ? null : "/exact/shell/bash";
const validEnv = {
  VELMERE_A79_ISOLATED_ENVIRONMENT: "1",
  VELMERE_A79_RUNTIME_ROOT: "/exact/node",
  VELMERE_A79_NPM_CLI_PATH: "/exact/node/npm-cli.js",
  VELMERE_PLAYWRIGHT_EXECUTABLE_PATH: "/exact/browser/chrome",
  PATH: "/exact/node/bin",
  ...(expectedNpmScriptShell ? { npm_config_script_shell: expectedNpmScriptShell } : {}),
};
const environmentOptions = { runtimeRoot: "/exact/node", npmCliPath: "/exact/node/npm-cli.js", browserExecutable: "/exact/browser/chrome", npmScriptShell: expectedNpmScriptShell };
const caseVariantEnv = { ...validEnv, Path: validEnv.PATH }; delete caseVariantEnv.PATH;
check("environment-valid", validateA79Environment(validEnv, environmentOptions).passed && (process.platform !== "win32" || validateA79Environment(caseVariantEnv, environmentOptions).passed));
check("environment-secret-rejected", !validateA79Environment({ ...validEnv, API_KEY: "unrecognized-secret-name" }, environmentOptions).passed && !validateA79Environment({ ...validEnv, Path: validEnv.PATH }, environmentOptions).passed);
check("environment-node-options-rejected", !validateA79Environment({ ...validEnv, NODE_OPTIONS: "--require=x" }, environmentOptions).passed && !validateA79Environment({ ...validEnv, PATH: "/unapproved/system/path" }, environmentOptions).passed && !validateA79Environment({ ...validEnv, npm_config_script_shell: "relative-shell" }, environmentOptions).passed);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a79-browser-"));
try {
  const expected = {
    baseUrl: "http://127.0.0.1:4176",
    sourceManifestSha256: "a".repeat(64),
    runtimeInstanceSha256: "b".repeat(64),
    browserExecutableSha256: "c".repeat(64),
    buildId: "build-a79-fixture",
  };
  const screenshotPaths = expectedScreenshotPaths(contract);
  for (const relative of screenshotPaths) {
    const absolute = path.join(fixtureRoot, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, png(relative.includes("mobile") ? 390 : 1440, relative.includes("popup") ? 1000 : 1200));
  }
  const expectedRows = expectedBrowserRows(contract);
  const routeById = new Map(contract.routes.map((row) => [row.id, row]));
  const rows = expectedRows.map((row) => {
    const route = routeById.get(row.route);
    const screenshotPath = row.locale === "pl" ? `artifacts/pass35/a45/screenshots/pl-${row.viewport}-${row.route}.png` : null;
    return {
      locale: row.locale,
      route: row.route,
      viewport: row.viewport,
      url: `${expected.baseUrl}/${row.locale}${route.suffix}`,
      finalUrl: `${expected.baseUrl}/${row.locale}${route.suffix}`,
      status: 200,
      consoleErrors: [], pageErrors: [], failedRequests: [], brokenImages: [],
      layout: { horizontalOverflowPx: 0 },
      screenshotPath,
      screenshotSha256: screenshotPath ? sha256(fs.readFileSync(path.join(fixtureRoot, screenshotPath))) : null,
      ok: true,
    };
  });
  const popupPath = "artifacts/pass35/a45/screenshots/pl-desktop-shield-popup-four-tabs.png";
  const receipt = {
    schemaVersion: "velmere.pass35.a45.browser-acceptance.v2",
    baseUrl: expected.baseUrl,
    bindings: {
      sourceManifestSha256: expected.sourceManifestSha256,
      runtimeInstanceSha256: expected.runtimeInstanceSha256,
      browserExecutableSha256: expected.browserExecutableSha256,
      buildId: expected.buildId,
    },
    summary: { checks: expectedRows.length + 1, passed: expectedRows.length + 1, failed: 0 },
    rows,
    popup: {
      ok: true, fitsViewport: true, consoleErrors: [], pageErrors: [],
      tabRows: contract.requiredPopupTabs.map((tabId) => ({ tabId, selected: "true", visible: true })),
      screenshotPath: popupPath,
      screenshotSha256: sha256(fs.readFileSync(path.join(fixtureRoot, popupPath))),
    },
  };
  const browserValidation = validateBrowserReceipt({ root: fixtureRoot, receipt, contract, expected });
  check("browser-valid", browserValidation.passed, browserValidation.failures);
  const duplicate = clone(receipt); duplicate.rows[1] = clone(duplicate.rows[0]);
  check("browser-duplicate-row-rejected", !validateBrowserReceipt({ root: fixtureRoot, receipt: duplicate, contract, expected }).passed);
  const redirect = clone(receipt); redirect.rows[0].finalUrl = "https://example.com/pl";
  check("browser-external-final-url-rejected", !validateBrowserReceipt({ root: fixtureRoot, receipt: redirect, contract, expected }).passed);
  const binding = clone(receipt); binding.bindings.sourceManifestSha256 = "d".repeat(64);
  check("browser-binding-rejected", !validateBrowserReceipt({ root: fixtureRoot, receipt: binding, contract, expected }).passed);
  const popupDigest = clone(receipt); popupDigest.popup.screenshotSha256 = null;
  check("browser-popup-digest-required", !validateBrowserReceipt({ root: fixtureRoot, receipt: popupDigest, contract, expected }).passed);
  const tamperPath = path.join(fixtureRoot, receipt.rows.find((row) => row.screenshotPath).screenshotPath);
  fs.appendFileSync(tamperPath, Buffer.from("tamper"));
  check("browser-screenshot-tamper-rejected", !validateBrowserReceipt({ root: fixtureRoot, receipt, contract, expected }).passed);
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

const source = validateCurrentSourceAuthorityExact(root);
check("source-current-authority-exact", source.passed === true && source.mismatches.length === 0, { revisionId: source.revisionId, passed: source.passed });
const runner = fs.readFileSync("scripts/a60-exact-final-byte-build-browser-acceptance.mjs", "utf8");
for (const marker of [
  "a79_external_base_url_override_forbidden", "VELMERE_A79_NPM_CLI_PATH", "VELMERE_A79_RUNTIME_ROOT",
  "reserveLoopbackPort", "spawned_server_exited", "shell: false", "--offline", "--ignore-scripts",
  "validateCurrentSourceAuthorityExact", "runtimeInstanceSha256", "browserExecutableSha256", "readBuildId",
]) check(`runner-marker:${marker}`, runner.includes(marker));
check("runner-no-system-npm-command", !runner.includes("const npmCommand") && !runner.includes('command = "npm"'));
check("runner-no-windows-shell", !runner.includes("shell: process.platform"));
const browserSource = fs.readFileSync("scripts/a45-browser-acceptance.mjs", "utf8");
for (const marker of ["normalizeLoopbackBaseUrl", "runtimeInstanceSha256", "browserExecutableSha256", "firstPartyFailures", "screenshotSha256", "browser-acceptance.v2"]) check(`browser-marker:${marker}`, browserSource.includes(marker));
const verifierSource = fs.readFileSync("scripts/a60-browser-evidence-verifier.mjs", "utf8");
check("verifier-central-validation", verifierSource.includes("validateBrowserReceipt"));

const before = fs.readFileSync(source.manifestPath);
const canonicalForcedReceiptPath = "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json";
const canonicalForcedReceiptBefore = fs.existsSync(canonicalForcedReceiptPath)
  ? sha256(fs.readFileSync(canonicalForcedReceiptPath))
  : null;
const forcedReceiptPath = `artifacts/pass36/a60-test/PASS36_A60_FORCED_PREFLIGHT_TEST-${crypto.randomBytes(8).toString("hex")}.json`;
const forced = spawnSync(process.execPath, ["scripts/a60-exact-final-byte-build-browser-acceptance.mjs"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
  env: {
    ...buildA60ChildEnvironment(process.env),
    VELMERE_A60_TEST_FORCE_RUNTIME_MISMATCH: "1",
    VELMERE_A60_TEST_RECEIPT_RELATIVE_PATH: forcedReceiptPath,
  },
  shell: false,
  windowsHide: true,
});
check("forced-preflight-exit", forced.status !== 0, forced.status);
const canonicalForcedReceiptAfter = fs.existsSync(canonicalForcedReceiptPath)
  ? sha256(fs.readFileSync(canonicalForcedReceiptPath))
  : null;
check("forced-receipt-present", fs.existsSync(forcedReceiptPath)
  && canonicalForcedReceiptAfter === canonicalForcedReceiptBefore);
let forcedReceipt = null;
try {
  forcedReceipt = parseStrictJsonCli(fs.readFileSync(forcedReceiptPath, "utf8"), {
    maxBytes: 16 * 1024 * 1024,
    maxDepth: 128,
    maxNodes: 1_000_000,
    requireObject: true,
  });
} catch (ignoredError) { void ignoredError; }
check("forced-decision", forcedReceipt?.decision === "BLOCKED_EXACT_PREFLIGHT", forcedReceipt?.decision);
const stableForcedSummary = forcedReceipt?.summary ? {
  requiredStages: forcedReceipt.summary.requiredStages,
  executedStages: forcedReceipt.summary.executedStages,
  passedStages: forcedReceipt.summary.passedStages,
  failedStages: forcedReceipt.summary.failedStages,
  mutationStarted: forcedReceipt.summary.mutationStarted,
  sourceUnchanged: forcedReceipt.summary.sourceUnchanged,
} : null;
check("forced-zero-mutation", forcedReceipt?.summary?.mutationStarted === false, stableForcedSummary);
check("forced-zero-stages", forcedReceipt?.summary?.executedStages === 0, stableForcedSummary);
check("forced-source-unchanged", forcedReceipt?.sourceUnchanged === true, forcedReceipt?.sourceUnchanged);
check("manifest-byte-unchanged", Buffer.compare(before, fs.readFileSync(source.manifestPath)) === 0);
try { fs.unlinkSync(forcedReceiptPath); } catch (ignoredError) { void ignoredError; }

const failures = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a79.exact-final-byte-build-browser-evidence-binding-test.v1",
  revisionId: A79_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failures.length === 0 ? "PASS_A79_LOCAL_ADMISSION_AND_ADVERSARIAL" : "FAIL_A79_LOCAL_ADMISSION",
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  exactBuildExecuted: false,
  exactBrowserExecuted: false,
  failures,
  checks,
  saleEnabled: false,
  liveProven: false,
  truthBoundary: policy.truthBoundary,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
