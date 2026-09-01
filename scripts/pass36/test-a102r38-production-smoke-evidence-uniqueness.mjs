#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  inspectProductionSmokeEvidence,
  productionSmokeExpectedAssertionNames,
  productionSmokeExpectedResultIdentities,
} from "../deployment/production-smoke-evidence.mjs";

let checks = 0;
const ok = (value, id) => {
  checks += 1;
  assert.ok(value, id);
};
const equal = (actual, expected, id) => {
  checks += 1;
  assert.equal(actual, expected, id);
};

function rowsFromIdentities(identities) {
  return identities.map((identity) => {
    const separator = identity.indexOf(" ");
    return {
      method: identity.slice(0, separator),
      path: identity.slice(separator + 1),
    };
  });
}

const assertionNames = productionSmokeExpectedAssertionNames();
const resultIdentities = productionSmokeExpectedResultIdentities();
const validAssertions = assertionNames.map((name) => ({ name, ok: true }));
const validResults = rowsFromIdentities(resultIdentities);
const valid = inspectProductionSmokeEvidence({
  assertions: validAssertions,
  results: validResults,
});

equal(assertionNames.length, 55, "assertion denominator");
equal(new Set(assertionNames).size, 55, "assertion uniqueness");
equal(resultIdentities.length, 16, "result denominator");
equal(new Set(resultIdentities).size, 16, "result uniqueness");
equal(assertionNames.filter((name) => name === "/de/real-markets_x_frame_options").length, 1, "de x-frame exact once");
equal(assertionNames.filter((name) => name === "/de/real-markets_nosniff").length, 1, "de nosniff exact once");
equal(assertionNames.filter((name) => name === "/de/real-markets_csp").length, 1, "de CSP exact once");
equal(assertionNames.filter((name) => name === "/de/real-markets_referrer_policy").length, 1, "de referrer exact once");
equal(resultIdentities.filter((identity) => identity === "GET /de/real-markets").length, 1, "de result exact once");
ok(valid.ok, "valid evidence passes");
ok(valid.assertionSet.ok, "valid assertion set passes");
ok(valid.resultSet.ok, "valid result set passes");
equal(valid.assertionSet.duplicates.length, 0, "no assertion duplicates");
equal(valid.resultSet.duplicates.length, 0, "no result duplicates");
ok(valid.assertionSet.orderedMatch, "assertion order exact");
ok(valid.resultSet.orderedMatch, "result order exact");

const duplicateAssertion = inspectProductionSmokeEvidence({
  assertions: [
    ...validAssertions.slice(0, -1),
    { name: validAssertions[0].name, ok: true },
  ],
  results: validResults,
});
ok(!duplicateAssertion.ok, "duplicate assertion rejected");
equal(duplicateAssertion.assertionSet.duplicates.length, 1, "duplicate assertion reported");
ok(duplicateAssertion.assertionSet.missing.includes("source_immutable"), "duplicate cannot hide missing assertion");

const missingAssertion = inspectProductionSmokeEvidence({
  assertions: validAssertions.slice(0, -1),
  results: validResults,
});
ok(!missingAssertion.ok, "missing assertion rejected");
ok(missingAssertion.assertionSet.missing.includes("source_immutable"), "missing assertion named");

const extraAssertion = inspectProductionSmokeEvidence({
  assertions: [...validAssertions, { name: "unexpected_inflation", ok: true }],
  results: validResults,
});
ok(!extraAssertion.ok, "extra assertion rejected");
ok(extraAssertion.assertionSet.extra.includes("unexpected_inflation"), "extra assertion named");

const reorderedAssertions = inspectProductionSmokeEvidence({
  assertions: [validAssertions[1], validAssertions[0], ...validAssertions.slice(2)],
  results: validResults,
});
ok(!reorderedAssertions.ok, "assertion order drift rejected");
ok(!reorderedAssertions.assertionSet.orderedMatch, "assertion order drift explicit");

const invalidAssertion = inspectProductionSmokeEvidence({
  assertions: [{ ...validAssertions[0], name: "" }, ...validAssertions.slice(1)],
  results: validResults,
});
ok(!invalidAssertion.ok, "empty assertion identity rejected");
equal(invalidAssertion.assertionSet.invalid.length, 1, "invalid assertion explicit");

