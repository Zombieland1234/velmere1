import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const RECEIPT_PATH = "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json";
const PDF_PATH = "artifacts/p80/P80_AUDIT_LOCAL_FIXTURE_NOT_CUSTOMER_FINAL.pdf";
const FIXTURE_GENERATED_AT = "2026-08-19T14:40:00.000Z";
const TARGET_ADDRESS = "0x0dabdc92af35615443412a336344c591faed3f90";
const TARGET_CHAIN_ID = "56";
const PRIVATE_SOURCE_SENTINEL = "contract P80_PRIVATE_SOURCE_SENTINEL_DO_NOT_EXPOSE";
const PRIVATE_ABI_SENTINEL = '"name":"P80_PRIVATE_ABI_SENTINEL_DO_NOT_EXPOSE"';

const checks = [];
function check(id, condition, detail = undefined) {
  const pass = Boolean(condition);
  checks.push({ id, status: pass ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!pass) throw new Error(`P80 check failed: ${id}${detail === undefined ? "" : ` (${String(detail)})`}`);
}

async function rejects(id, operation, expected) {
  try {
    await operation();
  } catch (error) {
    const text = error instanceof Error ? `${error.name}:${error.message}` : String(error);
    check(id, expected.test(text), text);
    return;
  }
  check(id, false, "operation unexpectedly succeeded");
}

function clone(value) {
  return structuredClone(value);
}

function bytesEqual(left, right) {
  return Buffer.from(left).equals(Buffer.from(right));
}

function sha256File(pathname) {
  return readFileSync(pathname);
}

async function main() {
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "preview";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = "p80-local-only-projection-secret-0123456789abcdef";
  process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "p80-local-fixture";

  const [
    { canonicalJson },
    { sha256Digest },
    { createPass4644ProviderEvidenceReceipt },
    { buildCustomerReportPayload },
    { buildCustomerReportLayoutModel },
    { hashVelmereAccountBinding, buildVelmereAccountCookie, buildVelmereAccountSession },
    {
      buildAuditAccountCustomerSnapshot,
      bindAuditAccountCustomerSnapshotToExactArtifact,
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
      assertPass4824PdfBlobMatchesSnapshot,
      verifyPass4824AccountCustomerArtifactPdfBlob,
    },
    {
      getPass4822AccountCustomerArtifactSnapshot,
      getPass4824AccountCustomerArtifactPdfBlob,
      storePass4824AccountCustomerArtifactPdfBundle,
    },
    { verifyExactCustomerPdfPreviewDownloadPair },
    { inspectPass4649PdfBinary },
    { storeAuditAccountMessage, hasAuditAccountMessageExactArtifactLink },
    { buildPass2374CustomerSafeRouteHealth },
    { PASS2375_ROUTE_HEALTH_LEDGER_ID },
    { buildPass2376FinalDeliveryGate },
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
    import("../../lib/reporting/account-customer-artifact-pdf-blob.ts"),
    import("../../lib/reporting/account-customer-artifact-store.ts"),
    import("../../lib/reporting/exact-customer-pdf-delivery.ts"),
    import("../../lib/market-integrity/commercial-staging-proof.ts"),
    import("../../lib/account/audit-account-messages.ts"),
    import("../../lib/security/customer-route-health.ts"),
    import("../../lib/security/route-health-ledger.ts"),
    import("../../lib/security/final-delivery-gate.ts"),
  ]);

  const ownerAccountId = "preview:p80-audit-exact-owner";
  const otherAccountId = "preview:p80-audit-other-owner";
  const requestId = "p80-local-fixture-request";
  const expectedCanonicalIdentity = `${TARGET_CHAIN_ID}:${TARGET_ADDRESS}`;
  const receiptBase = {
    surface: "contract_audit",
    verification: "normalized_response",
    state: "confirmed",
    requestedIdentity: TARGET_ADDRESS,
    resolvedAddress: TARGET_ADDRESS,
    resolvedChainId: TARGET_CHAIN_ID,
    identityMatched: true,
    timestampProvenance: "provider",
    observedAt: "2026-08-19T14:39:00.000Z",
    receivedAt: FIXTURE_GENERATED_AT,
    ttlMs: 10 * 60_000,
    httpStatus: 200,
    latencyMs: 12,
  };
  const providerEvidenceReceipts = [
    createPass4644ProviderEvidenceReceipt({
      ...receiptBase,
      providerId: "bscscan",
      providerFamily: "bscscan",
      capabilities: ["identity", "bytecode"],
      normalizedPayload: {
        chainId: TARGET_CHAIN_ID,
        address: TARGET_ADDRESS,
        runtimeCodeHash: `sha256:${"a".repeat(64)}`,
        fixtureBoundary: "read-only local deterministic fixture; no raw source or ABI",
      },
    }),
    createPass4644ProviderEvidenceReceipt({
      ...receiptBase,
      providerId: "defillama",
      providerFamily: "defillama",
      capabilities: ["identity", "liquidity"],
      normalizedPayload: {
        chainId: TARGET_CHAIN_ID,
        address: TARGET_ADDRESS,
        poolReference: "p80-fixture-only",
        tvlUsd: 123456,
        fixtureBoundary: "read-only local deterministic fixture",
      },
    }),
  ];
  check("p80_fixture_provider_receipts_content_bound", providerEvidenceReceipts.every((receipt) => receipt.commercialEvidenceEligible && receipt.rejectionReasons.length === 0));

  const customerReport = buildCustomerReportPayload({
    locale: "en",
    tier: "Basic",
    symbol: "P80FIXTURE",
    name: "P80 LOCAL FIXTURE - NOT CUSTOMER FINAL",
    family: "defi_protocol",
    riskScore: 42,
    sourceFamilyCount: 2,
    missingEvidence: [
      "LOCAL_FIXTURE_ONLY: current deployment state, current exploitability, independent replay, source rights and exact Windows remain WITHHELD",
    ],
    providerEvidenceReceipts,
    expectedCanonicalIdentity,
    chartMode: "unavailable",
    generatedAt: FIXTURE_GENERATED_AT,
    reportSurface: "security",
    chainId: TARGET_CHAIN_ID,
    contractAddress: TARGET_ADDRESS,
    decisionSections: [{
      id: "p80-exact-artifact-fixture",
      title: "P80 exact immutable Audit artifact plumbing",
      minimumTier: "Basic",
      state: "watch",
      summary: "Local deterministic storage and delivery validation only. It is not a current vulnerability or exploitability finding.",
      evidence: [
        "fixture:local-only",
        "expected boundary: same stored bytes for preview and download",
        "unsafe proof boundary: current exploitability WITHHELD",
      ],
      actions: [
        "Do not use this fixture as a production risk decision.",
        "Revalidate current public read-only state and rights before any real customer release.",
      ],
    }],
    executedTests: [
      "local deterministic exact-byte storage",
      "account binding",
      "tamper rejection",
      "preview/download byte parity",
      "customer-safe redaction boundary",
    ],
    unexecutedTests: [
      "current RPC quorum",
      "independent archival replay",
      "current exploitability adjudication",
      "source-rights closure",
      "exact Windows regression suite",
    ],
  });
  check("p80_fixture_basic_delivery_contract_ready", customerReport.deliveryPolicy.visibleTier === "Basic" && customerReport.deliveryPolicy.status === "ready_basic", customerReport.deliveryPolicy);
  check("p80_fixture_audit_field_packet", customerReport.pass4824CanonicalFieldPacket.module === "audit" && customerReport.pass4824CanonicalFieldPacket.tier === "basic");
  check("p80_fixture_two_independent_upstream_roots", customerReport.sourceBinding.independentContentBoundUpstreamCount === 2, customerReport.sourceBinding.independentContentBoundUpstreams);

  const customerReportPreviewLayout = buildCustomerReportLayoutModel(customerReport);
  const projectionUnsigned = {
    report: {
      topFindings: [{
        id: "p80-exact-artifact-plumbing",
        severity: "medium",
        title: "Exact immutable Audit artifact delivery fixture",
        publicLine: "Local fixture proves storage and delivery plumbing only; current exploitability remains WITHHELD.",
        proLine: "The fixture does not establish current deployment risk, rights, or independent replay.",
        sourceFamily: "local_fixture",
        advancedAction: "Run current read-only state quorum and independent replay before any real release.",
      }],
    },
  };
  const projection = {
    ...projectionUnsigned,
    projectionDigest: sha256Digest(canonicalJson(projectionUnsigned)),
  };
  const pipelineUnsigned = {
    schemaVersion: "p80-local-audit-customer-pipeline-fixture-v1",
    requestedTier: "basic",
    deliveredTier: "basic",
    releaseState: "ready",
    projection,
    customerReport,
    customerReportPreviewLayout,
    sourceTruth: {
      strictLaneCount: 2,
      strictUpstreamRoots: customerReport.sourceBinding.independentContentBoundUpstreams,
      providerReceiptCount: providerEvidenceReceipts.length,
      adjudicatedAuthorityReceiptCount: 0,
      adjudicatedAuthorityEvidenceDigest: null,
      contentBoundProviderReceiptCount: customerReport.sourceBinding.contentBoundReceiptCount,
    },
    rule: "LOCAL_FIXTURE_ONLY - no customer FINAL or exploitability credit",
  };
  const pipeline = {
    ...pipelineUnsigned,
    pipelineDigest: sha256Digest(canonicalJson(pipelineUnsigned)),
  };

  const unboundSnapshot = buildAuditAccountCustomerSnapshot({
    pipeline,
    accountIdHash: hashVelmereAccountBinding(ownerAccountId),
    requestId,
    projectName: "P80 LOCAL FIXTURE - NOT CUSTOMER FINAL",
    targetLabel: `${TARGET_CHAIN_ID}:${TARGET_ADDRESS} (historical reference; fixture-only)`,
  });
  check("p80_unbound_audit_snapshot_verifies", verifyAuditAccountCustomerSnapshot(unboundSnapshot));
  check("p80_unbound_snapshot_not_exact", !hasExactAuditAccountArtifactBinding(unboundSnapshot));

  const renderedPdf = renderCustomerSafeAuditPdf(unboundSnapshot.layoutInput);
  check("p80_generation_pdf_matches_snapshot_digest", renderedPdf.pdfDigest === unboundSnapshot.pdfArtifact.pdfDigest);
  check("p80_generation_pdf_matches_snapshot_length", renderedPdf.pdfByteLength === unboundSnapshot.pdfArtifact.pdfByteLength);
  check("p80_generation_pdf_has_no_unsupported_glyphs", renderedPdf.unsupportedGlyphReplacements === 0);

  await rejects(
    "p80_audit_snapshot_requires_exact_pdf_marker",
    async () => buildPass4822AccountCustomerArtifactSnapshot({
      accountId: ownerAccountId,
      surface: "audit",
      payloadKind: "audit_customer_report_v1",
      reportId: unboundSnapshot.reportId,
      requestedTier: unboundSnapshot.requestedTier,
      deliveredTier: unboundSnapshot.deliveredTier,
      locale: unboundSnapshot.locale,
      title: unboundSnapshot.layoutInput.title,
      subject: unboundSnapshot.targetLabel,
      generatedAt: unboundSnapshot.generatedAt,
      payload: customerReport,
      canonicalArtifact: unboundSnapshot.canonicalArtifact,
    }),
    /account_customer_artifact_audit_exact_pdf_required/,
  );

  const accountArtifactSnapshot = buildPass4822AccountCustomerArtifactSnapshot({
    accountId: ownerAccountId,
    surface: "audit",
    payloadKind: "audit_customer_report_v1",
    reportId: unboundSnapshot.reportId,
    requestedTier: unboundSnapshot.requestedTier,
    deliveredTier: unboundSnapshot.deliveredTier,
    locale: unboundSnapshot.locale,
    title: unboundSnapshot.layoutInput.title,
    subject: unboundSnapshot.targetLabel,
    generatedAt: unboundSnapshot.generatedAt,
    payload: customerReport,
    canonicalArtifact: unboundSnapshot.canonicalArtifact,
    pdfStorage: PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
  });
  check("p80_exact_audit_account_snapshot_verifies", verifyPass4822AccountCustomerArtifactSnapshot(accountArtifactSnapshot));
  check("p80_exact_audit_surface_payload_pair", accountArtifactSnapshot.surface === "audit" && accountArtifactSnapshot.payloadKind === "audit_customer_report_v1");

  const stored = await storePass4824AccountCustomerArtifactPdfBundle({
    accountId: ownerAccountId,
    snapshot: accountArtifactSnapshot,
    pdfBytes: renderedPdf.bytes,
    client: null,
  });
  check("p80_exact_bundle_created_atomically", stored.created === true && stored.source === "memory", stored.source);
  check("p80_exact_blob_verifies", verifyPass4824AccountCustomerArtifactPdfBlob(stored.blob));
  check("p80_exact_blob_matches_snapshot", assertPass4824PdfBlobMatchesSnapshot({ blob: stored.blob, snapshot: stored.snapshot, accountId: ownerAccountId }) === stored.blob);

  const idempotent = await storePass4824AccountCustomerArtifactPdfBundle({
    accountId: ownerAccountId,
    snapshot: accountArtifactSnapshot,
    pdfBytes: renderedPdf.bytes,
    client: null,
  });
  check("p80_exact_bundle_idempotent", idempotent.created === false && idempotent.blob.recordDigest === stored.blob.recordDigest);

  const boundSnapshot = bindAuditAccountCustomerSnapshotToExactArtifact({
    snapshot: unboundSnapshot,
    accountArtifactSnapshot: stored.snapshot,
    pdfBlob: stored.blob,
    accountId: ownerAccountId,
  });
  check("p80_bound_audit_snapshot_verifies", verifyAuditAccountCustomerSnapshot(boundSnapshot));
  check("p80_bound_audit_snapshot_has_exact_binding", hasExactAuditAccountArtifactBinding(boundSnapshot));
  check("p80_bound_digest_changed", boundSnapshot.snapshotDigest !== unboundSnapshot.snapshotDigest);
  check("p80_bound_pdf_digest_cross_match", boundSnapshot.exactAccountArtifact.pdfDigest === renderedPdf.pdfDigest && boundSnapshot.exactAccountArtifact.pdfDigest === boundSnapshot.canonicalArtifact.pdfDigest);

  const foundSnapshot = await getPass4822AccountCustomerArtifactSnapshot({
    accountId: ownerAccountId,
    snapshotId: accountArtifactSnapshot.snapshotId,
    client: null,
  });
  const foundBlob = await getPass4824AccountCustomerArtifactPdfBlob({
    accountId: ownerAccountId,
    snapshotId: accountArtifactSnapshot.snapshotId,
    client: null,
  });
  check("p80_exact_snapshot_readback", foundSnapshot?.snapshot.snapshotDigest === stored.snapshot.snapshotDigest);
  check("p80_exact_pdf_readback", Boolean(foundBlob && bytesEqual(foundBlob.blob.pdfBytes, renderedPdf.bytes)));
  check("p80_cross_account_snapshot_non_disclosure", (await getPass4822AccountCustomerArtifactSnapshot({ accountId: otherAccountId, snapshotId: accountArtifactSnapshot.snapshotId, client: null })) === null);
  await rejects(
    "p80_cross_account_pdf_owner_rejected",
    () => getPass4824AccountCustomerArtifactPdfBlob({ accountId: otherAccountId, snapshotId: accountArtifactSnapshot.snapshotId, client: null }),
    /owner_immutable_conflict/,
  );

  const parity = verifyExactCustomerPdfPreviewDownloadPair({
    pdfBytes: foundBlob.blob.pdfBytes,
    expectedPdfSha256: boundSnapshot.exactAccountArtifact.pdfDigest,
    filenameStem: "P80-Audit-local-fixture-not-final",
    fallbackStem: "Velmere-Audit-fixture",
  });
  check("p80_preview_download_exact_parity", parity.pass && parity.byteIdentical && parity.contentDispositionDifferent, parity);

  const tamperedBlob = clone(foundBlob.blob);
  tamperedBlob.pdfBytes[tamperedBlob.pdfBytes.byteLength - 12] ^= 0x01;
  check("p80_tampered_pdf_bytes_rejected", !verifyPass4824AccountCustomerArtifactPdfBlob(tamperedBlob));
  await rejects(
    "p80_tampered_pdf_binding_rejected",
    async () => assertPass4824PdfBlobMatchesSnapshot({ blob: tamperedBlob, snapshot: stored.snapshot, accountId: ownerAccountId }),
    /pdf_blob_invalid/,
  );
  const tamperedBinding = clone(boundSnapshot);
  tamperedBinding.exactAccountArtifact.pdfDigest = `sha256:${"b".repeat(64)}`;
  check("p80_tampered_exact_binding_rejected", !verifyAuditAccountCustomerSnapshot(tamperedBinding));
  const injectedSnapshot = { ...clone(boundSnapshot), unexpectedPrivateField: PRIVATE_SOURCE_SENTINEL };
  check("p80_unknown_snapshot_key_rejected", !verifyAuditAccountCustomerSnapshot(injectedSnapshot));
  await rejects(
    "p80_rebinding_exact_snapshot_rejected",
    async () => bindAuditAccountCustomerSnapshotToExactArtifact({
      snapshot: boundSnapshot,
      accountArtifactSnapshot: stored.snapshot,
      pdfBlob: stored.blob,
      accountId: ownerAccountId,
    }),
    /already_bound/,
  );

  const publicEnvelope = canonicalJson({
    customerReport,
    auditSnapshot: boundSnapshot,
    accountArtifactSnapshot: stored.snapshot,
  });
  check("p80_public_envelope_excludes_private_source_sentinel", !publicEnvelope.includes(PRIVATE_SOURCE_SENTINEL));
  check("p80_public_envelope_excludes_private_abi_sentinel", !publicEnvelope.includes(PRIVATE_ABI_SENTINEL));
  check("p80_public_envelope_no_raw_source_field", !/"(?:rawSource|sourceCode|soliditySource)"\s*:/iu.test(publicEnvelope));
  check("p80_public_envelope_no_raw_abi_field", !/"(?:rawAbi|contractAbi|abi)"\s*:/iu.test(publicEnvelope));

  const message = {
    id: "p80-audit-exact-message",
    title: "P80 Audit local fixture",
    body: "Local exact-artifact plumbing validation. Not a customer FINAL report.",
    status: "ready",
    packageLabel: "Velmere Basic Audit - local fixture",
    requestId,
    createdAt: FIXTURE_GENERATED_AT,
    eta: "fixture-only",
    accountRoute: "/en/account?tab=messages",
    nextSteps: ["Current exploitability and release closure remain WITHHELD."],
  };

  const cookieHeader = buildVelmereAccountCookie(buildVelmereAccountSession({
    accountId: ownerAccountId,
    provider: "preview",
    displayName: "P80 exact Audit owner",
  })).split(";", 1)[0];
  const otherCookieHeader = buildVelmereAccountCookie(buildVelmereAccountSession({
    accountId: otherAccountId,
    provider: "preview",
    displayName: "P80 other owner",
  })).split(";", 1)[0];

  const { GET: accountArtifactGet } = await import("../../lib/server/lazy-route-modules/account--customer-artifact.ts");
  const accountArtifactUrl = (disposition) => `http://velmere.local/api/account/customer-artifact?id=${encodeURIComponent(accountArtifactSnapshot.snapshotId)}&format=pdf&disposition=${disposition}`;
  check("p80_orphan_bundle_has_no_message_link", !(await hasAuditAccountMessageExactArtifactLink({
    accountId: ownerAccountId,
    snapshotId: accountArtifactSnapshot.snapshotId,
    client: null,
  })));
  const orphanDirectResponse = await accountArtifactGet(new Request(accountArtifactUrl("download"), { headers: { cookie: cookieHeader } }));
  check("p80_orphan_audit_artifact_direct_route_hidden", orphanDirectResponse.status === 404, orphanDirectResponse.status);
  const orphanListResponse = await accountArtifactGet(new Request("http://velmere.local/api/account/customer-artifact?format=json&limit=24", { headers: { cookie: cookieHeader } }));
  const orphanList = await orphanListResponse.json();
  check("p80_orphan_audit_artifact_list_hidden", orphanListResponse.status === 200 && !orphanList.artifacts.some((artifact) => artifact.artifactId === accountArtifactSnapshot.snapshotId));

  const storedMessage = await storeAuditAccountMessage({
    message,
    accountId: ownerAccountId,
    locale: "en",
    reviewLevel: "basic_review",
    projectName: "P80 LOCAL FIXTURE - NOT CUSTOMER FINAL",
    contractAddress: TARGET_ADDRESS,
    exportRoute: "/api/security/audit-watch/customer-safe-report",
    canonicalCustomerSnapshot: boundSnapshot,
  });
  check("p80_account_message_stores_bound_snapshot", storedMessage.record.canonicalCustomerSnapshot?.snapshotDigest === boundSnapshot.snapshotDigest);
  check("p80_bound_bundle_has_exact_message_link", await hasAuditAccountMessageExactArtifactLink({
    accountId: ownerAccountId,
    snapshotId: accountArtifactSnapshot.snapshotId,
    client: null,
  }));
  const linkedListResponse = await accountArtifactGet(new Request("http://velmere.local/api/account/customer-artifact?format=json&limit=24", { headers: { cookie: cookieHeader } }));
  const linkedList = await linkedListResponse.json();
  check("p80_bound_audit_artifact_list_visible", linkedListResponse.status === 200 && linkedList.artifacts.some((artifact) => artifact.artifactId === accountArtifactSnapshot.snapshotId));
  const accountPreviewResponse = await accountArtifactGet(new Request(accountArtifactUrl("preview"), { headers: { cookie: cookieHeader } }));
  const accountDownloadResponse = await accountArtifactGet(new Request(accountArtifactUrl("download"), { headers: { cookie: cookieHeader } }));
  const accountPreviewBytes = new Uint8Array(await accountPreviewResponse.arrayBuffer());
  const accountDownloadBytes = new Uint8Array(await accountDownloadResponse.arrayBuffer());
  check("p80_account_route_preview_200", accountPreviewResponse.status === 200, accountPreviewResponse.status);
  check("p80_account_route_download_200", accountDownloadResponse.status === 200, accountDownloadResponse.status);
  check("p80_account_route_exact_bytes", bytesEqual(accountPreviewBytes, renderedPdf.bytes) && bytesEqual(accountDownloadBytes, renderedPdf.bytes));
  check("p80_account_route_preview_download_parity", bytesEqual(accountPreviewBytes, accountDownloadBytes));
  check("p80_account_route_disposition_only_difference", accountPreviewResponse.headers.get("content-disposition")?.startsWith("inline;") && accountDownloadResponse.headers.get("content-disposition")?.startsWith("attachment;"));
  check("p80_account_route_parity_header", accountPreviewResponse.headers.get("x-velmere-preview-download-parity") === "byte-identical");
  const crossAccountResponse = await accountArtifactGet(new Request(accountArtifactUrl("download"), { headers: { cookie: otherCookieHeader } }));
  check("p80_account_route_cross_account_404", crossAccountResponse.status === 404, crossAccountResponse.status);

  const { GET: auditReportGet } = await import("../../lib/server/lazy-route-modules/security--audit-watch--customer-safe-report.ts");
  const auditReportUrl = (disposition) => `http://velmere.local/api/security/audit-watch/customer-safe-report?id=${encodeURIComponent(message.id)}&locale=en&format=pdf-safe&disposition=${disposition}`;
  const auditPreviewResponse = await auditReportGet(new Request(auditReportUrl("preview"), { headers: { cookie: cookieHeader } }));
  const auditDownloadResponse = await auditReportGet(new Request(auditReportUrl("download"), { headers: { cookie: cookieHeader } }));
  const auditPreviewBytes = new Uint8Array(await auditPreviewResponse.arrayBuffer());
  const auditDownloadBytes = new Uint8Array(await auditDownloadResponse.arrayBuffer());
  check("p80_audit_route_preview_200", auditPreviewResponse.status === 200, auditPreviewResponse.status);
  check("p80_audit_route_download_200", auditDownloadResponse.status === 200, auditDownloadResponse.status);
  check("p80_audit_route_immutable_bytes", bytesEqual(auditPreviewBytes, renderedPdf.bytes) && bytesEqual(auditDownloadBytes, renderedPdf.bytes));
  check("p80_audit_route_preview_download_parity", bytesEqual(auditPreviewBytes, auditDownloadBytes));
  check("p80_audit_route_exact_artifact_header", auditDownloadResponse.headers.get("x-velmere-audit-account-artifact-id") === accountArtifactSnapshot.snapshotId);
  check("p80_audit_route_exact_pdf_hash_header", auditDownloadResponse.headers.get("x-velmere-customer-safe-pdf-digest") === renderedPdf.pdfDigest);
  const auditCrossAccountResponse = await auditReportGet(new Request(auditReportUrl("download"), { headers: { cookie: otherCookieHeader } }));
  check("p80_audit_route_cross_account_404", auditCrossAccountResponse.status === 404, auditCrossAccountResponse.status);

  const auditJsonResponse = await auditReportGet(new Request(`http://velmere.local/api/security/audit-watch/customer-safe-report?id=${encodeURIComponent(message.id)}&locale=en&format=json&disposition=download`, { headers: { cookie: cookieHeader } }));
  const auditJson = await auditJsonResponse.json();
  check("p80_audit_json_ready_with_preview", auditJsonResponse.status === 200 && auditJson.pdfPacket?.ready === true && typeof auditJson.pdfPacket?.previewEndpoint === "string");
  check("p80_audit_json_no_private_sentinels", !JSON.stringify(auditJson).includes(PRIVATE_SOURCE_SENTINEL) && !JSON.stringify(auditJson).includes(PRIVATE_ABI_SENTINEL));

  const routeHealth = buildPass2374CustomerSafeRouteHealth({ locale: "en", id: message.id, record: storedMessage.record });
  const freshPingAt = new Date().toISOString();
  const routeHealthLedger = {
    passId: PASS2375_ROUTE_HEALTH_LEDGER_ID,
    generatedAt: freshPingAt,
    focusKey: message.id,
    warnings: [],
    deliveryWarningLevel: "ok",
    customerDeliveryAllowed: true,
    lastEndpointPing: {
      pingSource: "route_health_endpoint",
      pingedAt: freshPingAt,
    },
    lastEndpointPingAgeMinutes: 0,
    history: [],
    source: "memory",
  };
  const boundGate = await buildPass2376FinalDeliveryGate({
    locale: "en",
    message: storedMessage.record,
    routeHealth,
    routeHealthLedger,
  });
  check("p80_final_delivery_gate_accepts_exact_bound_snapshot", boundGate.canDeliver && boundGate.exactAccountArtifactReady && boundGate.exactPdfDigest === renderedPdf.pdfDigest, boundGate.reasons);
  const unboundGate = await buildPass2376FinalDeliveryGate({
    locale: "en",
    message: { ...storedMessage.record, canonicalCustomerSnapshot: unboundSnapshot },
    routeHealth,
    routeHealthLedger,
  });
  check("p80_final_delivery_gate_rejects_unbound_snapshot", !unboundGate.canDeliver && unboundGate.reasons.some((reason) => reason.key === "exact_account_pdf_artifact_required"), unboundGate.reasons);

  const inspection = inspectPass4649PdfBinary(renderedPdf.bytes);
  check("p80_pdf_binary_current_inspector_pass", inspection.valid, inspection.blockers);
  check("p80_pdf_no_active_content", inspection.activeContentDetected === false);
  mkdirSync(path.dirname(PDF_PATH), { recursive: true });
  writeFileSync(PDF_PATH, renderedPdf.bytes);
  check("p80_pdf_written_exact_bytes", bytesEqual(sha256File(PDF_PATH), renderedPdf.bytes));

  const pdfinfo = spawnSync("pdfinfo", [PDF_PATH], { encoding: "utf8" });
  check("p80_pdfinfo_parse_pass", pdfinfo.status === 0, pdfinfo.stderr || pdfinfo.error?.message);
  const pageMatch = /^Pages:\s+(\d+)\s*$/mu.exec(pdfinfo.stdout);
  check("p80_pdfinfo_page_count_match", Number(pageMatch?.[1]) === renderedPdf.pageCount, pageMatch?.[1]);
  check("p80_pdfinfo_a4", /^Page size:\s+595(?:\.\d+)? x 842(?:\.\d+)? pts \(A4\)\s*$/mu.test(pdfinfo.stdout) || /A4/iu.test(pdfinfo.stdout), pdfinfo.stdout.match(/^Page size:.*$/mu)?.[0]);
  const pdftotext = spawnSync("pdftotext", [PDF_PATH, "-"], { encoding: "utf8" });
  check("p80_pdftotext_parse_pass", pdftotext.status === 0, pdftotext.stderr || pdftotext.error?.message);
  check("p80_pdf_text_fixture_boundary_visible", /LOCAL FIXTURE|fixture-only|WITHHELD/iu.test(pdftotext.stdout));
  check("p80_pdf_text_no_private_sentinels", !pdftotext.stdout.includes(PRIVATE_SOURCE_SENTINEL) && !pdftotext.stdout.includes(PRIVATE_ABI_SENTINEL));

  const receipt = {
    schemaVersion: "velmere.p80.audit-exact-immutable-account-artifact-runtime.v1",
    generatedAt: new Date().toISOString(),
    fixtureGeneratedAt: FIXTURE_GENERATED_AT,
    status: "PASS_BOUNDED_LOCAL_FIXTURE",
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      exactWindowsCredit: false,
    },
    classification: "DEFENSIVE_LOCAL_EXACT_ARTIFACT_AND_DELIVERY_VALIDATION",
    targetBoundary: {
      chainId: TARGET_CHAIN_ID,
      address: TARGET_ADDRESS,
      use: "historical public reference plus locally controlled fixture values only",
      liveExploitation: false,
      transactionSubmission: false,
      currentExploitability: "WITHHELD",
    },
    exactArtifact: {
      auditSnapshotId: boundSnapshot.snapshotId,
      auditSnapshotDigest: boundSnapshot.snapshotDigest,
      accountArtifactSnapshotId: stored.snapshot.snapshotId,
      accountArtifactSnapshotDigest: stored.snapshot.snapshotDigest,
      canonicalArtifactDigest: stored.snapshot.canonicalArtifact.artifactDigest,
      pdfBlobId: stored.blob.blobId,
      pdfBlobRecordDigest: stored.blob.recordDigest,
      pdfDigest: stored.blob.pdfDigest,
      pdfByteLength: stored.blob.pdfByteLength,
      pageCount: stored.snapshot.canonicalArtifact.pageCount,
      previewDownloadByteIdentical: parity.pass,
      accountBound: true,
      immutableStoreMode: stored.source,
    },
    pdfArtifact: {
      path: PDF_PATH,
      sha256: renderedPdf.pdfDigest,
      byteLength: renderedPdf.pdfByteLength,
      pdfinfoPass: pdfinfo.status === 0,
      pdftotextPass: pdftotext.status === 0,
      activeContentDetected: inspection.activeContentDetected,
      unsupportedGlyphReplacements: renderedPdf.unsupportedGlyphReplacements,
    },
    checks: {
      total: checks.length,
      passed: checks.filter((row) => row.status === "PASS").length,
      failed: checks.filter((row) => row.status === "FAIL").length,
      rows: checks,
    },
    zeroFakeCredit: {
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      exactWindows: "WITHHELD",
      currentDeploymentState: "WITHHELD_BY_THIS_FIXTURE",
      currentExploitability: "WITHHELD",
      independentReplay: "WITHHELD",
      sourceRights: "WITHHELD",
      note: "This pass proves the current-source Audit exact immutable account artifact, byte/hash binding, tamper rejection, account isolation, and preview/download parity on a controlled local fixture. It does not convert a historical thirdweb case or any Audit tier into Customer FINAL.",
    },
  };
  mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    status: receipt.status,
    checkCount: receipt.checks.total,
    failed: receipt.checks.failed,
    pdfDigest: receipt.exactArtifact.pdfDigest,
    pdfByteLength: receipt.exactArtifact.pdfByteLength,
    customerFinal: receipt.zeroFakeCredit.customerFinal,
    auditFinalPdf: receipt.zeroFakeCredit.auditFinalPdf,
  }, null, 2));
}

try {
  await main();
} catch (error) {
  mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  const failure = {
    schemaVersion: "velmere.p80.audit-exact-immutable-account-artifact-runtime.v1",
    generatedAt: new Date().toISOString(),
    status: "FAIL",
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
    checks: {
      total: checks.length,
      passed: checks.filter((row) => row.status === "PASS").length,
      failed: checks.filter((row) => row.status === "FAIL").length,
      rows: checks,
    },
    zeroFakeCredit: { customerFinal: "0/20", auditFinalPdf: "0/3", exactWindows: "WITHHELD" },
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(failure, null, 2)}\n`, "utf8");
  throw error;
}
