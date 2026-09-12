import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const now = new Date();
const maxFreshHours = Number(process.env.VELMERE_R10_FRESH_HOURS || 24);

const targets = [
  {
    id: "database_rls",
    rel: "artifacts/db/DATABASE_RLS_RECEIPT.json",
    productionRequirements: ["two_tenant_cross_user", "source_sha_binding", "staging_environment_binding"],
  },
  {
    id: "provider_truth",
    rel: "artifacts/providers/PASS4_PROVIDER_TRUTH_WITHHOLDING_RECEIPT.json",
    productionRequirements: ["current_release_binding", "current_terms_or_agreement_binding", "live_provider_receipt"],
  },
];

function firstTimestamp(obj) {
  for (const key of ["executedAt", "generatedAt", "verifiedAt", "createdAt"]) {
    if (typeof obj?.[key] === "string" && Number.isFinite(Date.parse(obj[key]))) return obj[key];
  }
  return null;
}

const evidence = [];
const blockers = [];
for (const target of targets) {
  const abs = path.join(ROOT, target.rel);
  if (!fs.existsSync(abs)) {
    evidence.push({ id: target.id, path: target.rel, exists: false, freshness: "MISSING", productionCredit: false });
    blockers.push(`${target.id}:missing_receipt`);
    continue;
  }
  const parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
  const timestamp = firstTimestamp(parsed);
  const ageHours = timestamp ? Math.max(0, (now.getTime() - Date.parse(timestamp)) / 3_600_000) : null;
  const fresh = ageHours !== null && ageHours <= maxFreshHours;
  const serialized = JSON.stringify(parsed);
  const hasSourceShaBinding = /(?:sourceSha|source_sha|commitSha|commit_sha|headSha|head_sha|releaseSha|release_sha)/i.test(serialized);
  const hasStagingBinding = /staging/i.test(serialized);
  const hasTwoTenantEvidence = /(?:two.?tenant|cross.?user|user.?a.*user.?b|tenant.?a.*tenant.?b)/i.test(serialized);
  const hasRightsBinding = /(?:license|commercial.?rights|agreement|terms.?snapshot|rights.?evidence)/i.test(serialized);
  const hasLiveProviderReceipt = /(?:live.?receipt|provider.?response|observed.?provider|freshnessSeconds|latencyMs)/i.test(serialized);

  let productionReady = fresh && hasSourceShaBinding;
  const gaps = [];
  if (!fresh) gaps.push(ageHours === null ? "timestamp_missing" : `stale_${ageHours.toFixed(1)}h`);
  if (!hasSourceShaBinding) gaps.push("source_sha_binding_missing");
  if (target.id === "database_rls") {
    if (!hasStagingBinding) gaps.push("staging_binding_missing");
    if (!hasTwoTenantEvidence) gaps.push("two_tenant_cross_user_evidence_missing");
    productionReady &&= hasStagingBinding && hasTwoTenantEvidence;
  }
  if (target.id === "provider_truth") {
    if (!hasRightsBinding) gaps.push("current_rights_binding_missing");
    if (!hasLiveProviderReceipt) gaps.push("live_provider_receipt_missing");
    productionReady &&= hasRightsBinding && hasLiveProviderReceipt;
  }

  evidence.push({
    id: target.id,
    path: target.rel,
    exists: true,
    timestamp,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
    fresh,
    hasSourceShaBinding,
    hasStagingBinding,
    hasTwoTenantEvidence,
    hasRightsBinding,
    hasLiveProviderReceipt,
    productionCredit: productionReady,
    gaps,
  });
  for (const gap of gaps) blockers.push(`${target.id}:${gap}`);
}

const receipt = {
  schemaVersion: "velmere.r10.evidence-freshness-audit.v1",
  generatedAt: now.toISOString(),
  candidateSha: process.env.GITHUB_SHA || null,
  maxFreshHours,
  status: blockers.length === 0 ? "PASS_PRODUCTION_EVIDENCE_FRESH" : "PASS_CLASSIFIED_WITH_BLOCKERS",
  productionEvidenceReady: blockers.length === 0,
  evidence,
  blockers,
  truthBoundary: "This audit prevents historical/static PASS receipts from being promoted to fresh R10 production evidence. A classified blocker does not invalidate the historical receipt; it removes current production credit until refreshed for the exact release/environment/scope.",
};

fs.mkdirSync(path.join(ROOT, "artifacts/r10"), { recursive: true });
const output = path.join(ROOT, "artifacts/r10/R10_EVIDENCE_FRESHNESS_AUDIT.json");
fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
