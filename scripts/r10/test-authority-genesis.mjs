#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateR10AuthorityGenesis } from "./authority-genesis-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const candidate = JSON.parse(fs.readFileSync(path.join(root, "config/r10/authority-genesis.json"), "utf8"));

{
  const result = validateR10AuthorityGenesis(candidate);
  assert.equal(result.valid, true, result.blockers.join("\n"));
  assert.equal(result.releaseAuthority, false);
}

{
  const fakeHistory = structuredClone(candidate);
  fakeHistory.historicalManifestReconstructed = true;
  const result = validateR10AuthorityGenesis(fakeHistory);
  assert.equal(result.valid, false);
  assert(result.blockers.includes("authority_historical_manifest_reconstruction_forbidden"));
}

{
  const fakeParent = structuredClone(candidate);
  fakeParent.parentAuthorityDigest = "a".repeat(64);
  const result = validateR10AuthorityGenesis(fakeParent);
  assert.equal(result.valid, false);
  assert(result.blockers.includes("authority_genesis_parent_must_be_null"));
}

{
  const premature = structuredClone(candidate);
  premature.status = "RELEASE_AUTHORITY";
  premature.release = "R10";
  premature.releaseEligible = true;
  const result = validateR10AuthorityGenesis(premature);
  assert.equal(result.valid, false);
  assert(result.blockers.some((item) => item.startsWith("authority_binding_invalid") || item === "authority_source_commit_invalid"));
}

{
  const final = structuredClone(candidate);
  final.status = "RELEASE_AUTHORITY";
  final.release = "R10";
  final.releaseEligible = true;
  final.finalBindings = {
    sourceCommit: "a".repeat(40),
    sourceTreeSha256: "b".repeat(64),
    releaseZipSha256: "c".repeat(64),
    sourceManifestSha256: "d".repeat(64),
  };
  const result = validateR10AuthorityGenesis(final);
  assert.equal(result.valid, true, result.blockers.join("\n"));
  assert.equal(result.releaseAuthority, true);
}

console.log("R10 authority genesis regression: PASS");
