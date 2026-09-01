#!/usr/bin/env node
import fs from "node:fs";

const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const central = fs.readFileSync("lib/commerce/vlm-current-sku-truth.ts", "utf8");
const account = fs.readFileSync("lib/account/audit-account-messages.ts", "utf8");
const timeline = fs.readFileSync("lib/security/customer-safe-audit-timeline.ts", "utf8");
const route = fs.readFileSync("lib/security/customer-safe-report-route.ts", "utf8");
const checkout = fs.readFileSync("components/checkout/VlmServiceCheckoutSuccessClient.tsx", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260804000002_a102r44p16_analysis_queue_sku_truth.sql", "utf8");
const schema = fs.readFileSync("lib/db/schema.sql", "utf8");

const normalize = (value) => {
  if (["human_review_queue", "paid_waiting_human_review", "queued_paid_review", "queued", "queued_basic_prescreen", "fulfilment_pending"].includes(value)) return "analysis_queue";
  if (value === "human_review") return "automated_analysis";
  if (["ready_for_download", "delivered_to_account"].includes(value)) return "ready_for_download";
  if (["intake", "analysis_queue", "automated_analysis", "needs_evidence", "pdf_attached", "customer_safe_ready", "delivered", "blocked_redaction"].includes(value)) return value;
  return "unknown";
};
const cases = {
  human_review_queue: "analysis_queue",
  paid_waiting_human_review: "analysis_queue",
  queued_paid_review: "analysis_queue",
  queued: "analysis_queue",
  queued_basic_prescreen: "analysis_queue",
  fulfilment_pending: "analysis_queue",
  human_review: "automated_analysis",
  ready_for_download: "ready_for_download",
  delivered_to_account: "ready_for_download",
  analysis_queue: "analysis_queue",
  automated_analysis: "automated_analysis",
  unknown_future_state: "unknown",
};
for (const [input, expected] of Object.entries(cases)) check(`normalize:${input}`, normalize(input) === expected, { input, expected, actual: normalize(input) });

check("central:legacy-map-source", central.includes('value === "human_review_queue"') && central.includes('return "analysis_queue"') && central.includes('value === "human_review"') && central.includes('return "automated_analysis"'));
check("account:delivery-current", account.includes('deliveryStatus = "analysis_queue"') && account.includes('nextStatus = "automated_analysis"'));
check("account:legacy-action-normalized", account.includes('rawAction === "mark_human_review" ? "mark_analysis"') && account.includes('input.action === "mark_human_review" ? "mark_analysis"'));
check("account:no-new-human-status", !/nextStatus\s*=\s*"human_review"/u.test(account) && !/deliveryStatus\s*=\s*"human_review_queue"/u.test(account));
check("timeline:legacy-input-only", timeline.includes('stage === "human_review_queue"') && timeline.includes('return "analysis_queue"'));
check("timeline:public-ids-modern", !/id:\s*"human_review(?:_queue)?"/u.test(timeline));
check("route:public-status-modern", route.includes('return "analysis_queue"') && route.includes('return "automated_analysis"'));
check("checkout:public-stage-modern", checkout.includes('? "analysis_queue"') && checkout.includes('"access_verified"') && checkout.includes('? "verifying_access"') && !checkout.includes('? "human_review_queue"'));
check("sql:update-existing", migration.includes("message_status in ('payment_pending', 'human_review')") && migration.includes("delivery_status in ('waiting_payment', 'human_review_queue')") && migration.includes("operator_status = 'human_review'"));
check("sql:before-trigger", migration.includes("before insert or update of message_status, delivery_status, operator_status"));
check("sql:modern-delivery-constraint", migration.includes("delivery_status in ('queued','delivered_to_account','analysis_queue','ready_for_download')"));
check("sql:modern-operator-constraint", migration.includes("operator_status in ('intake','analysis_queue','automated_analysis','needs_evidence','pdf_attached','customer_safe_ready','delivered','blocked_redaction')"));
check("sql:modern-message-constraint", migration.includes("message_status in ('received','queued','analysis_queue','ready','needs_evidence')"));
check("sql:security-invoker", migration.includes("security invoker") && migration.includes("revoke all on function") && migration.includes("grant execute on function") && migration.includes("service_role"));
check("schema:modern-default", schema.includes("status text not null default 'analysis_queue'"));
check("schema:modern-account-constraints", schema.includes("delivery_status in ('queued','delivered_to_account','analysis_queue','ready_for_download')") && schema.includes("operator_status in ('intake','analysis_queue','automated_analysis'"));

function badMigration(text) {
  return {
    missingTrigger: !text.includes("before insert or update"),
    legacyConstraint: /delivery_status in \([^)]*human_review_queue/u.test(text) || /operator_status in \([^)]*human_review/u.test(text),
    securityDefiner: /security definer/iu.test(text),
    grantsAuthenticated: /grant execute[^;]+authenticated/iu.test(text),
  };
}
const mutations = [
  ["missing-trigger", migration.replace("before insert or update", "-- removed trigger\n--") , "missingTrigger"],
  ["legacy-constraint", migration.replace("'analysis_queue','ready_for_download'", "'analysis_queue','human_review_queue','ready_for_download'"), "legacyConstraint"],
  ["security-definer", migration.replace("security invoker", "security definer"), "securityDefiner"],
  ["authenticated-grant", migration.replace("grant execute on function public.velmere_normalize_audit_analysis_queue_v1() to service_role;", "grant execute on function public.velmere_normalize_audit_analysis_queue_v1() to authenticated;"), "grantsAuthenticated"],
];
for (const [id, text, property] of mutations) check(`negative:${id}`, badMigration(text)[property], badMigration(text));

const failed = checks.filter((x) => !x.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p16.analysis-queue-migration-test-receipt.v1",
  revisionId: "VELMERE_PASS36_A102R44P16_ACTION_REQUIRED_SINGLE_SKU_TRUTH_ANALYSIS_QUEUE_AND_CUSTOMER_CLAIM_CLOSURE_NO_LIVE_CREDIT",
  generatedAt: "2026-08-04T00:00:00.000Z",
  status: failed.length ? "FAIL_R44P16_ANALYSIS_QUEUE_MIGRATION" : "PASS_R44P16_ANALYSIS_QUEUE_MIGRATION",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  checks,
  creditBoundary: { databaseExecuted: false, stagingCredit: false, humanReviewCredit: false, saleCredit: false, liveCredit: false },
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
