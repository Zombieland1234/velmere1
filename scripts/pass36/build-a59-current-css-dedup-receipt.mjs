#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildCurrentCssDedupScan,
  CURRENT_CSS_DEDUP_SCHEMA,
  CURRENT_CSS_DEDUP_STATUS,
} from "./a59-current-css-dedup-lib.mjs";
import { sha256 } from "./a59-current-identity-lib.mjs";

const root = process.cwd();
const writeMode = process.argv.includes("--write");
const policyPath = path.join(root, "config/pass36/a59-build-graph-route-css-budget-recovery.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(root, policy.buildGraphProfilePath), "utf8"));
const compactionReceipt = JSON.parse(fs.readFileSync(path.join(root, policy.cssReceiptPath), "utf8"));
const destination = path.join(root, policy.cssExactDedupReceiptPath);
const existing = JSON.parse(fs.readFileSync(destination, "utf8"));

const priorReplayReceipt = existing.schemaVersion === CURRENT_CSS_DEDUP_SCHEMA
  ? existing.priorThreeFileReplay?.receipt ?? existing.historicalA39?.receipt
  : existing;
if (
  !priorReplayReceipt
  || priorReplayReceipt.status !== "PASS_A39_CSS_EXACT_DUPLICATES_REMOVED"
  || priorReplayReceipt.writeMode !== true
  || !Array.isArray(priorReplayReceipt.files)
  || priorReplayReceipt.files.length !== 3
) {
  throw new Error("a59_prior_three_file_exact_dedup_replay_invalid");
}
const priorReplayBytes = `${JSON.stringify(priorReplayReceipt, null, 2)}\n`;
const priorReplayReceiptSha256 = sha256(priorReplayBytes);
const expectedPriorReplaySha256 = policy.currentIdentityBinding?.css?.priorThreeFileReplayReceiptSha256;
if (priorReplayReceiptSha256 !== expectedPriorReplaySha256) {
  throw new Error(`a59_prior_three_file_exact_dedup_replay_sha_mismatch:${priorReplayReceiptSha256}:${expectedPriorReplaySha256}`);
}

const historicalRemovalPath = policy.currentIdentityBinding?.css?.historicalA39RemovalReceiptPath;
const historicalRemovalBytes = fs.readFileSync(path.join(root, historicalRemovalPath));
const historicalRemovalReceiptSha256 = sha256(historicalRemovalBytes);
const expectedHistoricalRemovalSha256 = policy.currentIdentityBinding?.css?.historicalA39RemovalReceiptSha256;
if (historicalRemovalReceiptSha256 !== expectedHistoricalRemovalSha256) {
  throw new Error(`a59_historical_a39_removal_receipt_sha_mismatch:${historicalRemovalReceiptSha256}:${expectedHistoricalRemovalSha256}`);
}
const historicalRemovalReceipt = JSON.parse(historicalRemovalBytes.toString("utf8"));
if (
  historicalRemovalReceipt.status !== "PASS_A39_CSS_EXACT_DUPLICATES_REMOVED"
  || historicalRemovalReceipt.writeMode !== true
  || historicalRemovalReceipt.totals?.duplicateGroups !== 2
  || historicalRemovalReceipt.totals?.duplicateExtras !== 2
  || historicalRemovalReceipt.totals?.removedBytes !== 430
) {
  throw new Error("a59_historical_a39_removal_receipt_invalid");
}

const scan = buildCurrentCssDedupScan({
  root,
  profileCssPressure: profile.cssPressure,
  receiptFiles: compactionReceipt.files,
  allowedRoots: policy.currentIdentityBinding.css.allowedRoots,
});
if (scan.totals.currentDuplicateExtras !== 0) {
  throw new Error(`a59_current_css_exact_duplicates_present:${scan.totals.currentDuplicateExtras}`);
}

const receipt = {
  schemaVersion: CURRENT_CSS_DEDUP_SCHEMA,
  revisionId: "VELMERE_PASS36_A102R44P46_A59_CURRENT_CSS_EXACT_DEDUP_READ_ONLY_CLOSURE",
  generatedAt: policy.currentIdentityBinding.generatedAt,
  status: CURRENT_CSS_DEDUP_STATUS,
  evidenceClass: "TESTED_STATIC",
  writeMode: false,
  cssMutationApplied: false,
  canonicalProfilePath: policy.buildGraphProfilePath,
  compactionReceiptPath: policy.cssReceiptPath,
  profileIdentity: scan.profileIdentity,
  files: scan.files,
  totals: scan.totals,
  historicalA39Removal: {
    scope: "HISTORICAL_A39_THREE_FILE_WRITE_MODE_REMOVAL_EVIDENCE_ONLY",
    sourcePath: historicalRemovalPath,
    receiptSha256: historicalRemovalReceiptSha256,
    receipt: historicalRemovalReceipt,
  },
  priorThreeFileReplay: {
    scope: "R44P46_THREE_FILE_ZERO_DELTA_REPLAY_EVIDENCE_ONLY",
    receiptSha256: priorReplayReceiptSha256,
    receipt: priorReplayReceipt,
  },
  truthBoundary: "This receipt recomputes intra-file exact canonicalized block-rule and at-rule-statement duplicate closure read-only for the exact 26-path canonical CSS profile and binds every current file path, byte length and SHA-256. Historical A39 removal evidence (2 groups, 2 extras, 430 bytes) is kept distinct from the later R44P46 three-file zero-delta replay. No CSS product bytes are changed, and no browser, staging, LIVE, sale, customer, legal or provider-rights credit is claimed.",
};
const bytes = `${JSON.stringify(receipt, null, 2)}\n`;
if (writeMode) fs.writeFileSync(destination, bytes, "utf8");
console.log(JSON.stringify({
  status: receipt.status,
  writeMode,
  cssMutationApplied: false,
  destination: path.relative(root, destination),
  receiptSha256: sha256(bytes),
  profileIdentity: receipt.profileIdentity,
  totals: receipt.totals,
  historicalA39RemovalReceiptSha256: historicalRemovalReceiptSha256,
  priorThreeFileReplayReceiptSha256: priorReplayReceiptSha256,
}, null, 2));
