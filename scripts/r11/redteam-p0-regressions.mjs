#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";
import { assessEvidenceReceipt } from "../r10/audit-evidence-freshness.mjs";

const read = (p) => fs.readFileSync(p, "utf8");
const sha = "a".repeat(40);
const now = Date.parse("2026-09-12T12:00:00Z");
const digest = "b".repeat(64);

const exportRoute = read("app/api/market-integrity/export/route.ts");
assert.match(exportRoute, /LEGACY_EXPORT_WITHHELD/);
assert.match(exportRoute, /server_bound_report_required/);
assert.doesNotMatch(exportRoute, /status:\s*["']VERIFIED["']/i);
assert.doesNotMatch(exportRoute, /RFC\s*3161/i);
assert.doesNotMatch(exportRoute, /SEC\/ESMA Compliant Immutable Trace/i);
assert.doesNotMatch(exportRoute, /searchParams\.get\(["']riskScore["']\)/);
assert.doesNotMatch(exportRoute, /searchParams\.get\(["']confidence["']\)/);

const legacyCheckout = read("app/api/checkout/stripe-analysis/route.ts");
assert.match(legacyCheckout, /legacy_checkout_disabled/);
assert.match(legacyCheckout, /canonicalCheckout/);
assert.doesNotMatch(legacyCheckout, /from\s+["']stripe["']/i);
assert.doesNotMatch(legacyCheckout, /checkout\.sessions\.create/);
assert.doesNotMatch(legacyCheckout, /checkout\.sessions\.retrieve/);

const callback = read("app/[locale]/checkout/stripe-popup-callback/page.tsx");
assert.match(callback, /VELMERE_STRIPE_CHECKOUT_RETURNED/);
assert.match(callback, /entitlementGranted:\s*false/);
assert.doesNotMatch(callback, /VELMERE_STRIPE_PAYMENT_SUCCESS/);
assert.doesNotMatch(callback, /status\s*=\s*searchParams\.get\(["']status["']\)\s*\|\|\s*["']success["']/);

const investigator = read("lib/server/market-integrity-route-modules/investigator.ts");
assert.doesNotMatch(investigator, /x-velmere-dev/);
assert.doesNotMatch(investigator, /searchParams\.get\(["']dev["']\)/);
assert.match(investigator, /const isDevOrTest = process\.env\.NODE_ENV !== ["']production["']/);

function dbReceipt(overrides = {}) {
  return {
    sourceSha: sha,
    evidenceClass: "CURRENT_STAGING_PROVEN",
    environment: "staging",
    executedAt: "2026-09-12T11:30:00Z",
    twoTenantCrossUserVerified: true,
    tenantIsolationEnforced: true,
    passed: true,
    ...overrides,
  };
}

function providerReceipt(overrides = {}) {
  return {
    sourceSha: sha,
    evidenceClass: "CURRENT_RELEASE_PROVEN",
    environment: "production",
    executedAt: "2026-09-12T11:30:00Z",
    currentTermsOrAgreementVerified: true,
    liveProviderReceiptVerified: true,
    rightsEvidenceSha256: digest,
    providerReceiptSha256: digest,
    passed: true,
    ...overrides,
  };
}

const validDb = assessEvidenceReceipt({ targetId: "database_rls", parsed: dbReceipt(), candidateSha: sha, nowMs: now });
assert.equal(validDb.productionCredit, true);

for (const [name, parsed, candidateSha = sha] of [
  ["historical", dbReceipt({ evidenceClass: "HISTORICAL_FAIL" })],
  ["local-only", dbReceipt({ evidenceClass: "LOCAL_ONLY" })],
  ["wrong-sha", dbReceipt({ sourceSha: "c".repeat(40) })],
  ["future", dbReceipt({ executedAt: "2099-01-01T00:00:00Z" })],
  ["false-control", dbReceipt({ twoTenantCrossUserVerified: false })],
  ["missing-sha", dbReceipt(), null],
]) {
  const r = assessEvidenceReceipt({ targetId: "database_rls", parsed, candidateSha, nowMs: now });
  assert.equal(r.productionCredit, false, `${name} must not get production credit`);
}

const validProvider = assessEvidenceReceipt({ targetId: "provider_truth", parsed: providerReceipt(), candidateSha: sha, nowMs: now });
assert.equal(validProvider.productionCredit, true);
for (const [name, parsed] of [
  ["no-rights", providerReceipt({ currentTermsOrAgreementVerified: false })],
  ["no-live", providerReceipt({ liveProviderReceiptVerified: false })],
  ["bad-rights-digest", providerReceipt({ rightsEvidenceSha256: "not-a-digest" })],
  ["bad-provider-digest", providerReceipt({ providerReceiptSha256: "0".repeat(63) })],
  ["receipt-failed", providerReceipt({ passed: false })],
]) {
  const r = assessEvidenceReceipt({ targetId: "provider_truth", parsed, candidateSha: sha, nowMs: now });
  assert.equal(r.productionCredit, false, `${name} must not get production credit`);
}

console.log(JSON.stringify({
  schemaVersion: "velmere.r11.redteam-p0-regressions.v1",
  status: "PASS",
  covered: ["VA-F01", "VA-F02", "VA-F03", "VA-F04", "VA-F05"],
  truthBoundary: "This gate proves only the named source-level and value-bound regressions. It does not prove staging, provider rights, payment completion, or official release authority.",
}, null, 2));
