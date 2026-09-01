import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fallbackReply } from "../../lib/ai/angel-route-policy.js";

const server = readFileSync("lib/server/lazy-route-modules/angel.ts", "utf8");
const client = readFileSync("components/angel/AngelPanel.tsx", "utf8");
const policy = readFileSync("lib/ai/angel-route-policy.ts", "utf8");
const structured = readFileSync("lib/ai/angel-structured-response.ts", "utf8");

// Direct Angel is one standalone free Basic product: client depth is not an entitlement authority.
assert.match(client, /depth: "basic"/);
assert.match(server, /const requestedDepth = "basic" as const/);
assert.match(server, /clientRequestedDepthIgnored: clientRequestedDepth/);
assert.match(server, /directChatPaymentRequired: false/);
assert.match(server, /paidDepthChangesTruth: false/);

// Fallback must not borrow Audit SKU sale/readiness truth as if it were Angel product truth.
assert.doesNotMatch(policy, /currentSkuTruthSnapshot/);
assert.doesNotMatch(policy, /reportAvailability=/);
assert.match(policy, /angelAccess=FREE_BASIC_ONLY/);
assert.match(policy, /reportContextIsNotAngelTier=true/);


// Angel can expose a categorical evidence-bound confidence state, but no numeric
// customer confidence cap without an explicit calibration authority.
assert.match(structured, /capPercent: null/);
assert.doesNotMatch(structured, /capPercent: cap/);
assert.match(structured, /probabilityClaimAllowed: false/);

// Fallback cannot invent a static risk number and cannot advertise non-reachable Pro/Advanced chat depth.
for (const locale of ["pl", "en", "de"] as const) {
  const reply = fallbackReply(locale, "BTC risk Basic Pro Advanced", "", "basic", 0, null);
  assert.doesNotMatch(reply, /35\/100/);
  assert.match(reply, /FREE_BASIC_ONLY/);
  if (locale === "pl") assert.match(reply, /Pro i Advanced nie są tutaj dodatkowymi tierami czatu/);
  if (locale === "en") assert.match(reply, /Pro and Advanced are not additional chat tiers here/);
  if (locale === "de") assert.match(reply, /Pro und Advanced sind hier keine zusätzlichen Chat-Tiers/);
}

console.log("A102 Angel standalone output truth regression: PASS");
