import fs from "node:fs";

const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass531-secondary-candle-overlay.ts",
  "lib/market-integrity/pass532-provider-retry-telemetry.ts",
  "lib/market-integrity/pass533-pdf-multilingual-typesetting.ts",
  "lib/market-integrity/pass534-source-lineage.ts",
  "lib/market-integrity/pass535-shield-attachment-linking.ts",
  "tests/e2e/pass536-mobile-gesture-viewports.spec.ts",
  "playwright.config.ts",
  "scripts/verify-pass537-node20-next-route-smoke.mjs",
];
for (const file of requiredFiles) if (!fs.existsSync(file)) errors.push(`missing ${file}`);

const markers = [
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass531-secondary-overlay", "data-pass532-provider-retry-telemetry", "data-pass531-overlay-scale"]],
  ["app/api/search/lens-report/route.ts", ["buildPass533TypesettingAudit", "splitPass533PdfToken", "PASS533"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass534-source-lineage", "activeSourceLineage"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass535-attachment-linking", "attachmentId", "sourceId"]],
];
for (const [file, required] of markers) {
  const source = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const marker of required) if (!source.includes(marker)) errors.push(`${file} missing ${marker}`);
}

const chart = fs.readFileSync("components/market-integrity/AdvancedMarketChart.tsx", "utf8");
if (/Math\.random\(/.test(chart)) errors.push("chart overlay/retry runtime must not use Math.random()");
const overlay = fs.readFileSync("lib/market-integrity/pass531-secondary-candle-overlay.ts", "utf8");
if (/interpolat/i.test(overlay) && !/never interpolates|not interpolated/i.test(overlay)) errors.push("secondary overlay must not interpolate missing candles");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of ["verify:pass531-537-premium-provider-pdf-lineage", "test:e2e:mobile", "verify:pass537-node20-next-route-smoke"]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass531-537-premium-provider-pdf-lineage")) errors.push("PASS531–537 verifier missing from build");
if (!packageJson.devDependencies?.["@playwright/test"]) errors.push("@playwright/test missing from devDependencies");

if (errors.length) {
  console.error("PASS531–537 gate failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`PASS531–537 gate PASS · ${requiredFiles.length} files · provider overlay/retry · PDF typesetting · source/attachment lineage · mobile E2E`);
