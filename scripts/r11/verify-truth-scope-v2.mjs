#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  "scripts/r11/test-truth-scope-v2.mjs",
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

function findingContext(text, match) {
  if (!match) return "";
  const index = text.indexOf(match);
  if (index < 0) return "";
  const lineStart = text.lastIndexOf("\n", index) + 1;
  const lineEndRaw = text.indexOf("\n", index + match.length);
  const lineEnd = lineEndRaw < 0 ? text.length : lineEndRaw;
  return text.slice(Math.max(lineStart, index - 180), Math.min(lineEnd, index + match.length + 180)).trim();
}

function isSafeNegatedClaim(finding, context) {
  const c = context.replace(/\s+/g, " ");
  if (!c) return false;

  if (finding.id === "CLAIM_PRODUCTION_READY") {
    return (
      /(?:not|never|without|cannot|can't|must\s+not|do\s+not|does\s+not|is\s+not|isn't|aren't|avoid(?:s|ed|ing)?|fake|before|until)\b.{0,120}\bproduction[- ]ready\b/i.test(c) ||
      /\bproduction[- ]ready\b.{0,120}(?:claim|status|label|proof).{0,80}(?:not|without|before|until|fake|avoid)/i.test(c) ||
      /(?:\bnie\b|\bbez\b|\bbrak\b|\bfałszyw|\bnie\s+jest\b).{0,120}\bproduction[- ]ready\b/i.test(c) ||
      /(?:\bkein(?:e|en|er|es)?\b|\bnicht\b|\bohne\b).{0,120}\bproduction[- ]ready\b/i.test(c)
    );
  }

  if (finding.id === "CLAIM_CUSTOMER_RFC3161_CERTIFICATION") {
    return (
      /(?:no|not|without|must\s+not|do\s+not|cannot|lacks?|absent)\b.{0,140}\b(?:RFC\s*3161|TSA|TimeStampToken)\b/i.test(c) ||
      /(?:\bbez\b|\bbrak\b|\bnie\b).{0,140}\b(?:RFC\s*3161|TSA)\b/i.test(c) ||
      /(?:\bohne\b|\bkein(?:e|en|er|es)?\b|\bnicht\b).{0,140}\b(?:RFC\s*3161|TSA)\b/i.test(c)
    );
  }

  if (finding.id === "CLAIM_HUMAN_DEFAULT") {
    return /(?:not|without|no|must\s+not|nie|bez|brak|kein|ohne).{0,100}\b(?:human\s+audited|human\s+reviewed)\b/i.test(c);
  }

  if (finding.id === "CLAIM_FULLY_AUDITED") {
    return /(?:not|never|without|cannot|must\s+not|nie|bez|brak|kein|ohne).{0,100}\bfully\s+audited\b/i.test(c);
  }

  if (finding.id === "CLAIM_IMMUTABLE_CONTENT") {
    return /(?:not|never|without|cannot|must\s+not|nie|bez|brak|kein|ohne).{0,120}\b(?:verified\s*-\s*immutable|immutable)\b/i.test(c);
  }

  return false;
}

function classifyFindings(text, rawFindings) {
  const blockers = [];
  const safeNegations = [];
  for (const finding of rawFindings) {
    const context = findingContext(text, finding.match);
    if (isSafeNegatedClaim(finding, context)) {
      safeNegations.push({ ...finding, disposition: "SAFE_NEGATED_CONTEXT", context });
    } else {
      blockers.push({ ...finding, context });
    }
  }
  return { blockers, safeNegations };
}

export function runTruthScopeV2(root = ROOT) {
  const findings = [...verifyBuildTruth(root)];
  const safeNegatedFindings = [];
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
    const raw = scanTextForReleaseTruth(rel, text);
    const classified = classifyFindings(text, raw);
    findings.push(...classified.blockers);
    safeNegatedFindings.push(...classified.safeNegations);
  }

  const p0 = findings.filter((f) => f.severity === "P0").length;
  const p1 = findings.filter((f) => f.severity === "P1").length;
  return {
    schemaVersion: "velmere.r11.truth-scope.v3",
    sourceSha: process.env.GITHUB_SHA || null,
    scanRoots: SCAN_ROOTS,
    scannedFiles: scanned.length,
    skippedFixtureFiles: skippedFixtures.length,
    safeNegatedFindings,
    findings,
    p0,
    p1,
    passed: p0 === 0,
    truthBoundary:
      "Release truth scope includes lib plus customer/runtime surfaces. Fixture exclusion is segment/basename-based. Explicit negated customer-safe statements are recorded separately and never counted as positive claims. Positive claim wording remains blocking.",
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

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
