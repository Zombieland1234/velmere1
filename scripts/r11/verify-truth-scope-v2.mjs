#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { scanTextForReleaseTruth, verifyBuildTruth, walkTextFiles } from "../r10/release-truth-lib.mjs";

const ROOT = process.cwd();
const SCAN_ROOTS = [
  "dowody9",
  "dowody4",
  "docs/audit",
  "reports",
  "app",
  "components",
  "lib",
  "public",
  "scripts",
];

const EXACT_EXCLUSIONS = new Set([
  "scripts/r10/release-truth-lib.mjs",
  "scripts/r10/test-release-truth-gate.mjs",
  "scripts/r11/redteam-p0-regressions.mjs",
  "scripts/r11/verify-truth-scope-v2.mjs",
]);

function normalized(rel) {
  return rel.replaceAll(path.sep, "/");
}

export function isTruthFixturePath(rel) {
  const p = normalized(rel);
  if (EXACT_EXCLUSIONS.has(p)) return true;
  if (/(^|\/)(?:__tests__|tests?|fixtures?|specs?)(?:\/|$)/i.test(p)) return true;
  const base = path.posix.basename(p);
  if (/(?:^|[._-])(?:test|spec|fixture)(?:[._-]|$)/i.test(base)) return true;
  return false;
}

export function runTruthScopeV2(root = ROOT) {
  const findings = [...verifyBuildTruth(root)];
  const scanned = [];
  const skippedFixtures = [];

  for (const file of walkTextFiles(root, SCAN_ROOTS)) {
    const rel = normalized(path.relative(root, file));
    if (isTruthFixturePath(rel)) {
      skippedFixtures.push(rel);
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    scanned.push(rel);
    findings.push(...scanTextForReleaseTruth(rel, text));
  }

  return {
    schemaVersion: "velmere.r11.truth-scope.v2",
    sourceSha: process.env.GITHUB_SHA || null,
    scanRoots: SCAN_ROOTS,
    scannedFiles: scanned.length,
    skippedFixtureFiles: skippedFixtures.length,
    findings,
    p0: findings.filter((f) => f.severity === "P0").length,
    p1: findings.filter((f) => f.severity === "P1").length,
    passed: findings.every((f) => f.severity !== "P0"),
    truthBoundary:
      "Release truth scope includes lib plus customer/runtime surfaces. Fixture exclusion is segment/basename-based, so names such as LatestCard are not silently excluded. Tests/specs/fixtures remain excluded only as explicit test material.",
  };
}

function main() {
  const receipt = runTruthScopeV2();
  const output = process.argv.includes("--output")
    ? process.argv[process.argv.indexOf("--output") + 1]
    : "artifacts/r11/TRUTH_SCOPE_V2.json";
  fs.mkdirSync(path.dirname(path.join(ROOT, output)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, output), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.passed) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
