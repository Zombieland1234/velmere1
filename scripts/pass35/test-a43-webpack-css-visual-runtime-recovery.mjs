#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { scanCssModulePurity } from "../lib/css-module-purity.mjs";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
let checks = 0;
function ok(value, message) { checks += 1; assert.ok(value, message); }


const parity = JSON.parse(read("config/pass35/a43-visual-source-parity.json"));
const sha256 = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
for (const row of parity.files) {
  ok(exists(row.path), `visual parity file missing: ${row.path}`);
  ok(sha256(row.path) === row.a43Sha256, `visual parity file drifted: ${row.path}`);
  if (row.classification === "byte_identical") {
    ok(row.a43Sha256 === row.visualSourceSha256, `byte-identical visual file no longer matches source: ${row.path}`);
  }
}
for (const row of parity.assets) {
  ok(exists(row.path), `visual asset missing: ${row.path}`);
  ok(sha256(row.path) === row.sha256, `visual asset drifted: ${row.path}`);
}
for (const row of parity.legacyNamedReview) {
  ok(!exists(row.path), `legacy/parallel visual component must not be silently reintroduced: ${row.path}`);
}

const bootstrap = read("scripts/velmere-dev-bootstrap.mjs");
ok(bootstrap.includes("smoke:runtime:a43"), "A43 bootstrap must point Windows operator to the A43 smoke command");

const css = read("components/intelligence/IntelligencePage.module.css");
ok(!css.includes("\n:global(#risk-engine),"), "bare global Intelligence selector must be removed");
ok(css.includes(".page :global(#risk-engine),"), "Intelligence anchors must be scoped by local page class");
const purity = scanCssModulePurity(root);
ok(purity.ok, `all CSS Modules selectors must be pure: ${JSON.stringify(purity.failures.slice(0, 5))}`);

for (const route of [
  "app/[locale]/page.tsx",
  "app/[locale]/search/page.tsx",
  "app/[locale]/market-integrity/page.tsx",
  "app/[locale]/shield-pro/page.tsx",
  "app/[locale]/shield-map/page.tsx",
  "app/[locale]/atelier/page.tsx",
  "app/[locale]/intelligence/page.tsx",
]) ok(exists(route), `missing active visual route ${route}`);

for (const component of [
  "components/home/HomePageClient.tsx",
  "components/home/NeuralBrainVisual.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/ShieldRealMarketsParityClient.tsx",
  "components/market-integrity/ShieldProCleanTerminalClient.tsx",
  "components/market-integrity/ShieldMapCommandClient.tsx",
  "components/market-integrity/AssetDetailModal.tsx",
  "components/atelier/AtelierPage.tsx",
  "components/ui/VelmereRouteTransition.tsx",
  "components/PageTransition.tsx",
]) ok(exists(component), `missing active visual component ${component}`);

for (const route of [
  "app/api/market-integrity/markets/route.ts",
  "app/api/market-integrity/klines/route.ts",
  "app/api/market-integrity/market-intelligence/route.ts",
  "app/api/market-integrity/investigator/route.ts",
]) ok(exists(route), `missing direct data route ${route}`);

const shield = read("components/market-integrity/ShieldRealMarketsParityClient.tsx");
ok(shield.includes('/api/market-integrity/markets?perPage=250'), "Shield must fetch canonical market sweep");
ok(shield.includes("readJsonResponseBounded"), "Shield response must remain bounded");
const shieldPro = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
ok(shieldPro.includes('/api/market-integrity/markets?perPage=100'), "Shield Pro must fetch canonical market sweep");
ok(shieldPro.includes('PARTIAL · NOT LIVE'), "Shield Pro must not mislabel partial data as live");
const modal = read("components/market-integrity/AssetDetailModal.tsx");
ok(modal.includes("AssetIntelligenceTabs"), "active popup must include Market Impact / Whale Watch tabs");
ok(modal.includes("acquireAssetDetailScrollLock"), "active popup must use shared modal runtime");

process.stdout.write(`PASS35 A43 webpack/CSS/visual runtime recovery: ${checks}/${checks} PASS\n`);
