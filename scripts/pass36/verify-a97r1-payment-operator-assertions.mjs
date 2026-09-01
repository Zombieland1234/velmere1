import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a97r1-payment-operator-assertion-policy.json"), "utf8"));
const REV = "VELMERE_PASS36_A97R1_SCOPED_PAYMENT_OPERATOR_ASSERTIONS_DUAL_CONTROL_AND_SINGLE_USE_REQUEUE";
const PARENT = "VELMERE_PASS36_A97R0_STRIPE_TEST_RUNTIME_RECEIPT_REFUND_REPLAY_AND_RECONCILIATION_CONTROL";

check(policy.revisionId === REV, "policy revision must be exact");
check(policy.parentRevisionId === PARENT, "policy parent must be exact");
check(policy.checkpointClass === "ACTION_REQUIRED_NON_PASS" && policy.localPassCredit === false, "policy must remain non-pass");
check(policy.globalDecision === "NO_GO" && policy.liveProven === false && policy.saleEnabled === false && policy.productionApproved === false, "promotion must remain closed");
check(policy.localDenominators.behavioralAssertions === 44, "behavioral denominator must be fixed");
check(policy.realDenominators.realOperatorReauthCeremonies === 0 && policy.realDenominators.realDurableAssertionConsumptions === 0 && policy.realDenominators.realStripeRequeues === 0, "real denominators must remain zero");

for (const rel of [
  "lib/payments/payment-operator-assertions.ts",
  "app/api/admin/payments/stripe-webhook-reconcile/route.ts",
  "app/api/admin/payments/stripe-webhook-dead-letter/route.ts",
  "supabase/migrations/20260729000001_a97r1_payment_operator_assertions.sql",
  "scripts/pass36/test-a97r1-payment-operator-assertions.ts",
]) check(fs.existsSync(path.join(root, rel)), `required file missing: ${rel}`);

const reconcile = fs.readFileSync(path.join(root, "app/api/admin/payments/stripe-webhook-reconcile/route.ts"), "utf8");
const requeue = fs.readFileSync(path.join(root, "app/api/admin/payments/stripe-webhook-dead-letter/route.ts"), "utf8");
const sessions = fs.readFileSync(path.join(root, "lib/admin/session-roles.ts"), "utf8");
const boundary = fs.readFileSync(path.join(root, "lib/payments/payment-operator-assertions.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260729000001_a97r1_payment_operator_assertions.sql"), "utf8");

check(!reconcile.includes("verifyAdminImportRequest") && !requeue.includes("verifyAdminImportRequest"), "legacy shared admin import auth must be absent from payment mutation routes");
check(reconcile.includes('verifyAdminSessionRequest(req, "payment:reconcile")'), "reconciliation route must require scoped admin session");
check(requeue.includes('verifyAdminSessionRequest(request, "payment:requeue")'), "requeue route must require scoped admin session");
check(reconcile.includes("executePaymentOperatorAction") && requeue.includes("executePaymentOperatorAction"), "both routes must use shared body-bound execution boundary");
check(requeue.includes("x-velmere-payment-independent-approval"), "requeue must require independent approval header");
check(sessions.includes('"payment:reconcile"') && sessions.includes('"payment:requeue"') && sessions.includes('"payment:approve"'), "admin session contract must declare payment scopes");
check(boundary.includes("bodySha256") && boundary.includes("actionDigest") && boundary.includes("singleUseRequired: true"), "assertions must be body/action bound and single use");
check(boundary.includes('mfaMethod === "webauthn"') && boundary.includes("MAX_RECENT_AUTH_AGE_MS"), "recent phishing-resistant authentication must be enforced");
check(boundary.includes("payment_operator_approval_not_independent"), "same-actor approval must fail closed");
check(migration.includes("primary_assertion_id_hash text primary key") && migration.includes("independent_approval_id_hash text unique"), "durable ledger must make primary and approval identifiers single use");
check(migration.includes("approver_actor_id_hash <> actor_id_hash"), "durable contract must require independent approver identity");
check(migration.includes("return 'already_consumed'"), "durable replay must return explicit already-consumed state");

const child = spawnSync(process.execPath, ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a97r1-payment-operator-assertions.ts"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_NO_WARNINGS: "1", VELMERE_OFFLINE_TS_FORCE_BUILTIN: "1" },
  timeout: 180_000,
});
if (child.status !== 0) {
  process.stderr.write(child.stdout ?? "");
  process.stderr.write(child.stderr ?? "");
}
check(child.status === 0, "A97R1 behavioral/provider-spy child must pass");
const receipt = JSON.parse((child.stdout ?? "").trim());
check(receipt.assertions === 44, "A97R1 child assertion denominator must be exact");
check(receipt.blockedActionExecutions === 0, "blocked authorization must execute zero payment actions");
check(receipt.independentApprovalRequiredForRequeue === true, "requeue approval truth must be exact");
check(receipt.realOperatorSessions === 0 && receipt.realStripeRequeues === 0, "child must not claim real staging credit");

const historical = spawnSync(process.execPath, ["scripts/pass36/verify-a97-stripe-payment-boundaries.mjs"], { cwd: root, encoding: "utf8", timeout: 240_000 });
if (historical.status !== 0) {
  process.stderr.write(historical.stdout ?? "");
  process.stderr.write(historical.stderr ?? "");
}
check(historical.status === 0, "historical A97 Stripe receipt boundary must remain green");

console.log(JSON.stringify({
  ok: true,
  passId: "PASS36_A97R1_PAYMENT_OPERATOR_ASSERTION_VERIFIER",
  assertions,
  childAssertions: receipt.assertions,
  blockedActionExecutions: receipt.blockedActionExecutions,
  localPassCredit: false,
  realOperatorReauthCeremonies: 0,
  realDurableAssertionConsumptions: 0,
  realStripeRequeues: 0,
}, null, 2));
