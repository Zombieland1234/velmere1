#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outputPath = path.join(root, "artifacts/runtime/RUNTIME_IMPORT_CYCLE_RECEIPT.json");
const sourceRoots = ["app", "components", "lib", "store"];
const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const extensionSet = new Set(extensions);
const posix = (value) => value.split(path.sep).join("/");
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function collect(relative, output) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const childRelative = posix(path.join(relative, entry.name));
    if (entry.isDirectory()) collect(childRelative, output);
    else if (entry.isFile() && extensionSet.has(path.extname(entry.name))) output.push(childRelative);
  }
}

const files = [];
for (const sourceRoot of sourceRoots) collect(sourceRoot, files);
files.sort();
const fileSet = new Set(files);
const importPatterns = [
  /\bfrom\s*["']([^"']+)["']/gu,
  /\bimport\s*["']([^"']+)["']/gu,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
];

function resolveImport(specifier, importer) {
  let base;
  if (specifier.startsWith("@/")) base = specifier.slice(2);
  else if (specifier.startsWith("./") || specifier.startsWith("../")) base = posix(path.relative(root, path.resolve(root, path.dirname(importer), specifier)));
  else return null;
  const candidates = path.extname(base)
    ? [base]
    : [...extensions.map((extension) => `${base}${extension}`), ...extensions.map((extension) => `${base}/index${extension}`)];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

const graph = new Map(files.map((file) => [file, new Set()]));
let edgeCount = 0;
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const specifiers = [];
  for (const pattern of importPatterns) for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  for (const specifier of specifiers) {
    const resolved = resolveImport(specifier, file);
    if (!resolved || graph.get(file).has(resolved)) continue;
    graph.get(file).add(resolved);
    edgeCount += 1;
  }
}

let index = 0;
const indexes = new Map();
const lowlinks = new Map();
const stack = [];
const onStack = new Set();
const cycles = [];
function strongConnect(node) {
  indexes.set(node, index);
  lowlinks.set(node, index);
  index += 1;
  stack.push(node);
  onStack.add(node);
  for (const next of graph.get(node)) {
    if (!indexes.has(next)) {
      strongConnect(next);
      lowlinks.set(node, Math.min(lowlinks.get(node), lowlinks.get(next)));
    } else if (onStack.has(next)) {
      lowlinks.set(node, Math.min(lowlinks.get(node), indexes.get(next)));
    }
  }
  if (lowlinks.get(node) !== indexes.get(node)) return;
  const component = [];
  while (stack.length) {
    const current = stack.pop();
    onStack.delete(current);
    component.push(current);
    if (current === node) break;
  }
  const selfCycle = component.length === 1 && graph.get(component[0]).has(component[0]);
  if (component.length > 1 || selfCycle) cycles.push(component.sort());
}
for (const file of files) if (!indexes.has(file)) strongConnect(file);
cycles.sort((a, b) => a.join("\n").localeCompare(b.join("\n")));
const core = {
  schemaVersion: "velmere.runtime-import-cycle-receipt.v1",
  status: cycles.length === 0 ? "PASS" : "FAIL",
  scannedFileCount: files.length,
  importEdgeCount: edgeCount,
  cycleCount: cycles.length,
  cycles,
  includesTypeOnlyImports: true,
  limitation: "Static local import graph; computed module paths and framework-generated edges are outside this gate.",
};
const receipt = { ...core, receiptSha256: sha256(canonical(core)) };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: core.status, scannedFileCount: core.scannedFileCount, importEdgeCount: core.importEdgeCount, cycleCount: core.cycleCount, output: posix(path.relative(root, outputPath)) }, null, 2));
process.exit(core.status === "PASS" ? 0 : 1);
