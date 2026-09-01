#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { writeA59Receipt } from "./a59-external-receipt-boundary.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a59-build-graph-route-css-budget-recovery.json"), "utf8"));
const test = spawnSync(process.execPath, ["scripts/pass36/test-a59-build-graph-route-css-budget-recovery.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
let result = null;
try { result = JSON.parse(test.stdout); } catch (ignoredError) { void ignoredError; }
const passed = test.status === 0 && result?.status === "PASS_STATIC_BUDGET_RECOVERY";
const verification = {
  schemaVersion: "velmere.pass36.a59.build-graph-route-css-budget-recovery-verification.v1",
  revisionId: policy.revisionId,
  status: passed ? "PASS_STATIC_BUDGET_RECOVERY_NO_PROMOTION" : "FAIL_STATIC_BUDGET_RECOVERY",
  promotionAllowed: false,
  exactFinalByteBuildExecuted: false,
  browserScreenshotParityExecuted: false,
  staticResult: result,
  blockers: [
    "EXACT_NODE_24_18_NPM_11_16_FINAL_BYTE_WEBPACK_TURBOPACK_NOT_EXECUTED",
    "FINAL_BROWSER_SCREENSHOT_AND_RUNTIME_PARITY_NOT_EXECUTED",
    "FINAL_CURRENT_ROOT_30_OF_30_MUST_BE_REEXECUTED_ON_FROZEN_BYTES",
    "REAL_STAGING_PROVIDER_RIGHTS_CUSTOMER_AND_ASSURANCE_EVIDENCE_MISSING"
  ],
  saleEnabled: false,
  liveProven: false,
  truthBoundary: policy.truthBoundary
};
writeA59Receipt({
  sourceRoot: root,
  fileName: "PASS36_A59_BUILD_GRAPH_ROUTE_CSS_BUDGET_RECOVERY_VERIFICATION.json",
  content: `${JSON.stringify(verification, null, 2)}\n`,
});
console.log(JSON.stringify(verification, null, 2));
if (!passed) process.exit(1);
