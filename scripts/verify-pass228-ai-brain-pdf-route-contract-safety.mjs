import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const required = ["buildVlmBrainPdfRouteContract", "data-vlm-pdf-route-contract=\"pass228\"", "PASS228 marker: selected VLM Brain tile keeps binary PDF disabled"];
for (const marker of required) if (!modal.includes(marker)) errors.push(`TokenRiskModal missing ${marker}`);
if (!css.includes("PASS225–PASS232 — AI Brain release readiness mega-branch")) errors.push("globals.css missing PASS225-232 CSS");
if (!pkg.includes("verify:pass228-ai-brain-pdf-route-contract")) errors.push("package.json missing verify script verify:pass228-ai-brain-pdf-route-contract");
if (!preflight.includes("verify-pass228-ai-brain-pdf-route-contract-safety.mjs")) errors.push("vercel-preflight missing verify-pass228-ai-brain-pdf-route-contract-safety.mjs");
if (modal.includes("enter seed phrase") || modal.includes("guaranteed profit") || modal.includes("safe investment")) errors.push("Forbidden wording returned in modal");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("PASS228 guard OK");
