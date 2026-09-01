import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
  normalizeArchivePath,
  parseDeterministicZip,
  sha256,
  writeDeterministicZip,
} from "../pass4826/release-package-contract.mjs";

export const RUNTIME_MANIFEST_SCHEMA = "velmere.runtime-bundle-manifest.v2";
export const RUNTIME_RECEIPT_SCHEMA = "velmere.runtime-bundle-receipt.v2";
export const RUNTIME_VERIFICATION_SCHEMA = "velmere.runtime-bundle-verification.v2";

const posix = (value) => value.split(path.sep).join("/");
const lexical = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

export function readPolicy(root = process.cwd()) {
  const policyPath = path.join(root, "config/runtime-bundle-policy.json");
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  if (policy.schemaVersion !== "velmere.runtime-bundle-policy.v1") {
    throw new Error("runtime_bundle_policy_schema_mismatch");
  }
  normalizeArchivePath(policy.manifestPath);
  for (const entry of policy.includedExactPaths ?? []) normalizeArchivePath(entry);
  for (const entry of policy.includedDirectoryPrefixes ?? []) {
    if (!entry.endsWith("/")) throw new Error(`runtime_bundle_policy_directory_prefix_invalid:${entry}`);
    normalizeArchivePath(entry.slice(0, -1));
  }
  for (const entry of policy.excludedExactPaths ?? []) normalizeArchivePath(entry);
  for (const entry of policy.proofPlaneForbiddenExactPaths ?? []) normalizeArchivePath(entry);
  for (const entry of policy.excludedDirectoryPrefixes ?? []) {
    if (!entry.endsWith("/")) throw new Error(`runtime_bundle_policy_directory_prefix_invalid:${entry}`);
    normalizeArchivePath(entry.slice(0, -1));
  }
  for (const entry of policy.proofPlaneForbiddenPrefixes ?? []) {
    normalizeArchivePath(entry.replace(/\/+$/u, ""));
  }
  return { ...policy, policyPath };
}

export function isIncluded(relativePath, policy) {
  const normalized = posix(relativePath).replace(/^\.\//u, "");
  if (!normalized) return false;
  const exact = new Set((policy.includedExactPaths ?? []).map((value) => posix(value)));
  if (exact.has(normalized)) return true;
  return (policy.includedDirectoryPrefixes ?? []).some((prefix) => (
    normalized.startsWith(posix(prefix))
  ));
}

function mayContainIncluded(relativeDirectory, policy) {
  const normalized = `${posix(relativeDirectory).replace(/\/+$/u, "")}/`;
  return (policy.includedDirectoryPrefixes ?? []).some((prefix) => {
    const candidate = posix(prefix);
    return normalized.startsWith(candidate) || candidate.startsWith(normalized);
  }) || (policy.includedExactPaths ?? []).some((entry) => posix(entry).startsWith(normalized));
}

function isProofPlanePath(relativePath, policy) {
  const normalized = posix(relativePath).replace(/^\.\//u, "");
  const exact = new Set((policy.proofPlaneForbiddenExactPaths ?? []).map((value) => posix(value)));
  if (exact.has(normalized)) return true;
  return (policy.proofPlaneForbiddenPrefixes ?? []).some((prefix) => (
    normalized === posix(prefix).replace(/\/+$/u, "") || normalized.startsWith(posix(prefix))
  ));
}

function parseArchiveJson(byPath, entryPath, errorCode) {
  const entry = byPath.get(entryPath);
  if (!entry) throw new Error(`${errorCode}_missing`);
  try {
    return JSON.parse(entry.content.toString("utf8"));
  } catch {
    throw new Error(`${errorCode}_invalid_json`);
  }
}

function staticImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

function withoutComments(source) {
  let output = "";
  let state = "code";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === "line") {
      if (character === "\n") {
        output += character;
        state = "code";
      } else output += " ";
      continue;
    }
    if (state === "block") {
      if (character === "*" && next === "/") {
        output += "  ";
        index += 1;
        state = "code";
      } else output += character === "\n" ? "\n" : " ";
      continue;
    }
    if (state !== "code") {
      output += character;
      if (character === "\\") {
        if (next !== undefined) {
          output += next;
          index += 1;
        }
      } else if ((state === "single" && character === "'")
        || (state === "double" && character === '"')
        || (state === "template" && character === "`")) state = "code";
      continue;
    }
    if (character === "/" && next === "/") {
      output += "  ";
      index += 1;
      state = "line";
    } else if (character === "/" && next === "*") {
      output += "  ";
      index += 1;
      state = "block";
    } else {
      output += character;
      if (character === "'") state = "single";
      else if (character === '"') state = "double";
      else if (character === "`") state = "template";
    }
  }
  return output;
}

