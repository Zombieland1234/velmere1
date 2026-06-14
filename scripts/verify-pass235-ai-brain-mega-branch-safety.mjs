import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const errors=[];
const modal=read("components/market-integrity/TokenRiskModal.tsx");
const css=read("app/globals.css");
const pkg=read("package.json");
const preflight=read("scripts/vercel-preflight.mjs");
const required=["PASS235 marker", "pass242"];
for (const marker of required) if (!modal.includes(marker)) errors.push(`TokenRiskModal missing ${marker}`);
if (!css.includes("PASS233–PASS242 — AI Brain mega branch control tower")) errors.push("globals.css missing PASS233-242 CSS marker");
if (!pkg.includes("verify:pass235-ai-brain")) errors.push("package.json missing pass235 verify script");
if (!preflight.includes("PASS233-PASS242 AI Brain mega branch guard")) errors.push("vercel-preflight missing mega branch guard");
if (modal.includes("guaranteed profit") || modal.includes("safe investment") || modal.includes("enter seed phrase")) errors.push("Forbidden wording returned in modal");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("PASS235 guard OK");
