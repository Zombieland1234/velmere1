import assert from "node:assert/strict";
import { vlmTierPaidLocked, vlmTierRequiresPayment, vlmTierRequiresControlledAccess, vlmTierPriceEur } from "../../lib/ai/paid-tier-policy.ts";
import { buildPass2289CustomerReleaseGate } from "../../lib/ai/customer-release-gate.ts";
import { buildPass2291ProductionReplayGate, PASS2291_TIER_EXPECTATIONS } from "../../lib/ai/production-replay-gate.ts";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS-015: TIER GATES & CUSTOMER VALUE SUITE ===");

  // 1. Tier Payment & Controlled Access Policy
  ok(vlmTierRequiresPayment("basic") === false, "Basic tier requires no public payment");
  ok(vlmTierRequiresControlledAccess("pro") === true, "Pro tier requires controlled access");
  ok(vlmTierRequiresControlledAccess("basic") === false, "Basic does not require controlled access");
  ok(vlmTierPriceEur("basic") === null, "Public numeric price is disabled on current SKU truth");

  // 2. Lock State without Server Entitlement
  ok(vlmTierPaidLocked("basic", false) === false, "Basic is never locked without receipt");
  ok(vlmTierPaidLocked("pro", false) === true, "Pro is locked without server-verified access");
  ok(vlmTierPaidLocked("advanced", false) === true, "Advanced is locked without server-verified access");
  ok(vlmTierPaidLocked("advanced", true) === true, "Advanced remains strictly locked on public surfaces");
  ok(vlmTierPaidLocked("pro", true) === false, "Pro unlocks with verified access");

  // 3. Customer Release Gate Tier Expectations
  // Basic: 10 minimum signals, 4 evidence rows
  // Pro: 14 minimum signals, 7 evidence rows
  // Advanced: 20 minimum signals, 12 evidence rows
  ok(PASS2291_TIER_EXPECTATIONS.basic.minimumSignals === 10, "Basic requires 10 minimum signals");
  ok(PASS2291_TIER_EXPECTATIONS.basic.evidenceRows === 4, "Basic requires 4 evidence rows");
  ok(PASS2291_TIER_EXPECTATIONS.pro.minimumSignals === 14, "Pro requires 14 minimum signals");
  ok(PASS2291_TIER_EXPECTATIONS.pro.evidenceRows === 7, "Pro requires 7 evidence rows");
  ok(PASS2291_TIER_EXPECTATIONS.advanced.minimumSignals === 20, "Advanced requires 20 minimum signals");
  ok(PASS2291_TIER_EXPECTATIONS.advanced.evidenceRows === 12, "Advanced requires 12 evidence rows");

  const basicGate = buildPass2289CustomerReleaseGate({
    locale: "en",
    surface: "shield",
    depth: "basic",
    assetText: "BTC",
    confirmedSources: ["coingecko"],
    paidAccessVerified: false,
    customerOutputText: "Basic Shield output",
  });
  ok(basicGate.depth === "basic", "Basic depth preserved");

  const proGate = buildPass2289CustomerReleaseGate({
    locale: "en",
    surface: "shield",
    depth: "pro",
    assetText: "BTC",
    confirmedSources: ["coingecko", "binance"],
    paidAccessVerified: false,
    customerOutputText: "Pro Shield output",
  });
  ok(proGate.depth === "pro", "Pro depth preserved");
  ok(proGate.paidLocked === true, "Pro without access verification remains locked");

  const advancedGate = buildPass2289CustomerReleaseGate({
    locale: "en",
    surface: "shield",
    depth: "advanced",
    assetText: "BTC",
    confirmedSources: ["coingecko", "binance", "kraken"],
    paidAccessVerified: false,
    customerOutputText: "Advanced Shield output",
  });
  ok(advancedGate.depth === "advanced", "Advanced depth preserved");
  ok(advancedGate.advancedLocked === true, "Advanced is locked");

  // 4. Server-Side Enforcement (Anti-Bypass & Advanced Not For Sale)
  // Advanced is not publicly for sale even with payment claims
  const advancedReplay = buildPass2291ProductionReplayGate({
    locale: "en",
    surface: "angel",
    depth: "advanced",
    assetText: "BTC",
    confirmedSources: ["coingecko"],
    paidAccessVerified: false,
    customerOutputText: "Advanced test output",
  });
  ok(advancedReplay.advancedLocked === true, "Advanced must stay locked on public surface");
  ok(advancedReplay.replayIssues.includes("advanced-not-for-sale"), "Advanced must be flagged as not-for-sale");
  ok(advancedReplay.releaseAllowed === false, "Advanced cannot be released on public unverified tier");

  console.log(`PASS-015 Tier Gates & Customer Value: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

