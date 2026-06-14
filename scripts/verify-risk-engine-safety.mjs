import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const riskPath = path.join(root, "lib/market-integrity/risk-engine.ts");
const typesPath = path.join(root, "lib/market-integrity/risk-types.ts");
const errors = [];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

const risk = read(riskPath);
const types = read(typesPath);

const forbidden = [
  ["result.limitations", "Limitations must live in metaModel.limitations, not result.limitations."],
  ["RISK {riskScore}%", "Do not render old duplicated risk text below the VLM orb."],
  ["odczyt ryzyka", "Old Polish duplicate risk text must not return."],
  ["risk extraction", "Old English duplicate risk extraction copy must not return."],
  ["((index % 5)", "The old undefined index transform bug must not return."],
  ["(index % 4)", "The old undefined index transform bug must not return."],
  ["window.", "risk-engine.ts must not use browser APIs."],
  ["document.", "risk-engine.ts must not use browser APIs."],
  ["localStorage", "risk-engine.ts must not use browser APIs."],
];

for (const [needle, message] of forbidden) {
  if (risk.includes(needle)) errors.push(`risk-engine.ts: ${message}`);
}

if (/\[\s*\.\.\.\s*[^;\n]*(?:\.values\(\)|\.keys\(\)|\.entries\(\))/.test(risk)) {
  errors.push("risk-engine.ts: do not spread Map/Set iterators directly; use Array.from(...) for Vercel target safety.");
}

if (!/export function analyzeTokenRisk\s*\(/.test(risk)) {
  errors.push("risk-engine.ts: analyzeTokenRisk export is missing.");
}
if (!/export function levelFromScore\s*\(/.test(risk)) {
  errors.push("risk-engine.ts: levelFromScore export is missing.");
}
if (!/export function badgeFromLevel\s*\(/.test(risk)) {
  errors.push("risk-engine.ts: badgeFromLevel export is missing.");
}
if (!/metaModel/.test(risk) || !/limitations/.test(risk)) {
  errors.push("risk-engine.ts: metaModel/limitations handling is missing.");
}
if (!/AssetMode/.test(risk) || !/stablecoin/.test(risk) || !/rwa/.test(risk)) {
  errors.push("risk-engine.ts: asset profile handling for stablecoin/RWA is missing.");
}
if (!/confidence/.test(risk) || !/computeDataConfidence/.test(risk)) {
  errors.push("risk-engine.ts: confidence model is missing.");
}
if (!/manual review required/i.test(risk)) {
  errors.push("risk-engine.ts: operator-grade manual review language is missing.");
}
if (/\b(buy now|safe buy|guaranteed profit|scam proven|fraud confirmed|moon|easy money)\b/i.test(risk)) {
  errors.push("risk-engine.ts: unsafe hype/advice/legal-accusation language found.");
}

const signalUnionMatch = types.match(/export type RiskSignalId =([\s\S]*?);/);
if (signalUnionMatch) {
  const allowed = new Set(Array.from(signalUnionMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]));

  const arraySignalIds = Array.from(
    risk.matchAll(/const\s+[A-Z_]+_SIGNAL_IDS:\s*RiskSignalId\[\]\s*=\s*\[([\s\S]*?)\];/g),
  ).flatMap((match) => Array.from(match[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]));

  const addSignalIds = Array.from(
    risk.matchAll(/addSignal\(\s*signals,\s*\{[\s\S]*?id:\s*"([^"]+)"/g),
  ).map((m) => m[1]);

  for (const id of [...arraySignalIds, ...addSignalIds]) {
    if (!allowed.has(id)) errors.push(`risk-engine.ts: signal id "${id}" is not declared in RiskSignalId.`);
  }
} else {
  errors.push("risk-types.ts: RiskSignalId union could not be parsed.");
}

if (errors.length) {
  console.error("Risk engine safety check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Risk engine safety checks passed.");
