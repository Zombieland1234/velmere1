import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { crc32, inspectZip, extractZipSafely } from "../lib/a47-safe-zip.mjs";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const lexical = (a, b) => a.localeCompare(b, "en", { sensitivity: "variant" });

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${code}:not_object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`${code}:${actual.join(",")}`);
}

export function currentPlatformKey() {
  const key = `${process.platform}-${process.arch}`;
  if (!new Set(["linux-x64", "win32-x64"]).has(key)) throw new Error(`a62_platform_unsupported:${key}`);
  return key;
}

function selectedRuntimeProfile(policy, platformKey = null) {
  const key = platformKey ?? currentPlatformKey();
  const profile = policy.runtimeProfiles?.[key];
  if (!profile) throw new Error(`a62_runtime_profile_missing:${key}`);
  return { key, profile };
}

function strictRelative(value, code = "a62_path_invalid") {
  if (typeof value !== "string" || !value || value.includes("\\") || path.isAbsolute(value)) throw new Error(`${code}:${String(value)}`);
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error(`${code}:${value}`);
  return value;
}

function readZipEntry(inspected, entry) {
  const { buffer } = inspected;
  const offset = entry.localOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error(`a62_zip_local_signature_invalid:${entry.name}`);
  const localFlags = buffer.readUInt16LE(offset + 6);
  const localMethod = buffer.readUInt16LE(offset + 8);
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const localName = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8").replaceAll("\\", "/");
  if (localName !== entry.name || localMethod !== entry.method || localFlags !== entry.flags) throw new Error(`a62_zip_local_header_mismatch:${entry.name}`);
  const start = offset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > buffer.length) throw new Error(`a62_zip_entry_bounds:${entry.name}`);
  const compressed = buffer.subarray(start, end);
  const bytes = entry.method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.uncompressedSize) });
  if (bytes.length !== entry.uncompressedSize) throw new Error(`a62_zip_size_mismatch:${entry.name}`);
  if (crc32(bytes) !== entry.expectedCrc32) throw new Error(`a62_zip_crc_mismatch:${entry.name}`);
  return bytes;
}

function integrityMatches(bytes, integrity) {
  if (typeof integrity !== "string" || !integrity.includes("-")) return false;
  const [algorithm, encoded] = integrity.split("-", 2);
  if (!crypto.getHashes().includes(algorithm)) return false;
  const actual = crypto.createHash(algorithm).update(bytes).digest("base64");
  return actual === encoded;
}

export function expectedLockPackages(lock) {
  return Object.entries(lock.packages ?? {})
    .filter(([lockPath, row]) => lockPath && row && !row.link && typeof row.resolved === "string" && typeof row.integrity === "string")
    .map(([lockPath, row]) => ({ lockPath, version: row.version ?? null, resolved: row.resolved, integrity: row.integrity }))
    .sort((a, b) => lexical(a.lockPath, b.lockPath));
}

