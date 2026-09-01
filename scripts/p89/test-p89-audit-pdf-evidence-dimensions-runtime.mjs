#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const FIXED_AT = "2026-08-20T18:10:00.000Z";
const RealDate = Date;
globalThis.Date = class FixedDate extends RealDate {
  constructor(...args) { super(...(args.length ? args : [FIXED_AT])); }
  static now() { return RealDate.parse(FIXED_AT); }
};
process.env.NODE_ENV = "test";
process.env.VERCEL_ENV = "preview";
delete process.env.SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const checks = [];
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P89 PDF dimension runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}
function expectThrow(id, fn, pattern) {
  let message = "";
  try { fn(); } catch (error) { message = String(error?.message ?? error); }
  check(id, pattern.test(message), { message });
}
function bytesEqual(left, right) {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}
function sha(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }

const [renderer, exact, dimensionsModule, { canonicalJson }, { sha256Digest }] = await Promise.all([
  import("../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts"),
  import("../../lib/security/audit-report-exact-pdf-artifact.ts"),
  import("../../lib/security/audit-provider-evidence-dimensions.ts"),
  import("../../lib/security/canonical-json.ts"),
  import("../../lib/security/cryptographic-digest.ts"),
]);

const CURRENT_MODEL = "audit-report-assembler-pass2578-evidence-dimensions-pass4809";
const P88_MODEL = "audit-report-assembler-pass2578-render-bound-pass4808";
function completenessSnapshot({ tier, strict, live, evidenceRows, ready = true, modelVersion = CURRENT_MODEL }) {
  const familyMinimum = tier === "advanced" ? 4 : 3;
  const rootMinimum = tier === "advanced" ? 4 : 3;
  return {
    tier,
    modelVersion,
    providerTruth: {
      confirmedIdentityBoundProviders: strict,
      independentProviderFamilies: Array.from({ length: familyMinimum }, (_, index) => `family-${index + 1}`),
      independentUpstreamRoots: Array.from({ length: rootMinimum }, (_, index) => `https://root-${index + 1}.example`),
      strictQuorumMet: true,
      ...(modelVersion === CURRENT_MODEL ? {
        evidenceDimensionVersion: dimensionsModule.PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID,
        successfulLiveProviderLanes: live,
        successfulLiveProviderIds: Array.from({ length: live }, (_, index) => `provider-${index + 1}`),
        duplicateStrictLanesRejected: 0,
        duplicateLiveLanesRejected: 0,
      } : {}),
    },
    publicSourceTruth: { submitted: 0, contentBound: 0, exactIdentityBound: 0, allSubmittedSourcesBound: true },
    evidenceReadiness: {
      proReady: ready,
      advancedReady: tier === "advanced" && ready,
      reasons: [],
      ...(modelVersion === CURRENT_MODEL ? { evidenceRows } : {}),
    },
    verdict: { riskScore: null, riskLabel: "No verified adverse finding", confidenceScore: 92, reviewPriorityScore: 20, readinessScore: 96 },
  };
}

check("current_pro_four_strict_five_live_pass", (() => {
  renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "pro", strict: 4, live: 5, evidenceRows: 6 }));
  return true;
})());
expectThrow("current_pro_strict_shortfall", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "pro", strict: 3, live: 5, evidenceRows: 6 })), /identity_bound_provider_receipt_lanes:3\/4/);
expectThrow("current_pro_live_shortfall", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "pro", strict: 4, live: 4, evidenceRows: 6 })), /successful_live_provider_lanes:4\/5/);
expectThrow("current_pro_evidence_rows_shortfall", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "pro", strict: 4, live: 5, evidenceRows: 5 })), /evidence_rows:5\/6/);
check("current_advanced_five_strict_six_live_pass", (() => {
  renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "advanced", strict: 5, live: 6, evidenceRows: 10 }));
  return true;
})());
expectThrow("current_advanced_strict_shortfall", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "advanced", strict: 4, live: 6, evidenceRows: 10 })), /identity_bound_provider_receipt_lanes:4\/5/);
expectThrow("current_advanced_live_shortfall", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "advanced", strict: 5, live: 5, evidenceRows: 10 })), /successful_live_provider_lanes:5\/6/);
expectThrow("current_advanced_evidence_rows_shortfall", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "advanced", strict: 5, live: 6, evidenceRows: 9 })), /evidence_rows:9\/10/);

