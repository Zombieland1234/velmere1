#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4359";
const SUMMARY = path.join("artifacts", "live-receipts", "public-claim-firewall", "public-claim-firewall-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "public-claim-firewall", "public-claim-firewall-failure.json");
const RC_SUMMARY = path.join("artifacts", "live-receipts", "final-release-candidate", "final-public-release-candidate-summary.json");
const FORBIDDEN_VALUE_PATTERNS = ["sk_live_", "sk_test_", "whsec_", "bearer ", "basic ", "seed phrase", "private key", "set-cookie", "authorization:"];
const UNSAFE_CLAIM_PATTERNS = [
  { id: "topka_swiata_live", pattern: /topka\s+(świata|swiata)\s+live/iu, severity: "critical" },
  { id: "certik_level_verified", pattern: /certik[-\s]*(level|grade|verified|equivalent|audited)/iu, severity: "critical" },
  { id: "openzeppelin_grade_audited", pattern: /openzeppelin[-\s]*(level|grade|verified|equivalent|audited)/iu, severity: "critical" },
  { id: "trail_of_bits_equivalent", pattern: /trail\s+of\s+bits[-\s]*(level|grade|verified|equivalent|audited)/iu, severity: "critical" },
  { id: "chainsecurity_equivalent", pattern: /chainsecurity[-\s]*(level|grade|verified|equivalent|audited)/iu, severity: "critical" },
  { id: "hundred_percent_verified_live", pattern: /100\s*%\s*(verified|live|safe|secure|audited)/iu, severity: "critical" },
  { id: "guaranteed_risk_or_profit", pattern: /(guaranteed|gwarantowan[ey]|pewn[ey])\s+(profit|zysk|safety|bezpieczeństwo|bezpieczenstwo|return|zwrot)/iu, severity: "critical" },
  { id: "world_class_live_without_prepared_only", pattern: /world[-\s]*class\s+(live|verified|audit|audited|proof)/iu, severity: "high" },
  { id: "live_proof_claim", pattern: /live\s+proof/iu, severity: "medium" },
];
const SCAN_ROOTS = ["app", "components", "lib", "messages"];
const EXCLUDED_PATH_PARTS = [
  `${path.sep}lib${path.sep}market-integrity${path.sep}`,
  `${path.sep}scripts${path.sep}`,
  `${path.sep}artifacts${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}repo${path.sep}`,
];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md"]);
function parseArgs(argv) {
  const out = { sourceRoot: ".", allowMissing: false, writeReceipt: true, maxRows: 80 };
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
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`; }
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (EXCLUDED_PATH_PARTS.some((part) => `${abs}${path.sep}`.includes(part))) continue;
      walk(abs, out);
    } else if (SCAN_EXT.has(path.extname(item.name))) out.push(abs);
  }
  return out;
}
function lineNumber(text, index) { return text.slice(0, Math.max(0, index)).split(/\r?\n/).length; }
function collectClaims(root, maxRows) {
  const files = SCAN_ROOTS.flatMap((scanRoot) => walk(path.join(root, scanRoot))).filter((file) => !EXCLUDED_PATH_PARTS.some((part) => file.includes(part)));
  const rows = [];
  for (const file of files) {
    const text = read(file);
    if (!text) continue;
    for (const rule of UNSAFE_CLAIM_PATTERNS) {
      const regex = new RegExp(rule.pattern.source, `${rule.pattern.flags.includes("i") ? "i" : ""}${rule.pattern.flags.includes("u") ? "u" : ""}g`);
      let match;
      while ((match = regex.exec(text))) {
        const contextStart = Math.max(0, match.index - 90);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 90);
        const context = text.slice(contextStart, contextEnd).replace(/\s+/g, " ").trim();
        const hasSafeQualifier = /prepared[-\s]*only|blocked|not\s+live|no\s+public\s+live|until\s+.*receipts|claimAllowed\s*[:=]\s*false|publicTopkaLiveAllowed\s*[:=]\s*false/i.test(context);
        rows.push({
          ruleId: rule.id,
          severity: rule.severity,
          file: path.relative(root, file).replace(/\\/g, "/"),
          line: lineNumber(text, match.index),
          matched: match[0],
          hasSafeQualifier,
          green: hasSafeQualifier && rule.severity !== "critical",
          publicReviewRequired: true,
          contextHash: sha256(context),
        });
        if (rows.length >= maxRows) return rows;
      }
    }
  }
  return rows;
}
function leakTokens(text) {
  const lower = String(text || "").toLowerCase();
  return [...new Set(FORBIDDEN_VALUE_PATTERNS.filter((token) => lower.includes(token)))]
}
const args = parseArgs(process.argv.slice(2));
const root = args.sourceRoot;
const rcText = read(path.join(root, RC_SUMMARY));
const rcParsed = rcText ? parseJson(rcText) : { ok: false, value: null, error: "missing" };
const rcReady = rcParsed.ok && rcParsed.value?.ok === true && rcParsed.value?.releaseDecision === "READY_TO_SEAL" && rcParsed.value?.readyToSealPublicReleaseCandidate === true;
const claimRows = collectClaims(root, args.maxRows);
const unsafeRows = claimRows.filter((row) => !row.hasSafeQualifier || row.severity === "critical");
const criticalRows = unsafeRows.filter((row) => row.severity === "critical");
const rcLeaks = leakTokens(rcText);
const safeCopyMode = rcReady ? "LIVE_CLAIMS_REQUIRE_SIGNED_MANIFEST_AND_PUBLIC_RECEIPTS" : "PREPARED_ONLY_BLOCKED_FROM_LIVE_CLAIM";
const claimDecision = rcReady && unsafeRows.length === 0 && rcLeaks.length === 0 ? "CLAIMS_READY_FOR_OPERATOR_REVIEW" : "BLOCKED_UNTIL_RC_READY_AND_UNSAFE_CLAIMS_REVIEWED";
const launchReadinessPack = {
  currentPublicStatus: rcReady ? "release_candidate_ready_for_operator_review" : "prepared_only_blocked_from_live_claim",
  allowedPublicCopy: rcReady ? [
    "Velmère has a signed, receipt-backed release candidate pending operator publication.",
    "Public proof status may reference green receipts by hash and timestamp only.",
  ] : [
    "Velmère is prepared-only until final release candidate, hosted receipts, domain receipts and signed manifest are green.",
    "Public pages, AI and PDFs must not claim live verification, external-auditor equivalence or guaranteed safety.",
  ],
  forbiddenUntilReady: ["topka świata LIVE", "CertiK-level verified", "OpenZeppelin-grade audited", "Trail of Bits equivalent", "ChainSecurity equivalent", "100% verified live proof", "guaranteed risk protection"],
};
const summary = {
  schema: "velmere.pass4359.public_claim_firewall_launch_readiness_summary.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  ok: claimDecision === "CLAIMS_READY_FOR_OPERATOR_REVIEW",
  claimDecision,
  status: claimDecision === "CLAIMS_READY_FOR_OPERATOR_REVIEW" ? "executed_pass" : "blocked_until_rc_ready",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  sourceRoot: root,
  rcSummaryPath: RC_SUMMARY,
  rcSummaryPresent: Boolean(rcText),
  rcSummaryParsed: rcParsed.ok,
  rcReadyToSeal: rcReady,
  safeCopyMode,
  unsafeClaimCount: unsafeRows.length,
  criticalUnsafeClaimCount: criticalRows.length,
  scannedClaimCount: claimRows.length,
  unsafeClaimRows: unsafeRows,
  publicLeakTokens: rcLeaks,
  pdfAngelAiClaimLock: !rcReady,
  domainClaimLock: !rcReady,
  publicStatus: launchReadinessPack.currentPublicStatus,
  launchReadinessPack,
  nextActions: rcReady ? ["Review any remaining unsafe claim rows, then publish public-safe proof status with signed manifest hashes only."] : ["Execute full Windows Node24 runner, hosted route smoke, hosted freshness, domain matrix, zero-skip coverage, bundle/materializer, final preflight and signed operator manifest.", "Keep all marketing, PDF, Angel and AI copy in prepared-only wording until PASS4359 claim firewall turns green."],
  blocksPublicTopkaLive: true,
  blocksReleaseCandidateSeal: true,
};
if (args.writeReceipt || summary.ok) writeJson(path.join(root, SUMMARY), summary);
if (!summary.ok) {
  const failure = {
    schema: "velmere.pass4359.public_claim_firewall_launch_readiness_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    claimDecision,
    failureArtifact: FAILURE,
    summaryPath: SUMMARY,
    rcReadyToSeal: rcReady,
    unsafeClaimCount: unsafeRows.length,
    criticalUnsafeClaimCount: criticalRows.length,
    publicLeakTokens: rcLeaks,
    unsafeClaimRows: unsafeRows.slice(0, Math.min(25, unsafeRows.length)),
    nextActions: summary.nextActions,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
  };
  writeJson(path.join(root, FAILURE), failure);
  console.error(`${PASS_ID} public claim firewall BLOCKED: rcReady=${rcReady}; unsafeClaims=${unsafeRows.length}; leaks=${rcLeaks.length}`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} public claim firewall READY FOR OPERATOR REVIEW: ${SUMMARY}`);
}
