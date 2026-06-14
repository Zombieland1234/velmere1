import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const required = ["buildVlmBrainReleaseBlockerResolver", "data-vlm-release-blocker-resolver=\"pass225\"", "PASS225 marker: selected VLM Brain tile resolves P0/P1 release blockers"];
for (const marker of required) if (!modal.includes(marker)) errors.push(`TokenRiskModal missing ${marker}`);
if (!css.includes("PASS225–PASS232 — AI Brain release readiness mega-branch")) errors.push("globals.css missing PASS225-232 CSS");
if (!pkg.includes("verify:pass225-ai-brain-release-blocker-resolver")) errors.push("package.json missing verify script verify:pass225-ai-brain-release-blocker-resolver");
if (!preflight.includes("verify-pass225-ai-brain-release-blocker-resolver-safety.mjs")) errors.push("vercel-preflight missing verify-pass225-ai-brain-release-blocker-resolver-safety.mjs");
if (modal.includes("enter seed phrase") || modal.includes("guaranteed profit") || modal.includes("safe investment")) errors.push("Forbidden wording returned in modal");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("PASS225 guard OK");