function resolveArchiveLocalImport(specifier, importer, byPath) {
  let base;
  if (specifier.startsWith("@/") || specifier.startsWith("~/")) base = specifier.slice(2);
  else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  } else {
    return { external: true, resolved: null };
  }
  if (!base || base === ".." || base.startsWith("../")) return { external: false, resolved: null };
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];
  const candidates = [base];
  const declaredExtension = path.posix.extname(base);
  if (!extensions.includes(declaredExtension)) {
    for (const extension of extensions) candidates.push(`${base}${extension}`);
    for (const extension of extensions) candidates.push(`${base}/index${extension}`);
  } else if (base.endsWith(".js")) {
    candidates.push(`${base.slice(0, -3)}.ts`, `${base.slice(0, -3)}.tsx`);
  }
  return { external: false, resolved: candidates.find((candidate) => byPath.has(candidate)) ?? null };
}

function validateRuntimeDeploymentClosure(byPath) {
  const packageJson = parseArchiveJson(byPath, "package.json", "runtime_bundle_package_json");
  const vercel = parseArchiveJson(byPath, "vercel.json", "runtime_bundle_vercel_json");
  const scripts = packageJson.scripts ?? {};
  if (vercel.installCommand !== "corepack npm ci --engine-strict=true --strict-allow-scripts=true --ignore-scripts=false --no-audit --no-fund --progress=false") {
    throw new Error("runtime_bundle_install_command_not_fail_closed");
  }
  if (vercel.buildCommand !== "corepack npm run build:deployment") throw new Error("runtime_bundle_build_command_mismatch");

  const pending = ["preinstall", "build", "build:deployment", "start"];
  const visited = new Set();
  const localNodeTargets = new Set();
  while (pending.length > 0) {
    const scriptName = pending.shift();
    if (visited.has(scriptName)) continue;
    const command = scripts[scriptName];
    if (typeof command !== "string" || command.trim() === "") {
      throw new Error(`runtime_bundle_required_package_script_missing:${scriptName}`);
    }
    visited.add(scriptName);
    if (/(?:^|[\s;&|])(?:artifacts|config|db|docs|evaluation|fixtures|supabase|tests)\//u.test(command)
      || /scripts\/pass/u.test(command)) {
      throw new Error(`runtime_bundle_active_script_references_proof_plane:${scriptName}`);
    }
    for (const match of command.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:._-]+)/gu)) pending.push(match[1]);
    for (const match of command.matchAll(/\bnode\s+(?:(?:--[^\s;&|]+)\s+)*([^\s;&|]+)/gu)) {
      const target = match[1].replace(/^["']|["']$/gu, "");
      if (target.startsWith("-") || target.startsWith("node:")) continue;
      localNodeTargets.add(target.replace(/^\.\//u, ""));
    }
  }
  for (const target of localNodeTargets) {
    if (!byPath.has(target)) throw new Error(`runtime_bundle_active_script_target_missing:${target}`);
  }

  const sourceEntries = [...byPath.values()].filter((entry) => /\.(?:[cm]?[jt]sx?)$/u.test(entry.path));
  const unresolved = [];
  let localImportCount = 0;
  let frameworkGeneratedImportCount = 0;
  for (const entry of sourceEntries) {
    const source = withoutComments(entry.content.toString("utf8"));
    for (const specifier of staticImportSpecifiers(source)) {
      if (entry.path === "next-env.d.ts" && specifier.startsWith("./.next/")) {
        frameworkGeneratedImportCount += 1;
        continue;
      }
      const resolution = resolveArchiveLocalImport(specifier, entry.path, byPath);
      if (resolution.external) continue;
      localImportCount += 1;
      if (!resolution.resolved) unresolved.push({ importer: entry.path, specifier });
    }
  }
  if (unresolved.length > 0) {
    const first = unresolved[0];
    throw new Error(`runtime_bundle_local_import_unresolved:${first.importer}:${first.specifier}`);
  }
  return {
    installCommand: vercel.installCommand,
    buildCommand: vercel.buildCommand,
    activePackageScripts: [...visited].sort(lexical),
    localNodeTargets: [...localNodeTargets].sort(lexical),
    scannedSourceFileCount: sourceEntries.length,
    resolvedLocalImportCount: localImportCount,
    frameworkGeneratedImportCount,
    unresolvedLocalImportCount: 0,
  };
}

export function isExcluded(relativePath, policy, extraExcludedPaths = []) {
  const normalized = posix(relativePath).replace(/^\.\//u, "");
  if (!normalized) return false;
  const exact = new Set([...(policy.excludedExactPaths ?? []), ...extraExcludedPaths].map((value) => posix(value)));
  if (exact.has(normalized)) return true;
  return (policy.excludedDirectoryPrefixes ?? []).some((prefix) => {
    const normalizedPrefix = posix(prefix).replace(/\/+$/u, "") + "/";
    return `${normalized}/`.startsWith(normalizedPrefix);
  });
}

export function collectRuntimeInventory(root, { extraExcludedPaths = [] } = {}) {
  const absoluteRoot = path.resolve(root);
  const policy = readPolicy(absoluteRoot);
  const included = [];
  const excluded = [];

  function walk(directory, prefix = "") {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => lexical(a.name, b.name));
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const metadata = fs.lstatSync(absolute);
      if (metadata.isSymbolicLink()) throw new Error(`runtime_bundle_symlink_forbidden:${relative}`);
      if (isExcluded(relative, policy, extraExcludedPaths) || relative === policy.manifestPath) {
        excluded.push({ path: relative, type: entry.isDirectory() ? "directory" : "file" });
        continue;
      }
      if (entry.isDirectory()) {
        if (!mayContainIncluded(relative, policy)) {
          excluded.push({ path: relative, type: "directory" });
          continue;
        }
        walk(absolute, relative);
        continue;
      }
      if (!entry.isFile()) throw new Error(`runtime_bundle_special_file_forbidden:${relative}`);
      if (!isIncluded(relative, policy)) {
        excluded.push({ path: relative, type: "file" });
        continue;
      }
      normalizeArchivePath(relative);
      const content = fs.readFileSync(absolute);
      included.push({
        path: relative,
        content,
        byteLength: content.length,
        sha256: sha256(content),
        mode: (metadata.mode & 0o111) === 0 ? 0o100644 : 0o100755,
      });
    }
  }

  walk(absoluteRoot);
  included.sort((a, b) => lexical(a.path, b.path));
  excluded.sort((a, b) => lexical(a.path, b.path));

  for (const required of policy.requiredPaths ?? []) {
    const absolute = path.join(absoluteRoot, required);
    if (!fs.existsSync(absolute)) throw new Error(`runtime_bundle_required_path_missing:${required}`);
    if (isExcluded(required, policy, extraExcludedPaths)) throw new Error(`runtime_bundle_required_path_excluded:${required}`);
    if (!isIncluded(required, policy) && !mayContainIncluded(required, policy)) {
      throw new Error(`runtime_bundle_required_path_not_allowlisted:${required}`);
    }
  }

  const descriptors = included.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({
    path: entryPath,
    byteLength,
    sha256: digest,
    mode,
  }));
  return {
    root: absoluteRoot,
    policy,
    included,
    excluded,
    fileCount: included.length,
    byteLength: included.reduce((sum, entry) => sum + entry.byteLength, 0),
    pathSetSha256: sha256(descriptors.map(({ path: entryPath }) => entryPath).join("\n")),
    aggregateSha256: sha256(canonicalJson(descriptors)),
    descriptors,
  };
}

