import { readFileSync } from "node:fs";

const checks = [];
const add = (name, pass, detail = "") => checks.push({ name, pass, detail });
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const pkg = JSON.parse(read("package.json"));
const crossAsset = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const brain = read("components/market-integrity/VlmNeuralAuditExperience.tsx");
const realApi = read("app/api/market-integrity/real-markets/route.ts");
const globals = read("app/globals.css");
const envDoctor = read("scripts/check-runtime-env.mjs");

add(
  "runtime env doctor script exposed",
  pkg.scripts?.["doctor:runtime-env"] === "node scripts/check-runtime-env.mjs",
  "package.json must expose a visible preflight for Node 24/npm 11",
);
add(
  "runtime env doctor blocks wrong major versions",
  envDoctor.includes("nodeMajor === 24") && envDoctor.includes("npmMajor === 11") && envDoctor.includes("Runtime env mismatch"),
);
add(
  "real markets modal uses unified asset surface",
  crossAsset.includes('data-unified-asset-modal="real-markets"') && crossAsset.includes("real-markets-unified-asset-modal"),
);
add(
  "real markets modal is chart-first and reduced",
  crossAsset.includes("AdvancedMarketChart") && crossAsset.includes("Analysis modes") && crossAsset.includes("Sources and missing data"),
);
add(
  "real markets modal has only requested timeframe tabs",
  crossAsset.includes('["15m", "1h", "4h", "1d", "1w"] as RangeKey[]') && !crossAsset.includes('["1h", "4h", "1d", "1w"] as RangeKey[]'),
);
add(
  "real markets api supports 15m range",
  realApi.includes('"15m": { range: "1d", interval: "1m"') && realApi.includes('rangeValue === "15m"'),
);
add(
  "VLM brain has continuous 72s rotation constant",
  brain.includes("const VLM_NEURAL_SPIN_CYCLE_MS = 72_000") && brain.includes("requestAnimationFrame(tick)") && brain.includes("calmSpin"),
);
add(
  "VLM brain tier loading durations are explicit",
  brain.includes('mode === "advanced" ? 7_200') && brain.includes('mode === "pro" ? 4_600 : 2_600'),
);
add(
  "Real Markets unified modal CSS exists",
  globals.includes("PASS824-PASS833") && globals.includes(".real-markets-unified-asset-modal") && globals.includes(".real-markets-analysis-mode"),
);
add(
  "no escaped JSX quote leftovers in edited TSX files",
  !/\\\\"/.test(crossAsset) && !/\\\\"/.test(brain),
);

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? "OK" : "FAIL"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (failed.length) {
  console.error(`\nPASS824-833 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}

console.log(`\nPASS824-833 runtime cleanup verifier passed: ${checks.length}/${checks.length}`);
