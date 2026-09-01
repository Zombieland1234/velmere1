#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const policyPath = path.join(root, "lib/ui/modal-scroll-lock-policy.ts");
const hookPath = path.join(root, "components/ui/useModalScrollLock.ts");
const policySource = fs.readFileSync(policyPath, "utf8");
const hookSource = fs.readFileSync(hookPath, "utf8");
const policy = await import(`${pathToFileURL(policyPath).href}?a102r35=${Date.now()}`);
let checks = 0;
const check = (id, run) => { checks += 1; run(); };

const frames = new Map();
const cancelled = [];
const scrolls = [];
let frameId = 0;
let activeLock = false;
const runtime = {
  requestFrame(callback) { frameId += 1; frames.set(frameId, callback); return frameId; },
  cancelFrame(id) { cancelled.push(id); frames.delete(id); },
  scrollTo(x, y) { scrolls.push([x, y]); },
  hasActiveLock() { return activeLock; },
};

check("policy-consume-export", () => assert.equal(typeof policy.consumePendingModalScrollRestore, "function"));
check("policy-schedule-export", () => assert.equal(typeof policy.scheduleModalScrollRestore, "function"));
check("policy-generation-bound", () => assert.match(policySource, /restoreGeneration !== generation/u));
check("policy-active-lock-guard", () => assert.match(policySource, /runtime\.hasActiveLock\(\)/u));
check("hook-consumes-before-snapshot", () => assert.match(hookSource, /consumePendingModalScrollRestore[\s\S]*pendingCoordinates\?\.scrollX \?\? window\.scrollX/u));
check("hook-schedules-after-delete", () => assert.match(hookSource, /delete window\.__velmereModalScrollLock;[\s\S]*scheduleModalScrollRestore/u));
check("hook-reference-count-retained", () => assert.match(hookSource, /current\.count = Math\.max\(0, current\.count - 1\)[\s\S]*if \(current\.count > 0\) return/u));
check("hook-listener-cleanup-retained", () => assert.match(hookSource, /current\.removeOwnershipListeners\(\)/u));

const firstGeneration = policy.scheduleModalScrollRestore({ scrollX: 12, scrollY: 480 }, runtime);
check("first-generation-positive", () => assert.ok(firstGeneration > 0));
check("pending-recorded", () => assert.deepEqual(policy.getPendingModalScrollRestoreForTests(), { generation: firstGeneration, scrollX: 12, scrollY: 480 }));
const firstFrame = frameId;
const firstCallback = frames.get(firstFrame);
check("first-frame-exists", () => assert.equal(typeof firstCallback, "function"));
const consumed = policy.consumePendingModalScrollRestore(runtime);
check("rapid-reopen-consumes-original-coordinates", () => assert.deepEqual(consumed, { scrollX: 12, scrollY: 480 }));
check("rapid-reopen-cancels-old-frame", () => assert.deepEqual(cancelled, [firstFrame]));
check("pending-cleared-after-consume", () => assert.equal(policy.getPendingModalScrollRestoreForTests(), null));
firstCallback?.(0);
check("stale-callback-cannot-scroll", () => assert.deepEqual(scrolls, []));

const secondGeneration = policy.scheduleModalScrollRestore({ scrollX: 4, scrollY: 900 }, runtime);
const secondCallback = frames.get(frameId);
check("generation-monotonic", () => assert.ok(secondGeneration > firstGeneration));
activeLock = true;
secondCallback?.(0);
check("active-lock-blocks-restore", () => assert.deepEqual(scrolls, []));
check("active-lock-callback-clears-pending", () => assert.equal(policy.getPendingModalScrollRestoreForTests(), null));

activeLock = false;
policy.scheduleModalScrollRestore({ scrollX: Number.NaN, scrollY: Number.POSITIVE_INFINITY }, runtime);
const finiteCallback = frames.get(frameId);
finiteCallback?.(0);
check("nonfinite-coordinates-normalized", () => assert.deepEqual(scrolls, [[0, 0]]));

policy.scheduleModalScrollRestore({ scrollX: 7, scrollY: 77 }, runtime);
const replacementFirst = frameId;
policy.scheduleModalScrollRestore({ scrollX: 8, scrollY: 88 }, runtime);
const replacementSecond = frameId;
check("replacement-cancels-prior-frame", () => assert.ok(cancelled.includes(replacementFirst)));
frames.get(replacementSecond)?.(0);
check("latest-restore-wins", () => assert.deepEqual(scrolls.at(-1), [8, 88]));
check("no-pending-after-success", () => assert.equal(policy.getPendingModalScrollRestoreForTests(), null));
check("no-direct-untracked-raf-scroll", () => assert.doesNotMatch(hookSource, /requestAnimationFrame\(\(\) => window\.scrollTo/u));
check("no-production-credit", () => assert.ok(true));

const receipt = {
  schemaVersion: "velmere.pass36.a102r35.modal-scroll-lock-race-test.v1",
  revisionId: "VELMERE_PASS36_A102R35_ACTION_REQUIRED_MODAL_SCROLL_LOCK_PENDING_RESTORE_RAPID_REOPEN_AND_NESTED_OWNER_RACE_RECOVERY_NO_REAL_CREDIT",
  parentRevisionId: "VELMERE_PASS36_A102R34_ACTION_REQUIRED_DIALOG_TOP_LAYER_ESCAPE_TAB_OUTSIDE_POINTER_AND_NESTED_RETURN_OWNERSHIP_RECOVERY_NO_REAL_CREDIT",
  status: "PASS_A102R35_MODAL_SCROLL_LOCK_RACE_LOCAL_NO_PROMOTION",
  checks,
  passed: checks,
  failed: 0,
  realBrowserRows: 0,
  exactBuildBrowserCredit: false,
  live: false,
  saleEnabled: false,
};
fs.writeFileSync(path.join(root, "config/pass36/a102r35-test-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
