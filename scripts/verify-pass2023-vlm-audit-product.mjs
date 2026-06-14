import fs from "node:fs";

const required = [
  ["lib/security/pass2023-vlm-audit-product.ts", [
    "PASS2023_VLM_AUDIT_PRODUCT_ID",
    "Velmère Basic Audit",
    "89.99€",
    "payment_pending",
    "no seed phrase",
    "public exploit instructions",
  ]],
  ["components/security/VlmAuditCommandClient.tsx", [
    "data-pass2023-audit-command",
    "page.submitBasic",
    "advancedAuditProduct.checkoutCta",
    "writeMessage",
    "velmere.audit.account.messages.v1",
  ]],
  ["components/security/SecurityAuditWatchPage.tsx", [
    "data-pass2023-vlm-audit-product",
    "data-pass2023-audit-scorecard",
  ]],
  ["components/account/AuditAccountMessagesClient.tsx", [
    "data-pass2023-account-audit-messages",
    "message.status",
    "velmere.audit.account.messages.v1",
  ]],
  ["components/dashboard/DashboardClient.tsx", [
    "messages: \"Messages\"",
    "messages: \"Wiadomości\"",
    "messages: \"Nachrichten\"",
    "AuditAccountMessagesClient",
    "requestedTab",
  ]],
  ["app/api/security/audit-watch/route.ts", [
    "buildVlmAuditAccountMessage",
    "accountMessage",
    "x-velmere-vlm-audit-product",
  ]],
  ["lib/security/pass1694-audit-business-flow.ts", [
    "89.99€",
    "Velmère Advanced Audit",
    "Velmère Basic Audit",
  ]],
];

let failed = false;
for (const [file, needles] of required) {
  const body = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!body.includes(needle)) {
      console.error(`[FAIL] ${file} missing ${needle}`);
      failed = true;
    }
  }
}

const api = fs.readFileSync("app/api/security/audit-watch/route.ts", "utf8");
if (!api.includes("basic-free-vlm-technology-advanced-human-reviewed-no-exploit-instructions")) {
  console.error("[FAIL] audit API boundary header was not upgraded");
  failed = true;
}

const product = fs.readFileSync("lib/security/pass2023-vlm-audit-product.ts", "utf8");
if (!product.includes("Checkout i token dostępu są gotowe") || !product.includes("Checkout and access token gate are ready")) {
  console.error("[FAIL] PASS2023 scorecard must reflect the PASS2024 paid checkout gate");
  failed = true;
}

if (failed) process.exit(1);
console.log("[OK] PASS2023 VLM Audit product, account messages, clean search and safety boundaries verified.");
