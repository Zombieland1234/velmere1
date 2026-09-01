import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { PASS4666_PAGE_ALIAS_REDIRECTS } from "../../lib/security/page-alias-redirects.mjs";
import { buildPreflightFailureEvent } from "./failure-event.mjs";

export { createHash, fs, path };
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const pkgPath = path.join(root, "package.json");
export const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
let currentPhase = "bootstrap";
let currentGuardScope = "bootstrap.000";
let currentAuthoredGuardId = null;
const criticalGuardRegistryPath = path.join(root, "config", "preflight-critical-guard-ids.json");
const criticalGuardRegistry = JSON.parse(fs.readFileSync(criticalGuardRegistryPath, "utf8"));
const { registrySha256: criticalRegistrySha256, ...criticalRegistryUnsigned } = criticalGuardRegistry;
const computedCriticalRegistrySha256 = createHash("sha256").update(JSON.stringify(criticalRegistryUnsigned)).digest("hex");
if (criticalGuardRegistry.schemaVersion !== "velmere.preflight-critical-guard-id-registry.v1" || criticalRegistrySha256 !== computedCriticalRegistrySha256) {
  throw new Error("preflight_critical_guard_registry_integrity_failed");
}
const criticalGuardIds = new Map((criticalGuardRegistry.guards ?? []).map((entry) => [entry.guardScope, entry]));
const authoredAssertionRegistryPath = path.join(root, "config", "preflight-authored-assertion-ids.json");
const authoredAssertionRegistry = JSON.parse(fs.readFileSync(authoredAssertionRegistryPath, "utf8"));
const { registrySha256: authoredAssertionRegistrySha256, ...authoredAssertionRegistryUnsigned } = authoredAssertionRegistry;
const computedAuthoredAssertionRegistrySha256 = createHash("sha256").update(JSON.stringify(authoredAssertionRegistryUnsigned)).digest("hex");
if (authoredAssertionRegistry.schemaVersion !== "velmere.preflight-authored-assertion-registry.v1" || authoredAssertionRegistrySha256 !== computedAuthoredAssertionRegistrySha256) {
  throw new Error("preflight_authored_assertion_registry_integrity_failed");
}
const authoredGuardIds = new Map((authoredAssertionRegistry.guards ?? []).map((entry) => [entry.guardScope, entry]));
const authoredAssertionIds = new Map((authoredAssertionRegistry.assertions ?? []).map((entry) => [entry.authoredAssertionId, entry]));
const assertionPolicyPath = path.join(root, "config", "preflight-assertion-policy.json");
const assertionPolicyRegistry = JSON.parse(fs.readFileSync(assertionPolicyPath, "utf8"));
const { policySha256: assertionPolicySha256, ...assertionPolicyUnsigned } = assertionPolicyRegistry;
const computedAssertionPolicySha256 = createHash("sha256").update(JSON.stringify(assertionPolicyUnsigned)).digest("hex");
if (
  assertionPolicyRegistry.schemaVersion !== "velmere.preflight-assertion-policy.v1" ||
  assertionPolicySha256 !== computedAssertionPolicySha256 ||
  assertionPolicyRegistry.registrySha256 !== authoredAssertionRegistrySha256
) {
  throw new Error("preflight_assertion_policy_integrity_failed");
}
const assertionPolicies = new Map((assertionPolicyRegistry.assertions ?? []).map((entry) => [entry.authoredAssertionId, entry]));
if (assertionPolicies.size !== authoredAssertionIds.size) throw new Error("preflight_assertion_policy_coverage_failed");
const executedGuardScopes = [];
const executedAuthoredAssertions = [];
const guardFailureEvents = [];
const guardScopeExecutions = new Map();

export function setCurrentPhase(name) {
  currentPhase = String(name || "unknown-phase");
}

export function setGuardScope(scope) {
  currentGuardScope = String(scope || `${currentPhase}.unknown`);
  currentAuthoredGuardId = authoredGuardIds.get(currentGuardScope)?.authoredId ?? criticalGuardIds.get(currentGuardScope)?.authoredId ?? null;
  const count = (guardScopeExecutions.get(currentGuardScope) ?? 0) + 1;
  guardScopeExecutions.set(currentGuardScope, count);
  executedGuardScopes.push(currentGuardScope);
}

class GuardErrorList extends Array {
  pushWithId(authoredAssertionId, ...items) {
    const assertion = authoredAssertionIds.get(authoredAssertionId);
    if (!assertion || assertion.guardScope !== currentGuardScope || assertion.authoredScopeId !== currentAuthoredGuardId) {
      throw new Error(`preflight_authored_assertion_scope_mismatch:${authoredAssertionId}:${currentGuardScope}`);
    }
    executedAuthoredAssertions.push(authoredAssertionId);
    return this.record(authoredAssertionId, items);
  }

  push(...items) {
    return this.record(null, items);
  }

