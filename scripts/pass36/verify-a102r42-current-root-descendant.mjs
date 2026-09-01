import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REV, PARENT, MANIFEST, PARENT_MANIFEST, STATE, PROGRAM, MODE_POLICY, MODE_MIGRATION,
  APPROVED_LEDGER, SPARSE_LEDGER, AUTHORITY_MIGRATION, FAILURE_FINALIZATION_MIGRATION,
  FROZEN_REGRESSION_MIGRATION, A80_RECEIPT_MIGRATION, PACKAGE_BOUNDARY_MIGRATION, A78_MIGRATION, DESCENDANT_VERIFIER_MIGRATION, A42_REBASELINE, sha256, canonicalJson, collect, payload,
} from "./a102r42-source-boundary.mjs";
import { verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { verifyA102R42StaticSemanticDocuments } from "./verify-a102r42-static-semantic-documents.mjs";

const root = process.cwd();
const read = (relativePath) => parseStrictJsonCli(fs.readFileSync(path.join(root, relativePath), "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const manifest = read(MANIFEST);
const parentBytes = fs.readFileSync(path.join(root, PARENT_MANIFEST));
const parent = parseStrictJsonCli(parentBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const checks = [];
const check = (id, value, detail = null) => { const row = { id, passed: Boolean(value), detail }; checks.push(row); assert.ok(row.passed, id); };
check("identity", manifest.revisionId === REV && manifest.parentRevisionId === PARENT);
check("parent", parent.revisionId === PARENT && manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256 && parent.manifestDigestSha256 === "92672a889d2a98723486e3ad3071e93d84bc3fb45b55ceb8111eaea388fbf8a6");
check("parent-raw", sha256(parentBytes) === "dfa91c49372c5a858071dbcf9c0ff0f0a1ef63722bd7fcb8e197deaf2e3e3859");
const inventory = collect(root, { platform: process.platform });
check("source-rejected", inventory.rejected.length === 0, inventory.rejected);
const observed = payload(inventory.rows);
check("payload", canonicalJson(observed) === canonicalJson(manifest.payload), { observed, declared: manifest.payload });
for (const [key, relativePath] of Object.entries({
  stateSha256: STATE,
  completionProgramSha256: PROGRAM,
  sourceModePolicySha256: MODE_POLICY,
  sourceModeMigrationSha256: MODE_MIGRATION,
  approvedChangeLedgerSha256: APPROVED_LEDGER,
  historicalSparseEdgeLedgerSha256: SPARSE_LEDGER,
  currentSourceAuthorityMigrationSha256: AUTHORITY_MIGRATION,
  failureFinalizationMigrationSha256: FAILURE_FINALIZATION_MIGRATION,
  frozenRegressionMigrationSha256: FROZEN_REGRESSION_MIGRATION,
  a80r1ReceiptMigrationSha256: A80_RECEIPT_MIGRATION,
  packageBoundaryMigrationSha256: PACKAGE_BOUNDARY_MIGRATION,
  a42CriticalRebaselineSha256: A42_REBASELINE,
  a78LockfileMigrationSha256: A78_MIGRATION,
  descendantVerifierMigrationSha256: DESCENDANT_VERIFIER_MIGRATION,
})) check(`binding:${key}`, manifest.staticBindings?.[key] === sha256(fs.readFileSync(path.join(root, relativePath))));
const core = { ...manifest }; delete core.manifestDigestSha256;
check("self-digest", manifest.manifestDigestSha256 === sha256(canonicalJson(core)));
check("authority-denominator", manifest.claims.a102r42CurrentSourceAuthorityChecks === 47 && manifest.claims.a102r42CurrentSourcePreflightScenarios === 60 && manifest.claims.a102r42DescendantVerifierChecks === 28 && manifest.claims.a102r42A80R1MechanismChecks === 48 && manifest.claims.a102r42PackageBoundaryChecks === 38 && manifest.claims.a102r42A42VerifierChecks === 54 && manifest.claims.a102r42RetainedParentFindings === 39 && manifest.claims.a102r42NewFindings === 15);
check("browser-denominator", manifest.claims.browserRowsRequired === 56 && manifest.claims.browserScenarioChecksRequired === 57 && manifest.claims.screenshotsRequired === 29 && manifest.claims.popupTabsRequired === 4);
check("security-containment", manifest.claims.externalCommandExecutionCredit === false && manifest.claims.durableAccountOperationWorkflowsImplemented === 0 && manifest.claims.durableOpaqueCheckoutFlowImplemented === false && manifest.claims.paidCheckoutStopSellActive === true);
const { formalOpenEntries, ...realDenominators } = manifest.denominators;
check("real-denominators-zero", Number.isInteger(formalOpenEntries) && formalOpenEntries > 0 && Object.values(realDenominators).every((value) => typeof value === "number" ? value === 0 : value?.verified === 0 || value?.verified === undefined), manifest.denominators);
check("sku", manifest.skuDecisions.basic.decision === "PILOT_ONLY_FREE_PRESCREEN" && manifest.skuDecisions.basic.priceRecommendation === null && manifest.skuDecisions.pro.decision === "NOT_FOR_SALE" && manifest.skuDecisions.pro.priceRecommendation === null && manifest.skuDecisions.advanced.decision === "NOT_FOR_SALE" && manifest.skuDecisions.advanced.priceRecommendation === null && manifest.skuDecisions.paidPdfTiers.decision === "NOT_FOR_SALE" && manifest.skuDecisions.paidPdfTiers.priceRecommendation === null);
check("promotion", manifest.claims.liveProven === false && manifest.claims.saleEnabled === false && manifest.claims.productionApproved === false && manifest.claims.worldClassProven === false);
const semanticDocuments = verifyA102R42StaticSemanticDocuments(root);
check("static-semantic-documents", semanticDocuments.checks === 8 && semanticDocuments.passed === 8 && semanticDocuments.failed === 0, semanticDocuments.rows.filter((row) => !row.passed));
const chain = verifyHistoricalDescendantChain(root, "config/pass36/a80-current-root-descendant-manifest.json", REV);
check("historical-chain", chain.ok && chain.current?.revisionId === REV && chain.checks.length === 422, chain.checks.filter((row) => !row.passed));
assert.equal(checks.length, 28, "a102r42_descendant_verifier_denominator");
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r42.current-root-descendant-verification.v1",
  revisionId: REV,
  status: failed.length === 0 ? "PASS_A102R42_CURRENT_ROOT_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION" : "FAIL_A102R42_CURRENT_ROOT_DESCENDANT",
  checks: checks.length, passed: checks.length - failed.length, failed: failed.length,
  historicalChainChecks: chain.checks.length, payload: manifest.payload, manifestDigestSha256: manifest.manifestDigestSha256,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
  failures: failed,
}, null, 2));
if (failed.length > 0) process.exit(1);
