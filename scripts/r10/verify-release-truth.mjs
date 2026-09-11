#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runReleaseTruthScan } from "./release-truth-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv.includes("--root")
  ? path.resolve(process.argv[process.argv.indexOf("--root") + 1])
  : path.resolve(HERE, "../..");

const findings = runReleaseTruthScan(ROOT);
const p0 = findings.filter((f) => f.severity === "P0");
const p1 = findings.filter((f) => f.severity === "P1");
const receipt = {
  schemaVersion: "velmere.r10.release-truth-receipt.v1",
  generatedAt: new Date().toISOString(),
  root: ROOT,
  status: p0.length === 0 ? "PASS_NO_P0_TRUTH_BLOCKERS" : "FAIL_P0_TRUTH_BLOCKERS",
  counts: { total: findings.length, p0: p0.length, p1: p1.length },
  findings,
};

if (process.argv.includes("--write")) {
  const outIndex = process.argv.indexOf("--output");
  const output = outIndex >= 0
    ? path.resolve(process.argv[outIndex + 1])
    : path.join(ROOT, "artifacts", "r10", "R10_RELEASE_TRUTH_RECEIPT.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", "utf8");
  console.log(`R10 release truth receipt: ${output}`);
}

console.log(JSON.stringify(receipt, null, 2));
if (p0.length > 0) process.exit(1);