  record(authoredAssertionId, items) {
    for (const item of items) {
      const message = String(item);
      const policy = authoredAssertionId ? assertionPolicies.get(authoredAssertionId) : null;
      if (authoredAssertionId && !policy) throw new Error(`preflight_assertion_policy_missing:${authoredAssertionId}`);
      guardFailureEvents.push(buildPreflightFailureEvent({
        authoredAssertionId,
        authoredGuardId: currentAuthoredGuardId,
        phase: currentPhase,
        guardScope: currentGuardScope,
        message,
        policy,
      }));
      super.push(message);
    }
    return this.length;
  }
}

export const errors = new GuardErrorList();

const directReadFiles = new Set();
const scannedFiles = new Set();
const scannedRoots = new Set();
const readCache = new Map();
const walkCache = new Map();
let directReadCalls = 0;
let readCacheHits = 0;
let walkCalls = 0;
let walkCacheHits = 0;
const snapshotReadFiles = new Set();
let snapshotReadCalls = 0;
let snapshotValidationReadCount = 0;
let snapshotValidationBytes = 0;
let snapshotValidationCacheHits = 0;
let snapshotValidationStatCount = 0;
let snapshotValidationMode = "full";
let snapshotValidationCacheWritten = false;
let snapshotValidationCacheWriteSkipped = false;
const snapshotContents = new Map();
const snapshotSourceHashes = new Map();
let snapshotManifestSummary = null;
let snapshotArchivedSourceCount = 0;
const signedQuarantinedSources = new Map();
const signedQuarantineValidation = new Map();

