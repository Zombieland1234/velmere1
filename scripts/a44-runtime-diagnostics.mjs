#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { scanCssModulePurity } from "./lib/css-module-purity.mjs";
import { currentNpmVersion, VELMERE_RUNTIME } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const staticOnly = process.argv.includes("--static");
const checks = [];
function check(id, ok, detail = null, skipped = false) {
  checks.push({ id, ok: Boolean(ok), skipped: Boolean(skipped), detail });
}
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function sha256(relativePath) { return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex"); }

const revision = "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING";
const contractPath = "config/pass35/a44-visual-master-engine-binding.json";
let contract = null;
try {
  contract = JSON.parse(read(contractPath));
  check("contract:loads", true);
} catch (error) {
  check("contract:loads", false, error instanceof Error ? error.message : String(error));
}

const required = [
  "VELMERE_ACTIVE_PASS.txt", "VELMERE_A43_PATCH.txt", "VELMERE_A44_PATCH.txt", "VELMERE_START_A44.cmd",
  contractPath, "scripts/a44-runtime-diagnostics.mjs", "scripts/a44-source-integrity-audit.mjs", "scripts/pass35/test-a44-visual-master-engine-binding.mjs",
  "app/layout.tsx", "app/[locale]/page.tsx", "app/[locale]/search/page.tsx",
  "app/[locale]/market-integrity/page.tsx", "app/[locale]/shield-pro/page.tsx",
  "app/[locale]/shield-map/page.tsx", "app/[locale]/real-markets/page.tsx",
  "app/[locale]/atelier/page.tsx", "app/[locale]/intelligence/page.tsx",
  "app/[locale]/security/audits/page.tsx", "components/market-integrity/AssetDetailModal.tsx",
  "components/market-integrity/AssetIntelligenceTabs.tsx", "components/market-integrity/AssetIntelligenceTabs.module.css",
  "components/market-integrity/asset-detail/market-intelligence-client-runtime.ts",
  "app/styles/premium-ui.css", "app/styles/vlm-analysis-tab.css",
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);

const packageJson = JSON.parse(read("package.json"));
check("identity:visual_pass", packageJson.velmereVisualPass === revision, packageJson.velmereVisualPass);
check("identity:runtime_parent", packageJson.velmerePass === "VELMERE_PASS35_A42_DEV_RUNTIME_CACHE_RECOVERY", packageJson.velmerePass);
check("identity:patch_marker", read("VELMERE_A44_PATCH.txt").includes(revision));
check("identity:contract_revision", contract?.revisionId === revision, contract?.revisionId);
check("identity:visual_source", contract?.visualSourceZip?.filename === "VELMERE_VISUAL_MASTER_CLEAN.zip", contract?.visualSourceZip);

const rootLayout = read("app/layout.tsx");
check("styles:premium_import", rootLayout.includes('./styles/premium-ui.css'));
check("styles:analysis_import", rootLayout.includes('./styles/vlm-analysis-tab.css'));
const modal = read("components/market-integrity/AssetDetailModal.tsx");
for (const tab of ["overview", "analysis", "market-impact", "whale-watch"]) check(`popup:tab:${tab}`, modal.includes(tab));
check("popup:market_runtime_mount", modal.includes("AssetIntelligenceTabs"));
const runtime = read("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
check("runtime:bounded_bytes", runtime.includes("MAX_RUNTIME_RESPONSE_BYTES") && runtime.includes("response.body.getReader()"));
check("runtime:fatal_utf8", runtime.includes('new TextDecoder("utf-8", { fatal: true })'));
check("runtime:no_store", runtime.includes('cache: "no-store"'));
check("runtime:timeout", runtime.includes("MAX_RUNTIME_REQUEST_MS") && runtime.includes("AbortController"));
check("runtime:no_synthetic_generator", !read("components/market-integrity/AssetIntelligenceTabs.tsx").includes("stableHash"));

const purity = scanCssModulePurity(root);
check("css_modules:pure", purity.ok, purity.failures.slice(0, 20));
check("css_modules:intelligence_anchor", read("components/intelligence/IntelligencePage.module.css").includes(".page :global(#risk-engine)"));

if (contract) {
  const hashedSets = [
    ["activeVisualFiles", contract.activeVisualFiles, "candidateSha256"],
    ["publicAssets", contract.publicAssets, "sha256"],
    ["protectedEngineFiles", contract.protectedEngineFiles, "sha256"],
  ];
  for (const [name, rows, hashKey] of hashedSets) {
    check(`contract:${name}:array`, Array.isArray(rows), typeof rows);
    if (!Array.isArray(rows)) continue;
    let verified = 0;
    const failures = [];
    for (const row of rows) {
      const relativePath = row.path;
      const expected = row[hashKey];
      if (!relativePath || !expected || !fs.existsSync(path.join(root, relativePath))) {
        failures.push({ relativePath, reason: "missing_or_unbound" });
        continue;
      }
      const actual = sha256(relativePath);
      if (actual !== expected) failures.push({ relativePath, expected, actual });
      else verified += 1;
    }
    check(`contract:${name}:hashes`, failures.length === 0, { verified, expected: rows.length, failures: failures.slice(0, 10) });
  }
  const aliases = Array.isArray(contract.aliases) ? contract.aliases : [];
  const aliasFailures = aliases.filter((row) => !row.alias || !row.target || !fs.existsSync(path.join(root, row.alias)) || !fs.existsSync(path.join(root, row.target)));
  check("contract:aliases:bindings", aliasFailures.length === 0, { verified: aliases.length - aliasFailures.length, expected: aliases.length, failures: aliasFailures.slice(0, 10) });
  const translationCount = Object.values(contract.messageLeaves ?? {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  check("contract:active_depth", contract.activeVisualFiles?.length === 338, contract.activeVisualFiles?.length);
  check("contract:asset_depth", contract.publicAssets?.length === 225, contract.publicAssets?.length);
  check("contract:translation_depth", translationCount === 6615, translationCount);
  check("contract:engine_depth", contract.protectedEngineFiles?.length === 510, contract.protectedEngineFiles?.length);
  check("contract:alias_depth", aliases.length === 150, aliases.length);
}

const cells = read("config/pass35/product-cell-catalog.json");
check("truth:stop_sell", !cells.includes('"sellEnabled": true'));
const audits = read("components/security/SecurityAuditsCleanPage.tsx");
check("truth:audit_pro_sku", audits.includes("vlm_pro_audit_review"));
check("truth:audit_advanced_sku", audits.includes("vlm_advanced_audit_human_review"));
const shieldPro = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
check("truth:shield_pro_not_live", shieldPro.includes("PARTIAL · NOT LIVE") || shieldPro.includes("PARTIAL") && shieldPro.includes("NOT LIVE"));

const a44Test = spawnSync(process.execPath, ["scripts/pass35/test-a44-visual-master-engine-binding.mjs"], { cwd: root, encoding: "utf8" });
check("regression:a44_contract", a44Test.status === 0, { status: a44Test.status, stdout: a44Test.stdout?.trim(), stderr: a44Test.stderr?.trim() });
const sourceAudit = spawnSync(process.execPath, ["scripts/a44-source-integrity-audit.mjs"], { cwd: root, encoding: "utf8" });
check("regression:a44_source_integrity", sourceAudit.status === 0, { status: sourceAudit.status, stdout: sourceAudit.stdout?.trim(), stderr: sourceAudit.stderr?.trim() });
check("package:a44_source_audit_script", packageJson.scripts?.["audit:source:a44"] === "node scripts/a44-source-integrity-audit.mjs", packageJson.scripts?.["audit:source:a44"]);

if (staticOnly) {
  check("runtime:node_exact", true, { observed: process.versions.node, expected: VELMERE_RUNTIME.node }, true);
  check("runtime:npm_exact", true, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm }, true);
} else {
  check("runtime:node_exact", process.versions.node === VELMERE_RUNTIME.node, { observed: process.versions.node, expected: VELMERE_RUNTIME.node });
  check("runtime:npm_exact", currentNpmVersion() === VELMERE_RUNTIME.npm, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm });
}

const failed = checks.filter((row) => !row.ok);
const report = {
  schemaVersion: "velmere.pass35.a44.runtime-diagnostics.v1",
  revisionId: revision,
  generatedAt: new Date().toISOString(),
  truthBoundary: staticOnly
    ? "Static A44 diagnostics. Exact Node/npm and browser runtime were intentionally not credited."
    : "Pre-start A44 diagnostics on the executing machine. Browser render and provider LIVE still require HTTP smoke and manual review.",
  runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: VELMERE_RUNTIME.node, expectedNpm: VELMERE_RUNTIME.npm },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length, skipped: checks.filter((row) => row.skipped).length },
  failures: failed,
  checks,
  cssModulePurity: purity,
};
if (write) {
  const target = path.join(root, "artifacts/pass35/a44/PASS35_A44_RUNTIME_DIAGNOSTICS.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(report.summary, null, 2));
if (failed.length) process.exit(1);
