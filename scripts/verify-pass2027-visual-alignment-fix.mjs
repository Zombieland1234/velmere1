import fs from "node:fs";

const checks = [
  ["components/market-integrity/UnifiedAssetAnalysisControls.tsx", "data-pass2027-modal=\"minimal-separated-windows-no-overlap\"", "PASS2027 modal contract"],
  ["components/market-integrity/UnifiedAssetAnalysisControls.tsx", "unified-asset-action-stack-pass2027", "Action stack wrapper for visible Basic/Pro/Advanced cards"],
  ["components/market-integrity/UnifiedAssetAnalysisControls.tsx", "data-pass2027-stage=\"one-chart-one-action-rail-no-nested-frame\"", "One chart + one rail stage"],
  ["app/globals.css", "PASS2027 — visual correction from live screenshots", "PASS2027 CSS lock"],
  ["app/globals.css", "opacity: 1 !important;\n  visibility: visible !important;", "Visible action cards guard"],
  ["app/globals.css", "grid-template-columns: minmax(0, 1fr) clamp(18rem, 22vw, 20.5rem)", "Chart/action column geometry"],
  ["components/security/VlmAuditCommandClient.tsx", "max-w-[calc(100vw-1.5rem)]", "Audit Watch wide layout"],
  ["components/market-integrity/ShieldMapCommandClient.tsx", "shield-map-typing-line", "Shield Map typed line"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "? \"index\"", "Real Markets index logo class fix"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "eyebrow=\"VLM Real Markets\"", "Real Markets simpler modal eyebrow"],
];

let failed = false;
for (const [file, needle, label] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`[FAIL] ${label}: ${file} missing ${needle}`);
    failed = true;
  } else {
    console.log(`[PASS] ${label}`);
  }
}

const css = fs.readFileSync("app/globals.css", "utf8");
if (/data-pass2027-modal[\s\S]*text-overflow:\s*ellipsis\s*!important/.test(css)) {
  console.error("[FAIL] PASS2027 modal should not reintroduce ellipsis in metric cards");
  failed = true;
} else {
  console.log("[PASS] Metric cards avoid forced ellipsis in PASS2027 block");
}

if (failed) process.exit(1);
console.log("PASS2027 visual alignment/live-screenshot verifier complete");
