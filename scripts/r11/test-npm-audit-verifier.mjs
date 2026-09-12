#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyNpmAudit } from "./verify-npm-audit.mjs";

const clean = { metadata: { vulnerabilities: { info:0, low:0, moderate:0, high:0, critical:0, total:0 } } };
assert.equal(classifyNpmAudit({ payload: clean, exitCode: 0 }).releaseCredit, true);

const high = { metadata: { vulnerabilities: { info:0, low:0, moderate:0, high:1, critical:0, total:1 } } };
assert.equal(classifyNpmAudit({ payload: high, exitCode: 1 }).releaseCredit, false);

for (const [name, payload, exitCode] of [
  ["tool-error", { error: { code: "ENOAUDIT" } }, 1],
  ["empty", {}, 0],
  ["null", null, 0],
  ["negative", { metadata:{ vulnerabilities:{ info:0, low:0, moderate:0, high:-1, critical:0, total:0 } } }, 0],
  ["missing-field", { metadata:{ vulnerabilities:{ info:0, low:0, moderate:0, high:0, critical:0 } } }, 0],
  ["tool-exit", clean, 2],
]) {
  const result = classifyNpmAudit({ payload, exitCode });
  assert.equal(result.releaseCredit, false, `${name} must fail closed`);
}

console.log(JSON.stringify({schemaVersion:"velmere.r11.npm-audit-canaries.v1",status:"PASS",cases:8},null,2));
