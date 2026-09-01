#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const POLICY = "config/p39/p39-v16-authority-topology-policy.json";
const RECONCILIATION = "config/p39/p39-v16-product-topology-reconciliation.json";
const CONTINUITY = "config/p39/p39-v15-to-v16-continuity-audit.json";
const V16 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt";
const V15 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt";
const TOPOLOGY_TS = "lib/product/vlm-canonical-product-topology.ts";
const MATRIX_TS = "lib/commerce/vlm-current-evidence-availability-matrix.ts";
const EXPECTED_V16 = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9";
const EXPECTED_V15 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0";
const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");
const bytes = (rel) => fs.readFileSync(path.join(ROOT, rel));
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function verifyIntegrity(value) {
  const clone = structuredClone(value);
  const expected = clone.integritySha256;
  delete clone.integritySha256;
  return expected === sha(Buffer.from(JSON.stringify(stable(clone))));
}

const policy = JSON.parse(bytes(POLICY));
const reconciliation = JSON.parse(bytes(RECONCILIATION));
const continuity = JSON.parse(bytes(CONTINUITY));
const topology = await import(`${pathToFileURL(path.join(ROOT, TOPOLOGY_TS)).href}?sha=${sha(bytes(TOPOLOGY_TS))}`);
const matrixModule = await import(`${pathToFileURL(path.join(ROOT, MATRIX_TS)).href}?sha=${sha(bytes(MATRIX_TS))}`);
const matrix = matrixModule.buildCurrentEvidenceAvailabilityMatrix({ locale: "en", evaluatedAt: "2026-08-14T05:10:00.000Z" });

const checks = [];
const check = (id, fn) => {
  try { fn(); checks.push({ id, pass: true }); }
  catch (error) { checks.push({ id, pass: false, error: error instanceof Error ? error.message : String(error) }); }
};

check("exact-node-24.18.0", () => assert.equal(process.version, "v24.18.0"));
check("v16-exact", () => assert.equal(sha(bytes(V16)), EXPECTED_V16));
check("v15-historical-exact", () => assert.equal(sha(bytes(V15)), EXPECTED_V15));
check("policy-integrity", () => assert.equal(verifyIntegrity(policy), true));
check("reconciliation-integrity", () => assert.equal(verifyIntegrity(reconciliation), true));
check("continuity-integrity", () => assert.equal(verifyIntegrity(continuity), true));
check("families-11", () => assert.equal(topology.VLM_CANONICAL_PRODUCT_FAMILIES.length, 11));
check("customer-rows-17", () => assert.equal(topology.VLM_CANONICAL_CUSTOMER_PRODUCTS.length, 17));
check("tiered-rows-9", () => assert.equal(topology.VLM_CANONICAL_CUSTOMER_PRODUCTS.filter((row) => row.tier !== null).length, 9));
check("standalone-rows-8", () => assert.equal(topology.VLM_CANONICAL_CUSTOMER_PRODUCTS.filter((row) => row.tier === null).length, 8));
check("customer-row-ids-unique", () => assert.equal(new Set(topology.VLM_CANONICAL_CUSTOMER_PRODUCTS.map((row) => row.productId)).size, 17));
check("internal-profiles-33", () => assert.equal(topology.VLM_INTERNAL_EXECUTION_PROFILES.length, 33));
check("internal-profile-ids-unique", () => assert.equal(new Set(topology.VLM_INTERNAL_EXECUTION_PROFILES.map((row) => row.profileId)).size, 33));
check("transitions-22", () => assert.equal(topology.VLM_CONTEXT_TRANSITIONS.length, 22));
check("required-transitions-6", () => assert.equal(topology.VLM_CONTEXT_TRANSITIONS.filter((row) => row.deltaRequiredByCatalog).length, 6));
check("not-applicable-transitions-16", () => assert.equal(topology.VLM_CONTEXT_TRANSITIONS.filter((row) => !row.deltaRequiredByCatalog).length, 16));
check("only-tiered-require-delta", () => assert.deepEqual([...new Set(topology.VLM_CONTEXT_TRANSITIONS.filter((row) => row.deltaRequiredByCatalog).map((row) => row.family))].sort(), ["audit", "browser", "pdf"]));
check("standalone-not-failed", () => assert.ok(topology.VLM_CONTEXT_TRANSITIONS.filter((row) => row.standaloneProduct).every((row) => row.defaultValueResult === "NOT_APPLICABLE_NO_PAID_DELTA_CLAIM")));
check("matrix-schema-v3", () => assert.equal(matrix.schemaVersion, "velmere.current-evidence-availability-matrix.v3"));
check("matrix-execution-33", () => assert.equal(matrix.executionCoverageDenominator, 33));
check("matrix-sale-denominator-17", () => assert.equal(matrix.customerFacingSaleEligibilityDenominator, 17));
check("matrix-sale-eligible-zero", () => assert.equal(matrix.saleEligibleCustomerFacingRowCount, 0));
check("matrix-internal-contexts-not-sale-rows", () => assert.ok(matrix.profiles.filter((row) => row.standaloneProduct).every((row) => !row.saleEligibilityApplies)));
check("truth-safety-invariant", () => assert.ok(matrix.profiles.every((row) => row.truthInvariantAcrossContexts && row.safetyInvariantAcrossContexts)));
for (const family of ["market-impact", "whale-watch", "shield-map", "angel", "risk-indicator"]) {
  check(`mandatory-${family}`, () => assert.ok(matrix.customerFacingRows.some((row) => row.rowId === family)));
}
check("v16-no-amendment", () => assert.equal(continuity.result, "V16_SUBSUMES_V15_NO_OWNER_DIRECTIVE_TEXT_AMENDMENT_REQUIRED"));
check("v16-text-unchanged", () => assert.equal(continuity.textChangesAppliedToV16, false));
check("no-release-promotion", () => assert.equal(policy.releaseState, "NO_GO"));

const failures = checks.filter((row) => !row.pass);
const result = {
  schemaVersion: "velmere.p39.v16-topology-verifier.v2",
  status: failures.length ? "FAIL_P39_V16_TOPOLOGY" : "PASS_P39_V16_TOPOLOGY",
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  rows: checks,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
