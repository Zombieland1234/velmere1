import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readiness = fs.readFileSync(path.join(root, "app/api/checkout/vlm-service/readiness/route.ts"), "utf8");
const checkout = fs.readFileSync(path.join(root, "app/api/checkout/vlm-service/route.ts"), "utf8");
const engine = fs.readFileSync(path.join(root, "lib/commerce/vlm-evidence-availability.ts"), "utf8");

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

check(readiness.includes("VLM_PUBLIC_SERVICE_READINESS_SCHEMA"), "public readiness route must pin the semantic v2 schema");
check(readiness.includes('"x-velmere-contract": VLM_PUBLIC_SERVICE_READINESS_SCHEMA'), "public readiness route must expose a semantic contract header");
check(!readiness.includes("PASS2364_STRIPE_BLIK_REPLAY_ID"), "public readiness route must not expose an internal PASS identifier");
check(!readiness.includes("operatorReplay"), "public readiness route must not expose operator replay instructions");
check(!readiness.includes("checklist"), "public readiness route must not expose payment environment checklist internals");
check(readiness.includes("buildCurrentVlmTierEligibility"), "public readiness must be driven by deterministic eligibility");
check(readiness.includes("eligibility?.saleEligible && payment.enabledForStripeSession"), "payment configuration alone must not enable sale");
check(checkout.includes("buildPublicVlmTierEligibility"), "checkout denial must bind the same public eligibility contract");
check(checkout.includes("providerCallsAllowed: false"), "blocked checkout must stop provider work");
check(checkout.includes("durableWritesAllowed: false"), "blocked checkout must stop durable writes");
check(engine.includes("Payment proof never") || engine.includes("catalogState"), "eligibility engine must preserve catalog authority");
check(engine.includes('estimatedRestorationAt: null'), "current adapter must not invent a restoration ETA");
check(engine.includes('silentDowngradeAllowed: false'), "post-payment contract must forbid silent downgrade");
check(engine.includes('VALUE_DELTA_NOT_PROVEN'), "unproven paid value must withhold the tier");
check(engine.includes('RIGHTS_NOT_CONFIRMED'), "rights state must be an explicit sale blocker");
check(engine.includes('CRITICAL_EVIDENCE_CONFLICTED'), "provider/evidence conflict must be explicit");

console.log(`Public tier readiness contract: PASS (${assertions}/${assertions})`);
