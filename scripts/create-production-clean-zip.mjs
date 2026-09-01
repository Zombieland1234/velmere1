import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_TARGET_NAME = "velmere-production-clean.zip";

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
  ".velmere/exports/",
  "docs/codex-handoff/",
  "docs/gemini-handoff/",
  "docs/legacy-pass-reports/",
];

const EXCLUDED_ROOT_PATTERNS = [
  /^CODEX_/,
  /^PASS\d+.*\.(md|txt|json)$/iu,
  /^PASS\d+_\d+.*\.(md|txt|json)$/iu,
  /^VELMERE_PASS\d+.*\.(md|txt|json)$/iu,
  /^VELMERE_GEMINI_/iu,
  /^velmere_.*\.(zip|pdf)$/iu,
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

function assertNoSymlinkComponents(base, destination) {
  const relativePath = path.relative(base, destination);
  let current = base;
  if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
    throw new Error("zip_output_root_symlink_rejected");
  }
  for (const segment of relativePath.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error("zip_output_symlink_component_rejected");
    }
  }
}

export function resolveApprovedZipTarget({ projectRoot = root, requestedTarget = null } = {}) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const approvedOutputRoot = path.join(resolvedProjectRoot, ".velmere", "exports");
  const target = requestedTarget
    ? path.isAbsolute(requestedTarget)
      ? path.resolve(requestedTarget)
      : path.resolve(approvedOutputRoot, requestedTarget)
    : path.join(approvedOutputRoot, DEFAULT_TARGET_NAME);
  const relativeTarget = path.relative(approvedOutputRoot, target);
  if (!relativeTarget || relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget) || relativeTarget.includes(path.sep)) {
    throw new Error("zip_target_outside_approved_output_directory");
  }
  if (path.extname(target).toLowerCase() !== ".zip") throw new Error("zip_target_extension_invalid");
  assertNoSymlinkComponents(resolvedProjectRoot, target);
  return { approvedOutputRoot, target };
}

export function publishArchiveAtomically({ temporaryArchive, target, approvedOutputRoot, overwrite = false }) {
  const resolvedOutputRoot = path.resolve(approvedOutputRoot);
  const resolvedTemporaryArchive = path.resolve(temporaryArchive);
  const resolvedTarget = path.resolve(target);
  const targetRelative = path.relative(resolvedOutputRoot, resolvedTarget);
  const temporaryRelative = path.relative(resolvedOutputRoot, resolvedTemporaryArchive);
  if (!targetRelative || targetRelative.startsWith("..") || path.isAbsolute(targetRelative) || targetRelative.includes(path.sep)) {
    throw new Error("zip_publish_target_outside_approved_output_directory");
  }
  if (!temporaryRelative || temporaryRelative.startsWith("..") || path.isAbsolute(temporaryRelative)) {
    throw new Error("zip_temporary_archive_outside_approved_output_directory");
  }
  if (!fs.existsSync(resolvedTemporaryArchive) || !fs.statSync(resolvedTemporaryArchive).isFile()) {
    throw new Error("zip_temporary_archive_missing");
  }
  if (fs.existsSync(resolvedTarget) && !overwrite) throw new Error("zip_target_exists_use_overwrite");
  assertNoSymlinkComponents(resolvedOutputRoot, resolvedTarget);
  fs.renameSync(resolvedTemporaryArchive, resolvedTarget);
}

function hasExcludedExtension(file) {
  const lower = file.toLowerCase();
  for (const ext of EXCLUDED_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function shouldExclude(relativePath, isDirectory) {
  const normalized = relativePath.replaceAll("\\", "/");
  const name = path.basename(normalized);
  if (!normalized || normalized === ".") return false;
  if (isDirectory && EXCLUDED_DIRS.has(name)) return true;
  if (EXCLUDED_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))) return true;
  if (!normalized.includes("/") && EXCLUDED_ROOT_PATTERNS.some((pattern) => pattern.test(name))) return true;
  if (!isDirectory && hasExcludedExtension(name)) return true;
  return false;
}

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolute).replaceAll("\\", "/");
    if (shouldExclude(relativePath, entry.isDirectory())) continue;
    if (entry.isDirectory()) collectFiles(absolute, files);
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

function targetArgument(argv) {
  const outputIndex = argv.indexOf("--output");
  if (outputIndex >= 0) {
    const value = argv[outputIndex + 1];
    if (!value || value.startsWith("--")) throw new Error("argument_value_missing:--output");
    return value;
  }
  return argv.find((value) => !value.startsWith("--")) ?? null;
}

export function main(argv = process.argv.slice(2)) {
  const requestedTarget = process.env.VELMERE_DEPLOY_ZIP || targetArgument(argv);
  const overwrite = argv.includes("--overwrite");
  const { approvedOutputRoot, target } = resolveApprovedZipTarget({ projectRoot: root, requestedTarget });
  if (fs.existsSync(target) && !overwrite) throw new Error("zip_target_exists_use_overwrite");
  fs.mkdirSync(approvedOutputRoot, { recursive: true });
  resolveApprovedZipTarget({ projectRoot: root, requestedTarget: target });

  const files = collectFiles(root).sort();
  if (!files.includes("package.json") || !files.includes("package-lock.json")) {
    throw new Error("Clean ZIP would miss package.json or package-lock.json.");
  }
  if (!files.includes("app/[locale]/page.tsx") || !files.includes("components/market-integrity/TokenRiskModal.tsx")) {
    throw new Error("Clean ZIP would miss core runtime sources.");
  }
  if (files.some((file) => file.startsWith("node_modules/") || file.startsWith(".next/") || file.startsWith("docs/codex-handoff/") || file.startsWith(".velmere/exports/"))) {
    throw new Error("Clean ZIP file list still includes excluded runtime-noise paths.");
  }

  const buildDirectory = fs.mkdtempSync(path.join(approvedOutputRoot, ".zip-build-"));
  const temporaryArchive = path.join(buildDirectory, "archive.zip");
  try {
    const zip = spawnSync("zip", ["-q", "-@", temporaryArchive], {
      cwd: root,
      input: `${files.join("\n")}\n`,
      encoding: "utf8",
    });
    if (zip.status !== 0) {
      throw new Error(`zip failed: ${zip.stderr || zip.stdout || `exit ${zip.status}`}`);
    }
    const size = fs.statSync(temporaryArchive).size;
    publishArchiveAtomically({ temporaryArchive, target, approvedOutputRoot, overwrite });
    console.log(JSON.stringify({ target, files: files.length, sizeBytes: size }, null, 2));
  } finally {
    fs.rmSync(buildDirectory, { recursive: true, force: true });
  }
  return 0;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const exitCode = main();
  if (exitCode !== 0) process.exitCode = exitCode;
}
