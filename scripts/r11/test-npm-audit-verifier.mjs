#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyNpmAudit, NPM_AUDIT_VERDICT_SCHEMA } from "./verify-npm-audit.mjs";

const clean = { metadata: { vulnerabilities: { info:0, low:0, moderate:0, high:0, critical:0, total:0 } } };
const cleanResult = classifyNpmAudit({ payload: clean, exitCode: 0 });
assert.equal(cleanResult.releaseCredit, true);
assert.equal(cleanResult.schemaVersion, NPM_AUDIT_VERDICT_SCHEMA);
assert.equal(cleanResult.ok, true);
assert.equal(cleanResult.toolError, false);
assert.equal(cleanResult.high, 0);
assert.equal(cleanResult.critical, 0);

const high = { metadata: { vulnerabilities: { info:0, low:0, moderate:0, high:1, critical:0, total:1 } } };
const highResult = classifyNpmAudit({ payload: high, exitCode: 1 });
assert.equal(highResult.releaseCredit, false);
assert.equal(highResult.ok, false);
assert.equal(highResult.high, 1);
assert.equal(highResult.critical, 0);

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
  assert.equal(result.ok, false, `${name} must not be semantically ok`);
}

console.log(JSON.stringify({schemaVersion:"velmere.r11.npm-audit-canaries.v2",status:"PASS",cases:8},null,2));
