import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { builtinModules, createRequire, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const offlineDependencyRoot = path.join(root, ".velmere", "offline-test-deps", "node_modules");
const offlineRequire = createRequire(path.join(root, "package.json"));
const NODE_BUILTINS = new Set(
  builtinModules.flatMap((name) => {
    const bare = name.startsWith("node:") ? name.slice(5) : name;
    return [bare, `node:${bare}`];
  }),
);
let ts = null;
if (process.env.VELMERE_OFFLINE_TS_FORCE_BUILTIN !== "1") {
  try {
    ts = offlineRequire("typescript");
  } catch {
    ts = null;
  }
}
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const TEST_SHIMS = new Map([
  ["next/server", path.join(root, "scripts", "pass11", "shims", "next-server.mjs")],
  ["next-intl/middleware", path.join(root, "scripts", "pass12", "shim-next-intl-middleware.mjs")],
  ["next-intl/routing", path.join(root, "scripts", "pass12", "shim-next-intl-routing.mjs")],
  ["@supabase/supabase-js", path.join(root, "scripts", "pass11", "shims", "supabase-js.mjs")],
  ["stripe", path.join(root, "scripts", "pass11", "shims", "stripe.mjs")],
  ["lucide-react", path.join(root, "scripts", "pass11", "shims", "lucide-react.mjs")],
  ["eventemitter3", path.join(root, "scripts", "pass11", "shims", "eventemitter3.mjs")],
]);

async function firstReadableFile(candidates) {
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.R_OK);
      const metadata = await stat(candidate);
      if (metadata.isFile()) return candidate;
    } catch (ignoredError) { void ignoredError; }
  }
  return null;
}