const duplicateResult = inspectProductionSmokeEvidence({
  assertions: validAssertions,
  results: [...validResults.slice(0, -1), validResults[0]],
});
ok(!duplicateResult.ok, "duplicate result rejected");
equal(duplicateResult.resultSet.duplicates.length, 1, "duplicate result reported");
ok(duplicateResult.resultSet.missing.includes("GET /de/real-markets"), "duplicate result cannot hide missing route");

const missingResult = inspectProductionSmokeEvidence({
  assertions: validAssertions,
  results: validResults.slice(0, -1),
});
ok(!missingResult.ok, "missing result rejected");
ok(missingResult.resultSet.missing.includes("GET /de/real-markets"), "missing result named");

const extraResult = inspectProductionSmokeEvidence({
  assertions: validAssertions,
  results: [...validResults, { method: "GET", path: "/unexpected" }],
});
ok(!extraResult.ok, "extra result rejected");
ok(extraResult.resultSet.extra.includes("GET /unexpected"), "extra result named");

const reorderedResults = inspectProductionSmokeEvidence({
  assertions: validAssertions,
  results: [validResults[1], validResults[0], ...validResults.slice(2)],
});
ok(!reorderedResults.ok, "result order drift rejected");
ok(!reorderedResults.resultSet.orderedMatch, "result order drift explicit");

const runSource = fs.readFileSync("scripts/deployment/run-production-smoke.mjs", "utf8");
const networkSource = fs.readFileSync("scripts/deployment/production-smoke-network.mjs", "utf8");
const contractSource = fs.readFileSync("scripts/deployment/test-production-smoke-contract.mjs", "utf8");
ok(runSource.includes("inspectProductionSmokeEvidence"), "runner uses evidence contract");
ok(runSource.includes("PRODUCTION_SMOKE_LOCAL_PRODUCT_PATHS"), "runner uses one route denominator");
ok(runSource.includes("localProductPageByPath.get(\"/de/real-markets\")"), "runner reuses de result");
ok(!runSource.includes("const de = await request(\"/de/real-markets\")"), "duplicate de request removed");
ok(runSource.includes("_referrer_policy"), "replacement referrer assertions wired");
ok(runSource.includes("&& evidenceContract.ok"), "evidence failure blocks PASS");
ok(networkSource.includes("referrerPolicy: response.headers.get(\"referrer-policy\")"), "referrer header captured");
ok(contractSource.includes("duplicate assertion identity fails closed"), "contract tests duplicate assertion");
ok(contractSource.includes("duplicate HTTP result identity fails closed"), "contract tests duplicate result");

equal(checks + 1, 46, "fixed test denominator");
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r38.production-smoke-evidence-uniqueness-test.v1",
  revisionId: "VELMERE_PASS36_A102R38_ACTION_REQUIRED_PRODUCTION_SMOKE_UNIQUE_ASSERTION_RESULT_DENOMINATOR_AND_SOURCE_AUTHORITY_RECONCILIATION_NO_LIVE_CREDIT",
  status: "PASS_A102R38_LOCAL_EVIDENCE_UNIQUENESS_ONLY_NO_BUILD_BROWSER_STAGING_OR_SALE_CREDIT",
  checks,
  passed: checks,
  failed: 0,
  expectedAssertions: assertionNames.length,
  uniqueAssertions: new Set(assertionNames).size,
  expectedResults: resultIdentities.length,
  uniqueResults: new Set(resultIdentities).size,
  priorDuplicateAssertionNamesClosed: [
    "/de/real-markets_x_frame_options",
    "/de/real-markets_nosniff",
    "/de/real-markets_csp",
  ],
  priorDuplicateResultIdentityClosed: "GET /de/real-markets",
  truthBoundary:
    "This test proves local evidence-cardinality and runner wiring only. It does not rerun either production build, standalone runtime, exact Chrome, Windows, staging, providers, legal, customer value, LIVE or sale.",
}, null, 2));
