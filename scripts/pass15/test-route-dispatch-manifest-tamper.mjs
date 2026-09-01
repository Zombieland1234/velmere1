#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-route-dispatch-tamper-"));
let assertions = 0;

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

try {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "config/pass15/route-dispatch-manifest.json"), "utf8"),
  );
  const target = manifest.internalWorkers.routes.find(
    (route) => route.publicPath === "/api/internal/workers/auth-security-alerts",
  );
  assert.ok(target, "tamper target must remain in the full route denominator");
  assertions += 1;
  target.handlerBytes += 1;

  const tamperedManifestPath = path.join(temporaryRoot, "route-dispatch-manifest.tampered.json");
  const receiptPath = path.join(temporaryRoot, "route-dispatch-verification.json");
  fs.writeFileSync(tamperedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const run = spawnSync(
    process.execPath,
    [
      "scripts/pass15/verify-route-dispatch-consolidation.mjs",
      "--manifest",
      tamperedManifestPath,
      "--output",
      receiptPath,
    ],
    { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  equal(run.status, 1, "a one-byte manifest tamper must fail the verifier");

  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  equal(receipt.summary.routesPreserved, 160, "tamper test must retain the full 160-route denominator");
  equal(receipt.summary.failed, 1, "isolated byte tamper must produce exactly one failed check");
  equal(
    receipt.failures[0]?.name,
    "/api/internal/workers/auth-security-alerts:handler_bytes",
    "the verifier must identify the exact tampered handler byte contract",
  );
  equal(receipt.failures[0]?.detail?.expected, target.handlerBytes, "receipt must preserve the tampered expected byte count");
  equal(receipt.failures[0]?.detail?.actual, target.handlerBytes - 1, "receipt must report the physical handler byte count");

  console.log(JSON.stringify({
    suite: "PASS15_ROUTE_DISPATCH_MANIFEST_TAMPER",
    status: "PASS",
    assertions,
    routeDenominator: receipt.summary.routesPreserved,
    tamper: "handlerBytes + 1",
    detectedFailure: receipt.failures[0]?.name,
  }, null, 2));
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
