import { createHash } from "node:crypto";
import { builtinModules, createRequire } from "node:module";
import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { loadTypeScript } = require("../lib/load-typescript.cjs");
const ts = loadTypeScript();

const root = process.cwd();
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "artifacts/pass13/PASS13_FULL_TREE_AUDIT.json";
const manifestIndex = process.argv.indexOf("--manifest");
const manifestOutput = manifestIndex >= 0 ? process.argv[manifestIndex + 1] : "artifacts/pass13/PASS13_FULL_TREE_MANIFEST.json";
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".md", ".txt", ".yml", ".yaml", ".sql", ".py", ".sh", ".ps1", ".csv", ".tsv", ".xml", ".svg", ".html", ".example", ".npmrc", ".gitignore", ".dockerignore", ".gitattributes"]);
const TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const JS_TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([".git", ".next", "node_modules"]);
const THIRD_PARTY_PREFIXES = [
  ".velmere/offline-toolchain/",
  ".velmere/offline-test-deps/",
  ".velmere/npm-cache/",
  ".velmere/exact-runtime/",
  "config/supply-chain-license-archive-cas-pass4825/",
  "config/supply-chain-install-script-archive-cas-pass4825/",
];
const SOURCE_ANALYSIS_EXCLUDES = ["artifacts/", ".velmere/quarantine/", ...THIRD_PARTY_PREFIXES];
const builtins = new Set([...builtinModules, ...builtinModules.map((value) => `node:${value}`)]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function classify(relative) {
  if (relative.startsWith("artifacts/")) return "evidence";
  if (relative.startsWith(".velmere/quarantine/")) return "quarantine";
  if (THIRD_PARTY_PREFIXES.some((prefix) => relative.startsWith(prefix))) return "vendored_dependency_or_cas";
  if (relative.startsWith("scripts/")) return "test_or_control_plane";
  if (relative.startsWith("db/") || relative.startsWith("supabase/")) return "database";
  if (relative.startsWith("public/")) return "public_asset";
  return "first_party_source_or_config";
}
function isText(relative, buffer) {
  const base = path.basename(relative);
  const extension = path.extname(relative).toLowerCase();
  if (TEXT_EXTENSIONS.has(extension) || TEXT_EXTENSIONS.has(base)) return !buffer.subarray(0, 8_192).includes(0);
  if (buffer.length <= 1_000_000 && !buffer.subarray(0, 8_192).includes(0)) {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8_192)).toString("utf8");
    const replacementCount = (sample.match(/\uFFFD/g) ?? []).length;
    return replacementCount < 4;
  }
  return false;
}
async function walk(dir, prefix = "") {
  const rows = [];
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...await walk(absolute, relative));
    else if (entry.isFile()) rows.push({ relative, absolute });
  }
  return rows;
}
function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}
async function resolveLocalImport(fromRelative, specifier) {
  let candidate;
  if (specifier.startsWith("@/")) candidate = path.join(root, specifier.slice(2));
  else if (specifier.startsWith("./") || specifier.startsWith("../")) candidate = path.resolve(root, path.dirname(fromRelative), specifier);
  else return true;
  const extension = path.extname(candidate);
  const stem = [".js", ".jsx", ".mjs", ".cjs"].includes(extension) ? candidate.slice(0, -extension.length) : candidate;
  const candidates = [
    candidate,
    `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.mts`, `${candidate}.cts`,
    `${candidate}.js`, `${candidate}.jsx`, `${candidate}.mjs`, `${candidate}.cjs`, `${candidate}.json`,
    `${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${stem}.cts`, `${stem}.js`, `${stem}.jsx`, `${stem}.mjs`, `${stem}.cjs`, `${stem}.json`,
    path.join(candidate, "index.ts"), path.join(candidate, "index.tsx"), path.join(candidate, "index.mts"),
    path.join(candidate, "index.js"), path.join(candidate, "index.mjs"), path.join(candidate, "index.cjs"),
    path.join(stem, "index.ts"), path.join(stem, "index.tsx"), path.join(stem, "index.mts"),
    path.join(stem, "index.js"), path.join(stem, "index.mjs"), path.join(stem, "index.cjs"),
  ];
  for (const item of candidates) {
    try {
      const info = await stat(item);
      if (info.isFile()) return true;
      if (info.isDirectory()) {
        const packageJson = path.join(item, "package.json");
        try { if ((await stat(packageJson)).isFile()) return true; } catch (ignoredError) { void ignoredError; }
      }
    } catch (ignoredError) { void ignoredError; }
  }
  return false;
}

