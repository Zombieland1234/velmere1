#!/usr/bin/env node
import fs from "node:fs";
import {
  REV, PARENT, RECEIPT, STATE,
} from "./a102r3-source-boundary.mjs";

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const receipt = read(RECEIPT);
const state = read(STATE);
const checks = [];
const add = (id, passed, detail = null) =>
  checks.push({ id, passed: Boolean(passed), detail });
const digest = /^[a-f0-9]{64}$/u;
add("receipt:identity", receipt.revisionId === REV && receipt.parentRevisionId === PARENT);
add("receipt:phase", receipt.phase === "FINAL", receipt.phase);
add("receipt:status", receipt.status === "PASS_A102R3_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION", receipt.status);
add("receipt:rows", Array.isArray(receipt.results) && receipt.results.length >= 25
  && receipt.results.every((row) => row.passed === true && digest.test(row.stdoutSha256) && digest.test(row.stderrSha256)),
  receipt.summary);
add("receipt:blocked-environment", Array.isArray(receipt.environmentBlockers)
  && receipt.environmentBlockers.length === 2
  && receipt.environmentBlockers.every((row) => row.classification === "BLOCKED_ENVIRONMENT"
    && row.moduleNotFound === true && row.credit === false && digest.test(row.stderrSha256)),
  receipt.environmentBlockers);
add("receipt:core-denominators", receipt.keyDenominators?.a57Checks === 1138
  && receipt.keyDenominators?.a59Checks === 77
  && receipt.keyDenominators?.routeDispatchChecks === 1480
  && receipt.keyDenominators?.routeRoutes === 160
  && receipt.keyDenominators?.routeTamperChecks === 7
  && receipt.keyDenominators?.lazyRouteChecks === 176
  && receipt.keyDenominators?.productTierChecks === 186
  && receipt.keyDenominators?.zeroBudgetChecks === 439);
add("receipt:products", receipt.keyDenominators?.shieldAssets === 318
  && receipt.keyDenominators?.shieldProMapAssets === 318
  && receipt.keyDenominators?.realMarketsInstruments === 583
  && receipt.keyDenominators?.marketImpactWhaleAssets === 318
  && receipt.keyDenominators?.brainAngelRiskRealCases === 0);
add("receipt:pdf", receipt.pdfAudit?.documents === 450
  && receipt.pdfAudit?.pages === 2100
  && receipt.pdfAudit?.pypdf === 450
  && receipt.pdfAudit?.pdfinfo === 450
  && receipt.pdfAudit?.pdftotext === 450
  && receipt.pdfAudit?.ghostscript === 450
  && receipt.pdfAudit?.realCustomerPdfCases === 0
  && receipt.pdfAudit?.saleCredit === false
  && digest.test(receipt.pdfAudit?.aggregateSha256 ?? ""));
add("receipt:source-audit", receipt.sourceAudit?.syntaxErrors === 0
  && receipt.sourceAudit?.missingLocalImports === 0
  && receipt.sourceAudit?.missingCssModuleClasses === 0,
  receipt.sourceAudit);
add("receipt:no-promotion", receipt.promotion?.globalDecision === "NO_GO"
  && receipt.promotion?.live === false
  && receipt.promotion?.saleEnabled === false
  && receipt.promotion?.productionApproved === false
  && receipt.promotion?.worldClassProven === false);
add("state:matching-boundary", state.revisionId === REV
  && state.runtimeTruth?.freshWebpackBuildOnA102R3BytesExecuted === false
  && state.runtimeTruth?.freshExactBrowserRowsExecuted === 0
  && state.localImplementation?.freshA88R2BehavioralRerunOnA102R3Bytes === false);
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  status: failed.length ? "FAIL_A102R3_LOCAL_REGRESSION_RECEIPT" : "PASS_A102R3_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION",
  revisionId: REV,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  live: false,
  saleEnabled: false,
}, null, 2));
process.exit(failed.length ? 1 : 0);