function loadPreflightDomainSnapshots() {
  const manifestPath = path.join(root, "config", "preflight-domain-snapshot-manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error("preflight_domain_snapshot_manifest_missing");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const { manifestSha256, ...unsigned } = manifest;
  const computedManifestSha256 = createHash("sha256").update(JSON.stringify(unsigned)).digest("hex");
  if (manifest.schemaVersion !== "velmere.preflight-domain-snapshot-manifest.v1" || manifestSha256 !== computedManifestSha256) {
    throw new Error("preflight_domain_snapshot_manifest_integrity_failed");
  }

  const archivedSources = signedQuarantinedSources;
  archivedSources.clear();
  signedQuarantineValidation.clear();
  const quarantineRoot = path.join(root, ".velmere");
  const quarantineFiles = fs.existsSync(quarantineRoot)
    ? fs.readdirSync(quarantineRoot).filter((name) => /^orphan-quarantine-pass\d+\.json$/.test(name)).sort()
    : [];
  const safeQuarantinePath = (value) => typeof value === "string" && value.length > 0 && !value.includes("\\") && !value.includes("\0") &&
    !path.posix.isAbsolute(value) && path.posix.normalize(value) === value && value !== "." && value !== ".." &&
    !value.startsWith("../") && !value.includes("/../");
  for (const name of quarantineFiles) {
    const quarantinePath = path.join(quarantineRoot, name);
    const quarantine = JSON.parse(fs.readFileSync(quarantinePath, "utf8"));
    if (quarantine.schemaVersion === "velmere.pass6.preflight-snapshot-recovery.v1") {
      const { manifestSha256: quarantineManifestSha256, ...quarantineCore } = quarantine;
      const computedQuarantineManifestSha256 = createHash("sha256").update(JSON.stringify(quarantineCore)).digest("hex");
      if (quarantineManifestSha256 !== computedQuarantineManifestSha256) {
        throw new Error(`preflight_quarantine_manifest_integrity_failed:${name}`);
      }
      if (quarantine.sourceSnapshotManifestSha256 !== manifestSha256) {
        throw new Error(`preflight_quarantine_snapshot_binding_failed:${name}`);
      }
      if (quarantine.entryCount !== quarantine.entries?.length) {
        throw new Error(`preflight_quarantine_entry_count_failed:${name}`);
      }
      const recoveryAggregateSha256 = createHash("sha256").update((quarantine.entries ?? [])
        .map((entry) => `${entry.source}\0${entry.archive}\0${entry.bytes}\0${entry.sha256}`).join("\n")).digest("hex");
      if (recoveryAggregateSha256 !== quarantine.aggregateSha256) {
        throw new Error(`preflight_quarantine_aggregate_failed:${name}`);
      }
    }
    for (const item of quarantine.files ?? quarantine.entries ?? []) {
      if (!item?.source || !item?.archive || !item?.sha256) continue;
      if (!safeQuarantinePath(item.source) || !safeQuarantinePath(item.archive) || !/^[a-f0-9]{64}$/u.test(item.sha256)) {
        throw new Error(`preflight_quarantine_entry_invalid:${name}`);
      }
      if (quarantine.schemaVersion === "velmere.pass6.preflight-snapshot-recovery.v1" &&
        item.archive !== `.velmere/quarantine/pass6-domain-snapshot/${item.source}`) {
        throw new Error(`preflight_quarantine_archive_binding_failed:${item.source}`);
      }
      const existing = archivedSources.get(item.source);
      if (existing && existing.sha256 !== item.sha256) throw new Error(`preflight_quarantine_source_conflict:${item.source}`);
      archivedSources.set(item.source, item);
    }
  }

  const cachePath = path.resolve(root, process.env.VELMERE_PREFLIGHT_SNAPSHOT_CACHE_PATH || ".velmere/cache/preflight-snapshot-validation.json");
  const forceFull = process.env.VELMERE_PREFLIGHT_FULL_SNAPSHOT_VALIDATION === "1";
  let priorCache = null;
  if (!forceFull && fs.existsSync(cachePath)) {
    try {
      const candidate = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      const { cacheSha256, ...cacheUnsigned } = candidate;
      const computedCacheSha256 = createHash("sha256").update(JSON.stringify(cacheUnsigned)).digest("hex");
      if (
        candidate.schemaVersion === "velmere.preflight-snapshot-validation-cache.v1" &&
        candidate.manifestSha256 === manifestSha256 &&
        cacheSha256 === computedCacheSha256
      ) priorCache = candidate;
    } catch (ignoredError) { void ignoredError; }
  }
  snapshotValidationMode = priorCache ? "incremental-content-addressed" : "full";
  const priorEntries = new Map((priorCache?.entries ?? []).map((entry) => [entry.path, entry]));
  const nextEntries = [];
  const aggregate = [];
  const metadataFor = (stat) => ({
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: Number(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
  });
  const metadataMatches = (left, right) => left && right && left.dev === right.dev && left.ino === right.ino && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;

  for (const item of manifest.snapshots ?? []) {
    const compressed = fs.readFileSync(path.join(root, item.path));
    const compressedSha256 = createHash("sha256").update(compressed).digest("hex");
    if (compressedSha256 !== item.compressedSha256) throw new Error(`preflight_snapshot_compressed_hash_failed:${item.name}`);
    const raw = gunzipSync(compressed);
    const rawSha256 = createHash("sha256").update(raw).digest("hex");
    if (rawSha256 !== item.uncompressedSha256) throw new Error(`preflight_snapshot_payload_hash_failed:${item.name}`);
    const payload = JSON.parse(raw.toString("utf8"));
    const filesSha256 = createHash("sha256").update((payload.entries ?? []).map((entry) => `${entry.path}\0${entry.sha256}`).join("\n")).digest("hex");
    if (payload.schemaVersion !== "velmere.preflight-domain-snapshot.v1" || payload.fileCount !== item.fileCount || filesSha256 !== item.filesSha256) {
      throw new Error(`preflight_snapshot_catalog_integrity_failed:${item.name}`);
    }
    for (const entry of payload.entries ?? []) {
      if (snapshotContents.has(entry.path)) throw new Error(`preflight_snapshot_duplicate_path:${entry.path}`);
      const sourcePath = path.join(root, entry.path);
      const archived = archivedSources.get(entry.path);
      const archivedPath = archived ? path.join(root, archived.archive) : null;
      const resolvedSourcePath = fs.existsSync(sourcePath)
        ? sourcePath
        : archivedPath && fs.existsSync(archivedPath)
          ? archivedPath
          : sourcePath;
      if (resolvedSourcePath !== sourcePath) snapshotArchivedSourceCount += 1;
      const stat = fs.statSync(resolvedSourcePath, { bigint: true });
      snapshotValidationStatCount += 1;
      const metadata = metadataFor(stat);
      const cached = priorEntries.get(entry.path);
      let sourceSha256;
      if (!forceFull && cached?.sha256 === entry.sha256 && cached?.bytes === entry.bytes && metadataMatches(cached.metadata, metadata)) {
        sourceSha256 = cached.sha256;
        snapshotValidationCacheHits += 1;
      } else {
        const source = fs.readFileSync(resolvedSourcePath, "utf8");
        snapshotValidationReadCount += 1;
        snapshotValidationBytes += Buffer.byteLength(source);
        sourceSha256 = createHash("sha256").update(source).digest("hex");
        if (sourceSha256 !== entry.sha256 || Buffer.byteLength(source) !== entry.bytes) {
          throw new Error(`preflight_domain_snapshot_stale:${entry.path}`);
        }
      }
      nextEntries.push({ path: entry.path, bytes: entry.bytes, sha256: sourceSha256, metadata });
      snapshotContents.set(entry.path, entry.content);
      snapshotSourceHashes.set(entry.path, entry.sha256);
      aggregate.push(`${entry.path}\0${entry.sha256}`);
    }
  }
  aggregate.sort();
  const aggregateSha256 = createHash("sha256").update(aggregate.join("\n")).digest("hex");
  if (aggregateSha256 !== manifest.sourceAggregateSha256 || aggregate.length !== manifest.sourceFileCount) {
    throw new Error("preflight_domain_snapshot_aggregate_failed");
  }
  const canReuseCacheWithoutRewrite = Boolean(
    priorCache &&
    snapshotValidationReadCount === 0 &&
    snapshotValidationCacheHits === snapshotValidationStatCount &&
    priorCache.entryCount === nextEntries.length &&
    priorCache.sourceAggregateSha256 === manifest.sourceAggregateSha256
  );
  if (canReuseCacheWithoutRewrite) {
    snapshotValidationCacheWriteSkipped = true;
  } else {
    const cache = {
      schemaVersion: "velmere.preflight-snapshot-validation-cache.v1",
      generatedAt: new Date().toISOString(),
      manifestSha256,
      sourceAggregateSha256: manifest.sourceAggregateSha256,
      entryCount: nextEntries.length,
      entries: nextEntries.sort((a, b) => a.path.localeCompare(b.path)),
    };
    cache.cacheSha256 = createHash("sha256").update(JSON.stringify({ ...cache, cacheSha256: undefined })).digest("hex");
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const tempCachePath = `${cachePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempCachePath, JSON.stringify(cache) + "\n");
    fs.renameSync(tempCachePath, cachePath);
    snapshotValidationCacheWritten = true;
  }
  snapshotManifestSummary = {
    snapshotCount: manifest.snapshotCount,
    sourceFileCount: manifest.sourceFileCount,
    sourceBytes: manifest.sourceBytes,
    sourceAggregateSha256: manifest.sourceAggregateSha256,
    manifestSha256,
    validationMode: snapshotValidationMode,
    validationCachePath: projectPath(path.relative(root, cachePath)),
    archivedSourceCount: snapshotArchivedSourceCount,
  };
}

if (process.env.VELMERE_PREFLIGHT_DISABLE_DOMAIN_SNAPSHOTS !== "1") loadPreflightDomainSnapshots();

const retiredPreflightGuardClaimsPath = path.join(root, "config", "retired-preflight-guard-claims.json");
const retiredPreflightGuardClaims = JSON.parse(fs.readFileSync(retiredPreflightGuardClaimsPath, "utf8"));
export function retiredGuardMarkerSource(claimId) {
  const claim = retiredPreflightGuardClaims.claims?.[claimId];
  if (!claim || claim.policy !== "retired-source-marker-claim-only-no-runtime-import") {
    throw new Error(`invalid_retired_guard_claim:${claimId}`);
  }
  const markers = Array.isArray(claim.markers) ? claim.markers : [];
  const markerHash = createHash("sha256").update(JSON.stringify(markers)).digest("hex");
  if (claim.markersSha256 !== markerHash || !/^[a-f0-9]{64}$/.test(claim.sourceSha256 ?? "")) {
    throw new Error(`retired_guard_claim_integrity_failed:${claimId}`);
  }
  return markers.join("\n");
}

const retiredMissingSourceRegistryPath = path.join(root, "config", "retired-preflight-missing-sources-pass6.json");
const retiredMissingSourceRegistry = JSON.parse(fs.readFileSync(retiredMissingSourceRegistryPath, "utf8"));
const { registrySha256: retiredMissingSourceRegistrySha256, ...retiredMissingSourceRegistryCore } = retiredMissingSourceRegistry;
const computedRetiredMissingSourceRegistrySha256 = createHash("sha256").update(JSON.stringify(retiredMissingSourceRegistryCore)).digest("hex");
if (
  retiredMissingSourceRegistry.schemaVersion !== "velmere.pass6.retired-preflight-missing-source-registry.v1" ||
  retiredMissingSourceRegistrySha256 !== computedRetiredMissingSourceRegistrySha256 ||
  retiredMissingSourceRegistry.entryCount !== retiredMissingSourceRegistry.entries?.length
) {
  throw new Error("retired_preflight_missing_source_registry_integrity_failed");
}
const historicalMerkleBytes = fs.readFileSync(path.join(root, retiredMissingSourceRegistry.releaseInputMerkle.path));
const historicalMerkle = JSON.parse(historicalMerkleBytes);
const { manifestSha256: historicalMerkleManifestSha256, ...historicalMerkleCore } = historicalMerkle;
if (
  historicalMerkleManifestSha256 !== createHash("sha256").update(JSON.stringify(historicalMerkleCore)).digest("hex") ||
  retiredMissingSourceRegistry.releaseInputMerkle.fileSha256 !== createHash("sha256").update(historicalMerkleBytes).digest("hex") ||
  retiredMissingSourceRegistry.releaseInputMerkle.manifestSha256 !== historicalMerkleManifestSha256 ||
  retiredMissingSourceRegistry.releaseInputMerkle.merkleRootSha256 !== historicalMerkle.merkleRootSha256
) {
  throw new Error("retired_preflight_historical_merkle_binding_failed");
}
const historicalMerkleEntries = new Map((historicalMerkle.entries ?? []).map((entry) => [entry.path, entry]));
const pass5ReleaseBytes = fs.readFileSync(path.join(root, retiredMissingSourceRegistry.pass5ReleaseManifest.path));
const pass5Release = JSON.parse(pass5ReleaseBytes);
const pass5ReleasePaths = new Set((pass5Release.files ?? []).map((entry) => entry.path));
if (
  retiredMissingSourceRegistry.pass5ReleaseManifest.fileSha256 !== createHash("sha256").update(pass5ReleaseBytes).digest("hex") ||
  retiredMissingSourceRegistry.pass5ReleaseManifest.payloadFileCount !== pass5Release.payloadFileCount
) {
  throw new Error("retired_preflight_pass5_release_binding_failed");
}
const retiredMissingSources = new Map();
for (const entry of retiredMissingSourceRegistry.entries ?? []) {
  const historical = historicalMerkleEntries.get(entry.sourcePath);
  const computedLeaf = createHash("sha256").update(`leaf\0${entry.sourcePath}\0${entry.historicalBytes}\0${entry.historicalSha256}`).digest("hex");
  if (
    !historical || historical.bytes !== entry.historicalBytes || historical.sha256 !== entry.historicalSha256 ||
    historical.leafSha256 !== entry.historicalLeafSha256 || computedLeaf !== entry.historicalLeafSha256 ||
    pass5ReleasePaths.has(entry.sourcePath) || fs.existsSync(path.join(root, entry.sourcePath)) ||
    !entry.replacementPaths?.length || !entry.replacementGates?.length ||
    [...entry.replacementPaths, ...entry.replacementGates].some((replacement) => !fs.existsSync(path.join(root, replacement)))
  ) {
    throw new Error(`retired_preflight_source_binding_failed:${entry.sourcePath}`);
  }
  retiredMissingSources.set(entry.sourcePath, entry);
}
const computedRetiredEntriesSha256 = createHash("sha256").update((retiredMissingSourceRegistry.entries ?? [])
  .map((entry) => `${entry.sourcePath}\0${entry.historicalBytes}\0${entry.historicalSha256}\0${entry.historicalLeafSha256}`).join("\n")).digest("hex");
if (computedRetiredEntriesSha256 !== retiredMissingSourceRegistry.entriesSha256) {
  throw new Error("retired_preflight_source_aggregate_failed");
}
const retiredMissingGuardPaths = new Set();
let retiredMissingGuardFailureCount = 0;

const legacyPackageScriptClaimsPath = path.join(root, "scripts", "legacy-package-script-claims-pass4710.json");
export let packageScriptEvidenceSource = fs.readFileSync(pkgPath, "utf8");
if (fs.existsSync(legacyPackageScriptClaimsPath)) {
  try {
    const claims = JSON.parse(fs.readFileSync(legacyPackageScriptClaimsPath, "utf8"));
    const sortedNames = [...(claims.scriptNames ?? [])].sort((left, right) => left.localeCompare(right));
    const computedNamesHash = createHash("sha256").update(JSON.stringify(sortedNames)).digest("hex");
    const sortedMarkers = [...(claims.commandMarkers ?? [])].sort((left, right) => left.localeCompare(right));
    const computedMarkersHash = createHash("sha256").update(JSON.stringify(sortedMarkers)).digest("hex");
    if (
      claims.schemaVersion !== "velmere.legacy-package-script-claims.v1" ||
      claims.executionPolicy !== "non-executable-reference-only" ||
      claims.removedCount !== sortedNames.length ||
      claims.namesSha256 !== computedNamesHash ||
      claims.commandMarkersSha256 !== computedMarkersHash
    ) {
      errors.push("PASS4710 compact legacy package script claims failed integrity validation.");
    } else {
      packageScriptEvidenceSource += "\n" + sortedNames.join("\n") + "\n" + sortedMarkers.join("\n");
    }
  } catch (error) {
    errors.push(
      "PASS4710 compact legacy package script claims could not be read: " + (error instanceof Error ? error.message : String(error)),
    );
  }
}

const pass4666AliasSources = new Set(PASS4666_PAGE_ALIAS_REDIRECTS.map((entry) => entry.source));
const pass4666RouteFileAliases = new Map([
  ["app/page.tsx", "/"],
  ["app/login/page.tsx", "/login"],
  ["app/account/page.tsx", "/account"],
  ["app/logowanie/page.tsx", "/logowanie"],
  ["app/[locale]/logowanie/page.tsx", "/:locale(en|pl|de)/logowanie"],
  ["app/[locale]/sign-in/page.tsx", "/:locale(en|pl|de)/sign-in"],
  ["app/[locale]/signin/page.tsx", "/:locale(en|pl|de)/signin"],
  ["app/[locale]/konto/page.tsx", "/:locale(en|pl|de)/konto"],
  ["app/[locale]/member/page.tsx", "/:locale(en|pl|de)/member"],
  ["app/[locale]/clothing/page.tsx", "/:locale(en|pl|de)/clothing"],
  ["app/[locale]/privacy-policy/page.tsx", "/:locale(en|pl|de)/privacy-policy"],
  ["app/[locale]/legal/privacy/page.tsx", "/:locale(en|pl|de)/legal/privacy"],
  ["app/[locale]/legal/terms/page.tsx", "/:locale(en|pl|de)/legal/terms"],
  ["app/[locale]/legal/returns/page.tsx", "/:locale(en|pl|de)/legal/returns"],
  ["app/[locale]/legal/shipping/page.tsx", "/:locale(en|pl|de)/legal/shipping"],
  ["app/[locale]/collection/page.tsx", "/:locale(en|pl|de)/collection"],
  ["app/[locale]/dashboard/page.tsx", "/:locale(en|pl|de)/dashboard"],
  ["app/[locale]/risk-methodology/page.tsx", "/:locale(en|pl|de)/risk-methodology"],
]);
export function routeFileExistsOrHasAlias(routeFile) {
  if (fs.existsSync(path.join(root, routeFile))) return true;
  const alias = pass4666RouteFileAliases.get(routeFile);
  return typeof alias === "string" && pass4666AliasSources.has(alias);
}

export function projectPath(file) {
  return file.split(path.sep).join("/");
}

const dynamicApiRouteSurfaceConfig = Object.freeze({
  security: Object.freeze({
    routePath: "app/api/security/[operation]/route.ts",
    registryPath: "lib/server/route-registries/security.ts",
    registryName: "SECURITY_ROUTES",
    modulePrefix: "lib/server/security-route-modules",
  }),
  "market-integrity": Object.freeze({
    routePath: "app/api/market-integrity/[operation]/route.ts",
    registryPath: "lib/server/route-registries/market-integrity.ts",
    registryName: "MARKET_INTEGRITY_ROUTES",
    modulePrefix: "lib/server/market-integrity-route-modules",
  }),
  search: Object.freeze({
    routePath: "app/api/search/[operation]/route.ts",
    registryPath: "lib/server/route-registries/search.ts",
    registryName: "SEARCH_ROUTES",
    modulePrefix: "lib/server/search-route-modules",
  }),
  admin: Object.freeze({
    routePath: "app/api/admin/[operation]/route.ts",
    registryPath: "lib/server/route-registries/admin.ts",
    registryName: "ADMIN_ROUTES",
    modulePrefix: "lib/server/admin-route-modules",
  }),
});
const dynamicApiRouteResolutions = new Map();

function readPhysical(normalized) {
  if (snapshotContents.has(normalized)) {
    snapshotReadCalls += 1;
    snapshotReadFiles.add(normalized);
    return snapshotContents.get(normalized);
  }
  directReadFiles.add(normalized);
  if (readCache.has(normalized)) {
    readCacheHits += 1;
    return readCache.get(normalized);
  }
  const value = fs.readFileSync(path.join(root, normalized), "utf8");
  readCache.set(normalized, value);
  return value;
}

function resolveDynamicApiRouteSurface(normalized) {
  const match = /^app\/api\/(security|market-integrity|search|admin)\/([^/]+)\/route\.ts$/u.exec(normalized);
  if (!match) return null;
  const [, namespace, operation] = match;
  if (operation.startsWith("[") || operation.includes(".")) return null;
  const config = dynamicApiRouteSurfaceConfig[namespace];
  if (!config) return null;

  const dynamicRouteSource = readPhysical(config.routePath);
  const registrySource = readPhysical(config.registryPath);
  const modulePath = `${config.modulePrefix}/${operation}.ts`;
  const importNeedle = `import("@/${config.modulePrefix}/${operation}")`;
  const registryEntry = registrySource
    .split(/\r?\n/u)
    .find((line) => line.includes(`"${operation}"`) && line.includes(importNeedle));
  if (!registryEntry) throw new Error(`dynamic_route_registry_entry_missing:${normalized}:${config.registryPath}`);
  if (!dynamicRouteSource.includes(config.registryName) || !dynamicRouteSource.includes("dispatchLazyRoute")) {
    throw new Error(`dynamic_route_dispatch_contract_missing:${config.routePath}`);
  }
  if (!fs.existsSync(path.join(root, modulePath))) throw new Error(`dynamic_route_module_missing:${normalized}:${modulePath}`);
  const moduleSource = readPhysical(modulePath);
  const resolution = Object.freeze({
    legacyPath: normalized,
    namespace,
    operation,
    dynamicRoutePath: config.routePath,
    registryPath: config.registryPath,
    modulePath,
  });
  dynamicApiRouteResolutions.set(normalized, resolution);
  return [
    `// VELMERE_DYNAMIC_ROUTE_GUARD_SURFACE legacy=${normalized} operation=${operation}`,
    `// dynamicRoute=${config.routePath}`,
    dynamicRouteSource,
    `// registry=${config.registryPath}`,
    registryEntry,
    `// module=${modulePath}`,
    moduleSource,
  ].join("\n");
}

export function read(file) {
  const normalized = projectPath(file);
  directReadCalls += 1;
  if (snapshotContents.has(normalized) || fs.existsSync(path.join(root, normalized))) {
    return readPhysical(normalized);
  }
  const resolved = resolveDynamicApiRouteSurface(normalized);
  if (resolved !== null) {
    readCache.set(normalized, resolved);
    directReadFiles.add(normalized);
    return resolved;
  }
  return readPhysical(normalized);
}

export function getDynamicApiRouteResolutions() {
  return [...dynamicApiRouteResolutions.values()].sort((left, right) => left.legacyPath.localeCompare(right.legacyPath));
}

function collectWalk(dir, exts, output) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const absolute = path.join(full, entry.name);
    const relativeEntry = projectPath(path.relative(root, absolute));
    if (
      ["node_modules", ".next", ".git", "dist", "out", "archive", "artifacts"].includes(entry.name) ||
      entry.name.startsWith(".next-") ||
      relativeEntry === "artifacts/pass4667/deployment-package"
    ) continue;
    if (entry.isDirectory()) collectWalk(path.relative(root, absolute), exts, output);
    else if (exts.some((ext) => entry.name.endsWith(ext))) {
      output.push(relativeEntry);
      scannedFiles.add(relativeEntry);
    }
  }
}

