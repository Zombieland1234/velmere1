import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateSuppressions,
  scanSuppressionDirectives,
  SUPPRESSION_ALLOWLIST_SCHEMA,
} from "./suppression-policy-contract.mjs";

function allowance(directive, overrides = {}) {
  return {
    path: directive.path,
    kind: directive.kind,
    rules: directive.rules,
    commentSha256: directive.commentSha256,
    ownerRole: "security-maintainers",
    rationale: "Reviewed narrow exception with a bounded source contract.",
    expiresOn: "2026-12-31",
    ...overrides,
  };
}

test("scanner sees comment directives but ignores string literals", () => {
  const source = [
    'const decoy = "// eslint-disable no-alert";',
    "// eslint-disable-next-line no-alert -- A reviewed exception justified for this exact fixture only.",
    "alert('x');",
  ].join("\n");
  const directives = scanSuppressionDirectives("fixtures/example.ts", source);
  assert.equal(directives.length, 1);
  assert.equal(directives[0].kind, "eslint-disable-next-line");
  assert.deepEqual(directives[0].rules, ["no-alert"]);
});

test("exact, justified and unexpired allowlist passes", () => {
  const directives = scanSuppressionDirectives(
    "fixtures/example.ts",
    "// eslint-disable-next-line no-alert -- A reviewed exception justified for this exact fixture only.\nalert('x');\n",
  );
  const result = evaluateSuppressions({
    directives,
    allowlist: { schemaVersion: SUPPRESSION_ALLOWLIST_SCHEMA, entries: [allowance(directives[0])] },
    evaluationTime: "2026-07-18T12:00:00.000Z",
  });
  assert.equal(result.passed, true);
  assert.equal(result.unexpectedSuppressionCount, 0);
});

test("missing, stale, expired and forbidden controls fail closed", () => {
  const directives = scanSuppressionDirectives(
    "fixtures/example.ts",
    [
      "// eslint-disable-next-line no-alert",
      "// @ts-ignore -- Deliberately forbidden even with explanatory prose present.",
    ].join("\n"),
  );
  const stale = {
    ...allowance(directives[0]),
    path: "fixtures/stale.ts",
    expiresOn: "2026-01-01",
  };
  const result = evaluateSuppressions({
    directives,
    allowlist: { schemaVersion: SUPPRESSION_ALLOWLIST_SCHEMA, entries: [stale] },
    evaluationTime: "2026-07-18T12:00:00.000Z",
  });
  assert.equal(result.passed, false);
  assert.ok(result.unexpectedSuppressionCount >= 2);
  assert.equal(result.missingJustificationCount, 1);
  assert.equal(result.forbidden.length, 1);
});
