#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  PASS35_CANDIDATE_ID,
  PASS35_MANIFEST_PROFILES,
  readPass35ManifestSet,
  validatePass35ManifestSet,
} from "../pass35/release-manifest-set.mjs";
import { canonical, root, sha256 } from "./release-common.mjs";

const POINTER_PATH = "config/current-release.json";
const HISTORY_PATH = "config/historical-evidence-index.json";
const A57_CONTRACT_PATH = "config/pass35/a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.json";
const A57_RECEIPT_PATH = "artifacts/pass35/a57/PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE.json";
const POINTER_SCHEMA = "velmere.current-release-pointer.v2";
const HISTORY_SCHEMA = "velmere.historical-evidence-index.v1";
const A57_REVISION = "VELMERE_PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE";

const pointerBytes = fs.readFileSync(path.join(root, POINTER_PATH));
const pointer = JSON.parse(pointerBytes.toString("utf8"));
const history = JSON.parse(fs.readFileSync(path.join(root, HISTORY_PATH), "utf8"));
const manifestSet = readPass35ManifestSet(root);
const manifestProfile = manifestSet.parsed.authority?.manifestProfile
  ?? manifestSet.parsed.sourceIdentity?.manifestProfile
  ?? null;
const blockers = [];
const omittedHistoricalEntries = [];

function block(unless, code) {
  if (!unless) blockers.push(code);
}

function resolveBounded(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim() || path.isAbsolute(relativePath)) return null;
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return resolved;
}

function requirePointerFile(key) {
  const value = pointer[key];
  const absolute = resolveBounded(value);
  block(Boolean(absolute), `pointer_path_invalid:${key}`);
  if (absolute) block(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `pointer_target_missing:${key}:${value}`);
}

block(pointer.schemaVersion === POINTER_SCHEMA, "pointer_schema_invalid");
block(pointer.candidateId === PASS35_CANDIDATE_ID, "pointer_candidate_invalid");
block(pointer.releaseId === null, "pointer_release_id_must_be_null");
block(pointer.status === "OFFLINE_CANDIDATE_NO_PROMOTION", "pointer_status_invalid");
block(pointer.checkpoint === true, "pointer_checkpoint_invalid");
block(pointer.productionPromotionAllowed === false, "pointer_promotion_must_be_false");
block(pointer.readinessScoreIssued === false, "pointer_readiness_score_must_be_false");

for (const key of [
  "currentRoadmapPath",
  "preGatePath",
  "productCellCatalogPath",
  "paidSurfacePolicyPath",
  "sourceLifecycleClassificationPath",
  "currentStatusRegisterPath",
  "currentStatusBoardPath",
  "currentStatusSummaryPath",
  "manifestAuthorityPath",
  "fileManifestPath",
  "sourceIdentityPath",
  "sbomPath",
  "provenancePath",
  "evidenceIndexPath",
  "masterMapPath",
  "a9VisualFreezeBaselinePath",
]) requirePointerFile(key);

block(history.schemaVersion === HISTORY_SCHEMA, "history_schema_invalid");
block(history.policy?.historicalEvidenceMayNotDetermineCurrentStatus === true, "history_current_status_isolation_missing");
block(history.policy?.historicalEvidenceMayNotSatisfyCurrentShaGates === true, "history_sha_gate_isolation_missing");
block(Array.isArray(history.entries), "history_entries_invalid");
for (const entry of history.entries ?? []) {
  const absolute = resolveBounded(entry.path);
  block(Boolean(absolute), `history_path_invalid:${String(entry.path ?? "")}`);
  block(entry.operational === false && entry.classification === "HISTORICAL", `history_not_isolated:${entry.path}`);
  if (!absolute || fs.existsSync(absolute)) continue;
  if (manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE) {
    omittedHistoricalEntries.push(entry.path);
  } else {
    blockers.push(`history_entry_missing:${entry.path}`);
  }
}

block(
  manifestProfile === PASS35_MANIFEST_PROFILES.WORKSPACE
    || manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE,
  "manifest_profile_invalid",
);
blockers.push(...validatePass35ManifestSet(manifestSet, { rootPath: root }));

const sourceIdentity = manifestSet.parsed.sourceIdentity;
block(
  sourceIdentity?.currentReleasePointer?.path === POINTER_PATH
    && sourceIdentity?.currentReleasePointer?.sha256 === sha256(pointerBytes),
  "source_identity_current_pointer_binding_invalid",
);