expectThrow("p88_legacy_pro_does_not_inherit_separate_live_semantics", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "pro", strict: 4, live: 5, evidenceRows: 6, modelVersion: P88_MODEL })), /identity_bound_provider_receipt_lanes:4\/5/);
check("p88_legacy_pro_old_stricter_five_receipt_rule_still_verifies", (() => {
  renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "pro", strict: 5, live: 0, evidenceRows: 0, modelVersion: P88_MODEL }));
  return true;
})());
expectThrow("p88_legacy_advanced_old_stricter_six_receipt_rule_retained", () => renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "advanced", strict: 5, live: 6, evidenceRows: 10, modelVersion: P88_MODEL })), /identity_bound_provider_receipt_lanes:5\/6/);
check("p88_legacy_advanced_six_receipts_pass", (() => {
  renderer.assertProAuditPdfPaidCompleteness(completenessSnapshot({ tier: "advanced", strict: 6, live: 0, evidenceRows: 0, modelVersion: P88_MODEL }));
  return true;
})());

const built = await renderer.buildProAuditPdfSnapshotArtifact({
  requestId: "p89-basic-current-schema-fixture",
  target: "Velmere Controlled Defensive Fixture",
  chain: "ethereum",
  locale: "en",
  tier: "basic",
  sourceCandidates: {},
});
const validated = renderer.validateProAuditPdfSnapshot(built.snapshot);
check("current_snapshot_model_v3", validated.modelVersion === CURRENT_MODEL, validated.modelVersion);
check("current_snapshot_dimension_version", validated.providerTruth.evidenceDimensionVersion === dimensionsModule.PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID);
check("current_snapshot_live_count_bound", validated.providerTruth.successfulLiveProviderLanes === validated.providerTruth.successfulLiveProviderIds.length, validated.providerTruth);
check("current_snapshot_live_execution_root", /^sha256:[a-f0-9]{64}$/.test(validated.evidenceRoots.liveExecutionRoot ?? ""), validated.evidenceRoots.liveExecutionRoot);
check("current_snapshot_evidence_rows_bound", Number.isInteger(validated.evidenceReadiness.evidenceRows) && validated.evidenceReadiness.evidenceRows >= 0, validated.evidenceReadiness.evidenceRows);
check("current_snapshot_customer_model_reference", validated.lines.includes(`Report model reference: ${sha256Digest(CURRENT_MODEL)}`));
check("current_snapshot_customer_dimension_reference", validated.lines.includes(`Provider evidence dimension reference: ${sha256Digest(dimensionsModule.PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID)}`));
check("current_snapshot_customer_strict_count_line", validated.lines.includes(`Identity-bound confirmed provider responses: ${validated.providerTruth.confirmedIdentityBoundProviders}`));
check("current_snapshot_customer_live_count_line", validated.lines.includes(`Successful live direct-provider executions: ${validated.providerTruth.successfulLiveProviderLanes}`));
check("current_snapshot_customer_live_root_line", validated.lines.includes(`Live execution root: ${validated.evidenceRoots.liveExecutionRoot}`));
check("current_snapshot_pdf_digest_bound", validated.renderContract?.pdfDigest === sha(built.pdfBytes), { expected: validated.renderContract?.pdfDigest, actual: sha(built.pdfBytes) });
check("current_snapshot_pdf_length_bound", validated.renderContract?.pdfByteLength === built.pdfBytes.byteLength);
const replay = renderer.renderProAuditPdfSnapshot(validated);
check("current_snapshot_deterministic_replay_diagnostic", bytesEqual(replay, built.pdfBytes));
const exactVerdict = exact.assertP88AuditExactPdfBytes({ snapshot: validated, pdfBytes: built.pdfBytes });
check("current_snapshot_exact_artifact_digest", exactVerdict.pdfDigest === sha(built.pdfBytes));
check("current_snapshot_exact_artifact_length", exactVerdict.pdfByteLength === built.pdfBytes.byteLength);