export function inspectDependencyBundle({ bundlePath, packageLockPath, policy }) {
  const lockBytes = fs.readFileSync(packageLockPath);
  const lockSha256 = sha256(lockBytes);
  if (lockSha256 !== policy.packageLock.sha256) throw new Error(`a62_package_lock_anchor_mismatch:${lockSha256}`);
  const lock = JSON.parse(lockBytes.toString("utf8"));
  const expected = expectedLockPackages(lock);
  if (expected.length !== policy.packageLock.expectedRemotePackages) throw new Error(`a62_package_lock_denominator_mismatch:${expected.length}`);
  const inspected = inspectZip(bundlePath, policy.dependencyBundle.budgets);
  const fileEntries = inspected.entries.filter((entry) => !entry.isDirectory);
  const manifestEntries = fileEntries.filter((entry) => entry.name === policy.dependencyBundle.manifestPath);
  if (manifestEntries.length !== 1) throw new Error(`a62_bundle_manifest_count:${manifestEntries.length}`);
  const manifestBytes = readZipEntry(inspected, manifestEntries[0]);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.schemaVersion !== policy.dependencyBundle.schemaVersion) throw new Error("a62_bundle_schema_mismatch");
  if (manifest.packageLockSha256 !== lockSha256) throw new Error("a62_bundle_lock_digest_mismatch");
  if (!Array.isArray(manifest.packages)) throw new Error("a62_bundle_packages_invalid");
  const rows = [...manifest.packages].sort((a, b) => lexical(a.lockPath, b.lockPath));
  if (rows.length !== expected.length) throw new Error(`a62_bundle_package_count:${rows.length}!=${expected.length}`);
  const seenLock = new Set();
  const seenTar = new Set();
  const verified = [];
  for (let index = 0; index < expected.length; index += 1) {
    const want = expected[index];
    const row = rows[index];
    if (!row || row.lockPath !== want.lockPath) throw new Error(`a62_bundle_lock_path_mismatch:${want.lockPath}`);
    if (seenLock.has(row.lockPath)) throw new Error(`a62_bundle_duplicate_lock_path:${row.lockPath}`);
    seenLock.add(row.lockPath);
    if (row.version !== want.version || row.resolved !== want.resolved || row.integrity !== want.integrity) throw new Error(`a62_bundle_lock_metadata_mismatch:${row.lockPath}`);
    const tarballPath = strictRelative(row.tarballPath, "a62_tarball_path_invalid");
    if (!tarballPath.startsWith("tarballs/") || !tarballPath.endsWith(".tgz")) throw new Error(`a62_tarball_path_invalid:${tarballPath}`);
    if (seenTar.has(tarballPath)) throw new Error(`a62_bundle_duplicate_tarball_path:${tarballPath}`);
    seenTar.add(tarballPath);
    const matches = fileEntries.filter((entry) => entry.name === tarballPath);
    if (matches.length !== 1) throw new Error(`a62_tarball_entry_count:${tarballPath}:${matches.length}`);
    const bytes = readZipEntry(inspected, matches[0]);
    if (!Number.isSafeInteger(row.byteLength) || row.byteLength !== bytes.length) throw new Error(`a62_tarball_size_mismatch:${row.lockPath}`);
    const digest = sha256(bytes);
    if (row.sha256 !== digest) throw new Error(`a62_tarball_sha256_mismatch:${row.lockPath}`);
    if (!integrityMatches(bytes, want.integrity)) throw new Error(`a62_tarball_integrity_mismatch:${row.lockPath}`);
    verified.push({ ...want, tarballPath, byteLength: bytes.length, sha256: digest, bytes });
  }
  const expectedFiles = new Set([policy.dependencyBundle.manifestPath, ...verified.map((row) => row.tarballPath)]);
  const extras = fileEntries.map((entry) => entry.name).filter((name) => !expectedFiles.has(name));
  if (extras.length) throw new Error(`a62_bundle_extra_files:${extras.join(",")}`);
  return { bundle: { sha256: sha256(inspected.buffer), byteLength: inspected.buffer.length, entries: inspected.entryCount }, manifest, lockSha256, packages: verified };
}

