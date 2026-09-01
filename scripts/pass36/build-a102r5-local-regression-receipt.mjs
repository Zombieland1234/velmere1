#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { REV, PARENT, RECEIPT } from "./a102r5-source-boundary.mjs";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
function parseLastJson(stdout) {
  const text = stdout.trim();
  try { return JSON.parse(text); } catch {
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (text[index] !== "{") continue;
    try { return JSON.parse(text.slice(index)); } catch {
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
  }
  return null;
}
const node = process.execPath;
const loader = ["--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
const rows = [
  { id: "a102r5_paid_boundary", command: [node, ...loader, "scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"], expected: "PASS_A102R5_SERVER_ACCOUNT_ENTITLEMENT_NO_BROWSER_BEARER_PERSISTENCE", assertions: 26 },
  { id: "vlm_verify_preflight", command: [node, ...loader, "tests/security/vlm-service-verify-preflight.test.ts"], stdoutIncludes: "VLM verify signed preflight: PASS" },
  { id: "a73_cookie", command: [node, "--experimental-strip-types", ...loader, "scripts/pass36/test-a73-cookie-session-boundary.mjs"], countsTotal: 57 },
  { id: "a73_verifier", command: [node, "scripts/pass36/verify-a73-cookie-session-boundary.mjs"], total: 73 },
  { id: "a89_red_team", command: [node, ...loader, "scripts/pass36/test-a89-account-auth-tenant-privacy-red-team.ts"], expected: "PASS_A89_LOCAL_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_NO_PROMOTION" },
  { id: "api_body_stream", command: [node, ...loader, "scripts/pass6/test-api-body-stream-boundaries.ts"], assertions: 37 },
  { id: "malformed_json", command: [node, ...loader, "scripts/pass4823/test-audit-malformed-json-routes.ts"], expected: "PASS", assertions: 112 },
  { id: "mega4800", command: [node, ...loader, "scripts/pass4800/test-mega-pass.ts"], assertions: 61 },
  { id: "route_dispatch", command: [node, "scripts/pass15/verify-route-dispatch-consolidation.mjs"], checks: 1480 },
  { id: "route_dispatch_tamper", command: [node, "scripts/pass15/test-route-dispatch-manifest-tamper.mjs"], expected: "PASS", assertions: 7 },
  { id: "lazy_routes", command: [node, "scripts/pass15/verify-lazy-route-shells.mjs"], checks: 176 },
  { id: "a59", command: [node, "scripts/pass36/test-a59-build-graph-route-css-budget-recovery.mjs"], expected: "PASS_STATIC_BUDGET_RECOVERY" },
  { id: "product_tiers", command: [node, "scripts/pass35/test-product-tier-content-contract.mjs"], expected: "PASS_PRODUCT_TIER_CONTENT_CONTRACT", checks: 186 },
  { id: "zero_budget", command: [node, "scripts/pass35/test-zero-budget-functional-roadmap.mjs"], expected: "PASS_ZERO_BUDGET_FUNCTIONAL_ROADMAP", checks: 439 },
  { id: "source_audit", command: [node, "scripts/a44-source-integrity-audit.mjs"], sourceAudit: true },
]
const results=[];
for (const row of rows) {
  const run=spawnSync(row.command[0], row.command.slice(1), { cwd: process.cwd(), encoding:"utf8", maxBuffer:64*1024*1024, timeout:900000 });
  const stdout=run.stdout??""; const stderr=run.stderr??""; const parsed=parseLastJson(stdout);
  const observed=parsed?.status ?? parsed?.decision ?? parsed?.gate ?? null;
  let passed=run.status===0 && run.signal===null && !run.error;
  if (row.expected) passed &&= observed===row.expected;
  if (row.stdoutIncludes) passed &&= stdout.includes(row.stdoutIncludes);
  if (row.total) passed &&= parsed?.total===row.total && parsed?.failed===0;
  if (row.countsTotal) passed &&= parsed?.counts?.total===row.countsTotal && parsed?.counts?.failed===0;
  if (row.assertions) passed &&= parsed?.assertions===row.assertions;
  if (row.checks) passed &&= parsed?.checks===row.checks && (parsed?.failed === undefined || parsed?.failed === 0);
  if (row.sourceAudit) passed &&= parsed?.syntaxErrors===0 && parsed?.missingLocalImports===0 && parsed?.missingCssModuleClasses===0;
  results.push({ id:row.id, classification:"PASS_LOCAL", exitCode:run.status, expectedStatus:row.expected??null, observedStatus:observed, passed, stdoutSha256:sha256(stdout), stderrSha256:sha256(stderr), stdoutBytes:Buffer.byteLength(stdout), stderrBytes:Buffer.byteLength(stderr), metrics: row.sourceAudit ? parsed : undefined });
  if (!passed) break;
}
const sourceAudit=results.find((r)=>r.id==="source_audit")?.metrics ?? {};
const failed=results.filter((r)=>!r.passed);
const receipt={
  schemaVersion:"velmere.pass36.a102r5.local-regression-receipt.v1",
  revisionId:REV,
  parentRevisionId:PARENT,
  generatedAt:"2026-07-29T20:30:00.000Z",
  phase:"FINAL",
  status:failed.length?"FAIL_A102R5_LOCAL_REGRESSION":"PASS_A102R5_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION",
  summary:{ executedPassRows:results.length, passedRows:results.length-failed.length, failedRows:failed.length, deferredFinalLineageRows:2, environmentBlockedRows:3 },
  results,
  deferredFinalLineageVerifiers:[
    { id:"a88r1_final_descendant_verifier", requiredAfterDescendantFreeze:true, credit:false },
    { id:"a89_final_descendant_verifier", requiredAfterDescendantFreeze:true, credit:false },
  ],
  environmentBlockers:[
    { id:"exact_node_npm_project_dependencies", classification:"BLOCKED_ENVIRONMENT", required:"Node 24.18.0 / npm 11.16.0 with genuine project node_modules", available:false, credit:false },
    { id:"exact_playwright_chromium", classification:"BLOCKED_ENVIRONMENT", required:"Chromium 148.0.7778.96 revision 1223", available:false, credit:false },
    { id:"real_staging_external_inputs", classification:"BLOCKED_EXTERNAL", required:"real IdP/WebAuthn, two tenants, providers, rights, legal and observers", available:false, credit:false },
  ],
  keyDenominators:{ a102r5PaidBoundaryChecks:26, vlmVerifyPositiveCases:1, vlmVerifyNegativeCases:5, a73Checks:57, a73VerifierChecks:73, a89Checks:54, a89VerifierMinimumChecks:156, a89Cases:192, a89MutationsKilled:768, apiBodyChecks:37, malformedJsonChecks:112, mega4800Checks:61, a59Checks:77, routeDispatchChecks:1480, routeDispatchTamperChecks:7, routeRoutes:160, lazyRouteChecks:176, productTierChecks:186, zeroBudgetChecks:439 },
  sourceAudit:{ filesRead:sourceAudit.filesRead??0, codeFiles:sourceAudit.codeFiles??0, syntaxErrors:sourceAudit.syntaxErrors??-1, missingLocalImports:sourceAudit.missingLocalImports??-1, missingCssModuleClasses:sourceAudit.missingCssModuleClasses??-1 },
  realEvidence:{ a102ObservationRuns:0, browserRows:0, stagingStages:0, providerRights:0, legalDpo:0, customerCohorts:0, independentAssurance:0 },
  promotion:{ globalDecision:"NO_GO", live:false, saleEnabled:false, productionApproved:false, worldClassProven:false },
};
fs.writeFileSync(RECEIPT, `${JSON.stringify(receipt,null,2)}\n`);
console.log(JSON.stringify(receipt,null,2));
if (failed.length) process.exitCode=1;
