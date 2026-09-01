#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const diagnostics = spawnSync(process.execPath, ["scripts/a41-route-diagnostics.mjs", "--write"], {
  cwd: root,
  encoding: "utf8",
});
if (diagnostics.stdout) process.stdout.write(diagnostics.stdout);
if (diagnostics.stderr) process.stderr.write(diagnostics.stderr);
if (diagnostics.status !== 0) process.exit(diagnostics.status ?? 1);

const evidence = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a41/PASS35_A41_ROUTE_DIAGNOSTICS.json"), "utf8"));
const checks = [];
const failures = [];
function check(name, ok, detail = undefined) {
  const row = { name, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!row.ok) failures.push(row);
}
check("diagnostics_all_pass", evidence.summary.failed === 0, evidence.summary);
check("diagnostics_minimum_depth", evidence.summary.checks >= 100, evidence.summary.checks);

const bootstrap = fs.readFileSync(path.join(root, "scripts/velmere-dev-bootstrap.mjs"), "utf8");
check("bootstrap_a41_contract", bootstrap.includes("route recovery contract A41"));
check("bootstrap_home_url", bootstrap.includes("http://localhost:3000/pl"));
check("bootstrap_browser_url", bootstrap.includes("http://localhost:3000/pl/search"));
check("bootstrap_shield_url", bootstrap.includes("http://localhost:3000/pl/market-integrity"));
check("bootstrap_shield_pro_url", bootstrap.includes("http://localhost:3000/pl/shield-pro"));
check("bootstrap_shield_map_url", bootstrap.includes("http://localhost:3000/pl/shield-map"));

const productCells = fs.readFileSync(path.join(root, "config/pass35/product-cell-catalog.json"), "utf8");
check("stop_sell_preserved", !productCells.includes('"sellEnabled": true'));

const dispatchers = [
  ["app/api/market-integrity/[operation]/route.ts", "MARKET_INTEGRITY_ROUTES"],
  ["app/api/search/[operation]/route.ts", "SEARCH_ROUTES"],
  ["app/api/market-integrity/vlm/[operation]/route.ts", "MARKET_INTEGRITY_VLM_ROUTES"],
  ["app/api/market-integrity/real-markets/[operation]/route.ts", "REAL_MARKETS_ROUTES"],
];
for (const [file, registry] of dispatchers) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  check(`${file}:node_runtime`, text.includes('runtime = "nodejs"'));
  check(`${file}:force_dynamic`, text.includes('dynamic = "force-dynamic"'));
  check(`${file}:registry_dispatch`, text.includes(registry) && text.includes("dispatchLazyRoute"));
  check(`${file}:options_gate`, text.includes("optionsLazyRoute"));
}

const retiredShells = [
  "app/api/market-integrity/markets/route.ts",
  "app/api/market-integrity/search/route.ts",
  "app/api/market-integrity/investigator/route.ts",
  "app/api/market-integrity/market-intelligence/route.ts",
  "app/api/market-integrity/klines/route.ts",
  "app/api/market-integrity/real-markets/route.ts",
  "app/api/market-integrity/vlm/route.ts",
  "app/api/search/bridge/route.ts",
  "app/api/search/lens-report/route.ts",
  "app/api/search/lens-route/route.ts",
  "app/api/search/live-preview/route.ts",
  "app/api/search/token-metadata/route.ts",
];
for (const file of retiredShells) check(`${file}:retired`, !fs.existsSync(path.join(root, file)));

const result = {
  schemaVersion: "velmere.pass35.a41.browser-shield-runtime-recovery.v2",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Static source recovery and registry-dispatch diagnostics only. Exact npm ci/Next compile/browser/provider execution remain unproven in this environment.",
  summary: { checks: checks.length + evidence.summary.checks, passed: checks.filter((row) => row.ok).length + evidence.summary.passed, failed: failures.length + evidence.summary.failed },
  failures: [...evidence.failures, ...failures],
  checks: [...evidence.checks, ...checks],
};
const output = path.join(root, "artifacts/pass35/a41/PASS35_A41_BROWSER_SHIELD_RUNTIME_RECOVERY.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (result.summary.failed) process.exit(1);
