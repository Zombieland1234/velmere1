import fs from "node:fs";

const checks = [
  ["components/market-integrity/TokenRiskModal.tsx", "shield-vlm-detail-panel-pass327", "Orbit drawer has PASS327 scroll class"],
  ["components/market-integrity/TokenRiskModal.tsx", "data-pass327-native-scroll", "Orbit drawer exposes native scroll marker"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "vis-scan-vmark", "Lens scan CTA uses Velmère V mark"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "data-pass327-v-scan-a4-polish", "Lens page exposes PASS327 polish marker"],
  ["app/api/search/lens-report/route.ts", "Human brief", "PDF route includes human-readable brief"],
  ["components/shop/ShopPageClient.tsx", "data-pass327-lookbook-trim", "Clothing lookbook trim marker exists"],
  ["app/globals.css", "PASS327 · Orbit native scroll", "CSS PASS327 override exists"],
  ["app/globals.css", "border-radius: 999px !important;", "Orbit cards have circular node override"],
];

const failures = [];
for (const [file, needle, label] of checks) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes(needle)) failures.push(`${label} missing in ${file}`);
}

const searchClient = fs.readFileSync("components/search/VelmereIntelligenceSearchClient.tsx", "utf8");
if (searchClient.includes('<Sparkles className="h-4 w-4"')) {
  failures.push("Lens scan CTA still uses Sparkles/Gemini-like icon");
}
const pressureRegime = fs.readFileSync("lib/market-integrity/market-pressure-regime.ts", "utf8");
if (pressureRegime.includes('id: "trust"') || pressureRegime.includes('label: "trust"')) {
  failures.push("Market pressure rail still renders a public trust chip");
}
const productCard = fs.readFileSync("components/product/ProductCard.tsx", "utf8");
for (const forbidden of ["provider/SKU", "checkout zablokowany"]) {
  if (productCard.includes(forbidden)) failures.push(`Public product card still contains forbidden phrase: ${forbidden}`);
}

if (failures.length) {
  console.error("PASS327 verify failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS327 verify passed: Orbit native scroll, V scan mark, A4 PDF brief and lookbook trim markers are present.");