export function buildRuntimeManifest(inventory) {
  const excludedByTopLevel = {};
  for (const entry of inventory.excluded) {
    const key = entry.path.split("/")[0];
    excludedByTopLevel[key] = (excludedByTopLevel[key] ?? 0) + 1;
  }
  const policyDefinedProofPlanePhysicallyAbsent = inventory.descriptors.every((entry) => (
    !isProofPlanePath(entry.path, inventory.policy)
  ));
  if (!policyDefinedProofPlanePhysicallyAbsent) throw new Error("runtime_bundle_proof_plane_path_present");
  const core = {
    schemaVersion: RUNTIME_MANIFEST_SCHEMA,
    profile: inventory.policy.profile,
    manifestPath: inventory.policy.manifestPath,
    normalizedArchiveTimestamp: "1980-01-01T00:00:00.000Z",
    payload: {
      fileCount: inventory.fileCount,
      byteLength: inventory.byteLength,
      pathSetSha256: inventory.pathSetSha256,
      aggregateSha256: inventory.aggregateSha256,
      entries: inventory.descriptors,
    },
    exclusionPolicy: {
      policySchemaVersion: inventory.policy.schemaVersion,
      defaultDeny: true,
      includedDirectoryPrefixes: inventory.policy.includedDirectoryPrefixes,
      includedExactPaths: inventory.policy.includedExactPaths,
      excludedDirectoryPrefixes: inventory.policy.excludedDirectoryPrefixes,
      excludedExactPaths: inventory.policy.excludedExactPaths,
      excludedObservedCount: inventory.excluded.length,
      excludedObservedByTopLevel: Object.fromEntries(Object.entries(excludedByTopLevel).sort(([a], [b]) => lexical(a, b))),
      proofPlaneForbiddenPrefixes: inventory.policy.proofPlaneForbiddenPrefixes,
      proofPlaneForbiddenExactPaths: inventory.policy.proofPlaneForbiddenExactPaths,
      policyDefinedProofPlanePhysicallyAbsent,
      proofPlaneClaimScope: "explicit_forbidden_prefixes_and_exact_paths_only",
    },
    limitations: [
      "This is a deployment-source bundle, not the complete audit/evidence archive.",
      "The physical-absence claim covers explicit release/test/fixture/proof paths. Active product modules may retain historical pass, evidence or receipt terminology until a separate domain refactor removes that naming debt.",
      "The bundle proves deterministic local packaging and path separation; it does not prove LIVE provider, payment, KMS or production behavior.",
    ],
  };
  return { ...core, manifestSha256: sha256(canonicalJson(core)) };
}

