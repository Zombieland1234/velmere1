#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  SEMANTIC_EXCLUDED_KEYS,
  SEMANTIC_PAYLOAD_SCHEMA_VERSION,
  buildSemanticPayload,
  semanticDigestSha256,
} from "../../lib/worldclass/semantic-payload.mjs";

const tests = [];
function test(name, fn) {
  try {
    fn();
    tests.push({ name, ok: true });
  } catch (error) {
    tests.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const representative = {
  schemaVersion: "velmere.worldclass.output.v1",
  surface: "vlm_brain",
  tier: "advanced",
  locale: "pl",
  status: "passed",
  confidence: 81,
  evidence: [
    { sourceId: "s1", family: "provider", payloadSha256: "a".repeat(64) },
    { sourceId: "s2", family: "policy", payloadSha256: "b".repeat(64) },
  ],
  claims: [
    { id: "c1", text: "Claim one", sourceIds: ["s1"] },
    { id: "c2", text: "Claim two", sourceIds: ["s1", "s2"] },
  ],
  missingData: [],
  nullableField: null,
  exactPdfSha256: "1".repeat(64),
  pdfByteLength: 12345,
  semanticDigestSha256: "2".repeat(64),
};

function clone(value) { return structuredClone(value); }
function changed(mutator) {
  const copy = clone(representative);
  mutator(copy);
  return semanticDigestSha256(copy) !== semanticDigestSha256(representative);
}
function unchanged(mutator) {
  const copy = clone(representative);
  mutator(copy);
  return semanticDigestSha256(copy) === semanticDigestSha256(representative);
}
function throws(mutator, pattern) {
  const copy = clone(representative);
  mutator(copy);
  assert.throws(() => semanticDigestSha256(copy), pattern);
}

test("schema_version_is_frozen", () => assert.equal(SEMANTIC_PAYLOAD_SCHEMA_VERSION, "velmere.semantic-payload.v1"));
test("key_reordering_is_digest_invariant", () => {
  const reordered = {
    status: representative.status,
    locale: representative.locale,
    tier: representative.tier,
    surface: representative.surface,
    schemaVersion: representative.schemaVersion,
    claims: representative.claims,
    evidence: representative.evidence,
    confidence: representative.confidence,
    missingData: representative.missingData,
    nullableField: representative.nullableField,
    pdfByteLength: representative.pdfByteLength,
    exactPdfSha256: representative.exactPdfSha256,
    semanticDigestSha256: representative.semanticDigestSha256,
  };
  assert.equal(semanticDigestSha256(reordered), semanticDigestSha256(representative));
});
test("nested_key_reordering_is_digest_invariant", () => {
  const copy = clone(representative);
  copy.claims[0] = { sourceIds: ["s1"], text: "Claim one", id: "c1" };
  assert.equal(semanticDigestSha256(copy), semanticDigestSha256(representative));
});
test("array_order_is_semantic", () => assert.equal(changed((copy) => copy.claims.reverse()), true));
test("claim_text_mutation_changes_digest", () => assert.equal(changed((copy) => { copy.claims[0].text = "Mutated claim"; }), true));
test("evidence_binding_mutation_changes_digest", () => assert.equal(changed((copy) => { copy.claims[0].sourceIds = ["s2"]; }), true));
test("null_vs_missing_changes_digest", () => assert.equal(changed((copy) => { delete copy.nullableField; }), true));
test("zero_and_negative_zero_are_equivalent", () => {
  const left = clone(representative); left.confidence = 0;
  const right = clone(representative); right.confidence = -0;
  assert.equal(semanticDigestSha256(left), semanticDigestSha256(right));
});
test("self_referential_digest_is_excluded", () => assert.equal(unchanged((copy) => { copy.semanticDigestSha256 = "f".repeat(64); }), true));
test("exact_pdf_digest_is_excluded", () => assert.equal(unchanged((copy) => { copy.exactPdfSha256 = "e".repeat(64); }), true));
test("exact_pdf_byte_length_is_excluded", () => assert.equal(unchanged((copy) => { copy.pdfByteLength = 999999; }), true));
test("non_finite_number_fails_closed", () => throws((copy) => { copy.confidence = Number.NaN; }, /semantic_non_finite_number/u));
test("undefined_fails_closed", () => throws((copy) => { copy.status = undefined; }, /semantic_undefined/u));
test("bigint_fails_closed", () => {
  const copy = clone(representative);
  copy.confidence = 1n;
  assert.throws(() => semanticDigestSha256(copy), /semantic_bigint/u);
});
test("cycle_fails_closed", () => {
  const copy = clone(representative);
  copy.self = copy;
  assert.throws(() => semanticDigestSha256(copy), /semantic_cycle/u);
});
test("non_plain_object_fails_closed", () => {
  const copy = clone(representative);
  copy.generatedAt = new Date("2026-09-13T00:00:00.000Z");
  assert.throws(() => semanticDigestSha256(copy), /semantic_non_plain_object/u);
});
test("excluded_paths_are_auditable", () => {
  const result = buildSemanticPayload(representative);
  assert.equal(result.excludedPaths.includes("$.semanticDigestSha256"), true);
  assert.equal(result.excludedPaths.includes("$.exactPdfSha256"), true);
  assert.equal(result.excludedPaths.includes("$.pdfByteLength"), true);
  assert.equal(SEMANTIC_EXCLUDED_KEYS.length >= 10, true);
});
test("semantic_digest_is_sha256_hex", () => assert.match(semanticDigestSha256(representative), /^[0-9a-f]{64}$/u));

const passed = tests.filter((row) => row.ok).length;
const failed = tests.length - passed;
const report = {
  schemaVersion: "velmere.pass19.semantic-payload-contract-tests.v1",
  semanticPayloadSchemaVersion: SEMANTIC_PAYLOAD_SCHEMA_VERSION,
  tests: tests.length,
  passed,
  failed,
  excludedKeys: SEMANTIC_EXCLUDED_KEYS,
  rules: {
    objectKeyOrder: "LEXICOGRAPHIC_ASCENDING",
    arrayOrder: "PRESERVED_AND_SEMANTIC",
    nullEncoding: "EXPLICIT_NULL_PRESERVED",
    numberEncoding: "FINITE_JSON_NUMBER_NEGATIVE_ZERO_NORMALIZED_TO_ZERO",
    exactRenderBytes: "EXCLUDED_FROM_SEMANTIC_DIGEST_REQUIRE_SEPARATE_BYTE_DIGEST",
  },
  results: tests,
  truthBoundary: "PASS proves deterministic versioned semantic canonicalization, explicit render-byte separation and mutation sensitivity for the governed JSON contract. It does not prove provider truth, human review, PDF rendering correctness, staging, LIVE behavior or external audit independence.",
};
console.log(JSON.stringify(report, null, 2));
if (failed) process.exit(1);
