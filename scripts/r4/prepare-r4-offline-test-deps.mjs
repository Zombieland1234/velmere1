import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const ARCHIVE_RELATIVE = "config/supply-chain-license-archive-cas-pass4825/9e1f1a05f0dd0c1dab64ee91ceb9bf55cd44d35368c70edda80a2fdc70a88377.tgz";
const ARCHIVE = path.join(ROOT, ARCHIVE_RELATIVE);
const EXPECTED = {
  name: "zod",
  version: "3.25.76",
  sha256: "9e1f1a05f0dd0c1dab64ee91ceb9bf55cd44d35368c70edda80a2fdc70a88377",
  byteLength: 583_600,
};
const OFFLINE_ROOT = path.join(ROOT, ".velmere", "offline-test-deps");
const NODE_MODULES = path.join(OFFLINE_ROOT, "node_modules");
const TARGET = path.join(NODE_MODULES, EXPECTED.name);
const TEMP = path.join(OFFLINE_ROOT, ".r4-zod-extract");
const RECEIPT = path.join(ROOT, ".velmere", "r4", "offline-test-deps-receipt.json");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(2);
};

if (!fs.existsSync(ARCHIVE)) fail(`missing_exact_archive:${ARCHIVE_RELATIVE}`);
const bytes = fs.readFileSync(ARCHIVE);
const actual = { sha256: sha256(bytes), byteLength: bytes.length };
if (actual.sha256 !== EXPECTED.sha256) fail(`archive_sha256_mismatch:${actual.sha256}`);
if (actual.byteLength !== EXPECTED.byteLength) fail(`archive_size_mismatch:${actual.byteLength}`);

fs.rmSync(TEMP, { recursive: true, force: true });
fs.rmSync(TARGET, { recursive: true, force: true });
fs.mkdirSync(TEMP, { recursive: true });
fs.mkdirSync(NODE_MODULES, { recursive: true });

const tar = spawnSync("tar", ["-xzf", ARCHIVE, "-C", TEMP], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
if (tar.status !== 0) fail(`tar_extract_failed:${tar.stderr || tar.stdout || tar.error?.message || "unknown"}`);
const extracted = path.join(TEMP, "package");
if (!fs.existsSync(extracted)) fail("archive_missing_package_root");
fs.renameSync(extracted, TARGET);
fs.rmSync(TEMP, { recursive: true, force: true });

const packageJsonPath = path.join(TARGET, "package.json");
const packageJsonBytes = fs.readFileSync(packageJsonPath);
const packageJson = JSON.parse(packageJsonBytes.toString("utf8"));
if (packageJson.name !== EXPECTED.name) fail(`package_name_mismatch:${packageJson.name}`);
if (packageJson.version !== EXPECTED.version) fail(`package_version_mismatch:${packageJson.version}`);

const receipt = {
  schemaVersion: "velmere.r4.offline-test-dependency-preparation.v1",
  generatedAt: new Date().toISOString(),
  status: "PASS_EXACT_ARCHIVE_EXTRACTED_FOR_LOCAL_TEST_EXECUTION",
  dependency: EXPECTED,
  sourceArchive: {
    path: ARCHIVE_RELATIVE,
    sha256: actual.sha256,
    byteLength: actual.byteLength,
  },
  extractedPackage: {
    path: path.relative(ROOT, TARGET).split(path.sep).join("/"),
    packageJsonSha256: sha256(packageJsonBytes),
    name: packageJson.name,
    version: packageJson.version,
  },
  extractionTool: {
    command: "tar -xzf",
    version: spawnSync("tar", ["--version"], { encoding: "utf8" }).stdout?.split(/\r?\n/u)[0] ?? null,
  },
  exactFullDependencyTreeCredit: false,
  productionRuntimeCredit: false,
  customerFinalCredit: false,
  truthBoundary: "This prepares one exact package from a source-embedded SHA-256-bound archive under the gitignored .velmere test-dependency root. It is not npm ci, a complete dependency tree, production Next runtime or row-level Customer FINAL.",
};
fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
fs.writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
