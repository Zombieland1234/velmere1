#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expectedLockRows, validateA78Policy } from "./a78-exact-runtime-bootstrap-lib.mjs";

const root = process.cwd();
const migrationPath = "config/pass36/a102r41-a78-lockfile-denominator-migration.json";
const frozenManifestPath = "config/pass36/a102r41-parent-source-package-manifest.json";
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const frozenManifestBytes = fs.readFileSync(frozenManifestPath);
const frozenManifest = JSON.parse(frozenManifestBytes);
const a62 = JSON.parse(fs.readFileSync("config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json", "utf8"));
const a78 = JSON.parse(fs.readFileSync("config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json", "utf8"));
const lockBytes = fs.readFileSync("package-lock.json");
const lock = JSON.parse(lockBytes);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const checks = [];
const check = (id, value, detail = null) => {
  checks.push({ id, passed: Boolean(value), detail });
  assert.ok(value, id);
};
const testPath = (value) => /(^|\/)(?:test-|verify-)|\.(?:test|spec)\./u.test(value);
const baselineTests = frozenManifest.entries.map((row) => row.path).filter(testPath).sort();
const baselineEntry = (relative) => frozenManifest.entries.find((row) => row.path === relative);

check("migration-classification", migration.classification === "FORMAL_STALE_POLICY_DENOMINATOR_CORRECTION_NO_SCORE_CREDIT");
check("lock-input-unchanged", sha256(lockBytes) === migration.packageLock.inputA102R40Sha256 && migration.packageLock.sourceBytesChangedByMigration === false);
check("lock-current-hash", sha256(lockBytes) === migration.packageLock.currentSha256 && a62.packageLock.sha256 === sha256(lockBytes) && a78.packageLock.sha256 === sha256(lockBytes));
check("lock-denominator-exact", expectedLockRows(lock).length === 654 && a62.packageLock.expectedRemotePackages === 654 && a78.packageLock.expectedRemotePackages === 654);
check("migration-old-new-explicit", migration.packageLock.staleDeclaredDenominator === 827 && migration.packageLock.correctedDenominator === 654 && migration.packageLock.delta === -173);
check("migration-no-score-credit", migration.packageLock.scoreBefore === null && migration.packageLock.scoreAfter === null && migration.packageLock.scoreImprovementClaimed === false);
check("frozen-manifest-file-hash", sha256(frozenManifestBytes) === migration.frozenInputEvidence.manifestFileSha256);
check("frozen-manifest-self-hash", frozenManifest.manifestSha256 === migration.frozenInputEvidence.manifestSelfSha256);
for (const [id, relative, expectedBytes, expectedSha] of [
  ["frozen-a62-policy", "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json", migration.frozenInputEvidence.a62PolicyBytes, migration.frozenInputEvidence.a62PolicySha256],
  ["frozen-a78-policy", "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json", migration.frozenInputEvidence.a78PolicyBytes, migration.frozenInputEvidence.a78PolicySha256],
  ["frozen-a78-test", "scripts/pass36/test-a78-exact-runtime-lockfile-browser-bootstrap.mjs", migration.frozenInputEvidence.a78TestBytes, migration.frozenInputEvidence.a78TestSha256],
]) {
  const entry = baselineEntry(relative);
  check(id, entry?.byteLength === expectedBytes && entry?.sha256 === expectedSha, entry ?? null);
}
check("baseline-test-path-count", baselineTests.length === migration.testInventory.frozenInputTestPaths, baselineTests.length);
check("baseline-test-path-set", sha256(baselineTests.join("\n")) === migration.testInventory.frozenInputTestPathSetSha256);
const missingFrozenTests = baselineTests.filter((relative) => !fs.existsSync(path.join(root, relative)));
check("all-frozen-test-paths-retained", missingFrozenTests.length === 0, missingFrozenTests);

const currentTests = [];
const excluded = new Set(["node_modules", ".next", ".turbo", ".velmere", "artifacts", "coverage"]);
function walk(directory, relative = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!excluded.has(entry.name) && !entry.name.startsWith(".next-")) walk(path.join(directory, entry.name), next);
    } else if (entry.isFile() && testPath(next)) currentTests.push(next);
  }
}
walk(root);
currentTests.sort();
check("current-test-path-minimum", currentTests.length >= migration.testInventory.minimumCurrentTestPaths, currentTests.length);
for (const relative of [
  "scripts/pass36/test-a102r41-entitlement-revocation-rls-remediation.mjs",
  "scripts/pass36/test-a102r41-real-evidence-physical-boundary.mjs",
  "scripts/pass36/test-a102r41-real-intake-self-assertion-denial.ts",
  "scripts/pass36/test-a102r41-sanitized-child-process-boundary.mjs",
]) check(`new-test:${relative}`, currentTests.includes(relative));

check("a78-policy-valid", validateA78Policy(a78, lockBytes, { root }).passed);
const collapsed = structuredClone(a78);
collapsed.packageLock.expectedRemotePackages = 653;
check("lock-denominator-collapse-rejected", !validateA78Policy(collapsed, lockBytes, { root }).passed);
const wrongHash = structuredClone(a78);
wrongHash.packageLock.sha256 = "0".repeat(64);
check("lock-hash-drift-rejected", !validateA78Policy(wrongHash, lockBytes, { root }).passed);
const wrongBrowser = structuredClone(a78);
wrongBrowser.browserBundle.browserRevision = "1222";
check("browser-revision-drift-rejected", !validateA78Policy(wrongBrowser, lockBytes, { root }).passed);
check("truth-flags", migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.a78-lockfile-denominator-migration-verification.v1",
  status: "PASS_A102R41_A78_FORMAL_DENOMINATOR_MIGRATION_NO_PROMOTION",
  checks: checks.length,
  passed: checks.length,
  failed: 0,
  oldDenominator: 827,
  newDenominator: 654,
  frozenTestPaths: baselineTests.length,
  currentTestPaths: currentTests.length,
  removedTestPaths: missingFrozenTests.length,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
}, null, 2));
