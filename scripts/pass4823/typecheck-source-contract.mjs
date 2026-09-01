import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PASS4823_TYPECHECK_RECEIPT_ID = "pass4666-partitioned-runtime-typecheck-v1";
export const PASS4823_TYPECHECK_RUNNER_VERSION = "pass4825-complete-inventory-source-bound-v3";
export const PASS4823_SOURCE_TREE_SCHEMA = "velmere.pass4825.build-source-tree.sha256.v2";

export const PASS4823_PARTITIONS = Object.freeze([
  Object.freeze({ name: "market-integrity-api", config: "tsconfig.pass4665.market.json", heapMb: 6144 }),
  Object.freeze({ name: "security-api", config: "tsconfig.pass4665.security.json", heapMb: 4096 }),
  Object.freeze({ name: "other-api", config: "tsconfig.pass4665.otherapi.json", heapMb: 4096 }),
  Object.freeze({ name: "api-residual", config: "tsconfig.pass4823-api-residual.json", heapMb: 4096 }),
  Object.freeze({ name: "pages-market", config: "tsconfig.pass4666.pages-market.json", heapMb: 6144 }),
  ...Array.from({ length: 11 }, (_, index) => Object.freeze({
    name: `security-page-${String(index + 1).padStart(2, "0")}`,
    config: `tsconfig.pass4666.sec-${String(index + 1).padStart(2, "0")}.json`,
    heapMb: 4096,
  })),
  Object.freeze({ name: "pages-search", config: "tsconfig.pass4666.pages-search.json", heapMb: 4096 }),
  Object.freeze({ name: "pages-runtime-proof", config: "tsconfig.pass4666.pages-runtime-proof.json", heapMb: 4096 }),
  Object.freeze({ name: "pages-rest", config: "tsconfig.pass4666.pages-rest.json", heapMb: 6144 }),
]);

const SOURCE_DIRECTORIES = Object.freeze([
  ".github",
  "app",
  "components",
  "config",
  "data",
  "db",
  "evaluation",
  "fixtures",
  "lib",
  "messages",
  "public",
  "scripts",
  "store",
  "supabase",
  "tests",
]);

const FIXED_SOURCE_FILES = Object.freeze([
  ".env.example",
  ".velmere/canonical-code-ownership.json",
  "config/p42/p42-lifecycle-execution-allowlist.json",
  ".node-version",
  ".npmrc",
  ".nvmrc",
  "ENV_PRODUCTION_READY.example",
  "eslint.config.mjs",
  "i18n.ts",
  "lighthouserc.pass2690.cjs",
  "middleware.ts",
  "navigation.ts",
  "next-env.d.ts",
  "next.config.mjs",
  "package-lock.json",
  "package.json",
  "performance-budget.pass2690.json",
  "playwright.config.ts",
  "postcss.config.js",
  "proxy.ts",
  "routing.ts",
  "tailwind.config.ts",
  "vercel.json",
]);

const posix = (value) => value.replaceAll(path.sep, "/");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function walkFiles(root, relativeDirectory, output) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return;
  const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const relative = posix(path.join(relativeDirectory, entry.name));
    if (entry.isSymbolicLink()) throw new Error(`source_tree_symlink_not_allowed:${relative}`);
    if (entry.isDirectory()) walkFiles(root, relative, output);
    else if (entry.isFile() && !entry.name.endsWith(".map")) output.push(relative);
  }
}

export function listPass4823SourceTreeFiles(root) {
  const files = [];
  for (const directory of SOURCE_DIRECTORIES) walkFiles(root, directory, files);
  for (const relative of FIXED_SOURCE_FILES) {
    if (fs.existsSync(path.join(root, relative))) files.push(relative);
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && /^tsconfig(?:\.[^.]+(?:[-.][^.]+)*)?\.json$/u.test(entry.name)) files.push(entry.name);
  }
  return [...new Set(files)].sort();
}

export function computePass4823SourceTree(root) {
  const files = listPass4823SourceTreeFiles(root);
  const hash = crypto.createHash("sha256");
  hash.update(`${PASS4823_SOURCE_TREE_SCHEMA}\0`);
  let totalBytes = 0;
  for (const relative of files) {
    const bytes = fs.readFileSync(path.join(root, relative));
    totalBytes += bytes.length;
    hash.update(`${relative}\0${bytes.length}\0`);
    hash.update(bytes);
    hash.update("\0");
  }
  return {
    schemaVersion: PASS4823_SOURCE_TREE_SCHEMA,
    sha256: hash.digest("hex"),
    fileCount: files.length,
    totalBytes,
  };
}

export function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

export function validatePass4823TypecheckReceipt({
  receipt,
  sourceTree,
  nodeVersion,
  typescriptVersion,
}) {
  const blockers = [];
  const expectedPartitionNames = PASS4823_PARTITIONS.map((partition) => partition.name);
  if (!receipt || typeof receipt !== "object") blockers.push("receipt_invalid");
  if (receipt?.id !== PASS4823_TYPECHECK_RECEIPT_ID) blockers.push("receipt_id_mismatch");
  if (receipt?.runnerVersion !== PASS4823_TYPECHECK_RUNNER_VERSION) blockers.push("runner_version_mismatch");
  if (receipt?.ok !== true) blockers.push("receipt_not_ok");
  if (receipt?.node !== nodeVersion) blockers.push("node_mismatch");
  if (typescriptVersion && receipt?.typescript !== typescriptVersion) blockers.push("typescript_mismatch");
  if (receipt?.sourceTreeSchema !== sourceTree.schemaVersion) blockers.push("source_tree_schema_mismatch");
  if (receipt?.sourceTreeSha256 !== sourceTree.sha256) blockers.push("source_tree_changed");
  if (receipt?.sourceTreeFileCount !== sourceTree.fileCount) blockers.push("source_tree_file_count_changed");
  if (receipt?.inventory?.coveragePercent !== 100) blockers.push("inventory_not_complete");
  if (receipt?.inventory?.orphanCount !== 0 || receipt?.inventory?.orphanFiles?.length) blockers.push("inventory_has_orphans");
  if (receipt?.inventory?.duplicateOwnerCount !== 0 || receipt?.inventory?.duplicateOwnerFiles?.length) blockers.push("inventory_has_duplicate_owners");
  if (!Array.isArray(receipt?.partitions) || receipt.partitions.length !== PASS4823_PARTITIONS.length) {
    blockers.push("partition_count_mismatch");
  } else {
    const actualNames = receipt.partitions.map((partition) => partition.name);
    if (JSON.stringify(actualNames) !== JSON.stringify(expectedPartitionNames)) blockers.push("partition_order_mismatch");
    for (const partition of receipt.partitions) {
      if (partition.exitCode !== 0 || partition.timedOut || partition.diagnosticCount !== 0) blockers.push(`partition_failed:${partition.name}`);
      if (partition.sourceTreeSha256 !== sourceTree.sha256) blockers.push(`partition_source_changed:${partition.name}`);
    }
  }
  if (Array.isArray(receipt?.blockers) && receipt.blockers.length > 0) blockers.push("receipt_contains_blockers");
  return [...new Set(blockers)];
}
