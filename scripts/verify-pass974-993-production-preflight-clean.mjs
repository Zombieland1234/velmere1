import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const npmrc = read(".npmrc");
const cleanZipScript = read("scripts/create-production-clean-zip.mjs");
const pass973Verifier = read("scripts/verify-pass954-973-ai-risk-runtime-gate.mjs");
const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
}

const rootEntries = readdirSync(root);
const rootCodexSourceArtifacts = rootEntries.filter((name) => /^CODEX_.*\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name));
const rootZipArtifacts = rootEntries.filter((name) => /\.(zip|tgz|rar|7z)$/i.test(name));

check("PASS974 verifier is registered", pkg.scripts?.["verify:pass974-993-production-preflight-clean"] === "node scripts/verify-pass974-993-production-preflight-clean.mjs");
check("Production clean ZIP script is registered", pkg.scripts?.["deploy:clean-zip"] === "node scripts/create-production-clean-zip.mjs");
check("No CODEX source artifacts remain in project root", rootCodexSourceArtifacts.length === 0, rootCodexSourceArtifacts.join(", "));
check("No ZIP artifacts remain in project root", rootZipArtifacts.length === 0, rootZipArtifacts.join(", "));
check("No TypeScript build info artifact remains in project root", !existsSync(join(root, "tsconfig.tsbuildinfo")));
check("Codex AI risk prompt moved to non-deploy docs lane", existsSync(join(root, "docs/codex-handoff/ai-risk-brain/CODEX_PROMPT_AI_RISK_BRAIN_REWRITE.md")));
check("Codex AI risk edit copy is .txt not deployable source", existsSync(join(root, "docs/codex-handoff/ai-risk-brain/CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts.txt")));
check("Codex AI risk types copy is .txt not deployable source", existsSync(join(root, "docs/codex-handoff/ai-risk-brain/CODEX_REFERENCE_DO_NOT_EDIT_risk-types.ts.txt")));
check("Codex AI risk investigator copy is .txt not deployable source", existsSync(join(root, "docs/codex-handoff/ai-risk-brain/CODEX_REFERENCE_DO_NOT_EDIT_shield-investigator.ts.txt")));
check("PASS954 verifier now checks docs/codex-handoff lane", pass973Verifier.includes("docs/codex-handoff/ai-risk-brain") && pass973Verifier.includes(".ts.txt"));
check("Node/npm engines remain strict", pkg.engines?.node === ">=24.16.0 <25" && pkg.engines?.npm === ">=11.16.0 <12" && npmrc.includes("engine-strict=true"));
check("npm 11 peer matrix still uses strict-peer-deps=false", npmrc.includes("strict-peer-deps=false") && npmrc.includes("legacy-peer-deps=true"));
check("Node 24/npm 11 dry-run script remains available", pkg.scripts?.["ci:node24-npm11-dry-run"]?.includes("npm ci --ignore-scripts --dry-run"));
for (const marker of [
  "EXCLUDED_DIRS",
  "node_modules",
  ".next",
  "docs/codex-handoff/",
  "EDITING_MAP",
  "RELEASE_PROOF_PASS641",
  "package-lock.json",
  ".tsbuildinfo",
]) {
  check(`Clean ZIP script contains exclusion/manifest marker ${marker}`, cleanZipScript.includes(marker));
}

const preflight = spawnSync(process.execPath, ["scripts/vercel-preflight.mjs"], {
  cwd: root,
  encoding: "utf8",
});
check("vercel:preflight passes after Codex artifact cleanup", preflight.status === 0, (preflight.stderr || preflight.stdout || "").trim());

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "[PASS]" : "[FAIL]"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
console.log(`PASS974-993 production preflight clean: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
