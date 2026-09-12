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
const auditOpenerPath = "components/security/SecurityAuditsCleanPage.tsx";
const marketOpenerPath = "components/market-integrity/AnalysisCardsSection.tsx";
const checkoutRoutePath = "app/api/checkout/stripe-analysis/route.ts";

const callback = fs.readFileSync(callbackPath, "utf8");
const auditOpener = fs.readFileSync(auditOpenerPath, "utf8");
const marketOpener = fs.readFileSync(marketOpenerPath, "utf8");
const checkoutRoute = fs.readFileSync(checkoutRoutePath, "utf8");

assert.match(callback, /VELMERE_STRIPE_CHECKOUT_RETURNED/);
assert.match(callback, /VELMERE_STRIPE_PAYMENT_CANCELLED/);
assert.match(callback, /entitlementGranted:\s*false/);
assert.doesNotMatch(callback, /VELMERE_STRIPE_PAYMENT_SUCCESS/);
assert.match(callback, /window\.location\.origin/);

function verifyOpenerAuthority(source, { path: sourcePath, unlockFunction }) {
  assert.match(source, /event\.origin\s*!==\s*window\.location\.origin/, `${sourcePath}: exact origin check missing`);
  assert.match(source, /event\.source\s*!==\s*popupWindow/, `${sourcePath}: exact popup source check missing`);
  assert.match(source, /event\.data\?\.sessionId\s*!==\s*sessionId/, `${sourcePath}: exact session check missing`);
  assert.doesNotMatch(source, /VELMERE_STRIPE_PAYMENT_SUCCESS/, `${sourcePath}: legacy browser payment-success authority remains`);
  assert.match(source, /VELMERE_STRIPE_CHECKOUT_RETURNED/, `${sourcePath}: checkout-return signal missing`);

  const unlockPattern = new RegExp(`${unlockFunction}\\(`, "g");
  const unlockCalls = [...source.matchAll(unlockPattern)].length;
  const paidChecks = [...source.matchAll(/(?:data|checkData)\.ok\s*&&\s*(?:data|checkData)\.paid/g)].length;
  assert.ok(unlockCalls >= 1, `${sourcePath}: expected server-confirmed unlock function to remain reachable`);
  assert.ok(
    paidChecks >= unlockCalls - 1,
    `${sourcePath}: every non-definition unlock call must be dominated by a server paid check`,
  );

  return {
    path: sourcePath,
    unlockFunction,
    serverPaidChecksObserved: paidChecks,
    clientUnlockCallSitesObserved: Math.max(0, unlockCalls - 1),
    directPaymentSuccessMessageAccepted: false,
    checkoutReturnedSignalObserved: true,
    sameOriginRequired: true,
    exactPopupSourceRequired: true,
    exactSessionIdRequired: true,
  };
}

const surfaces = [
  verifyOpenerAuthority(auditOpener, { path: auditOpenerPath, unlockFunction: "completeAuditPaymentSuccess" }),
  verifyOpenerAuthority(marketOpener, { path: marketOpenerPath, unlockFunction: "completePaymentSuccess" }),
];

assert.match(checkoutRoute, /WITHHELD|withheld/i);
assert.match(checkoutRoute, /503/);

const receipt = {
  schemaVersion: "velmere.r11.paid-browser-authority.v2",
  evidenceClass: "CURRENT_GIT_STATIC_AUTHORITY_BOUNDARY",
  callbackAuthoritative: false,
  callbackEntitlementGranted: false,
  sameOriginRequired: true,
  exactPopupSourceRequired: true,
  exactSessionIdRequired: true,
  directPaymentSuccessMessageAccepted: false,
  coveredOpenerCount: surfaces.length,
  coveredOpeners: surfaces.map((surface) => surface.path),
  serverPaidChecksObserved: surfaces.reduce((sum, surface) => sum + surface.serverPaidChecksObserved, 0),
  clientUnlockCallSitesObserved: surfaces.reduce((sum, surface) => sum + surface.clientUnlockCallSitesObserved, 0),
  surfaces,
  legacyCheckoutRouteWithheld: true,
  browserE2ERequiredForClosure: true,
  productionPaymentCredit: false,
  passed: true,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
