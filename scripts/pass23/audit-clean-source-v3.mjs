#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { builtinModules } from "node:module";
import ts from "typescript";

const root = process.cwd();
const startedAtMs = Date.now();
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : ".velmere/pass23-diagnostics/clean-source-audit.json";

const ignoredDirectoryNames = new Set([".git", ".next", "node_modules", "coverage", "dist", "out"]);
const selfExcludedPaths = new Set(["CLEAN_SAFE_VERIFICATION.json"]);
const generatedVelmerePrefix = /^\.velmere\/pass\d+-(?:gates|diagnostics|builds)\//u;
const textExtensions = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss",
  ".md", ".txt", ".yml", ".yaml", ".sql", ".py", ".sh", ".ps1", ".csv", ".tsv", ".xml", ".svg",
  ".html", ".example", ".npmrc", ".gitignore", ".dockerignore", ".gitattributes",
]);
const codeExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const localResolveExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];
const builtinSet = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const historicalImportPrefixes = ["artifacts/", "p73-runtime/", "p76-runtime/", "p76r2-runtime/", "p77-runtime/"];
const externalSchemePrefixes = ["jsr:", "npm:", "http:", "https:", "data:"];
const detectorLiteralPaths = new Set([
  "scripts/closure/build-p37-source-identity.py",
  "scripts/closure/build-p38-source-identity.py",
  "scripts/closure/build-p39-source-identity.py",
  "scripts/closure/build-p40-source-identity.py",
  "scripts/closure/build-p41-source-identity.py",
  "scripts/closure/build-p42-source-identity.py",
  "scripts/closure/package-p37-current-source.py",
  "scripts/closure/package-p38-current-source.py",
  "scripts/closure/package-p39-current-source.py",
  "scripts/closure/package-p40-current-source.py",
  "scripts/closure/package-p41-current-source.py",
  "scripts/closure/package-p42-current-source.py",
  "scripts/closure/verify-p37-p36-package-completeness.py",
]);
const explicitFixtureSecrets = new Set(["scripts/pass36/test-a63-staging-program-orchestrator.mjs\0stripe_live_secret"]);

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function normalize(value) { return value.split(path.sep).join("/"); }
function isIgnored(relativePath) { return generatedVelmerePrefix.test(relativePath) || selfExcludedPaths.has(relativePath); }
function historicalImportSubject(relativePath) { return historicalImportPrefixes.some((prefix) => relativePath.startsWith(prefix)); }

function walk(directory, prefix = "", output = [], symlinks = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = normalize(prefix ? `${prefix}/${entry.name}` : entry.name);
    const absolute = path.join(directory, entry.name);
    if (isIgnored(relative)) continue;
    if (entry.isSymbolicLink()) {
      symlinks.push({ path: relative, target: fs.readlinkSync(absolute) });
      continue;
    }
    if (entry.isDirectory()) {
      if (ignoredDirectoryNames.has(entry.name) || entry.name.startsWith(".next-pass25-")) continue;
      walk(absolute, relative, output, symlinks);
    } else if (entry.isFile()) output.push({ relative, absolute });
  }
  return { files: output, symlinks };
}

function isText(relativePath, buffer) {
  const extension = path.extname(relativePath).toLowerCase();
  const base = path.basename(relativePath);
  if (!textExtensions.has(extension) && !textExtensions.has(base) && buffer.length > 1_000_000) return false;
  if (buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0)) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("utf8");
  return (sample.match(/\uFFFD/gu) ?? []).length < 4;
}

function scriptKind(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if ([".js", ".mjs", ".cjs"].includes(extension)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function parseImports(source, relativePath) {
  const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, false, scriptKind(relativePath));
  const imports = [];
  const addLiteral = (node) => {
    if (node && ts.isStringLiteralLike(node)) imports.push(node.text);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) addLiteral(node.moduleSpecifier);
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) addLiteral(node.moduleReference.expression);
    else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) addLiteral(node.arguments[0]);
      else if (ts.isIdentifier(node.expression) && node.expression.text === "require") addLiteral(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...new Set(imports)];
}

function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

let indexedFilePaths = new Set();
function resolveLocal(fromAbsolute, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(root, specifier.slice(2));
  else if (specifier.startsWith("./") || specifier.startsWith("../")) base = path.resolve(path.dirname(fromAbsolute), specifier);
  else return true;
  const existingExtension = path.extname(base);
  const stem = [".js", ".jsx", ".mjs", ".cjs"].includes(existingExtension) ? base.slice(0, -existingExtension.length) : base;
  const candidates = new Set([base]);
  for (const extension of localResolveExtensions) {
    candidates.add(`${base}${extension}`);
    candidates.add(`${stem}${extension}`);
    candidates.add(path.join(base, `index${extension}`));
    candidates.add(path.join(stem, `index${extension}`));
  }
  for (const candidate of candidates) if (indexedFilePaths.has(path.resolve(candidate))) return true;
  return false;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const declaredPackages = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);

