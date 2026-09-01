#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

const OWNER = "account:p85-visible-owner-0001";
const OTHER_OWNER = "account:p85-other-owner-0002";
const TARGET = "0x0dabdc92af35615443412a336344c591faed3f90";
const CHECKS = [];
const REAL_DATE = Date;

function installFixedClock(iso) {
  const fixedMs = REAL_DATE.parse(iso);
  globalThis.Date = class FixedDate extends REAL_DATE {
    constructor(...args) { super(...(args.length === 0 ? [fixedMs] : args)); }
    static now() { return fixedMs; }
  };
}
function clone(value) { return structuredClone(value); }
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  CHECKS.push(row);
  if (!condition) throw new Error(`P85 runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}
async function rejects(id, operation, pattern) {
  try { await operation(); }
  catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    check(id, pattern.test(text), text);
    return;
  }
  check(id, false, "operation unexpectedly succeeded");
}

async function main() {
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "preview";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = "p85-local-only-projection-secret-0123456789abcdef";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "p85-local-fixture";
  const [
    { canonicalJson }, { sha256Digest }, { createPass4644ProviderEvidenceReceipt },
    { buildCustomerReportPayload }, { buildCustomerReportLayoutModel }, { hashVelmereAccountBinding },
    { buildAuditAccountCustomerSnapshot }, { renderCustomerSafeAuditPdf },
    { PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE, buildPass4822AccountCustomerArtifactSnapshot, verifyPass4822AccountCustomerArtifactSnapshot },
    { P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC_SCHEMA, publishP84AuditExactArtifactOwnerReadable },
    { P84_AUDIT_CUSTOMER_ARTIFACT_LINK_SCHEMA },
    { P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_READ_ID, P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_LIST_RPC,
      P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_GET_RPC, P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_BOUNDARY_REQUIRED,
      listP85OwnerVisibleCustomerArtifacts, getP85OwnerVisibleCustomerArtifact },
  ] = await Promise.all([
    import("../../lib/security/canonical-json.ts"), import("../../lib/security/cryptographic-digest.ts"),
    import("../../lib/market-integrity/provider-evidence-receipt.ts"), import("../../lib/market-integrity/customer-report-payload.ts"),
    import("../../lib/market-integrity/customer-report-layout-model.ts"), import("../../lib/auth/account-session.ts"),
    import("../../lib/security/audit-account-customer-snapshot.ts"), import("../../lib/security/customer-safe-audit-layout.ts"),
    import("../../lib/reporting/account-customer-artifact-snapshot.ts"), import("../../lib/reporting/audit-exact-artifact-owner-readable-publisher.ts"),
    import("../../lib/account/audit-account-messages.ts"), import("../../lib/reporting/account-customer-artifact-owner-visible-read.ts"),
  ]);

  function responseFor(params) {
    return {
      schemaVersion: P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC_SCHEMA,
      createdArtifact: true, createdMessage: true, createdLink: true,
      snapshot: params.p_snapshot,
      blob: { ...params.p_blob, pdfBase64: params.p_pdf_base64 },
      message: { ...params.p_message, exact_account_artifact_snapshot_id: params.p_snapshot.snapshotId },
      link: {
        schema_version: P84_AUDIT_CUSTOMER_ARTIFACT_LINK_SCHEMA,
        snapshot_id: params.p_snapshot.snapshotId,
        message_id: params.p_message.message_id,
        account_id: params.p_account_id,
        account_id_hash: params.p_snapshot.accountIdHash,
        audit_snapshot_digest: params.p_audit_snapshot.snapshotDigest,
        artifact_snapshot_digest: params.p_snapshot.snapshotDigest,
        artifact_digest: params.p_snapshot.canonicalArtifact.artifactDigest,
        pdf_blob_id: params.p_blob.blobId,
        pdf_digest: params.p_blob.pdfDigest,
        linked_at: params.p_message.updated_at,
        created_at: params.p_message.updated_at,
      },
    };
  }
  function publisherClient() {
    return { async rpc(_name, params) { return { data: responseFor(params), error: null }; }, from() { throw new Error("direct table access forbidden"); } };
  }

  async function buildFixture({ suffix, generatedAt }) {
    installFixedClock(generatedAt);
    const observedAt = new REAL_DATE(REAL_DATE.parse(generatedAt) - 60_000).toISOString();
    const receiptBase = { surface: "contract_audit", verification: "normalized_response", state: "confirmed",
      requestedIdentity: TARGET, resolvedAddress: TARGET, resolvedChainId: "56", identityMatched: true,
      timestampProvenance: "provider", observedAt, receivedAt: generatedAt, ttlMs: 10 * 60_000, httpStatus: 200, latencyMs: 10 };
    const providerEvidenceReceipts = [
      createPass4644ProviderEvidenceReceipt({ ...receiptBase, providerId: `bscscan-${suffix}`, providerFamily: "bscscan",
        capabilities: ["identity", "bytecode"], normalizedPayload: { chainId: "56", address: TARGET, runtimeCodeHash: `sha256:${"a".repeat(64)}` } }),
      createPass4644ProviderEvidenceReceipt({ ...receiptBase, providerId: `defillama-${suffix}`, providerFamily: "defillama",
        capabilities: ["identity", "configuration"], normalizedPayload: { chainId: "56", address: TARGET, fixtureBoundary: `offline deterministic only ${suffix}` } }),
    ];
    const customerReport = buildCustomerReportPayload({
      locale: "en", tier: "Basic", symbol: `P85${suffix.toUpperCase()}`,
      name: `P85 OWNER-VISIBLE FIXTURE ${suffix.toUpperCase()} - NOT CUSTOMER FINAL`, family: "defi_protocol", riskScore: 42,
      sourceFamilyCount: 2, missingEvidence: ["LOCAL_FIXTURE_ONLY: authorized PostgreSQL, RLS/JWT runtime, current exploitability and exact Windows remain WITHHELD"],
      providerEvidenceReceipts, expectedCanonicalIdentity: `56:${TARGET}`, chartMode: "unavailable", generatedAt,
      reportSurface: "security", chainId: "56", contractAddress: TARGET,
      decisionSections: [{ id: `p85-publication-visibility-${suffix}`, title: "Database-enforced publication visibility", minimumTier: "Basic", state: "watch",
        summary: "Local deterministic owner-visible RPC validation only; no current exploitability claim.",
        evidence: ["fixture:local-only", "exact P84 publication link required"],
        actions: ["Execute P85 RLS/JWT proof on authorized staging before customer FINAL."] }],
      executedTests: ["closed owner RPC projection", "tamper rejection", "cross-account rejection", "orphan suppression"],
      unexecutedTests: ["authorized staging PostgreSQL", "real JWT isolation", "deployed HTTP", "exact Windows"],
    });
    const previewLayout = buildCustomerReportLayoutModel(customerReport);
    const projectionUnsigned = { report: { topFindings: [{ id: `p85-publication-visibility-${suffix}`, severity: "medium",
      title: "Publication visibility fixture", publicLine: "The fixture validates database-read plumbing only; current exploitability remains WITHHELD.",
      proLine: "No production database or current-chain risk claim is established.", sourceFamily: "local_fixture",
      advancedAction: "Run authorized staging migration/RLS and exact-Windows validation." }] } };
    const projection = { ...projectionUnsigned, projectionDigest: sha256Digest(canonicalJson(projectionUnsigned)) };
    const pipelineUnsigned = { schemaVersion: `p85-local-owner-visible-pipeline-${suffix}-v1`, requestedTier: "basic", deliveredTier: "basic", releaseState: "ready",
      projection, customerReport, customerReportPreviewLayout: previewLayout,
      sourceTruth: { strictLaneCount: 2, strictUpstreamRoots: customerReport.sourceBinding.independentContentBoundUpstreams,
        providerReceiptCount: providerEvidenceReceipts.length, adjudicatedAuthorityReceiptCount: 0, adjudicatedAuthorityEvidenceDigest: null,
        contentBoundProviderReceiptCount: customerReport.sourceBinding.contentBoundReceiptCount },
      rule: "LOCAL_FIXTURE_ONLY - no customer FINAL, rights or exploitability credit" };
    const pipeline = { ...pipelineUnsigned, pipelineDigest: sha256Digest(canonicalJson(pipelineUnsigned)) };
    const requestId = `p85-owner-visible-${suffix}`;
    const unboundAuditSnapshot = buildAuditAccountCustomerSnapshot({ pipeline, accountIdHash: hashVelmereAccountBinding(OWNER), requestId,
      projectName: `P85 OWNER-VISIBLE FIXTURE ${suffix.toUpperCase()}`, targetLabel: `56:${TARGET} fixture-only ${suffix}` });
    const renderedPdf = renderCustomerSafeAuditPdf(unboundAuditSnapshot.layoutInput);
    const accountArtifactSnapshot = buildPass4822AccountCustomerArtifactSnapshot({ accountId: OWNER, surface: "audit", payloadKind: "audit_customer_report_v1",
      reportId: unboundAuditSnapshot.reportId, requestedTier: unboundAuditSnapshot.requestedTier, deliveredTier: unboundAuditSnapshot.deliveredTier,
      locale: unboundAuditSnapshot.locale, title: unboundAuditSnapshot.layoutInput.title, subject: unboundAuditSnapshot.targetLabel,
      generatedAt: unboundAuditSnapshot.generatedAt, payload: customerReport, canonicalArtifact: unboundAuditSnapshot.canonicalArtifact,
      pdfStorage: PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE });
    check(`p85_fixture_${suffix}_snapshot_valid`, verifyPass4822AccountCustomerArtifactSnapshot(accountArtifactSnapshot));
    const messageInput = { message: { id: `msg-p85-owner-visible-${suffix}`, title: `P85 owner-visible fixture ${suffix}`,
      body: "Defensive local publication-visibility validation. Not a customer FINAL report.", status: "ready",
      packageLabel: `Velmere Basic Audit - P85 fixture ${suffix}`, requestId, createdAt: generatedAt, eta: "fixture-only",
      accountRoute: "/en/account?tab=messages", nextSteps: ["Authorized staging PostgreSQL, real JWT isolation and exact Windows remain WITHHELD."] },
      accountId: OWNER, locale: "en", reviewLevel: "basic_review", projectName: `P85 OWNER-VISIBLE FIXTURE ${suffix.toUpperCase()}`,
      contractAddress: TARGET, publicReportRoute: `/en/security/audits/customer-report/${requestId}`, adminRoute: "/en/admin/security/audit-inbox",
      exportRoute: `/api/security/audit/export/${requestId}`, paymentEvidenceRefs: [] };
    const published = await publishP84AuditExactArtifactOwnerReadable({ accountId: OWNER, messageInput, auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot, pdfBytes: renderedPdf.bytes, client: publisherClient() });
    const link = published.link;
    const publicationLink = { schema_version: link.schemaVersion, snapshot_id: link.snapshotId, message_id: link.messageId,
      account_id: link.accountId, account_id_hash: link.accountIdHash, audit_snapshot_digest: link.auditSnapshotDigest,
      artifact_snapshot_digest: link.artifactSnapshotDigest, artifact_digest: link.artifactDigest, pdf_blob_id: link.pdfBlobId,
      pdf_digest: link.pdfDigest, linked_at: link.linkedAt, created_at: link.createdAt };
    const snapshot = published.snapshot;
    return { published, row: { visibility_schema_version: P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_READ_ID, publication_state: "p84_exact_link",
      publication_link: publicationLink, snapshot_id: snapshot.snapshotId, account_id: OWNER, account_id_hash: snapshot.accountIdHash,
      surface: snapshot.surface, payload_kind: snapshot.payloadKind, report_id: snapshot.reportId,
      artifact_digest: snapshot.canonicalArtifact.artifactDigest, snapshot_digest: snapshot.snapshotDigest,
      pdf_storage: "exact_immutable_blob", snapshot, generated_at: snapshot.generatedAt } };
  }

  const newest = await buildFixture({ suffix: "newest", generatedAt: "2026-08-20T20:10:00.000Z" });
  const older = await buildFixture({ suffix: "older", generatedAt: "2026-08-20T20:00:00.000Z" });
  installFixedClock("2026-08-20T20:15:00.000Z");
  function fakeReadClient({ listRows = [], getRows = [], listError = null, getError = null } = {}) {
    const trace = { rpcCalls: [], fromCalls: 0 };
    return { trace, from() { trace.fromCalls += 1; throw new Error("P85 direct table read forbidden"); },
      async rpc(name, params) { trace.rpcCalls.push({ name, params: clone(params) });
        if (name === P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_LIST_RPC) return listError ? { data: null, error: { message: listError } } : { data: clone(listRows), error: null };
        if (name === P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_GET_RPC) return getError ? { data: null, error: { message: getError } } : { data: clone(getRows), error: null };
        return { data: null, error: { message: `unexpected_rpc:${name}` } }; } };
  }

  const listClient = fakeReadClient({ listRows: [newest.row, older.row] });
  const listed = await listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, limit: 2, client: listClient });
  check("p85_list_schema_closed", listed.schemaVersion === P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_READ_ID && listed.source === "supabase");
  check("p85_list_returns_two_visible_artifacts", listed.artifacts.length === 2);
  check("p85_list_order_preserved_and_validated", listed.artifacts[0].snapshot.snapshotId === newest.published.snapshot.snapshotId && listed.artifacts[1].snapshot.snapshotId === older.published.snapshot.snapshotId);
  check("p85_list_requires_exact_publication_links", listed.artifacts.every((entry) => entry.publicationState === "p84_exact_link" && entry.publicationLink));
  check("p85_list_single_rpc", listClient.trace.rpcCalls.length === 1, listClient.trace.rpcCalls);
  check("p85_list_expected_rpc", listClient.trace.rpcCalls[0].name === P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_LIST_RPC, listClient.trace.rpcCalls[0]);
  check("p85_list_rpc_has_only_limit_no_owner_parameter", canonicalJson(listClient.trace.rpcCalls[0].params) === canonicalJson({ p_limit: 2 }), listClient.trace.rpcCalls[0].params);
  check("p85_list_no_direct_table_reads", listClient.trace.fromCalls === 0, listClient.trace.fromCalls);
  check("p85_list_projection_exposes_no_operator_fields", !/(operator_note|admin_route|action_log|payment_evidence_refs|contact_email)/iu.test(canonicalJson(newest.row.publication_link)));
  const getClient = fakeReadClient({ getRows: [older.row] });
  const found = await getP85OwnerVisibleCustomerArtifact({ accountId: OWNER, snapshotId: older.published.snapshot.snapshotId, client: getClient });
  check("p85_get_returns_exact_artifact", found?.artifact.snapshot.snapshotId === older.published.snapshot.snapshotId);
  check("p85_get_single_rpc", getClient.trace.rpcCalls.length === 1 && getClient.trace.fromCalls === 0, getClient.trace);
  check("p85_get_rpc_has_only_snapshot_no_owner_parameter", canonicalJson(getClient.trace.rpcCalls[0].params) === canonicalJson({ p_snapshot_id: older.published.snapshot.snapshotId }), getClient.trace.rpcCalls[0].params);
  const missing = await getP85OwnerVisibleCustomerArtifact({ accountId: OWNER, snapshotId: older.published.snapshot.snapshotId, client: fakeReadClient({ getRows: [] }) });
  check("p85_missing_artifact_returns_null_without_disclosure", missing === null);

  await rejects("p85_list_requires_owner_client", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, client: null }), new RegExp(P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_BOUNDARY_REQUIRED));
  await rejects("p85_get_requires_owner_client", () => getP85OwnerVisibleCustomerArtifact({ accountId: OWNER, snapshotId: older.published.snapshot.snapshotId, client: null }), new RegExp(P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_BOUNDARY_REQUIRED));
  await rejects("p85_invalid_owner_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: "x", client: fakeReadClient() }), /account_invalid/);
  await rejects("p85_preview_owner_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: "preview:x", client: fakeReadClient() }), /account_invalid/);
  await rejects("p85_limit_zero_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, limit: 0, client: fakeReadClient() }), /limit_invalid/);
  await rejects("p85_limit_over_50_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, limit: 51, client: fakeReadClient() }), /limit_invalid/);
  await rejects("p85_invalid_snapshot_id_rejected", () => getP85OwnerVisibleCustomerArtifact({ accountId: OWNER, snapshotId: "bad", client: fakeReadClient() }), /snapshot_id_invalid/);
  await rejects("p85_list_rpc_error_fails_closed", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, client: fakeReadClient({ listError: "RLS denied" }) }), /list_failed:RLS denied/);
  await rejects("p85_get_rpc_error_fails_closed", () => getP85OwnerVisibleCustomerArtifact({ accountId: OWNER, snapshotId: older.published.snapshot.snapshotId, client: fakeReadClient({ getError: "RLS denied" }) }), /get_failed:RLS denied/);
  await rejects("p85_list_non_array_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, client: { rpc: async () => ({ data: {}, error: null }) } }), /list_response_invalid/);
  await rejects("p85_list_over_limit_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, limit: 1, client: fakeReadClient({ listRows: [newest.row, older.row] }) }), /list_response_invalid/);
  await rejects("p85_duplicate_snapshot_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, limit: 2, client: fakeReadClient({ listRows: [newest.row, newest.row] }) }), /duplicate_snapshot/);
  await rejects("p85_out_of_order_rows_rejected", () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, limit: 2, client: fakeReadClient({ listRows: [older.row, newest.row] }) }), /order_invalid/);
  await rejects("p85_get_ambiguous_rows_rejected", () => getP85OwnerVisibleCustomerArtifact({ accountId: OWNER, snapshotId: older.published.snapshot.snapshotId, client: fakeReadClient({ getRows: [older.row, older.row] }) }), /get_response_invalid/);
  await rejects("p85_get_identity_mismatch_rejected", () => getP85OwnerVisibleCustomerArtifact({ accountId: OWNER, snapshotId: older.published.snapshot.snapshotId, client: fakeReadClient({ getRows: [newest.row] }) }), /get_identity_mismatch/);
  const mutations = [
    ["p85_extra_row_field_rejected", (row) => { row.operator_note = "leak"; }, /row_shape_invalid/],
    ["p85_missing_row_field_rejected", (row) => { delete row.publication_state; }, /row_shape_invalid/],
    ["p85_wrong_visibility_schema_rejected", (row) => { row.visibility_schema_version = "forged"; }, /schema_invalid/],
    ["p85_orphan_audit_row_rejected", (row) => { row.publication_state = "not_applicable"; row.publication_link = null; }, /publication_missing/],
    ["p85_wrong_row_owner_rejected", (row) => { row.account_id = OTHER_OWNER; }, /owner_immutable_conflict/],
    ["p85_wrong_row_owner_hash_rejected", (row) => { row.account_id_hash = "0".repeat(64); }, /account_hash_mismatch|owner_hash_invalid/],
    ["p85_wrong_row_snapshot_digest_rejected", (row) => { row.snapshot_digest = `sha256:${"1".repeat(64)}`; }, /snapshot_digest_mismatch/],
    ["p85_wrong_row_artifact_digest_rejected", (row) => { row.artifact_digest = `sha256:${"2".repeat(64)}`; }, /artifact_digest_mismatch/],
    ["p85_wrong_row_pdf_storage_rejected", (row) => { row.pdf_storage = "legacy_deterministic_rerender"; }, /pdf_storage_mismatch/],
    ["p85_link_owner_rejected", (row) => { row.publication_link.account_id = OTHER_OWNER; }, /link_row_integrity_invalid/],
    ["p85_link_owner_hash_rejected", (row) => { row.publication_link.account_id_hash = "0".repeat(64); }, /link_row_integrity_invalid/],
    ["p85_link_snapshot_digest_rejected", (row) => { row.publication_link.artifact_snapshot_digest = `sha256:${"3".repeat(64)}`; }, /publication_mismatch/],
    ["p85_link_artifact_digest_rejected", (row) => { row.publication_link.artifact_digest = `sha256:${"4".repeat(64)}`; }, /publication_mismatch/],
    ["p85_link_pdf_digest_rejected", (row) => { row.publication_link.pdf_digest = `sha256:${"5".repeat(64)}`; }, /publication_mismatch/],
    ["p85_link_extra_field_rejected", (row) => { row.publication_link.admin_route = "/leak"; }, /link_row_shape_invalid/],
  ];
  for (const [id, mutate, pattern] of mutations) {
    const row = clone(newest.row); mutate(row);
    await rejects(id, () => listP85OwnerVisibleCustomerArtifacts({ accountId: OWNER, limit: 1, client: fakeReadClient({ listRows: [row] }) }), pattern);
  }
  const receipt = { schemaVersion: "velmere.p85.owner-visible-customer-artifact-runtime.v1", generatedAt: new Date().toISOString(),
    fixtureGeneratedAt: [newest.published.snapshot.generatedAt, older.published.snapshot.generatedAt],
    status: CHECKS.every((row) => row.status === "PASS") ? "PASS_BOUNDED_LOCAL_MOCKED_OWNER_RPC" : "FAIL",
    classification: "DEFENSIVE_LOCAL_DATABASE_PUBLICATION_VISIBILITY_AND_OWNER_RPC_VALIDATION",
    runtime: { node: process.version, platform: process.platform, arch: process.arch, exactWindowsCredit: "WITHHELD" },
    implementation: { readId: P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_READ_ID, listRpc: P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_LIST_RPC,
      getRpc: P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_GET_RPC, accountIdentityParameterAccepted: false, directTableCalls: 0,
      routeQueryModel: "ONE_OWNER_SCOPED_RPC_PER_LIST_OR_GET", limitAfterPublicationVisibility: "STATIC_SQL_PROVEN_RUNTIME_POSTGRES_WITHHELD" },
    fixtures: [newest, older].map(({ published }) => ({ snapshotId: published.snapshot.snapshotId, snapshotDigest: published.snapshot.snapshotDigest,
      artifactDigest: published.snapshot.canonicalArtifact.artifactDigest, pdfDigest: published.blob.pdfDigest,
      linkSchema: published.link.schemaVersion, generatedAt: published.snapshot.generatedAt })),
    checks: { total: CHECKS.length, passed: CHECKS.filter((row) => row.status === "PASS").length,
      failed: CHECKS.filter((row) => row.status === "FAIL").length, rows: CHECKS },
    zeroFakeCredit: { authorizedPostgresExecution: "WITHHELD_NO_SERVER_BINARY_OR_NETWORK_RETRIEVAL", realSupabaseRLS: "WITHHELD",
      realOwnerJwtIsolation: "WITHHELD", deployedHttp: "WITHHELD", customerFinal: "0/20", auditFinalPdf: "0/3",
      currentExploitability: false, exactWindows: "WITHHELD" } };
  await mkdir("receipts/p85", { recursive: true });
  await writeFile("receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
