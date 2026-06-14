import fs from "node:fs";
import path from "node:path";

const required = [
  "lib/market-integrity/pass459-alpha-vantage-provider.ts",
  "lib/market-integrity/pass459-provider-truth-pdf-runtime.ts",
  "lib/market-integrity/pass458-provider-truth-router.ts",
  "app/api/market-integrity/real-markets/route.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "lib/market-integrity/shield-chat.ts",
  "components/market-integrity/TokenRiskModal.tsx",
  "lib/search/lens-report.ts",
  "app/api/search/lens-report/route.ts",
];
const errors = [];
for (const file of required) if (!fs.existsSync(file)) errors.push(`${file}: missing`);
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const alpha = read(required[0]);
const pdf = read(required[1]);
const router = read(required[2]);
const route = read(required[3]);
const panel = read(required[4]);
const chat = read(required[5]);
const modal = read(required[6]);
const lens = read(required[7]);
const pdfRoute = read(required[8]);

for (const needle of [
  "ALPHA_VANTAGE_API_KEY",
  "GLOBAL_QUOTE",
  "OVERVIEW",
  "CURRENCY_EXCHANGE_RATE",
  "GOLD_SILVER_SPOT",
  "Batch tables never burn keyed-provider quota",
  "providerEvidence",
  "rate_limited",
]) if (!alpha.includes(needle)) errors.push(`alpha adapter missing marker: ${needle}`);

for (const needle of [
  "resolvePass459AlphaVantageSnapshot",
  "allowKeyedProvider",
  "upgradeAlphaVantageQuote",
  "providerStatus",
  "primaryProviderConfigured",
]) if (!router.includes(needle)) errors.push(`truth router missing marker: ${needle}`);

for (const needle of [
  'url.searchParams.get("detail") === "1"',
  "allowKeyedProvider: detail && requested.length === 1",
  "detailHydration",
]) if (!route.includes(needle)) errors.push(`real markets route missing marker: ${needle}`);

for (const needle of [
  "&detail=1",
  "data-pass459-keyed-provider-truth",
  "PASS459 Keyed Provider Truth",
  "providerEvidence",
  "primaryProviderConfigured",
]) if (!panel.includes(needle)) errors.push(`real markets UI missing marker: ${needle}`);

for (const needle of [
  "ShieldChatSourceContext",
  "sourceContract",
  "providerPlan",
  "providerFacts",
  "buildDefaultShieldSourceContext",
]) if (!chat.includes(needle)) errors.push(`shield chat missing marker: ${needle}`);

for (const needle of [
  "data-pass459-shield-provider-truth",
  "answer.sourceContract",
  "answer.providerPlan",
  "answer.providerFacts",
]) if (!modal.includes(needle)) errors.push(`shield modal missing marker: ${needle}`);

for (const needle of [
  "pass459-provider-truth-pdf",
  "claimBoundary",
  "providerFacts",
  "Missing provider fields become a concrete provider plan",
]) if (!pdf.includes(needle)) errors.push(`PDF runtime missing marker: ${needle}`);

for (const needle of [
  "Pass459ProviderTruthPdf",
  "buildPass459ProviderTruthPdf",
  "pass459:",
]) if (!lens.includes(needle)) errors.push(`lens report missing marker: ${needle}`);

for (const needle of [
  "PASS459 · Provider truth",
  "report.pass459?.sourceContract",
  "report.pass459?.claimBoundary",
]) if (!pdfRoute.includes(needle)) errors.push(`PDF route missing marker: ${needle}`);

if (/apikey\s*[:=]\s*key/i.test(panel + modal + lens + pdfRoute)) errors.push("client/PDF surface may expose provider API key");

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(".");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`PASS459 keyed provider/PDF/AI verified · ${sourceFiles.length} TS/TSX files indexed`);
