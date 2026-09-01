import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const A78_REVISION = "VELMERE_PASS36_A78R0_EXACT_RUNTIME_LOCKFILE_DEPENDENCY_BROWSER_BOOTSTRAP_HARDENING";
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const lexical = (a, b) => a.localeCompare(b, "en", { sensitivity: "variant" });

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort(lexical).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

export function expectedLockRows(lock) {
  return Object.entries(lock.packages ?? {})
    .filter(([lockPath, row]) => lockPath && row && !row.link && typeof row.resolved === "string" && typeof row.integrity === "string")
    .map(([lockPath, row]) => ({ lockPath, name: row.name ?? null, version: row.version ?? null, resolved: row.resolved, integrity: row.integrity }))
    .sort((a, b) => lexical(a.lockPath, b.lockPath));
}

function integrityOf(bytes, algorithm = "sha512") {
  return `${algorithm}-${crypto.createHash(algorithm).update(bytes).digest("base64")}`;
}

export function scanLockfileCasCoverage(root, lock, relativeDirectories) {
  const expected = expectedLockRows(lock);
  const expectedByIntegrity = new Map();
  for (const row of expected) {
    const bucket = expectedByIntegrity.get(row.integrity) ?? [];
    bucket.push(row);
    expectedByIntegrity.set(row.integrity, bucket);
  }
  const files = [];
  for (const relativeDirectory of relativeDirectories) {
    const directory = path.join(root, relativeDirectory);
    if (!fs.existsSync(directory)) continue;
    for (const name of fs.readdirSync(directory).sort(lexical)) {
      if (!name.endsWith(".tgz")) continue;
      const absolute = path.join(directory, name);
      const metadata = fs.lstatSync(absolute);
      if (!metadata.isFile() || metadata.isSymbolicLink()) continue;
      const bytes = fs.readFileSync(absolute);
      const integrity = integrityOf(bytes);
      const matches = expectedByIntegrity.get(integrity) ?? [];
      files.push({ path: `${relativeDirectory}/${name}`, bytes: bytes.length, sha256: sha256(bytes), integrity, matchedLockPaths: matches.map((row) => row.lockPath) });
    }
  }
  const coveredPaths = [...new Set(files.flatMap((row) => row.matchedLockPaths))].sort(lexical);
  const uncoveredPaths = expected.map((row) => row.lockPath).filter((row) => !coveredPaths.includes(row));
  return {
    expectedLockPaths: expected.length,
    exactCoveredLockPaths: coveredPaths.length,
    uncoveredLockPaths: uncoveredPaths.length,
    uniqueCasTarballs: files.length,
    coveragePercent: expected.length ? Number(((coveredPaths.length / expected.length) * 100).toFixed(3)) : 0,
    coveredPathSetSha256: sha256(coveredPaths.join("\n")),
    uncoveredPathSetSha256: sha256(uncoveredPaths.join("\n")),
    files,
  };
}

export function snapshotTree(rootDirectory) {
  const absoluteRoot = path.resolve(rootDirectory);
  const rows = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => lexical(a.name, b.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(absoluteRoot, absolute).replaceAll("\\", "/");
      const metadata = fs.lstatSync(absolute);
      if (metadata.isDirectory()) { walk(absolute); continue; }
      if (metadata.isSymbolicLink()) {
        rows.push({ path: relative, type: "symlink", target: fs.readlinkSync(absolute), mode: metadata.mode & 0o777 });
        continue;
      }
      if (!metadata.isFile()) throw new Error(`a78_runtime_special_file:${relative}`);
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: relative, type: "file", bytes: bytes.length, sha256: sha256(bytes), mode: metadata.mode & 0o777 });
    }
  }
  walk(absoluteRoot);
  rows.sort((a, b) => lexical(a.path, b.path));
  return { files: rows.length, digest: sha256(canonicalJson(rows)), rows };
}

export function buildIsolatedExecutionEnvironment({ runtimeBin, runtimeRoot, npmCliPath, artifactRoot, browserExecutable, sourceManifestSha256, platform = process.platform, parentEnv = process.env }) {
  const home = path.join(artifactRoot, "isolated-home");
  const temp = path.join(artifactRoot, "isolated-tmp");
  const env = {
    PATH: runtimeBin,
    HOME: home,
    USERPROFILE: home,
    TMPDIR: temp,
    TMP: temp,
    TEMP: temp,
    CI: "1",
    NODE_ENV: "production",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    npm_config_cache: path.join(artifactRoot, "npm-cache"),
    npm_config_offline: "true",
    npm_config_ignore_scripts: "true",
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
    npm_config_progress: "false",
    VELMERE_PLAYWRIGHT_EXECUTABLE_PATH: browserExecutable,
    VELMERE_A79_ISOLATED_ENVIRONMENT: "1",
    VELMERE_A79_RUNTIME_ROOT: runtimeRoot,
    VELMERE_A79_NPM_CLI_PATH: npmCliPath,
    VELMERE_A60_EXPECTED_SOURCE_MANIFEST_SHA256: sourceManifestSha256,
    VELMERE_A60_CONFIRM: "I_UNDERSTAND_A60_RUNS_EXACT_LOCAL_BUILDS_AND_BROWSER_TESTS_WITH_NO_LIVE_OR_SALE_CREDIT",
  };
  if (platform === "win32") {
    for (const key of ["SystemRoot", "WINDIR", "ComSpec", "PATHEXT"]) if (typeof parentEnv[key] === "string" && parentEnv[key]) env[key] = parentEnv[key];
  }
  return env;
}

