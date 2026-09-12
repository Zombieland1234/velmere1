#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanEnvFiles, verifyExpectedFixtureFingerprints, verifySecretFixtureBoundary } from "./verify-secret-fixture-boundary.mjs";

const exactSynthetic = ["sk", "_live_", "51H2xK2eZvKYlo2CcF7xNgABC123"].join("");
const alteredSynthetic = ["sk", "_live_", "51H2xK2eZvKYlo2CcF7xNgDIFFERENT999"].join("");
const fixturePaths = [
  "scripts/security/scan-all-secrets.mjs",
  "tests/unit/ai-vlm-security.test.ts",
  "tests/unit/security-api-error-envelope.test.ts",
];

const live = verifySecretFixtureBoundary(process.cwd());
assert.equal(live.passed, true, JSON.stringify(live.blockers));
assert.equal(live.expectedFixtureCount, 3);
assert.equal(live.envFindingCount, 0);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-secret-fixture-"));
for (const relative of fixturePaths) {
  const absolute = path.join(fixtureRoot, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `fixture=${exactSynthetic}\n`);
}
const exact = verifyExpectedFixtureFingerprints(fixtureRoot);
assert.deepEqual(exact.blockers, []);

fs.writeFileSync(path.join(fixtureRoot, fixturePaths[1]), `fixture=${alteredSynthetic}\n`);
const altered = verifyExpectedFixtureFingerprints(fixtureRoot);
assert.equal(altered.blockers.some((value) => value.includes("fixture_fingerprint_unapproved")), true);
assert.equal(altered.blockers.some((value) => value.includes("fixture_fingerprint_missing")), true);

const envRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-env-scan-"));
fs.writeFileSync(path.join(envRoot, ".env.local"), `STRIPE_SECRET=${alteredSynthetic}\n`);
const env = scanEnvFiles(envRoot);
assert.deepEqual(env.envFiles, [".env.local"]);
assert.equal(env.findings.length, 1);
assert.equal(env.findings[0].ruleId, "stripe-live-secret");

console.log(JSON.stringify({
  schemaVersion: "velmere.r11.secret-fixture-boundary-canaries.v1",
  status: "PASS",
  checks: 8,
  mutationsRejected: ["fixture-secret-changed", ".env.local-secret-present"],
}, null, 2));