export function walk(dir, exts, files = []) {
  const normalizedRoot = projectPath(dir);
  const normalizedExts = [...exts].sort();
  const key = `${normalizedRoot}::${normalizedExts.join(",")}`;
  walkCalls += 1;
  scannedRoots.add(normalizedRoot);
  if (walkCache.has(key)) {
    walkCacheHits += 1;
    files.push(...walkCache.get(key));
    return files;
  }
  const collected = [];
  collectWalk(dir, normalizedExts, collected);
  walkCache.set(key, collected);
  files.push(...collected);
  return files;
}

function isSignedQuarantinedMissingSource(error) {
  if (!/ENOENT: no such file or directory/.test(error)) return false;
  const absolute = error.match(/(?:open|stat) '([^']+)'/)?.[1];
  if (!absolute) return false;
  const relative = projectPath(path.relative(root, absolute));
  const entry = signedQuarantinedSources.get(relative);
  if (!entry) return false;
  if (signedQuarantineValidation.has(relative)) return signedQuarantineValidation.get(relative);
  const archivePath = path.join(root, entry.archive);
  if (!fs.existsSync(archivePath)) {
    signedQuarantineValidation.set(relative, false);
    return false;
  }
  const digest = createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex");
  const valid = digest === entry.sha256;
  signedQuarantineValidation.set(relative, valid);
  return valid;
}

