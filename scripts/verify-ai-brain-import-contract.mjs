import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const riskPath = "lib/market-integrity/risk-engine.ts";
const typesPath = "lib/market-integrity/risk-types.ts";
const risk = read(riskPath);
const types = read(typesPath);

const forbiddenRisk = [
  [" from \"fs\"", "risk-engine must not import Node fs."],
  [" from 'fs'", "risk-engine must not import Node fs."],
  [" from \"node:", "risk-engine must not import Node APIs."],
  ["fetch(", "risk-engine must stay pure; no fetch calls."],
  ["window.", "risk-engine must not use browser window."],
  ["document.", "risk-engine must not use browser document."],
  ["localStorage", "risk-engine must not use localStorage."],
  ["as any", "risk-engine must not add any casts."],
  ["safe investment", "risk-engine must not use safe-investment language."],
  ["guaranteed", "risk-engine must not use guaranteed language."],
  ["scam confirmed", "risk-engine must not claim confirmed scam."],
  ["fraud proven", "risk-engine must not claim proven fraud."],
  ["buy signal", "risk-engine must not emit buy signals."],
  ["sell signal", "risk-engine must not emit sell signals."],
  ["result.limitations", "limitations must live inside metaModel.limitations, not result.limitations."],
];

for (const [needle, message] of forbiddenRisk) {
  if (risk.toLowerCase().includes(needle.toLowerCase())) errors.push(`${riskPath}: ${message}`);
}

const requiredRiskSnippets = [
  ["export function analyzeTokenRisk", "public analyzeTokenRisk export must remain."],
  ["export function levelFromScore", "public levelFromScore export must remain."],
  ["export function badgeFromLevel", "public badgeFromLevel export must remain."],
  ["type AssetMode = \"standard\" | \"stablecoin\" | \"rwa\"", "asset mode profiling must distinguish standard/stablecoin/RWA."],
  ["computeDataConfidence", "data confidence function must remain."],
  ["buildLimitations", "limitations builder must remain."],
  ["computeFusedRiskScore", "fusion scorer must remain."],
  ["buildMetaModel", "meta-model builder must remain."],
  ["manual review required before escalation", "manual-review limitation must remain."],
  ["OSINT source ledger not attached", "OSINT/source-ledger limitation must remain."],
  ["vesting/unlock schedule not verified", "vesting/unlock limitation must remain."],
  ["KOL/social disclosure data missing", "KOL/social limitation must remain."],
  ["Missing data is not evidence of misconduct", "low-confidence wording must stay evidence-safe."],
];

for (const [needle, message] of requiredRiskSnippets) {
  if (!risk.includes(needle)) errors.push(`${riskPath}: ${message}`);
}

const typeUnionMatch = types.match(/export type RiskSignalId =([\s\S]*?);/);
if (!typeUnionMatch) {
  errors.push(`${typesPath}: RiskSignalId union not found.`);
} else {
  const unionSignals = new Set([...typeUnionMatch[1].matchAll(/\|\s+"([^"]+)"/g)].map((match) => match[1]));
  const riskSignals = new Set(
    [...risk.matchAll(/addSignal\(signals,\s*\{[\s\S]*?id:\s+"([^"]+)"/g)].map((match) => match[1])
  );
  for (const signal of riskSignals) {
    if (!unionSignals.has(signal)) errors.push(`${riskPath}: signal id "${signal}" is not present in RiskSignalId union.`);
  }
}

const resultTypeRequiredFields = [
  "score",
  "level",
  "badge",
  "signals",
  "scoreBreakdown",
  "agentAssessments",
  "metaModel",
  "aiSummary",
];
for (const field of resultTypeRequiredFields) {
  if (!types.includes(`${field}:`) && !types.includes(`${field}?:`)) {
    errors.push(`${typesPath}: TokenRiskResult should expose ${field}.`);
  }
}

const promptPath = "docs/codex-handoff/CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS3_PROMPT.md";
const prompt = read(promptPath);
for (const needle of [
  "WYŁĄCZNIE w folderze",
  "edytować dokładnie jeden plik",
  "CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine (1).ts",
  "NIE OTWIERAJ pełnego repo Velmère",
  "Format odpowiedzi końcowej",
]) {
  if (!prompt.includes(needle)) errors.push(`${promptPath}: prompt missing required instruction "${needle}".`);
}

if (errors.length) {
  console.error("AI brain import contract verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("AI brain import contract checks passed.");
