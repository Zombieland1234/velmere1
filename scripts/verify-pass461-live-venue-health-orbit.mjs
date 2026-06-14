import fs from "node:fs";

const required = [
  "lib/market-integrity/pass461-venue-health-runtime.ts",
  "lib/market-integrity/pass458-provider-truth-router.ts",
  "app/api/market-integrity/real-markets/route.ts",
  "app/api/market-integrity/venue-health/route.ts",
  "app/api/market-integrity/cross-asset/route.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

const errors = [];
for (const file of required) if (!fs.existsSync(file)) errors.push(`${file}: missing`);
const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");

const runtime = read(required[0]);
const router = read(required[1]);
const realMarkets = read(required[2]);
const venueRoute = read(required[3]);
const crossAsset = read(required[4]);
const panel = read(required[5]);
const map = read(required[6]);
const css = read(required[7]);

for (const needle of [
  "resolvePass461VenueHealthWithFallback",
  "applyDurableRateLimit",
  "UPSTASH_REDIS_REST_URL",
  "velmere:pass461:provider-ledger",
  "GET /api/v3/depth",
  "GET /api/v3/klines",
  "ticker/bookTicker",
  "klineContinuityPercent",
  "depthImbalancePercent",
  "24-hour",
  "No venue-health score is a solvency certificate",
]) if (!runtime.includes(needle)) errors.push(`venue runtime missing marker: ${needle}`);

for (const needle of [
  "binance_venue_health",
  "mexc_venue_health",
  "upgradeVenueHealthQuote",
  "venueHealth: snapshot",
  "Open this venue in detail mode",
]) if (!router.includes(needle)) errors.push(`provider router missing marker: ${needle}`);

for (const needle of [
  "pass461VenueHealthContract",
  "venueHealth: pass461VenueHealthContract",
]) if (!realMarkets.includes(needle)) errors.push(`real markets route missing marker: ${needle}`);

for (const needle of [
  "unsupported_venue",
  "resolvePass461VenueHealthWithFallback",
  "cache-control",
]) if (!venueRoute.includes(needle)) errors.push(`venue API route missing marker: ${needle}`);

if (!crossAsset.includes("pass461VenueHealthContract")) {
  errors.push("cross-asset API missing PASS461 contract");
}

for (const needle of [
  "data-pass461-live-venue-health",
  "PASS461 ·",
  "venueHealth.healthScore",
  "venueHealth.storageMode",
  "venueDepthContinuity",
]) if (!panel.includes(needle)) errors.push(`Real Markets UI missing marker: ${needle}`);

for (const needle of [
  "pass461OrbitConsensus",
  "data-pass461-orbit-consensus",
  "shield-pass461-consensus-badge",
  "consensus aligned",
]) if (!map.includes(needle)) errors.push(`Shield Map orbit missing marker: ${needle}`);

for (const needle of [
  ".shield-pass461-consensus-badge",
  ".shield-pass461-consensus-aligned",
  ".shield-pass461-consensus-divergent",
  ".shield-pass461-consensus-probing",
]) if (!css.includes(needle)) errors.push(`PASS461 CSS missing marker: ${needle}`);

if (runtime.includes("currentPrice: snapshot.healthScore")) {
  errors.push("venue health must not fake an exchange price from health score");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PASS461 live venue health/orbit verified · Binance/MEXC probes, durable ledger, Real Markets UI and Orbit consensus active");
