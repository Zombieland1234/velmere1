#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PASS35_CANDIDATE_ID,
  PASS35_MANIFEST_PROFILES,
  buildPass35ManifestSet,
  compareManifestSets,
  detectPass35ManifestProfile,
  normalizePass35ManifestProfile,
  readPass35ManifestSet,
  setDigest,
  validatePass35ManifestSet,
} from "./release-manifest-set.mjs";

function cliArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`pass35_argument_missing:${name}`);
  return value;
}

export function verifyCanonicalPass35ManifestSet(rootPath = process.cwd(), { profile = null } = {}) {
  const root = path.resolve(rootPath);
  const manifestProfile = normalizePass35ManifestProfile(profile ?? detectPass35ManifestProfile(root, PASS35_MANIFEST_PROFILES.WORKSPACE));
  const expected = buildPass35ManifestSet(root, { profile: manifestProfile });
  const observed = readPass35ManifestSet(root);
  const blockers = [...new Set([
    ...validatePass35ManifestSet(observed, { rootPath: root }),
    ...compareManifestSets(expected, observed),
  ])].sort();
  return {
    schemaVersion: "velmere.pass35.manifest-verification-result.v2",
    candidateId: PASS35_CANDIDATE_ID,
    manifestProfile,
    status: blockers.length
      ? "FAIL_CANONICAL_MANIFEST_SET"
      : manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
        ? "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION"
        : "PASS_LOCAL_WORKSPACE_MANIFEST_SET_NO_PROMOTION",
    productionPromotionAllowed: false,
    artifactCount: observed.artifacts.size,
    manifestSetSha256: blockers.length ? null : setDigest(observed),
    blockers,
    truthBoundary: "Verification proves current local bytes match the deterministic profile-scoped PASS35 generator. It is not independent assurance, signature verification, trusted provenance, staging evidence, LIVE evidence, or promotion approval.",
  };
}

function isMain() {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href;
}

if (isMain()) {
  try {
    const requestedProfile = cliArg("--profile");
    const result = verifyCanonicalPass35ManifestSet(process.cwd(), { profile: requestedProfile });
    console.log(JSON.stringify(result, null, 2));
    if (result.blockers.length) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({
      status: "FAIL_CANONICAL_MANIFEST_VERIFICATION",
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  }
}
