#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readPolicy, receiptSha256 } from "./runtime-bundle-lib.mjs";

const root = process.cwd();
const policy = readPolicy(root);
const outputPath = path.join(root, "artifacts/runtime/RUNTIME_BOUNDARY_RECEIPT.json");
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const violations = [];
const scanned = [];
const posix = (value) => value.split(path.sep).join("/");

function filesUnder(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  const metadata = fs.statSync(absolute);
  if (metadata.isFile()) return sourceExtensions.has(path.extname(absolute)) ? [absolute] : [];
  const output = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(posix(path.relative(root, child))));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) output.push(child);
  }
  return output;
}

function importSpecifiers(source) {
  const values = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push({ specifier: match[1], index: match.index ?? 0 });
  }
  return values;
}

function resolveLocal(specifier, filePath) {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith("~/")) return specifier.slice(2);
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return posix(path.relative(root, path.resolve(path.dirname(filePath), specifier)));
  }
  if (specifier.startsWith("/")) return specifier.replace(/^\/+/, "");
  return null;
}

function forbiddenTarget(relative) {
  if (!relative || relative.startsWith("../")) return null;
  return (policy.forbiddenRuntimeImportRoots ?? []).find((prefix) => relative === prefix || relative.startsWith(`${prefix}/`)) ?? null;
}

const fileSet = new Set();
for (const sourceRoot of policy.runtimeSourceRoots ?? []) for (const file of filesUnder(sourceRoot)) fileSet.add(file);
for (const filePath of [...fileSet].sort()) {
  const relativeFile = posix(path.relative(root, filePath));
  const source = fs.readFileSync(filePath, "utf8");
  scanned.push(relativeFile);
  for (const { specifier, index } of importSpecifiers(source)) {
    const resolved = resolveLocal(specifier, filePath);
    const forbidden = forbiddenTarget(resolved);
    if (!forbidden) continue;
    const line = source.slice(0, index).split("\n").length;
    violations.push({ file: relativeFile, line, specifier, resolved, forbiddenRoot: forbidden, kind: "static_import" });
  }
  const fsLiteralPattern = /\b(?:readFileSync|readFile|createReadStream|openSync|statSync|existsSync)\s*\([^\n]{0,180}?["']([^"']+)["']/gu;
  for (const match of source.matchAll(fsLiteralPattern)) {
    const literal = match[1].replace(/^\.\//u, "");
    const forbidden = forbiddenTarget(literal);
    if (!forbidden) continue;
    const line = source.slice(0, match.index ?? 0).split("\n").length;
    violations.push({ file: relativeFile, line, literal, forbiddenRoot: forbidden, kind: "filesystem_literal" });
  }
}

const core = {
  schemaVersion: "velmere.runtime-boundary-receipt.v1",
  status: violations.length === 0 ? "PASS" : "FAIL",
  policySchemaVersion: policy.schemaVersion,
  scannedFileCount: scanned.length,
  forbiddenRuntimeImportRoots: policy.forbiddenRuntimeImportRoots,
  violationCount: violations.length,
  violations,
  limitation: "Static import and literal filesystem boundary check; dynamic computed paths still require code review and runtime tests.",
};
const receipt = { ...core, receiptSha256: receiptSha256(core) };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, scannedFileCount: receipt.scannedFileCount, violationCount: receipt.violationCount, output: posix(path.relative(root, outputPath)) }, null, 2));
process.exit(receipt.status === "PASS" ? 0 : 1);
