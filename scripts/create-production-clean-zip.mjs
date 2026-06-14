import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const requestedTarget = process.env.VELMERE_DEPLOY_ZIP || process.argv[2] || "../velmere-production-clean.zip";
const target = resolve(root, requestedTarget);
const tmp = mkdtempSync(join(tmpdir(), "velmere-clean-zip-"));
const listPath = join(tmp, "files.txt");

const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "dist-handoff",
  "node_modules",
  "out",
  "RELEASE_PROOF_PASS641",
  "EDITING_MAP",
]);

const EXCLUDED_PREFIXES = [
  "docs/codex-handoff/",
  "docs/gemini-handoff/",
  "docs/legacy-pass-reports/",
];

const EXCLUDED_ROOT_PATTERNS = [
  /^CODEX_/,
  /^PASS\d+.*\.(md|txt|json)$/i,
  /^PASS\d+_\d+.*\.(md|txt|json)$/i,
  /^VELMERE_PASS\d+.*\.(md|txt|json)$/i,
  /^VELMERE_GEMINI_/i,
  /^velmere_.*\.(zip|pdf)$/i,
];

const EXCLUDED_EXTENSIONS = new Set([
  ".zip",
  ".tgz",
  ".rar",
  ".7z",
  ".log",
  ".tmp",
  ".tsbuildinfo",
]);

function hasExcludedExtension(file) {
  const lower = file.toLowerCase();
  for (const ext of EXCLUDED_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function shouldExclude(relativePath, isDirectory) {
  const normalized = relativePath.replaceAll("\\\\", "/");
  const name = basename(normalized);
  if (!normalized || normalized === ".") return false;
  if (isDirectory && EXCLUDED_DIRS.has(name)) return true;
  if (EXCLUDED_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))) return true;
  if (!normalized.includes("/") && EXCLUDED_ROOT_PATTERNS.some((pattern) => pattern.test(name))) return true;
  if (!isDirectory && hasExcludedExtension(name)) return true;
  return false;
}

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name);
    const rel = relative(root, absolute).replaceAll("\\\\", "/");
    if (shouldExclude(rel, entry.isDirectory())) continue;
    if (entry.isDirectory()) collectFiles(absolute, files);
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}

const files = collectFiles(root).sort();
if (!files.includes("package.json") || !files.includes("package-lock.json")) {
  throw new Error("Clean ZIP would miss package.json or package-lock.json.");
}
if (!files.includes("app/[locale]/page.tsx") || !files.includes("components/market-integrity/TokenRiskModal.tsx")) {
  throw new Error("Clean ZIP would miss core runtime sources.");
}
if (files.some((file) => file.startsWith("node_modules/") || file.startsWith(".next/") || file.startsWith("docs/codex-handoff/"))) {
  throw new Error("Clean ZIP file list still includes excluded runtime-noise paths.");
}

writeFileSync(listPath, `${files.join("\n")}\n`, "utf8");
if (existsSync(target)) rmSync(target, { force: true });
const zip = spawnSync("zip", ["-q", "-@", target], {
  cwd: root,
  input: `${files.join("\n")}\n`,
  encoding: "utf8",
});
rmSync(tmp, { recursive: true, force: true });
if (zip.status !== 0) {
  throw new Error(`zip failed: ${zip.stderr || zip.stdout || `exit ${zip.status}`}`);
}
const size = statSync(target).size;
console.log(JSON.stringify({ target, files: files.length, sizeBytes: size }, null, 2));
