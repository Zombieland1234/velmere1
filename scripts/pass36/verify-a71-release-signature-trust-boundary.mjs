import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A71R0_RELEASE_SIGNATURE_AND_TRUST_ANCHOR_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A70R0_MULTIPART_UPLOAD_AND_PASSIVE_ATTACHMENT_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a71-release-signature-and-trust-anchor-boundary.json");
const state = json("config/pass36/a71-current-state.json");
const receipt = json("config/pass36/a71-release-signature-trust-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const pkg = json("package.json");
const active = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/release-signature-trust-boundary.mjs");
const candidateCli = read("scripts/verify-release-candidate-attestation.mjs");
const packageCli = read("scripts/verify-release-proof-package.mjs");
const checkpointCli = read("scripts/verify-release-trust-checkpoint.mjs");
const transparencyCli = read("scripts/verify-release-transparency-log.mjs");
const candidateTs = read("lib/market-integrity/release-candidate-attestation.ts");
const trustTs = read("lib/market-integrity/release-trust-checkpoint.ts");
const consistencyTs = read("lib/market-integrity/release-trust-consistency.ts");
const transparencyTs = read("lib/market-integrity/release-transparency-log.ts");

check("revision:policy", policy.revisionId === REVISION && policy.parentRevisionId === PARENT);
check("revision:state", state.revisionId === REVISION && state.parentRevisionId === PARENT);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("revision:active", active === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("current:a71", current.releaseSignatureTrustBoundaryRevisionId === REVISION && current.releaseSignatureTrustBoundaryImplemented === true);
check("current:a70-retained", current.multipartUploadTrustBoundaryRevisionId === PARENT && current.multipartUploadTrustBoundaryImplemented === true);
check("boundary:id", boundary.includes("PASS36_A71_RELEASE_SIGNATURE_BOUNDARY_ID") && boundary.includes("velmere.pass36.a71.release-signature-trust-boundary.v1"));
check("boundary:ed25519", boundary.includes("public_key_not_ed25519") && boundary.includes("strictEd25519PublicKey"));
check("boundary:strict-signature", boundary.includes("strictEd25519Signature") && boundary.includes("bytes.length !== 64") && boundary.includes("toString(\"base64url\") !== input"));
check("boundary:unique-key-id", boundary.includes("key_id_invalid_or_duplicate"));
check("boundary:unique-fingerprint", boundary.includes("key_fingerprint_duplicate"));
check("boundary:active-threshold", boundary.includes("threshold_exceeds_eligible_keys") && boundary.includes('key.status === "active"'));
check("boundary:validity", boundary.includes("signer_outside_validity") && boundary.includes("currentlyValid"));
check("boundary:external-anchor", boundary.includes("checkpoint_external_anchor_required"));
check("boundary:checkpoint-chain", boundary.includes("checkpoint_chain_mismatch") && boundary.includes("checkpoint_revocation_regression"));
check("candidate-cli:anchor-required", candidateCli.includes("usage_requires_attestation_public_key_and_trusted_fingerprint") && candidateCli.includes("external_trust_anchor_mismatch"));
check("candidate-cli:strict-fields", candidateCli.includes("PAYLOAD_KEYS") && candidateCli.includes("payload_unknown_field"));
check("candidate-cli:regular-file", candidateCli.includes("readBoundedRegularFile"));
check("package-cli:anchor-required", packageCli.includes("package_external_anchor_required") && packageCli.includes("package_trusted_fingerprint_missing"));
check("package-cli:index-signature", packageCli.includes("package_index_signature_invalid") && packageCli.includes("strictEd25519Signature"));
check("checkpoint-cli:full-package-verify", checkpointCli.includes("checkpoint_package_digest_invalid") && checkpointCli.includes("verifyThresholdSignatures"));
check("checkpoint-cli:anchor", checkpointCli.includes("trusted-checkpoint-digest") && checkpointCli.includes("trusted-fingerprint"));
check("transparency-cli:checkpoint-first", transparencyCli.indexOf("verifyTrustCheckpointArtifact") < transparencyCli.indexOf("for (const artifact of entries)"));
check("transparency-cli:no-unverified-checkpoint", transparencyCli.includes("transparency_checkpoint_unverified"));
check("transparency-cli:duplicate-checkpoint", transparencyCli.includes("transparency_duplicate_checkpoint_digest"));
check("production-candidate:detached-anchor", candidateTs.includes("VELMERE_RELEASE_CANDIDATE_TRUSTED_PUBLIC_KEY_SHA256") && candidateTs.includes("release_candidate_external_trust_anchor_missing_or_mismatch"));
check("production-candidate:gate-anchor", candidateTs.includes("release_candidate_trusted_public_key_fingerprint_missing") && candidateTs.includes("release_candidate_external_trust_anchor_mismatch"));
check("production-trust:genesis-anchor", trustTs.includes("VELMERE_RELEASE_TRUSTED_GENESIS_FINGERPRINTS") && trustTs.includes("release_trust_external_genesis_anchor_required"));
check("production-consistency:genesis-anchor", consistencyTs.includes("trustedGenesisFingerprints") && consistencyTs.includes("requireExternalAnchor: i === 0"));
check("production-transparency:genesis-anchor", transparencyTs.includes("release_transparency_external_genesis_anchor_required") && transparencyTs.includes("trustedGenesisFingerprints"));
check("env:developer-anchor", read(".env.example").includes("VELMERE_RELEASE_CANDIDATE_TRUSTED_PUBLIC_KEY_SHA256=") && read(".env.example").includes("VELMERE_RELEASE_TRUSTED_GENESIS_FINGERPRINTS="));
check("env:production-anchor", read("ENV_PRODUCTION_READY.example").includes("VELMERE_RELEASE_CANDIDATE_TRUSTED_PUBLIC_KEY_SHA256=") && read("ENV_PRODUCTION_READY.example").includes("VELMERE_RELEASE_TRUSTED_GENESIS_FINGERPRINTS="));
check("policy:requirements", policy.requirements?.ed25519Only === true && policy.requirements?.externalFingerprintAnchorRequiredForCandidateAttestation === true && policy.requirements?.externalGenesisAnchorRequiredForTrustCheckpoint === true && policy.requirements?.trustCheckpointChainVerifiedBeforeTransparencyEntries === true);
check("policy:covered-scripts", policy.coveredVerifierScripts?.length === 4);
check("policy:covered-production", policy.coveredProductionModules?.length === 4);
check("test:all-pass", receipt.counts?.total >= 37 && receipt.counts?.passed === receipt.counts.total && receipt.counts.failed === 0, receipt.counts);
for (const id of [
  "checkpoint_self_signed_without_anchor_rejected",
  "candidate_cli_anchor_required",
  "candidate_cli_wrong_anchor_rejected",
  "package_cli_anchor_required",
  "package_duplicate_signer_rejected",
  "checkpoint_cli_anchor_required",
  "transparency_cli_anchor_required",
  "transparency_unverified_checkpoint_rejected"
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
check("package:test", pkg.scripts?.["test:pass36:a71"] === "node scripts/pass36/test-a71-release-signature-trust-boundary.mjs");
check("package:verify", pkg.scripts?.["verify:pass36:a71"] === "node scripts/pass36/verify-a71-release-signature-trust-boundary.mjs");
check("package:metadata", pkg.velmereReleaseSignatureTrustBoundaryPass === REVISION);
check("truth:no-external-signature-credit", state.externalSignaturesVerified === false && state.productionTransparencyLogVerified === false && state.independentTrustAnchorCustodyVerified === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a71.release-signature-trust-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
