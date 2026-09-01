#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "artifacts/pass35/a44/PASS35_A44_SOURCE_INTEGRITY_AUDIT.json");
const excludedDirectories = new Set([
  "node_modules",
  ".next",
  ".turbo",
  ".git",
  ".velmere",
  "_velmere",
  "artifacts",
  "coverage",
  "dist",
  "out",
  ".cache",
  "cache",
  "__pycache__",
]);
const codeExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const importExtensions = ["", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".woff", ".woff2", ".ttf", ".otf"];
const indexExtensions = importExtensions.filter(Boolean).map((extension) => `/index${extension}`);

async function loadTypeScript() {
  try {
    return await import("typescript");
  } catch (error) {
    throw new Error("Project TypeScript dependency unavailable; global npm and hard-coded runtime fallbacks are forbidden", { cause: error });
  }
}
const tsModule = await loadTypeScript();
const ts = tsModule.default ?? tsModule;

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (
      entry.isDirectory()
      && (
        excludedDirectories.has(entry.name)
        || entry.name.startsWith(".next-")
      )
    ) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) files.push(full);
  }
}
walk(root);
files.sort();

function relative(file) { return path.relative(root, file).replaceAll(path.sep, "/"); }
function scriptKind(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
function resolveImport(fromFile, specifier) {
  if (!(specifier.startsWith(".") || specifier.startsWith("@/"))) return { external: true };
  const rawBase = specifier.startsWith("@/")
    ? path.join(root, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [];
  for (const extension of importExtensions) candidates.push(`${rawBase}${extension}`);
  if (/\.(?:js|jsx|mjs|cjs)$/u.test(rawBase)) {
    const stem = rawBase.replace(/\.(?:js|jsx|mjs|cjs)$/u, "");
    for (const extension of [".ts", ".tsx", ".mts", ".cts"]) candidates.push(`${stem}${extension}`);
  }
  for (const suffix of indexExtensions) candidates.push(`${rawBase}${suffix}`);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return { external: false, resolved: candidate };
  }
  return { external: false, resolved: null, candidates: candidates.map(relative) };
}
function cssClasses(text) {
  const result = new Set();
  const pattern = /\.([_a-zA-Z]+[_a-zA-Z0-9-]*)/gmu;
  let match;
  while ((match = pattern.exec(text))) result.add(match[1]);
  return result;
}

const digest = crypto.createHash("sha256");
const syntaxErrors = [];
const localImports = [];
const missingImports = [];
const cssModuleReferences = [];
const missingCssClasses = [];
const cssClassCache = new Map();
let codeFileCount = 0;
let totalBytes = 0;

for (const file of files) {
  const bytes = fs.readFileSync(file);
  const rel = relative(file);
  totalBytes += bytes.length;
  digest.update(rel).update("\0").update(bytes).update("\0");
  if (!codeExtensions.has(path.extname(file).toLowerCase())) continue;
  codeFileCount += 1;
  const text = bytes.toString("utf8");
  const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  for (const diagnostic of source.parseDiagnostics ?? []) {
    const pos = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    syntaxErrors.push({ file: rel, line: pos.line + 1, column: pos.character + 1, code: diagnostic.code, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " ") });
  }
  const styleBindings = new Map();
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const resolved = resolveImport(file, specifier);
      if (!resolved.external) {
        localImports.push({ file: rel, specifier, resolved: resolved.resolved ? relative(resolved.resolved) : null });
        const generatedNextRoutesTypeReference = rel === "next-env.d.ts"
          && /^\.\/\.next(?:-[A-Za-z0-9][A-Za-z0-9._-]*)?\/types\/routes\.d\.ts$/u.test(specifier);
        if (!resolved.resolved && specifier !== "@/lib/products/catalog.generated" && !generatedNextRoutesTypeReference) missingImports.push({ file: rel, specifier, candidates: resolved.candidates?.slice(0, 8) });
        if (resolved.resolved?.endsWith(".module.css") && ts.isImportDeclaration(node) && node.importClause?.name) styleBindings.set(node.importClause.name.text, resolved.resolved);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const [binding, cssFile] of styleBindings) {
    let classes = cssClassCache.get(cssFile);
    if (!classes) {
      classes = cssClasses(fs.readFileSync(cssFile, "utf8"));
      cssClassCache.set(cssFile, classes);
    }
    const regex = new RegExp(`\\b${binding}\\.([_a-zA-Z][_a-zA-Z0-9]*)`, "g");
    let match;
    while ((match = regex.exec(text))) {
      const className = match[1];
      cssModuleReferences.push({ file: rel, cssFile: relative(cssFile), className });
      if (!classes.has(className)) missingCssClasses.push({ file: rel, cssFile: relative(cssFile), className });
    }
  }
}

const result = {
  schemaVersion: "velmere.pass35.a44.source-integrity-audit.v1",
  revisionId: "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING",
  generatedAt: new Date().toISOString(),
  typescriptVersion: ts.version,
  truthBoundary: "Static source integrity audit. It proves syntax, local import resolution and CSS Module reference integrity; it does not replace exact semantic typecheck, Next build, browser E2E or provider LIVE proof.",
  summary: {
    filesRead: files.length,
    bytesRead: totalBytes,
    codeFiles: codeFileCount,
    syntaxErrors: syntaxErrors.length,
    localImports: localImports.length,
    missingLocalImports: missingImports.length,
    cssModuleReferences: cssModuleReferences.length,
    missingCssModuleClasses: missingCssClasses.length,
  },
  sourceTreeSha256: digest.digest("hex"),
  syntaxErrors,
  missingImports,
  missingCssClasses,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (syntaxErrors.length || missingImports.length || missingCssClasses.length) process.exit(1);
