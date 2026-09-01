#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4361";
const SUMMARY = path.join("artifacts", "live-receipts", "release-evidence-ledger", "release-evidence-ledger-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "release-evidence-ledger", "release-evidence-ledger-failure.json");
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "];
const REQUIRED_ROWS = [
  ["live_receipt_store_quarantine_green", "artifacts/live-receipts/live-store-quarantine/live-store-quarantine-summary.json", ["ok", "decision", "requiredRowCount", "greenRowCount", "rootHash"], "executed_pass"],
  ["public_proof_transparency_export_green", "artifacts/public-proof/transparency/public-proof-transparency-export-summary.json", ["ok", "decision", "publicIndexPath", "rootHash"], "executed_pass"],
  ["live_receipt_store_tamper_evidence_green", "artifacts/live-receipts/live-store-tamper-evidence/live-receipt-store-tamper-evidence-summary.json", ["ok", "decision", "chainHead", "appendOnlyTrailPath", "rootHash"], "executed_pass"],
  ["operator_execution_handoff_green", "artifacts/live-receipts/operator-execution-handoff/operator-execution-handoff-summary.json", ["ok", "decision", "finalWindowsCommand", "executionPhases", "rootHash"], "executed_pass"],
  ["post_run_receipt_import_green", "artifacts/live-receipts/operator-post-run-import/operator-post-run-import-summary.json", ["ok", "decision", "requiredRowCount", "greenRowCount", "rootHash"], "executed_pass"],
  ["post_run_receipt_promotion_green", "artifacts/live-receipts/operator-post-run-promotion/operator-post-run-promotion-summary.json", ["ok", "decision", "promotedRowCount", "rootHash"], "executed_pass"],
  ["final_preflight_ready", "artifacts/live-receipts/final-proof-preflight/final-proof-preflight-summary.json", ["ok", "finalDecision", "requiredRowCount", "greenRowCount"], "ready"],
  ["signed_operator_manifest_verified", "artifacts/live-receipts/operator/VELMERE_OPERATOR_SIGNED_LIVE_PROOF_MANIFEST.json", ["signature", "requiredReceiptRows", "allRequiredReceiptsPassed"], "signed_live_manifest"],
  ["hosted_public_route_smoke_green", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-summary.json", ["ok", "baseUrl", "scenarioResults", "hostedValidation"], "executed_pass"],
  ["hosted_freshness_expiry_green", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-freshness-summary.json", ["ok", "freshnessRows", "maxAgeMs", "checkedReceiptCount"], "executed_pass"],
  ["zero_skip_receipt_coverage_green", "artifacts/live-receipts/zero-skip-coverage/zero-skip-coverage-summary.json", ["ok", "requiredReceiptCount", "greenReceiptCount"], "executed_pass"],
  ["domain_live_receipt_matrix_green", "artifacts/live-receipts/domain-live-receipts/domain-live-receipt-matrix-summary.json", ["ok", "laneCount", "greenLaneCount", "laneRows"], "executed_pass"],
  ["materialized_required_bundle_green", "artifacts/live-receipts/required-bundle/materialized/materialized-required-live-receipt-bundle-summary.json", ["ok", "requiredRowCount", "greenRowCount"], "executed_pass"],
  ["required_live_receipt_bundle_green", "artifacts/live-receipts/required-bundle/required-live-receipt-bundle-summary.json", ["ok", "allRequiredReceiptsPassed", "receiptRows"], "executed_pass"],
  ["mega_bindings_green", "artifacts/live-receipts/mega-bindings/mega-live-proof-bindings-summary.json", ["ok", "sourceCheckRows", "requiredReceiptRows"], "executed_pass"],
  ["public_claim_firewall_green", "artifacts/live-receipts/public-claim-firewall/public-claim-firewall-summary.json", ["ok", "claimDecision", "safeCopyMode", "unsafeClaimCount"], "executed_pass"],
  ["claim_auto_remediation_green", "artifacts/live-receipts/public-claim-firewall/claim-auto-remediation-summary.json", ["ok", "decision", "generatedSafeCopyPack", "remediationRowCount"], "executed_pass"],
  ["safe_launch_copy_pack_present", "artifacts/live-receipts/public-claim-firewall/safe-launch-copy-pack.json", ["status", "approvedPreparedOnlyCopy", "forbiddenUntilReady", "remediationRows"], "safe_copy_pack_present"],
];
function parseArgs(argv) {
  const out = { sourceRoot: ".", allowMissing: false, writeReceipt: true, maxAgeMs: 20 * 60 * 1000, shaIndex: "VELMERE_PASS4361_SHA256SUMS.txt" };
  for (const arg of argv) {
    if (arg === "--allow-missing") out.allowMissing = true;
    else if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg.startsWith("--source-root=")) out.sourceRoot = arg.slice("--source-root=".length) || ".";
    else if (arg.startsWith("--max-age-ms=")) out.maxAgeMs = Number.parseInt(arg.slice("--max-age-ms=".length), 10) || out.maxAgeMs;
    else if (arg.startsWith("--sha-index=")) out.shaIndex = arg.slice("--sha-index=".length) || out.shaIndex;
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}
`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(String(text)).digest("hex")}`; }
function parseJson(text) { try { return { ok: true, value: JSON.parse(text) }; } catch (error) { return { ok: false, value: null, error: error instanceof Error ? error.message : String(error) }; } }
function flattenKeys(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    keys.push(full);
    keys.push(...flattenKeys(child, full));
  }
  return keys;
}
function fieldPresent(value, field) {
  if (!value || typeof value !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(value, field)) return true;
  return flattenKeys(value).some((key) => key === field || key.endsWith(`.${field}`));
}
function leakTokens(text, value) {
  const lower = String(text || "").toLowerCase();
  const keyText = flattenKeys(value).join("\n").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token) || keyText.includes(token)))];
}
function decision(value, lane) {
  if (!value || typeof value !== "object") return "not_green";
  if (lane === "safe_launch_copy_pack_present" && Array.isArray(value.approvedPreparedOnlyCopy) && Array.isArray(value.forbiddenUntilReady)) return "safe_copy_pack_present";
  if (value.ok === true || value.status === "PASS" || value.status === "executed_pass" || value.status === "LIVE_GREEN") return "executed_pass";
  if (value.finalDecision === "READY" && value.ok === true) return "ready";
  if ((value.signature || value.signatureHex) && (value.allRequiredReceiptsPassed === true || Array.isArray(value.requiredReceiptRows))) return "signed_live_manifest";
  return "not_green";
}
function freshness(value, lane, maxAgeMs) {
  const requires = lane.includes("hosted") || lane.includes("final") || lane.includes("signed_operator") || lane.includes("claim") || lane.includes("domain") || lane.includes("zero_skip") || lane.includes("bundle") || lane.includes("mega");
  if (!requires) return { ok: true, ageMs: null, reason: "static_or_copy_pack" };
  const candidates = [value?.generatedAtIso, value?.completedAtIso, value?.requestCompletedAtIso].filter(Boolean);
  if (!candidates.length) return { ok: false, ageMs: null, reason: "timestamp_missing" };
  const newest = Math.max(...candidates.map((x) => Date.parse(String(x))).filter(Number.isFinite));
  if (!Number.isFinite(newest)) return { ok: false, ageMs: null, reason: "timestamp_parse_failed" };
  const ageMs = Date.now() - newest;
  return { ok: ageMs >= 0 && ageMs <= maxAgeMs, ageMs, reason: ageMs <= maxAgeMs ? "fresh" : "expired" };
}
function row(root, spec, maxAgeMs) {
  const [lane, relPath, fields, requiredDecision] = spec;
  const text = read(path.join(root, relPath));
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { ok: false, value: null, error: "missing" };
  const missingFields = parsed.ok ? fields.filter((field) => !fieldPresent(parsed.value, field)) : fields;
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const actualDecision = parsed.ok ? decision(parsed.value, lane) : "missing";
  const fresh = parsed.ok ? freshness(parsed.value, lane, maxAgeMs) : { ok: false, ageMs: null, reason: "missing" };
  const status = !exists ? "missing" : !parsed.ok ? "parse_failed" : leaks.length ? "redaction_failed" : missingFields.length ? "field_missing" : !fresh.ok ? `freshness_${fresh.reason}` : actualDecision === requiredDecision ? "executed_pass" : "not_required_decision";
  return {
    schema: "velmere.pass4361.release_evidence_ledger_row.v1",
    passId: PASS_ID,
    lane,
    canonicalPath: relPath,
    exists,
    parsedOk: parsed.ok,
    status,
    decision: actualDecision,
    requiredDecision,
    green: status === "executed_pass",
    expectedFields: fields,
    missingFields,
    safePublicFieldsOnly: leaks.length === 0,
    publicLeakTokens: leaks,
    freshness: fresh,
    sha256: exists ? sha256(text) : null,
    bytes: exists ? Buffer.byteLength(text, "utf8") : 0,
    blocksPublicTopkaLive: true,
    blocksReleaseCandidateSeal: true,
  };
}
function shaIndexRow(root, shaIndex) {
  const text = read(path.join(root, shaIndex));
  const exists = text.length > 0;
  const hasZip = /velmere_pass4361_.*\.zip/.test(text);
  const hasTxt = /VELMERE_PASS4361_.*\.txt/.test(text) || /VELMERE_PASS4361_MASTER_PLAN/.test(text);
  const green = exists && hasZip && hasTxt;
  return {
    schema: "velmere.pass4361.release_evidence_ledger_row.v1",
    passId: PASS_ID,
    lane: "release_sha256_index_present",
    canonicalPath: shaIndex,
    exists,
    parsedOk: true,
    status: green ? "executed_pass" : exists ? "sha_index_incomplete" : "missing",
    decision: green ? "release_index_present" : "not_green",
    requiredDecision: "release_index_present",
    green,
    expectedFields: ["sha256_index"],
    missingFields: green ? [] : ["zip_or_txt_sha256_entry"],
    safePublicFieldsOnly: true,
    publicLeakTokens: [],
    freshness: { ok: true, ageMs: null, reason: "release_index_is_static_artifact" },
    sha256: exists ? sha256(text) : null,
    bytes: exists ? Buffer.byteLength(text, "utf8") : 0,
    blocksPublicTopkaLive: true,
    blocksReleaseCandidateSeal: true,
  };
}
function rootHash(rows) {
  const material = rows.map((item) => `${item.lane}:${item.sha256 || "missing"}:${item.status}`).sort().join("\n");
  return sha256(material);
}
function agreement(rows) {
  const byLane = new Map(rows.map((item) => [item.lane, item]));
  const problems = [];
  if (byLane.get("public_claim_firewall_green")?.green && !byLane.get("claim_auto_remediation_green")?.green) problems.push("claim_firewall_without_auto_remediation_green");
  if (byLane.get("claim_auto_remediation_green")?.green && !byLane.get("safe_launch_copy_pack_present")?.green) problems.push("claim_auto_remediation_without_safe_copy_pack");
  if (byLane.get("hosted_public_route_smoke_green")?.green && !byLane.get("hosted_freshness_expiry_green")?.green) problems.push("hosted_smoke_without_freshness_green");
  if (byLane.get("signed_operator_manifest_verified")?.green && !byLane.get("required_live_receipt_bundle_green")?.green) problems.push("signed_manifest_without_required_bundle_green");
  return problems;
}
const args = parseArgs(process.argv.slice(2));
const rows = [...REQUIRED_ROWS.map((spec) => row(args.sourceRoot, spec, args.maxAgeMs)), shaIndexRow(args.sourceRoot, args.shaIndex)];
const failedRows = rows.filter((item) => !item.green);
const agreementProblems = agreement(rows);
const ledgerRootHash = rootHash(rows);
const ok = failedRows.length === 0 && agreementProblems.length === 0;
const summary = {
  schema: "velmere.pass4361.release_evidence_ledger_provenance_summary.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  ok,
  decision: ok ? "RELEASE_EVIDENCE_LEDGER_GREEN" : "BLOCKED_RELEASE_EVIDENCE_LEDGER_INCOMPLETE",
  status: ok ? "executed_pass" : "blocked_until_all_release_evidence_rows_green",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  sourceRoot: args.sourceRoot,
  requiredRowCount: rows.length,
  greenRowCount: rows.length - failedRows.length,
  failedRowCount: failedRows.length,
  rootHash: ledgerRootHash,
  rows,
  failedRows,
  agreementProblems,
  blocksReleaseCandidateSeal: true,
  nextAction: ok ? "Run final preflight and release-candidate seal with this ledger hash bound into the release pack." : "Generate every required live receipt, safe-copy pack and SHA256 release index, then rerun proof:release-evidence-ledger before final RC seal.",
};
if (args.writeReceipt || ok) writeJson(path.join(args.sourceRoot, SUMMARY), summary);
if (!ok) {
  const failure = {
    schema: "velmere.pass4361.release_evidence_ledger_provenance_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    decision: summary.decision,
    summaryPath: SUMMARY,
    failureArtifact: FAILURE,
    failedRows,
    agreementProblems,
    rootHash: ledgerRootHash,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    nextAction: summary.nextAction,
  };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} release evidence ledger BLOCKED: ${failedRows.length}/${rows.length} rows not green, ${agreementProblems.length} agreement problems.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} release evidence ledger GREEN: ${SUMMARY}`);
}
