#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeBaseline = args.has("--write-baseline");
const sourceRoots = ["app", "components", "lib", "store"];
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];
const ignoredDirectories = new Set(["node_modules", ".next", ".velmere", "artifacts", "archive", "coverage", "dist", "out"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}
function walk(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (entry.isFile() && sourceExtensions.includes(path.extname(entry.name))) output.push(path.resolve(full));
  }
  return output;
}
function resolveLocal(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(root, specifier.slice(2));
  else if (specifier.startsWith("./") || specifier.startsWith("../")) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  const candidates = [base];
  for (const extension of sourceExtensions) candidates.push(`${base}${extension}`);
  for (const extension of sourceExtensions) candidates.push(path.join(base, `index${extension}`));
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return path.resolve(candidate);
    } catch (ignoredError) { void ignoredError; }
  }
  return null;
}
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/(^|[^:])\/\/.*$/gmu, "$1 ");
}
function parseImports(text) {
  const rows = [];
  const source = stripComments(text);
  const patterns = [
    { kind: "static", regex: /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gu },
    { kind: "dynamic", regex: /import\(\s*["']([^"']+)["']\s*\)/gu },
    { kind: "require", regex: /require\(\s*["']([^"']+)["']\s*\)/gu }
  ];
  for (const { kind, regex } of patterns) {
    for (const match of source.matchAll(regex)) rows.push({ kind, specifier: match[1] });
  }
  return rows;
}

const files = [];
for (const sourceRoot of sourceRoots) walk(path.join(root, sourceRoot), files);
for (const extra of ["i18n.ts", "proxy.ts", "next.config.mjs"]) {
  const file = path.join(root, extra);
  if (fs.existsSync(file)) files.push(path.resolve(file));
}
const uniqueFiles = [...new Set(files)].sort();
const metadata = new Map();
const graph = new Map();
const reverse = new Map();
const unresolvedLocalImports = [];

for (const file of uniqueFiles) {
  const text = fs.readFileSync(file, "utf8");
  const imports = parseImports(text);
  const local = [];
  let dynamicImportCount = 0;
  for (const row of imports) {
    // A static module specifier cannot contain template interpolation. The
    // regex can otherwise mistake generated declaration text embedded in a
    // template literal (for example next-env.d.ts content) for a real import.
    if (row.specifier.includes("${")) continue;
    if (row.kind === "dynamic") dynamicImportCount += 1;
    const resolved = resolveLocal(file, row.specifier);
    if (resolved) local.push(resolved);
    else if (row.specifier.startsWith("./") || row.specifier.startsWith("../") || row.specifier.startsWith("@/")) {
      unresolvedLocalImports.push({ file: relative(file), specifier: row.specifier });
    }
  }
  const uniqueLocal = [...new Set(local)];
  graph.set(file, uniqueLocal);
  for (const dependency of uniqueLocal) {
    if (!reverse.has(dependency)) reverse.set(dependency, new Set());
    reverse.get(dependency).add(file);
  }
  const trimmed = text.trimStart();
  metadata.set(file, {
    bytes: Buffer.byteLength(text),
    lines: text.split(/\r?\n/u).length,
    client: trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'"),
    serverOnly: /(?:import\s+["']server-only["']|require\(["']server-only["']\))/u.test(text),
    dynamicImportCount,
    importCount: imports.length
  });
}

const entryPattern = /\/(?:route|page|layout|error|loading|not-found|template)\.(?:ts|tsx|js|jsx)$/u;
const entries = uniqueFiles.filter((file) => file.includes(`${path.sep}app${path.sep}`) && entryPattern.test(file.replaceAll(path.sep, "/")));

function closure(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const dependency of graph.get(current) ?? []) stack.push(dependency);
  }
  return seen;
}

