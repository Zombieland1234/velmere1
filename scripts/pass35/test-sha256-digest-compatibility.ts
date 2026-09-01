import assert from "node:assert/strict";
import { hasServerVerifiedQuoteLiveGate } from "../../components/market-integrity/live-truth";
import { isSha256Digest } from "../../lib/security/cryptographic-digest";

const rawA = "a".repeat(64);
const rawB = "b".repeat(64);
assert.equal(isSha256Digest(rawA), true);
assert.equal(isSha256Digest(`sha256:${rawA}`), true);
assert.equal(isSha256Digest("sha256:bad"), false);
assert.equal(isSha256Digest(""), false);

const nowMs = Date.parse("2026-07-22T12:00:00.000Z");
const delivery = {
  state: "live_verified",
  serverVerified: true,
  liveClaimAllowed: true,
  exactIdentity: true,
  completenessBps: 10_000,
  sourceReceiptRoot: `sha256:${rawA}`,
  receiptDigest: `sha256:${rawB}`,
  sourceAsOf: "2026-07-22T11:59:00.000Z",
  blockers: [],
};
assert.equal(hasServerVerifiedQuoteLiveGate({ delivery }, nowMs), true);
assert.equal(hasServerVerifiedQuoteLiveGate({ delivery: { ...delivery, sourceReceiptRoot: "sha256:bad" } }, nowMs), false);
console.log("PASS35 SHA-256 receipt compatibility 6/6 PASS");
