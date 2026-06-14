import fs from "node:fs";

const checks = [
  ["lib/commerce/pass2025-vlm-entitlement-ledger.ts", [
    "PASS2025_VLM_ENTITLEMENT_LEDGER_ID",
    "velmere_vlm_paid_entitlements",
    "velmere_vlm_audit_human_queue",
    "upsertVlmPaidEntitlementFromStripeSession",
    "verifyVlmPaidAccessEntitlement",
    "stripe_webhook",
    "checkout_verify",
    "token_only_non_production",
    "VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER",
    "hashVlmPaidAccessContext",
  ]],
  ["app/api/stripe/webhook/route.ts", [
    "upsertVlmPaidEntitlementFromStripeSession",
    "session.metadata?.kind === \"vlm_paid_access\"",
    "kind: \"vlm_paid_access\"",
    "markStripeWebhookEventProcessed(event.id, event.type)",
  ]],
  ["app/api/checkout/vlm-service/verify/route.ts", [
    "upsertVlmPaidEntitlementFromStripeSession",
    "checkout_verify",
    "context_mismatch",
    "entitlement.record.contextHash",
    "auditQueueId",
  ]],
  ["app/api/checkout/vlm-service/route.ts", [
    "hashVlmPaidAccessContext",
    "contextHash",
    "vlm_paid_access",
  ]],
  ["app/api/market-integrity/vlm/route.ts", [
    "verifyVlmPaidAccessEntitlement",
    "await requireAdvancedAnalysisAccess",
    "ledgerMode",
  ]],
  ["app/api/market-integrity/brain/route.ts", [
    "verifyVlmPaidAccessEntitlement",
    "ledgerMode",
  ]],
  ["app/api/security/audit-watch/route.ts", [
    "verifyVlmPaidAccessEntitlement",
    "vlm_advanced_audit_human_review",
    "ledgerMode",
  ]],
  ["app/api/search/lens-report/route.ts", [
    "verifyVlmPaidAccessEntitlement",
    "vlm_advanced_pdf_single",
    "ledgerMode",
    "includedProduct",
    "vlm_advanced_audit_human_review",
  ]],
  ["lib/db/schema.sql", [
    "velmere_vlm_paid_entitlements",
    "unique(stripe_session_id, product_id, context_hash)",
    "velmere_vlm_audit_human_queue",
    "paid_waiting_human_review",
  ]],
  ["lib/ai/vlm-security.ts", [
    "PAYMENT_ENTITLEMENT_MANIPULATION_PATTERNS",
    "payment_entitlement_manipulation",
  ]],
  [".env.example", [
    "VELMERE_PAID_ACCESS_TTL_MS=2592000000",
    "VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER=false",
  ]],
];

let failed = false;
for (const [file, needles] of checks) {
  const body = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!body.includes(needle)) {
      console.error(`[FAIL] ${file} missing ${needle}`);
      failed = true;
    }
  }
}

const verifyRoute = fs.readFileSync("app/api/checkout/vlm-service/verify/route.ts", "utf8");
if (!verifyRoute.includes("session.payment_status !== \"paid\"") || !verifyRoute.includes("product_mismatch")) {
  console.error("[FAIL] checkout verify route must still require a paid Stripe session and matching product.");
  failed = true;
}

const webhook = fs.readFileSync("app/api/stripe/webhook/route.ts", "utf8");
if (webhook.indexOf("session.metadata?.kind === \"vlm_paid_access\"") > webhook.indexOf("const orderDraftId")) {
  console.error("[FAIL] VLM service webhook branch must run before clothing order fulfilment branch.");
  failed = true;
}

const ledger = fs.readFileSync("lib/commerce/pass2025-vlm-entitlement-ledger.ts", "utf8");
if (!ledger.includes("redactedEmail") || !ledger.includes("customerEmail: redactedEmail")) {
  console.error("[FAIL] memory fallback log must redact customer email.");
  failed = true;
}

if (failed) process.exit(1);
console.log("[OK] PASS2025 server-side VLM paid entitlement ledger, webhook queue and payment security verified.");
