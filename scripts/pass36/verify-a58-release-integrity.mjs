#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { canonicalSourceMode, loadSourceModePolicy, validateObservedSourceMode } from "./source-mode-policy.mjs";
import {
  INVALID_A58_POLICY_PROFILE,
  LEGACY_A58_POLICY_PROFILE,
  R44P46_A58_POLICY_PROFILE,
  a58PolicyRouterProfile,
  isR44P46A58Policy,
  verifyR44P46A58,
} from "./r44p46-a58-release-integrity-lib.mjs";

const root = path.resolve(process.cwd());
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a58-release-integrity-policy.json"), "utf8"));
const policyProfile = a58PolicyRouterProfile(policy);
if (policyProfile === R44P46_A58_POLICY_PROFILE && isR44P46A58Policy(policy)) {
  const result = verifyR44P46A58(root, policy);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}
if (policyProfile !== LEGACY_A58_POLICY_PROFILE) {
  if (policyProfile !== INVALID_A58_POLICY_PROFILE) {
    throw new Error("a58_policy_profile_unknown");
  }
  throw new Error("a58_policy_profile_invalid_or_partial");
}
const modePolicy = loadSourceModePolicy(root, policy.crossPlatformSourceModePolicyPath);
const checks = [];
const add = (id, ok, detail = null, blocking = true) => checks.push({ id, ok: Boolean(ok), blocking, detail });
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const parseJsonOrNull = (value) => {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};
const fileState = (relative) => {
  try {
    const bytes = fs.readFileSync(path.join(root, relative));
    return { present: true, bytes: bytes.length, sha256: sha256(bytes) };
  } catch { return { present: false, bytes: null, sha256: null }; }
};
const DIGEST = /^[a-f0-9]{64}$/u;
const rawCompare = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, expected) =>
  isRecord(value) &&
  JSON.stringify(Object.keys(value).sort(rawCompare)) ===
    JSON.stringify([...expected].sort(rawCompare));
const pathHasNoControlCharacters = (value) =>
  [...value].every((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint >= 0x20 && codePoint !== 0x7f;
  });
const portableArchivePath = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !value.includes("\\") &&
  !value.includes("\0") &&
  !value.startsWith("/") &&
  !/^[a-z]:/iu.test(value) &&
  pathHasNoControlCharacters(value) &&
  value.split("/").every((segment) =>
    segment.length > 0 && segment !== "." && segment !== "..");
const caseFoldKey = (value) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replaceAll("ß", "ss")
    .replaceAll("ς", "σ");
const separatorKey = (value) =>
  value.replaceAll("\\", "/").replace(/\/+/gu, "/");
const collisionSummary = (paths, keyFor) => {
  const seen = new Map();
  const collisions = [];
  for (const entryPath of paths) {
    const key = keyFor(entryPath);
    const prior = seen.get(key);
    if (prior !== undefined) {
      collisions.push({ first: prior, second: entryPath, key });
    } else {
      seen.set(key, entryPath);
    }
  }
  return {
    unique: collisions.length === 0,
    collisions: collisions.slice(0, 30),
  };
};
const aggregateForEntries = (entries) =>
  sha256(
    entries
      .map(
        (entry) =>
          `${entry.path}\0${entry.byteLength}\0${entry.sha256}\0${entry.mode}`,
      )
      .join("\n"),
  );
