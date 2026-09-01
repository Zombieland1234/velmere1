#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const run = spawnSync(process.execPath, ["scripts/pass36/build-a102r44p23-lifecycle-persona-matrix.mjs"], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", TERM: "dumb", NO_COLOR: "1", CI: "true" }, timeout: 30_000 });
assert.equal(run.status, 0, run.stderr || run.stdout);
const matrix = JSON.parse(run.stdout);
const checks = [];
const check = (id, ok) => { checks.push({ id, ok: Boolean(ok) }); assert.ok(ok, id); };
check("01-personas-15", matrix.personas === 15);
check("02-stages-12", matrix.stages === 12);
check("03-rows-180", matrix.rows.length === 180);
check("04-runtime-105", matrix.counts.RUNTIME_TESTED_LOCAL_DISPOSABLE === 105);
check("05-static-15", matrix.counts.STATICALLY_TESTED === 15);
check("06-blocked-60", matrix.counts.BLOCKED_EXTERNAL_STAGING === 60);
check("07-no-staging-credit", matrix.rows.every((row) => row.stagingCredit === false));
check("08-no-live-credit", matrix.rows.every((row) => row.liveCredit === false));
check("09-no-customer-credit", matrix.rows.every((row) => row.customerCredit === false));
check("10-paid-blockers-visible", matrix.rows.filter((row) => row.status === "BLOCKED_EXTERNAL_STAGING").every((row) => row.purchaseImpact === "BLOCKS_PUBLIC_PAID_SALE"));
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p23.lifecycle-persona-matrix-test.v1", status: "PASS", checks: checks.length, passed: checks.length, failed: 0, rows: checks }, null, 2));
