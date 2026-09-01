import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const problems = [];
const warnings = [];

function requireIncludes(file, needles, label = file) {
  const body = read(file);
  for (const needle of needles) {
    if (!body.includes(needle)) problems.push(`${label} missing required marker: ${needle}`);
  }
}

function forbidIn(file, needles, label = file) {
  const body = read(file);
  for (const needle of needles) {
    if (body.includes(needle)) problems.push(`${label} still contains release-blocker copy/logic: ${needle}`);
  }
}

function warnIn(file, needles, label = file) {
  const body = read(file);
  for (const needle of needles) {
    if (body.includes(needle)) warnings.push(`${label} still contains watchlist copy: ${needle}`);
  }
}

const publicLensFiles = [
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/api/search/lens-report/route.ts",
  "lib/ai/vlm-brain-lens-adapter.ts",
];
const publicModalFiles = [
  "components/market-integrity/AssetDetailModal.tsx",
  "app/api/market-integrity/vlm/route.ts",
  "lib/ai/vlm-public-evidence-packet.ts",
  "lib/ai/angel-evidence-context.ts",
  "components/angel/AngelPanel.tsx",
  "app/api/angel/route.ts",
];
const forbiddenPublicCopy = [
  "No critical gap",
  "Strong order book depth",
  "tighter spreads",
  "real market demand",
  "MEGA-PASS",
  "density cap",
  "NEEDS_REVIEW",
  "BLOCKED ·",
  "SOURCE: MISSING",
  "VLM Kernel:",
  "kernel packet",
  "pakiet kernela",
  "Kernel-Paket",
];

for (const file of [...publicLensFiles, ...publicModalFiles]) {
  if (!exists(file)) problems.push(`missing file: ${file}`);
}
for (const file of publicLensFiles) forbidIn(file, forbiddenPublicCopy, `public lens surface ${file}`);
for (const file of publicModalFiles) forbidIn(file, forbiddenPublicCopy.slice(0, 8), `public modal/angel surface ${file}`);

requireIncludes("components/market-integrity/AssetDetailModal.tsx", [
  "/api/market-integrity/advanced-click-runtime",
  "/api/market-integrity/vlm",
  "publicEvidencePacket",
  "serverEvidenceStatus",
  "buildVlmModalEvidencePacket",
], "AssetDetailModal server evidence/gate");

requireIncludes("components/search/VelmereIntelligenceSearchClient.tsx", [
  "NEXT_PUBLIC_VELMERE_QA_UNLOCK_ADVANCED_PDF",
  "Pobierz PDF",
  "download",
], "Lens/PDF client");

requireIncludes("app/api/search/lens-report/route.ts", [
  "buildLensPdfEvidencePacket2247",
  "evidencePacket",
  "previewDownloadParity",
  "sourceCoverage",
], "Lens/PDF route evidence parity");

requireIncludes("lib/market-integrity/coingecko.ts", [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "tether",
  "usd-coin",
  "dogecoin",
], "canonical crypto resolver");

requireIncludes("app/globals.css", [
  "vlm-asset-detail-modal--analysis-loading",
  "overscroll-behavior",
  "-webkit-overflow-scrolling",
  "scrollbar-color",
], "mobile modal/pdf scroll CSS");

requireIncludes("components/angel/AngelPanel.tsx", [
  "data-angel-evidence-mode",
  "marketPrompt",
  "pdfPrompt",
  "evidenceKicker",
], "Angel evidence UI");

const deMessages = JSON.parse(read("messages/de.json"));
const deAngel = JSON.stringify(deMessages.Angel ?? {});
for (const englishLeak of ["Open Velmère assistant", "Store status", "Payments", "Write to the assistant"]) {
  if (deAngel.includes(englishLeak)) problems.push(`messages/de.json leaks English Angel copy: ${englishLeak}`);
}

const qaPanel = read("components/launch/RealBrowserQaPanel.tsx");
if (qaPanel.includes("[\"Orbit Basic\"") || qaPanel.includes("[\"Orbit Pro\"") || qaPanel.includes("[\"Orbit Advanced\"")) {
  problems.push("RealBrowserQaPanel still names primary route Orbit instead of Shield Map");
}
if (!qaPanel.includes("Shield Map Basic") || !qaPanel.includes("Shield Map Advanced")) {
  problems.push("RealBrowserQaPanel missing Shield Map QA naming");
}

warnIn("components/lab/VelmereMotionLabClient.tsx", ["Kernel boot"], "non-critical lab surface");

if (problems.length) {
  console.error("VELMERE_RELEASE_EVIDENCE_QA_FAILED");
  for (const problem of problems) console.error(`- ${problem}`);
  if (warnings.length) {
    console.error("WARNINGS");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  check: "VELMERE_RELEASE_EVIDENCE_QA_OK",
  surfaces: {
    lensPdf: publicLensFiles.length,
    modalAngel: publicModalFiles.length,
    canonicalAssets: ["BTC", "ETH", "SOL", "BNB", "USDT", "USDC", "DOGE"],
  },
  warnings,
}, null, 2));
