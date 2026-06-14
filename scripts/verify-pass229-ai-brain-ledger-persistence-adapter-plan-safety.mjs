import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const required = ["buildVlmBrainLedgerPersistenceAdapterPlan", "data-vlm-ledger-persistence-adapter-plan=\"pass229\"", "PASS229 marker: selected VLM Brain tile maps source/case/redaction/export ledger writes"];
for (const marker of required) if (!modal.includes(marker)) errors.push(`TokenRiskModal missing ${marker}`);
if (!css.includes("PASS225–PASS232 — AI Brain release readiness mega-branch")) errors.push("globals.css missing PASS225-232 CSS");
if (!pkg.includes("verify:pass229-ai-brain-ledger-persistence-adapter-plan")) errors.push("package.json missing verify script verify:pass229-ai-brain-ledger-persistence-adapter-plan");
if (!preflight.includes("verify-pass229-ai-brain-ledger-persistence-adapter-plan-safety.mjs")) errors.push("vercel-preflight missing verify-pass229-ai-brain-ledger-persistence-adapter-plan-safety.mjs");
if (modal.includes("enter seed phrase") || modal.includes("guaranteed profit") || modal.includes("safe investment")) errors.push("Forbidden wording returned in modal");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("PASS229 guard OK");
