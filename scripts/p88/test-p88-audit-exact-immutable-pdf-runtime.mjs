#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const FIXED_AT = "2026-08-20T12:00:00.000Z";
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

const CHECKS = [];
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  CHECKS.push(row);
  if (!condition) throw new Error(`P88 runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}
function expectThrow(id, fn, pattern) {
  let message = "";
  try { fn(); } catch (error) { message = String(error?.message ?? error); }
  check(id, pattern.test(message), { message });
}
async function expectReject(id, fn, pattern) {
  let message = "";
  try { await fn(); } catch (error) { message = String(error?.message ?? error); }
  check(id, pattern.test(message), { message });
}
function digest(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function bytesEqual(left, right) {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

const [
  renderer,
  { canonicalJson },
  { sha256Digest },
  exact,
  store,
  { verifyExactCustomerPdfPreviewDownloadPair },
] = await Promise.all([
  import("../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts"),
  import("../../lib/security/canonical-json.ts"),
  import("../../lib/security/cryptographic-digest.ts"),
  import("../../lib/security/audit-report-exact-pdf-artifact.ts"),
  import("../../lib/security/audit-report-snapshot-store.ts"),
  import("../../lib/reporting/exact-customer-pdf-delivery.ts"),
]);

function makePaidReadyFixture(snapshot, tier) {
  const unsigned = structuredClone(snapshot);
  delete unsigned.digest;
  const receiptLanes = tier === "advanced" ? 6 : 5;
  const independent = tier === "advanced" ? 4 : 3;
  unsigned.providerTruth = {
    confirmedIdentityBoundProviders: receiptLanes,
    independentProviderFamilies: Array.from({ length: independent }, (_, index) => `p88-fixture-family-${index + 1}`),
    independentUpstreamRoots: Array.from({ length: independent }, (_, index) => `p88-fixture-root-${index + 1}`),
    strictQuorumMet: true,
  };
  unsigned.publicSourceTruth = { submitted: 0, contentBound: 0, exactIdentityBound: 0, allSubmittedSourcesBound: true };
  unsigned.evidenceReadiness = { proReady: true, advancedReady: tier === "advanced", reasons: [] };
  unsigned.verdict = { ...unsigned.verdict, confidenceScore: 90 };
  return { ...unsigned, digest: sha256Digest(canonicalJson(unsigned)) };
}

store.resetAuditReportSnapshotMemoryForTests();
const cases = [];
for (const tier of ["pro", "advanced"]) {
  const requestId = `p88-${tier}-exact-pdf-fixture`;
  const built = await renderer.buildProAuditPdfSnapshotArtifact({
    requestId,
    target: "Velmere Controlled Defensive Fixture",
    chain: "ethereum",
    locale: "en",
    tier,
    sourceCandidates: {},
  });
  check(`${tier}_builder_returns_first_render_bytes`, built.pdfBytes instanceof Uint8Array && built.pdfBytes.byteLength > 1_000);
  check(`${tier}_builder_digest_matches_render_contract`, digest(built.pdfBytes) === built.snapshot.renderContract?.pdfDigest);
  check(`${tier}_builder_length_matches_render_contract`, built.pdfBytes.byteLength === built.snapshot.renderContract?.pdfByteLength);
  check(`${tier}_builder_pdf_header`, Buffer.from(built.pdfBytes.slice(0, 5)).toString("latin1") === "%PDF-");
  check(`${tier}_builder_pdf_eof`, Buffer.from(built.pdfBytes.slice(-32)).toString("latin1").includes("%%EOF"));

  const snapshot = makePaidReadyFixture(built.snapshot, tier);
  const validated = renderer.validateProAuditPdfSnapshot(snapshot);
  check(`${tier}_paid_fixture_validation`, validated.digest === snapshot.digest);
  const exactVerdict = exact.assertP88AuditExactPdfBytes({ snapshot, pdfBytes: built.pdfBytes });
  check(`${tier}_exact_byte_validation_digest`, exactVerdict.pdfDigest === snapshot.renderContract.pdfDigest);
  check(`${tier}_exact_byte_validation_length`, exactVerdict.pdfByteLength === snapshot.renderContract.pdfByteLength);
  check(`${tier}_render_contract_id_exact`, exactVerdict.renderContractId === renderer.PASS4808_PDF_RENDER_CONTRACT_ID || exactVerdict.renderContractId === "pass4808-deterministic-latin-extended-pagination-v1");

  const canonicalBase64 = exact.encodeP88AuditExactPdfBase64(built.pdfBytes);
  const decoded = exact.decodeP88AuditExactPdfBase64(canonicalBase64);
  check(`${tier}_canonical_base64_roundtrip`, bytesEqual(decoded, built.pdfBytes));
  check(`${tier}_canonical_base64_reencode`, exact.encodeP88AuditExactPdfBase64(decoded) === canonicalBase64);

  const reportId = `p88-${tier}-report-v1`;
  const persisted = await store.persistAuditReportSnapshot({
    reportId,
    caseRef: `P88-${tier.toUpperCase()}-CASE-001`,
    requestId,
    accountId: `preview:p88-${tier}-owner`,
    entitlementId: `entitlement-p88-${tier}-0001`,
    tier,
    targetHash: `sha256:${"a".repeat(tier === "pro" ? 64 : 63)}${tier === "pro" ? "" : "b"}`,
    snapshot,
    pdfBytes: built.pdfBytes,
  });
  check(`${tier}_memory_persist_pass`, persisted.ok === true);
  if (!persisted.ok) throw new Error(persisted.error);
  check(`${tier}_memory_persist_not_idempotent_first`, persisted.idempotent === false);
  check(`${tier}_record_exact_storage_schema`, persisted.record.exactPdfSchemaVersion === exact.P88_AUDIT_EXACT_PDF_ARTIFACT_ID);
  check(`${tier}_record_bytes_identical`, bytesEqual(persisted.record.pdfBytes, built.pdfBytes));
  check(`${tier}_record_digest_matches`, persisted.record.pdfDigest === digest(built.pdfBytes));
  check(`${tier}_record_length_matches`, persisted.record.pdfByteLength === built.pdfBytes.byteLength);
  check(`${tier}_record_contract_matches`, persisted.record.renderContractId === snapshot.renderContract.id);

  const retry = await store.persistAuditReportSnapshot({
    reportId,
    caseRef: `P88-${tier.toUpperCase()}-CASE-001`,
    requestId,
    accountId: `preview:p88-${tier}-owner`,
    entitlementId: `entitlement-p88-${tier}-0001`,
    tier,
    targetHash: `sha256:${"a".repeat(tier === "pro" ? 64 : 63)}${tier === "pro" ? "" : "b"}`,
    snapshot,
    pdfBytes: built.pdfBytes,
  });
  check(`${tier}_memory_retry_pass`, retry.ok === true);
  check(`${tier}_memory_retry_idempotent`, retry.ok && retry.idempotent === true);

  const read = await store.readAuditReportSnapshotForDelivery({
    caseRef: `P88-${tier.toUpperCase()}-CASE-001`,
    accountId: `preview:p88-${tier}-owner`,
    entitlementId: `entitlement-p88-${tier}-0001`,
    tier,
    reportId,
  });
  check(`${tier}_owner_read_pass`, read.ok === true);
  if (!read.ok) throw new Error(read.error);
  check(`${tier}_owner_read_exact_bytes`, bytesEqual(read.record.pdfBytes, built.pdfBytes));
  check(`${tier}_owner_read_exact_digest`, read.record.pdfDigest === digest(read.record.pdfBytes));
  check(`${tier}_owner_read_exact_length`, read.record.pdfByteLength === read.record.pdfBytes.byteLength);

  const wrongOwner = await store.readAuditReportSnapshotForDelivery({
    caseRef: `P88-${tier.toUpperCase()}-CASE-001`,
    accountId: `preview:p88-${tier}-other-owner`,
    entitlementId: `entitlement-p88-${tier}-0001`,
    tier,
    reportId,
  });
  check(`${tier}_wrong_owner_fail_closed`, !wrongOwner.ok && wrongOwner.error === "audit_report_snapshot_owner_mismatch");

  const parity = verifyExactCustomerPdfPreviewDownloadPair({
    pdfBytes: read.record.pdfBytes,
    expectedPdfSha256: read.record.pdfDigest,
    filenameStem: `${requestId}-velmere-${tier}-audit`,
  });
  check(`${tier}_preview_download_same_blob`, parity.pass && parity.byteIdentical);
  check(`${tier}_preview_download_same_digest`, parity.previewSha256 === parity.downloadSha256 && parity.previewSha256 === read.record.pdfDigest);
  check(`${tier}_preview_download_only_disposition_differs`, parity.contentDispositionDifferent);

  const rerendered = renderer.renderProAuditPdfSnapshot(snapshot);
  check(`${tier}_first_render_matches_deterministic_replay_diagnostic_only`, bytesEqual(rerendered, built.pdfBytes));
  cases.push({
    tier,
    requestId,
    reportId,
    snapshotDigest: snapshot.digest,
    pdfDigest: read.record.pdfDigest,
    pdfByteLength: read.record.pdfByteLength,
    renderContractId: read.record.renderContractId,
    exactRecordDigest: read.record.pdfRecordDigest,
    storageMode: read.record.storageMode,
    parityPass: parity.pass,
  });
}

const pro = cases.find((row) => row.tier === "pro");
assert.ok(pro);
const rawPro = await renderer.buildProAuditPdfSnapshotArtifact({
  requestId: "p88-negative-pro-fixture",
  target: "Velmere Controlled Defensive Fixture",
  chain: "ethereum",
  locale: "en",
  tier: "pro",
  sourceCandidates: {},
});
const readyPro = makePaidReadyFixture(rawPro.snapshot, "pro");
const canonical = exact.encodeP88AuditExactPdfBase64(rawPro.pdfBytes);
expectThrow("base64_rejects_trailing_newline", () => exact.decodeP88AuditExactPdfBase64(`${canonical}\n`), /base64_noncanonical/);
expectThrow("stored_base64_rejects_trailing_newline", () => exact.decodeP88StoredAuditExactPdfBytes(`${canonical}\n`), /base64_noncanonical/);
expectThrow("base64_rejects_leading_space", () => exact.decodeP88AuditExactPdfBase64(` ${canonical.slice(1)}`), /base64_noncanonical/);
expectThrow("base64_rejects_bad_padding", () => exact.decodeP88AuditExactPdfBase64(`${canonical.slice(0, -2)}=A`), /base64_noncanonical/);
expectThrow("base64_rejects_urlsafe_alphabet", () => exact.decodeP88AuditExactPdfBase64(`${canonical.slice(0, -4)}____`), /base64_noncanonical/);
expectThrow("base64_rejects_non_multiple_of_four", () => exact.decodeP88AuditExactPdfBase64(canonical.slice(0, -1)), /base64_noncanonical/);

const tampered = new Uint8Array(rawPro.pdfBytes);
tampered[Math.floor(tampered.byteLength / 2)] ^= 1;
expectThrow("tampered_pdf_rejected", () => exact.assertP88AuditExactPdfBytes({ snapshot: readyPro, pdfBytes: tampered }), /digest_mismatch|structure_invalid/);
const active = new Uint8Array(rawPro.pdfBytes);
const activeNeedle = Buffer.from("/FontFamily", "latin1");
const activeReplacement = Buffer.from("/JavaScript", "latin1");
const activeOffset = Buffer.from(active).indexOf(activeNeedle);
check("active_content_fixture_preserves_length", activeNeedle.byteLength === activeReplacement.byteLength && activeOffset >= 0, { activeOffset });
active.set(activeReplacement, activeOffset);
expectThrow("active_content_pdf_rejected", () => exact.assertP88AuditExactPdfBytes({ snapshot: readyPro, pdfBytes: active }), /active_content_forbidden|structure_invalid:pdf_active_content/);
const truncated = rawPro.pdfBytes.slice(0, rawPro.pdfBytes.byteLength - 32);
expectThrow("truncated_pdf_rejected", () => exact.assertP88AuditExactPdfBytes({ snapshot: readyPro, pdfBytes: truncated }), /structure_invalid|eof_invalid|length_mismatch/);
const wrongContract = structuredClone(readyPro);
wrongContract.renderContract.id = "wrong-contract";
expectThrow("wrong_render_contract_rejected", () => exact.assertP88AuditExactPdfBytes({ snapshot: wrongContract, pdfBytes: rawPro.pdfBytes }), /render_contract_missing/);

const artifact = exact.buildP88AuditExactPdfArtifact({
  reportId: "p88-negative-report-v1",
  caseRef: "P88-NEGATIVE-CASE-001",
  requestId: readyPro.requestId,
  accountIdHash: "c".repeat(64),
  entitlementId: "entitlement-p88-negative-0001",
  tier: "pro",
  targetHash: `sha256:${"d".repeat(64)}`,
  reportVersionHash: `sha256:${"e".repeat(64)}`,
  snapshotDigest: readyPro.digest,
  sourceReceiptRoot: readyPro.sourceReceiptRoot,
  createdAt: readyPro.generatedAt,
  snapshot: readyPro,
  pdfBytes: rawPro.pdfBytes,
});
check("exact_artifact_verifies", exact.verifyP88AuditExactPdfArtifact(artifact, readyPro));
const mutatedArtifact = { ...artifact, recordDigest: `sha256:${"0".repeat(64)}` };
check("mutated_record_digest_rejected", !exact.verifyP88AuditExactPdfArtifact(mutatedArtifact, readyPro));
const mutatedArtifactBytes = { ...artifact, pdfBytes: tampered };
check("mutated_artifact_bytes_rejected", !exact.verifyP88AuditExactPdfArtifact(mutatedArtifactBytes, readyPro));

await expectReject("builder_rejects_invalid_tier_input", async () => renderer.buildProAuditPdfSnapshotArtifact({
  requestId: "p88-invalid-tier",
  target: "fixture",
  chain: "ethereum",
  locale: "en",
  tier: "invalid",
  sourceCandidates: {},
}), /tier|review|undefined|invalid/i);

const receipt = {
  schemaVersion: "velmere.p88.audit-exact-immutable-pdf-runtime.v1",
  generatedAt: FIXED_AT,
  status: "PASS_BOUNDED_LOCAL_CONTROLLED_FIXTURE",
  classification: "DEFENSIVE_RENDER_ONCE_STORE_FIRST_EXACT_BYTES_DELIVERY",
  checks: CHECKS,
  summary: {
    checks: CHECKS.length,
    passed: CHECKS.filter((row) => row.status === "PASS").length,
    failed: CHECKS.filter((row) => row.status === "FAIL").length,
    tiers: cases.length,
    exactPreviewDownloadPairs: cases.filter((row) => row.parityPass).length,
  },
  cases,
  failureAdjudication: {
    observed: true,
    failures: [
      {
        class: "PRODUCT_IMPORT_BOUNDARY",
        failure: "audit exact artifact imported PASS4808_PDF_RENDER_CONTRACT_ID from a module that did not export it",
        rootCause: "constant ownership was customer-safe-renderer, while renderer only imported it",
        repair: "both P88 modules now import the constant from its authoritative defining module",
      },
      {
        class: "TEST_HARNESS_CANONICAL_BASE64_MUTATION",
        failure: "the first bad-padding mutation remained valid canonical base64 and therefore did not isolate the intended rejection branch",
        rootCause: "the mutation changed the final characters without creating an illegal interior padding sequence",
        repair: "the negative case now inserts an illegal interior '=A' sequence",
      },
      {
        class: "TEST_HARNESS_ACTIVE_CONTENT_FIXTURE",
        failure: "the first active-content fixture changed PDF length/xref and failed structural validation before isolating active-content handling",
        rootCause: "the fixture appended bytes instead of preserving object offsets",
        repair: "the fixture now replaces an equal-length PDF name token and accepts either the dedicated or structural active-content rejection code",
      },
    ],
    retryCredit: "credited only after root-cause repair, two consecutive clean executions and byte-identical receipts; every earlier FAIL is retained in the P88 ledger",
  },
  truthBoundary: "The two paid-tier cases are controlled local fixtures whose readiness metadata was deliberately promoted only inside this harness so the exact-byte storage boundary could be exercised. They prove render-once byte binding, canonical encoding, immutable local storage, owner binding, tamper rejection and preview/download same-blob parity. They provide no provider accuracy, real customer, staging/PostgreSQL, current deployment, rights, sale, FINAL, LIVE or WORLD_CLASS credit.",
};
check("receipt_all_checks_pass", receipt.summary.failed === 0);
receipt.summary.checks = CHECKS.length;
receipt.summary.passed = CHECKS.filter((row) => row.status === "PASS").length;
await mkdir("artifacts/p88", { recursive: true });
await mkdir("receipts/p88", { recursive: true });
const text = `${JSON.stringify(receipt, null, 2)}\n`;
await writeFile("artifacts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_RUNTIME.json", text);
await writeFile("receipts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_RUNTIME.json", text);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.summary.checks, passed: receipt.summary.passed, cases: receipt.cases }, null, 2));