const collectArchiveRows = (sourceRoot, archiveManifestPath, sourceModePolicy, platform = process.platform) => {
  const rows = [];
  const rejected = [];
  const ignoredTop = new Set([
    ".git",
    ".velmere",
    ".turbo",
    "_velmere",
    "artifacts",
    "node_modules",
    ".next",
    ".cache",
    "cache",
    "coverage",
    "dist",
    "out",
  ]);
  function walk(directory, prefix = "") {
    const directoryEntries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => rawCompare(left.name, right.name));
    for (const entry of directoryEntries) {
      if (!prefix && (ignoredTop.has(entry.name) || entry.name.startsWith(".next-"))) continue;
      const relative = prefix
        ? `${prefix}/${entry.name}`
        : entry.name;
      if (
        relative === archiveManifestPath ||
        relative.startsWith("artifacts/pass35/a57/runs/") ||
        relative === "artifacts/pass35/a57/.a57.lock"
      ) {
        continue;
      }
      const absolute = path.join(directory, entry.name);
      const metadata = fs.lstatSync(absolute);
      if (metadata.isSymbolicLink()) {
        rejected.push({ path: relative, reason: "symlink_forbidden" });
        continue;
      }
      if (metadata.isDirectory()) {
        walk(absolute, relative);
        continue;
      }
      if (!metadata.isFile()) {
        rejected.push({ path: relative, reason: "special_file_forbidden" });
        continue;
      }
      try {
        validateObservedSourceMode(relative, metadata, sourceModePolicy, platform);
      } catch (error) {
        rejected.push({
          path: relative,
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      const bytes = fs.readFileSync(absolute);
      rows.push({
        path: relative,
        byteLength: bytes.length,
        sha256: sha256(bytes),
        mode: canonicalSourceMode(relative, sourceModePolicy),
      });
    }
  }
  walk(sourceRoot);
  rows.sort((left, right) => rawCompare(left.path, right.path));
  return { rows, rejected };
};

const current = readJson("config/pass35/current-revision.json");
const authority = readJson("config/pass36/current-release-authority.json");
const activePass = fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim();
const currentCheckpointMode =
  current.sourceRevisionId === policy.currentCheckpointRevisionId;
add("release-integrity-revision-a58", current.releaseIntegrityRevisionId === policy.revisionId, current.releaseIntegrityRevisionId);
add("current-source-authority", current.sourceRevisionId === authority.currentSource?.revisionId && current.sourceRevisionId === authority.authorityRevisionId && activePass === current.sourceRevisionId, { current: current.sourceRevisionId, authority: authority.currentSource?.revisionId, authorityRevisionId: authority.authorityRevisionId, activePass });
add("acceptance-remains-a57", current.activeAcceptanceRevisionId === policy.activeAcceptanceRevisionId, current.activeAcceptanceRevisionId);
add(
  "current-action-required-checkpoint",
  currentCheckpointMode &&
    authority.parentRevisionId === policy.currentCheckpointParentRevisionId &&
    authority.claims?.checkpointClass === "ACTION_REQUIRED_NON_PASS" &&
    authority.claims?.decision === "NO_GO",
  {
    currentCheckpointMode,
    current: current.sourceRevisionId,
    parent: authority.parentRevisionId,
    checkpointClass: authority.claims?.checkpointClass,
    decision: authority.claims?.decision,
  },
);
add(
  "cross-platform-source-mode-policy",
  modePolicy.revisionId === policy.currentCheckpointRevisionId
    && modePolicy.parentRevisionId === policy.currentCheckpointParentRevisionId
    && modePolicy.modeAuthority === "EXACT_PATH_ALLOWLIST"
    && modePolicy.windowsFilesystemModeIsAuthority === false
    && modePolicy.posixFilesystemModeIsAuthority === true
    && modePolicy.processExecPathRequired === true
    && modePolicy.shellFalseRequired === true
    && modePolicy.executablePaths.size === policy.crossPlatformExecutablePathCount,
  {
    revisionId: modePolicy.revisionId,
    parentRevisionId: modePolicy.parentRevisionId,
    executablePaths: modePolicy.executablePaths.size,
    platform: process.platform,
  },
);

add(
  "promotion-remains-disabled",
  current.saleEnabled === false &&
    current.liveProven === false &&
    authority.claims?.saleEnabled === false &&
    authority.claims?.liveProven === false &&
    authority.claims?.productionApproved === false &&
    authority.claims?.worldClassProven === false,
  {
    saleEnabled: current.saleEnabled,
    liveProven: current.liveProven,
    authorityClaims: authority.claims,
  },
);

const currentVerify = spawnSync(
  process.execPath,
  [policy.currentAuthorityVerifierPath],
  { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);
const currentVerifyResult = parseJsonOrNull(currentVerify.stdout);
add(
  "current-checkpoint-authority-and-descendant-verifies",
  currentVerify.status === 0 &&
    currentVerifyResult?.status ===
      policy.currentAuthorityVerifierExpectedStatus &&
    currentVerifyResult?.globalDecision === "NO_GO" &&
    currentVerifyResult?.live === false &&
    currentVerifyResult?.saleEnabled === false &&
    currentVerifyResult?.productionApproved === false,
  {
    exitCode: currentVerify.status,
    status: currentVerifyResult?.status ?? null,
    failed: currentVerifyResult?.failed ?? null,
    stderr: currentVerify.stderr?.slice(-1000),
  },
);

const a57Verify = spawnSync(process.execPath, ["scripts/pass35/verify-a57-source-manifest.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const a57Result = parseJsonOrNull(a57Verify.stdout);
add(
  "a57-historical-manifest-verifies",
  a57Verify.status === 0 && a57Result?.status === "PASS",
  {
    exitCode: a57Verify.status,
    result: a57Result,
    stderr: a57Verify.stderr?.slice(-1000),
    currentSourceCreditGranted: false,
  },
  !currentCheckpointMode,
);
const a57 = readJson(policy.a57ManifestPath);
const a57Paths = new Set((a57.files ?? []).map((row) => row.path));
for (const legacy of policy.removedLegacySupplements) {
  add(
    `historical-a57-legacy-supplement-removed:${legacy}`,
    !a57Paths.has(legacy),
    fileState(legacy),
    !currentCheckpointMode,
  );
}
for (const currentSupplement of policy.currentA57Supplements) {
  add(
    `historical-a57-current-supplement-bound:${currentSupplement}`,
    a57Paths.has(currentSupplement) && fileState(currentSupplement).present,
    {
      ...fileState(currentSupplement),
      currentSourceCreditGranted: false,
    },
    !currentCheckpointMode,
  );
}

const archiveManifestAbsolute = path.join(root, policy.archiveManifestPath);
if (fs.existsSync(archiveManifestAbsolute)) {
  const archiveManifestMetadata = fs.lstatSync(archiveManifestAbsolute);
  add(
    "archive-manifest-regular-file",
    archiveManifestMetadata.isFile() &&
      !archiveManifestMetadata.isSymbolicLink(),
    {
      isFile: archiveManifestMetadata.isFile(),
      isSymbolicLink: archiveManifestMetadata.isSymbolicLink(),
    },
  );
  let manifest = null;
  let manifestParseError = null;
  try {
    manifest = JSON.parse(
      fs.readFileSync(archiveManifestAbsolute, "utf8"),
    );
  } catch (error) {
    manifestParseError =
      error instanceof Error ? error.message : String(error);
  }
  add(
    "archive-manifest-json-object",
    isRecord(manifest),
    manifestParseError,
  );

  const contract = policy.archiveManifestContract;
  const expectedManifestKeys = [
    "schemaVersion",
    "revisionId",
    "parentRevisionId",
    "normalizedTimestamp",
    "fileCount",
    "byteLength",
    "pathSetSha256",
    "aggregateSha256",
    "entries",
    "manifestPath",
    "manifestExcludedFromOwnInventory",
    "checkpointClass",
    "completedThrough",
    contract.passCreditField,
    "exactReleaseCredit",
    "globalDecision",
    "live",
    "saleEnabled",
    "productionApproved",
    "worldClassProven",
    "manifestSha256",
  ];
  add(
    "archive-manifest-top-level-fields",
    exactKeys(manifest, expectedManifestKeys),
    isRecord(manifest) ? Object.keys(manifest) : null,
  );
  add(
    "archive-manifest-schema",
    manifest?.schemaVersion === contract.schemaVersion,
    manifest?.schemaVersion ?? null,
  );
  add(
    "archive-manifest-revision",
    manifest?.revisionId === policy.currentCheckpointRevisionId,
    manifest?.revisionId ?? null,
  );
  add(
    "archive-manifest-parent",
    manifest?.parentRevisionId ===
      policy.currentCheckpointParentRevisionId,
    manifest?.parentRevisionId ?? null,
  );
  add(
    "archive-manifest-path",
    manifest?.manifestPath === policy.archiveManifestPath &&
      manifest?.manifestExcludedFromOwnInventory === true,
    {
      manifestPath: manifest?.manifestPath ?? null,
      manifestExcludedFromOwnInventory:
        manifest?.manifestExcludedFromOwnInventory ?? null,
    },
  );
  add(
    "archive-manifest-normalized-timestamp",
    manifest?.normalizedTimestamp === contract.normalizedTimestamp,
    manifest?.normalizedTimestamp ?? null,
  );
  add(
    "archive-manifest-action-required",
    manifest?.checkpointClass === contract.checkpointClass &&
      manifest?.completedThrough === contract.completedThrough,
    {
      checkpointClass: manifest?.checkpointClass ?? null,
      completedThrough: manifest?.completedThrough ?? null,
    },
  );
  add(
    "archive-manifest-no-credit-truth",
    manifest?.[contract.passCreditField] === false &&
      manifest?.exactReleaseCredit === false &&
      manifest?.globalDecision === "NO_GO" &&
      manifest?.live === false &&
      manifest?.saleEnabled === false &&
      manifest?.productionApproved === false &&
      manifest?.worldClassProven === false,
    {
      passCreditField: contract.passCreditField,
      passCreditValue: manifest?.[contract.passCreditField] ?? null,
      exactReleaseCredit: manifest?.exactReleaseCredit ?? null,
      globalDecision: manifest?.globalDecision ?? null,
      live: manifest?.live ?? null,
      saleEnabled: manifest?.saleEnabled ?? null,
      productionApproved: manifest?.productionApproved ?? null,
      worldClassProven: manifest?.worldClassProven ?? null,
    },
  );

  const manifestEntries = Array.isArray(manifest?.entries)
    ? manifest.entries
    : [];
  const allowedModes = new Set(contract.allowedFileModes);
  const expectedEntryKeys = [
    "path",
    "byteLength",
    "sha256",
    "mode",
  ];
  const entryShapeFailures = [];
  for (let index = 0; index < manifestEntries.length; index += 1) {
    const entry = manifestEntries[index];
    const fieldsValid =
      exactKeys(entry, expectedEntryKeys) &&
      portableArchivePath(entry.path) &&
      Number.isSafeInteger(entry.byteLength) &&
      entry.byteLength >= 0 &&
      typeof entry.sha256 === "string" &&
      DIGEST.test(entry.sha256) &&
      Number.isSafeInteger(entry.mode) &&
      allowedModes.has(entry.mode);
    if (!fieldsValid) {
      entryShapeFailures.push({
        index,
        entry,
      });
    }
  }
  const entryFieldsValid =
    Array.isArray(manifest?.entries) &&
    manifestEntries.length > 0 &&
    entryShapeFailures.length === 0;
  add(
    "archive-manifest-entry-fields-and-modes",
    entryFieldsValid,
    {
      entries: manifestEntries.length,
      failures: entryShapeFailures.slice(0, 30),
    },
  );

  const manifestPaths = manifestEntries
    .filter((entry) => typeof entry?.path === "string")
    .map((entry) => entry.path);
  const rawUniqueness = collisionSummary(
    manifestPaths,
    (entryPath) => entryPath,
  );
  const nfkcUniqueness = collisionSummary(
    manifestPaths,
    (entryPath) => entryPath.normalize("NFKC"),
  );
  const caseFoldUniqueness = collisionSummary(
    manifestPaths,
    caseFoldKey,
  );
  const separatorUniqueness = collisionSummary(
    manifestPaths,
    separatorKey,
  );
  add(
    "archive-manifest-paths-unique-raw",
    entryFieldsValid &&
      manifestPaths.length === manifestEntries.length &&
      rawUniqueness.unique,
    rawUniqueness,
  );
  add(
    "archive-manifest-paths-unique-nfkc",
    entryFieldsValid && nfkcUniqueness.unique,
    nfkcUniqueness,
  );
  add(
    "archive-manifest-paths-unique-casefold",
    entryFieldsValid && caseFoldUniqueness.unique,
    caseFoldUniqueness,
  );
  add(
    "archive-manifest-paths-unique-separator",
    entryFieldsValid && separatorUniqueness.unique,
    separatorUniqueness,
  );
  const rawCanonicalOrder =
    manifestPaths.length === manifestEntries.length &&
    manifestPaths.every(
      (entryPath, index) =>
        index === 0 ||
        rawCompare(manifestPaths[index - 1], entryPath) < 0,
    );
  add(
    "archive-manifest-raw-canonical-order",
    entryFieldsValid && rawCanonicalOrder,
    {
      firstOutOfOrderIndex: manifestPaths.findIndex(
        (entryPath, index) =>
          index > 0 &&
          rawCompare(manifestPaths[index - 1], entryPath) >= 0,
      ),
    },
  );
  add(
    "archive-manifest-self-excluded",
    entryFieldsValid &&
      !manifestPaths.includes(policy.archiveManifestPath),
    policy.archiveManifestPath,
  );

  let actualManifestSha256 = null;
  if (isRecord(manifest)) {
    const core = { ...manifest };
    delete core.manifestSha256;
    actualManifestSha256 = sha256(canonical(core));
  }
  add(
    "archive-manifest-self-hash",
    typeof manifest?.manifestSha256 === "string" &&
      DIGEST.test(manifest.manifestSha256) &&
      manifest.manifestSha256 === actualManifestSha256,
    {
      declared: manifest?.manifestSha256 ?? null,
      actual: actualManifestSha256,
    },
  );

  const internalFileCount =
    entryFieldsValid &&
    Number.isSafeInteger(manifest?.fileCount) &&
    manifest.fileCount > 0 &&
    manifest.fileCount === manifestEntries.length;
  add(
    "archive-manifest-count",
    internalFileCount,
    {
      declared: manifest?.fileCount ?? null,
      entries: manifestEntries.length,
    },
  );
  const internalByteLength = entryFieldsValid
    ? manifestEntries.reduce(
        (sum, entry) => sum + entry.byteLength,
        0,
      )
    : null;
  add(
    "archive-manifest-byte-total",
    entryFieldsValid &&
      Number.isSafeInteger(manifest?.byteLength) &&
      manifest.byteLength >= 0 &&
      manifest.byteLength === internalByteLength,
    {
      declared: manifest?.byteLength ?? null,
      observed: internalByteLength,
    },
  );
  const internalPathSetSha256 =
    entryFieldsValid && rawCanonicalOrder
      ? sha256(manifestPaths.join("\n"))
      : null;
  add(
    "archive-manifest-path-set",
    typeof manifest?.pathSetSha256 === "string" &&
      DIGEST.test(manifest.pathSetSha256) &&
      manifest.pathSetSha256 === internalPathSetSha256,
    {
      declared: manifest?.pathSetSha256 ?? null,
      observed: internalPathSetSha256,
    },
  );
  const internalAggregateSha256 =
    entryFieldsValid && rawCanonicalOrder
      ? aggregateForEntries(manifestEntries)
      : null;
  add(
    "archive-manifest-aggregate",
    typeof manifest?.aggregateSha256 === "string" &&
      DIGEST.test(manifest.aggregateSha256) &&
      manifest.aggregateSha256 === internalAggregateSha256,
    {
      declared: manifest?.aggregateSha256 ?? null,
      observed: internalAggregateSha256,
    },
  );

  const actualInventory = collectArchiveRows(
    root,
    policy.archiveManifestPath,
    modePolicy,
  );
  add(
    "archive-manifest-no-symlink-or-special-file",
    actualInventory.rejected.length === 0,
    actualInventory.rejected.slice(0, 30),
  );
  const actualRows = actualInventory.rows;
  const actualPaths = actualRows.map((entry) => entry.path);
  const actualPathSetSha256 = sha256(actualPaths.join("\n"));
  const actualAggregateSha256 = aggregateForEntries(actualRows);
  const actualByteLength = actualRows.reduce(
    (sum, entry) => sum + entry.byteLength,
    0,
  );
  const declared = new Map(
    manifestEntries
      .filter(
        (entry) =>
          isRecord(entry) && typeof entry.path === "string",
      )
      .map((entry) => [entry.path, entry]),
  );
  const missing = manifestPaths.filter(
    (entryPath) => !actualPaths.includes(entryPath),
  );
  const unexpected = actualPaths.filter(
    (entryPath) => !declared.has(entryPath),
  );
  const exactPhysicalPaths =
    entryFieldsValid &&
    rawCanonicalOrder &&
    rawUniqueness.unique &&
    missing.length === 0 &&
    unexpected.length === 0 &&
    manifestPaths.length === actualPaths.length &&
    manifestPaths.every(
      (entryPath, index) => entryPath === actualPaths[index],
    );
  add(
    "archive-manifest-exact-path-set",
    exactPhysicalPaths,
    {
      missing: missing.slice(0, 30),
      unexpected: unexpected.slice(0, 30),
      declared: manifestPaths.length,
      actual: actualPaths.length,
    },
  );
  add(
    "archive-manifest-physical-file-count",
    exactPhysicalPaths &&
      manifest.fileCount === actualRows.length,
    {
      declared: manifest?.fileCount ?? null,
      actual: actualRows.length,
    },
  );
  add(
    "archive-manifest-physical-byte-total",
    exactPhysicalPaths &&
      manifest.byteLength === actualByteLength,
    {
      declared: manifest?.byteLength ?? null,
      actual: actualByteLength,
    },
  );
  add(
    "archive-manifest-physical-path-set",
    exactPhysicalPaths &&
      manifest.pathSetSha256 === actualPathSetSha256,
    {
      declared: manifest?.pathSetSha256 ?? null,
      actual: actualPathSetSha256,
    },
  );
  add(
    "archive-manifest-physical-aggregate",
    exactPhysicalPaths &&
      manifest.aggregateSha256 === actualAggregateSha256,
    {
      declared: manifest?.aggregateSha256 ?? null,
      actual: actualAggregateSha256,
    },
  );
  let mismatches = 0;
  for (const actual of actualRows) {
    const expected = declared.get(actual.path);
    if (
      !expected ||
      expected.byteLength !== actual.byteLength ||
      expected.sha256 !== actual.sha256 ||
      expected.mode !== actual.mode
    ) {
      mismatches += 1;
    }
  }
  add(
    "archive-manifest-all-bytes",
    exactPhysicalPaths && mismatches === 0,
    { mismatches },
  );
} else {
  add("archive-manifest-present", false, policy.archiveManifestPath);
}

const historical = policy.historicalArtifactBlockers.map((expected) => ({ ...expected, observed: fileState(expected.path) }));
for (const entry of historical) add(`historical-exact-byte-recovery:${entry.path}`, entry.observed.present && entry.observed.bytes === entry.bytes && entry.observed.sha256 === entry.sha256, entry, false);

const buildReceiptArg = process.argv.indexOf("--build-receipt");
let buildBinding = { status: "NOT_SUPPLIED", exactFinalByteBound: false };
if (buildReceiptArg >= 0 && process.argv[buildReceiptArg + 1]) {
  const receiptPath = path.resolve(process.argv[buildReceiptArg + 1]);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  buildBinding = { status: receipt.status, exactFinalByteBound: false, sourceBefore: receipt.sourceBefore, runtime: { node: receipt.node, npm: receipt.npm }, receiptSha256: sha256(fs.readFileSync(receiptPath)) };
  add("prior-exact-build-valid", receipt.status === "PASS" && receipt.sourceImmutable === true && receipt.node === "v24.18.0" && receipt.npm === "11.16.0", buildBinding, false);
}

const blockingFailures = checks.filter((row) => row.blocking && !row.ok);
const historicalRecoveryComplete = historical.every((entry) => entry.observed.present && entry.observed.bytes === entry.bytes && entry.observed.sha256 === entry.sha256);
const result = {
  schemaVersion: "velmere.pass36.a58.release-integrity-verification.v1",
  revisionId: policy.revisionId,
  status: blockingFailures.length === 0 ? "PASS_RELEASE_INTEGRITY_NO_PROMOTION" : "FAIL_RELEASE_INTEGRITY",
  promotionAllowed: false,
  productionApproved: false,
  exactFinalByteBuildExecuted: false,
  historicalArtifactRecoveryComplete: historicalRecoveryComplete,
  buildBinding,
  summary: { checks: checks.length, passed: checks.filter((row) => row.ok).length, failed: checks.filter((row) => !row.ok).length, blockingFailed: blockingFailures.length },
  checks,
  blockers: [
    ...(!historicalRecoveryComplete ? ["EXACT_HISTORICAL_BYTES_NOT_RECOVERED"] : []),
    "EXACT_NODE_24_18_FINAL_BYTE_BUILD_NOT_REPEATED",
    "CRITICAL_OFFLINE_GATE_NOT_30_OF_30",
    "REAL_STAGING_EXTERNAL_PROVIDER_CUSTOMER_EVIDENCE_MISSING"
  ],
  saleEnabled: false,
  liveProven: false,
  worldClassProven: false,
  truthBoundary: policy.truthBoundary
};
console.log(JSON.stringify(result, null, 2));
if (blockingFailures.length) process.exitCode = 1;
