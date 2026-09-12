#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanTextForHighPrecisionSecrets } from "../pass4992/supply-chain-release.mjs";

export const SECRET_FIXTURE_SCHEMA = "velmere.r11.secret-fixture-boundary.v1";

const EXPECTED_FIXTURES = new Map([
  ["scripts/security/scan-all-secrets.mjs:stripe-live-secret", new Set(["71a68559119629d989386448adad9d5920e7e8e83fb7f55282d9ef9fcc7051cf"])],
  ["tests/unit/ai-vlm-security.test.ts:stripe-live-secret", new Set(["71a68559119629d989386448adad9d5920e7e8e83fb7f55282d9ef9fcc7051cf"])],
  ["tests/unit/security-api-error-envelope.test.ts:stripe-live-secret", new Set(["71a68559119629d989386448adad9d5920e7e8e83fb7f55282d9ef9fcc7051cf"])],
]);

const EXCLUDED_DIRS = new Set([".git", ".next", "node_modules", "artifacts", "coverage", "dist", "out", "playwright-report", "test-results"]);

function normalize(value) {
  return value.replaceAll(path.sep, "/");
}

export function verifyExpectedFixtureFingerprints(root) {
  const blockers = [];
  const observed = [];
  for (const [key, expectedFingerprints] of EXPECTED_FIXTURES.entries()) {
    const splitAt = key.lastIndexOf(":");
    const relative = key.slice(0, splitAt);
    const ruleId = key.slice(splitAt + 1);
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      blockers.push(`fixture_missing:${relative}`);
      continue;
    }
    const text = fs.readFileSync(absolute, "utf8");
    const matches = scanTextForHighPrecisionSecrets(text, relative).filter((finding) => finding.ruleId === ruleId);
    const observedFingerprints = new Set(matches.map((finding) => finding.fingerprint));
    observed.push({ path: relative, ruleId, count: matches.length, fingerprints: [...observedFingerprints].sort() });
    if (matches.length !== expectedFingerprints.size) {
      blockers.push(`fixture_match_count_changed:${relative}:${ruleId}:${matches.length}/${expectedFingerprints.size}`);
    }
    for (const fingerprint of observedFingerprints) {
      if (!expectedFingerprints.has(fingerprint)) blockers.push(`fixture_fingerprint_unapproved:${relative}:${ruleId}:${fingerprint}`);
    }
    for (const fingerprint of expectedFingerprints) {
      if (!observedFingerprints.has(fingerprint)) blockers.push(`fixture_fingerprint_missing:${relative}:${ruleId}:${fingerprint}`);
    }
  }
  return { blockers: [...new Set(blockers)].sort(), observed };
}

function walkEnvFiles(root, relative = "") {
  const absolute = path.join(root, relative);
  const rows = [];
  for (const child of fs.readdirSync(absolute, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    if (child.isDirectory() && EXCLUDED_DIRS.has(child.name)) continue;
    const childRelative = relative ? path.join(relative, child.name) : child.name;
    if (child.isDirectory()) {
      rows.push(...walkEnvFiles(root, childRelative));
      continue;
    }
    if (!child.isFile()) continue;
    if (/^\.env(?:\..+)?$/u.test(child.name)) rows.push(normalize(childRelative));
  }
  return rows;
}

export function scanEnvFiles(root) {
  const envFiles = walkEnvFiles(root);
  const findings = [];
  for (const relative of envFiles) {
    const absolute = path.join(root, relative);
    const text = fs.readFileSync(absolute, "utf8");
    findings.push(...scanTextForHighPrecisionSecrets(text, relative));
  }
  return { envFiles, findings };
}

export function verifySecretFixtureBoundary(root = process.cwd()) {
  const fixture = verifyExpectedFixtureFingerprints(root);
  const env = scanEnvFiles(root);
  const blockers = [...fixture.blockers];
  for (const finding of env.findings) {
    blockers.push(`env_secret_match:${finding.path}:${finding.line}:${finding.ruleId}:${finding.fingerprint}`);
  }
  return {
    schemaVersion: SECRET_FIXTURE_SCHEMA,
    sourceSha: process.env.GITHUB_SHA || null,
    fixturePolicy: "EXACT_PATH_RULE_AND_SECRET_FINGERPRINT",
    envCoverage: "ALL_DOT_ENV_BASENAMES_REGARDLESS_OF_EXTENSION",
    expectedFixtureCount: EXPECTED_FIXTURES.size,
    observedFixtures: fixture.observed,
    envFilesScanned: env.envFiles,
    envFindingCount: env.findings.length,
    blockers: [...new Set(blockers)].sort(),
    passed: blockers.length === 0,
    truthBoundary: "Synthetic secret fixtures are ignored only when the exact expected fingerprint is present. Any additional/different matching secret in a fixture file blocks. Every .env and .env.* file present in the working tree is scanned regardless of path.extname behavior.",
  };
}

function main() {
  const result = verifySecretFixtureBoundary();
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
    const output = path.resolve(process.argv[outputIndex + 1]);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
