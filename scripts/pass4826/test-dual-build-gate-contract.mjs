import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BUILD_BINDING_SCHEMA,
  evaluateDualBuildGate,
  sealBuildBinding,
} from "./dual-build-gate-contract.mjs";
import { verifyExternalBuildEvidence } from "./build-evidence-file-verifier.mjs";

const SOURCE = "a".repeat(64);
function binding(engine) {
  return sealBuildBinding({
    schemaVersion: BUILD_BINDING_SCHEMA,
    engine,
    status: "PASS",
    buildSucceeded: true,
    buildReceiptBound: true,
    buildReceiptPath: `artifacts/${engine}-receipt.json`,
    buildReceiptSha256: "c".repeat(64),
    buildLogPath: `artifacts/${engine}.log`,
    buildLogSha256: "d".repeat(64),
    outputUnchanged: true,
    exactRuntime: true,
    sourceUnchanged: true,
    sourceTreeSha256: SOURCE,
    postRunSourceTreeSha256: SOURCE,
    output: { sha256: "b".repeat(64), fileCount: 10, byteLength: 100 },
    buildId: `vlm-${engine}`,
    attempt: { engine, exitCode: 0, buildIdMatches: true, buildId: `vlm-${engine}`, logPath: `artifacts/${engine}.log` },
  });
}
const verified = (engine) => ({ engine, ok: true, errors: [] });

test("both current source-bound build receipts and external evidence are required", () => {
  const result = evaluateDualBuildGate(
    SOURCE,
    { webpack: binding("webpack"), turbopack: binding("turbopack") },
    { webpack: verified("webpack"), turbopack: verified("turbopack") },
  );
  assert.equal(result.dualBuildGatePassed, true);
  assert.equal(result.blockers.length, 0);
});

test("missing second engine fails closed", () => {
  const result = evaluateDualBuildGate(SOURCE, { webpack: binding("webpack") }, { webpack: verified("webpack") });
  assert(result.blockers.includes("turbopack:receipt_missing_or_invalid"));
});

test("self-signed binding without dereferenced evidence fails closed", () => {
  const result = evaluateDualBuildGate(SOURCE, { webpack: binding("webpack"), turbopack: binding("turbopack") });
  assert(result.blockers.includes("webpack:external_evidence_not_verified"));
  assert(result.blockers.includes("turbopack:external_evidence_not_verified"));
});

test("false build claim remains a blocker after valid reseal", () => {
  const turbo = binding("turbopack");
  const core = { ...turbo, buildSucceeded: false };
  delete core.receiptSha256;
  const result = evaluateDualBuildGate(
    SOURCE,
    { webpack: binding("webpack"), turbopack: sealBuildBinding(core) },
    { webpack: verified("webpack"), turbopack: verified("turbopack") },
  );
  assert(result.blockers.includes("turbopack:build_not_succeeded"));
});

test("tampered and stale receipts are rejected", () => {
  const webpack = binding("webpack");
  webpack.output.fileCount += 1;
  const turboCore = { ...binding("turbopack"), sourceTreeSha256: "c".repeat(64) };
  delete turboCore.receiptSha256;
  const result = evaluateDualBuildGate(
    SOURCE,
    { webpack, turbopack: sealBuildBinding(turboCore) },
    { webpack: verified("webpack"), turbopack: verified("turbopack") },
  );
  assert(result.blockers.includes("webpack:receipt_checksum_mismatch"));
  assert(result.blockers.includes("turbopack:source_not_current"));
});

test("external verifier dereferences receipt and log bytes", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "vlm-pass1-dual-"));
  mkdirSync(path.join(root, "artifacts"), { recursive: true });
  const engine = "webpack";
  const buildId = "vlm-webpack";
  const logPath = "artifacts/webpack.log";
  const receiptPath = "artifacts/webpack-receipt.json";
  const log = Buffer.from("Compiled successfully\n");
  const receipt = Buffer.from(JSON.stringify({
    id: "pass4805-source-bound-production-build-v1",
    ok: true,
    releaseEligible: true,
    exactNode: true,
    sourceUnchanged: true,
    sourceFingerprint: SOURCE,
    postBuildSourceFingerprint: SOURCE,
    selectedEngine: engine,
    buildId,
    attempts: [{ engine, exitCode: 0, buildIdMatches: true, buildId, logPath }],
  }));
  writeFileSync(path.join(root, logPath), log);
  writeFileSync(path.join(root, receiptPath), receipt);
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const result = verifyExternalBuildEvidence({
    root,
    engine,
    currentSourceTreeSha256: SOURCE,
    binding: {
      buildReceiptPath: receiptPath,
      buildReceiptSha256: hash(receipt),
      buildLogPath: logPath,
      buildLogSha256: hash(log),
      buildId,
      attempt: { engine, exitCode: 0, buildIdMatches: true, buildId, logPath },
    },
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  writeFileSync(path.join(root, receiptPath), `${receipt.toString("utf8")} `);
  const tampered = verifyExternalBuildEvidence({
    root,
    engine,
    currentSourceTreeSha256: SOURCE,
    binding: {
      buildReceiptPath: receiptPath,
      buildReceiptSha256: hash(receipt),
      buildLogPath: logPath,
      buildLogSha256: hash(log),
      buildId,
      attempt: { engine, exitCode: 0, buildIdMatches: true, buildId, logPath },
    },
  });
  assert(tampered.errors.includes("build_receipt_digest_mismatch"));
});