async function resolveSourceCandidate(candidate) {
  const extension = path.extname(candidate).toLowerCase();
  const stem = JS_EXTENSIONS.has(extension) ? candidate.slice(0, -extension.length) : candidate;
  return firstReadableFile([
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.mts`,
    `${candidate}.cts`,
    `${candidate}.js`,
    `${candidate}.mjs`,
    `${candidate}.cjs`,
    `${stem}.ts`,
    `${stem}.tsx`,
    `${stem}.mts`,
    `${stem}.cts`,
    `${stem}.js`,
    `${stem}.mjs`,
    `${stem}.cjs`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.mts"),
    path.join(candidate, "index.js"),
    path.join(stem, "index.ts"),
    path.join(stem, "index.tsx"),
    path.join(stem, "index.mts"),
    path.join(stem, "index.js"),
  ]);
}

async function resolveLocalImportTarget(specifier, importerPath) {
  if (specifier.startsWith("@/")) {
    return resolveSourceCandidate(path.join(root, specifier.slice(2)));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolveSourceCandidate(path.resolve(path.dirname(importerPath), specifier));
  }
  return null;
}

function declaredTypeExports(source) {
  const names = new Set();
  const declaration = /\bexport\s+(?:declare\s+)?(?:type|interface)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(declaration)) names.add(match[1]);
  const typedList = /\bexport\s*\{([^}]+)\}/g;
  for (const match of source.matchAll(typedList)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      const typed = trimmed.match(/^type\s+([A-Za-z_$][\w$]*)/);
      if (typed) names.add(typed[1]);
    }
  }
  return names;
}

function importedOriginalName(specifier) {
  const withoutType = specifier.trim().replace(/^type\s+/, "");
  const [name] = withoutType.split(/\s+as\s+/i);
  return name?.trim() ?? "";
}

/**
 * Node's built-in stripTypeScriptTypes is intentionally syntax-only and does
 * not know that `import { Foo }` refers to an interface/type in another file.
 * A normal TypeScript transpile erases that import. In the dependency-free
 * fallback, emulate that one semantic step for local named imports by reading
 * the target source and marking declared `export type` / `export interface`
 * names as type-only before passing source to stripTypeScriptTypes.
 */
async function rewriteLocalTypeOnlyNamedImports(source, importerPath) {
  const pattern = /import\s*\{([\s\S]*?)\}\s*from\s*(["'])([^"']+)\2\s*;?/g;
  const matches = [...source.matchAll(pattern)];
  if (!matches.length) return source;

  let result = "";
  let cursor = 0;
  for (const match of matches) {
    const full = match[0];
    const start = match.index ?? 0;
    const named = match[1];
    const quote = match[2];
    const specifier = match[3];
    const target = await resolveLocalImportTarget(specifier, importerPath);
    if (!target || !SOURCE_EXTENSIONS.has(path.extname(target).toLowerCase())) continue;

    let targetSource;
    try {
      targetSource = await readFile(target, "utf8");
    } catch {
      continue;
    }
    const typeExports = declaredTypeExports(targetSource);
    if (!typeExports.size) continue;

    const parts = named.split(",").map((item) => item.trim()).filter(Boolean);
    if (!parts.length) continue;
    const rewrittenParts = parts.map((item) => {
      if (/^type\s+/.test(item)) return item;
      return typeExports.has(importedOriginalName(item)) ? `type ${item}` : item;
    });
    if (rewrittenParts.every((item) => /^type\s+/.test(item))) {
      const cleaned = rewrittenParts.map((item) => item.replace(/^type\s+/, ""));
      result += source.slice(cursor, start) + `import type { ${cleaned.join(", ")} } from ${quote}${specifier}${quote};`;
    } else {
      result += source.slice(cursor, start) + `import { ${rewrittenParts.join(", ")} } from ${quote}${specifier}${quote};`;
    }
    cursor = start + full.length;
  }
  return cursor === 0 ? source : result + source.slice(cursor);
}

export async function resolve(specifier, context, nextResolve) {
  const shim = TEST_SHIMS.get(specifier);
  if (shim) {
    return { url: pathToFileURL(shim).href, shortCircuit: true };
  }

  // Bare built-ins such as `crypto`, `fs` and `path` are valid Node module
  // specifiers. Never reinterpret them as repository-relative files.
  if (NODE_BUILTINS.has(specifier)) {
    return nextResolve(specifier, context);
  }

  if (specifier.startsWith("@/")) {
    const target = await resolveSourceCandidate(path.join(root, specifier.slice(2)));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = path.dirname(fileURLToPath(context.parentURL));
    const target = await resolveSourceCandidate(path.resolve(parent, specifier));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }

  if (!specifier.startsWith("node:") && !specifier.startsWith("file:") && !specifier.startsWith("data:") && !specifier.startsWith("http:")) {
    try {
      const resolved = offlineRequire.resolve(specifier, { paths: [root, offlineDependencyRoot] });
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    } catch (ignoredError) { void ignoredError; }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith("file:")) return nextLoad(url, context);
  const filePath = fileURLToPath(url);
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".json") {
    const source = await readFile(filePath, "utf8");
    const value = JSON.parse(source);
    return {
      format: "module",
      source: `export default ${JSON.stringify(value)};`,
      shortCircuit: true,
    };
  }
  if (extension === ".css") {
    return {
      format: "module",
      source: "export default {};",
      shortCircuit: true,
    };
  }
  if (!SOURCE_EXTENSIONS.has(extension)) return nextLoad(url, context);

  const source = await readFile(filePath, "utf8");
  if (ts) {
    const result = ts.transpileModule(source, {
      fileName: filePath,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
        isolatedModules: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        sourceMap: false,
        inlineSourceMap: true,
        inlineSources: true,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      },
    });

    const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    if (errors.length > 0) {
      const formatted = ts.formatDiagnosticsWithColorAndContext(errors, {
        getCanonicalFileName: (value) => value,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      });
      throw new Error(`offline_ts_transpile_failed:${filePath}\n${formatted}`);
    }
    return { format: "module", source: result.outputText, shortCircuit: true };
  }

  if (extension === ".tsx") {
    throw new Error(`offline_tsx_transpile_requires_typescript:${filePath}`);
  }
  const sourceWithTypeOnlyImports = await rewriteLocalTypeOnlyNamedImports(source, filePath);
  const transformed = stripTypeScriptTypes(sourceWithTypeOnlyImports, {
    mode: "transform",
    sourceMap: true,
    sourceUrl: pathToFileURL(filePath).href,
  });
  return { format: "module", source: transformed, shortCircuit: true };
}
