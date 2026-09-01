#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import { spawnSync } from "node:child_process";

const REVISION_ID = "VELMERE_PASS36_A102R9_ACTION_REQUIRED_SYSTEM_CLIPBOARD_PRIVATE_ACCOUNT_DOWNLOAD_SESSION_ADMIN_SUPPORT_EXPORT_REDACTION_FAIL_CLOSED_NO_REAL_CREDIT";
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
  if (argv.length !== 2 || argv[0] !== "--group") throw new Error("a102r9_clean_group_argument");
  return argv[1];
};
const node = process.execPath;
const loader = ["--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
const noFailed = (parsed) => parsed?.failed === undefined || parsed?.failed === 0;
const statusIs = (value) => (parsed) => (parsed?.status ?? parsed?.decision ?? parsed?.suite) === value && noFailed(parsed);
const groups = {
  core: [
    { id: "system_clipboard_private_export", command: [node, ...loader, "scripts/pass36/test-a102r9-system-clipboard-private-export-boundary.ts"], verify: (p) => statusIs("PASS_A102R9_SYSTEM_CLIPBOARD_PRIVATE_ACCOUNT_AND_ADMIN_EXPORT_REDACTION_NO_PROMOTION")(p) && p?.assertions === 38 },
    { id: "approved_changes", command: [node, "scripts/pass36/verify-a102r9-approved-system-clipboard-privacy-changes.mjs"], verify: (p) => statusIs("PASS_A102R9_APPROVED_SYSTEM_CLIPBOARD_PRIVACY_CHANGES_NO_PROMOTION")(p) && p?.checks === 11 },
    { id: "local_regression_receipt", command: [node, "scripts/pass36/verify-a102r9-local-regression-receipt.mjs"], verify: (p) => statusIs("PASS_A102R9_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION")(p) && p?.checks === 16 },
    { id: "descendant", command: [node, "scripts/pass36/verify-a102r9-current-root-descendant.mjs"], verify: (p) => statusIs("PASS_A102R9_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION")(p) && p?.checks === 12 },
    { id: "authority", command: [node, "scripts/pass36/verify-a102r9-action-required-authority.mjs"], verify: (p) => statusIs("PASS_A102R9_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT")(p) && p?.checks === 19 },
  ],
  history: [
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
    { id: "a102r8_checkout_customer_privacy", command: [node, ...loader, "scripts/pass36/test-a102r8-checkout-customer-browser-privacy-boundary.ts"], verify: (p) => statusIs("PASS_A102R8_CHECKOUT_PII_AUDIT_CASE_AND_PDF_METADATA_BROWSER_PERSISTENCE_FAIL_CLOSED_NO_PROMOTION")(p) && p?.assertions === 41 },
    { id: "a102r7_mobile_wallet_privacy", command: [node, ...loader, "scripts/pass36/test-a102r7-mobile-wallet-deeplink-privacy-boundary.ts"], verify: (p) => statusIs("PASS_A102R7_MOBILE_WALLET_DEEPLINK_QUERY_HASH_PRIVATE_PATH_FAIL_CLOSED_NO_PROMOTION")(p) && p?.assertions === 43 },
    { id: "a102r6_private_state", command: [node, ...loader, "scripts/pass36/test-a102r6-private-account-browser-state-boundary.ts"], verify: (p) => statusIs("PASS_A102R6_PRIVATE_ACCOUNT_EPHEMERAL_SERVER_CONFIRMED_BOUNDARY_NO_PROMOTION")(p) && p?.assertions === 30 },
    { id: "a102r5_paid_boundary", command: [node, ...loader, "scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"], verify: (p) => statusIs("PASS_A102R5_SERVER_ACCOUNT_ENTITLEMENT_NO_BROWSER_BEARER_PERSISTENCE")(p) && p?.assertions === 26 },
  ],
  regression_core: [
    { id: "a102r9_system_clipboard_private_export", command: [node, ...loader, "scripts/pass36/test-a102r9-system-clipboard-private-export-boundary.ts"], verify: (p) => statusIs("PASS_A102R9_SYSTEM_CLIPBOARD_PRIVATE_ACCOUNT_AND_ADMIN_EXPORT_REDACTION_NO_PROMOTION")(p) && p?.assertions === 38 },
    { id: "a102r8_checkout_customer_browser_privacy", command: [node, ...loader, "scripts/pass36/test-a102r8-checkout-customer-browser-privacy-boundary.ts"], verify: (p) => statusIs("PASS_A102R8_CHECKOUT_PII_AUDIT_CASE_AND_PDF_METADATA_BROWSER_PERSISTENCE_FAIL_CLOSED_NO_PROMOTION")(p) && p?.assertions === 41 },
    { id: "a102r6_private_account_browser_state", command: [node, ...loader, "scripts/pass36/test-a102r6-private-account-browser-state-boundary.ts"], verify: (p) => statusIs("PASS_A102R6_PRIVATE_ACCOUNT_EPHEMERAL_SERVER_CONFIRMED_BOUNDARY_NO_PROMOTION")(p) && p?.assertions === 30 },
    { id: "a102r5_paid_boundary", command: [node, ...loader, "scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"], verify: (p) => statusIs("PASS_A102R5_SERVER_ACCOUNT_ENTITLEMENT_NO_BROWSER_BEARER_PERSISTENCE")(p) && p?.assertions === 26 },
    { id: "vlm_verify_preflight", command: [node, ...loader, "tests/security/vlm-service-verify-preflight.test.ts"], verifyText: (stdout) => stdout.includes("VLM verify signed preflight: PASS") },
    { id: "a73_cookie", command: [node, "--experimental-strip-types", ...loader, "scripts/pass36/test-a73-cookie-session-boundary.mjs"], verify: (p) => p?.counts?.total === 57 && p?.counts?.failed === 0 },
    { id: "a73_verifier", command: [node, "scripts/pass36/verify-a73-cookie-session-boundary.mjs"], verify: (p) => noFailed(p) && (p?.total === 73 || p?.checks === 73) },
    { id: "a89_red_team", command: [node, ...loader, "scripts/pass36/test-a89-account-auth-tenant-privacy-red-team.ts"], verify: statusIs("PASS_A89_LOCAL_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_NO_PROMOTION") },
    { id: "api_body_stream", command: [node, ...loader, "scripts/pass6/test-api-body-stream-boundaries.ts"], verify: (p) => p?.ok === true && p?.assertions === 37 },
    { id: "malformed_json", command: [node, ...loader, "scripts/pass4823/test-audit-malformed-json-routes.ts"], verify: (p) => p?.status === "PASS" && p?.assertions === 112 },
  ],
  regression_extended_a: [
    { id: "mega4800", command: [node, ...loader, "scripts/pass4800/test-mega-pass.ts"], verify: (p) => p?.assertions === 61 && noFailed(p) },
    { id: "route_dispatch", command: [node, "scripts/pass15/verify-route-dispatch-consolidation.mjs"], verify: (p) => p?.checks === 1480 && p?.failed === 0 },
    { id: "route_dispatch_tamper", command: [node, "scripts/pass15/test-route-dispatch-manifest-tamper.mjs"], verify: statusIs("PASS") },
    { id: "lazy_routes", command: [node, "scripts/pass15/verify-lazy-route-shells.mjs"], verify: (p) => p?.checks === 176 && p?.failed === 0 },
  ],
  regression_extended_b1: [
    { id: "a59", command: [node, "scripts/pass36/test-a59-build-graph-route-css-budget-recovery.mjs"], verify: statusIs("PASS_STATIC_BUDGET_RECOVERY") },
    { id: "product_tiers", command: [node, "scripts/pass35/test-product-tier-content-contract.mjs"], verify: statusIs("PASS_PRODUCT_TIER_CONTENT_CONTRACT") },
    { id: "zero_budget", command: [node, "scripts/pass35/test-zero-budget-functional-roadmap.mjs"], verify: statusIs("PASS_ZERO_BUDGET_FUNCTIONAL_ROADMAP") },
    { id: "source_audit", command: [node, "scripts/a44-source-integrity-audit.mjs"], verify: (p) => p?.syntaxErrors === 0 && p?.missingLocalImports === 0 && p?.missingCssModuleClasses === 0 },
  ],
  final_a: [
    { id: "vlm_verify", command: [node, ...loader, "tests/security/vlm-service-verify-preflight.test.ts"], verifyText: (stdout) => stdout.includes("VLM verify signed preflight: PASS") },
    { id: "mega4800", command: [node, ...loader, "scripts/pass4800/test-mega-pass.ts"], verify: (p) => p?.assertions === 61 && noFailed(p) },
    { id: "a73", command: [node, "scripts/pass36/verify-a73-cookie-session-boundary.mjs"], verify: (p) => noFailed(p) && (p?.total === 73 || p?.checks === 73) },
    { id: "cross_surface", command: [node, "scripts/pass36/verify-a94r2-cross-surface-value-truth.mjs"], verify: statusIs("PASS_LOCAL_CROSS_SURFACE_VALUE_TRUTH_NO_PAID_OR_REAL_CREDIT") },
  ],
  final_b1: [
    { id: "api_body", command: [node, ...loader, "scripts/pass6/test-api-body-stream-boundaries.ts"], verify: (p) => p?.ok === true && p?.assertions === 37 },
    { id: "malformed_json", command: [node, ...loader, "scripts/pass4823/test-audit-malformed-json-routes.ts"], verify: (p) => p?.status === "PASS" && p?.assertions === 112 },
  ],
};

const group = parseGroup(process.argv.slice(2));
const stages = groups[group];
if (!stages) throw new Error(`a102r9_clean_group_unknown:${group}`);
const results = [];
for (const stage of stages) {
  const started = Date.now();
  const run = spawnSync(stage.command[0], stage.command.slice(1), {
    cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000, killSignal: "SIGKILL",
  });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  const parsed = parseLastJson(stdout);
  const passed = run.status === 0 && run.signal === null && !run.error
    && (stage.verify ? stage.verify(parsed) : stage.verifyText(stdout));
  results.push({
    id: stage.id, command: stage.command, exitCode: run.status, signal: run.signal,
    spawnError: run.error?.message ?? null, durationMs: Date.now() - started,
    stdoutBytes: Buffer.byteLength(stdout), stdoutSha256: sha256(stdout),
    stderrBytes: Buffer.byteLength(stderr), stderrSha256: sha256(stderr),
    observedStatus: parsed?.status ?? parsed?.decision ?? parsed?.suite ?? null,
    metrics: parsed && typeof parsed === "object" ? {
      checks: parsed.checks ?? null, assertions: parsed.assertions ?? null,
      passed: parsed.passed ?? null, failed: parsed.failed ?? null,
      filesRead: parsed.filesRead ?? null, codeFiles: parsed.codeFiles ?? null,
      syntaxErrors: parsed.syntaxErrors ?? null,
      missingLocalImports: parsed.missingLocalImports ?? null,
      missingCssModuleClasses: parsed.missingCssModuleClasses ?? null,
    } : null,
    passed,
  });
  if (!passed) break;
}
const failed = results.filter((row) => !row.passed);
const output = {
  schemaVersion: "velmere.pass36.a102r9.clean-unpack-group-verification.v1",
  revisionId: REVISION_ID,
  group,
  status: failed.length || results.length !== stages.length
    ? `FAIL_A102R9_CLEAN_UNPACK_GROUP_${group.toUpperCase()}`
    : `PASS_A102R9_CLEAN_UNPACK_GROUP_${group.toUpperCase()}_NO_PROMOTION`,
  checks: stages.length, passed: results.filter((row) => row.passed).length,
  failed: failed.length + (results.length === stages.length ? 0 : stages.length - results.length),
  failures: failed, results,
  live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
console.log(JSON.stringify(output, null, 2));
if (output.failed) process.exit(1);
