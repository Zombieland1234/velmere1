#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];
const roots = ["app", "components", "lib", "store"];
const ignored = new Set(["node_modules", ".next", ".velmere", "artifacts", "archive", "coverage", "dist", "out"]);
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.isFile() && extensions.includes(path.extname(file))) out.push(path.resolve(file));
  }
  return out;
}
function rel(file) { return path.relative(root, file).replaceAll(path.sep, "/"); }
function resolveLocal(from, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(root, specifier.slice(2));
  else if (specifier.startsWith("./") || specifier.startsWith("../")) base = path.resolve(path.dirname(from), specifier);
  else return null;
  const candidates = [base];
  for (const extension of extensions) candidates.push(`${base}${extension}`, path.join(base, `index${extension}`));
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/(^|[^:])\/\/.*$/gmu, "$1 ");
}
function imports(text) {
  const source = stripComments(text);
  const rows = [];
  // Anchor static imports/exports to the beginning of a source line. This avoids
  // treating generated TypeScript source snippets held inside strings/templates
  // (for example `import "./${distDir}/types/routes.d.ts";`) as real imports.
  for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^\n;]*?\s+from\s+)?["']([^"']+)["']/gu)) rows.push({ kind: "eager", specifier: match[1] });
  for (const match of source.matchAll(/require\(\s*["']([^"']+)["']\s*\)/gu)) rows.push({ kind: "eager", specifier: match[1] });
  for (const match of source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/gu)) rows.push({ kind: "lazy", specifier: match[1] });
  return rows;
}
const files = [...new Set(roots.flatMap((source) => walk(path.join(root, source))))].sort();
const meta = new Map();
const eager = new Map();
const lazy = new Map();
const unresolved = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const eagerDeps = new Set();
  const lazyDeps = new Set();
  for (const row of imports(text)) {
    const resolved = resolveLocal(file, row.specifier);
    if (resolved) (row.kind === "eager" ? eagerDeps : lazyDeps).add(path.resolve(resolved));
    else if (row.specifier.startsWith("@/") || row.specifier.startsWith("./") || row.specifier.startsWith("../")) unresolved.push({ file: rel(file), kind: row.kind, specifier: row.specifier });
  }
  meta.set(file, { bytes: Buffer.byteLength(text), lazyImports: lazyDeps.size });
  eager.set(file, [...eagerDeps]);
  lazy.set(file, [...lazyDeps]);
}
const entryPattern = /\/(?:route|page|layout|error|loading|not-found|template)\.(?:ts|tsx|js|jsx)$/u;
const entries = files.filter((file) => file.includes(`${path.sep}app${path.sep}`) && entryPattern.test(file.replaceAll(path.sep, "/")));
function closure(entry, includeLazy) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const next of eager.get(current) ?? []) stack.push(next);
    if (includeLazy) for (const next of lazy.get(current) ?? []) stack.push(next);
  }
  return seen;
}
const rows = entries.map((entry) => {
  const eagerFiles = closure(entry, false);
  const totalFiles = closure(entry, true);
  const sum = (set) => [...set].reduce((value, file) => value + (meta.get(file)?.bytes ?? 0), 0);
  return {
    entry: rel(entry),
    type: rel(entry).endsWith("/route.ts") ? "api-route" : "page-entry",
    eagerFiles: eagerFiles.size,
    eagerBytes: sum(eagerFiles),
    totalFiles: totalFiles.size,
    totalBytes: sum(totalFiles),
    lazyBoundaryFiles: totalFiles.size - eagerFiles.size,
  };
}).sort((a, b) => b.eagerBytes - a.eagerBytes || b.totalBytes - a.totalBytes);
const baseline = JSON.parse(fs.readFileSync(path.join(root, "config/pass14/build-graph-baseline.json"), "utf8"));
const currentApi = rows.filter((row) => row.type === "api-route");
const consolidated = currentApi.filter((row) => /\/(?:market-integrity|security|search|admin)\/\[operation\]\/route\.ts$|\/internal\/workers\/\[worker\]\/route\.ts$/u.test(row.entry));
const shellManifestPath = path.join(root, "config/pass15/lazy-route-shell-manifest.json");
const shellManifest = fs.existsSync(shellManifestPath) ? JSON.parse(fs.readFileSync(shellManifestPath, "utf8")) : { routes: [] };
const rowByEntry = new Map(rows.map((row) => [row.entry, row]));
const wrappedRoutes = shellManifest.routes.map((route) => ({
  route: route.route,
  beforeEagerBytes: route.beforeEagerBytes,
  beforeEagerFiles: route.beforeEagerFiles,
  after: rowByEntry.get(route.route) ?? null,
}));
const sourceDigest = createHash("sha256").update(files.map((file) => `${rel(file)}\0${createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`).join("\n")).digest("hex");
const result = {
  schemaVersion: "velmere.pass15.lazy-build-surface-profile.v1",
  generatedAt: new Date().toISOString(),
  sourceDigest,
  truthBoundary: "Static eager-vs-lazy import analysis. It predicts route graph pressure but does not replace a successful Webpack/Turbopack build.",
  comparison: {
    pass14Entrypoints: baseline.summary.entrypoints,
    pass15Entrypoints: entries.length,
    entrypointReduction: baseline.summary.entrypoints - entries.length,
    entrypointReductionPercent: Number((((baseline.summary.entrypoints - entries.length) / baseline.summary.entrypoints) * 100).toFixed(2)),
    pass14ApiRoutes: baseline.summary.apiRoutes,
    pass15ApiRoutes: currentApi.length,
    apiRouteReduction: baseline.summary.apiRoutes - currentApi.length,
    apiRouteReductionPercent: Number((((baseline.summary.apiRoutes - currentApi.length) / baseline.summary.apiRoutes) * 100).toFixed(2)),
  },
  consolidatedDispatchers: consolidated,
  wrappedRoutes,
  wrappedRouteSummary: {
    routes: wrappedRoutes.length,
    beforeEagerBytes: wrappedRoutes.reduce((sum, row) => sum + row.beforeEagerBytes, 0),
    afterEagerBytes: wrappedRoutes.reduce((sum, row) => sum + (row.after?.eagerBytes ?? 0), 0),
    eagerByteReduction: wrappedRoutes.reduce((sum, row) => sum + row.beforeEagerBytes - (row.after?.eagerBytes ?? 0), 0),
  },
  topEntrypointsByEagerBytes: rows.slice(0, 60),
  unresolvedLocalImports: unresolved,
};
const writeEvidence = process.argv.includes("--write-evidence") || process.env.VELMERE_WRITE_EVIDENCE === "1";
const out = writeEvidence
  ? path.join(root, "config/pass15/lazy-build-surface-profile.json")
  : path.join(root, ".velmere/pass15-diagnostics/lazy-build-surface-profile.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result.comparison, consolidatedDispatchers: consolidated.length, wrappedRoutes: wrappedRoutes.length, wrappedEagerBytesBefore: result.wrappedRouteSummary.beforeEagerBytes, wrappedEagerBytesAfter: result.wrappedRouteSummary.afterEagerBytes, unresolvedLocalImports: unresolved.length }, null, 2));
if (unresolved.length) process.exit(1);