function isReleaseOmittedRetiredMissingSource(error) {
  if (!/ENOENT: no such file or directory/.test(error)) return false;
  const absolute = error.match(/(?:open|stat) '([^']+)'/)?.[1];
  if (!absolute) return false;
  const relative = projectPath(path.relative(root, absolute));
  const entry = retiredMissingSources.get(relative);
  if (!entry || fs.existsSync(path.join(root, relative))) return false;
  const replacementsValid = [...entry.replacementPaths, ...entry.replacementGates]
    .every((replacement) => fs.existsSync(path.join(root, replacement)));
  if (replacementsValid) retiredMissingGuardPaths.add(relative);
  return replacementsValid;
}

export function filterOptionalDocumentationErrors(label) {
  const optionalDocumentation = errors.filter((error) =>
    /ENOENT: no such file or directory/.test(error) &&
    /(VELMERE_PASS\d+_.*\.md|docs\/progress\/)/.test(error),
  );
  const signedHistorical = errors.filter((error) =>
    !optionalDocumentation.includes(error) && isSignedQuarantinedMissingSource(error),
  );
  const releaseOmittedRetired = errors.filter((error) =>
    !optionalDocumentation.includes(error) && !signedHistorical.includes(error) && isReleaseOmittedRetiredMissingSource(error),
  );
  retiredMissingGuardFailureCount += releaseOmittedRetired.length;
  const optional = [...optionalDocumentation, ...signedHistorical, ...releaseOmittedRetired];
  if (optionalDocumentation.length) {
    console.warn(`PASS2215 clean artifact preflight: skipped ${optionalDocumentation.length} documentation-only historical guard errors.`);
  }
  if (signedHistorical.length) {
    console.warn(`PASS4800 signed quarantine preflight: skipped ${signedHistorical.length} historical guard errors backed by verified SHA-256 archive entries.`);
  }
  if (releaseOmittedRetired.length) {
    console.warn(`PASS6 retired-source preflight: retired ${releaseOmittedRetired.length} ENOENT-only legacy guard errors across ${retiredMissingGuardPaths.size} sources omitted from the supplied PASS5 release; current replacement paths and gates are bound.`);
  }
  if (optional.length) {
    const blocking = errors.filter((error) => !optional.includes(error));
    errors.splice(0, errors.length, ...blocking);
  }
  if (errors.length) {
    console.error(label);
    const remaining = new Map();
    for (const message of errors) remaining.set(message, (remaining.get(message) ?? 0) + 1);
    const active = [];
    for (let index = guardFailureEvents.length - 1; index >= 0; index -= 1) {
      const event = guardFailureEvents[index];
      const count = remaining.get(event.message) ?? 0;
      if (count <= 0) continue;
      active.push(event);
      remaining.set(event.message, count - 1);
    }
    active.reverse();
    for (const event of active) console.error(`- [${event.id}] ${event.message}`);
    return false;
  }
  return true;
}

