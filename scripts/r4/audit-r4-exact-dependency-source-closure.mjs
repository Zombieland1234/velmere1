import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const MANIFEST_RELATIVE = "artifacts/closure/p42/exact-windows-dependency-closure/dependency-cas-manifest.json";
const MANIFEST_PATH = path.join(ROOT, MANIFEST_RELATIVE);
const LOCK_PATH = path.join(ROOT, "package-lock.json");
const PACKAGE_PATH = path.join(ROOT, "package.json");
const OUT = path.join(ROOT, "artifacts/r4/VELMERE_R4_EXACT_DEPENDENCY_SOURCE_CLOSURE.json");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const posix = (value) => value.split(path.sep).join("/");

const excludedTop = new Set([".git", ".velmere", "node_modules"]);
function walk(directory, relative = "") {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)))) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!relative && excludedTop.has(entry.name)) continue;
      output.push(...walk(path.join(directory, entry.name), childRelative));
    } else if (entry.isFile() && entry.name.endsWith(".tgz")) {
      output.push(childRelative);
    }
  }
  return output;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const lockBytes = fs.readFileSync(LOCK_PATH);
const packageBytes = fs.readFileSync(PACKAGE_PATH);
const lock = JSON.parse(lockBytes.toString("utf8"));
const archivePaths = walk(ROOT);
const archives = archivePaths.map((relativePath) => {
  const bytes = fs.readFileSync(path.join(ROOT, relativePath));
  return { path: posix(relativePath), sha256: sha256(bytes), byteLength: bytes.length };
});
const archivesByHash = new Map();
for (const archive of archives) {
  const list = archivesByHash.get(archive.sha256) ?? [];
  list.push(archive);
  archivesByHash.set(archive.sha256, list);
}

const requiredRows = manifest.rows;
const presentRows = requiredRows.filter((row) => archivesByHash.has(row.sha256));
const missingRows = requiredRows.filter((row) => !archivesByHash.has(row.sha256));
const targetLockPaths = [
  "node_modules/zod",
  "node_modules/typescript",
  "node_modules/react",
  "node_modules/react-dom",
  "node_modules/@electric-sql/pglite",
  "node_modules/next",
];
const targetPackages = targetLockPaths.map((lockPath) => {
  const packageEntry = lock.packages?.[lockPath] ?? null;
  const row = requiredRows.find((candidate) => candidate.lockPaths.includes(lockPath)) ?? null;
  const copies = row ? archivesByHash.get(row.sha256) ?? [] : [];
  return {
    lockPath,
    packageName: lockPath.replace(/^node_modules\//u, ""),
    version: packageEntry?.version ?? null,
    resolved: packageEntry?.resolved ?? null,
    integrity: packageEntry?.integrity ?? null,
    requiredSha256: row?.sha256 ?? null,
    requiredByteLength: row?.byteLength ?? null,
    sourceEmbeddedExactArchive: copies.length > 0,
    sourceArchivePaths: copies.map((copy) => copy.path),
  };
});

const remainingDependencyTests = [
  {
    test: "scripts/current-execution/test-public-proof-publication-boundary.ts",
    missingExactPackageRoots: ["react", "react-dom", "typescript"],
    boundary: "Server-rendered TSX/page import boundary; no fake React or TSX transpiler credit.",
  },
  {
    test: "scripts/current-execution/test-v4-verify-durable-registry-boundary.ts",
    missingExactPackageRoots: ["react", "react-dom", "typescript"],
    boundary: "Durable Verify UI/route import boundary; no fake React or TSX transpiler credit.",
  },
  ...[
    "test-v4-account-data-export-pglite.mjs",
    "test-v4-account-erasure-pglite.mjs",
    "test-v4-audit-verify-producer-pglite.mjs",
    "test-v4-verify-monitor-worker-pglite.mjs",
    "test-v4-verify-pglite.mjs",
  ].map((name) => ({
    test: `scripts/current-execution/${name}`,
    missingExactPackageRoots: ["@electric-sql/pglite"],
    boundary: "Real embedded PostgreSQL/WASM migration execution; no database shim credit.",
  })),
];

const lockSha256 = sha256(lockBytes);
const packageSha256 = sha256(packageBytes);
const payload = {
  schemaVersion: "velmere.r4.exact-dependency-source-closure.v1",
  generatedAt: new Date().toISOString(),
  status: missingRows.length === 0 ? "PASS_COMPLETE_EXACT_SOURCE_CLOSURE" : "PARTIAL_EXACT_SOURCE_CLOSURE",
  binding: {
    currentPackageJsonSha256: packageSha256,
    currentPackageLockSha256: lockSha256,
    p42PackageJsonSha256: manifest.sourceBinding.packageJsonSha256,
    p42PackageLockSha256: manifest.sourceBinding.packageLockSha256,
    exactPackageJsonMatch: packageSha256 === manifest.sourceBinding.packageJsonSha256,
    exactPackageLockMatch: lockSha256 === manifest.sourceBinding.packageLockSha256,
    p42Manifest: MANIFEST_RELATIVE,
    p42ManifestCoreSha256: manifest.manifestCoreSha256,
  },
  denominator: {
    requiredUniqueTarballs: requiredRows.length,
    requiredLockPathsWithTarball: manifest.denominator.lockPathsWithTarball,
    sourceTgzFilesScanned: archives.length,
    sourceUniqueTgzSha256: new Set(archives.map((archive) => archive.sha256)).size,
    exactRequiredTarballsPresent: presentRows.length,
    exactRequiredTarballsMissing: missingRows.length,
    exactRequiredCoverageBps: Math.floor((presentRows.length * 10_000) / requiredRows.length),
  },
  targetPackages,
  remainingDependencyTests,
  presentRequiredRows: presentRows.map((row) => ({
    sha256: row.sha256,
    byteLength: row.byteLength,
    resolved: row.resolved,
    lockPaths: row.lockPaths,
    sourceArchivePaths: (archivesByHash.get(row.sha256) ?? []).map((archive) => archive.path),
  })),
  missingRequiredRows: missingRows.map((row) => ({
    sha256: row.sha256,
    byteLength: row.byteLength,
    resolved: row.resolved,
    lockPaths: row.lockPaths,
  })),
  allScannedArchives: archives,
  exactNpmCiCredit: false,
  exactWindowsCredit: false,
  customerFinalCredit: false,
  truthBoundary: "The current package-lock is compared byte-for-byte to the historical exact P42 dependency manifest and every source-embedded .tgz is hashed. Presence means only an exact archive exists somewhere in current source; it does not prove installation, lifecycle scripts, platform-native resolution, whole-project build or Customer FINAL.",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  schemaVersion: payload.schemaVersion,
  status: payload.status,
  binding: payload.binding,
  denominator: payload.denominator,
  targetPackages: payload.targetPackages,
  remainingDependencyTestCount: payload.remainingDependencyTests.length,
  output: posix(path.relative(ROOT, OUT)),
}, null, 2)}\n`);