const badDimension = structuredClone(built.snapshot);
badDimension.providerTruth.evidenceDimensionVersion = "pass4809-audit-provider-evidence-dimensions-bad";
expectThrow("snapshot_rejects_wrong_dimension_version", () => renderer.validateProAuditPdfSnapshot(badDimension), /provider_evidence_dimensions_invalid/);
const badLiveCount = structuredClone(built.snapshot);
badLiveCount.providerTruth.successfulLiveProviderLanes = 1;
badLiveCount.providerTruth.successfulLiveProviderIds = ["forged-provider"];
badLiveCount.digest = sha256Digest(canonicalJson(Object.fromEntries(Object.entries(badLiveCount).filter(([key]) => key !== "digest"))));
expectThrow("snapshot_rejects_customer_live_count_line_mismatch", () => renderer.validateProAuditPdfSnapshot(badLiveCount), /provider_dimension_line_mismatch/);
const missingLiveRoot = structuredClone(built.snapshot);
delete missingLiveRoot.evidenceRoots.liveExecutionRoot;
expectThrow("snapshot_rejects_missing_live_execution_root", () => renderer.validateProAuditPdfSnapshot(missingLiveRoot), /evidence_root_invalid:liveExecutionRoot/);
const missingEvidenceRows = structuredClone(built.snapshot);
delete missingEvidenceRows.evidenceReadiness.evidenceRows;
expectThrow("snapshot_rejects_missing_evidence_row_count", () => renderer.validateProAuditPdfSnapshot(missingEvidenceRows), /provider_evidence_dimensions_invalid/);
const oldModelWithNewFields = structuredClone(built.snapshot);
oldModelWithNewFields.modelVersion = P88_MODEL;
oldModelWithNewFields.digest = sha256Digest(canonicalJson(Object.fromEntries(Object.entries(oldModelWithNewFields).filter(([key]) => key !== "digest"))));
expectThrow("old_model_cannot_silently_inherit_new_fields", () => renderer.validateProAuditPdfSnapshot(oldModelWithNewFields), /snapshot_integrity_failed/);

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p89.audit-pdf-evidence-dimensions-runtime.v1",
  generatedAt: FIXED_AT,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_CURRENT_AND_LEGACY_SCHEMA_SEPARATION",
  failureAdjudication: [{
    attempt: 1,
    result: "NONZERO_CURRENT_SNAPSHOT_VALIDATION",
    classification: "VALIDATOR_CUSTOMER_LINE_BINDING_DEFECT",
    evidence: "artifacts/p89/logs/regression/00A_P89_BASIC_SCHEMA_FIRST_FAIL.log",
    repair: "Raw internal pass identifiers were filtered from customer lines; current model and dimension references are now customer-safe SHA-256 bindings. The failed attempt receives no credit.",
  }],
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  currentControlledArtifact: {
    tier: validated.tier,
    modelVersion: validated.modelVersion,
    snapshotDigest: validated.digest,
    pdfDigest: validated.renderContract?.pdfDigest,
    pdfByteLength: validated.renderContract?.pdfByteLength,
    evidenceDimensionVersion: validated.providerTruth.evidenceDimensionVersion,
    successfulLiveProviderLanes: validated.providerTruth.successfulLiveProviderLanes,
    strictProviderReceipts: validated.providerTruth.confirmedIdentityBoundProviders,
    evidenceRows: validated.evidenceReadiness.evidenceRows,
  },
  legacyBoundary: "P88 render-bound snapshots retain their frozen max(verifiedProviderReceipts, liveLanes) strict-receipt rule and do not inherit P89 dimensional separation.",
  zeroFakeCredit: {
    currentArtifactTier: "BASIC_CONTROLLED_FIXTURE",
    realPaidAudit: false,
    realProviders: false,
    providerRights: "WITHHELD",
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    saleEligible: "0/20",
  },
  truthBoundary: "This proves local current-schema binding, exact-byte render integrity and paid-completeness arithmetic on controlled objects. It is not a real Pro/Advanced audit, provider-rights proof, deployed same-blob proof, Customer FINAL or Audit FINAL PDF.",
};
await mkdir(new URL("../../receipts/p89/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p89/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p89/P89_AUDIT_PDF_EVIDENCE_DIMENSIONS_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(new URL("../../artifacts/p89/P89_AUDIT_PDF_EVIDENCE_DIMENSIONS_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, currentControlledArtifact: receipt.currentControlledArtifact }, null, 2));
if (failed.length) process.exitCode = 1;
