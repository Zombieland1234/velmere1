#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readAdmissionSnapshot } from "./a102r44p27-external-evidence-admission-journal.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const worker = path.join(root, "scripts/pass36/a102r44p27-admission-race-worker.mjs");
const revision = "VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DURABLE_EXTERNAL_EVIDENCE_REPLAY_JOURNAL_ATOMIC_ADMISSION_AND_ENVELOPE_TIME_HARDENING_NO_LIVE_CREDIT";
const source = "1".repeat(64);
const policy = "2".repeat(64);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p27-race-"));
const sourceRoot = path.join(temp, "source");
const admissionRoot = path.join(temp, "admission");
fs.mkdirSync(sourceRoot, { mode: 0o700 });
fs.writeFileSync(path.join(sourceRoot, "sentinel"), "x", { mode: 0o600 });

function runWorker(index, shared) {
  const evidenceId = shared ? "shared-evidence-0001" : `unique-evidence-${String(index).padStart(4, "0")}`;
  const nonce = shared ? "shared-nonce-0001" : `unique-nonce-${String(index).padStart(4, "0")}`;
  const args = [
    worker,
    "--source-root", sourceRoot,
    "--admission-root", admissionRoot,
    "--revision", revision,
    "--source", source,
    "--policy", policy,
    "--evidence-id", evidenceId,
    "--nonce", nonce,
    "--envelope", String(index + 3).repeat(64).slice(0, 64),
    "--payload", String(index + 4).repeat(64).slice(0, 64),
    "--key-id", "trusted-key-0001",
    "--program-id", "program-0001",
    "--execution-id", shared ? "execution-shared" : `execution-${String(index).padStart(4, "0")}`,
    "--observed-at", "2026-08-07T11:59:00.000Z",
  ];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    const out = [];
    const err = [];
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => err.push(chunk));
    child.on("close", (code) => resolve({ code, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") }));
  });
}

try {
  const same = await Promise.all(Array.from({ length: 8 }, (_, index) => runWorker(index, true)));
  assert.equal(same.filter((row) => row.code === 0).length, 1);
  assert.equal(same.filter((row) => row.code === 4).length, 7);
  const afterSame = readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
    allowUninitialized: false,
  });
  assert.equal(afterSame.sequence, 1);

  const unique = await Promise.all(Array.from({ length: 8 }, (_, index) => runWorker(index + 10, false)));
  assert.equal(unique.filter((row) => row.code === 0).length, 8);
  const final = readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
    allowUninitialized: false,
  });
  assert.equal(final.sequence, 9);
  assert.equal(final.entries.length, 9);
  assert.equal(new Set(final.entries.map((row) => row.evidenceIdSha256)).size, 9);
  assert.equal(new Set(final.entries.map((row) => row.nonceSha256)).size, 9);
  assert.equal(final.entries.every((row, index) => row.sequence === index + 1), true);

  console.log(JSON.stringify({
    schemaVersion: "velmere.pass36.a102r44p27.concurrent-admission-test.v1",
    status: "PASS",
    checks: 10,
    passed: 10,
    failed: 0,
    sharedRace: { workers: 8, accepted: 1, replayRejected: 7 },
    uniqueRace: { workers: 8, accepted: 8 },
    finalSequence: final.sequence,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
