#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

const GENERATED_AT = "2026-08-20T18:30:00.000Z";
const OWNER = "account:p83-atomic-owner-0001";
const OTHER_OWNER = "account:p83-other-owner-0002";
const TARGET = "0x0dabdc92af35615443412a336344c591faed3f90";
const CHECKS = [];
const REAL_DATE = Date;

function installFixedFixtureClock() {
  const fixedMs = REAL_DATE.parse(GENERATED_AT);
  globalThis.Date = class FixedDate extends REAL_DATE {
    constructor(...args) {
      super(...(args.length === 0 ? [fixedMs] : args));
    }

    static now() {
      return fixedMs;
    }
  };
}

function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  CHECKS.push(row);
  if (!condition) throw new Error(`P83 runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}

async function rejects(id, operation, pattern) {
  try {
    await operation();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    check(id, pattern.test(text), text);
    return;
  }
  check(id, false, "operation unexpectedly succeeded");
}

function clone(value) {
  return structuredClone(value);
}

async function main() {
  installFixedFixtureClock();
  check("p83_fixture_clock_frozen", new Date().toISOString() === GENERATED_AT && Date.now() === REAL_DATE.parse(GENERATED_AT));
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "preview";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = "p83-local-only-projection-secret-0123456789abcdef";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "p83-local-fixture";

  const [
    { canonicalJson },
    { sha256Digest },
    { createPass4644ProviderEvidenceReceipt },
    { buildCustomerReportPayload },
    { buildCustomerReportLayoutModel },
    { hashVelmereAccountBinding },
    {
      buildAuditAccountCustomerSnapshot,
      hasExactAuditAccountArtifactBinding,
      verifyAuditAccountCustomerSnapshot,
    },
    { renderCustomerSafeAuditPdf },
    {
      PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
      buildPass4822AccountCustomerArtifactSnapshot,
      verifyPass4822AccountCustomerArtifactSnapshot,
    },
    {
      P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_ID,
      P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RPC,
      P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RPC_SCHEMA,
      P83_AUDIT_EXACT_ARTIFACT_DURABLE_STORAGE_REQUIRED,
      publishP83AuditExactArtifactAtomically,
    },
  ] = await Promise.all([
    import("../../lib/security/canonical-json.ts"),
    import("../../lib/security/cryptographic-digest.ts"),
    import("../../lib/market-integrity/provider-evidence-receipt.ts"),
    import("../../lib/market-integrity/customer-report-payload.ts"),
    import("../../lib/market-integrity/customer-report-layout-model.ts"),
    import("../../lib/auth/account-session.ts"),
    import("../../lib/security/audit-account-customer-snapshot.ts"),
    import("../../lib/security/customer-safe-audit-layout.ts"),
    import("../../lib/reporting/account-customer-artifact-snapshot.ts"),
    import("../../lib/reporting/audit-exact-artifact-atomic-publisher.ts"),
  ]);

  const receiptBase = {
    surface: "contract_audit",
    verification: "normalized_response",
    state: "confirmed",
    requestedIdentity: TARGET,
    resolvedAddress: TARGET,
    resolvedChainId: "56",
    identityMatched: true,
    timestampProvenance: "provider",
    observedAt: "2026-08-20T18:29:00.000Z",
    receivedAt: GENERATED_AT,
    ttlMs: 10 * 60_000,
    httpStatus: 200,
    latencyMs: 10,
  };
  const providerEvidenceReceipts = [
    createPass4644ProviderEvidenceReceipt({
      ...receiptBase,
      providerId: "bscscan",
      providerFamily: "bscscan",
      capabilities: ["identity", "bytecode"],
      normalizedPayload: { chainId: "56", address: TARGET, runtimeCodeHash: `sha256:${"a".repeat(64)}` },
    }),
    createPass4644ProviderEvidenceReceipt({
      ...receiptBase,
      providerId: "defillama",
      providerFamily: "defillama",
      capabilities: ["identity", "configuration"],
      normalizedPayload: { chainId: "56", address: TARGET, fixtureBoundary: "offline deterministic only" },
    }),
  ];
  const customerReport = buildCustomerReportPayload({
    locale: "en",
    tier: "Basic",
    symbol: "P83FIXTURE",
    name: "P83 ATOMIC PUBLICATION FIXTURE - NOT CUSTOMER FINAL",
    family: "defi_protocol",
    riskScore: 42,
    sourceFamilyCount: 2,
    missingEvidence: ["LOCAL_FIXTURE_ONLY: current exploitability, rights, staging PostgreSQL and exact Windows remain WITHHELD"],
    providerEvidenceReceipts,
    expectedCanonicalIdentity: `56:${TARGET}`,
    chartMode: "unavailable",
    generatedAt: GENERATED_AT,
    reportSurface: "security",
    chainId: "56",
    contractAddress: TARGET,
    decisionSections: [{
      id: "p83-atomic-publication",
      title: "Atomic Audit artifact publication",
      minimumTier: "Basic",
      state: "watch",
      summary: "Local deterministic transaction-boundary validation only; no current exploitability claim.",
      evidence: ["fixture:local-only", "snapshot/pdf/message must share one durable transaction"],
      actions: ["Execute the migration and RLS proof on authorized staging before customer FINAL."],
    }],
    executedTests: ["atomic RPC response verification", "owner binding", "tamper rejection", "no two-write fallback"],
    unexecutedTests: ["authorized staging PostgreSQL", "current RPC quorum", "independent replay", "exact Windows"],
  });
  const previewLayout = buildCustomerReportLayoutModel(customerReport);
  const projectionUnsigned = {
    report: {
      topFindings: [{
        id: "p83-atomic-publication",
        severity: "medium",
        title: "Atomic exact artifact publication fixture",
        publicLine: "The fixture validates delivery plumbing only; current exploitability remains WITHHELD.",
        proLine: "No production database or current-chain risk claim is established.",
        sourceFamily: "local_fixture",
        advancedAction: "Run authorized staging migration/RLS and exact-Windows validation.",
      }],
    },
  };
  const projection = { ...projectionUnsigned, projectionDigest: sha256Digest(canonicalJson(projectionUnsigned)) };
  const pipelineUnsigned = {
    schemaVersion: "p83-local-audit-customer-pipeline-fixture-v1",
    requestedTier: "basic",
    deliveredTier: "basic",
    releaseState: "ready",
    projection,
    customerReport,
    customerReportPreviewLayout: previewLayout,
    sourceTruth: {
      strictLaneCount: 2,
      strictUpstreamRoots: customerReport.sourceBinding.independentContentBoundUpstreams,
      providerReceiptCount: providerEvidenceReceipts.length,
      adjudicatedAuthorityReceiptCount: 0,
      adjudicatedAuthorityEvidenceDigest: null,
      contentBoundProviderReceiptCount: customerReport.sourceBinding.contentBoundReceiptCount,
    },
    rule: "LOCAL_FIXTURE_ONLY - no customer FINAL, rights or exploitability credit",
  };
  const pipeline = { ...pipelineUnsigned, pipelineDigest: sha256Digest(canonicalJson(pipelineUnsigned)) };
  const unboundAuditSnapshot = buildAuditAccountCustomerSnapshot({
    pipeline,
    accountIdHash: hashVelmereAccountBinding(OWNER),
    requestId: "p83-atomic-request",
    projectName: "P83 ATOMIC PUBLICATION FIXTURE",
    targetLabel: `56:${TARGET} fixture-only`,
  });
  const renderedPdf = renderCustomerSafeAuditPdf(unboundAuditSnapshot.layoutInput);
  const accountArtifactSnapshot = buildPass4822AccountCustomerArtifactSnapshot({
    accountId: OWNER,
    surface: "audit",
    payloadKind: "audit_customer_report_v1",
    reportId: unboundAuditSnapshot.reportId,
    requestedTier: unboundAuditSnapshot.requestedTier,
    deliveredTier: unboundAuditSnapshot.deliveredTier,
    locale: unboundAuditSnapshot.locale,
    title: unboundAuditSnapshot.layoutInput.title,
    subject: unboundAuditSnapshot.targetLabel,
    generatedAt: unboundAuditSnapshot.generatedAt,
    payload: customerReport,
    canonicalArtifact: unboundAuditSnapshot.canonicalArtifact,
    pdfStorage: PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
  });
  const messageInput = {
    message: {
      id: "msg-p83-atomic-publication",
      title: "P83 atomic Audit fixture",
      body: "Defensive local transaction-boundary validation. Not a customer FINAL report.",
      status: "ready",
      packageLabel: "Velmere Basic Audit - P83 fixture",
      requestId: "p83-atomic-request",
      createdAt: GENERATED_AT,
      eta: "fixture-only",
      accountRoute: "/en/account?tab=messages",
      nextSteps: ["Staging PostgreSQL and exact Windows remain WITHHELD."],
    },
    accountId: OWNER,
    locale: "en",
    reviewLevel: "basic_review",
    projectName: "P83 ATOMIC PUBLICATION FIXTURE",
    contractAddress: TARGET,
    publicReportRoute: "/en/security/audits/customer-report/p83-atomic-request",
    adminRoute: "/en/admin/security/audit-inbox",
    exportRoute: "/api/security/audit/export/p83-atomic-request",
    paymentEvidenceRefs: [],
  };

  check("p83_unbound_snapshot_verifies", verifyAuditAccountCustomerSnapshot(unboundAuditSnapshot));
  check("p83_unbound_snapshot_has_no_exact_binding", !hasExactAuditAccountArtifactBinding(unboundAuditSnapshot));
  check("p83_account_artifact_snapshot_verifies", verifyPass4822AccountCustomerArtifactSnapshot(accountArtifactSnapshot));
  check("p83_rendered_pdf_matches_artifact", renderedPdf.pdfDigest === accountArtifactSnapshot.canonicalArtifact.pdfDigest);

  function responseFor(params, overrides = {}) {
    const base = {
      schemaVersion: P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RPC_SCHEMA,
      createdMessage: true,
      bundle: {
        schemaVersion: "pass4824-account-customer-artifact-pdf-bundle-rpc-v1",
        created: true,
        snapshot: params.p_snapshot,
        blob: { ...params.p_blob, pdfBase64: params.p_pdf_base64 },
      },
      message: {
        ...params.p_message,
        exact_account_artifact_snapshot_id: params.p_snapshot.snapshotId,
      },
    };
    return overrides.mutate ? overrides.mutate(clone(base)) : base;
  }

  function fakeClient(options = {}) {
    const calls = [];
    let fromCalls = 0;
    return {
      calls,
      get fromCalls() { return fromCalls; },
      from() {
        fromCalls += 1;
        throw new Error("P83 direct table write/read forbidden in atomic publisher");
      },
      async rpc(name, params) {
        calls.push({ name, params: clone(params) });
        if (options.error) return { data: null, error: { message: options.error } };
        return { data: responseFor(params, options), error: null };
      },
    };
  }

  await rejects(
    "p83_no_durable_client_fails_closed",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: null,
    }),
    new RegExp(P83_AUDIT_EXACT_ARTIFACT_DURABLE_STORAGE_REQUIRED),
  );
  await rejects(
    "p83_preview_owner_rejected_before_rpc",
    () => publishP83AuditExactArtifactAtomically({
      accountId: "preview:p83-owner",
      messageInput: { ...messageInput, accountId: "preview:p83-owner" },
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient(),
    }),
    /real_owner_required/,
  );

  const client = fakeClient();
  const published = await publishP83AuditExactArtifactAtomically({
    accountId: OWNER,
    messageInput,
    auditSnapshot: unboundAuditSnapshot,
    accountArtifactSnapshot,
    pdfBytes: renderedPdf.bytes,
    client,
  });
  check("p83_atomic_publication_schema", published.schemaVersion === P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_ID);
  check("p83_single_rpc_call", client.calls.length === 1, client.calls.length);
  check("p83_expected_rpc_name", client.calls[0].name === P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RPC, client.calls[0].name);
  check("p83_no_direct_table_calls", client.fromCalls === 0, client.fromCalls);
  check("p83_atomic_transaction_claim_closed", published.atomicDatabaseTransaction === true && published.source === "supabase");
  check("p83_created_pair_and_message", published.createdArtifact && published.createdMessage);
  check("p83_bound_snapshot_verifies", verifyAuditAccountCustomerSnapshot(published.auditSnapshot));
  check("p83_bound_snapshot_has_exact_binding", hasExactAuditAccountArtifactBinding(published.auditSnapshot));
  check("p83_message_links_exact_snapshot", published.message.canonicalCustomerSnapshot?.exactAccountArtifact?.snapshotId === published.snapshot.snapshotId);
  check("p83_message_owner_bound", published.message.accountId === OWNER);
  check("p83_rpc_pdf_bytes_base64_bound", Buffer.from(client.calls[0].params.p_pdf_base64, "base64").equals(Buffer.from(renderedPdf.bytes)));
  const rpcMessage = client.calls[0].params.p_message;
  check("p83_rpc_message_shape_exact_29", Object.keys(rpcMessage).length === 29, Object.keys(rpcMessage).sort());
  check("p83_rpc_message_has_no_undefined", Object.values(rpcMessage).every((value) => value !== undefined));
  check("p83_rpc_nested_message_excludes_canonical_snapshot", !("canonicalCustomerSnapshot" in rpcMessage.message));
  check("p83_rpc_message_snapshot_digest_cross_bound", rpcMessage.canonical_customer_snapshot_digest === published.auditSnapshot.snapshotDigest);
  check("p83_rpc_payload_canonical_matches_snapshot", client.calls[0].params.p_payload_canonical === canonicalJson(accountArtifactSnapshot.payload));
  const rpcEnvelope = canonicalJson(client.calls[0].params);
  check("p83_rpc_envelope_has_no_rpc_url", !/https?:\/\//iu.test(rpcEnvelope));
  check("p83_rpc_envelope_has_no_raw_solidity_or_abi", !/(pragma solidity|rawSource|sourceCode|rawAbi|contractAbi)/iu.test(rpcEnvelope));

  const idempotentClient = fakeClient({
    mutate(payload) {
      payload.createdMessage = false;
      payload.bundle.created = false;
      return payload;
    },
  });
  const idempotent = await publishP83AuditExactArtifactAtomically({
    accountId: OWNER,
    messageInput,
    auditSnapshot: unboundAuditSnapshot,
    accountArtifactSnapshot,
    pdfBytes: renderedPdf.bytes,
    client: idempotentClient,
  });
  check("p83_idempotent_existing_bundle_and_message", !idempotent.createdArtifact && !idempotent.createdMessage);

  await rejects(
    "p83_rpc_error_fails_closed",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient({ error: "simulated transaction rollback" }),
    }),
    /atomic_publish_failed:simulated transaction rollback/,
  );
  await rejects(
    "p83_wrong_rpc_schema_rejected",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient({ mutate(payload) { payload.schemaVersion = "forged"; return payload; } }),
    }),
    /invalid_rpc_response/,
  );
  await rejects(
    "p83_tampered_pdf_bundle_rejected",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient({ mutate(payload) { payload.bundle.blob.pdfDigest = `sha256:${"f".repeat(64)}`; return payload; } }),
    }),
    /pdf_row_invalid|immutable_conflict|atomic_write_failed/,
  );
  await rejects(
    "p83_tampered_message_owner_rejected",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient({ mutate(payload) { payload.message.account_id = OTHER_OWNER; return payload; } }),
    }),
    /message_response_invalid|snapshot_integrity|owner/,
  );
  await rejects(
    "p83_tampered_message_content_rejected",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient({ mutate(payload) { payload.message.message.title = "forged customer title"; return payload; } }),
    }),
    /message_response_invalid/,
  );
  await rejects(
    "p83_tampered_message_route_rejected",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient({ mutate(payload) { payload.message.public_report_route = "/forged-route"; return payload; } }),
    }),
    /message_response_invalid/,
  );
  await rejects(
    "p83_tampered_message_snapshot_rejected",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient({ mutate(payload) { payload.message.canonical_customer_snapshot_digest = `sha256:${"e".repeat(64)}`; return payload; } }),
    }),
    /snapshot_digest_mismatch|message_response_invalid/,
  );
  await rejects(
    "p83_bound_base_snapshot_cannot_be_republished",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OWNER,
      messageInput,
      auditSnapshot: published.auditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient(),
    }),
    /base_snapshot_invalid/,
  );
  await rejects(
    "p83_cross_owner_artifact_rejected",
    () => publishP83AuditExactArtifactAtomically({
      accountId: OTHER_OWNER,
      messageInput: { ...messageInput, accountId: OTHER_OWNER },
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakeClient(),
    }),
    /owner_mismatch/,
  );

  const receipt = {
    schemaVersion: "velmere.p83.audit-exact-artifact-atomic-publication-runtime.v1",
    generatedAt: GENERATED_AT,
    fixtureGeneratedAt: GENERATED_AT,
    status: CHECKS.every((row) => row.status === "PASS") ? "PASS_BOUNDED_LOCAL_MOCKED_RPC" : "FAIL",
    classification: "DEFENSIVE_LOCAL_ATOMIC_TRANSACTION_BOUNDARY_VALIDATION",
    runtime: { node: process.version, platform: process.platform, arch: process.arch, exactWindowsCredit: "WITHHELD" },
    implementation: {
      publisherId: P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_ID,
      rpc: P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RPC,
      rpcCallsPerPublication: 1,
      directTableCalls: 0,
      durableFallback: "NONE_FAIL_CLOSED",
    },
    artifact: {
      snapshotId: published.snapshot.snapshotId,
      snapshotDigest: published.snapshot.snapshotDigest,
      auditSnapshotId: published.auditSnapshot.snapshotId,
      auditSnapshotDigest: published.auditSnapshot.snapshotDigest,
      pdfDigest: published.blob.pdfDigest,
      pdfByteLength: published.blob.pdfByteLength,
      messageId: published.message.id,
      ownerHash: published.snapshot.accountIdHash,
    },
    checks: {
      total: CHECKS.length,
      passed: CHECKS.filter((row) => row.status === "PASS").length,
      failed: CHECKS.filter((row) => row.status === "FAIL").length,
      rows: CHECKS,
    },
    zeroFakeCredit: {
      authorizedPostgresExecution: "WITHHELD",
      RLSRuntime: "WITHHELD",
      deployedHttp: "WITHHELD",
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      currentExploitability: false,
      exactWindows: "WITHHELD",
    },
  };
  await mkdir("receipts/p83", { recursive: true });
  await writeFile("receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
