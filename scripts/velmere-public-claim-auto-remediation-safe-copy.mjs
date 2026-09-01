#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4360";
const FIREWALL_SUMMARY = path.join("artifacts", "live-receipts", "public-claim-firewall", "public-claim-firewall-summary.json");
const RC_SUMMARY = path.join("artifacts", "live-receipts", "final-release-candidate", "final-public-release-candidate-summary.json");
const SUMMARY = path.join("artifacts", "live-receipts", "public-claim-firewall", "claim-auto-remediation-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "public-claim-firewall", "claim-auto-remediation-failure.json");
const SAFE_COPY_PACK = path.join("artifacts", "live-receipts", "public-claim-firewall", "safe-launch-copy-pack.json");
const FORBIDDEN_VALUE_PATTERNS = ["sk_live_", "sk_test_", "whsec_", "bearer ", "basic ", "seed phrase", "private key", "set-cookie", "authorization:", "access_token", "refresh_token"];
const REMEDIATIONS = {
  topka_swiata_live: "Velmère is prepared-only until signed public receipts, hosted proof and domain proof are green.",
  certik_level_verified: "Velmère does not claim CertiK-level verification; it publishes evidence-bound internal proof status only.",
  openzeppelin_grade_audited: "Velmère does not claim OpenZeppelin-grade auditing without independent public audit records.",
  trail_of_bits_equivalent: "Velmère does not claim Trail of Bits equivalence without independent expert review and public artifacts.",
  chainsecurity_equivalent: "Velmère does not claim ChainSecurity equivalence without independent public report history.",
  hundred_percent_verified_live: "Velmère reports prepared/live status per receipt; 100% live claims require every current signed receipt to be green.",
  guaranteed_risk_or_profit: "Velmère provides risk intelligence and never guarantees profit, safety or outcomes.",
  world_class_live_without_prepared_only: "Velmère is building toward world-class proof discipline, but live status depends on current receipts.",
  live_proof_claim: "Velmère uses receipt-backed proof status; live wording is allowed only after final RC seal is green.",
  external_auditor_equivalence: "Velmère uses evidence-bound internal proof gates and does not claim external-auditor equivalence.",
};
function parseArgs(argv) {
  const out = { sourceRoot: ".", allowMissing: false, writeReceipt: true, maxRows: 120 };
  for (const arg of argv) {
    if (arg === "--allow-missing") out.allowMissing = true;
    else if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg.startsWith("--source-root=")) out.sourceRoot = arg.slice("--source-root=".length) || ".";
    else if (arg.startsWith("--max-rows=")) out.maxRows = Number.parseInt(arg.slice("--max-rows=".length), 10) || out.maxRows;
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function parseJson(text) { try { return { ok: true, value: JSON.parse(text) }; } catch (error) { return { ok: false, value: null, error: error instanceof Error ? error.message : String(error) }; } }
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(String(text)).digest("hex")}`; }
function leaks(text) {
  const lower = String(text || "").toLowerCase();
  return [...new Set(FORBIDDEN_VALUE_PATTERNS.filter((token) => lower.includes(token)))];
}
function normalizeRuleId(row) {
  const raw = String(row?.ruleId || row?.unsafePatternId || "external_auditor_equivalence");
  if (REMEDIATIONS[raw]) return raw;
  if (/certik/i.test(raw)) return "certik_level_verified";
  if (/openzeppelin/i.test(raw)) return "openzeppelin_grade_audited";
  if (/trail/i.test(raw)) return "trail_of_bits_equivalent";
  if (/chain/i.test(raw)) return "chainsecurity_equivalent";
  if (/100|hundred/i.test(raw)) return "hundred_percent_verified_live";
  if (/guarantee|profit|risk/i.test(raw)) return "guaranteed_risk_or_profit";
  if (/live/i.test(raw)) return "live_proof_claim";
  return "external_auditor_equivalence";
}
function remediationFor(row, index) {
  const ruleId = normalizeRuleId(row);
  const severity = String(row?.severity || "high");
  const critical = severity === "critical" || ["topka_swiata_live", "certik_level_verified", "openzeppelin_grade_audited", "trail_of_bits_equivalent", "chainsecurity_equivalent", "hundred_percent_verified_live", "guaranteed_risk_or_profit"].includes(ruleId);
  return {
    schema: "velmere.pass4360.claim_auto_remediation_row.v1",
    passId: PASS_ID,
    rowId: `${ruleId}-${index}`,
    ruleId,
    severity,
    file: row?.file || null,
    line: row?.line || null,
    matched: row?.matched || row?.forbiddenClaim || null,
    originalContextHash: row?.contextHash || (row?.matched ? sha256(row.matched) : null),
    safePreparedOnlyReplacement: REMEDIATIONS[ruleId],
    replacementHash: sha256(REMEDIATIONS[ruleId]),
    requiresManualOperatorReview: true,
    autoPatchApplied: false,
    green: false,
    reason: critical ? "critical_claim_requires_manual_review_and_rc_green" : "unsafe_claim_requires_manual_review",
    blocksPublicTopkaLive: true,
    blocksReleaseCandidateSeal: true,
  };
}
const args = parseArgs(process.argv.slice(2));
const root = args.sourceRoot;
const firewallText = read(path.join(root, FIREWALL_SUMMARY));
const rcText = read(path.join(root, RC_SUMMARY));
const firewallParsed = firewallText ? parseJson(firewallText) : { ok: false, value: null, error: "missing" };
const rcParsed = rcText ? parseJson(rcText) : { ok: false, value: null, error: "missing" };
const firewallLeakTokens = leaks(firewallText);
const rcLeakTokens = leaks(rcText);
const unsafeRows = firewallParsed.ok && Array.isArray(firewallParsed.value?.unsafeClaimRows) ? firewallParsed.value.unsafeClaimRows.slice(0, args.maxRows) : [];
const remediationRows = unsafeRows.map(remediationFor);
const rcReady = rcParsed.ok && rcParsed.value?.ok === true && rcParsed.value?.releaseDecision === "READY_TO_SEAL";
const firewallGreen = firewallParsed.ok && firewallParsed.value?.ok === true && firewallParsed.value?.claimDecision === "CLAIMS_READY_FOR_OPERATOR_REVIEW";
const safeCopyPack = {
  schema: "velmere.pass4360.safe_launch_copy_pack.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  status: rcReady && firewallGreen && remediationRows.length === 0 ? "READY_FOR_OPERATOR_REVIEW" : "PREPARED_ONLY_SAFE_COPY_REQUIRED",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  approvedPreparedOnlyCopy: [
    "Velmère is prepared-only until every required public proof receipt, hosted freshness check and signed manifest is green.",
    "Velmère provides evidence-bound risk intelligence and never guarantees profit, safety or outcomes.",
    "Public proof status may reference redacted receipt hashes, timestamps and blocker states only.",
    "Velmère does not claim CertiK, OpenZeppelin, Trail of Bits or ChainSecurity equivalence without independent public audit history.",
  ],
  forbiddenUntilReady: [
    "topka świata LIVE",
    "CertiK-level verified",
    "OpenZeppelin-grade audited",
    "Trail of Bits equivalent",
    "ChainSecurity equivalent",
    "100% verified live proof",
    "guaranteed profit",
    "guaranteed safety",
    "guaranteed risk protection",
  ],
  remediationRows,
  operatorChecklist: [
    "Replace every unsafe claim with prepared-only wording or delete it.",
    "Rerun proof:public-claim-firewall and proof:public-claim:auto-remediation.",
    "Keep public claim copy blocked until final release candidate and signed manifest are green.",
  ],
};
const summaryOk = rcReady && firewallGreen && remediationRows.length === 0 && firewallLeakTokens.length === 0 && rcLeakTokens.length === 0;
const summary = {
  schema: "velmere.pass4360.claim_auto_remediation_safe_launch_copy_summary.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  ok: summaryOk,
  status: summaryOk ? "executed_pass" : "blocked_until_safe_copy_review_and_rc_ready",
  decision: summaryOk ? "SAFE_COPY_READY_FOR_OPERATOR_REVIEW" : "BLOCKED_PREPARED_ONLY_COPY_REQUIRED",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  sourceRoot: root,
  firewallSummaryPath: FIREWALL_SUMMARY,
  firewallSummaryPresent: Boolean(firewallText),
  firewallSummaryParsed: firewallParsed.ok,
  firewallGreen,
  rcSummaryPath: RC_SUMMARY,
  rcSummaryPresent: Boolean(rcText),
  rcSummaryParsed: rcParsed.ok,
  rcReady,
  unsafeClaimCount: unsafeRows.length,
  remediationRowCount: remediationRows.length,
  generatedSafeCopyPack: true,
  safeCopyPackPath: SAFE_COPY_PACK,
  remediationRows,
  publicLeakTokens: [...new Set([...firewallLeakTokens, ...rcLeakTokens])],
  blocksPublicTopkaLive: true,
  blocksReleaseCandidateSeal: true,
  nextActions: summaryOk ? ["Operator may review safe launch copy with signed receipt hashes only."] : ["Review unsafe claim rows, apply safe prepared-only replacements, rerun claim firewall and auto-remediation after RC seal is green.", "Keep all public, PDF, Angel and AI copy prepared-only until PASS4360 is green."],
};
if (args.writeReceipt || summary.generatedSafeCopyPack) writeJson(path.join(root, SAFE_COPY_PACK), safeCopyPack);
if (args.writeReceipt || summary.ok) writeJson(path.join(root, SUMMARY), summary);
if (!summary.ok) {
  const failure = {
    schema: "velmere.pass4360.claim_auto_remediation_safe_launch_copy_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    status: summary.status,
    decision: summary.decision,
    failureArtifact: FAILURE,
    summaryPath: SUMMARY,
    safeCopyPackPath: SAFE_COPY_PACK,
    rcReady,
    firewallGreen,
    unsafeClaimCount: unsafeRows.length,
    remediationRowCount: remediationRows.length,
    publicLeakTokens: summary.publicLeakTokens,
    sampleRemediationRows: remediationRows.slice(0, 25),
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    nextActions: summary.nextActions,
  };
  writeJson(path.join(root, FAILURE), failure);
  console.error(`${PASS_ID} claim auto-remediation BLOCKED: rcReady=${rcReady}; firewallGreen=${firewallGreen}; remediationRows=${remediationRows.length}; leaks=${summary.publicLeakTokens.length}`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} claim auto-remediation READY FOR OPERATOR REVIEW: ${SUMMARY}`);
}
