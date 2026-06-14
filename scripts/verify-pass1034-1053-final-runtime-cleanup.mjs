import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

async function loadTypeScript() {
  try {
    return (await import("typescript")).default ?? (await import("typescript"));
  } catch {
    return (await import("file:///opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js")).default;
  }
}

const ts = await loadTypeScript();

const root = new URL("..", import.meta.url);
const rootPath = root.pathname;
const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};
const read = (file) => readFileSync(new URL(file, root), "utf8");
const json = (file) => JSON.parse(read(file));

function walk(dir, predicate, files = []) {
  const absolute = join(rootPath, dir);
  if (!existsSync(absolute)) return files;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "dist", "out", "docs", "EDITING_MAP"].includes(entry.name)) continue;
    const full = join(absolute, entry.name);
    const rel = relative(rootPath, full).replaceAll("\\\\", "/");
    if (entry.isDirectory()) walk(rel, predicate, files);
    else if (predicate(rel)) files.push(rel);
  }
  return files;
}

const pkg = json("package.json");
const lock = json("package-lock.json");
const removedDeps = [
  "@hookform/resolvers",
  "@react-native-async-storage/async-storage",
  "ethers",
  "pino-pretty",
  "react-hook-form",
  "vaul",
];
for (const dep of removedDeps) {
  expect(!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep], `unused direct dependency still present: ${dep}`);
  expect(!pkg.overrides?.[dep], `unused dependency still in overrides: ${dep}`);
  expect(!pkg.resolutions?.[dep], `unused dependency still in resolutions: ${dep}`);
}
expect(pkg.scripts?.["ci:node24-npm11-lean-dry-run"]?.includes("--omit=optional --dry-run"), "lean Node24/npm11 dry-run script missing.");
expect(pkg.scripts?.["verify:pass1034-1053-final-runtime-cleanup"] === "node scripts/verify-pass1034-1053-final-runtime-cleanup.mjs", "PASS1034-1053 verifier script missing.");

const runtimeFiles = walk("app", (file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file))
  .concat(walk("components", (file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file)))
  .concat(walk("lib", (file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file)))
  .concat(walk("store", (file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file)));
const runtimeSource = runtimeFiles.map((file) => read(file)).join("\n");
for (const dep of removedDeps) {
  const importPattern = new RegExp(`(?:from\\s+['\"]${dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|['\"])|require\\(['\"]${dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|['\"]))`);
  expect(!importPattern.test(runtimeSource), `runtime still imports removed dependency: ${dep}`);
}

let parseErrorCount = 0;
for (const file of runtimeFiles.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const source = read(file);
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  if (sf.parseDiagnostics.length) {
    parseErrorCount += sf.parseDiagnostics.length;
    for (const diag of sf.parseDiagnostics.slice(0, 3)) {
      errors.push(`${file}: ${ts.flattenDiagnosticMessageText(diag.messageText, " ")}`);
    }
  }
}
expect(parseErrorCount === 0, `TypeScript parser found ${parseErrorCount} syntax errors.`);

const publicCopyFiles = [
  "components/home/HomePageClient.tsx",
  "components/vlm/VlmAccessGatePage.tsx",
  "components/vlm/VlmBasicProShowcase.tsx",
  "app/[locale]/faq/page.tsx",
  "app/[locale]/market-integrity/about/page.tsx",
  "app/[locale]/vlm-token/page.tsx",
  "messages/en.json",
  "messages/pl.json",
  "messages/de.json",
];
const bannedPublicTerms = [/\bROI\b/i, /\bprofit\b/i, /\byield\b/i, /\bdividend\b/i, /\bguaranteed\b/i, /\bguarantee\b/i];
for (const file of publicCopyFiles) {
  const source = read(file);
  for (const term of bannedPublicTerms) {
    expect(!term.test(source), `${file}: public copy still contains banned term ${term}.`);
  }
}

const focusHook = read("components/ui/useDialogFocusBoundary.ts");
for (const needle of ["MutationObserver", "focusin", "resolveFocusSnapshot", "Tab", "pointerdown"]) {
  expect(focusHook.includes(needle), `focus boundary lost marker ${needle}.`);
}
const scrollLock = read("components/ui/useModalScrollLock.ts");
for (const needle of ["touchstart", "touchmove", "closestScrollRegion", "normalizeIOSScrollBoundary", "preventDefault"]) {
  expect(scrollLock.includes(needle), `iOS scroll lock lost marker ${needle}.`);
}
const brain = read("components/market-integrity/VlmBrainWorkspace.tsx");
for (const needle of ["boot", "orb", "brain", "PHASE_MINIMUM_MS", "Math.min(39", "Fallback Data"]){
  expect(brain.includes(needle), `VLM workspace lost tier/confidence marker ${needle}.`);
}

const cleanZip = new URL("../velmere-production-clean.zip", root);
expect(existsSync(cleanZip), "production clean ZIP must be generated before verifier.");
if (existsSync(cleanZip)) {
  const size = statSync(cleanZip).size;
  expect(size > 1_000_000, "production clean ZIP is suspiciously small.");
  expect(size < 8_000_000, "production clean ZIP should stay slim under 8 MB.");
}

if (errors.length) {
  console.error(`PASS1034-1053 final runtime cleanup failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS1034-1053 final runtime cleanup OK · ${runtimeFiles.length} runtime files parsed, unused deps removed, public copy hardened`);
