import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p11-runtime-customer-truth-policy.json"), "utf8"));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

check("schema", policy.schemaVersion === "velmere.pass36.a102r44p11.runtime-customer-truth-policy.v1");
check("revision", policy.revisionId?.includes("A102R44P11"));
check("global-fail-closed", policy.globalTruth?.decision === "NO_GO" && policy.globalTruth?.live === false && policy.globalTruth?.saleEnabled === false && policy.globalTruth?.productionApproved === false && policy.globalTruth?.worldClassProven === false);

const activeFiles = [
  "lib/ai/angel-route-policy.ts",
  "lib/ai/vlm-tier-differentiation.ts",
  "lib/ai/vlm-entitlement-output-firewall.ts",
  "lib/server/market-integrity-route-modules/access.ts",
  "lib/server/market-integrity-vlm-route-modules/access-policy.ts",
];
const activeText = activeFiles.map((rel) => read(rel)).join("\n");
const stalePricePatterns = [/(?:Pro|Advanced)[^\n]{0,100}(?:79[.,]99|149[.,]99)\s*(?:€|EUR)/i, /(?:79[.,]99|149[.,]99)\s*(?:€|EUR)[^\n]{0,100}(?:receipt|entitlement|checkout)/i];
check("active-public-audit-prices-zero", stalePricePatterns.every((re) => !re.test(activeText)));
check("pro-invitation-only-copy", /invitation-only beta|beta na zaproszenie|Einladungs-Beta/i.test(activeText));
check("advanced-not-for-sale-copy", /Advanced[^\n]{0,100}(?:not for sale|nie jest na sprzedaż|niedostępny w sprzedaży|nicht zum Verkauf)/i.test(activeText));
check("no-affirmative-human-review", !/(?:Advanced|Pro)[^\n]{0,100}(?:includes?|adds?|enters?)[^\n]{0,80}human review/i.test(activeText));

const advice = read("lib/ai/vlm-advice-boundary.ts");
check("probability-number-before-term", advice.includes("percent|procent|prozent") && advice.includes("prawdopodobienstw\\w*"));
const angelPolicy = read("lib/ai/angel-route-policy.ts");
check("angel-no-price-normalizer", !angelPolicy.includes("149.99€") && !angelPolicy.includes("149.99 EUR"));
check("angel-current-tier-boundary", angelPolicy.includes("Pro is invitation-only beta") && angelPolicy.includes("Advanced is not for sale"));

const globe = read("components/market-integrity/ShieldProMonochromeGlobe.tsx");
check("globe-single-land-fetch", (globe.match(/fetch\(LAND_POINTS_URL/g) ?? []).length === 1);
check("globe-gradient-cache", globe.includes("let oceanGradient: CanvasGradient | null") && globe.includes("oceanGradient = context.createRadialGradient"));
check("globe-no-image-smoothing", globe.includes("context.imageSmoothingEnabled = false"));
check("globe-adaptive-fps", globe.includes("targetFps") && globe.includes("? 20 : 30"));
check("globe-visibility-pause", globe.includes("IntersectionObserver") && globe.includes("visibilitychange") && globe.includes("documentVisible"));
check("globe-real-geography-fallback", globe.includes("world-real-land-points-v4") && globe.includes("world-orthographic-land-v6.webp") && globe.includes("no synthetic land shapes"));

const transition = read("components/ui/VelmereRouteTransition.tsx");
check("route-waits-for-fonts", transition.includes('document.fonts.status === "loaded"') && transition.includes("fontsReady"));
check("route-waits-for-critical-images", transition.includes("pendingAboveFoldImage") && transition.includes("!pendingAboveFoldImage"));
check("route-quiet-layout", transition.includes("stableSince") && transition.includes("layoutSettled"));
check("route-safety-bounded", transition.includes("ROUTE_TRANSITION_SAFETY_MS"));

const loader = path.join(root, "scripts/pass11/register-offline-ts-loader.mjs");
const angelTest = spawnSync(process.execPath, ["--import", loader, "tests/pass36/a102r44p11-angel-multicoin-safety.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, env: { ...process.env, NO_COLOR: "1" }, shell: false });
let angel;
try { angel = JSON.parse(angelTest.stdout); } catch { angel = null; }
check("angel-matrix-1083", angelTest.status === 0 && angel?.assertions === 1083 && angel?.passed === 1083 && angel?.failed === 0 && angel?.rejectedProviderCallsAllowed === 0, { exitCode: angelTest.status, stderr: angelTest.stderr?.slice(0, 1000), summary: angel && { assertions: angel.assertions, passed: angel.passed, failed: angel.failed, rejectedProviderCallsAllowed: angel.rejectedProviderCallsAllowed } });

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p11.runtime-customer-truth-verification.v1",
  status: failed.length ? "FAIL_R44P11_RUNTIME_CUSTOMER_TRUTH" : "PASS_R44P11_RUNTIME_CUSTOMER_TRUTH_LOCAL",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checksDetail: checks,
  angelSummary: angel && { assertions: angel.assertions, passed: angel.passed, failed: angel.failed, rejectedProviderCallsAllowed: angel.rejectedProviderCallsAllowed },
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
