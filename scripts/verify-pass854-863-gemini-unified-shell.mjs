#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from "node:fs";

const checks = [];
function check(label, ok) {
  checks.push({ label, ok: Boolean(ok) });
}
function text(path) {
  return readFileSync(path, "utf8");
}

const pkg = JSON.parse(text("package.json"));
const controls = text("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
const realMarkets = text("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const globals = text("app/globals.css");
const handoffReadme = text("GEMINI_HANDOFF_README.md");
const handoffScript = text("scripts/create-gemini-slim-handoff.mjs");

check("package exposes handoff:gemini-slim", pkg.scripts?.["handoff:gemini-slim"] === "node scripts/create-gemini-slim-handoff.mjs");
check("Gemini handoff README defines priority review goals", handoffReadme.includes("Primary review goals") && handoffReadme.includes("Find issues the human did not notice"));
check("Gemini handoff script excludes PASS reports and node_modules", handoffScript.includes("PASS reports") && handoffScript.includes("node_modules") && handoffScript.includes("EDITING_MAP"));
check("Gemini handoff script writes manifest and file list", handoffScript.includes("GEMINI_HANDOFF_MANIFEST.json") && handoffScript.includes("GEMINI_HANDOFF_FILES.txt"));
check("UnifiedAssetModalShell exported", controls.includes("export function UnifiedAssetModalShell"));
check("UnifiedAssetModalShell has shell marker", controls.includes('data-unified-asset-modal-shell="true"'));
check("UnifiedAssetModalShell preserves chart wheel ownership", controls.includes('data-modal-wheel-owner="true"'));
check("Real Markets imports UnifiedAssetModalShell", realMarkets.includes("UnifiedAssetModalShell"));
check("Real Markets uses shell for modal", realMarkets.includes('<UnifiedAssetModalShell') && realMarkets.includes('kind="real-markets"'));
check("Real Markets shell keeps five timeframes", realMarkets.includes('value: "15m"') && realMarkets.includes('value: "1w"'));
check("Real Markets shell keeps three depth controls", realMarkets.includes('value: "basic"') && realMarkets.includes('value: "pro"') && realMarkets.includes('value: "advanced"'));
check("Shared shell CSS exists", globals.includes("PASS854-PASS863") && globals.includes(".unified-asset-modal-shell"));

const zipPath = "dist-handoff/velmere_gemini_slim_pass863.zip";
check("local Gemini slim zip was generated", existsSync(zipPath) && statSync(zipPath).size > 500_000 && statSync(zipPath).size < 6_000_000);

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.label}`);
}
if (failed.length > 0) {
  console.error(`\n${failed.length} PASS854-863 checks failed.`);
  process.exit(1);
}
console.log(`\nPASS854-863 verifier passed (${checks.length}/${checks.length}).`);
