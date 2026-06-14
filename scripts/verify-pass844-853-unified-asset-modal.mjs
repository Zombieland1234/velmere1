import { readFileSync } from "node:fs";

const checks = [];
function read(path) {
  return readFileSync(path, "utf8");
}
function check(name, condition, detail = "") {
  checks.push({ name, condition: Boolean(condition), detail });
}

const shared = read("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
const shield = read("components/market-integrity/TokenRiskModal.tsx");
const real = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const css = read("app/globals.css");

check(
  "shared asset control component exists",
  shared.includes("UnifiedTimeframeTabs") && shared.includes("UnifiedAnalysisDepthDock"),
);
check(
  "shared controls expose audit data attributes",
  shared.includes('data-unified-asset-timeframes="true"') &&
    shared.includes('data-unified-asset-depth-dock="true"'),
);
check(
  "tier loading labels remain explicit",
  shared.includes('basic: "2–3s"') &&
    shared.includes('pro: "4–5s"') &&
    shared.includes('advanced: "6–8s"'),
);
check(
  "Shield imports shared asset controls",
  shield.includes("UnifiedAnalysisDepthDock") && shield.includes("UnifiedTimeframeTabs"),
);
check(
  "Real Markets imports shared asset controls",
  real.includes("UnifiedAnalysisDepthDock") && real.includes("UnifiedTimeframeTabs"),
);
check(
  "Shield chart exposes five timeframes with 1W label",
  shield.includes('{ value: "15m", label: "15M" }') &&
    shield.includes('{ value: "7d", label: "1W" }') &&
    shield.includes('testIdPrefix="shield-chart-range"'),
);
check(
  "Real Markets chart exposes five timeframes with native 1w value",
  real.includes('{ value: "15m", label: "15M" }') &&
    real.includes('{ value: "1w", label: "1W" }'),
);
check(
  "Shield has shared depth dock inside asset modal",
  shield.includes("<UnifiedAnalysisDepthDock") &&
    shield.includes("onSelect={runVlmAiSequence}") &&
    (shield.includes("depthSlot={") || shield.includes('className="mt-4 hidden md:grid"')),
);
check(
  "Real Markets uses shared depth dock to trigger VLM Brain",
  real.includes("options={realMarketsDepthOptions}") &&
    real.includes("onSelect={setAuditMode}"),
);
check(
  "shared focus/reduced-motion CSS exists",
  css.includes("PASS844-PASS853") &&
    css.includes(".unified-asset-timeframe-tabs button:focus-visible") &&
    css.includes("prefers-reduced-motion: reduce"),
);

const failed = checks.filter((item) => !item.condition);
for (const item of checks) {
  console.log(`${item.condition ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
if (failed.length) {
  console.error(`PASS844-853 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS844-853 verifier passed: ${checks.length}/${checks.length}`);
