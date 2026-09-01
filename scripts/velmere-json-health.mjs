import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_EXTENSIONS = new Set([".json", ".webmanifest"]);
const IGNORE_DIRS = new Set(["node_modules", ".git"]);
const SAFE_RUNTIME_JSON = new Set([
  path.normalize("data/velmere-local-products.json"),
  path.normalize("data/velmere-admin-drafts.json"),
]);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".next") {
      // keep root dot files out of recursive scans except .next, handled explicitly
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      yield* walk(full);
      continue;
    }
    if (JSON_EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

function parseJsonFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  try {
    JSON.parse(raw);
    return null;
  } catch (error) {
    return { file, error, raw };
  }
}

function quarantineRuntimeJson(issue) {
  const rel = path.relative(ROOT, issue.file);
  const normalized = path.normalize(rel);
  if (!SAFE_RUNTIME_JSON.has(normalized)) return false;
  const backup = `${issue.file}.corrupt-${Date.now()}.bak`;
  fs.mkdirSync(path.dirname(issue.file), { recursive: true });
  fs.copyFileSync(issue.file, backup);
  const empty = normalized.endsWith("velmere-local-products.json")
    ? { schemaVersion: "velmere.local-products.v1", updatedAt: new Date().toISOString(), products: [] }
    : { schemaVersion: "velmere.admin-drafts.v1", updatedAt: new Date().toISOString(), drafts: [] };
  fs.writeFileSync(issue.file, JSON.stringify(empty, null, 2), "utf8");
  console.log(`[velmere-json-health] quarantined malformed runtime JSON: ${rel}`);
  console.log(`[velmere-json-health] backup: ${path.relative(ROOT, backup)}`);
  return true;
}

export function runJsonHealthCheck({ repairRuntime = false } = {}) {
  const targets = [
    "package.json",
    "tsconfig.json",
    "next.config.mjs",
    "messages",
    "public",
    "data",
  ];
  const issues = [];
  for (const target of targets) {
    const full = path.join(ROOT, target);
    if (!fs.existsSync(full)) continue;
    const stats = fs.statSync(full);
    const files = stats.isDirectory() ? [...walk(full)] : [full];
    for (const file of files) {
      if (!JSON_EXTENSIONS.has(path.extname(file)) && path.basename(file) !== "package.json" && path.basename(file) !== "tsconfig.json") continue;
      const issue = parseJsonFile(file);
      if (!issue) continue;
      if (repairRuntime && quarantineRuntimeJson(issue)) continue;
      issues.push(issue);
    }
  }
  if (issues.length) {
    console.error("[velmere-json-health] malformed JSON detected:");
    for (const issue of issues) {
      const rel = path.relative(ROOT, issue.file);
      const near = Math.max(0, Number(issue.error.message.match(/position (\d+)/)?.[1] ?? 0) - 60);
      const excerpt = issue.raw.slice(near, near + 140).replace(/\n/g, "\\n");
      console.error(`- ${rel}: ${issue.error.message}`);
      console.error(`  near: ${excerpt}`);
    }
    process.exitCode = 1;
    return false;
  }
  console.log("[velmere-json-health] JSON files OK");
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runJsonHealthCheck({ repairRuntime: process.argv.includes("--repair-runtime") });
}
