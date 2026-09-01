#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REV = "VELMERE_PASS36_A102R44P23_ACTION_REQUIRED_LOCAL_DISPOSABLE_CUSTOMER_LIFECYCLE_REFUND_REVOCATION_DELETE_AND_DURABLE_DELIVERY_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P22_ACTION_REQUIRED_RUTHLESS_CUSTOMER_SECURE_PAID_PREVIEW_RISK_TIER_SPLIT_CROSS_ASSET_AND_LEGAL_DATA_ALTERNATIVES_NO_LIVE_CREDIT";
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p23-disposable-customer-lifecycle-policy.json"), "utf8"));
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p23-action-required-current-state.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const runtime = fs.readFileSync(path.join(ROOT, "lib/security/audit-disposable-customer-lifecycle.mjs"), "utf8");
const worker = fs.readFileSync(path.join(ROOT, "scripts/pass36/a102r44p23-disposable-lifecycle-worker.mjs"), "utf8");
const e2e = fs.readFileSync(path.join(ROOT, "scripts/pass36/test-a102r44p23-disposable-customer-lifecycle-e2e.mjs"), "utf8");
const active = fs.readFileSync(path.join(ROOT, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim();
const appApi = path.join(ROOT, "app/api");

const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const requiredFiles = [
  "lib/security/audit-disposable-customer-lifecycle.mjs",
  "scripts/pass36/a102r44p23-disposable-lifecycle-worker.mjs",
  "scripts/pass36/test-a102r44p23-disposable-customer-lifecycle-e2e.mjs",
  "scripts/pass36/test-a102r44p23-disposable-customer-lifecycle-repeatability.mjs",
  "scripts/pass36/build-a102r44p23-lifecycle-persona-matrix.mjs",
  "scripts/pass36/test-a102r44p23-lifecycle-persona-matrix.mjs",
  "scripts/pass36/verify-a102r44p23-local-e2e-denominator-migration.mjs",
  "config/pass36/a102r44p23-local-e2e-denominator-migration.json",
];

add("revision", policy.revisionId === REV && state.revisionId === REV && active === REV);
add("parent", policy.parentRevisionId === PARENT && state.parentRevisionId === PARENT);
add("classification-local-not-staging", policy.classification === "LOCAL_DISPOSABLE_RUNTIME_E2E_NOT_STAGING");
add("minimum-assertions", policy.minimumAssertions === 63 && state.implemented?.lifecycleAssertions === 63);
add("required-flows", Array.isArray(policy.requiredFlows) && policy.requiredFlows.length === 12 && state.implemented?.lifecycleFlows === 12);
add("required-files", requiredFiles.every((rel) => fs.existsSync(path.join(ROOT, rel))));
add("global-no-go", state.globalDecision === "NO_GO");
add("global-flags-false", [state.LIVE, state.saleEnabled, state.productionApproved, state.worldClassProven].every((value) => value === false));
add("basic-always-free", policy.nonNegotiable?.basicAlwaysFree === true && policy.nonNegotiable?.basicPaymentRequired === false);
add("pro-controlled-beta", policy.nonNegotiable?.proControlledBetaOnly === true && policy.nonNegotiable?.proPublicCheckoutAllowed === false);
add("advanced-not-for-sale", policy.nonNegotiable?.advancedForSale === false && state.skuDecisions?.advanced === "NOT_FOR_SALE");
add("wrong-account-denied", policy.nonNegotiable?.wrongAccountDenied === true && e2e.includes("WRONG_ACCOUNT"));
add("one-time-token", policy.nonNegotiable?.downloadTokenOneTime === true && runtime.includes("TOKEN_REPLAYED"));
add("account-bound-token", policy.nonNegotiable?.downloadTokenAccountBound === true && runtime.includes("payload.accountHash !== auth.account.accountHash"));
add("refund-revokes", policy.nonNegotiable?.refundRevokesEntitlement === true && runtime.includes("refund_succeeded") && runtime.includes("revokeJobTokens"));
add("terminal-no-reactivation", policy.nonNegotiable?.terminalEntitlementCannotReactivate === true && runtime.includes("TERMINAL_ENTITLEMENT_CANNOT_REACTIVATE"));
add("delete-purges-and-redacts", policy.nonNegotiable?.accountDeletionPurgesArtifactsAndRedactsIdentifiers === true && runtime.includes("REVOKED_ACCOUNT_DELETED") && runtime.includes("accountId: null"));
add("raw-source-forbidden-ledger", policy.nonNegotiable?.rawSourceForbiddenInLedger === true && e2e.includes("contract Pro { function risky() external {} }") && e2e.includes("scanForRawSensitive"));
add("raw-token-forbidden-ledger", policy.nonNegotiable?.rawTokensForbiddenInLedger === true && e2e.includes("tamperTokenResponse.json.token") && e2e.includes("scanForRawSensitive"));
add("separate-worker", worker.includes("runDisposableAuditWorker") && state.implemented?.separateWorkerProcess === true);
add("durable-ledger", runtime.includes("appendEvent") && runtime.includes("previousHash") && state.implemented?.appendOnlyHashChainLedger === true);
add("payment-signature", runtime.includes("WEBHOOK_DOMAIN") && runtime.includes("timingSafeHex") && state.implemented?.webhookSignatureAndIdempotency === true);
add("payment-amount-currency-binding", runtime.includes("PAYMENT_AMOUNT_BINDING_INVALID") && runtime.includes("expectedAmount") && runtime.includes("expectedCurrency"));
add("private-permissions", runtime.includes("0o700") && runtime.includes("0o600"));
add("atomic-fsync", runtime.includes("fs.fsyncSync") && runtime.includes("fsyncDirectory"));
add("no-public-production-route", !walk(appApi).map((file) => path.relative(appApi, file)).some((file) => /r44p23|disposable-customer-lifecycle/u.test(file)));
add("credit-local-only", policy.creditBoundary?.localDisposableRuntimeCredit === true && [policy.creditBoundary?.stagingCredit, policy.creditBoundary?.liveCredit, policy.creditBoundary?.customerCredit, policy.creditBoundary?.paidSaleCredit, policy.creditBoundary?.externalStripeCredit, policy.creditBoundary?.supabaseRlsCredit, policy.creditBoundary?.transactionalEmailCredit].every((value) => value === false));
add("external-blockers-retained", state.externalBlockers?.includes("DISPOSABLE_SUPABASE_STAGING_RLS") && state.externalBlockers?.includes("STRIPE_TEST_PROVIDER_WEBHOOKS") && state.externalBlockers?.includes("PRIVATE_OBJECT_STORAGE_AND_KMS"));
add("new-findings-recorded", ["R44P23-P0-PAYMENT-AMOUNT-BINDING", "R44P23-P0-TERMINAL-ENTITLEMENT-REACTIVATION", "R44P23-P1-DELETE-RAW-IDENTIFIERS", "R44P23-P1-LOCAL-NOT-STAGING"].every((id) => state.newFindings?.some((row) => row.id === id)));
add("package-script", typeof pkg.scripts?.["test:pass36:a102r44p23"] === "string" && pkg.scripts["test:pass36:a102r44p23"].includes("verify-a102r44p23-static-policy.mjs"));
add("current-release-gates-fail-closed", [state.currentByteCredit?.fullEslint, state.currentByteCredit?.fullTypeScript, state.currentByteCredit?.webpack, state.currentByteCredit?.turbopack, state.currentByteCredit?.browser57, state.currentByteCredit?.pdf150, state.currentByteCredit?.exactWindows, state.currentByteCredit?.stagingCustomerLifecycle].every((value) => value === false));

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p23.static-policy-verification.v1",
  status: failed.length === 0 ? "PASS_R44P23_STATIC_POLICY" : "FAIL",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);

function walk(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}
