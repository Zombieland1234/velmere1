import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const expect = (condition, label) => checks.push({ ok: Boolean(condition), label });

const brain = read("lib/ai/vlm-brain.ts");
const route = read("app/api/market-integrity/vlm/route.ts");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const workspace = read("components/market-integrity/VlmBrainWorkspace.tsx");
const map = read("components/market-integrity/ShieldMapCommandClient.tsx");
const neural = read("components/market-integrity/VlmNeuralAuditExperience.tsx");
const real = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const security = read("components/security/SecurityTrustPage.tsx");
const css = read("app/globals.css");

expect(brain.includes('version: "velmere-vlm-brain-v3"'), "VLM Brain uses a versioned canonical envelope");
expect(brain.includes("responseMimeType") && brain.includes("responseJsonSchema"), "Gemini is constrained to structured JSON");
expect(brain.includes('mode: "rules"'), "VLM Brain preserves a deterministic fallback");
expect(brain.includes("confidenceCap"), "AI confidence is bounded by source quality");
expect(route.includes("generateVlmBrainAnalysis"), "The shared VLM API route invokes the central brain");
expect(workspace.includes("/api/market-integrity/vlm"), "The shared UI workspace consumes the central API");
expect(modal.includes("<VlmBrainWorkspace"), "Shield asset analysis renders the shared VLM workspace");
expect(map.includes('surface="shield_map"'), "Shield Map renders the shared VLM workspace");
expect(css.includes(".vlm-brain-workspace"), "The VLM workspace has a complete premium visual layer");
expect(css.includes("prefers-reduced-motion"), "VLM motion respects reduced-motion preferences");
expect(shield.includes('sort="change30d"'), "Shield exposes 30-day sorting in the table header");
expect(shield.includes("onClick={() => updateSort(sort)}"), "Shield sort headers are directly interactive");
expect(!shield.includes("shield-sort-dock-button"), "The redundant sort dock is removed");
expect(!shield.includes("open AI"), "Technical open-AI row labels are removed");
expect(modal.includes("onWheelCapture={handleChartWheel}"), "Chart wheel input is captured locally");
expect(neural.includes("z-[3000001]"), "The neural analysis modal stays above other overlays");
expect(!neural.includes("onClick={() => setAmbientMotionPaused"), "The inactive evidence-motion button is removed from the header");
expect(real.includes("aria-pressed={auditMode === mode}"), "Real Markets analysis tiers expose their active state");
expect(security.includes('href="/market-integrity"'), "Security routes users to Shield instead of duplicating Shield Map");
expect(css.includes("pass733-orbit-turn 48s") && css.includes("animation-duration: 62s"), "The VLM orbit uses a slow continuous rotation");

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} · ${check.label}`);
if (failed.length) {
  console.error(`\nPASS746–751 release verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS746–751 unified VLM/UI release: PASS (${checks.length}/${checks.length})`);
