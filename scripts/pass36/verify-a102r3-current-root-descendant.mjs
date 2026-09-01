#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REV, PARENT, MANIFEST, PARENT_MANIFEST, STATE, PROGRAM, RECEIPT,
  sha256, canonicalJson, readJson, collect, payload,
} from "./a102r3-source-boundary.mjs";

const root = process.cwd();
const manifest = readJson(root, MANIFEST);
const parent = readJson(root, PARENT_MANIFEST);
const authority = readJson(root, "config/pass36/current-release-authority.json");
const state = readJson(root, STATE);
const program = readJson(root, PROGRAM);
const receiptBytes = fs.readFileSync(path.join(root, RECEIPT));
const inventory = collect(root);
const checks = [];
const add = (id, passed, detail = null) =>
  checks.push({ id, passed: Boolean(passed), detail });
add("manifest:revision", manifest.revisionId === REV, manifest.revisionId);
add("manifest:parent", manifest.parentRevisionId === PARENT, manifest.parentRevisionId);
add("manifest:parent-identity", parent.revisionId === PARENT && Boolean(parent.manifestDigestSha256));
add("manifest:parent-digest", manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256);
const core = { ...manifest };
delete core.manifestDigestSha256;
add("manifest:self-digest", manifest.manifestDigestSha256 === sha256(canonicalJson(core)));
add("manifest:inventory-safe", inventory.rejected.length === 0, inventory.rejected);
add("manifest:payload", JSON.stringify(manifest.payload) === JSON.stringify(payload(inventory.rows)), {
  expected: manifest.payload, observed: payload(inventory.rows),
});
add("manifest:receipt-binding", manifest.localRegressionReceiptSha256 === sha256(receiptBytes));
add("authority:current", authority.authorityRevisionId === REV
  && authority.currentSource?.revisionId === REV
  && authority.currentRootDescendantManifestPath === MANIFEST
  && authority.worldClassCompletionProgramPath === PROGRAM);
add("state:current", state.revisionId === REV && state.parentRevisionId === PARENT
  && state.passCredit?.A102 === false && state.passCredit?.A103ToA116 === false);
add("program:current", program.revisionId === REV && program.parentRevisionId === PARENT
  && program.formalRemainingEntries === 31);
add("claims:no-promotion", manifest.claims?.a102PassCredit === false
  && manifest.claims?.a103PassCredit === false
  && manifest.claims?.a116PassCredit === false
  && manifest.claims?.a88r2FreshSourceBoundCredit === false
  && manifest.claims?.freshExactBuildBrowserCredit === false
  && manifest.claims?.realObservationRuns === 0
  && manifest.claims?.stagingCredit === false
  && manifest.claims?.saleEnabled === false
  && manifest.claims?.liveProven === false
  && manifest.claims?.productionApproved === false
  && manifest.claims?.worldClassProven === false,
  manifest.claims);
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  decision: failed.length ? "FAIL" : "PASS_A102R3_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
}, null, 2));
process.exit(failed.length ? 1 : 0);
