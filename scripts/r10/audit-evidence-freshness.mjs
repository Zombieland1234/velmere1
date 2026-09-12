import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const DEFAULT_MAX_FRESH_HOURS = 24;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const CURRENT_PRODUCTION_CLASSES = new Set([
  "CURRENT_STAGING_PROVEN",
  "CURRENT_RELEASE_PROVEN",
]);

const targets = [
  {
    id: "database_rls",
    rel: "artifacts/db/DATABASE_RLS_RECEIPT.json",
  },
  {
    id: "provider_truth",
    rel: "artifacts/providers/PASS4_PROVIDER_TRUTH_WITHHOLDING_RECEIPT.json",
  },
];

function isSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function isDigest(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function firstTimestamp(obj) {
  for (const key of ["executedAt", "observedAt", "verifiedAt", "generatedAt", "createdAt"]) {
    if (typeof obj?.[key] !== "string") continue;
    const parsed = Date.parse(obj[key]);
    if (Number.isFinite(parsed)) return { key, value: obj[key], ms: parsed };
  }
  return null;
}

export function assessEvidenceReceipt({
  targetId,
  parsed,
  candidateSha,
  nowMs = Date.now(),
  maxFreshHours = DEFAULT_MAX_FRESH_HOURS,
}) {
  const gaps = [];
  const timestamp = firstTimestamp(parsed);
  let ageHours = null;
  let fresh = false;
  let futureTimestamp = false;

  if (!timestamp) {
    gaps.push("timestamp_missing");
  } else {
    const deltaMs = nowMs - timestamp.ms;
    futureTimestamp = deltaMs < -MAX_FUTURE_SKEW_MS;
    if (futureTimestamp) {
      gaps.push("timestamp_in_future");
    } else {
      ageHours = Math.max(0, deltaMs) / 3_600_000;
      fresh = ageHours <= maxFreshHours;
      if (!fresh) gaps.push(`stale_${ageHours.toFixed(1)}h`);
    }
  }

  const exactSourceSha =
    isSha(candidateSha)
    && parsed?.sourceSha === candidateSha;
  if (!isSha(candidateSha)) gaps.push("candidate_sha_missing_or_invalid");
  if (!exactSourceSha) gaps.push("exact_source_sha_binding_missing");

  const evidenceClass = parsed?.evidenceClass;
  const currentEvidenceClass = CURRENT_PRODUCTION_CLASSES.has(evidenceClass);
  if (!currentEvidenceClass) gaps.push("current_production_evidence_class_missing");

  let scopeReady = false;
  const details = {
    exactSourceSha,
    evidenceClass: typeof evidenceClass === "string" ? evidenceClass : null,
    currentEvidenceClass,
  };

  if (targetId === "database_rls") {
    const environmentBound = parsed?.environment === "staging" || parsed?.environment === "production";
    const twoTenantCrossUserVerified = parsed?.twoTenantCrossUserVerified === true;
    const tenantIsolationEnforced = parsed?.tenantIsolationEnforced === true;
    const passed = parsed?.passed === true;
    Object.assign(details, {
      environmentBound,
      twoTenantCrossUserVerified,
      tenantIsolationEnforced,
      passed,
    });
    if (!environmentBound) gaps.push("staging_or_production_environment_binding_missing");
    if (!twoTenantCrossUserVerified) gaps.push("two_tenant_cross_user_evidence_missing");
    if (!tenantIsolationEnforced) gaps.push("tenant_isolation_not_verified");
    if (!passed) gaps.push("receipt_not_passed");
    scopeReady = environmentBound && twoTenantCrossUserVerified && tenantIsolationEnforced && passed;
  } else if (targetId === "provider_truth") {
    const environmentBound = parsed?.environment === "staging" || parsed?.environment === "production";
    const currentTermsOrAgreementVerified = parsed?.currentTermsOrAgreementVerified === true;
    const liveProviderReceiptVerified = parsed?.liveProviderReceiptVerified === true;
    const rightsEvidenceHashValid = isDigest(parsed?.rightsEvidenceSha256);
    const providerReceiptHashValid = isDigest(parsed?.providerReceiptSha256);
    const passed = parsed?.passed === true;
    Object.assign(details, {
      environmentBound,
      currentTermsOrAgreementVerified,
      liveProviderReceiptVerified,
      rightsEvidenceHashValid,
      providerReceiptHashValid,
      passed,
    });
    if (!environmentBound) gaps.push("staging_or_production_environment_binding_missing");
    if (!currentTermsOrAgreementVerified) gaps.push("current_rights_binding_missing");
    if (!liveProviderReceiptVerified) gaps.push("live_provider_receipt_missing");
    if (!rightsEvidenceHashValid) gaps.push("rights_evidence_digest_missing_or_invalid");
    if (!providerReceiptHashValid) gaps.push("provider_receipt_digest_missing_or_invalid");
    if (!passed) gaps.push("receipt_not_passed");
    scopeReady = environmentBound
      && currentTermsOrAgreementVerified
      && liveProviderReceiptVerified
      && rightsEvidenceHashValid
      && providerReceiptHashValid
      && passed;
  } else {
    gaps.push("unknown_target_schema");
  }

  const productionCredit = fresh
    && !futureTimestamp
    && exactSourceSha
    && currentEvidenceClass
    && scopeReady
    && gaps.length === 0;

  return {
    timestamp: timestamp?.value ?? null,
    timestampField: timestamp?.key ?? null,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
    fresh,
    futureTimestamp,
    ...details,
    productionCredit,
    gaps,
  };
}

export function buildFreshnessAudit({
  root = ROOT,
  candidateSha = process.env.GITHUB_SHA || null,
  now = new Date(),
  maxFreshHours = Number(process.env.VELMERE_R10_FRESH_HOURS || DEFAULT_MAX_FRESH_HOURS),
} = {}) {
  const evidence = [];
  const blockers = [];

  for (const target of targets) {
    const abs = path.join(root, target.rel);
    if (!fs.existsSync(abs)) {
      evidence.push({ id: target.id, path: target.rel, exists: false, productionCredit: false, gaps: ["missing_receipt"] });
      blockers.push(`${target.id}:missing_receipt`);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch {
      evidence.push({ id: target.id, path: target.rel, exists: true, productionCredit: false, gaps: ["malformed_json"] });
      blockers.push(`${target.id}:malformed_json`);
      continue;
    }

    const assessment = assessEvidenceReceipt({
      targetId: target.id,
      parsed,
      candidateSha,
      nowMs: now.getTime(),
      maxFreshHours,
    });
    evidence.push({ id: target.id, path: target.rel, exists: true, ...assessment });
    for (const gap of assessment.gaps) blockers.push(`${target.id}:${gap}`);
  }

  return {
    schemaVersion: "velmere.r11.evidence-freshness-audit.v2",
    generatedAt: now.toISOString(),
    candidateSha,
    maxFreshHours,
    status: blockers.length === 0 ? "PASS_EXACT_SCOPE_PRODUCTION_EVIDENCE" : "BLOCKED_NOT_PRODUCTION_EVIDENCE",
    productionEvidenceReady: blockers.length === 0,
    evidence,
    blockers,
    truthBoundary:
      "Evidence receives current production credit only from typed values bound to the exact candidate SHA, current evidence class, explicit environment/scope assertions and non-future freshness. Word presence, negations, historical/local classes, generatedAt refreshes and wrong-SHA receipts never grant production credit.",
  };
}

function main() {
  const receipt = buildFreshnessAudit();
  fs.mkdirSync(path.join(ROOT, "artifacts/r10"), { recursive: true });
  const output = path.join(ROOT, "artifacts/r10/R10_EVIDENCE_FRESHNESS_AUDIT.json");
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
