import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
};

const files = [
  "app/[locale]/real-markets/page.tsx",
  "app/[locale]/shield-map/page.tsx",
  "app/[locale]/collection/page.tsx",
  "app/real-markets/page.tsx",
  "app/shield-map/page.tsx",
  "app/collection/page.tsx",
];
for (const file of files) must(existsSync(file), `${file} missing`);

const realMarketsPage = read("app/[locale]/real-markets/page.tsx");
const shieldMapPage = read("app/[locale]/shield-map/page.tsx");
const collectionPage = read("app/[locale]/collection/page.tsx");
const marketClient = read("components/market-integrity/MarketIntegrityClient.tsx");
const crossAsset = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const shieldMap = read("components/market-integrity/ShieldMapCommandClient.tsx");
const handoff = read("lib/market-integrity/pass468-browser-shield-orbit-handoff.ts");
const cart = read("components/CartDrawer.tsx");
const smoke = read("scripts/smoke-routes.mjs");
const pkg = JSON.parse(read("package.json"));

must(realMarketsPage.includes('data-pass874-short-route="real-markets"'), "Real Markets short route marker missing");
must(realMarketsPage.includes("CrossAssetCollapseRadarPanel"), "Real Markets alias must render Real Markets panel");
must(shieldMapPage.includes('path: "/shield-map"'), "Shield Map metadata must use short route");
must(shieldMapPage.includes("ShieldMapCommandClient"), "Shield Map alias must render evidence graph client");
must(collectionPage.includes("redirect(`/${locale}/clothing`)"), "Collection alias must redirect to clothing without 404");

must(marketClient.includes('href="/shield-map"'), "Shield CTA must use /shield-map short route");
must(marketClient.includes('href="/real-markets"'), "Shield CTA must use /real-markets short route");
must(crossAsset.includes('href="/shield-map"'), "Real Markets nav must use /shield-map short route");
must(shieldMap.includes('href="/real-markets"'), "Shield Map nav must use /real-markets short route");
must(handoff.includes('packet.target === "orbit" ? "shield-map" : "market-integrity"'), "Browser Orbit handoff must use /shield-map short route");
must(!cart.includes('href="/legal/terms"'), "Cart must not link to missing /legal/terms route");
must(cart.includes('href="/terms"'), "Cart terms link must point to /terms");

for (const route of ["/collection", "/market-integrity", "/shield-map", "/real-markets", "/search", "/square", "/member", "/security"]) {
  must(smoke.includes(`"${route}"`), `smoke route missing ${route}`);
}
must(pkg.scripts["verify:pass874-883-route-surface-cleanup"] === "node scripts/verify-pass874-883-route-surface-cleanup.mjs", "package script missing for PASS874-883 verifier");

if (process.exitCode) process.exit(1);
console.log("PASS874-883 verify passed: short route aliases, product nav and cart route cleanup are wired.");
