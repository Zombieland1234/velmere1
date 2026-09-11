import { createHash } from "node:crypto";

const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT_SHA = /^[a-f0-9]{40}$/;

function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalized(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalized(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validateR10AuthorityGenesis(authority) {
  const blockers = [];
  if (authority?.schemaVersion !== "velmere.r10.authority-genesis.v1") blockers.push("authority_schema_invalid");
  if (authority?.chainMode !== "GENESIS_AFTER_INCOMPLETE_HISTORY") blockers.push("authority_chain_mode_invalid");
  if (authority?.historicalChainStatus !== "INCOMPLETE") blockers.push("authority_history_must_remain_explicitly_incomplete");
  if (authority?.historicalManifestReconstructed !== false) blockers.push("authority_historical_manifest_reconstruction_forbidden");
  if (authority?.parentAuthorityDigest !== null) blockers.push("authority_genesis_parent_must_be_null");
  if (!SHA256.test(String(authority?.migrationFrom?.expectedZipSha256 ?? ""))) blockers.push("authority_r9_migration_zip_sha_invalid");
  if (authority?.migrationFrom?.authorityCredit !== false) blockers.push("authority_r9_migration_must_not_receive_authority_credit");

  const status = authority?.status;
  const bindings = authority?.finalBindings ?? {};
  if (status === "CANDIDATE_NOT_RELEASE_AUTHORITY") {
    if (authority?.releaseEligible !== false) blockers.push("authority_candidate_cannot_be_release_eligible");
    for (const [key, value] of Object.entries(bindings)) {
      if (value !== null) blockers.push(`authority_candidate_binding_must_be_null:${key}`);
    }
  } else if (status === "RELEASE_AUTHORITY") {
    if (authority?.release !== "R10") blockers.push("authority_final_release_must_be_R10");
    if (authority?.releaseEligible !== true) blockers.push("authority_final_release_eligible_must_be_true");
    if (!COMMIT_SHA.test(String(bindings.sourceCommit ?? ""))) blockers.push("authority_source_commit_invalid");
    for (const key of ["sourceTreeSha256", "releaseZipSha256", "sourceManifestSha256"]) {
      if (!SHA256.test(String(bindings[key] ?? ""))) blockers.push(`authority_binding_invalid:${key}`);
    }
  } else {
    blockers.push("authority_status_invalid");
  }

  const unsigned = structuredClone(authority ?? {});
  delete unsigned.authorityDigestSha256;
  const computedAuthorityDigestSha256 = sha256(canonicalJson(unsigned));
  if (authority?.authorityDigestSha256 != null && authority.authorityDigestSha256 !== computedAuthorityDigestSha256) {
    blockers.push("authority_self_digest_mismatch");
  }

  return {
    valid: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    computedAuthorityDigestSha256,
    releaseAuthority: status === "RELEASE_AUTHORITY" && blockers.length === 0,
  };
}
