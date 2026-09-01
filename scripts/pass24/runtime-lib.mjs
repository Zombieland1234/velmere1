import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

export const ROOT = process.cwd();
export const POLICY_PATH = path.join(ROOT, "config", "pass24", "runtime-policy.json");
export const REQUIREMENTS_PATH = path.join(ROOT, "config", "pass24", "lockfile-target-manifest.json");
export const DIAGNOSTICS_DIR = path.join(ROOT, ".velmere", "pass24-diagnostics");

export function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
export function sha256Bytes(value) { return createHash("sha256").update(value).digest("hex"); }
export function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}
export function normalizePath(value) { return value.split(path.sep).join("/"); }

function targetDimensionAllowed(values, target) {
  if (!Array.isArray(values) || values.length === 0) return true;
  const positives = values.filter((value) => typeof value === "string" && !value.startsWith("!"));
  const negatives = new Set(values.filter((value) => typeof value === "string" && value.startsWith("!")).map((value) => value.slice(1)));
  if (negatives.has(target)) return false;
  return positives.length === 0 || positives.includes(target);
}

function parentPackagePath(packagePath) {
  const marker = "/node_modules/";
  const index = packagePath.lastIndexOf(marker);
  return index >= 0 ? packagePath.slice(0, index) : "";
}

function resolveDependencyPackagePath(packages, parentPath, dependencyName) {
  let prefix = parentPath;
  while (true) {
    const candidate = prefix ? `${prefix}/node_modules/${dependencyName}` : `node_modules/${dependencyName}`;
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (!prefix) return null;
    prefix = parentPackagePath(prefix);
  }
}

function rowTargetAllowed(row, target) {
  return targetDimensionAllowed(row?.os, target.platform)
    && targetDimensionAllowed(row?.cpu, target.arch)
    && targetDimensionAllowed(row?.libc, target.libc);
}

export function collectTargetReachablePackagePaths(lock, policy) {
  const packages = lock.packages ?? {};
  const root = packages[""] ?? {};
  const reachable = new Set();
  const unresolved = [];
  const queue = [];
  const enqueueDependencies = (parentPath, row) => {
    const dependencies = {
      ...(row.dependencies ?? {}),
      ...(row.devDependencies ?? {}),
      ...(row.optionalDependencies ?? {}),
    };
    for (const dependencyName of Object.keys(dependencies).sort()) queue.push({ parentPath, dependencyName });
    for (const dependencyName of Object.keys(row.peerDependencies ?? {}).sort()) {
      if (row.peerDependenciesMeta?.[dependencyName]?.optional) continue;
      queue.push({ parentPath, dependencyName });
    }
  };
  enqueueDependencies("", root);
  while (queue.length > 0) {
    const { parentPath, dependencyName } = queue.shift();
    const packagePath = resolveDependencyPackagePath(packages, parentPath, dependencyName);
    if (!packagePath) {
      unresolved.push({ parentPath: parentPath || ".", dependencyName });
      continue;
    }
    if (reachable.has(packagePath)) continue;
    const row = packages[packagePath];
    if (!rowTargetAllowed(row, policy.target)) continue;
    reachable.add(packagePath);
    if (row.link && typeof row.resolved === "string" && packages[row.resolved]) {
      enqueueDependencies(row.resolved, packages[row.resolved]);
    } else {
      enqueueDependencies(packagePath, row);
    }
  }
  return { reachable, unresolved };
}

export function collectLockfileRequirements(lock = readJson(path.join(ROOT, "package-lock.json")), policy = readJson(POLICY_PATH)) {
  const packages = lock.packages ?? {};
  const { reachable, unresolved } = collectTargetReachablePackagePaths(lock, policy);
  const byUrl = new Map();
  for (const [packagePath, row] of Object.entries(packages)) {
    if (!row || typeof row !== "object") continue;
    const url = row.resolved;
    if (typeof url !== "string" || !url.startsWith(policy.npmRegistry)) continue;
    const eligible = reachable.has(packagePath) && rowTargetAllowed(row, policy.target);
    const existing = byUrl.get(url) ?? {
      url,
      integrity: row.integrity ?? null,
      packagePaths: [],
      eligiblePackagePaths: [],
      optional: true
    };
    if (existing.integrity && row.integrity && existing.integrity !== row.integrity) {
      throw new Error(`Conflicting integrity for ${url}`);
    }
    existing.integrity ??= row.integrity ?? null;
    existing.packagePaths.push(packagePath || ".");
    if (eligible) existing.eligiblePackagePaths.push(packagePath || ".");
    existing.optional = existing.optional && Boolean(row.optional);
    byUrl.set(url, existing);
  }
  const all = [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url)).map((row) => ({
    ...row,
    packagePaths: [...new Set(row.packagePaths)].sort(),
    eligiblePackagePaths: [...new Set(row.eligiblePackagePaths)].sort(),
    targetEligible: row.eligiblePackagePaths.length > 0
  }));
  const eligible = all.filter((row) => row.targetEligible);
  const excluded = all.filter((row) => !row.targetEligible);
  return { all, eligible, excluded, reachablePackagePaths: reachable, unresolved };
}

export function buildRequirementsDocument() {
  const policy = readJson(POLICY_PATH);
  const { all, eligible, excluded } = collectLockfileRequirements(undefined, policy);
  return {
    schemaVersion: "velmere.pass24.lockfile-target-manifest.v1",
    target: policy.target,
    npmRegistry: policy.npmRegistry,
    lockfileSha256: sha256File(path.join(ROOT, "package-lock.json")),
    counts: {
      allUniqueRegistryArchives: all.length,
      targetEligibleArchives: eligible.length,
      targetExcludedArchives: excluded.length
    },
    targetEligible: eligible,
    targetExcluded: excluded.map(({ url, integrity, packagePaths }) => ({ url, integrity, packagePaths }))
  };
}

