#!/usr/bin/env node
import {
  inspectSegmentedBuildLockBoundary,
} from "../../lib/build/segmented-build-integrity.mjs";

const allowedPhases = new Set(["post-build", "post-smoke", "manual"]);
const phaseIndex = process.argv.indexOf("--phase");
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : "manual";
if (!allowedPhases.has(phase)) {
  throw new Error("segmented_build_lock_boundary_invalid_phase");
}

const root = process.cwd();
const settleMs = 2_000;
const intervalMs = 100;
const startedAt = new Date().toISOString();
const deadline = Date.now() + settleMs;
let checks = 0;
let firstFailure = null;
let finalInspection;

while (true) {
  finalInspection = inspectSegmentedBuildLockBoundary({ root });
  checks += 1;
  if (!finalInspection.ok && firstFailure === null) {
    firstFailure = {
      check: checks,
      status: finalInspection.status,
      external: finalInspection.external.filter((row) => !row.absent),
      legacySource: finalInspection.legacySource.filter((row) => !row.absent),
    };
  }
  if (Date.now() >= deadline) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

const ok = firstFailure === null && finalInspection?.ok === true;
const receipt = {
  schemaVersion: "velmere.segmented-build-lock-post-process-verifier.v1",
  generatedAt: new Date().toISOString(),
  startedAt,
  phase,
  status: ok ? "PASS" : "FAIL_LOCK_REAPPEARED",
  ok,
  settleMs,
  intervalMs,
  checks,
  namespaceSha256: finalInspection?.namespaceSha256 ?? null,
  rawExternalPathDisclosed: false,
  firstFailure,
  finalInspection,
  truthBoundary: ok
    ? "The external runtime lock namespace and the legacy source lock paths stayed absent across the bounded post-process observation window. Build, browser, staging and LIVE remain separate gates."
    : "No post-process build-lock cleanup credit is permitted because a lock was present or reappeared in the external runtime namespace or legacy source tree.",
};

console.log(JSON.stringify(receipt, null, 2));
if (!ok) process.exit(1);
