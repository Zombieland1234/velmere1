#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { scanSourceForHighPrecisionSecrets } from "../pass4992/supply-chain-release.mjs";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "velmere-r11-f10-"));
const fixturePath = "synthetic/pass4992-secret-fingerprint.txt";
const envPath = ".env";
const envLocalPath = ".env.local";

try {
  await fs.mkdir(path.join(tmp, "synthetic"), { recursive: true });
  const allowed = ["sk", "_live_", "51H2xK2eZvKYlo2CcF7xNgABC123"].join("");
  const different = ["sk", "_live_", "ZZZZZZZZZZZZZZZZZZZZZZZZ"].join("");
  await fs.writeFile(path.join(tmp, fixturePath), `${allowed}\n${different}\n`, "utf8");
  await fs.writeFile(path.join(tmp, envPath), `STRIPE_SECRET=${different}\n`, "utf8");
  await fs.writeFile(path.join(tmp, envLocalPath), `STRIPE_SECRET=${different}\n`, "utf8");

  const manifest = { entries: [
    { type: "file", path: fixturePath },
    { type: "file", path: envPath },
    { type: "file", path: envLocalPath },
  ] };
  const scan = await scanSourceForHighPrecisionSecrets(tmp, manifest);
  assert.equal(scan.fixturePolicy, "EXACT_PATH_RULE_FINGERPRINT_SINGLE_OCCURRENCE");
  assert.equal(scan.ignoredFixtureFindingCount, 1);
  assert.equal(scan.findingCount, 3);
  assert.equal(scan.findings.filter((item) => item.path === fixturePath).length, 1);
  assert.equal(scan.findings.some((item) => item.path === envPath && item.ruleId === "stripe-live-secret"), true);
  assert.equal(scan.findings.some((item) => item.path === envLocalPath && item.ruleId === "stripe-live-secret"), true);
  const receipt = {
    schemaVersion: "velmere.r11.secret-fixture-boundary.v1",
    status: "PASS",
    fixturePolicy: scan.fixturePolicy,
    ignoredFixtureFindingCount: scan.ignoredFixtureFindingCount,
    nonIgnoredFindingCount: scan.findingCount,
    envCoverage: [envPath, envLocalPath],
    exactFingerprintException: true,
    truthBoundary: "One exact path+rule+fingerprint fixture occurrence is ignored; mutated fixture values and .env/.env.local values remain findings.",
  };
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(receipt, null, 2) + "\n", "utf8");
  }
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}