export function parseCacheIndex(cacheRoot) {
  const indexRoot = path.join(cacheRoot, "_cacache", "index-v5");
  const rows = new Map();
  if (!fs.existsSync(indexRoot)) return rows;
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        for (const line of fs.readFileSync(absolute, "utf8").split(/\r?\n/u)) {
          const tab = line.indexOf("\t");
          if (tab < 0) continue;
          try {
            const payload = JSON.parse(line.slice(tab + 1));
            const prefix = "make-fetch-happen:request-cache:";
            if (typeof payload.key !== "string" || !payload.key.startsWith(prefix)) continue;
            const url = payload.key.slice(prefix.length);
            const previous = rows.get(url);
            if (!previous || Number(payload.time ?? 0) >= Number(previous.time ?? 0)) rows.set(url, payload);
          } catch (ignoredError) { void ignoredError; }
        }
      }
    }
  };
  visit(indexRoot);
  return rows;
}

function integrityParts(integrity) {
  if (typeof integrity !== "string") return null;
  const match = /^(sha512)-([A-Za-z0-9+/=]+)$/u.exec(integrity.trim());
  if (!match) return null;
  const hex = Buffer.from(match[2], "base64").toString("hex");
  return { algorithm: match[1], hex };
}

export function cacheContentPath(cacheRoot, integrity) {
  const parsed = integrityParts(integrity);
  if (!parsed) return null;
  return path.join(cacheRoot, "_cacache", "content-v2", parsed.algorithm, parsed.hex.slice(0, 2), parsed.hex.slice(2, 4), parsed.hex.slice(4));
}

export function verifyCacheCoverage(cacheRoot, requirements = buildRequirementsDocument(), { verifyBytes = true } = {}) {
  const index = parseCacheIndex(cacheRoot);
  const rows = [];
  for (const requirement of requirements.targetEligible) {
    const cached = index.get(requirement.url);
    const expectedIntegrity = requirement.integrity;
    const cacheIntegrity = cached?.integrity ?? null;
    const integrityMatch = Boolean(expectedIntegrity && cacheIntegrity === expectedIntegrity);
    const contentPath = cacheIntegrity ? cacheContentPath(cacheRoot, cacheIntegrity) : null;
    const contentPresent = Boolean(contentPath && fs.existsSync(contentPath));
    let bytesMatch = false;
    let actualBytes = null;
    if (contentPresent && verifyBytes) {
      const parsed = integrityParts(cacheIntegrity);
      const bytes = fs.readFileSync(contentPath);
      actualBytes = bytes.length;
      const actual = createHash(parsed.algorithm).update(bytes).digest("hex");
      bytesMatch = actual === parsed.hex;
    } else if (contentPresent) bytesMatch = true;
    rows.push({
      url: requirement.url,
      integrity: expectedIntegrity,
      cached: Boolean(cached),
      integrityMatch,
      contentPresent,
      bytesMatch,
      bytes: actualBytes,
      ok: Boolean(cached && integrityMatch && contentPresent && bytesMatch)
    });
  }
  const passed = rows.filter((row) => row.ok).length;
  return {
    schemaVersion: "velmere.pass24.cache-coverage.v1",
    cacheRoot: normalizePath(path.resolve(cacheRoot)),
    required: rows.length,
    passed,
    missing: rows.length - passed,
    coveragePercent: Number(((passed / Math.max(1, rows.length)) * 100).toFixed(4)),
    ok: passed === rows.length,
    rows
  };
}

export function sourceTreeDigest() {
  const rows = [];
  const excludedDirectories = new Set([".git", ".next", ".velmere", "node_modules", "artifacts", "coverage", "out", "build"]);
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relativeParent = normalizePath(path.relative(ROOT, directory));
      if (entry.isDirectory() && (relativeParent === "" || relativeParent === ".")
        && (excludedDirectories.has(entry.name) || entry.name.startsWith(".next-pass25-"))) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && !entry.name.endsWith(".tsbuildinfo")) {
        const relative = normalizePath(path.relative(ROOT, absolute));
        if (relative === "CLEAN_SAFE_VERIFICATION.json") continue;
        const bytes = fs.readFileSync(absolute);
        rows.push(`${relative}\0${bytes.length}\0${sha256Bytes(bytes)}`);
      }
    }
  };
  visit(ROOT);
  rows.sort();
  return { sha256: sha256Bytes(rows.join("\n")), files: rows.length };
}

export function run(program, args, options = {}) {
  return spawnSync(program, args, {
    cwd: options.cwd ?? ROOT,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    timeout: options.timeout ?? 120_000,
    maxBuffer: options.maxBuffer ?? 128 * 1024 * 1024,
    windowsHide: true
  });
}

export function resolveCacheRoot(explicitValue = null) {
  if (explicitValue) return { cacheRoot: path.resolve(explicitValue), source: "cli" };
  if (process.env.npm_config_cache) return { cacheRoot: path.resolve(process.env.npm_config_cache), source: "npm_config_cache" };
  if (process.env.NPM_CONFIG_CACHE) return { cacheRoot: path.resolve(process.env.NPM_CONFIG_CACHE), source: "NPM_CONFIG_CACHE" };
  return { cacheRoot: path.join(os.homedir(), ".npm"), source: "os.homedir" };
}

export function defaultCacheRoot() {
  return resolveCacheRoot().cacheRoot;
}
