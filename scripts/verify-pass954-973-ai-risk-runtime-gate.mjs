import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
}

const pkg = JSON.parse(read("package.json"));
const risk = read("lib/market-integrity/risk-engine.ts");
const codexHandoffDir = "docs/codex-handoff/ai-risk-brain";
const promptExists = existsSync(join(root, codexHandoffDir, "CODEX_PROMPT_AI_RISK_BRAIN_REWRITE.md"));
const codexEditExists = existsSync(join(root, codexHandoffDir, "CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts.txt"));
const codexTypesExist = existsSync(join(root, codexHandoffDir, "CODEX_REFERENCE_DO_NOT_EDIT_risk-types.ts.txt"));
const codexInvestigatorExists = existsSync(join(root, codexHandoffDir, "CODEX_REFERENCE_DO_NOT_EDIT_shield-investigator.ts.txt"));

check(
  "PASS954 verifier is registered in package.json",
  pkg.scripts?.["verify:pass954-973-ai-risk-runtime-gate"] ===
    "node scripts/verify-pass954-973-ai-risk-runtime-gate.mjs",
);
check("Codex AI risk rewrite prompt is present in docs/codex-handoff", promptExists);
check("Codex edit target copy is present as non-deployable .txt", codexEditExists);
check("Codex reference risk types copy is present as non-deployable .txt", codexTypesExist);
check("Codex reference investigator copy is present as non-deployable .txt", codexInvestigatorExists);
check("Risk engine moved to deterministic fusion v8", risk.includes('velmere-shield-deterministic-fusion-v8'));
check("Risk formula moved to v8", risk.includes('deterministic_weighted_multi_agent_fusion_v8'));
check("Demo confidence capped below 30%", risk.includes('dataQuality === "demo"') && risk.includes('? 0.28'));
check("Partial fallback confidence capped below 40% unless corroborated", risk.includes('dataQuality === "partial"') && risk.includes(': 0.39'));
check("Source ledger cap enforces no-source and single-source limits", risk.includes('sourceLedgerConfidenceCap') && risk.includes('sourceCount === 0 ? 0.28') && risk.includes('sourceCount === 1 ? 0.39'));
check("Missing-data cap remains active", risk.includes('missingCoreCount >= 7') && risk.includes('0.34 / profile.missingDataWeight'));
check("Limitations receive dataQuality context", risk.includes('dataQuality: TokenRiskResult["dataQuality"]'));
check("Demo limitations disclose fallback/local sample", risk.includes('local sample/fallback data; confidence capped below 30%'));
check("Partial limitations disclose capped provider state", risk.includes('partial provider data; confidence capped until live source ledger is corroborated'));
check("No result.limitations regression in risk engine", !risk.includes('result.limitations'));
check("No direct MapIterator spread in risk engine", !/\[\.\.\.[a-zA-Z0-9_$]+\.values\(\)\]/.test(risk));
check("No fake-safe language in risk engine summary", !/safe investment|guaranteed|profit promise|ROI/i.test(risk));
check("Node 24/npm 11 dry-run script remains available", typeof pkg.scripts?.["ci:node24-npm11-dry-run"] === "string" && pkg.scripts["ci:node24-npm11-dry-run"].includes('npm ci --ignore-scripts --dry-run'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "[PASS]" : "[FAIL]"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
console.log(`PASS954-973 AI risk runtime gate: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
