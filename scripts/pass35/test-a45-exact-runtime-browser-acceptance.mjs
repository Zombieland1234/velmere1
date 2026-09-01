#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const root = process.cwd();
const failures = [];
let checks = 0;
function check(id, ok, detail = null) { checks += 1; if (!ok) failures.push({ id, detail }); }
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
const contract = JSON.parse(read("config/pass35/a45-exact-runtime-browser-acceptance.json"));
const pkg = JSON.parse(read("package.json"));
check("revision", contract.revisionId === "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE", contract.revisionId);
check("parent", contract.parentRevisionId === "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING", contract.parentRevisionId);
check("runtime_node", contract.expectedRuntime.node === "24.18.0", contract.expectedRuntime);
check("runtime_npm", contract.expectedRuntime.npm === "11.16.0", contract.expectedRuntime);
check("routes_14", contract.routes.length === 14, contract.routes.length);
check("browser_rows_minimum_54", contract.routes.length * 4 + 1 >= 54, contract.routes.length * 4 + 1);
check("locales_3", contract.locales.join(",") === "pl,en,de", contract.locales);
check("popup_4", contract.requiredPopupTabs.join(",") === "overview,analysis,market-impact,whale-watch", contract.requiredPopupTabs);
for (const route of contract.routes) {
  check(`route:${route.id}:suffix`, typeof route.suffix === "string", route);
  check(`route:${route.id}:selector`, typeof route.selector === "string" && route.selector.length > 3, route);
}
const browser = read("scripts/a45-browser-acceptance.mjs");
for (const token of ["horizontalOverflowPx", "brokenImages", "pageerror", "consoleErrors", "httpErrors", "shield-popup-four-tabs", "playwright install chromium", "animations: \"disabled\"", "VELMERE_A45_QA_FIXTURE_PATH", "generateA45QaFixture", "installA45QaFixtureRoutes", "rect.width > 0", "fixture interception is enabled", "settleRelevantImages", "image.loading = \"eager\"", "imageSettle"]) check(`browser:${token}`, browser.includes(token));
const exact = read("scripts/a45-exact-runtime-acceptance.mjs");
for (const token of ["wrong_node", "wrong_npm", "build-webpack", "build-turbopack", "sourceUnchanged", "browser-acceptance", "http-smoke"]) check(`exact:${token}`, exact.includes(token));
check("package_accept", pkg.scripts?.["accept:runtime:a45"] === "node scripts/a45-exact-runtime-acceptance.mjs", pkg.scripts?.["accept:runtime:a45"]);
check("package_browser", pkg.scripts?.["accept:browser:a45"] === "node scripts/a45-browser-acceptance.mjs", pkg.scripts?.["accept:browser:a45"]);
check("package_diagnostics", pkg.scripts?.["diagnose:runtime:a45"] === "node scripts/a45-runtime-diagnostics.mjs --write", pkg.scripts?.["diagnose:runtime:a45"]);
const a44 = JSON.parse(read("config/pass35/a44-visual-master-engine-binding.json"));
check("a44_visual_depth", a44.activeVisualFiles?.length === 338, a44.activeVisualFiles?.length);
check("a44_engine_depth", a44.protectedEngineFiles?.length === 510, a44.protectedEngineFiles?.length);
const report = { schemaVersion: "velmere.pass35.a45.contract-test.v1", revisionId: contract.revisionId, summary: { checks, passed: checks - failures.length, failed: failures.length }, failures };
console.log(JSON.stringify(report.summary));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