const preGates = JSON.parse(fs.readFileSync(path.join(root, pointer.preGatePath), "utf8"));
const productCatalog = JSON.parse(fs.readFileSync(path.join(root, pointer.productCellCatalogPath), "utf8"));
const statusRegister = JSON.parse(fs.readFileSync(path.join(root, pointer.currentStatusRegisterPath), "utf8"));
const statusSummary = JSON.parse(fs.readFileSync(path.join(root, pointer.currentStatusSummaryPath), "utf8"));
const masterMap = manifestSet.parsed.masterMap;
const a57Contract = JSON.parse(fs.readFileSync(path.join(root, A57_CONTRACT_PATH), "utf8"));
const a57Receipt = JSON.parse(fs.readFileSync(path.join(root, A57_RECEIPT_PATH), "utf8"));

block(preGates.candidateId === pointer.candidateId, "pre_gates_candidate_mismatch");
block(preGates.promotionAllowed === false, "pre_gates_promotion_must_be_false");
block(
  Object.values(preGates.preGates ?? {}).some((gate) => gate?.status === "BLOCKED"),
  "pre_gates_must_preserve_blocked_exit",
);
block(
  Array.isArray(productCatalog.productCells)
    && productCatalog.productCells.every((cell) => cell.sellEnabled === false),
  "product_catalog_sell_enabled_cell_present",
);
block(
  statusRegister.canonicalCurrentTruth === true
    && statusRegister.globalDecision === "NO_GO"
    && statusRegister.promotionAllowed === false
    && statusRegister.sellEnabledCount === 0,
  "current_status_register_no_go_boundary_invalid",
);
block(
  statusSummary.globalDecision === "NO_GO"
    && statusSummary.promotionAllowed === false
    && statusSummary.sellEnabledCount === 0
    && statusSummary.sourceRevisionId === statusRegister.sourceRevisionId,
  "current_status_summary_no_go_boundary_invalid",
);
block(
  masterMap?.releaseId === null
    && masterMap?.promotionAllowed === false
    && masterMap?.readinessScoreIssued === false
    && masterMap?.sellEnabledProductCells === 0
    && /^NO_GO_OFFLINE_/u.test(masterMap?.status ?? ""),
  "master_map_no_go_boundary_invalid",
);
block(
  a57Contract.revisionId === A57_REVISION
    && a57Contract.parentEvidenceTrust?.signatureAlgorithm === "ed25519"
    && a57Contract.parentEvidenceTrust?.a55PublicKeySpkiSha256 === null
    && a57Contract.parentEvidenceTrust?.a56PublicKeySpkiSha256 === null
    && a57Contract.parentEvidenceTrust?.requireDistinctSigners === true
    && a57Contract.parentEvidenceTrust?.status === "TRUST_ANCHORS_NOT_PINNED_NO_REAL_CANARY",
  "a57_real_canary_trust_boundary_invalid",
);
block(
  a57Receipt.revisionId === A57_REVISION
    && a57Receipt.fixtureMode === true
    && /^FIXTURE_/u.test(a57Receipt.decision ?? "")
    && a57Receipt.controlledCanaryExecuted === false
    && a57Receipt.killSwitchAndRollbackProven === false
    && a57Receipt.parentEvidence?.detachedSignaturesVerified === false
    && a57Receipt.parentEvidence?.fixtureSignatureBypassNoCredit === true
    && a57Receipt.saleEnabled === false
    && a57Receipt.liveProven === false
    && a57Receipt.productionApproved === false
    && a57Receipt.productionPaymentsProven === false,
  "a57_fixture_must_not_receive_real_canary_credit",
);

const uniqueBlockers = [...new Set(blockers)].sort();
const result = {
  schemaVersion: "velmere.current-release-verification.v2",
  status: uniqueBlockers.length ? "FAIL" : "PASS_OFFLINE_CANDIDATE_NO_PROMOTION",
  candidateId: pointer.candidateId ?? null,
  releaseId: pointer.releaseId ?? null,
  sourceRevisionId: pointer.sourceRevisionId ?? null,
  currentStatusRevisionId: statusRegister.sourceRevisionId ?? null,
  acceptanceRevisionId: a57Contract.revisionId ?? null,
  manifestProfile,
  pointerSha256: sha256(Buffer.from(canonical(pointer))),
  pointerBytesSha256: sha256(pointerBytes),
  historicalEntryCount: history.entries?.length ?? 0,
  omittedHistoricalEntryCount: omittedHistoricalEntries.length,
  omittedHistoricalEntries,
  globalDecision: "NO_GO",
  productionPromotionAllowed: false,
  sellEnabledCount: 0,
  liveProven: false,
  realCanaryStatus: "NOT_EXECUTED_NOT_CREDITED",
  blockers: uniqueBlockers,
  truthBoundary: "Verifies the PASS35 v2 offline-candidate pointer, fail-closed NO_GO/sale boundaries, canonical artifact-set integrity, and historical isolation. It does not prove current source-tree identity, external assurance, a real A57 canary, staging, LIVE operation, customer value, or production readiness; those require their dedicated gates.",
};

console.log(JSON.stringify(result, null, 2));
if (uniqueBlockers.length) process.exit(1);
