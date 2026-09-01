import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mustHaveAngelKeys = [
  "evidenceKicker",
  "evidenceHint",
  "marketAction",
  "marketPrompt",
  "pdfAction",
  "pdfPrompt",
  "hudGas",
  "hudNetwork",
  "hudSynapse",
];
const unsupportedClaimWords = [
  "Strong order book depth",
  "tighter spreads",
  "real market demand",
  "No critical gap",
];
const requiredAssets = ["BTC", "ETH", "SOL", "BNB", "USDT", "AAPL", "NVDA", "GOOGL", "MSFT", "ADS.DE", "BMW.DE", "MC.PA"];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const problems = [];
for (const locale of ["pl", "en", "de"]) {
  const messages = JSON.parse(read(`messages/${locale}.json`));
  const angel = messages.Angel ?? {};
  for (const key of mustHaveAngelKeys) {
    if (typeof angel[key] !== "string" || !angel[key].trim()) problems.push(`messages/${locale}.json missing Angel.${key}`);
  }
  if (locale === "de") {
    const deBlob = JSON.stringify(angel);
    for (const englishLeak of ["Open Velmère assistant", "Store status", "Payments", "Write to the assistant"]) {
      if (deBlob.includes(englishLeak)) problems.push(`messages/de.json still leaks English copy: ${englishLeak}`);
    }
  }
}

const angelContext = read("lib/ai/angel-evidence-context.ts");
for (const symbol of requiredAssets) {
  if (!angelContext.includes(`symbol: "${symbol}"`)) problems.push(`angel evidence context missing asset detector: ${symbol}`);
}
for (const forbidden of unsupportedClaimWords) {
  if (read("app/api/angel/route.ts").includes(forbidden) || angelContext.includes(forbidden)) problems.push(`Angel route/context still contains unsupported claim phrase: ${forbidden}`);
}

const panel = read("components/angel/AngelPanel.tsx");
for (const marker of ["data-angel-evidence-mode", "marketPrompt", "pdfPrompt"]) {
  if (!panel.includes(marker)) problems.push(`AngelPanel missing marker ${marker}`);
}

const stream = read("app/api/angel/stream/route.ts");
const duplicatePass2238 = (stream.match(/pass2238:\s*PASS2238_ANGEL_STREAM_CUTOVER_MARKER/g) ?? []).length;
if (duplicatePass2238 > 6) problems.push(`stream route has too many duplicated pass2238 diagnostics (${duplicatePass2238})`);

if (problems.length) {
  console.error("VELMERE_ANGEL_EVIDENCE_QA_FAILED");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  check: "VELMERE_ANGEL_EVIDENCE_QA_OK",
  locales: ["pl", "en", "de"],
  requiredAssets,
  angelPanel: "evidence quick actions present",
}, null, 2));
