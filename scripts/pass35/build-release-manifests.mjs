#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PASS35_CANDIDATE_ID,
  PASS35_MANIFEST_PATHS,
  PASS35_MANIFEST_PROFILES,
  buildPass35ManifestSet,
  detectPass35ManifestProfile,
  normalizePass35ManifestProfile,
  setDigest,
  validatePass35ManifestSet,
} from "./release-manifest-set.mjs";

const SUPERSEDED_PATHS = Object.freeze([
  "artifacts/release/FILE_MANIFEST.csv",
  "artifacts/release/SOURCE_IDENTITY.json",
  "artifacts/release/EVIDENCE_INDEX.json",
  "artifacts/release/MASTER_MAP.json",
]);
const HISTORY_ROOT = "artifacts/release/history/pass30_superseded_manifest_set";

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function atomicWrite(absolutePath, bytes) {
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporary = `${absolutePath}.${process.pid}.tmp`;
  writeFileSync(temporary, bytes, { mode: 0o600 });
  renameSync(temporary, absolutePath);
}

function preserveSupersededCurrentSet(root) {
  const identityPath = path.join(root, "artifacts/release/SOURCE_IDENTITY.json");
  let identity;
  try {
    identity = JSON.parse(readFileSync(identityPath, "utf8"));
  } catch {
    return { archived: false, reason: "no_parseable_superseded_identity" };
  }
  if (identity.candidateId === PASS35_CANDIDATE_ID) return { archived: false, reason: "pass35_already_current" };
  const historyRoot = path.join(root, HISTORY_ROOT);
  const noticePath = path.join(historyRoot, "HISTORY_NOTICE.json");
  try {
    JSON.parse(readFileSync(noticePath, "utf8"));
    return { archived: false, reason: "superseded_set_already_preserved" };
  } catch {
    // The first PASS35 generation owns creation of this immutable preservation copy.
  }
  mkdirSync(historyRoot, { recursive: true });
  const preserved = [];
  for (const relativePath of SUPERSEDED_PATHS) {
    const source = path.join(root, relativePath);
    try {
      const bytes = readFileSync(source);
      const target = path.join(historyRoot, path.basename(relativePath));
      atomicWrite(target, bytes);
      preserved.push({ sourcePath: relativePath, historyPath: path.relative(root, target).replaceAll(path.sep, "/") });
    } catch {
      // Missing superseded components are recorded by omission; generation does not invent them.
    }
  }
  const notice = {
    schemaVersion: "velmere.pass35.superseded-manifest-history.v1",
    status: "PRESERVED_SUPERSEDED_CURRENT_SET",
    supersededReleaseId: identity.releaseId ?? null,
    supersededCandidateId: identity.candidateId ?? null,
    preserved,
    deletionPerformed: false,
    truthBoundary: "These bytes are historical and must not be interpreted as the current PASS35 manifest set.",
  };
  atomicWrite(noticePath, jsonBytes(notice));
  return { archived: true, preserved: preserved.length, historyRoot: HISTORY_ROOT };
}

function cliArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`pass35_argument_missing:${name}`);
  return value;
}

export function runCanonicalPass35ManifestBuild(rootPath = process.cwd(), { profile = null } = {}) {
  const root = path.resolve(rootPath);
  const manifestProfile = normalizePass35ManifestProfile(profile ?? detectPass35ManifestProfile(root, PASS35_MANIFEST_PROFILES.WORKSPACE));
  const history = preserveSupersededCurrentSet(root);
  const set = buildPass35ManifestSet(root, { profile: manifestProfile });
  const blockers = validatePass35ManifestSet(set, { rootPath: root });
  if (blockers.length) throw new Error(`pass35_manifest_set_generation_invalid:${blockers.join("|")}`);

  const stageRoot = path.join(root, "artifacts/release", `.pass35-manifest-stage-${process.pid}`);
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(stageRoot, { recursive: true });
  try {
    for (const relativePath of PASS35_MANIFEST_PATHS) {
      const bytes = set.artifacts.get(relativePath);
      if (!bytes) throw new Error(`pass35_manifest_output_missing:${relativePath}`);
      const stagePath = path.join(stageRoot, path.basename(relativePath));
      writeFileSync(stagePath, bytes, { mode: 0o600 });
    }
    for (const relativePath of PASS35_MANIFEST_PATHS) {
      const target = path.join(root, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      renameSync(path.join(stageRoot, path.basename(relativePath)), target);
    }
  } finally {
    rmSync(stageRoot, { recursive: true, force: true });
  }
  return {
    schemaVersion: "velmere.pass35.manifest-generation-result.v2",
    status: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION"
      : "PASS_LOCAL_WORKSPACE_MANIFEST_SET_NO_PROMOTION",
    candidateId: PASS35_CANDIDATE_ID,
    manifestProfile,
    productionPromotionAllowed: false,
    artifactCount: PASS35_MANIFEST_PATHS.length,
    sourceFileCount: set.parsed.sourceIdentity.sourceTree.fileCount,
    evidenceEntryCount: set.parsed.evidenceIndex.entryCount,
    sbomComponentCount: set.parsed.sbom.components.length,
    manifestSetSha256: setDigest(set),
    history,
    truthBoundary: "Generation proves deterministic local artifact coherence only. It does not provide a signature, trusted builder, independent verification, external provenance, staging evidence, LIVE evidence, or promotion approval.",
  };
}

function isMain() {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href;
}

if (isMain()) {
  try {
    const requestedProfile = cliArg("--profile");
    console.log(JSON.stringify(runCanonicalPass35ManifestBuild(process.cwd(), { profile: requestedProfile }), null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: "FAIL_CANONICAL_MANIFEST_GENERATION",
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  }
}
