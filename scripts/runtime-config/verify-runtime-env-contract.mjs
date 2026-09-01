#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const policyPath = path.join(root, "config/runtime-env-policy.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
if (policy.schemaVersion !== "velmere.runtime-env-policy.v1") throw new Error("runtime_env_policy_schema_mismatch");
const argument = (name, fallback = "") => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() : fallback;
};
const envPath = path.resolve(root, policy.envExamplePath);
const envRelativePath = path.relative(root, envPath);
if (!envRelativePath || envRelativePath.startsWith("..") || path.isAbsolute(envRelativePath)) {
  throw new Error("runtime_env_example_path_outside_root");
}
const outputArgument = argument("output");
const outputPath = outputArgument
  ? path.resolve(root, outputArgument)
  : path.join(root, "artifacts/runtime/RUNTIME_ENV_CONTRACT_RECEIPT.json");
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const posix = (value) => value.split(path.sep).join("/");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};

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

const usages = new Map();
const usagePatterns = [
  /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/gu,
  /\bprocess\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/gu,
];
const fileSet = new Set();
for (const scanRoot of policy.scanRoots) for (const filePath of filesUnder(scanRoot)) fileSet.add(filePath);
for (const filePath of [...fileSet].sort()) {
  const relative = posix(path.relative(root, filePath));
  const source = fs.readFileSync(filePath, "utf8");
  for (const pattern of usagePatterns) {
    for (const match of source.matchAll(pattern)) {
      const key = match[1];
      const line = source.slice(0, match.index ?? 0).split("\n").length;
      if (!usages.has(key)) usages.set(key, []);
      usages.get(key).push({ file: relative, line });
    }
  }
}

const assignments = [];
const envText = fs.readFileSync(envPath, "utf8");
for (const [index, line] of envText.split(/\r?\n/u).entries()) {
  const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=(.*)$/u);
  if (match) assignments.push({ key: match[1], value: match[2], line: index + 1 });
}
const byKey = new Map();
for (const assignment of assignments) {
  if (!byKey.has(assignment.key)) byKey.set(assignment.key, []);
  byKey.get(assignment.key).push(assignment);
}
const documented = new Set(byKey.keys());
const exempt = new Set(policy.systemManagedKeys ?? []);
const missing = [...usages.keys()].filter((key) => !documented.has(key) && !exempt.has(key)).sort();
const duplicateAssignments = [...byKey.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => ({ key, lines: rows.map((row) => row.line) }));
const secretLike = /(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|API_KEY)/u;
const allowedPublic = new Set(policy.allowedPublicCredentialKeys ?? []);
const publicCredentialLeaks = assignments
  .filter(({ key }) => key.startsWith("NEXT_PUBLIC_") && secretLike.test(key) && !allowedPublic.has(key))
  .map(({ key, line }) => ({ key, line }));
const systemManagedDocumented = [...exempt].filter((key) => documented.has(key)).sort();
const undocumentedUsageCount = missing.length;
const status = undocumentedUsageCount === 0 && duplicateAssignments.length === 0 && publicCredentialLeaks.length === 0 ? "PASS" : "FAIL";
const core = {
  schemaVersion: "velmere.runtime-env-contract-receipt.v1",
  status,
  envExamplePath: posix(envRelativePath),
  scannedFileCount: fileSet.size,
  runtimeKeyCount: usages.size,
  documentedKeyCount: documented.size,
  systemManagedKeys: [...exempt].sort(),
  missingRuntimeKeys: missing,
  duplicateAssignments,
  publicCredentialLeaks,
  systemManagedDocumented,
  referencedButSystemManagedCount: [...usages.keys()].filter((key) => exempt.has(key)).length,
  documentedButNotRuntimeReferencedCount: [...documented].filter((key) => !usages.has(key)).length,
  limitation: "Static process.env access inventory; computed environment-key names require manual review.",
};
const receipt = { ...core, receiptSha256: sha256(canonical(core)) };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status, scannedFileCount: core.scannedFileCount, runtimeKeyCount: core.runtimeKeyCount, documentedKeyCount: core.documentedKeyCount, missingRuntimeKeyCount: missing.length, duplicateAssignmentCount: duplicateAssignments.length, publicCredentialLeakCount: publicCredentialLeaks.length, output: posix(path.relative(root, outputPath)) }, null, 2));
process.exit(status === "PASS" ? 0 : 1);