const selfOutputPaths = new Set([output, manifestOutput]
  .map((value) => path.relative(root, path.resolve(root, value)).split(path.sep).join("/"))
  .filter((value) => !value.startsWith("../")));
const files = (await walk(root)).filter((row) => !selfOutputPaths.has(row.relative));
const manifest = [];
const byCategory = {};
const byExtension = {};
const exactHashPaths = new Map();
const syntaxErrors = [];
const unresolvedLocalImports = [];
const optionalFallbackImports = [];
const undeclaredPackageImports = [];
const todoLocations = [];
const secretCandidates = [];
const dangerousLocations = [];
const giantFiles = [];
let totalBytes = 0;
let totalTextLines = 0;
let analyzedTextFiles = 0;
let firstPartyAnalyzedBytes = 0;
let tsLikeAnalyzed = 0;

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const declaredPackages = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);
const EXTERNAL_TOOLCHAIN_PACKAGE_IMPORTS = new Map([
  ["scripts/pass36/run-a102r44p39-audit-integration.mjs\0solc", "exact_external_solc_toolchain"],
  ["scripts/pass36/test-a102r44p39-deployment-binding.mjs\0solc", "exact_external_solc_toolchain"],
  ["scripts/pass36/test-a102r44p39-r44p38-baseline-regression.mjs\0solc", "exact_external_solc_toolchain"],
]);
const secretPatterns = [
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g],
  ["aws_access_key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["github_token", /\bgh[pousr]_[A-Za-z0-9]{30,255}\b/g],
  ["stripe_live_secret", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g],
  ["slack_token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
];
const dangerousPatterns = [
  ["eval", /\beval\s*\(/g],
  ["new_function", /\bnew\s+Function\s*\(/g],
  ["dangerously_set_inner_html", /dangerouslySetInnerHTML/g],
  ["direct_inner_html", /\.innerHTML\s*=/g],
  ["child_process_exec", /(?:^|[^.\w])(?:exec|execSync)\s*\(/gm],
  ["shell_true", /shell\s*:\s*true/g],
];

for (const { relative, absolute } of files) {
  const buffer = await readFile(absolute);
  const size = buffer.length;
  const digest = sha256(buffer);
  const category = classify(relative);
  totalBytes += size;
  byCategory[category] = (byCategory[category] ?? 0) + 1;
  const extension = path.extname(relative).toLowerCase() || "<none>";
  byExtension[extension] = (byExtension[extension] ?? 0) + 1;
  const text = isText(relative, buffer);
  let lines = null;
  if (text) {
    const source = buffer.toString("utf8");
    lines = source.length === 0 ? 0 : source.split(/\r?\n/).length;
    totalTextLines += lines;
    analyzedTextFiles += 1;
    if (!SOURCE_ANALYSIS_EXCLUDES.some((prefix) => relative.startsWith(prefix))) {
      firstPartyAnalyzedBytes += size;
      if (lines >= 1_000) giantFiles.push({ path: relative, lines, bytes: size });
      const lineArray = source.split(/\r?\n/);
      for (let index = 0; index < lineArray.length; index += 1) {
        const line = lineArray[index];
        if (/\b(?:TODO|FIXME|HACK|XXX)\b/i.test(line)) todoLocations.push({ path: relative, line: index + 1, preview: line.trim().slice(0, 180) });
      }
      for (const [kind, regex] of secretPatterns) {
        regex.lastIndex = 0;
        if (regex.test(source)) secretCandidates.push({ kind, path: relative });
      }
      for (const [kind, regex] of dangerousPatterns) {
        regex.lastIndex = 0;
        if (regex.test(source)) dangerousLocations.push({ kind, path: relative });
      }
      if (JS_TS_EXTENSIONS.has(extension)) {
        const pre = ts.preProcessFile(source, true, true);
        const imports = [...pre.importedFiles, ...pre.referencedFiles].map((item) => item.fileName);
        for (const specifier of imports) {
          if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("@/")) {
            if (!await resolveLocalImport(relative, specifier)) {
              const buildGenerated = relative === "next-env.d.ts" && /^\.\/.next(?:-[^/]+)?\/types\//u.test(specifier);
              const optionalTypescriptFallback = specifier.includes("node_modules/typescript") && source.includes(".velmere/offline-toolchain/node_modules/typescript");
              if (buildGenerated || optionalTypescriptFallback) optionalFallbackImports.push({ path: relative, specifier, reason: buildGenerated ? "next_build_generated" : "typescript_runtime_fallback" });
              else unresolvedLocalImports.push({ path: relative, specifier });
            }
          } else if (specifier.startsWith("/")) {
            optionalFallbackImports.push({ path: relative, specifier, reason: "absolute_environment_fallback" });
          } else if (!specifier.startsWith("node:") && !builtins.has(specifier) && !specifier.startsWith("#")) {
            const name = packageName(specifier);
            if (name && !declaredPackages.has(name)) {
              const externalToolchainReason = EXTERNAL_TOOLCHAIN_PACKAGE_IMPORTS.get(`${relative}\0${specifier}`);
              if (externalToolchainReason) optionalFallbackImports.push({ path: relative, specifier, reason: externalToolchainReason });
              else undeclaredPackageImports.push({ path: relative, specifier, package: name });
            }
          }
        }
      }
      if (TS_EXTENSIONS.has(extension)) {
        tsLikeAnalyzed += 1;
        try {
          const scriptKind = extension === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
          const sourceFile = ts.createSourceFile(absolute, source, ts.ScriptTarget.ES2022, true, scriptKind);
          const parseErrors = (sourceFile.parseDiagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
          const declarationFile = /\.d\.(?:ts|mts|cts)$/u.test(relative);
          const transpileErrors = declarationFile
            ? []
            : (ts.transpileModule(source, {
                fileName: absolute,
                reportDiagnostics: true,
                compilerOptions: {
                  target: ts.ScriptTarget.ES2022,
                  module: ts.ModuleKind.ESNext,
                  moduleResolution: ts.ModuleResolutionKind.Bundler,
                  jsx: ts.JsxEmit.ReactJSX,
                  isolatedModules: true,
                  allowSyntheticDefaultImports: true,
                  esModuleInterop: true,
                },
              }).diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
          const errors = [...parseErrors, ...transpileErrors];
          if (errors.length) {
            syntaxErrors.push({
              path: relative,
              errors: errors.slice(0, 20).map((item) => ({
                code: item.code,
                message: ts.flattenDiagnosticMessageText(item.messageText, " "),
                start: item.start ?? null,
              })),
            });
          }
        } catch (error) {
          syntaxErrors.push({
            path: relative,
            errors: [{ code: "transpile_exception", message: error instanceof Error ? error.message : String(error), start: null }],
          });
        }
      }
    }
  }
  const sameHash = exactHashPaths.get(digest) ?? [];
  sameHash.push(relative);
  exactHashPaths.set(digest, sameHash);
  manifest.push({ path: relative, category, bytes: size, sha256: digest, text, lines });
}

const exactDuplicateGroups = [...exactHashPaths.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([sha256Value, paths]) => ({ sha256: sha256Value, count: paths.length, paths }))
  .sort((a, b) => b.count - a.count || a.paths[0].localeCompare(b.paths[0]));
const unique = (rows, key) => [...new Map(rows.map((row) => [key(row), row])).values()];
const cleanUnresolved = unique(unresolvedLocalImports, (row) => `${row.path}\0${row.specifier}`);
const cleanOptionalFallbacks = unique(optionalFallbackImports, (row) => `${row.path}\0${row.specifier}`);
const cleanUndeclared = unique(undeclaredPackageImports, (row) => `${row.path}\0${row.specifier}`);
const audit = {
  schemaVersion: "velmere.pass13.full-tree-audit.v1",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Every regular file in the extracted tree except the two self-referential generated audit outputs was byte-read and SHA-256 hashed. Textual first-party files were line-counted and scanned; TypeScript-family files were syntax-transpiled with the lockfile-bound TypeScript. This is not full semantic type-check, lint, framework build, browser, staging or LIVE evidence.",
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  coverage: {
    regularFilesRead: manifest.length,
    selfReferentialOutputsExcluded: [...selfOutputPaths],
    totalBytesRead: totalBytes,
    textFilesRead: analyzedTextFiles,
    totalTextLinesRead: totalTextLines,
    firstPartyAnalyzedBytes,
    typescriptFamilyFilesSyntaxChecked: tsLikeAnalyzed,
  },
  inventory: {
    byCategory,
    byExtension,
    exactDuplicateGroupCount: exactDuplicateGroups.length,
    giantFileCount: giantFiles.length,
  },
  findings: {
    syntaxErrorFileCount: syntaxErrors.length,
    unresolvedLocalImportCount: cleanUnresolved.length,
    optionalFallbackImportCount: cleanOptionalFallbacks.length,
    undeclaredPackageImportCount: cleanUndeclared.length,
    todoMarkerCount: todoLocations.length,
    secretCandidateCount: secretCandidates.length,
    dangerousPatternFileCount: unique(dangerousLocations, (row) => `${row.kind}\0${row.path}`).length,
  },
  syntaxErrors,
  unresolvedLocalImports: cleanUnresolved.slice(0, 500),
  optionalFallbackImports: cleanOptionalFallbacks.slice(0, 500),
  undeclaredPackageImports: cleanUndeclared.slice(0, 500),
  todoLocations: todoLocations.slice(0, 500),
  secretCandidates: unique(secretCandidates, (row) => `${row.kind}\0${row.path}`),
  dangerousLocations: unique(dangerousLocations, (row) => `${row.kind}\0${row.path}`),
  giantFiles: giantFiles.sort((a, b) => b.lines - a.lines),
  largestDuplicateGroups: exactDuplicateGroups.slice(0, 100),
  gates: {
    allFilesByteRead: true,
    typescriptSyntax: syntaxErrors.length === 0 ? "PASS" : "FAIL",
    localImportResolution: cleanUnresolved.length === 0 ? "PASS" : "FAIL",
    packageImportDeclaration: cleanUndeclared.length === 0 ? "PASS" : "FAIL",
    secretScan: secretCandidates.length === 0 ? "PASS" : "REVIEW",
  },
};

await mkdir(path.dirname(path.resolve(root, output)), { recursive: true });
await writeFile(path.resolve(root, output), `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(path.resolve(root, manifestOutput), `${JSON.stringify({
  schemaVersion: "velmere.pass13.full-tree-manifest.v1",
  generatedAt: audit.generatedAt,
  aggregateSha256: sha256(manifest.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n")),
  fileCount: manifest.length,
  files: manifest,
}, null, 2)}\n`);
console.log(JSON.stringify({
  ok: syntaxErrors.length === 0 && cleanUnresolved.length === 0,
  output,
  manifestOutput,
  coverage: audit.coverage,
  findings: audit.findings,
  gates: audit.gates,
}, null, 2));
if (syntaxErrors.length || cleanUnresolved.length) process.exitCode = 1;
