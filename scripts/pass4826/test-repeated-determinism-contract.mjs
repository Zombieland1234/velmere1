import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRepeatedDeterminism } from "./repeated-determinism-contract.mjs";

const digest = (character) => character.repeat(64);
const passing = (index) => ({
  index,
  exitCode: 0,
  timedOut: false,
  packageStatus: "PASS",
  verificationStatus: "PASS",
  sourceDigest: digest("a"),
  outputDigest: digest("b"),
  releaseDigest: digest("c"),
});

test("ten identical verified runs pass", () => {
  const result = summarizeRepeatedDeterminism(Array.from({ length: 10 }, (_, index) => passing(index + 1)));
  assert.equal(result.passed, true);
  assert.equal(result.uniqueReleaseDigestCount, 1);
});

test("missing run, changed output and process failure fail closed", () => {
  assert.equal(summarizeRepeatedDeterminism(Array.from({ length: 9 }, (_, index) => passing(index + 1))).passed, false);
  const changed = Array.from({ length: 10 }, (_, index) => passing(index + 1));
  changed[4].releaseDigest = digest("d");
  assert.equal(summarizeRepeatedDeterminism(changed).passed, false);
  const failed = Array.from({ length: 10 }, (_, index) => passing(index + 1));
  failed[7].exitCode = 1;
  assert.equal(summarizeRepeatedDeterminism(failed).passed, false);
});