const walkStartedAtMs = Date.now();
const { files, symlinks } = walk(root);
const walkDurationMs = Date.now() - walkStartedAtMs;
indexedFilePaths = new Set(files.map((row) => path.resolve(row.absolute)));
console.log(`[clean-source:v3] indexed ${files.length} files in ${walkDurationMs}ms`);

const manifest = [];
const jsonErrors = [];
const jsonBomFiles = [];
const unresolvedLocalImports = [];
const historicalUnresolvedLocalImports = [];
const optionalGeneratedImports = [];
const undeclaredPackageImports = [];
const secretCandidates = [];
const detectorLiteralCandidates = [];
const fixtureSecretCandidates = [];
const dangerousSignals = [];
const todoMarkers = [];
const giantFiles = [];
const nestedArchives = [];
const hashGroups = new Map();
let totalBytes = 0;
let textFiles = 0;
let textLines = 0;
let jsonFiles = 0;
let codeFiles = 0;
let localImportResolutionChecks = 0;

const secretPatterns = [
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/gu],
  ["aws_access_key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu],
  ["github_token", /\bgh[pousr]_[A-Za-z0-9]{30,255}\b/gu],
  ["stripe_live_secret", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/gu],
  ["slack_token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gu],
];
const dangerousPatterns = [
  ["eval", /\beval\s*\(/gu],
  ["new_function", /\bnew\s+Function\s*\(/gu],
  ["dangerously_set_inner_html", /dangerouslySetInnerHTML/gu],
  ["direct_inner_html", /\.innerHTML\s*=/gu],
  ["shell_true", /shell\s*:\s*true/gu],
  ["child_process_exec", /(?:^|[^.\w])(?:exec|execSync)\s*\(/gmu],
];

const scanStartedAtMs = Date.now();
for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
  const { relative, absolute } = files[fileIndex];
  const buffer = fs.readFileSync(absolute);
  const digest = sha256(buffer);
  const bytes = buffer.length;
  const extension = path.extname(relative).toLowerCase();
  totalBytes += bytes;
  if ([".zip", ".tar", ".tgz", ".gz", ".7z", ".rar"].includes(extension)) nestedArchives.push({ path: relative, bytes });
  const duplicateRows = hashGroups.get(digest) ?? [];
  duplicateRows.push(relative);
  hashGroups.set(digest, duplicateRows);

  const text = isText(relative, buffer);
  let lines = null;
  if (text) {
    textFiles += 1;
    const source = buffer.toString("utf8");
    lines = source.length === 0 ? 0 : source.split(/\r?\n/u).length;
    textLines += lines;
    if (lines >= 1000) giantFiles.push({ path: relative, lines, bytes });

    if (extension === ".json") {
      jsonFiles += 1;
      const hasBom = source.charCodeAt(0) === 0xFEFF;
      if (hasBom) jsonBomFiles.push({ path: relative });
      try { JSON.parse(hasBom ? source.slice(1) : source); }
      catch (error) { jsonErrors.push({ path: relative, error: error instanceof Error ? error.message : String(error) }); }
    }

    const sourceLines = source.split(/\r?\n/u);
    for (let index = 0; index < sourceLines.length; index += 1) {
      if (/\b(?:TODO|FIXME|HACK|XXX)\b/iu.test(sourceLines[index])) todoMarkers.push({ path: relative, line: index + 1, preview: sourceLines[index].trim().slice(0, 180) });
    }

    for (const [kind, pattern] of secretPatterns) {
      pattern.lastIndex = 0;
      if (!pattern.test(source)) continue;
      const row = { kind, path: relative };
      if (detectorLiteralPaths.has(relative) && kind === "private_key") detectorLiteralCandidates.push({ ...row, reason: "source_packager_secret_detector_literal" });
      else if (explicitFixtureSecrets.has(`${relative}\0${kind}`)) fixtureSecretCandidates.push({ ...row, reason: "explicit_hostile_credential_fixture_literal" });
      else secretCandidates.push(row);
    }

    for (const [kind, pattern] of dangerousPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(source)) dangerousSignals.push({ kind, path: relative });
    }

    if (codeExtensions.has(extension)) {
      codeFiles += 1;
      for (const specifier of parseImports(source, relative)) {
        if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("@/")) {
          localImportResolutionChecks += 1;
          if (!resolveLocal(absolute, specifier)) {
            if (specifier.startsWith("./.next/types/") && (relative === "next-env.d.ts" || relative === "scripts/deployment/test-next-env-build-contract.mjs")) {
              optionalGeneratedImports.push({ path: relative, specifier, reason: relative === "next-env.d.ts" ? "next-build-generated" : "next-build-generated-fixture-literal" });
            } else if (relative === "scripts/pass35/test-a42-dev-runtime-cache-recovery.mjs" && /^\.\/messages\/(?:pl|en|de)\.json$/u.test(specifier)) {
              optionalGeneratedImports.push({ path: relative, specifier, reason: "fixture-literal-not-runtime-import" });
            } else if (historicalImportSubject(relative)) historicalUnresolvedLocalImports.push({ path: relative, specifier, reason: "historical_or_evidence_harness" });
            else unresolvedLocalImports.push({ path: relative, specifier });
          }
        } else if (!specifier.startsWith("#") && !builtinSet.has(specifier) && !externalSchemePrefixes.some((prefix) => specifier.startsWith(prefix))) {
          const name = packageName(specifier);
          if (name && !declaredPackages.has(name)) undeclaredPackageImports.push({ path: relative, specifier, package: name });
        }
      }
    }
  }

  manifest.push({ path: relative, bytes, sha256: digest, text, lines });
  const processed = fileIndex + 1;
  if (processed % 500 === 0 || processed === files.length) console.log(`[clean-source:v3] progress ${processed}/${files.length}; ${totalBytes} bytes; ${Date.now() - scanStartedAtMs}ms`);
}
const scanDurationMs = Date.now() - scanStartedAtMs;

const duplicateGroups = [...hashGroups.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([digest, paths]) => ({ sha256: digest, count: paths.length, paths }))
  .sort((a, b) => b.count - a.count || a.paths[0].localeCompare(b.paths[0]));
const uniqueRows = (rows, key) => [...new Map(rows.map((row) => [key(row), row])).values()];
const cleanUnresolved = uniqueRows(unresolvedLocalImports, (row) => `${row.path}\0${row.specifier}`);
const cleanHistoricalUnresolved = uniqueRows(historicalUnresolvedLocalImports, (row) => `${row.path}\0${row.specifier}`);
const cleanUndeclared = uniqueRows(undeclaredPackageImports, (row) => `${row.path}\0${row.specifier}`);
const treeSha256 = sha256(manifest.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n"));
const productionDangerousSignals = dangerousSignals.filter((row) => !row.path.startsWith("scripts/") && !row.path.startsWith("tests/") && !row.path.startsWith("test/") && !row.path.startsWith("fixtures/") && !row.path.startsWith("evaluation/") && !row.path.startsWith("config/"));

const audit = {
  schemaVersion: "velmere.pass23.clean-source-audit.v3",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Every enumerated regular file is byte-read and SHA-256 bound. JSON is parsed with UTF-8 BOM explicitly reported and ignored for parser compatibility. JavaScript/TypeScript module specifiers are extracted with the TypeScript AST, not text regexes. Unresolved imports in historical/evidence harness directories are reported separately without release-source credit; active-source unresolved imports, undeclared bare-package imports, malformed JSON, symlinks and unclassified secret literals remain blocking. This is static source hygiene, not semantic typecheck, Next build, browser, staging or LIVE evidence.",
  runtime: { node: process.version, typescript: ts.version, platform: process.platform, arch: process.arch },
  timings: { walkDurationMs, scanDurationMs, totalDurationMs: Date.now() - startedAtMs, localImportResolutionChecks, importParseMode: "TYPESCRIPT_AST_STATIC_MODULE_SPECIFIERS" },
  summary: {
    regularFilesRead: files.length,
    selfReferentialFilesExcluded: [...selfExcludedPaths],
    totalBytesRead: totalBytes,
    textFilesRead: textFiles,
    totalTextLinesRead: textLines,
    jsonFilesParsed: jsonFiles,
    jsonBomFiles: jsonBomFiles.length,
    codeFilesImportScanned: codeFiles,
    treeSha256,
    symlinks: symlinks.length,
    jsonErrors: jsonErrors.length,
    unresolvedLocalImports: cleanUnresolved.length,
    historicalUnresolvedLocalImports: cleanHistoricalUnresolved.length,
    optionalGeneratedImports: optionalGeneratedImports.length,
    undeclaredPackageImports: cleanUndeclared.length,
    secretCandidates: secretCandidates.length,
    detectorLiteralCandidates: detectorLiteralCandidates.length,
    fixtureSecretCandidates: fixtureSecretCandidates.length,
    dangerousSignalFiles: new Set(dangerousSignals.map((row) => row.path)).size,
    productionDangerousSignalFiles: new Set(productionDangerousSignals.map((row) => row.path)).size,
    todoMarkers: todoMarkers.length,
    giantFiles: giantFiles.length,
    nestedArchives: nestedArchives.length,
    exactDuplicateGroups: duplicateGroups.length,
  },
  symlinks,
  jsonErrors,
  jsonBomFiles,
  unresolvedLocalImports: cleanUnresolved,
  historicalUnresolvedLocalImports: cleanHistoricalUnresolved,
  optionalGeneratedImports,
  undeclaredPackageImports: cleanUndeclared,
  secretCandidates,
  detectorLiteralCandidates,
  fixtureSecretCandidates,
  dangerousSignals,
  productionDangerousSignals,
  todoMarkers,
  giantFiles: giantFiles.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path)),
  nestedArchives,
  exactDuplicateGroups: duplicateGroups.slice(0, 200),
  manifest,
};

const absoluteOutput = path.resolve(root, outputPath);
fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
fs.writeFileSync(absoluteOutput, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...audit.summary, timings: audit.timings }, null, 2));
if (symlinks.length || jsonErrors.length || cleanUnresolved.length || cleanUndeclared.length || secretCandidates.length) process.exit(1);
