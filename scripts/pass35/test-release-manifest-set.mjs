#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildPass35ManifestSet,
  validatePass35ManifestSet,
} from "./release-manifest-set.mjs";

function cloneSet(set) {
  const artifacts = new Map([...set.artifacts].map(([name, bytes]) => [name, Buffer.from(bytes)]));
  const parsed = Object.fromEntries(Object.entries(set.parsed).map(([name, value]) => [name, structuredClone(value)]));
  return { ...set, artifacts, parsed };
}

function replaceJson(set, relativePath, parsedName, mutate) {
  const value = structuredClone(set.parsed[parsedName]);
  mutate(value);
  set.parsed[parsedName] = value;
  set.artifacts.set(relativePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

const canonical = buildPass35ManifestSet(process.cwd());
assert.deepEqual(validatePass35ManifestSet(canonical, { rootPath: process.cwd() }), []);

const identityMutation = cloneSet(canonical);
replaceJson(identityMutation, "artifacts/release/SOURCE_IDENTITY.json", "sourceIdentity", (value) => { value.candidateId = "WRONG"; });
assert.ok(validatePass35ManifestSet(identityMutation, { rootPath: process.cwd() }).includes("source_identity_candidate_mismatch"));

const provenanceMutation = cloneSet(canonical);
replaceJson(provenanceMutation, "artifacts/release/PROVENANCE.intoto.json", "provenance", (value) => {
  value.predicate.buildDefinition.internalParameters.signatureIssued = true;
});
assert.ok(validatePass35ManifestSet(provenanceMutation, { rootPath: process.cwd() }).includes("provenance_signature_claim_forbidden"));

const evidenceMutation = cloneSet(canonical);
replaceJson(evidenceMutation, "artifacts/release/EVIDENCE_INDEX.json", "evidenceIndex", (value) => { value.entryCount += 1; });
assert.ok(validatePass35ManifestSet(evidenceMutation, { rootPath: process.cwd() }).includes("evidence_index_count_invalid"));

const sbomMutation = cloneSet(canonical);
replaceJson(sbomMutation, "artifacts/release/SBOM.cdx.json", "sbom", (value) => { value.components.pop(); });
assert.ok(validatePass35ManifestSet(sbomMutation, { rootPath: process.cwd() }).some((item) => item.startsWith("sbom:cyclonedx_component_coverage_incomplete")));

const masterMutation = cloneSet(canonical);
replaceJson(masterMutation, "artifacts/release/MASTER_MAP.json", "masterMap", (value) => {
  value.artifactSet[0].sha256 = "0".repeat(64);
});
assert.ok(validatePass35ManifestSet(masterMutation, { rootPath: process.cwd() }).some((item) => item.startsWith("master_map_artifact_ref_mismatch:")));

console.log(JSON.stringify({
  status: "PASS",
  assertions: 6,
  mutationCases: ["identity", "unsigned-provenance-boundary", "evidence-count", "sbom-coverage", "master-map-binding"],
}, null, 2));
