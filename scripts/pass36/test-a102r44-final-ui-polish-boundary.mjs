#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const REV = "VELMERE_PASS36_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R43_ACTION_REQUIRED_FINAL_UI_UX_PERFORMANCE_HARDENING_AND_BLOCKED_FAULT_EMULATION_NO_LIVE_CREDIT";
let checks = 0;
const check = (condition, id) => { checks += 1; assert.ok(condition, id); };
const text = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const json = (relativePath) => JSON.parse(text(relativePath));

const active = text("VELMERE_ACTIVE_PASS.txt").trim();
const authority = json("config/pass36/current-release-authority.json");
const state = json("config/pass36/a102r44-action-required-current-state.json");
check(active === REV, "authority.active");
check(authority.authorityRevisionId === REV && authority.parentRevisionId === PARENT, "authority.identity");
check(state.globalDecision === "NO_GO" && state.live === false && state.saleEnabled === false, "authority.fail-closed");
check(state.productionApproved === false && state.worldClassProven === false, "authority.no-promotion");

const layout = text("app/layout.tsx");
check(layout.lastIndexOf('import "./styles/final-ui-polish.css";') > layout.lastIndexOf("premium-ui.css"), "css.final-import-last");
const polish = text("app/styles/final-ui-polish.css");
check(polish.includes('[data-browser-search-shell="single-outline-no-ambient-card"]'), "browser.single-shell-selector");
check(polish.includes("background: transparent") && polish.includes("box-shadow: none"), "browser.ambient-shell-removed");
check(polish.includes('header[data-audit-header="simplified"]') && polish.includes("background: #060709"), "audit.header-contrast");

const transition = text("components/ui/VelmereRouteTransition.tsx");
check(transition.includes('document.addEventListener("click", onDocumentClick, true)'), "transition.capture-owner");
check(transition.includes('document.removeEventListener("click", onDocumentClick, true)'), "transition.capture-cleanup");
check(transition.includes("data.noRouteTransition") || transition.includes("dataset.noRouteTransition"), "transition.explicit-opt-out");

const shieldParity = text("components/market-integrity/ShieldRealMarketsParityClient.tsx");
check(shieldParity.includes("const metricsUnavailable = referenceMode || rows.length === 0") && shieldParity.includes('value={rows.length ? String(rows.length) : "—"}') && shieldParity.includes("progress={metricsUnavailable ? undefined : stats.active}"), "shield.unavailable-metrics-withheld");
const crossAsset = text("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
check(crossAsset.includes("const activePercentReady = verifiedRiskValues.length > 0") && crossAsset.includes('value: activePercentReady ? `${activePercent}%` : "—"') && crossAsset.includes('progressPercent: activePercentReady ? activePercent : undefined'), "real-markets.unavailable-active-percent-withheld");
const packager = text("scripts/pass36/package-a102r44-deterministic.mjs");
check(packager.includes("a90ToA102PassCredit: false"), "package.a58-no-credit-field");

for (const relativePath of [
  "components/market-integrity/ShieldProCleanTerminalClient.tsx",
  "components/market-integrity/ShieldRealMarketsParityClient.tsx",
]) {
  const source = text(relativePath);
  check(source.includes('current === "reference" ? "reference" : "stale"'), `${relativePath}.stale-downgrade`);
  check(source.includes("LAST_KNOWN_GOOD"), `${relativePath}.last-known-good-label`);
  check(source.includes("rowsAvailableRef.current"), `${relativePath}.retained-row-boundary`);
}

const globe = text("components/market-integrity/ShieldProMonochromeGlobe.tsx");
const globeCss = text("components/market-integrity/ShieldProMonochromeGlobe.module.css");
check(globe.includes("const pointStep = compact ? 4 : 2"), "globe.density-bounded");
check(globe.includes("ArrayBuffer.isView") || globe.includes("Array.isArray"), "globe.payload-validation");
check(globe.includes("value[0] >= -90") && globe.includes("value[1] >= -180"), "globe.coordinate-bounds");
check(globe.includes("ResizeObserver") && globe.includes("cancelAnimationFrame"), "globe.resource-cleanup");
check(globeCss.includes("top: 1.75rem"), "globe.desktop-raised");
check(globeCss.includes("prefers-reduced-motion"), "globe.reduced-motion");

const geography = json("public/images/atelier/world-real-land-points-v4.json");
check(Array.isArray(geography) && geography.length === 16_000, "globe.real-land-denominator");
const unique = new Set();
for (const row of geography) {
  const [lat, lon] = row;
  unique.add(`${lat}:${lon}`);
}
check(geography.every((row) => Array.isArray(row) && row.length === 3), "globe.row-shape");
check(geography.every(([lat]) => Number.isFinite(lat) && lat >= -90 && lat <= 90), "globe.latitude");
check(geography.every(([, lon]) => Number.isFinite(lon) && lon >= -180 && lon <= 180), "globe.longitude");
check(geography.every(([, , weight]) => Number.isFinite(weight)), "globe.weight");
check(unique.size === 16_000, "globe.unique-points");

const moduleUrl = `${pathToFileURL(path.join(ROOT, "lib/market-integrity/shield-pro-full-catalog-client.ts")).href}?r44=${Date.now()}`;
const catalog = await import(moduleUrl);
const blocked = await catalog.fetchShieldProFullCatalog({
  fetchImpl: async () => new Response(JSON.stringify({ mode: "error", error: "api_canonical_origin_not_configured", rows: [] }), {
    status: 503,
    headers: { "content-type": "application/json" },
  }),
});
check(blocked.mode === "error" && blocked.rows.length === 0, "catalog.http-error-fail-closed");
check(blocked.blocker === "api_canonical_origin_not_configured", "catalog.http-error-reason-preserved");
check(blocked.pagesFetched === 1 && blocked.complete === false, "catalog.http-error-bounded");

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44.final-ui-polish-boundary.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  status: "PASS_A102R44_FINAL_UI_POLISH_BOUNDARY_LOCAL_ONLY_NO_LIVE_CREDIT",
  checks,
  geographyRows: geography.length,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
