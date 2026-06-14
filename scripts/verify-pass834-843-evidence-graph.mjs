import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  {
    name: "Shield Map has explicit evidence graph product role",
    file: "components/market-integrity/ShieldMapClient.tsx",
    test: (s) => s.includes('data-pass834-shield-map-role="evidence-graph"') && s.includes('data-pass834-no-price-table="true"') && s.includes('data-pass834-no-pdf-duplicate="true"'),
  },
  {
    name: "Shield Map graph contains the full WHY chain",
    file: "components/market-integrity/ShieldMapClient.tsx",
    test: (s) => ["Sources", "Facts", "Signals", "Conflicts", "Missing Data", "Confidence", "VLM Verdict"].every((token) => s.includes(token)),
  },
  {
    name: "Shield Map node opens right drawer details",
    file: "components/market-integrity/ShieldMapClient.tsx",
    test: (s) => s.includes("<DrawerRoot") && s.includes('surfaceData={{ "pass834-evidence-node-drawer"') && s.includes("setAtlasDrawerOpen(true)"),
  },
  {
    name: "Shield Map search remains a single premium entry point",
    file: "components/market-integrity/ShieldMapClient.tsx",
    test: (s) => s.includes("shield-map-evidence-search") && s.includes("onSubmit={runInvestigatorScan}"),
  },
  {
    name: "Shield Map CSS supports desktop graph and mobile list",
    file: "app/globals.css",
    test: (s) => s.includes(".shield-map-evidence-graph") && s.includes("@media (max-width: 720px)") && s.includes("prefers-reduced-motion"),
  },
  {
    name: "Real Markets modal still exposes unified asset modal contract",
    file: "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
    test: (s) => s.includes('data-unified-asset-modal="real-markets"') && s.includes('["15m", "1h", "4h", "1d", "1w"]'),
  },
  {
    name: "Shield modal has no duplicate JSX className attribute in metric cards",
    file: "components/market-integrity/TokenRiskModal.tsx",
    test: (s) => !/key=\{label\}[\s\S]{0,220}className="rounded-2xl border border-white\/\[0\.08\][\s\S]{0,220}className="rounded-2xl border border-white\/\[0\.08\]/.test(s),
  },
  {
    name: "VLM analysis durations stay tiered and premium",
    file: "components/market-integrity/VlmNeuralAuditExperience.tsx",
    test: (s) => s.includes("2_600") && s.includes("4_600") && s.includes("7_200") && s.includes("72_000"),
  },
  {
    name: "Runtime environment doctor is still present",
    file: "scripts/check-runtime-env.mjs",
    test: (s) => s.includes("Node 24") || s.includes(">=24.16.0 <25"),
  },
  {
    name: "PASS report placeholder created",
    file: "PASS834_843_IMPLEMENTATION_REPORT.md",
    test: (s) => s.includes("PASS834") && s.includes("Shield Map") && s.includes("Node 24"),
  },
];

let failed = 0;
for (const check of checks) {
  const source = read(check.file);
  const ok = check.test(source);
  console.log(`${ok ? "PASS" : "FAIL"} ${check.name}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  console.error(`PASS834-843 verifier failed: ${failed}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS834-843 verifier passed: ${checks.length}/${checks.length}`);
