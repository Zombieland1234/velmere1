#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateExternalProofRegister } from "./external-proof-register.mjs";

const baseline = JSON.parse(readFileSync("config/pass35/external-proof-register.json", "utf8"));
const clone = (value) => structuredClone(value);

const result = evaluateExternalProofRegister(baseline);
assert.equal(result.ok, true, result.errors.join("\n"));
assert.equal(result.summary.verifiedEvidenceCount, 0);
assert.equal(result.summary.promotionAllowed, false);

const inventedCount = clone(baseline);
inventedCount.workstreams[0].verifiedCount = 1;
assert.equal(evaluateExternalProofRegister(inventedCount).ok, false, "a counter without a bound receipt must fail");

const fixtureReceipt = clone(baseline);
fixtureReceipt.evidenceReceipts.push({
  evidenceId: "fixture-1",
  workstreamId: "FG00_SIGNED_SELECTION",
  status: "VALID",
  fixture: true,
  environment: "LOCAL_FIXTURE",
  signer: "fixture",
  independentVerifier: "fixture",
  sourceSha256: "a".repeat(64),
  artifactSha256: "b".repeat(64),
  issuedAt: "2026-07-21T00:00:00.000Z",
  expiresAt: "2026-08-21T00:00:00.000Z"
});
fixtureReceipt.workstreams[0].verifiedCount = 1;
assert.equal(evaluateExternalProofRegister(fixtureReceipt).ok, false, "fixture/local evidence must fail");

const falsePromotion = clone(baseline);
falsePromotion.promotionAllowed = true;
assert.equal(evaluateExternalProofRegister(falsePromotion).ok, false, "promotion cannot be enabled while external denominators are incomplete");

console.log("PASS PASS35 external proof register: exact denominators, receipt binding, TTL and fail-closed promotion");
