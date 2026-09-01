#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { linuxProcessTreeSnapshot, progressWatchdogState } from "../../lib/build/linux-process-tree.mjs";

let assertions = 0;
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions += 1; };
const ok = (value, message) => { assert.ok(value, message); assertions += 1; };
const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-proc-tree-"));
const writeProcess = (pid, ppid, rssKb, children = []) => {
  const base = path.join(root, String(pid));
  fs.mkdirSync(path.join(base, "task", String(pid)), { recursive: true });
  fs.writeFileSync(path.join(base, "status"), `Name:\tproc-${pid}\nState:\tS (sleeping)\nPid:\t${pid}\nPPid:\t${ppid}\nVmRSS:\t${rssKb} kB\nThreads:\t2\n`);
  fs.writeFileSync(path.join(base, "task", String(pid), "children"), children.join(" "));
};
try {
  writeProcess(100, 1, 100, [101, 102]);
  writeProcess(101, 100, 200, [103]);
  writeProcess(102, 100, 300, []);
  writeProcess(103, 101, 400, []);
  writeProcess(999, 1, 9999, []);
  const snapshot = linuxProcessTreeSnapshot(100, { procRoot: root, capturedAt: "2026-07-31T00:00:00.000Z" });
  equal(snapshot.processCount, 4, "only descendants of the selected root are included");
  equal(snapshot.totalRssKb, 1000, "RSS is summed across the exact process tree");
  equal(snapshot.processes.map((row) => row.pid), [103, 102, 101, 100], "processes are ordered by RSS");
  equal(snapshot.samplingMethod, "linux-proc-children", "receipt identifies the non-spawning sampler");
  equal(linuxProcessTreeSnapshot(404, { procRoot: root }), null, "missing root returns no snapshot");
  const progress = progressWatchdogState({ previousBytes: 10, currentBytes: 20, previousProgressMs: 1000, nowMs: 5000, stallMs: 3000 });
  equal(progress.progressed, true, "log byte growth records progress");
  equal(progress.lastProgressMs, 5000, "progress resets the stall clock");
  equal(progress.stalled, false, "progress cannot be classified as stalled");
  const stalled = progressWatchdogState({ previousBytes: 20, currentBytes: 20, previousProgressMs: 1000, nowMs: 5000, stallMs: 3000 });
  equal(stalled.progressed, false, "unchanged log bytes are detected");
  equal(stalled.stalled, true, "unchanged log beyond the threshold fails closed");
  ok(stalled.lastProgressMs === 1000, "no progress preserves the prior clock");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log(JSON.stringify({ schemaVersion: "velmere.linux-process-tree-watchdog.v1", status: "PASS", assertions }, null, 2));
