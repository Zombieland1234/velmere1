import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");
const json = (file) => JSON.parse(read(file));
const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

const pkg = json("package.json");
const vercel = json("vercel.json");
const tsconfig = json("tsconfig.json");
const npmrc = read(".npmrc");
const cleanZipScript = read("scripts/create-production-clean-zip.mjs");
const preflight = read("scripts/vercel-preflight.mjs");
const focusHook = read("components/ui/useDialogFocusBoundary.ts");
const scrollLock = read("components/ui/useModalScrollLock.ts");
const brain = read("components/market-integrity/VlmBrainWorkspace.tsx");
const factPacket = read("lib/ai/vlm-fact-packet.ts");
const vlmBrain = read("lib/ai/vlm-brain.ts");

expect(pkg.engines?.node === ">=24.16.0 <25", "package.json must pin Node >=24.16.0 <25.");
expect(pkg.engines?.npm === ">=11.16.0 <12", "package.json must pin npm >=11.16.0 <12.");
expect(pkg.scripts?.build?.includes("npm run check:i18n && npm run typecheck && npm run vercel:preflight && next build --webpack"), "build script must keep i18n -> typecheck -> preflight -> Next build order.");
expect(pkg.scripts?.["ci:node24-npm11-dry-run"]?.includes("npm ci --ignore-scripts --dry-run"), "ci:node24-npm11-dry-run must exercise npm ci dry-run under Node 24/npm 11.");
expect(pkg.scripts?.["ci:vercel-install-dry-run"]?.includes("npm ci --ignore-scripts --dry-run"), "ci:vercel-install-dry-run must mirror Vercel npm ci without mutating node_modules.");
expect(pkg.scripts?.["verify:pass1014-1033-final-build-gate"] === "node scripts/verify-pass1014-1033-final-build-gate.mjs", "PASS1014-1033 verifier script missing.");

expect(vercel.installCommand === "npm ci --no-audit --no-fund --progress=false", "vercel.json must use deterministic npm ci installCommand, not npm install.");
expect(vercel.buildCommand === "npm run build", "vercel.json buildCommand must stay npm run build.");

expect(npmrc.includes("engine-strict=true"), ".npmrc must keep engine-strict=true.");
expect(npmrc.includes("strict-peer-deps=false"), ".npmrc must keep strict-peer-deps=false for React 19/Web3 tree.");
expect(npmrc.includes("legacy-peer-deps=true"), ".npmrc must keep legacy-peer-deps=true until Web3 peer matrix is fully clean.");

expect(tsconfig.compilerOptions?.incremental === false, "tsconfig incremental must be false to avoid tsconfig.tsbuildinfo leaking into deployment state.");
expect(Array.isArray(tsconfig.include) && tsconfig.include.includes("app/**/*.tsx") && tsconfig.include.includes("components/**/*.tsx"), "tsconfig must include production app/components TSX.");
for (const excluded of ["tests/**", "scripts/**", "docs/**", "EDITING_MAP/**", "**/*.ts.txt", "**/*.tsx.txt"]) {
  expect(tsconfig.exclude?.includes(excluded), `tsconfig must exclude ${excluded}.`);
}

expect(!existsSync(new URL("tsconfig.tsbuildinfo", root)), "root tsconfig.tsbuildinfo must not be present in deployable project.");
const rootFiles = readdirSync(root);
expect(!rootFiles.some((name) => /^CODEX_.*\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)), "CODEX source artifacts must not exist in project root.");
expect(preflight.includes("Codex handoff/source artifact is in the project root"), "preflight must guard root CODEX source artifacts.");
expect(cleanZipScript.includes('".tsbuildinfo"'), "production clean ZIP must exclude tsbuildinfo files.");
expect(cleanZipScript.includes("docs/codex-handoff/"), "production clean ZIP must exclude Codex handoff docs.");
expect(cleanZipScript.includes('"dist-handoff"'), "production clean ZIP must exclude generated Gemini handoff output.");
expect(cleanZipScript.includes("/^PASS\\d+.*\\.(md|txt|json)$/i"), "production clean ZIP must exclude root PASS reports.");

for (const needle of ["MutationObserver", "focusin", "Tab", "requestAnimationFrame", "pointerdown"]) {
  expect(focusHook.includes(needle), `useDialogFocusBoundary must keep ${needle}.`);
}
for (const needle of ["touchstart", "touchmove", "preventDefault", "data-modal-scroll-region", "overscrollBehavior"]) {
  expect(scrollLock.includes(needle), `useModalScrollLock must keep iOS scroll boundary marker ${needle}.`);
}
for (const needle of ["boot", "orb", "brain", "PHASE_MINIMUM_MS", "applyClientConfidencePenalty"]) {
  expect(brain.includes(needle), `VlmBrainWorkspace must keep tiered loading/confidence marker ${needle}.`);
}
for (const needle of ["applyPacketConfidenceGovernor", "Math.min", "39", "28"]) {
  expect(factPacket.includes(needle), `vlm-fact-packet must keep confidence governor marker ${needle}.`);
}
for (const needle of ["applyOutputConfidenceGovernor", "providerMode", "gemini", "fallback"]) {
  expect(vlmBrain.includes(needle), `vlm-brain must keep final confidence/provider truth marker ${needle}.`);
}

if (errors.length) {
  console.error(`PASS1014-1033 final build gate failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS1014-1033 final build gate OK · deterministic install + runtime integrity guards verified");
