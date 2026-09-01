import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readJson, sha256File, verifyCacheCoverage } from "../pass24/runtime-lib.mjs";

export const ROOT = process.cwd();
export const PASS26_POLICY_PATH = path.join(ROOT, "config", "pass26", "runtime-cache-bundle-policy.json");
export const PASS24_REQUIREMENTS_PATH = path.join(ROOT, "config", "pass24", "lockfile-target-manifest.json");
export const BUNDLE_MANIFEST_NAME = "PASS26_RUNTIME_CACHE_BUNDLE_MANIFEST.json";

export function normalizePath(value) {
  return value.split(path.sep).join("/");
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function validateBundleRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || value.includes("\\")) {
    throw new Error("PASS26 bundle path must be a non-empty portable path");
  }
  if (path.posix.isAbsolute(value)) throw new Error(`PASS26 absolute bundle path rejected: ${value}`);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`PASS26 unsafe bundle path rejected: ${value}`);
  }
  return value;
}

export function safeJoin(root, relative) {
  const validated = validateBundleRelativePath(relative);
  const resolvedRoot = path.resolve(root);
  const absolute = path.resolve(resolvedRoot, validated);
  if (absolute !== resolvedRoot && !absolute.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`PASS26 bundle path escapes root: ${relative}`);
  }
  return absolute;
}

export function walkRegularFiles(root, { exclude = new Set() } = {}) {
  const rows = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = normalizePath(path.relative(root, absolute));
      validateBundleRelativePath(relative);
      if (entry.isSymbolicLink()) throw new Error(`PASS26 bundle symlink rejected: ${relative}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && !exclude.has(relative)) {
        const stat = fs.statSync(absolute);
        rows.push({ path: relative, bytes: stat.size, sha256: sha256File(absolute) });
      } else if (!entry.isFile()) {
        throw new Error(`PASS26 unsupported filesystem entry: ${relative}`);
      }
    }
  };
  visit(root);
  return rows;
}

export function buildBundleManifest(bundleRoot, metadata = {}) {
  const files = walkRegularFiles(bundleRoot, { exclude: new Set([BUNDLE_MANIFEST_NAME]) });
  const canonical = files.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n");
  return {
    schemaVersion: "velmere.pass26.runtime-cache-bundle-manifest.v1",
    ...metadata,
    files,
    counts: {
      files: files.length,
      bytes: files.reduce((sum, row) => sum + row.bytes, 0),
    },
    treeSha256: sha256Bytes(canonical),
  };
}

export function verifyBundleFileManifest(bundleRoot) {
  const manifestPath = path.join(bundleRoot, BUNDLE_MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) throw new Error(`PASS26 bundle manifest missing: ${manifestPath}`);
  const expected = readJson(manifestPath);
  if (expected.schemaVersion !== "velmere.pass26.runtime-cache-bundle-manifest.v1") {
    throw new Error(`PASS26 unsupported bundle manifest schema: ${expected.schemaVersion}`);
  }
  const actual = buildBundleManifest(bundleRoot, {
    sourceLockfileSha256: expected.sourceLockfileSha256,
    target: expected.target,
    nodeArchive: expected.nodeArchive,
    cacheCoverage: expected.cacheCoverage,
  });
  const expectedRows = JSON.stringify(expected.files);
  const actualRows = JSON.stringify(actual.files);
  const ok = expectedRows === actualRows && expected.treeSha256 === actual.treeSha256;
  return { ok, expected, actual, manifestPath };
}

export function verifyRuntimeCacheBundle(bundleRoot, { verifyBytes = true } = {}) {
  const root = path.resolve(bundleRoot);
  const policy = readJson(PASS26_POLICY_PATH);
  const requirements = readJson(PASS24_REQUIREMENTS_PATH);
  for (const required of policy.requiredBundlePaths) {
    const absolute = safeJoin(root, required);
    if (!fs.existsSync(absolute)) throw new Error(`PASS26 required bundle path missing: ${required}`);
  }
  const manifestCheck = verifyBundleFileManifest(root);
  if (!manifestCheck.ok) throw new Error("PASS26 bundle file manifest mismatch");
  const archivePath = safeJoin(root, `runtime/${policy.nodeArchive.fileName}`);
  const archiveSha256 = sha256File(archivePath);
  if (archiveSha256 !== policy.nodeArchive.sha256) {
    throw new Error(`PASS26 Node archive SHA mismatch: expected ${policy.nodeArchive.sha256}, got ${archiveSha256}`);
  }
  const bundledLockfile = safeJoin(root, "package-lock.json");
  const bundledRequirements = safeJoin(root, "lockfile-target-manifest.json");
  const bundledRuntimePolicy = safeJoin(root, "runtime-policy.json");
  const sourceLockfileSha256 = sha256File(path.join(ROOT, "package-lock.json"));
  if (sha256File(bundledLockfile) !== sourceLockfileSha256) throw new Error("PASS26 bundled package-lock.json does not match source");
  if (sha256File(bundledRequirements) !== sha256File(PASS24_REQUIREMENTS_PATH)) throw new Error("PASS26 bundled target manifest does not match source");
  if (sha256File(bundledRuntimePolicy) !== sha256File(path.join(ROOT, "config/pass24/runtime-policy.json"))) throw new Error("PASS26 bundled runtime policy does not match source");
  const cacheRoot = safeJoin(root, "npm-cache");
  const cacheCoverage = verifyCacheCoverage(cacheRoot, requirements, { verifyBytes });
  if (!cacheCoverage.ok) throw new Error(`PASS26 bundle cache incomplete: ${cacheCoverage.passed}/${cacheCoverage.required}`);
  if (cacheCoverage.required !== policy.targetEligibleArchives) {
    throw new Error(`PASS26 target archive count drift: policy=${policy.targetEligibleArchives} actual=${cacheCoverage.required}`);
  }
  return {
    ok: true,
    bundleRoot: normalizePath(root),
    archive: { fileName: policy.nodeArchive.fileName, sha256: archiveSha256 },
    sourceLockfileSha256,
    cacheCoverage: {
      passed: cacheCoverage.passed,
      required: cacheCoverage.required,
      coveragePercent: cacheCoverage.coveragePercent,
    },
    manifest: {
      files: manifestCheck.expected.counts.files,
      bytes: manifestCheck.expected.counts.bytes,
      treeSha256: manifestCheck.expected.treeSha256,
    },
  };
}
