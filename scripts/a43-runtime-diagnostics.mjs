#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { scanCssModulePurity } from "./lib/css-module-purity.mjs";
import { currentNpmVersion, VELMERE_RUNTIME } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const checks = [];
function check(id, ok, detail = null) { checks.push({ id, ok: Boolean(ok), detail }); }

const purity = scanCssModulePurity(root);
check("css_modules:pure_selectors", purity.ok, purity.failures.slice(0, 20));
check("css_modules:intelligence_anchor_fix", fs.readFileSync(path.join(root, "components/intelligence/IntelligencePage.module.css"), "utf8").includes(".page :global(#risk-engine)"));
check("visual:home_route", fs.existsSync(path.join(root, "app/[locale]/page.tsx")));
check("visual:browser_route", fs.existsSync(path.join(root, "app/[locale]/search/page.tsx")));
check("visual:shield_route", fs.existsSync(path.join(root, "app/[locale]/market-integrity/page.tsx")));
check("visual:shield_pro_route", fs.existsSync(path.join(root, "app/[locale]/shield-pro/page.tsx")));
check("visual:shield_map_route", fs.existsSync(path.join(root, "app/[locale]/shield-map/page.tsx")));
check("visual:atelier_route", fs.existsSync(path.join(root, "app/[locale]/atelier/page.tsx")));
check("visual:asset_popup", fs.existsSync(path.join(root, "components/market-integrity/AssetDetailModal.tsx")));
check("data:markets_direct_route", fs.existsSync(path.join(root, "app/api/market-integrity/markets/route.ts")));
check("data:klines_direct_route", fs.existsSync(path.join(root, "app/api/market-integrity/klines/route.ts")));
check("data:market_intelligence_direct_route", fs.existsSync(path.join(root, "app/api/market-integrity/market-intelligence/route.ts")));
check("runtime:node", process.versions.node === VELMERE_RUNTIME.node, process.versions.node);
check("runtime:npm", currentNpmVersion() === VELMERE_RUNTIME.npm, currentNpmVersion());

const failed = checks.filter((row) => !row.ok);
const report = {
  schemaVersion: "velmere.pass35.a43.runtime-diagnostics.v1",
  revisionId: "VELMERE_PASS35_A43_WEBPACK_CSS_VISUAL_RUNTIME_RECOVERY",
  generatedAt: new Date().toISOString(),
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  cssModulePurity: purity,
};
if (write) {
  const target = path.join(root, "artifacts/pass35/PASS35_A43_RUNTIME_DIAGNOSTICS.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
process.stdout.write(`${JSON.stringify({ checks: report.checks, passed: report.passed, failed: report.failed }, null, 2)}\n`);
if (failed.length) {
  for (const row of failed) process.stderr.write(`[A43] ${row.id}: ${JSON.stringify(row.detail)}\n`);
  process.exit(1);
}