const entryRows = [];
const entryMembership = new Map();
for (const entry of entries) {
  const filesInClosure = closure(entry);
  let bytes = 0;
  let clientFiles = 0;
  let serverOnlyFiles = 0;
  let dynamicImports = 0;
  for (const file of filesInClosure) {
    const data = metadata.get(file);
    if (!data) continue;
    bytes += data.bytes;
    if (data.client) clientFiles += 1;
    if (data.serverOnly) serverOnlyFiles += 1;
    dynamicImports += data.dynamicImportCount;
    if (!entryMembership.has(file)) entryMembership.set(file, new Set());
    entryMembership.get(file).add(entry);
  }
  const rel = relative(entry);
  const type = rel.endsWith("/route.ts") || rel.endsWith("/route.js") ? "api-route" : "page-entry";
  entryRows.push({
    entry: rel,
    type,
    directImports: graph.get(entry)?.length ?? 0,
    transitiveFiles: filesInClosure.size,
    transitiveBytes: bytes,
    clientBoundaryFiles: clientFiles,
    serverOnlyFiles,
    dynamicImports,
    serverRouteImportsClientCode: type === "api-route" && clientFiles > 0
  });
}

entryRows.sort((a, b) => b.transitiveBytes - a.transitiveBytes || b.transitiveFiles - a.transitiveFiles || a.entry.localeCompare(b.entry));
const sharedModules = [...entryMembership.entries()].map(([file, memberships]) => ({
  file: relative(file),
  entrypointCount: memberships.size,
  bytes: metadata.get(file)?.bytes ?? 0,
  client: metadata.get(file)?.client ?? false,
  importedByDirectFiles: reverse.get(file)?.size ?? 0
})).sort((a, b) => b.entrypointCount - a.entrypointCount || b.bytes - a.bytes || a.file.localeCompare(b.file));

const cssFiles = uniqueFiles.filter((file) => file.endsWith(".css")).map((file) => ({
  file: relative(file),
  bytes: metadata.get(file)?.bytes ?? 0,
  lines: metadata.get(file)?.lines ?? 0
})).sort((a, b) => b.bytes - a.bytes);
const routeFiles = entryRows.filter((row) => row.type === "api-route");
const fixtureBlockedRoutes = routeFiles.filter((row) => {
  const file = path.join(root, row.entry);
  return fs.readFileSync(file, "utf8").includes("blockProductionFixtureRoute");
});
const clientLeakRoutes = routeFiles.filter((row) => row.serverRouteImportsClientCode);
const result = {
  schemaVersion: "velmere.pass14.build-graph-profile.v1",
  generatedAt: new Date().toISOString(),
  sourceDigest: sha256(uniqueFiles.map((file) => `${relative(file)}\0${sha256(fs.readFileSync(file))}`).join("\n")),
  truthBoundary: "Static local-import graph. It estimates compile pressure and does not replace a Webpack/Turbopack trace or successful production build.",
  summary: {
    analyzedFiles: uniqueFiles.length,
    analyzedBytes: uniqueFiles.reduce((sum, file) => sum + (metadata.get(file)?.bytes ?? 0), 0),
    entrypoints: entries.length,
    apiRoutes: routeFiles.length,
    pageEntries: entries.length - routeFiles.length,
    fixtureBlockedRoutes: fixtureBlockedRoutes.length,
    serverRoutesImportingClientCode: clientLeakRoutes.length,
    unresolvedLocalImports: unresolvedLocalImports.length,
    cssFiles: cssFiles.length,
    cssBytes: cssFiles.reduce((sum, row) => sum + row.bytes, 0)
  },
  topEntrypointsByTransitiveBytes: entryRows.slice(0, 60),
  topSharedModules: sharedModules.slice(0, 100),
  serverRoutesImportingClientCode: clientLeakRoutes,
  fixtureBlockedRouteEntries: fixtureBlockedRoutes.map((row) => row.entry),
  cssPressure: cssFiles,
  unresolvedLocalImports: unresolvedLocalImports.slice(0, 200)
};

const diagnosticsDirectory = path.join(root, ".velmere", "pass14-diagnostics");
fs.mkdirSync(diagnosticsDirectory, { recursive: true });
const diagnosticsPath = path.join(diagnosticsDirectory, "build-graph-profile.json");
fs.writeFileSync(diagnosticsPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
if (writeBaseline) {
  fs.writeFileSync(path.join(root, "config", "pass14", "build-graph-baseline.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify({ ...result.summary, diagnosticsPath: relative(diagnosticsPath), baselineWritten: writeBaseline }, null, 2));
if (unresolvedLocalImports.length > 0) process.exit(1);
