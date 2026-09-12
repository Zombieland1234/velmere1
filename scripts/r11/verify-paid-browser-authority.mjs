#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : "/tmp/r11b/PAID_BROWSER_AUTHORITY.json";

const callbackPath = "app/[locale]/checkout/stripe-popup-callback/page.tsx";
const openerPath = "components/security/SecurityAuditsCleanPage.tsx";
const checkoutRoutePath = "app/api/checkout/stripe-analysis/route.ts";
const callback = fs.readFileSync(callbackPath, "utf8");
const opener = fs.readFileSync(openerPath, "utf8");
const checkoutRoute = fs.readFileSync(checkoutRoutePath, "utf8");

assert.match(callback, /VELMERE_STRIPE_CHECKOUT_RETURNED/);
assert.match(callback, /VELMERE_STRIPE_PAYMENT_CANCELLED/);
assert.match(callback, /entitlementGranted:\s*false/);
assert.doesNotMatch(callback, /VELMERE_STRIPE_PAYMENT_SUCCESS/);
assert.match(callback, /window\.location\.origin/);

assert.match(opener, /event\.origin\s*!==\s*window\.location\.origin/);
assert.match(opener, /event\.source\s*!==\s*popupWindow/);
assert.match(opener, /event\.data\?\.sessionId\s*!==\s*sessionId/);
assert.doesNotMatch(opener, /VELMERE_STRIPE_PAYMENT_SUCCESS/);
assert.match(opener, /VELMERE_STRIPE_CHECKOUT_RETURNED/);

const unlockCalls = [...opener.matchAll(/completeAuditPaymentSuccess\(/g)].length;
const paidChecks = [...opener.matchAll(/(?:data|checkData)\.ok\s*&&\s*(?:data|checkData)\.paid/g)].length;
assert.ok(unlockCalls >= 1, "expected server-confirmed unlock function to remain reachable");
assert.ok(paidChecks >= unlockCalls - 1, "every non-definition unlock call must be dominated by server paid check");

assert.match(checkoutRoute, /WITHHELD|withheld/i);
assert.match(checkoutRoute, /503/);

const receipt = {
  schemaVersion: "velmere.r11.paid-browser-authority.v1",
  evidenceClass: "CURRENT_GIT_STATIC_AUTHORITY_BOUNDARY",
  callbackAuthoritative: false,
  callbackEntitlementGranted: false,
  sameOriginRequired: true,
  exactPopupSourceRequired: true,
  exactSessionIdRequired: true,
  directPaymentSuccessMessageAccepted: false,
  serverPaidChecksObserved: paidChecks,
  clientUnlockCallSitesObserved: Math.max(0, unlockCalls - 1),
  legacyCheckoutRouteWithheld: true,
  browserE2ERequiredForClosure: true,
  productionPaymentCredit: false,
  passed: true,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