export function inspectBrowserBundle({ bundlePath, expectedBundleSha256, packageLockPath, policy, platformKey = null, extractRoot = null }) {
  if (!/^[a-f0-9]{64}$/u.test(String(expectedBundleSha256 ?? "").toLowerCase())) throw new Error("a62_browser_bundle_anchor_not_supplied");
  const selectedPlatform = platformKey ?? currentPlatformKey();
  const archiveBytes = fs.readFileSync(bundlePath);
  const archiveSha256 = sha256(archiveBytes);
  if (archiveSha256 !== String(expectedBundleSha256).toLowerCase()) throw new Error(`a62_browser_bundle_anchor_mismatch:${archiveSha256}`);
  const lockBytes = fs.readFileSync(packageLockPath);
  const lockSha256 = sha256(lockBytes);
  if (lockSha256 !== policy.packageLock.sha256) throw new Error(`a62_package_lock_anchor_mismatch:${lockSha256}`);
  const inspected = inspectZip(bundlePath, policy.browserBundle.budgets);
  const fileEntries = inspected.entries.filter((entry) => !entry.isDirectory);
  const manifestEntries = fileEntries.filter((entry) => entry.name === policy.browserBundle.manifestPath);
  if (manifestEntries.length !== 1) throw new Error(`a62_browser_manifest_count:${manifestEntries.length}`);
  const manifest = JSON.parse(readZipEntry(inspected, manifestEntries[0]).toString("utf8"));
  exactKeys(manifest, ["schemaVersion", "packageLockSha256", "playwrightVersion", "browserName", "platform", "rootDirectory", "executableRelativePath", "files"], "a62_browser_manifest_keys");
  if (manifest.schemaVersion !== policy.browserBundle.schemaVersion) throw new Error("a62_browser_bundle_schema_mismatch");
  if (manifest.packageLockSha256 !== lockSha256) throw new Error("a62_browser_bundle_lock_digest_mismatch");
  if (manifest.playwrightVersion !== policy.browserBundle.playwrightVersion) throw new Error("a62_browser_playwright_version_mismatch");
  if (manifest.browserName !== policy.browserBundle.browserName) throw new Error("a62_browser_name_mismatch");
  if (manifest.platform !== selectedPlatform) throw new Error(`a62_browser_platform_mismatch:${manifest.platform}`);
  if (manifest.rootDirectory !== policy.browserBundle.rootDirectory) throw new Error("a62_browser_root_mismatch");
  const executableRelativePath = strictRelative(manifest.executableRelativePath, "a62_browser_executable_path_invalid");
  if (!executableRelativePath.startsWith(`${manifest.rootDirectory}/`)) throw new Error("a62_browser_executable_outside_root");
  if (!Array.isArray(manifest.files) || manifest.files.length < 1) throw new Error("a62_browser_files_invalid");
  const rows = [...manifest.files].sort((a, b) => lexical(a.path, b.path));
  const seen = new Set();
  const verified = [];
  for (const row of rows) {
    exactKeys(row, ["path", "byteLength", "sha256", "mode"], "a62_browser_file_keys");
    const relative = strictRelative(row.path, "a62_browser_file_path_invalid");
    if (!relative.startsWith(`${manifest.rootDirectory}/`)) throw new Error(`a62_browser_file_outside_root:${relative}`);
    if (seen.has(relative)) throw new Error(`a62_browser_duplicate_file:${relative}`);
    seen.add(relative);
    if (!Number.isSafeInteger(row.byteLength) || row.byteLength < 0) throw new Error(`a62_browser_file_size_invalid:${relative}`);
    if (!/^[a-f0-9]{64}$/u.test(row.sha256)) throw new Error(`a62_browser_file_sha_invalid:${relative}`);
    if (![0o100644, 0o100755].includes(row.mode)) throw new Error(`a62_browser_file_mode_invalid:${relative}`);
    const matches = fileEntries.filter((entry) => entry.name === relative);
    if (matches.length !== 1) throw new Error(`a62_browser_file_entry_count:${relative}:${matches.length}`);
    const bytes = readZipEntry(inspected, matches[0]);
    if (bytes.length !== row.byteLength) throw new Error(`a62_browser_file_size_mismatch:${relative}`);
    const digest = sha256(bytes);
    if (digest !== row.sha256) throw new Error(`a62_browser_file_sha_mismatch:${relative}`);
    verified.push({ ...row, bytes });
  }
  if (!seen.has(executableRelativePath)) throw new Error("a62_browser_executable_not_manifested");
  const expectedFiles = new Set([policy.browserBundle.manifestPath, ...verified.map((row) => row.path)]);
  const extras = fileEntries.map((entry) => entry.name).filter((name) => !expectedFiles.has(name));
  if (extras.length) throw new Error(`a62_browser_bundle_extra_files:${extras.join(",")}`);
  let executablePath = null;
  if (extractRoot) {
    extractZipSafely(bundlePath, extractRoot, policy.browserBundle.budgets);
    for (const row of verified) fs.chmodSync(path.join(extractRoot, row.path), row.mode & 0o777);
    executablePath = path.join(extractRoot, executableRelativePath);
    if (!fs.existsSync(executablePath)) throw new Error("a62_browser_executable_missing_after_extract");
  }
  return {
    bundle: { sha256: archiveSha256, byteLength: archiveBytes.length, entries: inspected.entryCount },
    manifest: { ...manifest, files: undefined },
    files: verified.map(({ bytes, ...row }) => row),
    executableRelativePath,
    executablePath,
    platform: selectedPlatform,
  };
}

