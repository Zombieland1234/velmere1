import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const policyPath = path.join(root, "config/pass36/a97-stripe-test-payment-policy.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
check(policy.revisionId === "VELMERE_PASS36_A97R0_STRIPE_TEST_RUNTIME_RECEIPT_REFUND_REPLAY_AND_RECONCILIATION_CONTROL", "revision must be exact");
check(policy.parentRevisionId === "VELMERE_PASS36_A96R0_RLS_19_CASE_EXECUTABLE_REPLAY_AND_CUSTOMER_ARTIFACT_USER_CLIENT_BOUNDARY", "parent must be exact");
check(policy.checkpointClass === "ACTION_REQUIRED_NON_PASS", "checkpoint must remain non-pass");
check(policy.localPassCredit === false, "A97 local work must not claim pass credit");
check(policy.globalDecision === "NO_GO", "global decision must remain NO_GO");
check(policy.liveProven === false && policy.saleEnabled === false && policy.productionApproved === false, "promotion claims must remain false");
check(policy.localDenominators.receiptMutationFamilies === 25, "mutation denominator must include the local-demo rail family");
check(policy.realDenominators.stripeTestPaymentLifecycle === 0, "real Stripe lifecycle must remain zero");

for (const rel of [
  "lib/payments/stripe-webhook-runtime-contract.ts",
  "lib/payments/vlm-paid-stripe-receipt-contract.ts",
  "lib/payments/vlm-paid-stripe-receipt-verifier.ts",
  "lib/payments/stripe-webhook/ingress.ts",
  "lib/payments/stripe-webhook/handlers/vlm-paid-access.ts",
  "lib/security/payment-webhook-guard.ts",
  "app/api/checkout/vlm-service/verify/route.ts",
]) check(fs.existsSync(path.join(root, rel)), `${rel} must exist`);

const run = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/pass36/test-a97-stripe-payment-boundaries.mjs"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_NO_WARNINGS: "1" },
});
if (run.status !== 0) {
  process.stderr.write(run.stdout ?? "");
  process.stderr.write(run.stderr ?? "");
}
check(run.status === 0, "A97 test must pass");
const receipt = JSON.parse((run.stdout ?? "").trim());
check(receipt.ok === true, "test receipt must be green");
check(receipt.receiptMutationDenominator === 25 && receipt.receiptMutationsKilled === 25, "all 25 receipt mutations must be killed");
check(receipt.realStripeRequests === 0 && receipt.realRefunds === 0, "no real Stripe credit may be invented");

const ingressRun = spawnSync(process.execPath, ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a97-stripe-webhook-ingress.ts"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_NO_WARNINGS: "1", VELMERE_OFFLINE_TS_FORCE_BUILTIN: "1" },
});
if (ingressRun.status !== 0) {
  process.stderr.write(ingressRun.stdout ?? "");
  process.stderr.write(ingressRun.stderr ?? "");
}
check(ingressRun.status === 0, "A97 ingress provider-spy test must pass");
const ingressReceipt = JSON.parse((ingressRun.stdout ?? "").trim());
check(ingressReceipt.assertions === 14, "ingress provider-spy denominator must be exact");
check(ingressReceipt.durableClaimCallsAfterBlockedIngress === 0, "blocked ingress must not consume durable claims");

const handlerRun = spawnSync(process.execPath, ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a97-vlm-paid-handler-preflight.ts"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_NO_WARNINGS: "1", VELMERE_OFFLINE_TS_FORCE_BUILTIN: "1" },
});
if (handlerRun.status !== 0) {
  process.stderr.write(handlerRun.stdout ?? "");
  process.stderr.write(handlerRun.stderr ?? "");
}
check(handlerRun.status === 0, "A97 paid-handler preflight test must pass");
const handlerReceipt = JSON.parse((handlerRun.stdout ?? "").trim());
check(handlerReceipt.assertions === 8, "paid-handler preflight denominator must be exact");
check(handlerReceipt.entitlementWritesAfterBlockedReceipt === 0, "blocked receipt must not write entitlement ledger");

console.log(JSON.stringify({
  ok: true,
  passId: "PASS36_A97_STRIPE_TEST_RUNTIME_RECEIPT_BOUNDARY_VERIFIER",
  assertions,
  childAssertions: receipt.assertions,
  ingressAssertions: ingressReceipt.assertions,
  handlerAssertions: handlerReceipt.assertions,
  localPassCredit: false,
  realStripeTestLifecycle: 0,
}, null, 2));
