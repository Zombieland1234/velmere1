#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

const GENERATED_AT = "2026-08-20T18:30:00.000Z";
const OWNER = "account:p84-atomic-owner-0001";
const OTHER_OWNER = "account:p84-other-owner-0002";
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
  if (!condition) throw new Error(`P84 runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
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
  check("p84_fixture_clock_frozen", new Date().toISOString() === GENERATED_AT && Date.now() === REAL_DATE.parse(GENERATED_AT));
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "preview";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = "p84-local-only-projection-secret-0123456789abcdef";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "p84-local-fixture";

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
      P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_ID,
      P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC,
      P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC_SCHEMA,
      P84_AUDIT_EXACT_ARTIFACT_DURABLE_STORAGE_REQUIRED,
      publishP84AuditExactArtifactOwnerReadable,
    },
    {
      P84_AUDIT_CUSTOMER_ARTIFACT_LINK_SCHEMA,
      hasAuditAccountMessageExactArtifactLink,
      parseP84AuditCustomerArtifactLinkRow,
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
    import("../../lib/reporting/audit-exact-artifact-owner-readable-publisher.ts"),
    import("../../lib/account/audit-account-messages.ts"),
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
    symbol: "P84FIXTURE",
    name: "P84 ATOMIC PUBLICATION FIXTURE - NOT CUSTOMER FINAL",
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
      id: "p84-atomic-publication",
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
        id: "p84-atomic-publication",
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
    schemaVersion: "p84-local-audit-customer-pipeline-fixture-v1",
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
    requestId: "p84-atomic-request",
    projectName: "P84 ATOMIC PUBLICATION FIXTURE",
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
      id: "msg-p84-atomic-publication",
      title: "P84 atomic Audit fixture",
      body: "Defensive local transaction-boundary validation. Not a customer FINAL report.",
      status: "ready",
      packageLabel: "Velmere Basic Audit - P84 fixture",
      requestId: "p84-atomic-request",
      createdAt: GENERATED_AT,
      eta: "fixture-only",
      accountRoute: "/en/account?tab=messages",
      nextSteps: ["Staging PostgreSQL and exact Windows remain WITHHELD."],
    },
    accountId: OWNER,
    locale: "en",
    reviewLevel: "basic_review",
    projectName: "P84 ATOMIC PUBLICATION FIXTURE",
    contractAddress: TARGET,
    publicReportRoute: "/en/security/audits/customer-report/p84-atomic-request",
    adminRoute: "/en/admin/security/audit-inbox",
    exportRoute: "/api/security/audit/export/p84-atomic-request",
    paymentEvidenceRefs: [],
  };

  check("p84_unbound_snapshot_verifies", verifyAuditAccountCustomerSnapshot(unboundAuditSnapshot));
  check("p84_unbound_snapshot_has_no_exact_binding", !hasExactAuditAccountArtifactBinding(unboundAuditSnapshot));
  check("p84_account_artifact_snapshot_verifies", verifyPass4822AccountCustomerArtifactSnapshot(accountArtifactSnapshot));
  check("p84_rendered_pdf_matches_artifact", renderedPdf.pdfDigest === accountArtifactSnapshot.canonicalArtifact.pdfDigest);

  function responseFor(params, overrides = {}) {
    const base = {
      schemaVersion: P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC_SCHEMA,
      createdArtifact: true,
      createdMessage: true,
      createdLink: true,
      snapshot: params.p_snapshot,
      blob: { ...params.p_blob, pdfBase64: params.p_pdf_base64 },
      message: {
        ...params.p_message,
        exact_account_artifact_snapshot_id: params.p_snapshot.snapshotId,
      },
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
    return overrides.mutate ? overrides.mutate(clone(base)) : base;
  }

  function fakePublisherClient(options = {}) {
    const calls = [];
    let fromCalls = 0;
    return {
      calls,
      get fromCalls() { return fromCalls; },
      from() {
        fromCalls += 1;
        throw new Error("P84 direct table write/read forbidden in atomic publisher");
      },
      async rpc(name, params) {
        calls.push({ name, params: clone(params) });
        if (options.error) return { data: null, error: { message: options.error } };
        return { data: responseFor(params, options), error: null };
      },
    };
  }

  function linkRowFromRecord(link) {
    return {
      schema_version: link.schemaVersion,
      snapshot_id: link.snapshotId,
      message_id: link.messageId,
      account_id: link.accountId,
      account_id_hash: link.accountIdHash,
      audit_snapshot_digest: link.auditSnapshotDigest,
      artifact_snapshot_digest: link.artifactSnapshotDigest,
      artifact_digest: link.artifactDigest,
      pdf_blob_id: link.pdfBlobId,
      pdf_digest: link.pdfDigest,
      linked_at: link.linkedAt,
      created_at: link.createdAt,
    };
  }

  function fakeOwnerReadClient(rows, options = {}) {
    const trace = { table: null, select: null, filters: [], limit: null };
    const query = {
      select(columns) {
        trace.select = columns;
        return query;
      },
      eq(column, value) {
        trace.filters.push([column, value]);
        return query;
      },
      async limit(value) {
        trace.limit = value;
        return options.error
          ? { data: null, error: { message: options.error } }
          : { data: clone(rows), error: null };
      },
    };
    return {
      trace,
      from(table) {
        trace.table = table;
        return query;
      },
    };
  }

  await rejects(
    "p84_no_durable_client_fails_closed",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: null,
    }),
    new RegExp(P84_AUDIT_EXACT_ARTIFACT_DURABLE_STORAGE_REQUIRED),
  );
  await rejects(
    "p84_preview_owner_rejected_before_rpc",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: "preview:p84-owner",
      messageInput: { ...messageInput, accountId: "preview:p84-owner" },
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient(),
    }),
    /real_owner_required/,
  );

  const client = fakePublisherClient();
  const published = await publishP84AuditExactArtifactOwnerReadable({
    accountId: OWNER,
    messageInput,
    auditSnapshot: unboundAuditSnapshot,
    accountArtifactSnapshot,
    pdfBytes: renderedPdf.bytes,
    client,
  });
  check("p84_owner_readable_publication_schema", published.schemaVersion === P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_ID);
  check("p84_single_rpc_call", client.calls.length === 1, client.calls.length);
  check("p84_expected_rpc_name", client.calls[0].name === P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC, client.calls[0].name);
  check("p84_no_direct_table_calls", client.fromCalls === 0, client.fromCalls);
  check("p84_atomic_transaction_and_link_claim_closed", published.atomicDatabaseTransaction === true && published.ownerReadableLinkCommitted === true && published.source === "supabase");
  check("p84_created_bundle_message_and_link", published.createdArtifact && published.createdMessage && published.createdLink);
  check("p84_bound_snapshot_verifies", verifyAuditAccountCustomerSnapshot(published.auditSnapshot));
  check("p84_bound_snapshot_has_exact_binding", hasExactAuditAccountArtifactBinding(published.auditSnapshot));
  check("p84_message_links_exact_snapshot", published.message.canonicalCustomerSnapshot?.exactAccountArtifact?.snapshotId === published.snapshot.snapshotId);
  check("p84_message_owner_bound", published.message.accountId === OWNER);
  check("p84_minimal_link_owner_bound", published.link.accountId === OWNER && published.link.accountIdHash === hashVelmereAccountBinding(OWNER));
  check("p84_minimal_link_artifact_bound", published.link.snapshotId === published.snapshot.snapshotId && published.link.artifactSnapshotDigest === published.snapshot.snapshotDigest && published.link.artifactDigest === published.snapshot.canonicalArtifact.artifactDigest);
  check("p84_minimal_link_pdf_bound", published.link.pdfBlobId === published.blob.blobId && published.link.pdfDigest === published.blob.pdfDigest);
  check("p84_minimal_link_audit_bound", published.link.auditSnapshotDigest === published.auditSnapshot.snapshotDigest && published.link.messageId === published.message.id);
  check("p84_rpc_pdf_bytes_base64_bound", Buffer.from(client.calls[0].params.p_pdf_base64, "base64").equals(Buffer.from(renderedPdf.bytes)));
  const rpcMessage = client.calls[0].params.p_message;
  check("p84_rpc_message_shape_exact_29", Object.keys(rpcMessage).length === 29, Object.keys(rpcMessage).sort());
  check("p84_rpc_message_has_no_undefined", Object.values(rpcMessage).every((value) => value !== undefined));
  check("p84_rpc_nested_message_excludes_canonical_snapshot", !("canonicalCustomerSnapshot" in rpcMessage.message));
  check("p84_rpc_message_snapshot_digest_cross_bound", rpcMessage.canonical_customer_snapshot_digest === published.auditSnapshot.snapshotDigest);
  check("p84_rpc_payload_canonical_matches_snapshot", client.calls[0].params.p_payload_canonical === canonicalJson(accountArtifactSnapshot.payload));
  const rpcEnvelope = canonicalJson(client.calls[0].params);
  check("p84_rpc_envelope_has_no_rpc_url", !/https?:\/\//iu.test(rpcEnvelope));
  check("p84_rpc_envelope_has_no_raw_solidity_or_abi", !/(pragma solidity|rawSource|sourceCode|rawAbi|contractAbi)/iu.test(rpcEnvelope));
  check("p84_link_exposes_no_operator_or_payment_fields", !/(operator|admin_route|action_log|payment|contact_email|message_status)/iu.test(canonicalJson(linkRowFromRecord(published.link))));

  const idempotentClient = fakePublisherClient({
    mutate(payload) {
      payload.createdArtifact = false;
      payload.createdMessage = false;
      payload.createdLink = false;
      return payload;
    },
  });
  const idempotent = await publishP84AuditExactArtifactOwnerReadable({
    accountId: OWNER,
    messageInput,
    auditSnapshot: unboundAuditSnapshot,
    accountArtifactSnapshot,
    pdfBytes: renderedPdf.bytes,
    client: idempotentClient,
  });
  check("p84_idempotent_existing_bundle_message_and_link", !idempotent.createdArtifact && !idempotent.createdMessage && !idempotent.createdLink);

  await rejects(
    "p84_rpc_error_fails_closed",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ error: "simulated transaction rollback" }),
    }),
    /owner_readable_publish_failed:simulated transaction rollback/,
  );
  await rejects(
    "p84_wrong_rpc_schema_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ mutate(payload) { payload.schemaVersion = "forged"; return payload; } }),
    }),
    /invalid_rpc_response/,
  );
  await rejects(
    "p84_extra_rpc_field_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ mutate(payload) { payload.operatorNote = "leak"; return payload; } }),
    }),
    /invalid_rpc_response_shape/,
  );
  await rejects(
    "p84_missing_rpc_field_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ mutate(payload) { delete payload.createdLink; return payload; } }),
    }),
    /invalid_rpc_response_shape/,
  );
  await rejects(
    "p84_tampered_pdf_bundle_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ mutate(payload) { payload.blob.pdfDigest = `sha256:${"f".repeat(64)}`; return payload; } }),
    }),
    /pdf_row_invalid|immutable_conflict|atomic_write_failed/,
  );
  await rejects(
    "p84_tampered_message_owner_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ mutate(payload) { payload.message.account_id = OTHER_OWNER; return payload; } }),
    }),
    /message_response_invalid|snapshot_integrity|owner/,
  );
  await rejects(
    "p84_tampered_message_content_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ mutate(payload) { payload.message.message.title = "forged customer title"; return payload; } }),
    }),
    /message_response_invalid/,
  );
  await rejects(
    "p84_tampered_message_snapshot_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient({ mutate(payload) { payload.message.canonical_customer_snapshot_digest = `sha256:${"e".repeat(64)}`; return payload; } }),
    }),
    /snapshot_digest_mismatch|message_response_invalid/,
  );
  for (const [id, mutate] of [
    ["p84_tampered_link_owner_rejected", (payload) => { payload.link.account_id = OTHER_OWNER; }],
    ["p84_tampered_link_owner_hash_rejected", (payload) => { payload.link.account_id_hash = "0".repeat(64); }],
    ["p84_tampered_link_audit_digest_rejected", (payload) => { payload.link.audit_snapshot_digest = `sha256:${"1".repeat(64)}`; }],
    ["p84_tampered_link_artifact_digest_rejected", (payload) => { payload.link.artifact_digest = `sha256:${"2".repeat(64)}`; }],
    ["p84_tampered_link_pdf_digest_rejected", (payload) => { payload.link.pdf_digest = `sha256:${"3".repeat(64)}`; }],
    ["p84_tampered_link_time_rejected", (payload) => { payload.link.linked_at = "2026-08-20T00:00:00.000Z"; }],
    ["p84_tampered_link_schema_rejected", (payload) => { payload.link.schema_version = "forged"; }],
    ["p84_extra_link_field_rejected", (payload) => { payload.link.operator_note = "leak"; }],
  ]) {
    await rejects(
      id,
      () => publishP84AuditExactArtifactOwnerReadable({
        accountId: OWNER,
        messageInput,
        auditSnapshot: unboundAuditSnapshot,
        accountArtifactSnapshot,
        pdfBytes: renderedPdf.bytes,
        client: fakePublisherClient({ mutate(payload) { mutate(payload); return payload; } }),
      }),
      /link_row|link_response|integrity|shape/,
    );
  }
  await rejects(
    "p84_bound_base_snapshot_cannot_be_republished",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OWNER,
      messageInput,
      auditSnapshot: published.auditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient(),
    }),
    /base_snapshot_invalid/,
  );
  await rejects(
    "p84_cross_owner_artifact_rejected",
    () => publishP84AuditExactArtifactOwnerReadable({
      accountId: OTHER_OWNER,
      messageInput: { ...messageInput, accountId: OTHER_OWNER },
      auditSnapshot: unboundAuditSnapshot,
      accountArtifactSnapshot,
      pdfBytes: renderedPdf.bytes,
      client: fakePublisherClient(),
    }),
    /owner_mismatch/,
  );

  const validLinkRow = linkRowFromRecord(published.link);
  check("p84_link_row_parser_round_trip", parseP84AuditCustomerArtifactLinkRow(validLinkRow, { accountId: OWNER, snapshotId: published.snapshot.snapshotId }).pdfDigest === published.blob.pdfDigest);
  const ownerReadClient = fakeOwnerReadClient([validLinkRow]);
  check("p84_owner_link_lookup_succeeds", await hasAuditAccountMessageExactArtifactLink({ accountId: OWNER, snapshotId: published.snapshot.snapshotId, client: ownerReadClient }));
  check("p84_owner_lookup_uses_minimal_link_table", ownerReadClient.trace.table === "velmere_audit_customer_artifact_links", ownerReadClient.trace);
  check("p84_owner_lookup_never_selects_full_message", typeof ownerReadClient.trace.select === "string" && ownerReadClient.trace.select !== "*" && !/(operator_note|admin_route|action_log|payment_evidence_refs|message\b)/u.test(ownerReadClient.trace.select), ownerReadClient.trace.select);
  check("p84_owner_lookup_filters_owner_and_snapshot", canonicalJson(ownerReadClient.trace.filters) === canonicalJson([["account_id", OWNER], ["snapshot_id", published.snapshot.snapshotId]]), ownerReadClient.trace.filters);
  check("p84_owner_lookup_ambiguity_bound", ownerReadClient.trace.limit === 2, ownerReadClient.trace.limit);
  check("p84_missing_link_is_hidden", !(await hasAuditAccountMessageExactArtifactLink({ accountId: OWNER, snapshotId: published.snapshot.snapshotId, client: fakeOwnerReadClient([]) })));
  await rejects(
    "p84_ambiguous_link_rows_fail_closed",
    () => hasAuditAccountMessageExactArtifactLink({ accountId: OWNER, snapshotId: published.snapshot.snapshotId, client: fakeOwnerReadClient([validLinkRow, validLinkRow]) }),
    /ambiguous/,
  );
  await rejects(
    "p84_owner_lookup_storage_error_fails_closed",
    () => hasAuditAccountMessageExactArtifactLink({ accountId: OWNER, snapshotId: published.snapshot.snapshotId, client: fakeOwnerReadClient([], { error: "RLS denied" }) }),
    /link_lookup_failed:RLS denied/,
  );
  const forgedOwnerRow = { ...validLinkRow, account_id: OTHER_OWNER };
  await rejects(
    "p84_cross_owner_link_row_fails_closed",
    () => hasAuditAccountMessageExactArtifactLink({ accountId: OWNER, snapshotId: published.snapshot.snapshotId, client: fakeOwnerReadClient([forgedOwnerRow]) }),
    /integrity_invalid/,
  );

  const receipt = {
    schemaVersion: "velmere.p84.audit-customer-artifact-owner-read-runtime.v1",
    generatedAt: GENERATED_AT,
    fixtureGeneratedAt: GENERATED_AT,
    status: CHECKS.every((row) => row.status === "PASS") ? "PASS_BOUNDED_LOCAL_MOCKED_RPC" : "FAIL",
    classification: "DEFENSIVE_LOCAL_OWNER_READ_LINK_AND_ATOMIC_PUBLICATION_VALIDATION",
    runtime: { node: process.version, platform: process.platform, arch: process.arch, exactWindowsCredit: "WITHHELD" },
    implementation: {
      publisherId: P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_ID,
      rpc: P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC,
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
      linkSchema: published.link.schemaVersion,
      linkSnapshotId: published.link.snapshotId,
      linkPdfBlobId: published.link.pdfBlobId,
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
  await mkdir("receipts/p84", { recursive: true });
  await writeFile("receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
