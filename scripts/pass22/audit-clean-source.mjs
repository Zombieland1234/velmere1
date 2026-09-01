#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { builtinModules } from "node:module";

const root = process.cwd();
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : ".velmere/pass22-diagnostics/clean-source-audit.json";
const ignoredDirectoryNames = new Set([".git", ".next", "node_modules", "coverage", "dist", "out"]);
const selfExcludedPaths = new Set(["CLEAN_SAFE_VERIFICATION.json"]);
const ignoredPathPrefixes = [];
const generatedVelmerePrefix = /^\.velmere\/pass\d+-(?:gates|diagnostics|builds)\//u;
const textExtensions = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss",
  ".md", ".txt", ".yml", ".yaml", ".sql", ".py", ".sh", ".ps1", ".csv", ".tsv", ".xml", ".svg",
  ".html", ".example", ".npmrc", ".gitignore", ".dockerignore", ".gitattributes"
]);
const codeExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const inactiveAnalysisPrefixes = [".velmere/quarantine/", "_velmere/"];
const localResolveExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];
const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}
function isIgnored(relativePath) {
  return generatedVelmerePrefix.test(relativePath) || ignoredPathPrefixes.some((prefix) => relativePath.startsWith(prefix));
}
function walk(directory, prefix = "", output = [], symlinks = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = normalize(prefix ? `${prefix}/${entry.name}` : entry.name);
    const absolute = path.join(directory, entry.name);
    if (isIgnored(relative) || selfExcludedPaths.has(relative)) continue;
    if (entry.isSymbolicLink()) {
      symlinks.push({ path: relative, target: fs.readlinkSync(absolute) });
      continue;
    }
    if (entry.isDirectory()) {
      if (ignoredDirectoryNames.has(entry.name)) continue;
      walk(absolute, relative, output, symlinks);
    } else if (entry.isFile()) {
      output.push({ relative, absolute });
    }
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
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/`(?:\\.|[^`])*`/gsu, " ")
    .replace(/(^|[^:])\/\/.*$/gmu, "$1 ");
}
function parseImports(source) {
  const stripped = stripComments(source);
  const imports = [];
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gu,
    /import\(\s*["']([^"']+)["']\s*\)/gu,
    /require\(\s*["']([^"']+)["']\s*\)/gu
  ];
  for (const pattern of patterns) {
    for (const match of stripped.matchAll(pattern)) imports.push(match[1]);
  }
  return [...new Set(imports)];
}
function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}
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
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return true;
    } catch (ignoredError) { void ignoredError; }
  }
  return false;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const declaredPackages = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {})
]);
const { files, symlinks } = walk(root);
const manifest = [];
const jsonErrors = [];
const unresolvedLocalImports = [];
const optionalGeneratedImports = [];
const undeclaredPackageImports = [];
const secretCandidates = [];
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

const secretPatterns = [
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/gu],
  ["aws_access_key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu],
  ["github_token", /\bgh[pousr]_[A-Za-z0-9]{30,255}\b/gu],
  ["stripe_live_secret", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/gu],
  ["slack_token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gu]
];
const dangerousPatterns = [
  ["eval", /\beval\s*\(/gu],
  ["new_function", /\bnew\s+Function\s*\(/gu],
  ["dangerously_set_inner_html", /dangerouslySetInnerHTML/gu],
  ["direct_inner_html", /\.innerHTML\s*=/gu],
  ["shell_true", /shell\s*:\s*true/gu],
  ["child_process_exec", /(?:^|[^.\w])(?:exec|execSync)\s*\(/gmu]
];

for (const { relative, absolute } of files) {
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
      try { JSON.parse(source); } catch (error) {
        jsonErrors.push({ path: relative, error: error instanceof Error ? error.message : String(error) });
      }
    }
    const sourceLines = source.split(/\r?\n/u);
    for (let index = 0; index < sourceLines.length; index += 1) {
      if (/\b(?:TODO|FIXME|HACK|XXX)\b/iu.test(sourceLines[index])) {
        todoMarkers.push({ path: relative, line: index + 1, preview: sourceLines[index].trim().slice(0, 180) });
      }
    }
    for (const [kind, pattern] of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(source)) secretCandidates.push({ kind, path: relative });
    }
    for (const [kind, pattern] of dangerousPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(source)) dangerousSignals.push({ kind, path: relative });
    }
    if (codeExtensions.has(extension) && !inactiveAnalysisPrefixes.some((prefix) => relative.startsWith(prefix))) {
      codeFiles += 1;
      for (const specifier of parseImports(source)) {
        if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("@/")) {
          if (!resolveLocal(absolute, specifier)) {
            if (relative === "next-env.d.ts" && specifier.startsWith("./.next/types/")) {
              optionalGeneratedImports.push({ path: relative, specifier, reason: "next-build-generated" });
            } else {
              unresolvedLocalImports.push({ path: relative, specifier });
            }
          }
        } else if (!specifier.startsWith("#") && !builtins.has(specifier) && !specifier.startsWith("node:")) {
          const name = packageName(specifier);
          if (name && !declaredPackages.has(name)) undeclaredPackageImports.push({ path: relative, specifier, package: name });
        }
      }
    }
  }
  manifest.push({ path: relative, bytes, sha256: digest, text, lines });
}

const duplicateGroups = [...hashGroups.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([digest, paths]) => ({ sha256: digest, count: paths.length, paths }))
  .sort((a, b) => b.count - a.count || a.paths[0].localeCompare(b.paths[0]));
const uniqueRows = (rows, key) => [...new Map(rows.map((row) => [key(row), row])).values()];
const cleanUnresolved = uniqueRows(unresolvedLocalImports, (row) => `${row.path}\0${row.specifier}`);
const cleanUndeclared = uniqueRows(undeclaredPackageImports, (row) => `${row.path}\0${row.specifier}`);
const treeSha256 = sha256(manifest.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n"));
const productionDangerousSignals = dangerousSignals.filter((row) =>
  !row.path.startsWith("scripts/") && !row.path.startsWith("tests/") && !row.path.startsWith("fixtures/") && !row.path.startsWith("evaluation/")
);
const audit = {
  schemaVersion: "velmere.pass22.clean-source-audit.v1",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Every regular file outside generated .velmere pass diagnostics/gates/builds and the self-referential CLEAN_SAFE_VERIFICATION.json was byte-read and SHA-256 hashed. Text files were line-counted and scanned with conservative static heuristics. JavaScript-family syntax is verified separately with node --check. This is not semantic TypeScript, ESLint, Next build, browser, staging or LIVE evidence.",
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  summary: {
    regularFilesRead: files.length,
    selfReferentialFilesExcluded: [...selfExcludedPaths],
    totalBytesRead: totalBytes,
    textFilesRead: textFiles,
    totalTextLinesRead: textLines,
    jsonFilesParsed: jsonFiles,
    codeFilesImportScanned: codeFiles,
    treeSha256,
    symlinks: symlinks.length,
    jsonErrors: jsonErrors.length,
    unresolvedLocalImports: cleanUnresolved.length,
    optionalGeneratedImports: optionalGeneratedImports.length,
    undeclaredPackageImports: cleanUndeclared.length,
    secretCandidates: secretCandidates.length,
    dangerousSignalFiles: new Set(dangerousSignals.map((row) => row.path)).size,
    productionDangerousSignalFiles: new Set(productionDangerousSignals.map((row) => row.path)).size,
    todoMarkers: todoMarkers.length,
    giantFiles: giantFiles.length,
    nestedArchives: nestedArchives.length,
    exactDuplicateGroups: duplicateGroups.length
  },
  symlinks,
  jsonErrors,
  unresolvedLocalImports: cleanUnresolved,
  optionalGeneratedImports,
  undeclaredPackageImports: cleanUndeclared,
  secretCandidates,
  dangerousSignals,
  productionDangerousSignals,
  todoMarkers,
  giantFiles: giantFiles.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path)),
  nestedArchives,
  exactDuplicateGroups: duplicateGroups.slice(0, 200),
  manifest
};

const absoluteOutput = path.resolve(root, outputPath);
fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
fs.writeFileSync(absoluteOutput, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify(audit.summary, null, 2));
if (symlinks.length || jsonErrors.length || cleanUnresolved.length || cleanUndeclared.length || secretCandidates.length) process.exit(1);
