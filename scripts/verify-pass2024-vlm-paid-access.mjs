import fs from "node:fs";

const checks = [
  ["lib/commerce/pass2024-vlm-paid-access.ts", [
    "PASS2024_VLM_PAID_ACCESS_ID",
    "vlm_advanced_analysis_single",
    "amount: 499",
    "vlm_advanced_pdf_single",
    "amount: 1499",
    "vlm_advanced_audit_human_review",
    "amount: 8999",
    "includedIn: [\"vlm_advanced_pdf_single\"]",
    "buildVlmPaidAccessStorageKey",
  ]],
  ["lib/commerce/pass2024-vlm-paid-access-server.ts", [
    "VELMERE_PAID_ACCESS_SECRET",
    "createHmac(\"sha256\"",
    "timingSafeEqual",
    "contextHash",
    "product_mismatch",
    "context_mismatch",
    "expired",
  ]],
  ["lib/commerce/pass2024-vlm-paid-access-client.ts", [
    "localStorage.getItem",
    "localStorage.setItem",
    "/api/checkout/vlm-service",
    "window.location.assign",
  ]],
  ["app/api/checkout/vlm-service/route.ts", [
    "VELMERE_SERVICES_COMMERCIAL_READY",
    "stripe.checkout.sessions.create",
    "vlm_paid_access",
    "success_url",
    "cancel_url",
    "session_id={CHECKOUT_SESSION_ID}",
  ]],
  ["app/api/checkout/vlm-service/verify/route.ts", [
    "checkout.sessions.retrieve",
    "payment_status !== \"paid\"",
    "createVlmPaidAccessToken",
    "product_mismatch",
  ]],
  ["components/checkout/VlmServiceCheckoutSuccessClient.tsx", [
    "/api/checkout/vlm-service/verify",
    "writeVlmPaidAccessToken",
    "velmere:paid-access",
    `params.get("depth") === "advanced"`,
  ]],
  ["app/[locale]/checkout/success/page.tsx", [
    "VlmServiceCheckoutSuccessClient",
    "vlm_service",
    "returnPath",
  ]],
  ["components/security/VlmAuditCommandClient.tsx", [
    "startAdvancedAuditCheckout",
    "vlm_advanced_audit_human_review",
    "x-velmere-paid-access",
    "status === \"checkout\"",
  ]],
  ["app/api/security/audit-watch/route.ts", [
    "reviewLevel === \"advanced_review\"",
    "verifyVlmPaidAccessEntitlement",
    "payment_required",
    "x-velmere-paid-access-required",
  ]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", [
    "buildAdvancedPdfAccessContext",
    "vlm_advanced_pdf_single",
    "x-velmere-paid-access",
    "x-velmere-paid-asset-id",
    "x-velmere-paid-symbol",
  ]],
  ["app/api/search/lens-report/route.ts", [
    "selectedDepth === \"advanced\"",
    "vlm_advanced_pdf_single",
    "payment_required",
    "x-velmere-paid-access-required",
  ]],
  ["components/market-integrity/TokenRiskModal.tsx", [
    "vlm_advanced_analysis_single",
    "startVlmServiceCheckout",
    "advancedAnalysisProduct.priceLabel",
  ]],
  ["app/api/market-integrity/vlm/route.ts", [
    "requireAdvancedAnalysisAccess",
    "vlm_advanced_analysis_single",
    "payment_required",
    "x-velmere-paid-access-required",
  ]],
  ["app/api/market-integrity/brain/route.ts", [
    "depth === \"advanced\"",
    "verifyVlmPaidAccessEntitlement",
    "vlm_advanced_analysis_single",
    "payment_required",
  ]],
  [".env.example", [
    "VELMERE_SERVICES_COMMERCIAL_READY=false",
    "VELMERE_PAID_ACCESS_SECRET=",
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

const auditApi = fs.readFileSync("app/api/security/audit-watch/route.ts", "utf8");
if (!auditApi.includes("status: 402") || !auditApi.includes("vlm_advanced_audit_human_review")) {
  console.error("[FAIL] Advanced audit must hard-fail unpaid direct API calls with 402.");
  failed = true;
}

const lensApi = fs.readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (!lensApi.includes("status: 402") || !lensApi.includes("selectedDepth === \"advanced\"")) {
  console.error("[FAIL] Advanced PDF must hard-fail unpaid direct API calls with 402.");
  failed = true;
}

const vlmApi = fs.readFileSync("app/api/market-integrity/vlm/route.ts", "utf8");
if (!vlmApi.includes("if (args.depth !== \"advanced\") return null") || !vlmApi.includes("verifyVlmPaidAccessEntitlement")) {
  console.error("[FAIL] Advanced VLM API must require signed paid access tokens.");
  failed = true;
}

if (failed) process.exit(1);
console.log("[OK] PASS2024 paid Advanced Audit, Advanced PDF and VLM Advanced gates verified.");