export function inspectRuntimeArchive({ archivePath, policy, extractRoot = null, platformKey = null }) {
  const { key, profile } = selectedRuntimeProfile(policy, platformKey);
  const bytes = fs.readFileSync(archivePath);
  const digest = sha256(bytes);
  if (digest !== profile.sha256) throw new Error(`a62_node_archive_hash_mismatch:${digest}`);
  if (bytes.length > profile.maximumArchiveBytes) throw new Error(`a62_node_archive_size_budget:${bytes.length}`);
  let report;
  if (profile.archiveType === "tar.xz") {
    const args = ["scripts/pass36/a62_safe_tar.py", archivePath, "--expected-root", profile.expectedRoot, "--max-entries", String(profile.maximumEntries), "--max-total-bytes", String(profile.maximumTotalBytes), "--max-file-bytes", String(profile.maximumSingleFileBytes)];
    for (const symlink of profile.allowedSymlinks ?? []) args.push("--allow-symlink", symlink);
    if (extractRoot) args.push("--extract", extractRoot);
    const run = spawnSync(policy.pythonCommand ?? "python3", args, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (run.status !== 0) throw new Error(`a62_node_archive_unsafe:${(run.stdout || run.stderr || "unknown").trim()}`);
    report = JSON.parse(run.stdout.trim());
    if (report.status !== "PASS") throw new Error("a62_node_archive_inspection_failed");
  } else if (profile.archiveType === "zip") {
    const budgets = {
      maximumArchiveBytes: profile.maximumArchiveBytes,
      maximumEntries: profile.maximumEntries,
      maximumTotalUncompressedBytes: profile.maximumTotalBytes,
      maximumSingleFileBytes: profile.maximumSingleFileBytes,
    };
    const inspected = inspectZip(archivePath, budgets);
    const outside = inspected.entries.filter((entry) => entry.name !== `${profile.expectedRoot}/` && !entry.name.startsWith(`${profile.expectedRoot}/`));
    if (outside.length) throw new Error(`a62_node_archive_root_mismatch:${outside[0].name}`);
    if (extractRoot) extractZipSafely(archivePath, extractRoot, budgets);
    report = { status: "PASS", entries: inspected.entryCount, totalFileBytes: inspected.totalUncompressedBytes };
  } else throw new Error(`a62_runtime_archive_type_unsupported:${profile.archiveType}`);
  if (!extractRoot) return { sha256: digest, byteLength: bytes.length, report, platformKey: key };
  const runtimeRoot = path.join(extractRoot, profile.expectedRoot);
  const nodePath = path.join(runtimeRoot, profile.nodeRelativePath);
  const npmCliPath = path.join(runtimeRoot, profile.npmCliRelativePath);
  if (!fs.existsSync(nodePath) || !fs.existsSync(npmCliPath)) throw new Error("a62_runtime_binary_missing");
  const nodeVersion = spawnSync(nodePath, ["--version"], { encoding: "utf8" });
  const npmVersion = spawnSync(nodePath, [npmCliPath, "--version"], { encoding: "utf8" });
  if (nodeVersion.status !== 0 || nodeVersion.stdout.trim() !== `v${policy.expectedRuntime.node}`) throw new Error(`a62_runtime_node_version_mismatch:${nodeVersion.stdout.trim()}`);
  if (npmVersion.status !== 0 || npmVersion.stdout.trim() !== policy.expectedRuntime.npm) throw new Error(`a62_runtime_npm_version_mismatch:${npmVersion.stdout.trim()}`);
  return { sha256: digest, byteLength: bytes.length, report, platformKey: key, profile, runtimeRoot, nodePath, npmCliPath, node: nodeVersion.stdout.trim().slice(1), npm: npmVersion.stdout.trim() };
}

export function evaluateA62Inputs({ root, policy, nodeArchivePath = null, dependencyBundlePath = null, browserBundlePath = null, expectedBrowserBundleSha256 = null, extractRuntime = false, platformKey = null }) {
  const errors = [];
  let runtime = null;
  let dependencies = null;
  let browser = null;
  let tempRoot = null;
  try {
    if (!nodeArchivePath) throw new Error("a62_node_archive_not_supplied");
    if (extractRuntime) {
      tempRoot = fs.mkdtempSync(path.join(root, ".a62-runtime-"));
      runtime = inspectRuntimeArchive({ archivePath: path.resolve(nodeArchivePath), policy, extractRoot: tempRoot, platformKey });
    } else runtime = inspectRuntimeArchive({ archivePath: path.resolve(nodeArchivePath), policy, platformKey });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    if (tempRoot) { fs.rmSync(tempRoot, { recursive: true, force: true }); tempRoot = null; }
  }
  try {
    if (!dependencyBundlePath) throw new Error("a62_dependency_bundle_not_supplied");
    dependencies = inspectDependencyBundle({ bundlePath: path.resolve(dependencyBundlePath), packageLockPath: path.join(root, policy.packageLock.path), policy });
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  try {
    if (!browserBundlePath) throw new Error("a62_browser_bundle_not_supplied");
    browser = inspectBrowserBundle({ bundlePath: path.resolve(browserBundlePath), expectedBundleSha256: expectedBrowserBundleSha256, packageLockPath: path.join(root, policy.packageLock.path), policy, platformKey });
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  const verified = errors.length === 0 && runtime && dependencies && browser;
  return {
    schemaVersion: "velmere.pass36.a62.offline-runtime-dependency-input.v2",
    revisionId: policy.revisionId,
    decision: verified ? policy.decisions.verifiedInputs : errors.some((row) => row.includes("not_supplied")) ? policy.decisions.blocked : policy.decisions.rejected,
    summary: { runtimeVerified: Boolean(runtime), dependencyBundleVerified: Boolean(dependencies), browserBundleVerified: Boolean(browser), packageCount: dependencies?.packages?.length ?? 0, browserFiles: browser?.files?.length ?? 0, errors: errors.length },
    runtime: runtime ? { sha256: runtime.sha256, byteLength: runtime.byteLength, entries: runtime.report.entries, node: runtime.node ?? null, npm: runtime.npm ?? null, platform: runtime.platformKey } : null,
    dependencies: dependencies ? { bundle: dependencies.bundle, lockSha256: dependencies.lockSha256, packages: dependencies.packages.length } : null,
    browser: browser ? { bundle: browser.bundle, platform: browser.platform, executableRelativePath: browser.executableRelativePath, files: browser.files.length } : null,
    errors,
    temporaryRuntimeRoot: tempRoot,
    saleEnabled: false,
    liveProven: false,
    truthBoundary: policy.truthBoundary,
  };
}