export function runtimeCandidate(pathname, npmCliPath = null) {
  if (!pathname || !fs.existsSync(pathname)) return null;
  const version = spawnSync(pathname, ["--version"], { encoding: "utf8", env: { PATH: path.dirname(pathname), HOME: "/nonexistent", TMPDIR: "/tmp" } });
  let npm = null;
  if (npmCliPath && fs.existsSync(npmCliPath)) {
    const result = spawnSync(pathname, [npmCliPath, "--version"], { encoding: "utf8", env: { PATH: path.dirname(pathname), HOME: "/nonexistent", TMPDIR: "/tmp" } });
    if (result.status === 0) npm = result.stdout.trim();
  }
  return { path: pathname, node: version.status === 0 ? version.stdout.trim().replace(/^v/u, "") : null, npm };
}

export function validateA78Policy(policy, lockBytes, options = {}) {
  const checks = [];
  const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  add("revision", policy.revisionId === A78_REVISION, policy.revisionId);
  add("runtime-node", policy.expectedRuntime?.node === "24.18.0", policy.expectedRuntime?.node);
  add("runtime-npm", policy.expectedRuntime?.npm === "11.16.0", policy.expectedRuntime?.npm);
  add("lock-hash", policy.packageLock?.sha256 === sha256(lockBytes), sha256(lockBytes));
  const lock = JSON.parse(lockBytes.toString("utf8"));
  add("lock-denominator", expectedLockRows(lock).length === policy.packageLock?.expectedRemotePackages, expectedLockRows(lock).length);
  add("lock-migration", policy.packageLock?.denominatorMigrationPath === "config/pass36/a102r41-a78-lockfile-denominator-migration.json", policy.packageLock?.denominatorMigrationPath);
  add("playwright-lock-version", lock.packages?.["node_modules/playwright"]?.version === policy.browserBundle?.playwrightVersion, lock.packages?.["node_modules/playwright"]?.version);
  let browserManifest = null;
  let browserManifestSha256 = null;
  try {
    const browserManifestBytes = options.browserManifestBytes
      ?? fs.readFileSync(path.join(options.root ?? process.cwd(), policy.browserBundle.projectBrowserManifestPath));
    browserManifestSha256 = sha256(browserManifestBytes);
    browserManifest = JSON.parse(browserManifestBytes.toString("utf8"));
  } catch (error) {
    add("browser-project-manifest-readable", false, error instanceof Error ? error.message : String(error));
  }
  if (browserManifest) add("browser-project-manifest-readable", true);
  const chromium = browserManifest?.browsers?.find((row) => row?.name === policy.browserBundle?.browserName);
  add("browser-project-manifest-hash", browserManifestSha256 === policy.browserBundle?.projectBrowserManifestSha256, browserManifestSha256);
  add("browser-playwright-version", policy.browserBundle?.playwrightVersion === "1.60.0", policy.browserBundle?.playwrightVersion);
  add("browser-version", chromium?.browserVersion === policy.browserBundle?.browserVersion && policy.browserBundle?.browserVersion === "148.0.7778.96", chromium?.browserVersion ?? null);
  add("browser-revision", chromium?.revision === policy.browserBundle?.browserRevision && policy.browserBundle?.browserRevision === "1223", chromium?.revision ?? null);
  add("browser-physical-conditions", policy.browserBundle?.externalSha256Required === true && policy.browserBundle?.platformExactRequired === true && policy.browserBundle?.launchSmokeRequired === true, policy.browserBundle);
  const revisionNumber = String(policy.currentSourceRevisionId ?? "").match(/A102R(\d+)/u)?.[1] ?? null;
  add("source-current-root", policy.currentSourceAuthorityPath === "config/pass36/current-release-authority.json" && revisionNumber !== null && policy.sourceManifestPath === `config/pass36/a102r${revisionNumber}-current-root-descendant-manifest.json`, { authority: policy.currentSourceAuthorityPath, revision: policy.currentSourceRevisionId, manifest: policy.sourceManifestPath });
  add("no-sale", policy.promotionConditions?.saleEnabled === false);
  add("no-live", policy.promotionConditions?.liveProven === false);
  return { passed: checks.every((row) => row.passed), checks };
}
