#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import { spawnSync } from "node:child_process";

const REVISION_ID = "VELMERE_PASS36_A102R10_ACTION_REQUIRED_EXTERNAL_NEW_TAB_PRODUCT_IMPORT_SEC_FILING_AND_WALLET_NAVIGATION_FAIL_CLOSED_NO_REAL_CREDIT";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const parseLastJson = (stdout) => {
  const text = String(stdout ?? "").trim();
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
};
const parseGroup = (argv) => {
  if (argv.length !== 2 || argv[0] !== "--group") throw new Error("a102r10_clean_group_argument");
  return argv[1];
};
const node = process.execPath;
const loader = ["--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
const noFailed = (parsed) => parsed?.failed === undefined || parsed?.failed === 0;
const statusIs = (value) => (parsed) => (parsed?.status ?? parsed?.decision ?? parsed?.suite) === value && noFailed(parsed);
const testA74 = (p) => p?.counts?.total === 58 && p?.counts?.failed === 0;
const verifyA74 = (p) => p?.total === 72 && p?.failed === 0;
const groups = {
  receipt_a: [
    { id: "a102r10_external_navigation", command: [node, ...loader, "scripts/pass36/test-a102r10-external-navigation-boundary.ts"], verify: (p) => statusIs("PASS_A102R10_EXTERNAL_NAVIGATION_FAIL_CLOSED_NO_PROMOTION")(p) && p?.checks === 59 },
    { id: "a102r9_clipboard", command: [node, ...loader, "scripts/pass36/test-a102r9-system-clipboard-private-export-boundary.ts"], verify: (p) => p?.assertions === 38 && noFailed(p) },
    { id: "a102r8_browser_privacy", command: [node, ...loader, "scripts/pass36/test-a102r8-checkout-customer-browser-privacy-boundary.ts"], verify: (p) => p?.assertions === 41 && noFailed(p) },
    { id: "a102r7_wallet_privacy", command: [node, ...loader, "scripts/pass36/test-a102r7-mobile-wallet-deeplink-privacy-boundary.ts"], verify: (p) => p?.assertions === 43 && noFailed(p) },
    { id: "a102r6_private_state", command: [node, ...loader, "scripts/pass36/test-a102r6-private-account-browser-state-boundary.ts"], verify: (p) => p?.assertions === 30 && noFailed(p) },
    { id: "a102r5_paid_boundary", command: [node, ...loader, "scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"], verify: (p) => p?.assertions === 26 && noFailed(p) },
    { id: "a74_test", command: [node, "--experimental-strip-types", ...loader, "scripts/pass36/test-a74-navigation-redirect-boundary.mjs"], verify: testA74 },
    { id: "a74_verifier", command: [node, "scripts/pass36/verify-a74-navigation-redirect-boundary.mjs"], verify: verifyA74 },
  ],
  receipt_b: [
    { id: "vlm_verify_preflight", command: [node, ...loader, "tests/security/vlm-service-verify-preflight.test.ts"], verifyText: (stdout) => stdout.includes("VLM verify signed preflight: PASS") },
    { id: "a73_cookie", command: [node, "--experimental-strip-types", ...loader, "scripts/pass36/test-a73-cookie-session-boundary.mjs"], verify: (p) => p?.counts?.total === 57 && p?.counts?.failed === 0 },
    { id: "a73_verifier", command: [node, "scripts/pass36/verify-a73-cookie-session-boundary.mjs"], verify: (p) => noFailed(p) && (p?.total === 73 || p?.checks === 73) },
    { id: "a89_red_team", command: [node, ...loader, "scripts/pass36/test-a89-account-auth-tenant-privacy-red-team.ts"], verify: statusIs("PASS_A89_LOCAL_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_NO_PROMOTION") },
    { id: "api_body_stream", command: [node, ...loader, "scripts/pass6/test-api-body-stream-boundaries.ts"], verify: (p) => p?.ok === true && p?.assertions === 37 },
    { id: "malformed_json", command: [node, ...loader, "scripts/pass4823/test-audit-malformed-json-routes.ts"], verify: (p) => p?.status === "PASS" && p?.assertions === 112 },
  ],
  receipt_c: [
    { id: "mega4800", command: [node, ...loader, "scripts/pass4800/test-mega-pass.ts"], verify: (p) => p?.assertions === 61 && noFailed(p) },
    { id: "route_dispatch", command: [node, "scripts/pass15/verify-route-dispatch-consolidation.mjs"], verify: (p) => p?.checks === 1480 && p?.failed === 0 },
    { id: "route_dispatch_tamper", command: [node, "scripts/pass15/test-route-dispatch-manifest-tamper.mjs"], verify: statusIs("PASS") },
    { id: "lazy_routes", command: [node, "scripts/pass15/verify-lazy-route-shells.mjs"], verify: (p) => p?.checks === 176 && p?.failed === 0 },
  ],
  receipt_d: [
    { id: "a59", command: [node, "scripts/pass36/test-a59-build-graph-route-css-budget-recovery.mjs"], verify: statusIs("PASS_STATIC_BUDGET_RECOVERY") },
    { id: "product_tiers", command: [node, "scripts/pass35/test-product-tier-content-contract.mjs"], verify: statusIs("PASS_PRODUCT_TIER_CONTENT_CONTRACT") },
    { id: "zero_budget", command: [node, "scripts/pass35/test-zero-budget-functional-roadmap.mjs"], verify: statusIs("PASS_ZERO_BUDGET_FUNCTIONAL_ROADMAP") },
    { id: "source_audit", command: [node, "scripts/a44-source-integrity-audit.mjs"], verify: (p) => p?.syntaxErrors === 0 && p?.missingLocalImports === 0 && p?.missingCssModuleClasses === 0 },
  ],
  core: [
    { id: "external_navigation", command: [node, ...loader, "scripts/pass36/test-a102r10-external-navigation-boundary.ts"], verify: (p) => p?.status === "PASS_A102R10_EXTERNAL_NAVIGATION_FAIL_CLOSED_NO_PROMOTION" && p?.checks === 59 && p?.failed === 0 },
    { id: "approved_changes", command: [node, "scripts/pass36/verify-a102r10-approved-external-navigation-changes.mjs"], verify: statusIs("PASS_A102R10_APPROVED_EXTERNAL_NAVIGATION_CHANGES_NO_PROMOTION") },
    { id: "local_regression_receipt", command: [node, "scripts/pass36/verify-a102r10-local-regression-receipt.mjs"], verify: statusIs("PASS_A102R10_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION") },
    { id: "descendant", command: [node, "scripts/pass36/verify-a102r10-current-root-descendant.mjs"], verify: statusIs("PASS_A102R10_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION") },
    { id: "authority", command: [node, "scripts/pass36/verify-a102r10-action-required-authority.mjs"], verify: statusIs("PASS_A102R10_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT") },
  ],
  history: [
    { id: "a74", command: [node, "scripts/pass36/verify-a74-navigation-redirect-boundary.mjs"], verify: verifyA74 },
    { id: "a88r1", command: [node, ...loader, "scripts/pass36/verify-a88r1-semantic-route-privacy-pdf.ts"], verify: statusIs("PASS_A88R1_VERIFIER_NO_PROMOTION") },
    { id: "a89", command: [node, ...loader, "scripts/pass36/verify-a89-account-auth-tenant-privacy-red-team.ts"], verify: statusIs("PASS_A89_VERIFIER_NO_PROMOTION") },
    { id: "a89_frozen_chain", command: [node, "scripts/pass36/verify-a89-current-root-descendant.mjs"], verify: statusIs("PASS_A89_DESCENDANT_NO_PROMOTION") },
    { id: "a57", command: [node, "scripts/pass35/test-a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs"], verify: (p) => p?.checks === 1138 && p?.failed === 0 },
    { id: "a59", command: [node, "scripts/pass36/test-a59-build-graph-route-css-budget-recovery.mjs"], verify: statusIs("PASS_STATIC_BUDGET_RECOVERY") },
  ],
  route_product: [
    { id: "route_dispatch", command: [node, "scripts/pass15/verify-route-dispatch-consolidation.mjs"], verify: (p) => p?.checks === 1480 && p?.failed === 0 },
    { id: "route_tamper", command: [node, "scripts/pass15/test-route-dispatch-manifest-tamper.mjs"], verify: statusIs("PASS") },
    { id: "lazy_routes", command: [node, "scripts/pass15/verify-lazy-route-shells.mjs"], verify: (p) => p?.checks === 176 && p?.failed === 0 },
    { id: "product_tiers", command: [node, "scripts/pass35/test-product-tier-content-contract.mjs"], verify: statusIs("PASS_PRODUCT_TIER_CONTENT_CONTRACT") },
    { id: "zero_budget", command: [node, "scripts/pass35/test-zero-budget-functional-roadmap.mjs"], verify: statusIs("PASS_ZERO_BUDGET_FUNCTIONAL_ROADMAP") },
  ],
  operational: [
    { id: "a102_observation", command: [node, "scripts/pass36/test-a102-repeated-slo-vendor-exit-observation-boundaries.mjs"], verify: statusIs("PASS_A102R1_STRUCTURAL_BOUNDARY_LOCAL_SYNTHETIC_ONLY_REAL_CLAIMS_REJECTED") },
    { id: "a102r2_local_p1", command: [node, ...loader, "scripts/pass36/test-a102r2-local-p1-hardening.ts"], verify: statusIs("PASS_A102R2_LOCAL_P1_HARDENING_NO_PROMOTION") },
    { id: "provider_rights", command: [node, ...loader, "scripts/pass36/test-a102r2-provider-rights-egress-gate.ts"], verify: statusIs("PASS_A102R2_PROVIDER_RIGHTS_EGRESS_FAIL_CLOSED_NO_PROMOTION") },
    { id: "a102r9_clipboard", command: [node, ...loader, "scripts/pass36/test-a102r9-system-clipboard-private-export-boundary.ts"], verify: (p) => p?.assertions === 38 && noFailed(p) },
    { id: "a102r8_privacy", command: [node, ...loader, "scripts/pass36/test-a102r8-checkout-customer-browser-privacy-boundary.ts"], verify: (p) => p?.assertions === 41 && noFailed(p) },
    { id: "a102r7_wallet", command: [node, ...loader, "scripts/pass36/test-a102r7-mobile-wallet-deeplink-privacy-boundary.ts"], verify: (p) => p?.assertions === 43 && noFailed(p) },
    { id: "a102r6_state", command: [node, ...loader, "scripts/pass36/test-a102r6-private-account-browser-state-boundary.ts"], verify: (p) => p?.assertions === 30 && noFailed(p) },
    { id: "a102r5_paid", command: [node, ...loader, "scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"], verify: (p) => p?.assertions === 26 && noFailed(p) },
  ],
  final_a: [
    { id: "vlm_verify", command: [node, ...loader, "tests/security/vlm-service-verify-preflight.test.ts"], verifyText: (stdout) => stdout.includes("VLM verify signed preflight: PASS") },
    { id: "mega4800", command: [node, ...loader, "scripts/pass4800/test-mega-pass.ts"], verify: (p) => p?.assertions === 61 && noFailed(p) },
    { id: "a73", command: [node, "scripts/pass36/verify-a73-cookie-session-boundary.mjs"], verify: (p) => noFailed(p) && (p?.total === 73 || p?.checks === 73) },
    { id: "cross_surface", command: [node, "scripts/pass36/verify-a94r2-cross-surface-value-truth.mjs"], verify: statusIs("PASS_A94R2_CROSS_SURFACE_VALUE_TRUTH_NO_PROMOTION") },
  ],
  final_b: [
    { id: "api_body", command: [node, ...loader, "scripts/pass6/test-api-body-stream-boundaries.ts"], verify: (p) => p?.ok === true && p?.assertions === 37 },
    { id: "malformed_json", command: [node, ...loader, "scripts/pass4823/test-audit-malformed-json-routes.ts"], verify: (p) => p?.status === "PASS" && p?.assertions === 112 },
    { id: "source_audit", command: [node, "scripts/a44-source-integrity-audit.mjs"], verify: (p) => p?.syntaxErrors === 0 && p?.missingLocalImports === 0 && p?.missingCssModuleClasses === 0 },
  ],
};
function run(row){
 const started=Date.now();
 const result=spawnSync(row.command[0],row.command.slice(1),{cwd:process.cwd(),env:{...process.env,TERM:process.env.TERM||"dumb",NO_COLOR:"1"},encoding:"utf8",maxBuffer:64*1024*1024,timeout:240000,killSignal:"SIGKILL"});
 const stdout=result.stdout??""; const stderr=result.stderr??""; const parsed=parseLastJson(stdout);
 let passed=result.status===0&&result.signal===null&&!result.error;
 if(row.verify) passed&&=Boolean(row.verify(parsed));
 if(row.verifyText) passed&&=Boolean(row.verifyText(stdout));
 return {id:row.id,command:row.command,durationMs:Date.now()-started,exitCode:result.status,signal:result.signal,spawnError:result.error?.message??null,observedStatus:parsed?.status??parsed?.decision??parsed?.suite??null,passed,stdoutBytes:Buffer.byteLength(stdout),stdoutSha256:sha256(stdout),stderrBytes:Buffer.byteLength(stderr),stderrSha256:sha256(stderr),metrics:row.id==="source_audit"?parsed:undefined};
}
try{
 const group=parseGroup(process.argv.slice(2)); const rows=groups[group]; if(!rows) throw new Error(`a102r10_unknown_group:${group}`);
 const results=[]; for(const row of rows){const out=run(row);results.push(out);if(!out.passed)break;}
 const failed=results.filter((row)=>!row.passed).length+(rows.length-results.length);
 const status=failed===0?`PASS_A102R10_CLEAN_UNPACK_GROUP_${group.toUpperCase()}_NO_PROMOTION`:`FAIL_A102R10_CLEAN_UNPACK_GROUP_${group.toUpperCase()}`;
 console.log(JSON.stringify({status,revisionId:REVISION_ID,group,checks:rows.length,executed:results.length,passed:results.filter((r)=>r.passed).length,failed,results,live:false,saleEnabled:false},null,2));
 process.exit(failed?1:0);
}catch(error){console.error(JSON.stringify({status:"FAIL_A102R10_CLEAN_UNPACK_GROUP",error:error instanceof Error?error.message:String(error)}));process.exit(1);}
