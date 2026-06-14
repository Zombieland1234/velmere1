#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const checks = [];
const read = (path) => readFileSync(path, "utf8");
const assert = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });

const pkg = JSON.parse(read("package.json"));
const unified = read("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
const shield = read("components/market-integrity/TokenRiskModal.tsx");
const real = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const microScript = read("scripts/create-gemini-micro-handoff.mjs");
const css = read("app/globals.css");

assert("package exposes Gemini micro handoff", pkg.scripts?.["handoff:gemini-micro"] === "node scripts/create-gemini-micro-handoff.mjs");
assert("package exposes PASS864-873 verifier", pkg.scripts?.["verify:pass864-873-shield-shell-gemini-micro"] === "node scripts/verify-pass864-873-shield-shell-gemini-micro.mjs");
assert("UnifiedAssetModalShell supports close button ref for focus return", unified.includes("closeButtonRef?: Ref<HTMLButtonElement>") && unified.includes("ref={closeButtonRef}"));
assert("Shield imports UnifiedAssetModalShell", shield.includes("UnifiedAssetModalShell,") && shield.includes("@/components/market-integrity/UnifiedAssetAnalysisControls"));
assert("Shield renders shared shell as shield kind", shield.includes("<UnifiedAssetModalShell") && shield.includes('kind="shield"'));
assert("Shield shared shell owns chart/timeframes/depth", shield.includes("chartSlot={") && shield.includes("<PopupMarketChart") && shield.includes("timeframeSlot={") && shield.includes("depthSlot={") && shield.includes("<UnifiedAnalysisDepthDock"));
assert("Shield old popup grid removed from modal JSX", !shield.includes('className="shield-token-popup-grid"'));
assert("Real Markets still renders shared shell", real.includes("<UnifiedAssetModalShell") && real.includes('kind="real-markets"'));
assert("Gemini micro script creates one bundle and low file-count archive", microScript.includes("VELMERE_PROJECT_BUNDLE.md") && microScript.includes("fileCountInsideZip: 4") && microScript.includes("too many files"));
assert("CSS has shared modal shell styling", css.includes("unified-asset-modal-shell") && css.includes("unified-asset-depth-dock"));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
}
if (failed.length) {
  console.error(`PASS864-873 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS864-873 verifier passed: ${checks.length}/${checks.length}`);