export function createRuntimeArchive(root, archivePath, { overwrite = false, extraExcludedPaths = [] } = {}) {
  const inventory = collectRuntimeInventory(root, { extraExcludedPaths });
  const manifest = buildRuntimeManifest(inventory);
  const entries = inventory.included.map(({ path: entryPath, content, mode }) => ({ path: entryPath, content, mode }));
  entries.push({
    path: inventory.policy.manifestPath,
    content: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    mode: 0o100644,
  });
  entries.sort((a, b) => lexical(a.path, b.path));
  const archive = writeDeterministicZip(archivePath, entries, { overwrite });
  return { inventory, manifest, archive };
}

function assertDigest(value, code) {
  if (!/^[a-f0-9]{64}$/u.test(String(value ?? ""))) throw new Error(code);
}

export function verifyRuntimeArchive(archivePath, { policyRoot = process.cwd() } = {}) {
  const parsed = parseDeterministicZip(archivePath);
  const policy = readPolicy(policyRoot);
  const byPath = new Map(parsed.entries.map((entry) => [entry.path, entry]));
  const manifestEntry = byPath.get(policy.manifestPath);
  if (!manifestEntry) throw new Error("runtime_bundle_manifest_missing");
  let manifest;
  try { manifest = JSON.parse(manifestEntry.content.toString("utf8")); }
  catch { throw new Error("runtime_bundle_manifest_invalid_json"); }
  if (manifest.schemaVersion !== RUNTIME_MANIFEST_SCHEMA) throw new Error("runtime_bundle_manifest_schema_mismatch");
  assertDigest(manifest.manifestSha256, "runtime_bundle_manifest_digest_invalid");
  const manifestCore = { ...manifest };
  delete manifestCore.manifestSha256;
  if (manifest.manifestSha256 !== sha256(canonicalJson(manifestCore))) throw new Error("runtime_bundle_manifest_digest_mismatch");

  const payloadEntries = parsed.entries.filter((entry) => entry.path !== policy.manifestPath);
  const descriptors = payloadEntries.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({
    path: entryPath,
    byteLength,
    sha256: digest,
    mode,
  }));
  const expectedPaths = manifest.payload.entries.map((entry) => entry.path);
  const actualPaths = descriptors.map((entry) => entry.path);
  if (JSON.stringify(expectedPaths) !== JSON.stringify(actualPaths)) throw new Error("runtime_bundle_payload_path_set_mismatch");
  if (manifest.payload.fileCount !== descriptors.length) throw new Error("runtime_bundle_payload_file_count_mismatch");
  if (manifest.payload.byteLength !== descriptors.reduce((sum, entry) => sum + entry.byteLength, 0)) throw new Error("runtime_bundle_payload_byte_length_mismatch");
  if (manifest.payload.pathSetSha256 !== sha256(actualPaths.join("\n"))) throw new Error("runtime_bundle_payload_path_digest_mismatch");
  if (manifest.payload.aggregateSha256 !== sha256(canonicalJson(descriptors))) throw new Error("runtime_bundle_payload_aggregate_mismatch");
  for (const entry of descriptors) {
    if (isExcluded(entry.path, policy)) throw new Error(`runtime_bundle_excluded_path_present:${entry.path}`);
    if (!isIncluded(entry.path, policy)) throw new Error(`runtime_bundle_non_allowlisted_path_present:${entry.path}`);
    if (isProofPlanePath(entry.path, policy)) throw new Error(`runtime_bundle_proof_plane_path_present:${entry.path}`);
  }
  for (const required of policy.requiredPaths ?? []) {
    const present = actualPaths.includes(required) || actualPaths.some((entryPath) => entryPath.startsWith(`${required}/`));
    if (!present) throw new Error(`runtime_bundle_required_path_absent:${required}`);
  }
  const currentInventory = collectRuntimeInventory(policyRoot);
  if (manifest.payload.pathSetSha256 !== currentInventory.pathSetSha256) {
    throw new Error("runtime_bundle_current_source_path_set_mismatch");
  }
  if (manifest.payload.aggregateSha256 !== currentInventory.aggregateSha256) {
    throw new Error("runtime_bundle_current_source_aggregate_mismatch");
  }
  if (JSON.stringify(descriptors) !== JSON.stringify(currentInventory.descriptors)) {
    throw new Error("runtime_bundle_current_source_payload_mismatch");
  }
  const deploymentClosure = validateRuntimeDeploymentClosure(byPath);
  return {
    status: "PASS",
    archiveSha256: parsed.archiveSha256,
    archiveByteLength: parsed.byteLength,
    archiveEntryCount: parsed.entries.length,
    payloadFileCount: descriptors.length,
    payloadByteLength: descriptors.reduce((sum, entry) => sum + entry.byteLength, 0),
    payloadAggregateSha256: manifest.payload.aggregateSha256,
    currentSourceBinding: {
      bound: true,
      policyRootClass: "current_repository_root",
      fileCount: currentInventory.fileCount,
      byteLength: currentInventory.byteLength,
      pathSetSha256: currentInventory.pathSetSha256,
      aggregateSha256: currentInventory.aggregateSha256,
    },
    manifestSha256: manifest.manifestSha256,
    deploymentClosure,
    manifest,
  };
}

export function receiptSha256(core) {
  return crypto.createHash("sha256").update(canonicalJson(core)).digest("hex");
}
