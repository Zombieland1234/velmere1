#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REV, PARENT, MANIFEST, PARENT_MANIFEST, STATE, PROGRAM, MODE_POLICY, MODE_MIGRATION,
  APPROVED_LEDGER, SPARSE_LEDGER, AUTHORITY_MIGRATION, A78_MIGRATION,
  sha256, canonicalJson, collect, payload,
} from "./a102r41-source-boundary.mjs";
import { verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";

const root = process.cwd();
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const manifest = read(MANIFEST);
const parent = read(PARENT_MANIFEST);
const checks = [];
const check = (id, value, detail = null) => { checks.push({ id, passed: Boolean(value), detail }); assert.ok(value, id); };
check("identity", manifest.revisionId === REV && manifest.parentRevisionId === PARENT);
check("parent", parent.revisionId === PARENT && manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256 && parent.manifestDigestSha256 === "70e421274d421f299da37ded54e09a4a46833ec8d1c588ae2fbaa97307b578be");
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
  a78LockfileMigrationSha256: A78_MIGRATION,
})) check(`binding:${key}`, manifest.staticBindings?.[key] === sha256(fs.readFileSync(path.join(root, relativePath))));
const core = { ...manifest }; delete core.manifestDigestSha256;
check("self-digest", manifest.manifestDigestSha256 === sha256(canonicalJson(core)));
check("authority-denominator", manifest.claims.a102r41CurrentSourceAuthorityChecks === 46 && manifest.claims.a102r41HistoricalSparseEdgeLedgerChecks === 11);
check("browser-denominator", manifest.claims.browserRowsRequired === 56 && manifest.claims.screenshotsRequired === 29 && manifest.claims.popupTabsRequired === 4);
check("security-containment", manifest.claims.externalCommandExecutionCredit === false && manifest.claims.durableAccountOperationWorkflowsImplemented === 0 && manifest.claims.durableOpaqueCheckoutFlowImplemented === false && manifest.claims.paidCheckoutStopSellActive === true);
const { formalOpenEntries, ...realDenominators } = manifest.denominators;
check("real-denominators-zero", Number.isInteger(formalOpenEntries) && formalOpenEntries > 0 && Object.values(realDenominators).every((value) => typeof value === "number" ? value === 0 : value?.verified === 0 || value?.verified === undefined), manifest.denominators);
check("sku", manifest.skuDecisions.basic.decision === "PILOT_ONLY_FREE_PRESCREEN" && manifest.skuDecisions.pro.decision === "NOT_FOR_SALE" && manifest.skuDecisions.advanced.decision === "NOT_FOR_SALE" && manifest.skuDecisions.paidPdfTiers.decision === "NOT_FOR_SALE");
check("promotion", manifest.claims.liveProven === false && manifest.claims.saleEnabled === false && manifest.claims.productionApproved === false && manifest.claims.worldClassProven === false);
const chain = verifyHistoricalDescendantChain(root, "config/pass36/a80-current-root-descendant-manifest.json", REV);
check("historical-chain", chain.ok && chain.current?.revisionId === REV, chain.checks.filter((row) => !row.passed));
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r41.current-root-descendant-verification.v1", revisionId: REV, status: failed.length === 0 ? "PASS_A102R41_CURRENT_ROOT_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION" : "FAIL", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, historicalChainChecks: chain.checks.length, payload: manifest.payload, manifestDigestSha256: manifest.manifestDigestSha256, globalDecision: "NO_GO", live: false, saleEnabled: false, failures: failed }, null, 2));
if (failed.length) process.exit(1);
