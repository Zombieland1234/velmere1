import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(process.env.P68_SOURCE_ROOT || process.cwd());
const sourceRequire = createRequire(path.join(root, "package.json"));
let ts = null;
try { ts = sourceRequire("typescript"); } catch { ts = null; }
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);

async function firstReadable(candidates) {
  for (const candidate of candidates) {
    try { await access(candidate, constants.R_OK); return candidate; } catch {}
  }
  return null;
}
async function resolveSourceCandidate(candidate) {
  const extension = path.extname(candidate).toLowerCase();
  const stem = JS_EXTENSIONS.has(extension) ? candidate.slice(0, -extension.length) : candidate;
  return firstReadable([
    candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.mts`, `${candidate}.cts`, `${candidate}.js`, `${candidate}.mjs`, `${candidate}.cjs`,
    `${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${stem}.cts`, `${stem}.js`, `${stem}.mjs`, `${stem}.cjs`,
    path.join(candidate, "index.ts"), path.join(candidate, "index.tsx"), path.join(candidate, "index.mts"), path.join(candidate, "index.js"),
    path.join(stem, "index.ts"), path.join(stem, "index.tsx"), path.join(stem, "index.mts"), path.join(stem, "index.js"),
  ]);
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = await resolveSourceCandidate(path.join(root, specifier.slice(2)));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = path.dirname(fileURLToPath(context.parentURL));
    const target = await resolveSourceCandidate(path.resolve(parent, specifier));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (!url.startsWith("file:")) return nextLoad(url, context);
  const filePath = fileURLToPath(url);
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".json") {
    const source = await readFile(filePath, "utf8");
    return { format: "module", source: `export default ${JSON.stringify(JSON.parse(source))};`, shortCircuit: true };
  }
  if (!SOURCE_EXTENSIONS.has(extension)) return nextLoad(url, context);
  const source = await readFile(filePath, "utf8");
  if (ts) {
    const result = ts.transpileModule(source, {
      fileName: filePath,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true, esModuleInterop: true, allowSyntheticDefaultImports: true, sourceMap: false, inlineSourceMap: true, inlineSources: true, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
    });
    const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(`p68_ts_transpile_failed:${filePath}\n${ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:v=>v,getCurrentDirectory:()=>root,getNewLine:()=>"\n"})}`);
    return { format: "module", source: result.outputText, shortCircuit: true };
  }
  if (extension === ".tsx") throw new Error(`p68_tsx_transpile_requires_typescript:${filePath}`);
  return { format: "module", source: stripTypeScriptTypes(source,{mode:"transform",sourceMap:true,sourceUrl:pathToFileURL(filePath).href}), shortCircuit: true };
}