export function writePreflightTrace(outputPath, phases, phaseTimings = []) {
  if (!outputPath) return;
  const absolute = path.resolve(root, outputPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const direct = [...directReadFiles].sort();
  const scanned = [...scannedFiles].sort();
  const payload = {
    schemaVersion: "velmere.preflight-dependency-trace.v1",
    generatedAt: new Date().toISOString(),
    phaseOrder: phases,
    phaseTimings,
    totalPhaseDurationMs: Number(phaseTimings.reduce((sum, item) => sum + item.durationMs, 0).toFixed(3)),
    directReadFiles: direct,
    directReadCount: direct.length,
    directReadCalls,
    readCacheHits,
    criticalGuardRegistry: {
      guardCount: criticalGuardRegistry.guardCount,
      registrySha256: criticalRegistrySha256,
      authoredScopesExecuted: [...new Set(executedGuardScopes.filter((scope) => criticalGuardIds.has(scope)))].length,
    },
    authoredAssertionRegistry: {
      guardCount: authoredAssertionRegistry.guardCount,
      assertionCount: authoredAssertionRegistry.assertionCount,
      criticalGuardCount: authoredAssertionRegistry.criticalGuardCount,
      registrySha256: authoredAssertionRegistrySha256,
      policySha256: assertionPolicySha256,
      policyAssertionCount: assertionPolicyRegistry.assertionCount,
      authoredScopesExecuted: [...new Set(executedGuardScopes.filter((scope) => authoredGuardIds.has(scope)))].length,
      authoredAssertionsExecuted: [...new Set(executedAuthoredAssertions)].length,
    },
    snapshotManifest: snapshotManifestSummary,
    snapshotBackedFiles: [...snapshotReadFiles].sort(),
    snapshotBackedFileCount: snapshotReadFiles.size,
    snapshotReadCalls,
    snapshotValidationReadCount,
    snapshotValidationBytes,
    snapshotValidationCacheHits,
    snapshotValidationStatCount,
    snapshotValidationMode,
    snapshotValidationCacheWritten,
    snapshotValidationCacheWriteSkipped,
    snapshotValidationCacheHitRate: snapshotValidationStatCount ? Number((snapshotValidationCacheHits / snapshotValidationStatCount).toFixed(4)) : 0,
    retiredMissingSourceRegistry: {
      entryCount: retiredMissingSourceRegistry.entryCount,
      registrySha256: retiredMissingSourceRegistrySha256,
      skippedFailureCount: retiredMissingGuardFailureCount,
      skippedSourcePaths: [...retiredMissingGuardPaths].sort(),
      runtimeClaimsSatisfiedByRegistry: false,
    },
    dynamicApiRouteGuardResolution: {
      resolvedLegacyPathCount: dynamicApiRouteResolutions.size,
      resolutions: getDynamicApiRouteResolutions(),
      policy: "fail-closed exact dynamic route + registry entry + module source",
    },
    effectiveGuardDependencyFileCount: direct.length + snapshotReadFiles.size,
    readCacheHitRate: directReadCalls ? Number((readCacheHits / directReadCalls).toFixed(4)) : 0,
    scannedRoots: [...scannedRoots].sort(),
    scannedFiles: scanned,
    scannedFileCount: scanned.length,
    walkCalls,
    walkCacheHits,
    walkCacheHitRate: walkCalls ? Number((walkCacheHits / walkCalls).toFixed(4)) : 0,
    executedGuardScopes: [...new Set(executedGuardScopes)],
    executedGuardScopeCount: new Set(executedGuardScopes).size,
    guardScopeExecutionCount: executedGuardScopes.length,
    guardScopeExecutions: Object.fromEntries([...guardScopeExecutions.entries()].sort(([a], [b]) => a.localeCompare(b))),
    guardFailureEvents,
    guardFailureCount: guardFailureEvents.length,
    activeBlockingFailureCount: errors.length,
    missingDirectReadFiles: direct.filter((file) => !fs.existsSync(path.join(root, file))),
  };
  fs.writeFileSync(absolute, JSON.stringify(payload, null, 2) + "\n");
}
